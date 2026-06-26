from __future__ import annotations
import os
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException

from ..models.schemas import ProcessAudioResponse, ProcessAudioRequest, TaskSpec
from ..services.whisper_service import transcribe_file
from ..services.summarization_service import summarize_and_extract
from ..services.github_service import GithubService
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


async def require_auth(authorization: str | None = None):
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
    # opcional: aceitar upload direto também
    file: UploadFile | None = File(default=None),
    auth=Depends(require_auth),
):
    # resolve arquivo
    file_path = None
    if file is not None:
        # salva arquivo temporário no uploads
        filename = file.filename or f"upload.{req.file_id or 'tmp'}"
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
    elif req.file_id:
        # procura por arquivo com prefixo file_id
        candidates = [f for f in os.listdir(UPLOAD_DIR) if f.startswith(req.file_id)]
        if not candidates:
            raise HTTPException(status_code=404, detail="file_id not found")
        file_path = os.path.join(UPLOAD_DIR, candidates[0])
    else:
        raise HTTPException(status_code=400, detail="Provide either file upload or file_id")

    # whisper local
    transcript = transcribe_file(file_path, model_size=settings.WHISPER_MODEL_SIZE)

    # sumarização e tasks
    summarized = summarize_and_extract(transcript=transcript, assignees=req.assignees)

    # cria Issues no GitHub
    github_token = auth.get("github_access_token")
    if not github_token:
        # comentário do mvp
        # mvp: se preferir, pode armazenar token no token jwt (não é o ideal para produção)
        raise HTTPException(status_code=401, detail="github_access_token missing in JWT")

    gh = GithubService(access_token=github_token)

    tasks_as_dict = [t.model_dump() for t in summarized.tasks]

    created_issues = gh.create_issues(
        repo_full_name=req.repo_full_name,
        tasks=tasks_as_dict,
        assignees=req.assignees,
    )

    return ProcessAudioResponse(
        transcript=transcript,
        summary=summarized.summary,
        tasks=summarized.tasks,
        created_issues=created_issues,
    )

