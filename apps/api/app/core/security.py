from datetime import datetime, timedelta

from jose import jwt

from .config import settings


def create_jwt(payload: dict) -> str:
    now = datetime.utcnow()
    exp = now + timedelta(seconds=settings.JWT_EXPIRE_SECONDS)

    full = {
        **payload,
        "iss": "anota-ai",
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(full, settings.JWT_SECRET, algorithm=settings.JWT_ALG)


def verify_jwt(token: str) -> dict:
    return jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=[settings.JWT_ALG],
        issuer="anota-ai",
    )

