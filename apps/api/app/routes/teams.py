from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from ..core.security import verify_jwt
from ..models.database import add_team_members, create_team, get_team_members, list_user_teams, remove_team_member, upsert_user_aliases

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


class CreateTeamRequest(BaseModel):
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


@app_router.delete("/teams/{team_id}/members/{github_login}", status_code=200)
async def remove_team_member_endpoint(
    team_id: str,
    github_login: str,
    auth=Depends(require_auth),
):
    remove_team_member(team_id=team_id, github_login=github_login)
    return {"ok": True}


@app_router.get("/teams/{team_id}/members", status_code=200)
async def get_team_members_endpoint(
    team_id: str,
    auth=Depends(require_auth),
):
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

    # MVP: não valida ownership; só adiciona.
    add_team_members(team_id=req.team_id, github_logins=req.github_logins)
    return {"ok": True}


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

