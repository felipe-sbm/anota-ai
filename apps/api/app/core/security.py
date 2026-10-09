"""JWT creation and validation used by protected API routes."""

from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

from .config import settings


def create_jwt(payload: dict[str, Any]) -> str:
    """Sign a JWT containing the caller identity and standard time claims.

    Args:
        payload: Identity claims, normally returned by the GitHub OAuth flow.

    Returns:
        An encoded JWT accepted by the protected API routes.
    """
    now = datetime.now(timezone.utc)
    data = {
        **payload,
        "iat": now,
        "exp": now + timedelta(seconds=settings.JWT_EXPIRE_SECONDS),
    }
    return jwt.encode(data, settings.JWT_SECRET, algorithm=settings.JWT_ALG)


def verify_jwt(token: str) -> dict[str, Any]:
    """Validate a JWT and return its decoded claims.

    Raises:
        ValueError: If the token is malformed, expired, or signed with a
            different secret/algorithm.
    """
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])
    except JWTError as exc:
        raise ValueError("Invalid or expired token") from exc