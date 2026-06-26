import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    APP_NAME: str = "Anota Aí API"
    CORS_ALLOW_ORIGINS: str = "*"  # com valores separados por vírgula

    WHISPER_MODEL_SIZE: str = "base"

    # OBS: Whisper é local, mas a sumarização pode depender de um modelo remoto.
    OPENAI_API_KEY: str = ""

    GITHUB_CLIENT_ID: str
    GITHUB_CLIENT_SECRET: str
    GITHUB_REDIRECT_URI: str
    GITHUB_SCOPE: str = "repo"  # pode ampliar se necessário

    JWT_SECRET: str
    JWT_ALG: str = "HS256"
    JWT_EXPIRE_SECONDS: int = 60 * 60 * 8




# carrega apps/api/.env por padrão
class _SettingsWithEnv(Settings):
    # carrega apps/api/.env mesmo quando o cwd mudar.
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), "../../.env"),
        env_file_encoding="utf-8",
    )


settings = _SettingsWithEnv()


