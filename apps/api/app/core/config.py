from __future__ import annotations
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Configurações globais da API, lidas de variáveis de ambiente / .env."""

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # whisper (para transcrição)
    WHISPER_MODEL_SIZE: str = "base"

    # autenticação do github
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/auth/github/callback"
    GITHUB_SCOPE: str = "repo,user"

    # JWT
    JWT_SECRET: str = "change-me"
    JWT_ALG: str = "HS256"
    JWT_EXPIRE_SECONDS: int = 28800

    # CORS
    CORS_ALLOW_ORIGINS: str = "*"

    # o LLM do Ollama (que vai ser legado depois)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"
    LLM_SUMMARIZATION_ENABLED: bool = False

    # api do Groq
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    # quando preenchido, o callback do GitHub vai redirecionar para a
    # interface com o token JWT na query string.
    UI_BASE_URL: str = ""


settings = Settings()
