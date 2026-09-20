from __future__ import annotations
import os
from fastapi import APIRouter, Depends, Header, HTTPException

from ..models.schemas import ProcessAudioResponse, ProcessAudioRequest, TaskSpec, DecisionSpec
from ..models.database import update_record_status
from ..services.summarization_service import summarize_and_extract
from ..services.mention_service import resolve_assignees_from_transcript


from ..core.security import verify_jwt
from ..core.config import settings

app_router = APIRouter(prefix="/api", tags=["process"])

UPLOAD_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
)


def get_bearer_token(authorization: str | None):
    if not authorization:
        return None
    if not authorization.startswith("Bearer "):
        return None
    return authorization.split(" ", 1)[1]


async def require_auth(authorization: str = Header(None)):
    token = get_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization")
    try:
        return verify_jwt(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


@app_router.post("/process-audio", response_model=ProcessAudioResponse)
async def process_audio(
    req: ProcessAudioRequest,
    auth=Depends(require_auth),
):
    # resolve arquivo pelo file_id
    if not req.file_id:
        raise HTTPException(status_code=400, detail="file_id is required")

    candidates = [f for f in os.listdir(UPLOAD_DIR) if f.startswith(req.file_id)]
    if not candidates:
        raise HTTPException(status_code=404, detail="file_id not found")
    file_path = os.path.join(UPLOAD_DIR, candidates[0])

    # Atualiza status para processing
    if req.file_id:
        update_record_status(req.file_id, "processing")

    # whisper local (é umimport tardio - o servidor não depende de torch/whisper no startup)
    try:
        from ..services.whisper_service import transcribe_file

        transcript = transcribe_file(file_path, model_size=settings.WHISPER_MODEL_SIZE)
    except Exception as e:
        if req.file_id:
            update_record_status(req.file_id, "error", error_message=str(e))
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    # Resolve assignees por menções (nome/apelido)
    resolved_assignees = resolve_assignees_from_transcript(transcript=transcript)

    # sumarização e tasks
    try:
        summarized = await summarize_and_extract(
            transcript=transcript,
            assignees=resolved_assignees or req.assignees,
            ollama_base_url=settings.OLLAMA_BASE_URL,
            ollama_model=settings.OLLAMA_MODEL,
            llm_enabled=settings.LLM_SUMMARIZATION_ENABLED,
        )

    except Exception as e:
        if req.file_id:
            update_record_status(req.file_id, "error", error_message=str(e))
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")

    created_issues = []

    # Atualiza registro no banco com sucesso
    if req.file_id:
        update_record_status(
            req.file_id,
            "pending_review",
            transcript=transcript,
            summary=summarized.summary,
            tasks=[t.model_dump() for t in summarized.tasks],
            decisions=[decision.model_dump() for decision in summarized.decisions],
            created_issues=created_issues,
            repo_full_name=req.repo_full_name or "",
        )

    return ProcessAudioResponse(
        transcript=transcript,
        summary=summarized.summary,
        tasks=[TaskSpec(**t.model_dump()) for t in summarized.tasks],
        decisions=[DecisionSpec(**decision.model_dump()) for decision in summarized.decisions],
        created_issues=created_issues,
    )
