from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

from .config import settings


def create_jwt(payload: dict[str, Any]) -> str:
    """cria um JWT assinado com os claims padrão (iat/exp) da API."""
    now = datetime.now(timezone.utc)
    data = {
        **payload,
        "iat": now,
        "exp": now + timedelta(seconds=settings.JWT_EXPIRE_SECONDS),
    }
    return jwt.encode(data, settings.JWT_SECRET, algorithm=settings.JWT_ALG)


def verify_jwt(token: str) -> dict[str, Any]:
    """verifica a validade do JWT e retorna os claims decodificados."""
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])
    except JWTError as exc:
        raise ValueError("Invalid or expired token") from exc