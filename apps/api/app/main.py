from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .models.database import init_db
from .routes.audio import app_router as audio_router
from .routes.process import app_router as process_router
from .routes.auth_github import app_router as auth_github_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)

# Configuração de CORS para permitir requisições da extensão
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(audio_router)
app.include_router(process_router)
app.include_router(auth_github_router)


@app.get("/")
def root():
    return {"message": "Anota Aí API"}

