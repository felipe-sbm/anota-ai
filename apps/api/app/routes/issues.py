from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException

from ..models.schemas import CreateIssuesBatchRequest
from ..models.database import get_record, update_record_status
from ..services.github_service import GithubService
from ..core.security import verify_jwt

app_router = APIRouter(prefix="/api", tags=["issues"])


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


@app_router.get("/github/repos", status_code=200)
async def list_github_repos(
    auth=Depends(require_auth),
):
    """Lista os repositórios que o usuário autenticado tem acesso no GitHub."""
    github_access_token = auth.get("github_access_token")
    if not github_access_token:
        raise HTTPException(status_code=401, detail="github_access_token missing in JWT")

    gh = GithubService(access_token=github_access_token)
    try:
        repos = gh.list_user_repos()
        return {"repos": repos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list repos: {str(e)}")


@app_router.post("/issues/batch", status_code=201)
async def create_issues_batch(
    req: CreateIssuesBatchRequest,
    auth=Depends(require_auth),
):
    """Cria issues em lote, cada task pode ir para um repositório e assignee diferente."""
    github_access_token = auth.get("github_access_token")
    if not github_access_token:
        raise HTTPException(status_code=401, detail="github_access_token missing in JWT")

    gh = GithubService(access_token=github_access_token)

    created_issues = []
    errors = []

    for task in req.tasks:
        try:
            issue = gh.create_issue_in_repo(
                repo_full_name=task.repo_full_name,
                title=task.title,
                body=task.body,
                assignee=task.assignee,
            )
            created_issues.append(issue)
        except Exception as e:
            errors.append({
                "title": task.title,
                "repo_full_name": task.repo_full_name,
                "error": str(e),
            })

    # Se informou file_id, atualiza o registro com as issues criadas
    if req.file_id:
        record = get_record(req.file_id)
        if record:
            existing_issues = record.get("created_issues") or []
            if isinstance(existing_issues, str):
                import json
                existing_issues = json.loads(existing_issues)
            all_issues = existing_issues + created_issues
            update_record_status(
                req.file_id,
                status=record.get("status", "processed"),
                created_issues=all_issues,
            )

    return {
        "created_issues": created_issues,
        "errors": errors,
    }