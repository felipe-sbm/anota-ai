from __future__ import annotations
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from ..core.config import settings
from ..core.security import create_jwt
from ..services.auth_service import github_exchange_code_for_token, github_get_user

app_router = APIRouter(prefix="/api/auth/github", tags=["auth"])


@app_router.get("/login")
async def github_login():
    redirect_uri = settings.GITHUB_REDIRECT_URI
    scope = settings.GITHUB_SCOPE

    url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope={scope}"
        f"&allow_signup=true"
    )
    return RedirectResponse(url=url)


@app_router.get("/callback")
async def github_callback(request: Request, code: str | None = None, error: str | None = None):
    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")

    token = await github_exchange_code_for_token(code)

    user = await github_get_user(token)
    github_login = user.get("login")
    github_id = user.get("id")

    if not github_login or not github_id:
        raise HTTPException(status_code=400, detail="Unable to fetch GitHub user")

    # inclui github_access_token para permitir criar issues sem persistência de DB
    jwt_token = create_jwt(
        {
            "sub": str(github_id),
            "github_login": github_login,
            "github_access_token": token,
        }
    )

    # extensão geralmente espera json para armazenar token
    return JSONResponse({"access_token": jwt_token, "token_type": "bearer"})

