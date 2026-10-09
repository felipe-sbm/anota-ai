"""Project team, member, and personal-alias endpoints."""

from __future__ import annotations
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from ..core.security import verify_jwt
from ..models.database import (
    add_team_members,
    create_team,
    delete_user_alias,
    get_team_detail,
    get_team_member_logins,
    get_team_members,
    list_user_aliases,
    list_user_teams,
    remove_team_member,
    team_belongs_to_user,
    update_team,
    upsert_user_aliases,
)
from ..services.auth_service import github_get_user_by_login
from ..services.performance import summarize_member_metrics

app_router = APIRouter(prefix="/api", tags=["teams"])


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


def get_team_member_logins_for_route(team_id: str, github_login: str) -> set[str] | None:
    # usado pelas rotas de desempenho que filtram por equipe; devolve None
    # quando a equipe não pertence ao usuário.
    if not team_belongs_to_user(team_id, github_login):
        return None
    return get_team_member_logins(team_id)


class CreateTeamRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class UpdateTeamRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class AddTeamMembersRequest(BaseModel):
    team_id: str
    github_logins: List[str] = Field(default_factory=list)


class AliasItem(BaseModel):
    alias: str = Field(min_length=1, max_length=80)
    display_name: Optional[str] = Field(default=None, max_length=120)


class AddUserAliasesRequest(BaseModel):
    aliases: List[AliasItem] = Field(default_factory=list)


@app_router.get("/teams", status_code=200)
async def list_teams_endpoint(
    auth=Depends(require_auth),
):
    github_login = auth.get("github_login")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login missing in JWT")

    teams = list_user_teams(github_login)
    return {"teams": teams}


@app_router.get("/teams/{team_id}", status_code=200)
async def get_team_detail_endpoint(
    team_id: str,
    auth=Depends(require_auth),
):
    # detalhe de uma equipe: membros (com perfil do GitHub), projetos,
    # repositórios e issues de cada pessoa.
    github_login = auth.get("github_login")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login missing in JWT")
    if not team_belongs_to_user(team_id, github_login):
        raise HTTPException(status_code=404, detail="Equipe não encontrada")

    detail = get_team_detail(team_id, github_login) or {}
    issues = detail.get("issues", [])
    members = [{"github_login": m["github_login"]} for m in detail.get("members", [])]
    member_stats = summarize_member_metrics(members, issues)
    stats_by_login = {m["github_login"]: m for m in member_stats}

    hydrated = []
    access_token = auth.get("github_access_token")
    for member in detail.get("members", []):
        item = {
            **member,
            "name": member["github_login"],
            "avatar_url": None,
            "stats": stats_by_login.get(member["github_login"]),
        }
        if access_token:
            try:
                profile = await github_get_user_by_login(access_token, member["github_login"])
                item["name"] = profile.get("name") or member["github_login"]
                item["avatar_url"] = profile.get("avatar_url")
            except Exception:
                pass
        hydrated.append(item)

    detail["members"] = hydrated
    detail["member_stats"] = member_stats
    return {"team": detail}


@app_router.delete("/teams/{team_id}/members/{github_login}", status_code=200)
async def remove_team_member_endpoint(
    team_id: str,
    github_login: str,
    auth=Depends(require_auth),
):
    if not team_belongs_to_user(team_id, auth.get("github_login", "")):
        raise HTTPException(status_code=404, detail="Equipe não encontrada")
    remove_team_member(team_id=team_id, github_login=github_login)
    return {"ok": True}


@app_router.get("/teams/{team_id}/members", status_code=200)
async def get_team_members_endpoint(
    team_id: str,
    auth=Depends(require_auth),
):
    if not team_belongs_to_user(team_id, auth.get("github_login", "")):
        raise HTTPException(status_code=404, detail="Equipe não encontrada")
    members = get_team_members(team_id)
    return {"members": members}


@app_router.post("/teams", status_code=201)
async def create_team_endpoint(
    req: CreateTeamRequest,
    auth=Depends(require_auth),
):
    github_login = auth.get("github_login")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login missing in JWT")

    team_id = str(uuid.uuid4())
    create_team(team_id=team_id, name=req.name, created_by_github_login=github_login)
    return {"team_id": team_id}


@app_router.post("/teams/members", status_code=200)
async def add_team_members_endpoint(
    req: AddTeamMembersRequest,
    auth=Depends(require_auth),
):
    if not req.team_id:
        raise HTTPException(status_code=400, detail="team_id is required")
    if not req.github_logins:
        return {"ok": True}

    if not team_belongs_to_user(req.team_id, auth.get("github_login", "")):
        raise HTTPException(status_code=404, detail="Equipe não encontrada")
    add_team_members(team_id=req.team_id, github_logins=req.github_logins)
    return {"ok": True}


@app_router.put("/teams/{team_id}", status_code=200)
async def update_team_endpoint(
    team_id: str,
    req: UpdateTeamRequest,
    auth=Depends(require_auth),
):
    if not update_team(team_id, req.name.strip(), auth.get("github_login", "")):
        raise HTTPException(status_code=404, detail="Equipe não encontrada")
    return {"ok": True}


@app_router.get("/me/aliases", status_code=200)
async def list_user_aliases_endpoint(
    auth=Depends(require_auth),
):
    github_login = auth.get("github_login")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login missing in JWT")

    return {"aliases": list_user_aliases(github_login)}


@app_router.post("/me/aliases", status_code=200)
async def add_user_aliases_endpoint(
    req: AddUserAliasesRequest,
    auth=Depends(require_auth),
):
    github_login = auth.get("github_login")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login missing in JWT")

    aliases = [(a.alias.strip(), a.display_name.strip() if a.display_name else None) for a in req.aliases]
    upsert_user_aliases(github_login=github_login, aliases=aliases)
    return {"ok": True}


@app_router.delete("/me/aliases/{alias}", status_code=200)
async def delete_user_alias_endpoint(
    alias: str,
    auth=Depends(require_auth),
):
    github_login = auth.get("github_login")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login missing in JWT")

    if not delete_user_alias(github_login=github_login, alias=alias):
        raise HTTPException(status_code=404, detail="Alias não encontrado")
    return {"ok": True}
