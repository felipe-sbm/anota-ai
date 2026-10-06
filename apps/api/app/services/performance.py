from __future__ import annotations

from collections import Counter
from datetime import date, datetime, timedelta
from typing import Any, Dict, Iterable, Optional

from ..models.database import build_burndown


def _parse_day(value: Any) -> Optional[date]:
    if value is None or value == "":
        return None
    try:
        return datetime.fromisoformat(str(value)[:10]).date()
    except (TypeError, ValueError):
        return None


def _clamp_points(value: Any) -> int:
    try:
        return max(0, min(int(value or 0), 100))
    except (TypeError, ValueError):
        return 0


def _normalize_login(value: Any) -> str:
    return str(value or "").strip().lstrip("@").lower()


def _iso(value: date) -> str:
    return value.isoformat()


def _bucket_key(day: date, granularity: str) -> date:
    if granularity == "weekly":
        return day - timedelta(days=day.weekday())
    return day


def _in_period(day: Optional[date], start: Optional[date], end: Optional[date]) -> bool:
    if day is None:
        return False
    if start and day < start:
        return False
    if end and day > end:
        return False
    return True


def _closed_date(issue: dict) -> Optional[date]:
    # prefere closed_at (transição real); sem ele usa updated_at como histórico parcial
    day = _parse_day(issue.get("closed_at") or issue.get("completed_at"))
    if day is not None:
        return day
    if issue.get("state") == "closed":
        return _parse_day(issue.get("updated_at"))
    return None


def summarize_member_metrics(
    members: Iterable[dict], issues: list[dict]
) -> list[dict]:
    # métricas por pessoa: carga, pontos entregues e última atividade.
    # usado tanto pela API de desempenho quanto pelo detalhe de equipes.
    by_login: Dict[str, dict] = {}
    for member in members:
        login = _normalize_login(
            member.get("team_github_login") or member.get("github_login")
        )
        if not login:
            continue
        by_login[login] = {
            "github_login": login,
            "name": member.get("name") or member.get("user_name") or login,
            "assigned_issues": 0,
            "open_count": 0,
            "remaining_points": 0,
            "closed_count": 0,
            "closed_points": 0,
            "points_done": 0,
            "pending_drafts": 0,
            "last_activity": None,
        }

    def touch(stats: dict, stamp: Any) -> None:
        day = _parse_day(stamp)
        if day is None:
            return
        current = stats["last_activity"]
        if current is None or day > _parse_day(current):
            stats["last_activity"] = _iso(day)

    for issue in issues:
        assignee = _normalize_login(issue.get("assignee"))
        stats = by_login.get(assignee)
        if stats is None:
            continue
        stats["assigned_issues"] += 1
        touch(
            stats,
            issue.get("updated_at")
            or issue.get("closed_at")
            or issue.get("created_at"),
        )
        points = _clamp_points(issue.get("points"))
        is_pending_draft = (
            issue.get("source") == "draft" and issue.get("github_issue_id") is None
        )
        if issue.get("state") == "closed":
            stats["closed_count"] += 1
            stats["closed_points"] += points
            stats["points_done"] += points
        else:
            stats["open_count"] += 1
            stats["remaining_points"] += points
            if is_pending_draft:
                stats["pending_drafts"] += 1

    return sorted(
        by_login.values(),
        key=lambda m: (m["remaining_points"] + m["assigned_issues"], m["remaining_points"]),
        reverse=True,
    )


def compute_project_performance(
    *,
    project: dict,
    issues: list[dict],
    event_count: int,
    period_start: str = "",
    period_end: str = "",
    granularity: str = "daily",
    team_member_logins: Optional[set[str]] = None,
    member: str = "",
    sprint_issue_ids: Optional[set[str]] = None,
) -> dict:
    """Métricas de desempenho de um projeto sem inventar eventos passados.

    Os dados que existiam antes desta versão (sem eventos por issue) são
    reportados como "histórico parcial" e as séries temporais são derivadas de
    created_at/closed_at em vez de transições reais.
    """
    if granularity not in ("daily", "weekly"):
        granularity = "daily"

    start = _parse_day(period_start)
    end = _parse_day(period_end)
    today = datetime.utcnow().date()
    member_filter = _normalize_login(member)

    filtered: list[dict] = []
    for issue in issues:
        if sprint_issue_ids is not None and issue["id"] not in sprint_issue_ids:
            continue
        if team_member_logins is not None:
            assignee = _normalize_login(issue.get("assignee"))
            if assignee not in team_member_logins:
                continue
        if member_filter:
            if _normalize_login(issue.get("assignee")) != member_filter:
                continue
        created = _parse_day(issue.get("created_at"))
        closed = _closed_date(issue)
        if not _in_period(created, start, end) and not _in_period(closed, start, end):
            continue
        filtered.append(issue)

    def count(cond) -> int:
        return sum(1 for issue in filtered if cond(issue))

    open_issues = count(lambda i: i.get("state") == "open" and i.get("source") != "draft")
    closed_issues = count(lambda i: i.get("state") == "closed")
    pending_drafts = count(
        lambda i: i.get("source") == "draft" and i.get("github_issue_id") is None
    )
    confirmed_drafts = count(
        lambda i: i.get("source") == "draft" and i.get("github_issue_id") is not None
    )
    drafts = pending_drafts + confirmed_drafts

    total_points = sum(_clamp_points(i.get("points")) for i in filtered)
    delivered_points = sum(
        _clamp_points(i.get("points"))
        for i in filtered
        if i.get("state") == "closed"
    )
    remaining_points = max(0, total_points - delivered_points)

    weekly_throughput: Dict[str, int] = Counter()
    for i in filtered:
        day = _closed_date(i)
        if day is None:
            continue
        weekly_throughput[_iso(_bucket_key(day, "weekly"))] += 1
    period_weeks = max(1, len(weekly_throughput) or 1)
    throughput_avg = round(sum(weekly_throughput.values()) / period_weeks, 1)

    lead_times: list[int] = []
    for i in filtered:
        created = _parse_day(i.get("created_at"))
        closed = _closed_date(i)
        if created is None or closed is None or closed < created:
            continue
        lead_times.append((closed - created).days)
    lead_time_avg_days = (
        round(sum(lead_times) / len(lead_times), 1) if lead_times else None
    )

    unassigned_open = count(
        lambda i: i.get("state") == "open"
        and not _normalize_login(i.get("assignee"))
        and i.get("source") != "draft"
    )

    today_dt = datetime.utcnow()
    late_issues = count(
        lambda i: i.get("state") == "open"
        and (created := _parse_day(i.get("created_at"))) is not None
        and (today_dt.date() - created).days > 7
    )
# evolução diária/semanal (baseada em created/closed; ver histórico parcial)
    all_days = [
        d for i in filtered if (d := _parse_day(i.get("created_at"))) is not None
    ]
    range_start = min(all_days) if all_days else today
    closed_days = [
        d for i in filtered if (d := _closed_date(i)) is not None
    ]
    range_end = max([range_start, *(closed_days or []), today])

    timeline: list[dict] = []
    running_open = 0
    running_done = 0
    running_total = 0
    cursor = _bucket_key(range_start, granularity)
    stop_on = _bucket_key(range_end, granularity)
    while cursor <= stop_on:
        label = _iso(cursor)
        next_cursor = (
            cursor + timedelta(days=7)
            if granularity == "weekly"
            else cursor + timedelta(days=1)
        )
        bucket_end = next_cursor - timedelta(days=1)

        created_in = [
            i
            for i in filtered
            if (d := _parse_day(i.get("created_at"))) is not None
            and cursor <= d <= bucket_end
        ]
        closed_in = [
            i
            for i in filtered
            if (d := _closed_date(i)) is not None
            and cursor <= d <= bucket_end
        ]

        running_open += len(created_in) - len(closed_in)
        running_done += sum(_clamp_points(i.get("points")) for i in closed_in)
        running_total += sum(_clamp_points(i.get("points")) for i in created_in)

        timeline.append(
            {
                "label": label,
                "created": len(created_in),
                "closed": len(closed_in),
                "open": max(0, running_open),
                "points_done": sum(_clamp_points(i.get("points")) for i in closed_in),
                "points_done_cumulative": running_done,
                "points_total_cumulative": running_total,
            }
        )
        cursor = next_cursor

    # burndown (restante) e burnup (planejado versus realizado) do período
    burndown = build_burndown(
        {"start_date": _iso(range_start), "end_date": _iso(range_end)},
        [
            {
                "points": _clamp_points(i.get("points")),
                "status": "done" if i.get("state") == "closed" else "todo",
                "completed_at": (
                    _iso(d) if (d := _closed_date(i)) else None
                ),
            }
            for i in filtered
        ],
    )
    burnup_total = burndown[0]["ideal"] if burndown else 0
    burnup = [
        {
            "label": point["date"],
            "done": round(burnup_total - point["remaining"], 1),
            "total": burnup_total,
        }
        for point in burndown
    ]

    # distribuição por estado e prioridade
    by_status = [
        {"status": "open", "count": open_issues},
        {"status": "closed", "count": closed_issues},
        {"status": "draft", "count": drafts},
    ]
    priority_counter: Dict[str, int] = Counter()
    for i in filtered:
        if i.get("state") == "open":
            priority_counter[str(i.get("priority") or "medium")] += 1
    by_priority = [
        {"priority": p, "count": priority_counter.get(p, 0)}
        for p in ("high", "medium", "low")
    ]

    members = project.get("team_members") or []
    by_member = summarize_member_metrics(members, filtered)
    # pessoas sem issues também aparecem no detalhe
    for member in members:
        login = _normalize_login(
            member.get("team_github_login") or member.get("github_login")
        )
        if login and not any(m["github_login"] == login for m in by_member):
            by_member.append(
                {
                    "github_login": login,
                    "name": member.get("name") or login,
                    "assigned_issues": 0,
                    "open_count": 0,
                    "remaining_points": 0,
                    "closed_count": 0,
                    "closed_points": 0,
                    "points_done": 0,
                    "pending_drafts": 0,
                    "last_activity": None,
                }
            )
    by_member.sort(
        key=lambda m: (m["remaining_points"] + m["assigned_issues"], m["remaining_points"]),
        reverse=True,
    )
# riscos (sem transformar em competição: alertas acionáveis)
    risks: list[dict] = []
    for stats in by_member:
        if stats["remaining_points"] >= 20:
            risks.append(
                {
                    "type": "overloaded",
                    "severity": "high",
                    "member": stats["github_login"],
                    "member_name": stats["name"],
                    "message": (
                        f"{stats['name']} acumula {stats['remaining_points']} pontos "
                        f"abiertos ({stats['open_count']} issues)."
                    ),
                }
            )
        elif stats["open_count"] >= 5:
            risks.append(
                {
                    "type": "overloaded",
                    "severity": "medium",
                    "member": stats["github_login"],
                    "member_name": stats["name"],
                    "message": (
                        f"{stats['name']} tiene {stats['open_count']} issues "
                        "abiertas asignadas."
                    ),
                }
            )

    stale_issue_ids: list[str] = []
    for i in filtered:
        if i.get("state") != "open":
            continue
        created = _parse_day(i.get("created_at"))
        if created is None:
            continue
        days_old = (today_dt.date() - created).days
        if days_old > 21:
            stale_issue_ids.append(i["id"])
    if stale_issue_ids:
        risks.append(
            {
                "type": "stale",
                "severity": "high" if len(stale_issue_ids) >= 3 else "medium",
                "issue_ids": stale_issue_ids[:20],
                "message": (
                    f"{len(stale_issue_ids)} issues abertas têm mais de 21 "
                    "dias sem fechamento."
                ),
            }
        )

    unassigned_ids = [
        i["id"]
        for i in filtered
        if i.get("state") == "open"
        and not _normalize_login(i.get("assignee"))
        and i.get("source") != "draft"
    ]
    if unassigned_ids:
        risks.append(
            {
                "type": "unassigned",
                "severity": "medium",
                "issue_ids": unassigned_ids[:20],
                "message": (
                    f"{len(unassigned_ids)} issues abiertas no tienen "
                    "responsable asignado."
                ),
            }
        )

    stalled_drafts = [
        i
        for i in filtered
        if i.get("source") == "draft"
        and i.get("github_issue_id") is None
        and (c := _parse_day(i.get("created_at"))) is not None
        and (today_dt.date() - c).days > 3
    ]
    if stalled_drafts:
        risks.append(
            {
                "type": "stalled_draft",
                "severity": "medium",
                "issue_ids": [i["id"] for i in stalled_drafts[:20]],
                "message": (
                    f"{len(stalled_drafts)} rascunhos têm mais de 3 dias "
                    "sem confirmação."
                ),
            }
        )

    # ranking de atividade (apenas informativo, a serviço da revisão)
    activity_ranking = sorted(
        [
            {
                "github_login": m["github_login"],
                "name": m["name"],
                "closed_issues": m["closed_count"],
                "points_done": m["closed_points"],
                "last_activity": m["last_activity"],
            }
            for m in by_member
        ],
        key=lambda m: (m["closed_issues"], m["points_done"]),
        reverse=True,
    )

    partial_history = {
        "detected": len(filtered) > 0 and event_count < len(filtered),
        "message": (
            "Parte destes dados é histórico parcial: foi registrada antes de "
            "salvar eventos por issue, por isso as séries são derivadas das "
            "datas de criação e fechamento, sem transições reais."
        ),
    }

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "period": {
            "start": _iso(range_start),
            "end": _iso(range_end),
            "granularity": granularity,
        },
        "partial_history": partial_history,
        "summary": {
            "total_issues": len(filtered),
            "open_issues": open_issues,
            "closed_issues": closed_issues,
            "drafts": drafts,
            "pending_drafts": pending_drafts,
            "confirmed_drafts": confirmed_drafts,
            "draft_conversion_rate": (
                round(confirmed_drafts / drafts, 2) if drafts else None
            ),
            "total_points": total_points,
            "delivered_points": delivered_points,
            "remaining_points": remaining_points,
            "throughput_weekly_avg": throughput_avg,
            "throughput_by_week": dict(weekly_throughput),
            "lead_time_avg_days": lead_time_avg_days,
            "unassigned": unassigned_open,
            "late_issues": late_issues,
        },
        "timeline": timeline,
        "burndown": burndown,
        "burnup": burnup,
        "by_status": by_status,
        "by_priority": by_priority,
        "by_member": by_member,
        "activity_ranking": activity_ranking,
        "risks": risks,
    }