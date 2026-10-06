from __future__ import annotations

from datetime import datetime, timedelta

from app.models import database
from app.services.performance import compute_project_performance, summarize_member_metrics

from .conftest import create_test_issue


def test_performance_empty_project(seeded):
    project = database.get_project_detail(seeded["project"]["id"], seeded["owner"])
    perf = compute_project_performance(project=project, issues=[], event_count=0)
    summary = perf["summary"]
    assert summary["total_issues"] == 0
    assert summary["open_issues"] == 0
    assert summary["closed_issues"] == 0
    assert perf["partial_history"]["detected"] is False
    assert perf["risks"] == []


def test_performance_summary_counts_and_partial_history(seeded):
    project_id = seeded["project"]["id"]
    create_test_issue(
        project_id=project_id, assignee="member-a", points=5, title="aberta",
        source="anota_ai",
    )
    closed = create_test_issue(
        project_id=project_id, assignee="member-b", points=3, title="fechada",
        source="anota_ai",
    )
    database.update_issue_fields(closed["id"], seeded["owner"], state="closed")

    project = database.get_project_detail(project_id, seeded["owner"])
    perf = compute_project_performance(project=project, issues=project["issues"], event_count=0)

    assert perf["summary"]["open_issues"] == 1
    assert perf["summary"]["closed_issues"] == 1
    assert perf["summary"]["total_points"] == 8
    assert perf["summary"]["delivered_points"] == 3
    assert perf["summary"]["remaining_points"] == 5
    assert perf["partial_history"]["detected"] is True
    assert perf["partial_history"]["message"]


def test_performance_lead_time_and_throughput(seeded):
    project_id = seeded["project"]["id"]
    days_ago = (datetime.utcnow() - timedelta(days=10)).isoformat()
    issue = create_test_issue(
        project_id=project_id, assignee="member-a", points=2, title="veloz",
        source="anota_ai",
    )

    conn = database._get_conn()
    conn.execute("UPDATE issues SET created_at = ? WHERE id = ?", (days_ago, issue["id"]))
    conn.commit()
    conn.close()

    database.update_issue_fields(issue["id"], seeded["owner"], state="closed")

    project = database.get_project_detail(project_id, seeded["owner"])
    perf = compute_project_performance(project=project, issues=project["issues"], event_count=6)
    assert perf["summary"]["lead_time_avg_days"] == 10
    assert perf["summary"]["throughput_weekly_avg"] >= 0
    assert isinstance(perf["timeline"], list)


def test_performance_member_metrics_and_risks(seeded):
    project_id = seeded["project"]["id"]
    create_test_issue(
        project_id=project_id, assignee="member-a", points=25, title="pesada",
        source="anota_ai",
    )
    project = database.get_project_detail(project_id, seeded["owner"])
    perf = compute_project_performance(project=project, issues=project["issues"], event_count=10)

    by_login = {m["github_login"]: m for m in perf["by_member"]}
    assert by_login["member-a"]["remaining_points"] == 25
    assert any(r["type"] == "overloaded" for r in perf["risks"])

    create_test_issue(
        project_id=project_id, assignee=None, points=1, title="sin dueno",
        source="anota_ai",
    )
    project = database.get_project_detail(project_id, seeded["owner"])
    perf = compute_project_performance(project=project, issues=project["issues"], event_count=10)
    assert any(r["type"] == "unassigned" for r in perf["risks"])


def test_performance_filters_by_member_and_team(seeded):
    project_id = seeded["project"]["id"]
    create_test_issue(project_id=project_id, assignee="member-a", points=3)
    create_test_issue(project_id=project_id, assignee="member-b", points=7)

    project = database.get_project_detail(project_id, seeded["owner"])
    issues = project["issues"]

    only_a = compute_project_performance(
        project=project, issues=issues, event_count=10, member="member-a"
    )
    assert only_a["summary"]["total_points"] == 3

    team_logins = database.get_team_member_logins(seeded["team_id"])
    only_team = compute_project_performance(
        project=project,
        issues=issues,
        event_count=10,
        team_member_logins=team_logins,
    )
    assert only_team["summary"]["total_points"] == 10


def test_summarize_member_metrics_ignores_unknown_assignees():
    members = [
        {"team_github_login": "alice", "name": "Alice", "user_name": "@alice"},
        {"team_github_login": "bob", "name": "Bob", "user_name": "@bob"},
    ]
    issues = [
        {"assignee": "alice", "state": "open", "points": 4, "updated_at": "2026-01-10T10:00:00"},
        {"assignee": "alice", "state": "closed", "points": 6, "closed_at": "2026-01-12T10:00:00"},
        {"assignee": "ghost", "state": "open", "points": 9, "updated_at": "2026-01-11T10:00:00"},
    ]
    stats = summarize_member_metrics(members, issues)
    by_login = {m["github_login"]: m for m in stats}
    assert by_login["alice"]["remaining_points"] == 4
    assert by_login["alice"]["closed_points"] == 6
    assert by_login["alice"]["points_done"] == 6
    assert by_login["bob"]["assigned_issues"] == 0
    assert "ghost" not in by_login
    assert by_login["alice"]["last_activity"] == "2026-01-12"