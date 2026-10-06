from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_jwt
from app.main import app
from app.models import database


@pytest.fixture()
def client(tmp_path, monkeypatch):
    # cada teste usa um banco de dados temporário e isolado
    db_file = tmp_path / "test-anota-ai.db"
    monkeypatch.setattr(database, "DB_PATH", str(db_file))
    database.init_db()

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def auth_headers() -> dict:
    token = create_jwt(
        {
            "github_login": "test-owner",
            "github_access_token": "dummy-token",
        }
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def seeded(client) -> dict:
    # cenário base: proprietário com equipe, membros, repositório e projeto vinculados
    owner = "test-owner"
    team_id = str(uuid.uuid4())
    database.create_team(team_id=team_id, name="Alpha", created_by_github_login=owner)
    database.add_team_members(
        team_id, ["member-a", "member-b", owner]
    )
    repo_name = "org/repo"
    database.add_repository(
        repo_id=str(uuid.uuid4()),
        full_name=repo_name,
        name="repo",
        owner="org",
        private=False,
        description="",
        html_url=None,
        default_branch="main",
        created_by_github_login=owner,
    )
    project = database.create_project(
        str(uuid.uuid4()), owner, "Projeto Test", "Descrição"
    )
    database.replace_project_links(
        project["id"], owner, [repo_name], [team_id]
    )
    return {
        "owner": owner,
        "team_id": team_id,
        "repo": repo_name,
        "project": project,
    }


def create_test_issue(
    *,
    title: str = "Tarefa de teste",
    assignee: str | None = "member-a",
    points: int = 5,
    priority: str = "medium",
    source: str = "draft",
    project_id: str | None = None,
    record_id: str | None = None,
    repo_full_name: str = "org/repo",
):
    return database.create_issue_row(
        issue_id=str(uuid.uuid4()),
        github_login="test-owner",
        repo_full_name=repo_full_name,
        title=title,
        source=source,
        state="open",
        points=points,
        priority=priority,
        priority_source="system",
        assignee=assignee,
        record_id=record_id,
        project_id=project_id,
    )