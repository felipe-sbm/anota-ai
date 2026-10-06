from __future__ import annotations

from app.models import database

from .conftest import create_test_issue


def test_recording_statuses_are_canonical():
    # extensão, API e dashboard compartilham o mesmo vocabulário de estados
    assert list(database.RECORDING_STATUSES) == [
        "uploaded",
        "processing",
        "pending_review",
        "reviewed",
        "error",
    ]
    assert database.normalize_record_status("UPLOADED ") == "uploaded"
    assert database.normalize_record_status("inexistente") == "uploaded"


def test_issue_creation_records_event(seeded):
    issue = create_test_issue(project_id=seeded["project"]["id"])
    events, total = database.list_issue_events(
        seeded["owner"], issue_id=issue["id"]
    )
    assert total == 1
    assert events[0]["event_type"] == database.EVENT_ISSUE_CREATED
    assert events[0]["metadata"]["source"] == "draft"


def test_issue_updates_record_transitions(seeded):
    issue = create_test_issue(
        project_id=seeded["project"]["id"],
        assignee="member-a",
        points=3,
        priority="low",
    )
    updated = database.update_issue_fields(
        issue["id"],
        seeded["owner"],
        points=8,
        priority="high",
        assignee="member-b",
        state="closed",
    )
    assert updated["state"] == "closed"
    assert updated["closed_at"] is not None

    events, total = database.list_issue_events(
        seeded["owner"], issue_id=issue["id"]
    )
    types = {e["event_type"] for e in events}
    assert database.EVENT_ISSUE_POINTS_CHANGED in types
    assert database.EVENT_ISSUE_PRIORITY_CHANGED in types
    assert database.EVENT_ISSUE_ASSIGNED in types
    assert database.EVENT_ISSUE_STATE_CHANGED in types

    points_event = next(
        e for e in events if e["event_type"] == database.EVENT_ISSUE_POINTS_CHANGED
    )
    assert points_event["old_value"] == "3"
    assert points_event["new_value"] == "8"


def test_draft_confirmation_records_event(seeded):
    issue = create_test_issue(
        project_id=seeded["project"]["id"], record_id="rec-draft-1"
    )
    database.mark_drafts_confirmed(
        "rec-draft-1",
        seeded["owner"],
        [{"id": 99, "number": 7, "html_url": "https://github.com/x"}],
    )
    events, total = database.list_issue_events(
        seeded["owner"],
        issue_id=issue["id"],
        event_type=database.EVENT_ISSUE_CONFIRMED,
    )
    assert total == 1
    assert events[0]["metadata"]["github_issue_id"] == 99


def test_delete_issue_records_deleted_event(seeded):
    issue = create_test_issue(project_id=seeded["project"]["id"])
    assert database.delete_user_issue(issue["id"], seeded["owner"]) is True
    events, total = database.list_issue_events(
        seeded["owner"], issue_id=issue["id"]
    )
    assert any(e["event_type"] == database.EVENT_ISSUE_DELETED for e in events)


def test_issue_link_events(seeded):
    issue = create_test_issue()
    detached = database.attach_issue_to_project(
        issue["id"], seeded["project"]["id"], seeded["owner"]
    )
    assert detached["project_id"] == seeded["project"]["id"]
    events, total = database.list_issue_events(
        seeded["owner"], issue_id=issue["id"]
    )
    assert any(e["event_type"] == database.EVENT_ISSUE_LINKED for e in events)


def test_project_archive_and_restore(seeded, client):
    project_id = seeded["project"]["id"]
    assert database.archive_user_project(project_id, seeded["owner"]) is True

    # oculto de listagens e detalhes
    assert [p["id"] for p in database.list_user_projects(seeded["owner"])] == []
    assert database.get_user_project(project_id, seeded["owner"]) is None
    # ainda acessível com include_archived
    assert (
        database.get_user_project(project_id, seeded["owner"], include_archived=True)
        is not None
    )

    assert database.restore_user_project(project_id, seeded["owner"]) is True
    assert database.get_user_project(project_id, seeded["owner"]) is not None


def test_assignee_validated_against_project_team(seeded):
    project_id = seeded["project"]["id"]
    # membros da equipe do projeto -> válidos
    assert database.validate_assignee_for_project(project_id, "member-a", seeded["owner"])
    assert database.validate_assignee_for_project(project_id, "@member-b", seeded["owner"])
    # o próprio autor pode se autoatribuir
    assert database.validate_assignee_for_project(project_id, seeded["owner"], seeded["owner"])
    # extraños no son válidos
    assert not database.validate_assignee_for_project(project_id, "stranger", seeded["owner"])
    # sem projeto não há validação (depende apenas do autor)
    assert database.validate_assignee_for_project(None, "stranger", seeded["owner"])


def test_team_detail_returns_projects_and_issues(seeded):
    issue = create_test_issue(project_id=seeded["project"]["id"], assignee="member-a")
    detail = database.get_team_detail(seeded["team_id"], seeded["owner"])
    assert detail is not None
    assert {m["github_login"] for m in detail["members"]} >= {
        "member-a",
        "member-b",
    }
    assert [p["id"] for p in detail["projects"]] == [seeded["project"]["id"]]
    assert seeded["repo"] in detail["repositories"]
    assert any(i["id"] == issue["id"] for i in detail["issues"])


def test_events_scoped_to_owner(seeded):
    create_test_issue(project_id=seeded["project"]["id"])
    _, total = database.list_issue_events("other-user")
    assert total == 0