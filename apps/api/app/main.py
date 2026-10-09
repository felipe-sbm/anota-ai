"""Application entry point for the Anota Aí HTTP API.

The API owns authentication, recording persistence, audio processing, draft
management, project/team/sprint data, and GitHub synchronization. Route
modules are included here so the OpenAPI document mirrors the public surface
of the service.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .models.database import init_db
from .routes.audio import app_router as audio_router
from .routes.process import app_router as process_router
from .routes.auth_github import app_router as auth_github_router
from .routes.teams import app_router as teams_router
from .routes.issues import app_router as issues_router
from .routes.sprints import app_router as sprints_router
from .routes.repositories import app_router as repositories_router
from .routes.projects import app_router as projects_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the local persistence layer before serving requests."""
    init_db()
    yield


app = FastAPI(
    title="Anota Aí API",
    description=(
        "API responsável por autenticação GitHub, gravações, transcrição, "
        "análise de reuniões, rascunhos, projetos, sprints e sincronização "
        "de issues com o GitHub."
    ),
    version="1.0.0",
    lifespan=lifespan,
    contact={"name": "Anota Aí"},
    license_info={"name": "MIT"},
    openapi_tags=[
        {"name": "auth", "description": "OAuth GitHub e identidade do utilizador."},
        {"name": "audio", "description": "Upload, histórico e revisão de gravações."},
        {"name": "process", "description": "Transcrição e análise de áudio."},
        {"name": "issues", "description": "Rascunhos, issues e sincronização GitHub."},
        {"name": "projects", "description": "Projetos, vínculos e métricas."},
        {"name": "teams", "description": "Equipas e membros GitHub."},
        {"name": "sprints", "description": "Sprints, tarefas e progresso."},
        {"name": "repositories", "description": "Repositórios associados a utilizadores."},
    ],
)

# configuração de cors para permitir requisições da extensão
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
app.include_router(teams_router)
app.include_router(issues_router)
app.include_router(sprints_router)
app.include_router(repositories_router)
app.include_router(projects_router)


@app.get(
    "/",
    summary="Verificar disponibilidade da API",
    description="Retorna uma mensagem simples para confirmar que a API está ativa.",
    tags=["health"],
)
def root() -> dict[str, str]:
    """Return a lightweight health response."""
    return {"message": "Anota Aí API"}
