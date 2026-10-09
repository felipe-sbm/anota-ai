"""Endpoints for uploading and retrieving meeting recordings."""

from __future__ import annotations

from io import BufferedWriter
import os
import shutil
from typing import Any
import uuid

from fastapi import APIRouter, Depends, Header, UploadFile, File, HTTPException

from ..core.security import verify_jwt
from ..models.database import RECORDING_STATUSES, RECORDING_STATUS_LABELS, insert_record, get_record, list_records, count_records, update_record_status
from ..models.schemas import ReviewRequest


app_router = APIRouter(prefix="/api/audio", tags=["audio"])

UPLOAD_DIR: str = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
)

os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_bearer_token(authorization: str | None) -> None | str:
    if not authorization:
        return None
    if not authorization.startswith("Bearer "):
        return None
    return authorization.split(" ", 1)[1]


async def require_auth(authorization: str = Header(None)) -> dict[str, Any]:
    token: None | str = get_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization")
    try:
        return verify_jwt(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


@app_router.post(
    "/upload",
    summary="Upload a recording",
    description="Stores an authenticated user's audio recording and creates its database record.",
    responses={400: {"description": "Missing filename"}, 401: {"description": "Invalid JWT"}},
)
async def upload_audio(
    file: UploadFile = File(...),
    auth=Depends(require_auth),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="file.filename is required")

    ext: str = os.path.splitext(file.filename)[1] or ".webm"
    file_id: str = uuid.uuid4().hex
    filename: str = f"{file_id}{ext}"

    file_path: str = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # cria o registro no banco de dados
    print("[DEBUG] upload_audio auth payload:", auth)
    github_login = auth.get("github_login", "")
    record = insert_record(
        record_id=file_id,
        filename=filename,
        file_id=file_id,
        original_filename=file.filename,
        user_github_login=github_login,
    )

    return {
        "file_id": file_id,
        "filename": filename,
        "record": record,
    }


@app_router.get(
    "/statuses",
    summary="List recording statuses",
    description="Returns the canonical status values and display labels shared by clients.",
)
async def audio_statuses(auth=Depends(require_auth)):
    # vocabulário canônico de estados de uma gravação compartilhado pela
    # extensão, pela API e pelo dashboard.
    return {
        "statuses": list(RECORDING_STATUSES),
        "labels": RECORDING_STATUS_LABELS,
    }


@app_router.get(
    "/records",
    summary="List recordings",
    description="Lists the authenticated user's recordings with pagination.",
)
async def list_audio_records(
    limit: int = 50,
    offset: int = 0,
    auth=Depends(require_auth),
):
    print("[DEBUG] list_audio_records auth payload:", auth)
    github_login = auth.get("github_login", "")
    if not github_login:
        raise HTTPException(status_code=400, detail="github_login not found in token")

    records = list_records(user_github_login=github_login, limit=limit, offset=offset)
    return {"records": records}


@app_router.get("/records/count")
async def count_audio_records(auth=Depends(require_auth)) -> dict[str, int]:
    github_login = auth.get("github_login", "")
    if not github_login:
        raise HTTPException(status_code=400, detail="github_login not found in token")

    total: int = count_records(user_github_login=github_login)
    return {"count": total}


@app_router.get(
    "/records/{file_id}",
    summary="Get a recording",
    description="Returns one recording owned by the authenticated user.",
    responses={404: {"description": "Recording not found or not owned by the user"}},
)
async def get_audio_record(
    file_id: str,
    auth=Depends(require_auth),
):
    record = get_record(file_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")

    # verifica se o registro pertence ao usuário autenticado
    github_login = auth.get("github_login", "")
    if record.get("user_github_login") != github_login:
        raise HTTPException(status_code=404, detail="Record not found")

    return {"record": record}


@app_router.post(
    "/records/{file_id}/review",
    summary="Review extracted tasks",
    description="Stores the user's reviewed task list and marks the recording as reviewed.",
    responses={404: {"description": "Recording not found"}, 409: {"description": "Recording is not ready"}},
)
async def review_audio_record(
    file_id: str,
    req: ReviewRequest,
    auth=Depends(require_auth),
):
    record = get_record(file_id)

    if record is None or record.get("user_github_login") != auth.get("github_login", ""):
        raise HTTPException(status_code=404, detail="Record not found")
    if record.get("status") not in {"pending_review", "reviewed"}:
        raise HTTPException(status_code=409, detail="Record is not ready for review")

    tasks: list[dict[str, Any]] = [task.model_dump() for task in req.tasks]
    update_record_status(file_id, "reviewed", tasks=tasks)
    return {"file_id": file_id, "status": "reviewed", "tasks": tasks}
