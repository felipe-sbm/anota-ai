from __future__ import annotations
from urllib.parse import quote, urlsplit

from fastapi import APIRouter, HTTPException, Request, Depends, Header
from fastapi.responses import RedirectResponse, JSONResponse

from ..core.config import settings
from ..core.security import create_jwt, verify_jwt
from ..services.auth_service import github_exchange_code_for_token, github_get_user

app_router = APIRouter(prefix="/api/auth/github", tags=["auth"])


def _get_bearer_token(authorization: str | None):
    if not authorization:
        return None
    if not authorization.startswith("Bearer "):
        return None
    return authorization.split(" ", 1)[1]


async def require_auth(authorization: str = Header(None)):
    token = _get_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization")
    try:
        return verify_jwt(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


def _is_safe_frontend_url(url: str) -> bool:
    """permite redirecionar o callback apenas para a dashborad configurado (evita open redirect)."""
    if not settings.UI_BASE_URL:
        return False
    ui = urlsplit(settings.UI_BASE_URL)
    target = urlsplit(url)
    return bool(target.scheme and ui.scheme == target.scheme and ui.netloc == target.netloc)


@app_router.get("/login")
async def github_login(next: str | None = None):
    redirect_uri = settings.GITHUB_REDIRECT_URI
    scope = settings.GITHUB_SCOPE

    url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope={scope}"
        f"&allow_signup=true"
    )

    # a dashboard passa `next` com a URL de volta para o frontend.
    #
    # o github devolve isso no `state` do callback, permitindo redirecionar
    # o navegador para a UI com o token JWT no query string.
    if next:
        url += f"&state={quote(next, safe='')}"

    return RedirectResponse(url=url)


@app_router.get("/callback")
async def github_callback(
    request: Request,
    code: str | None = None,
    error: str | None = None,
    state: str | None = None,
):
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

    # frontenzo: volta para o frontend com o token no query string.
    if state and _is_safe_frontend_url(state):
        separator = "&" if "?" in state else "?"
        return RedirectResponse(url=f"{state}{separator}token={jwt_token}")

    if settings.UI_BASE_URL:
        ui = settings.UI_BASE_URL.rstrip("/")
        return RedirectResponse(url=f"{ui}/login?token={jwt_token}")

    # Fallback (extensão): a extensão monitora abas com URL começando por
    # {base}/api/auth/github/success?token=...
    success_url = str(request.base_url) + "api/auth/github/success?token=" + jwt_token
    return RedirectResponse(url=success_url)


@app_router.get("/success")
async def github_success():
    return JSONResponse({"message": "Autenticado com sucesso! Você já pode fechar esta aba."})


@app_router.get("/me")
async def github_me(auth=Depends(require_auth)):

    github_access_token = auth.get("github_access_token")
    github_login = auth.get("github_login")
    if not github_access_token:
        raise HTTPException(status_code=401, detail="github_access_token missing in JWT")

    user = await github_get_user(github_access_token)
    return JSONResponse(
        {
            "github_login": github_login or user.get("login"),
            "avatar_url": user.get("avatar_url"),
            "name": user.get("name"),
        }
    )


