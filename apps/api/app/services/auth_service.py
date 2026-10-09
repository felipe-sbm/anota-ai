"""Async HTTP client helpers for the GitHub OAuth and user APIs."""

from __future__ import annotations

from typing import Any, Optional

import httpx

from ..core.config import settings


async def github_exchange_code_for_token(code: str) -> str:
    """Exchange a one-time GitHub OAuth code for an access token."""
    url = "https://github.com/login/oauth/access_token"
    data: dict[str, str] = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "client_secret": settings.GITHUB_CLIENT_SECRET,
        "code": code,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        r: httpx.Response = await client.post(url, data=data, headers={"Accept": "application/json"})
    r.raise_for_status()
    payload: Any | dict[str, str] = r.json() if r.headers.get("content-type", "").startswith("application/json") else dict(x.split("=") for x in r.text.split("&"))

    access_token: str | None | Any = payload.get("access_token")
    if not access_token:
        raise RuntimeError(f"GitHub token exchange failed: {payload}")
    return access_token


async def github_get_user(access_token: str) -> dict:
    """Fetch the GitHub profile associated with an access token."""
    """Fetch the authenticated GitHub user payload."""
    headers: dict[str, str] = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"}
    async with httpx.AsyncClient(timeout=30) as client:
        r: httpx.Response = await client.get("https://api.github.com/user", headers=headers)
    r.raise_for_status()
    return r.json()


async def github_get_user_by_login(access_token: str, github_login: str) -> dict:
    """Fetch a public GitHub profile by login for project display data."""
    headers: dict[str, str] = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"}
    async with httpx.AsyncClient(timeout=30) as client:
        r: httpx.Response = await client.get(f"https://api.github.com/users/{github_login}", headers=headers)
    r.raise_for_status()
    return r.json()
