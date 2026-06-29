from __future__ import annotations

import os
import shutil
import uuid

from fastapi import APIRouter, Depends, Header, UploadFile, File, HTTPException

from ..core.security import verify_jwt
from ..models.database import insert_record, get_record, list_records, count_records


app_router = APIRouter(prefix="/api/audio", tags=["audio"])

UPLOAD_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
)

os.makedirs(UPLOAD_DIR, exist_ok=True)


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


@app_router.post("/upload")
async def upload_audio(
    file: UploadFile = File(...),
    auth=Depends(require_auth),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="file.filename is required")

    ext = os.path.splitext(file.filename)[1] or ".webm"
    file_id = uuid.uuid4().hex
    filename = f"{file_id}{ext}"

    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Cria registro no banco de dados
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


@app_router.get("/records")
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
async def count_audio_records(auth=Depends(require_auth)):
    github_login = auth.get("github_login", "")
    if not github_login:
        raise HTTPException(status_code=400, detail="github_login not found in token")

    total = count_records(user_github_login=github_login)
    return {"count": total}


@app_router.get("/records/{file_id}")
async def get_audio_record(
    file_id: str,
    auth=Depends(require_auth),
):
    record = get_record(file_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")

    # Verifica se o registro pertence ao usuário autenticado
    github_login = auth.get("github_login", "")
    if record.get("user_github_login") != github_login:
        raise HTTPException(status_code=404, detail="Record not found")

    return {"record": record}

