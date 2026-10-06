from __future__ import annotations

import uuid
from collections import Counter
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from ..models.database import (
    archive_user_project,
    attach_issue_to_project,
    attach_record_to_project,
    build_burndown,
    count_issue_events,
    create_project,
    get_project_detail,
    get_project_member_logins,
    get_user_project,
    list_sprint_linked_issue_ids,
    list_user_projects,
    list_user_repositories,
    replace_project_links,
    restore_user_project,
    update_project,
)
from ..models.schemas import ProjectCreateRequest, ProjectLinkRequest, ProjectUpdateRequest
from ..services.auth_service import github_get_user_by_login
from ..services.performance import compute_project_performance
from .issues import require_auth
from .teams import team_belongs_to_user

app_router = APIRouter(prefix="/api/projects", tags=["projects"])


def _validate_links(req, github_login: str):
    valid_repos = {repo["full_name"] for repo in list_user_repositories(github_login)}
    invalid_repos = sorted(set(req.repositories) - valid_repos)
    invalid_teams = [team_id for team_id in req.team_ids if not team_belongs_to_user(team_id, github_login)]
    if invalid_repos or invalid_teams:
        raise HTTPException(
            status_code=400,
            detail={"invalid_repositories": invalid_repos, "invalid_teams": invalid_teams},
        )


def _validate_link_values(repositories: list[str], team_ids: list[str], github_login: str):
    valid_repos = {repo["full_name"] for repo in list_user_repositories(github_login)}
    invalid_repos = sorted(set(repositories) - valid_repos)
    invalid_teams = [team_id for team_id in team_ids if not team_belongs_to_user(team_id, github_login)]
    if invalid_repos or invalid_teams:
        raise HTTPException(status_code=400, detail={"invalid_repositories": invalid_repos, "invalid_teams": invalid_teams})


def _decorate(project: dict) -> dict:
    issues = project.get("issues", [])
    members = project.get("team_members", [])
    assignments = Counter(issue.get("assignee") for issue in issues if issue.get("assignee"))
    project["metrics"] = {
        "issues": len(issues),
        "drafts": sum(1 for issue in issues if issue.get("source") == "draft" and issue.get("github_issue_id") is None),
        "open_issues": sum(1 for issue in issues if issue.get("state") == "open"),
        "closed_issues": sum(1 for issue in issues if issue.get("state") == "closed"),
        "recordings": len(project.get("records", [])),
    }
    project["team_members"] = [
        {
            **member,
            "team_role": member.get("team_role") or "",
            "assigned_issues": assignments.get(member.get("team_github_login"), 0),
        }
        for member in members
    ]
    project["diagram"] = [
        {"label": "Issues abertas", "value": project["metrics"]["open_issues"]},
        {"label": "Rascunhos", "value": project["metrics"]["drafts"]},
        {"label": "Issues fechadas", "value": project["metrics"]["closed_issues"]},
    ]
    today = datetime.utcnow().date().isoformat()
    issue_dates = [
        str(issue.get("created_at", ""))[:10]
        for issue in issues
        if str(issue.get("created_at", ""))[:10]
    ]
    start_date = min(issue_dates or [str(project.get("created_at", today))[:10]])
    project["burndown"] = build_burndown(
        {"start_date": start_date, "end_date": today},
        [
            {
                "points": issue.get("points", 0),
                "status": "done" if issue.get("state") == "closed" else "todo",
                "completed_at": issue.get("updated_at") if issue.get("state") == "closed" else None,
            }
            for issue in issues
        ],
    )
    return project


async def _hydrate_member_profiles(project: dict, access_token: str | None) -> dict:
    if not access_token:
        return project

    for member in project.get("team_members", []):
        login = member.get("team_github_login") or member.get("user_name", "").lstrip("@")
        if not login:
            continue
        try:
            profile = await github_get_user_by_login(access_token, login)
        except Exception:
            continue
        member["name"] = profile.get("name") or member.get("name") or login
        member["user_name"] = f"@{login}"
    return project


@app_router.get("")
async def list_projects(auth=Depends(require_auth)):
    login = auth.get("github_login")
    if not login:
        raise HTTPException(status_code=401, detail="github_login faltando no JWT")
    return {"projects": list_user_projects(login)}


@app_router.post("", status_code=201)
async def create_project_endpoint(req: ProjectCreateRequest, auth=Depends(require_auth)):
    login = auth.get("github_login")
    if not login:
        raise HTTPException(status_code=401, detail="github_login faltando no JWT")
    _validate_links(req, login)
    project = create_project(str(uuid.uuid4()), login, req.name.strip(), req.description.strip())
    replace_project_links(project["id"], login, req.repositories, req.team_ids)
    project_detail = get_project_detail(project["id"], login)
    await _hydrate_member_profiles(project_detail or {}, auth.get("github_access_token"))
    return {"project": project_detail}


@app_router.get("/{project_id}")
async def get_project(project_id: str, auth=Depends(require_auth)):
    login = auth.get("github_login")
    project = get_project_detail(project_id, login or "")
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    await _hydrate_member_profiles(project, auth.get("github_access_token"))
    return {"project": _decorate(project)}


@app_router.patch("/{project_id}")
async def update_project_endpoint(project_id: str, req: ProjectUpdateRequest, auth=Depends(require_auth)):
    login = auth.get("github_login")
    if not login or get_user_project(project_id, login) is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    payload = req.model_dump(exclude_none=True)
    if req.repositories is not None or req.team_ids is not None:
        current = get_project_detail(project_id, login) or {}
        _validate_link_values(req.repositories if req.repositories is not None else current["repositories"], req.team_ids if req.team_ids is not None else current["team_ids"], login)
    update_project(project_id, login, **{key: value.strip() if isinstance(value, str) else value for key, value in payload.items() if key in {"name", "description"}})
    if req.repositories is not None or req.team_ids is not None:
        current = get_project_detail(project_id, login) or {}
        replace_project_links(project_id, login, req.repositories if req.repositories is not None else current["repositories"], req.team_ids if req.team_ids is not None else current["team_ids"])
    project = get_project_detail(project_id, login) or {}
    await _hydrate_member_profiles(project, auth.get("github_access_token"))
    return {"project": _decorate(project)}


@app_router.delete("/{project_id}")
async def delete_project_endpoint(project_id: str, auth=Depends(require_auth)):
    # arquiva o projeto: os vínculos e métricas são mantidos para permitir
    # sua restauração. NENHUM dado é apagado diretamente (a UI promete recuperação).
    login = auth.get("github_login")
    if not login or not archive_user_project(project_id, login):
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return {"ok": True, "archived": True}


@app_router.post("/{project_id}/restore")
async def restore_project_endpoint(project_id: str, auth=Depends(require_auth)):
    login = auth.get("github_login")
    if not login or not restore_user_project(project_id, login):
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return {"ok": True, "archived": False}


@app_router.get("/{project_id}/performance")
async def get_project_performance(
    project_id: str,
    period_start: str = "",
    period_end: str = "",
    granularity: str = "daily",
    team_id: str = "",
    member: str = "",
    sprint_id: str = "",
    auth=Depends(require_auth),
):
    # métricas de desempenho: resumo, evolução, burndown/burnup, throughput,
    # lead time, distribuição, carga por pessoa e riscos acionáveis.
    login = auth.get("github_login")
    if not login:
        raise HTTPException(status_code=401, detail="github_login faltando no JWT")

    project = get_project_detail(project_id, login)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    issues = project.get("issues", [])
    event_count = count_issue_events(login, project_id=project_id)

    team_member_logins = None
    if team_id:
        from .teams import get_team_member_logins_for_route

        team_member_logins = get_team_member_logins_for_route(team_id, login)
        if team_member_logins is None:
            raise HTTPException(status_code=404, detail="Equipe não encontrada")

    sprint_issue_ids = None
    if sprint_id:
        sprint_issue_ids = list_sprint_linked_issue_ids(sprint_id, login)

    performance = compute_project_performance(
        project=project,
        issues=issues,
        event_count=event_count,
        period_start=period_start,
        period_end=period_end,
        granularity=granularity,
        team_member_logins=team_member_logins,
        member=member,
        sprint_issue_ids=sprint_issue_ids,
    )
    return {"performance": performance}


@app_router.patch("/{project_id}/records/{record_id}")
async def link_record(project_id: str, record_id: str, auth=Depends(require_auth)):
    login = auth.get("github_login")
    record = attach_record_to_project(record_id, project_id, login or "")
    if record is None:
        raise HTTPException(status_code=404, detail="Gravação ou projeto não encontrado")
    return {"record": record}


@app_router.patch("/issues/{issue_id}")
async def link_issue(issue_id: str, req: ProjectLinkRequest, auth=Depends(require_auth)):
    login = auth.get("github_login")
    issue = attach_issue_to_project(issue_id, req.project_id, login or "")
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue ou projeto não encontrado")
    return {"issue": issue}
