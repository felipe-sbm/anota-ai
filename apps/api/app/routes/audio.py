from __future__ import annotations

import os
import shutil
import uuid

from fastapi import APIRouter, UploadFile, File, HTTPException

app_router = APIRouter(prefix="/api/audio", tags=["audio"])

UPLOAD_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
)

os.makedirs(UPLOAD_DIR, exist_ok=True)


@app_router.post("/upload")
async def upload_audio(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="file.filename is required")

    ext = os.path.splitext(file.filename)[1] or ".webm"
    file_id = uuid.uuid4().hex
    filename = f"{file_id}{ext}"

    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"file_id": file_id, "filename": filename}

