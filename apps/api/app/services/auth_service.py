from __future__ import annotations

from typing import Optional

import httpx

from ..core.config import settings


async def github_exchange_code_for_token(code: str) -> str:
    url = "https://github.com/login/oauth/access_token"
    data = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "client_secret": settings.GITHUB_CLIENT_SECRET,
        "code": code,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(url, data=data, headers={"Accept": "application/json"})
    r.raise_for_status()
    payload = r.json() if r.headers.get("content-type", "").startswith("application/json") else dict(x.split("=") for x in r.text.split("&"))

    access_token = payload.get("access_token")
    if not access_token:
        raise RuntimeError(f"GitHub token exchange failed: {payload}")
    return access_token


async def github_get_user(access_token: str) -> dict:
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"}
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get("https://api.github.com/user", headers=headers)
    r.raise_for_status()
    return r.json()

