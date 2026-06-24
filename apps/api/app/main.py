import os
import shutil
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Configuração de CORS para permitir requisições da extensão
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Caminho para armazenar os uploads
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
def root():
    return {
        "message": "Sprint Notes API"
    }

@app.post("/upload")
async def upload_audio(file: UploadFile = File(...)):
    # Garante que o arquivo tenha um nome ou gera um padrão
    filename = file.filename or "recording.webm"
    # Resolve conflito de nomes se o arquivo já existir
    base, ext = os.path.splitext(filename)
    if not ext:
        ext = ".webm"
        
    counter = 1
    file_path = os.path.join(UPLOAD_DIR, f"{base}{ext}")
    while os.path.exists(file_path):
        file_path = os.path.join(UPLOAD_DIR, f"{base}_{counter}{ext}")
        counter += 1

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "status": "success",
        "filename": os.path.basename(file_path),
        "path": file_path
    }