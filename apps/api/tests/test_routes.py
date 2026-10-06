from __future__ import annotations

import uuid

from app.models import database

from .conftest import create_test_issue


def test_performance_endpoint(seeded, client, auth_headers):
    issue = create_test_issue(
        project_id=seeded["project"]["id"], assignee="member-a", points=4
    )
    response = client.get(
        f"/api/projects/{seeded['project']['id']}/performance",
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    perf = response.json()["performance"]
    assert perf["summary"]["total_issues"] == 1
    assert perf["summary"]["total_points"] == 4
    assert "burndown" in perf
    assert "burnup" in perf
    assert "by_member" in perf
    assert "risks" in perf


def test_performance_filters_by_member(seeded, client, auth_headers):
    create_test_issue(project_id=seeded["project"]["id"], assignee="member-a", points=3)
    create_test_issue(project_id=seeded["project"]["id"], assignee="member-b", points=7)
    response = client.get(
        f"/api/projects/{seeded['project']['id']}/performance?member=member-a",
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    assert response.json()["performance"]["summary"]["total_points"] == 3


def test_performance_filters_by_team(seeded, client, auth_headers):
    create_test_issue(project_id=seeded["project"]["id"], assignee="member-a", points=3)
    response = client.get(
        f"/api/projects/{seeded['project']['id']}/performance?team_id={seeded['team_id']}",
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    assert response.json()["performance"]["summary"]["total_points"] == 3


def test_performance_requires_auth(seeded, client):
    response = client.get(f"/api/projects/{seeded['project']['id']}/performance")
    assert response.status_code == 401


def test_project_delete_archives_and_restore(seeded, client, auth_headers):
    # DELETE agora arquiva (não apaga dados)
    response = client.delete(
        f"/api/projects/{seeded['project']['id']}", headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["archived"] is True

    # o projeto não aparece mais nos detalhes nem nas listagens
    assert client.get(
        f"/api/projects/{seeded['project']['id']}", headers=auth_headers
    ).status_code == 404

    # é possível restaurar
    response = client.post(
        f"/api/projects/{seeded['project']['id']}/restore", headers=auth_headers
    )
    assert response.status_code == 200
    assert client.get(
        f"/api/projects/{seeded['project']['id']}", headers=auth_headers
    ).status_code == 200


def test_team_detail_endpoint(seeded, client, auth_headers):
    response = client.get(
        f"/api/teams/{seeded['team_id']}", headers=auth_headers
    )
    assert response.status_code == 200, response.text
    team = response.json()["team"]
    assert team["member_count"] == 3
    assert [p["id"] for p in team["projects"]] == [seeded["project"]["id"]]


def test_audio_statuses_endpoint(client, auth_headers):
    response = client.get("/api/audio/statuses", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "uploaded" in data["statuses"]
    assert "pending_review" in data["statuses"]
    assert "labels" in data


def test_update_issue_assignee_validated(seeded, client, auth_headers):
    issue = create_test_issue(
        project_id=seeded["project"]["id"], assignee="member-a", title="rascunho"
    )
    # responsável que não pertence às equipes -> 400
    response = client.patch(
        f"/api/issues/{issue['id']}",
        json={"assignee": "stranger"},
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert "responsable" in response.text.lower()

    # membro real -> 200
    response = client.patch(
        f"/api/issues/{issue['id']}",
        json={"assignee": "member-b"},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text


def test_github_users_search_without_token_returns_401(client):
    response = client.get("/api/github/users/search?q=test")
    assert response.status_code == 401