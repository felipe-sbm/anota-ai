from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from ..core.security import verify_jwt
from ..models.database import (
    add_repository,
    list_user_repositories,
    remove_repository,
    upsert_external_issue,
)
from ..services.github_service import GithubService

app_router = APIRouter(prefix="/api", tags=["repositories"])


def _get_bearer_token(authorization: str | None):
    if not authorization:
        return None
    if not authorization.startswith("Bearer "):
        return None
    return authorization.split(" ", 1)[1]


async def require_auth(authorization: str = Header(None)):
    token = _get_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Authorization ausente ou inválida")
    try:
        return verify_jwt(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")


class AddRepositoriesRequest(BaseModel):
    full_names: List[str] = Field(default_factory=list)


@app_router.get("/repositories", status_code=200)
async def list_repositories_endpoint(
    auth=Depends(require_auth),
):
    # lista os repositórios que o usuário escolheu adicionar ao sistema
    github_login = auth.get("github_login")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login faltando no JWT")

    repos = list_user_repositories(github_login)
    return {"repositories": repos}


@app_router.post("/repositories", status_code=201)
async def add_repositories_endpoint(
    req: AddRepositoriesRequest,
    auth=Depends(require_auth),
):
    # adiciona repositórios ao sistema (busca os dados no github)
    github_login = auth.get("github_login")
    github_access_token = auth.get("github_access_token")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login faltando no JWT")
    if not github_access_token:
        raise HTTPException(status_code=401, detail="github_access_token faltando no JWT")
    if not req.full_names:
        raise HTTPException(status_code=400, detail="full_names é obrigatório")

    gh = GithubService(access_token=github_access_token)

    added: List[str] = []
    errors: List[dict] = []

    for full_name in req.full_names:
        try:
            repo = gh.get_repo(full_name)
            add_repository(
                repo_id=str(repo["id"]),
                full_name=repo["full_name"],
                name=repo["name"],
                owner=repo["owner"],
                private=repo["private"],
                description=repo["description"],
                html_url=repo["html_url"],
                default_branch=repo["default_branch"],
                created_by_github_login=github_login,
            )
            added.append(repo["full_name"])

            # traz automaticamente as issues do repositório (categoria external).
            # um erro aqui não deve impedir o cadastro do repositório.
            try:
                gh_issues = gh.list_repo_issues(repo["full_name"], state="all")
                for issue_data in gh_issues:
                    upsert_external_issue(
                        github_login=github_login,
                        repo_full_name=repo["full_name"],
                        issue_data=issue_data,
                    )
            except Exception:
                pass
        except Exception as e:
            errors.append({"full_name": full_name, "error": str(e)})

    return {"added": added, "errors": errors}


@app_router.delete("/repositories/{full_name:path}", status_code=200)
async def remove_repository_endpoint(
    full_name: str,
    auth=Depends(require_auth),
):
    # arquiva um repositório do sistema
    # não remove do github, apenas remove do sistema,
    # ou seja, arquiva
    github_login = auth.get("github_login")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login faltando no JWT")

    if not remove_repository(github_login=github_login, full_name=full_name):
        raise HTTPException(status_code=404, detail="repositório não encontrado ou não pertence ao usuário")

    return {"ok": True}