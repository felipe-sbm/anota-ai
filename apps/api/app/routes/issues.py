from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Header, HTTPException

from ..models.schemas import (
    ConfirmIssuesRequest,
    CreateIssuesBatchRequest,
    IssueCreateRequest,
    IssueUpdateRequest,
)
from ..models.database import (
    append_created_issue_to_record,
    create_issue_row,
    delete_user_issue,
    get_record,
    get_user_issue,
    list_user_issues,
    list_user_repositories,
    mark_drafts_confirmed,
    update_issue_fields,
    update_record_status,
    upsert_external_issue,
)
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
    # lista os repositórios que o usuário autenticado tem acesso no github.
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
    # cria issues em lote, cada task pode ir para um repositório e assignee diferente.
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

    # se informou file_id, atualiza o registro com as issues criadas
    if req.file_id:
        record = get_record(req.file_id)
        if record is None or record.get("user_github_login") != auth.get("github_login", ""):
            raise HTTPException(status_code=404, detail="Registro não encontrado")
        existing_issues = record.get("created_issues") or []
        if isinstance(existing_issues, str):
            import json
            existing_issues = json.loads(existing_issues)
        all_issues = existing_issues + created_issues
        update_record_status(
            req.file_id,
            status="reviewed",
            created_issues=all_issues,
        )

        # vincula rascunhos pendentes desta reunião com as issues criadas
        if created_issues:
            mark_drafts_confirmed(
                req.file_id,
                auth.get("github_login", ""),
                created_issues,
            )

    return {
        "created_issues": created_issues,
        "errors": errors,
    }


# issues do sistema


@app_router.get("/issues", status_code=200)
async def list_issues(
    search: str = "",
    source: str = "",
    priority: str = "",
    state: str = "",
    repo_full_name: str = "",
    sort: str = "newest",
    limit: int = 1000,
    offset: int = 0,
    auth=Depends(require_auth),
):
    # lista issues do usuário (externas, rascunho e instantâneas).
    # filtros: source (external, draft, anota_ai), priority (low, medium, high),
    # state (open, closed), repo_full_name, search (título, body, repo, número).
    # ordenação: oldest, newest, points_desc, points_asc, priority_high ou priority_low.
    github_login = auth.get("github_login")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login faltando no JWT")

    issues, total = list_user_issues(
        github_login,
        search=search,
        source=source,
        priority=priority,
        state=state,
        repo_full_name=repo_full_name,
        sort=sort,
        limit=min(limit, 2000),
        offset=offset,
    )
    return {"issues": issues, "total": total}


@app_router.post("/issues", status_code=201)
async def create_instant_issue(
    req: IssueCreateRequest,
    auth=Depends(require_auth),
):
    # cria uma issue instantânea: envia ao github e guarda no sistema
    # junto com pontos e prioridade (o github não os armazena).
    github_login = auth.get("github_login")
    github_access_token = auth.get("github_access_token")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login faltando no JWT")
    if not github_access_token:
        raise HTTPException(status_code=401, detail="github_access_token faltando no JWT")

    repos = {repo["full_name"] for repo in list_user_repositories(github_login)}
    if req.repo_full_name not in repos:
        raise HTTPException(
            status_code=400,
            detail="Repositorio não foi adicionado ao sistema.",
        )

    gh = GithubService(access_token=github_access_token)
    try:
        created = gh.create_issue_in_repo(
            repo_full_name=req.repo_full_name,
            title=req.title,
            body=req.body or "",
            assignee=req.assignee,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    issue = create_issue_row(
        issue_id=str(uuid.uuid4()),
        github_login=github_login,
        repo_full_name=req.repo_full_name,
        title=req.title,
        body=req.body or "",
        source="anota_ai",
        state="open",
        points=req.points,
        priority=req.priority,
        priority_source="user",
        assignee=req.assignee,
        github_issue_id=created.get("id"),
        number=created.get("number"),
        html_url=created.get("html_url"),
    )
    return {"issue": issue}


@app_router.patch("/issues/{issue_id}", status_code=200)
async def update_issue(
    issue_id: str,
    req: IssueUpdateRequest,
    auth=Depends(require_auth),
):
    # atualiza pontos e prioridade (e campos editáveis de rascunhos).
    # para issues já enviadas ao github (externas ou instantâneas) só se podem
    # atualizar os metadados locais: points e priority.
    github_login = auth.get("github_login")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login faltando no JWT")

    current = get_user_issue(issue_id, github_login)
    if current is None:
        raise HTTPException(status_code=404, detail="Issue não encontrada")

    changes = {}
    if req.points is not None:
        changes["points"] = req.points
    if req.priority is not None:
        changes["priority"] = req.priority
        # quando o usuário define a prioridade, deixa de ser sugestão do sistema
        changes["priority_source"] = "user"

    is_draft_pending = (
        current.get("source") == "draft"
        and current.get("github_issue_id") is None
    )
    if is_draft_pending:
        if req.title is not None and req.title.strip():
            changes["title"] = req.title.strip()
        if req.body is not None:
            changes["body"] = req.body
        if req.repo_full_name is not None:
            repos = {r["full_name"] for r in list_user_repositories(github_login)}
            if req.repo_full_name not in repos:
                raise HTTPException(
                    status_code=400,
                    detail="Repositorio não foi adicionado ao sistema.",
                )
            changes["repo_full_name"] = req.repo_full_name
        if req.assignee is not None:
            changes["assignee"] = req.assignee.strip() or None

    if not changes:
        return {"issue": current}

    updated = update_issue_fields(issue_id, github_login, **changes)
    return {"issue": updated}


@app_router.delete("/issues/{issue_id}", status_code=200)
async def delete_issue(
    issue_id: str,
    auth=Depends(require_auth),
):
    # elimina do sistema uma issue do tipo rascunho.
    github_login = auth.get("github_login")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login faltando no JWT")

    current = get_user_issue(issue_id, github_login)
    if current is None:
        raise HTTPException(status_code=404, detail="Issue não encontrada")
    if current.get("source") != "draft":
        raise HTTPException(
            status_code=400,
            detail="Solo rascunhos podem ser eliminados do sistema.",
        )

    delete_user_issue(issue_id, github_login)
    return {"ok": True}


@app_router.post("/issues/confirm", status_code=200)
async def confirm_issues(
    req: ConfirmIssuesRequest,
    auth=Depends(require_auth),
):
    # confirma rascunhos: cria as issues no github e vincula o id.
    # os pontos e prioridade permanecem no sistema (o github não os armazena).
    github_login = auth.get("github_login")
    github_access_token = auth.get("github_access_token")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login faltando no JWT")
    if not github_access_token:
        raise HTTPException(status_code=401, detail="github_access_token faltando no JWT")

    gh = GithubService(access_token=github_access_token)
    results = []

    for issue_id in req.issue_ids:
        issue = get_user_issue(issue_id, github_login)
        if issue is None:
            results.append({"id": issue_id, "ok": False, "error": "Issue não encontrada"})
            continue
        if issue.get("github_issue_id") is not None:
            results.append({"id": issue_id, "ok": True, "already": True, "issue": issue})
            continue
        if not issue.get("repo_full_name"):
            results.append({
                "id": issue_id,
                "ok": False,
                "error": "Asigna um repositório antes de confirmar.",
            })
            continue

        try:
            created = gh.create_issue_in_repo(
                repo_full_name=issue["repo_full_name"],
                title=issue["title"],
                body=issue["body"] or "",
                assignee=issue.get("assignee"),
            )
        except Exception as e:
            results.append({"id": issue_id, "ok": False, "error": str(e)})
            continue

        updated = update_issue_fields(
            issue_id,
            github_login,
            github_issue_id=created.get("id"),
            number=created.get("number"),
            html_url=created.get("html_url"),
            state="open",
        )

        # se veio de uma reunião, mantém a página da gravação atualizada
        record_id = issue.get("record_id")
        if record_id:
            record = get_record(record_id)
            if record is not None and record.get("user_github_login") == github_login:
                append_created_issue_to_record(
                    record_id,
                    {
                        "number": created.get("number"),
                        "id": created.get("id"),
                        "html_url": created.get("html_url"),
                        "title": issue["title"],
                        "repo_full_name": issue["repo_full_name"],
                    },
                )
                if record.get("status") == "pending_review":
                    update_record_status(record_id, "reviewed")

        results.append({"id": issue_id, "ok": True, "issue": updated})

    return {"results": results}


@app_router.post("/issues/sync", status_code=200)
async def sync_external_issues(
    auth=Depends(require_auth),
):
    # traz as issues dos repositórios adicionados e as categoriza como external.
    github_login = auth.get("github_login")
    github_access_token = auth.get("github_access_token")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login faltando no JWT")
    if not github_access_token:
        raise HTTPException(status_code=401, detail="github_access_token faltando no JWT")

    repos = list_user_repositories(github_login)
    gh = GithubService(access_token=github_access_token)

    added = 0
    errors = []

    for repo in repos:
        try:
            issues = gh.list_repo_issues(repo["full_name"], state="all")
        except Exception as e:
            errors.append({"repo": repo["full_name"], "error": str(e)})
            continue

        for issue_data in issues:
            if upsert_external_issue(
                github_login=github_login,
                repo_full_name=repo["full_name"],
                issue_data=issue_data,
            ):
                added += 1

    return {"added": added, "errors": errors}