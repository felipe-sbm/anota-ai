from __future__ import annotations

import json
import os
import re
import sqlite3
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DB_PATH = os.path.join(DB_DIR, "anota_ai.db")


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


# ---------------------------------------------------------------------------
# vocabulário canônico de estados de uma gravação (extensão, API e dashboard)
# ---------------------------------------------------------------------------
RECORDING_STATUSES = ("uploaded", "processing", "pending_review", "reviewed", "error")

RECORDING_STATUS_LABELS = {
    "uploaded": "Enviada",
    "processing": "Procesando",
    "pending_review": "Lista para revisar",
    "reviewed": "Revisada",
    "error": "Error",
}


def normalize_record_status(status: str) -> str:
    normalized = str(status or "uploaded").strip().lower()
    return normalized if normalized in RECORDING_STATUSES else "uploaded"


# ---------------------------------------------------------------------------
# tipos de eventos de uma issue (histórico real para as métricas)
# ---------------------------------------------------------------------------
EVENT_ISSUE_CREATED = "issue_created"
EVENT_ISSUE_UPDATED = "issue_updated"
EVENT_ISSUE_STATE_CHANGED = "issue_state_changed"
EVENT_ISSUE_ASSIGNED = "issue_assigned"
EVENT_ISSUE_POINTS_CHANGED = "issue_points_changed"
EVENT_ISSUE_PRIORITY_CHANGED = "issue_priority_changed"
EVENT_ISSUE_CONFIRMED = "issue_confirmed"
EVENT_ISSUE_DELETED = "issue_deleted"
EVENT_ISSUE_LINKED = "issue_linked"
EVENT_ISSUE_UNLINKED = "issue_unlinked"


def _serialize_event_value(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def init_db():
    conn = _get_conn()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS audio_records (
            id              TEXT PRIMARY KEY,
            filename        TEXT NOT NULL,
            file_id         TEXT NOT NULL,
            original_filename TEXT NOT NULL DEFAULT '',
            created_at      TEXT NOT NULL,
            user_github_login TEXT NOT NULL DEFAULT '',
            status          TEXT NOT NULL DEFAULT 'uploaded',
            transcript      TEXT,
            summary         TEXT,
            tasks           TEXT,
            decisions       TEXT,
            created_issues  TEXT,
            repo_full_name  TEXT DEFAULT '',
            error_message   TEXT
        )
        """
    )

    # adiciona a coluna para bancos criados antes do fluxo de decisões
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(audio_records)")}
    if "decisions" not in columns:
        conn.execute("ALTER TABLE audio_records ADD COLUMN decisions TEXT")
    if "project_id" not in columns:
        conn.execute("ALTER TABLE audio_records ADD COLUMN project_id TEXT")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS teams (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_by_github_login TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS team_members (
            team_id TEXT NOT NULL,
            github_login TEXT NOT NULL,
            added_at TEXT NOT NULL,
            PRIMARY KEY (team_id, github_login)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS user_aliases (
            github_login TEXT NOT NULL,
            alias TEXT NOT NULL,
            display_name TEXT,
            created_at TEXT NOT NULL,
            PRIMARY KEY (github_login, alias)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS repositories (
            id TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            name TEXT NOT NULL,
            owner TEXT NOT NULL,
            private INTEGER NOT NULL DEFAULT 0,
            description TEXT,
            html_url TEXT,
            default_branch TEXT,
            created_by_github_login TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(created_by_github_login, full_name)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            created_by_github_login TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS project_repositories (
            project_id TEXT NOT NULL,
            repo_full_name TEXT NOT NULL,
            PRIMARY KEY (project_id, repo_full_name)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS project_teams (
            project_id TEXT NOT NULL,
            team_id TEXT NOT NULL,
            PRIMARY KEY (project_id, team_id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS issues (
            id TEXT PRIMARY KEY,
            github_issue_id INTEGER,
            number INTEGER,
            title TEXT NOT NULL,
            body TEXT NOT NULL DEFAULT '',
            state TEXT NOT NULL DEFAULT 'open',
            repo_full_name TEXT NOT NULL DEFAULT '',
            source TEXT NOT NULL DEFAULT 'external',
            points INTEGER NOT NULL DEFAULT 0,
            priority TEXT NOT NULL DEFAULT 'medium',
            priority_source TEXT NOT NULL DEFAULT 'system',
            assignee TEXT,
            html_url TEXT,
            record_id TEXT,
            created_by_github_login TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    issue_columns = {row["name"] for row in conn.execute("PRAGMA table_info(issues)")}
    if "project_id" not in issue_columns:
        conn.execute("ALTER TABLE issues ADD COLUMN project_id TEXT")
    conn.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS idx_issues_github_issue
        ON issues(github_issue_id, created_by_github_login)
        WHERE github_issue_id IS NOT NULL
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_issues_user ON issues(created_by_github_login)"
    )

    # data de fechamento para as métricas de lead time/throughput
    issue_columns = {row["name"] for row in conn.execute("PRAGMA table_info(issues)")}
    if "closed_at" not in issue_columns:
        conn.execute("ALTER TABLE issues ADD COLUMN closed_at TEXT")
    if "completed_at" not in issue_columns:
        conn.execute("ALTER TABLE issues ADD COLUMN completed_at TEXT")

    # arquivamento suave de projetos (a UI promete recuperação em 30 dias)
    project_columns = {row["name"] for row in conn.execute("PRAGMA table_info(projects)")}
    if "archived" not in project_columns:
        conn.execute("ALTER TABLE projects ADD COLUMN archived INTEGER NOT NULL DEFAULT 0")
    if "archived_at" not in project_columns:
        conn.execute("ALTER TABLE projects ADD COLUMN archived_at TEXT")

    # histórico real de eventos por issue: sustenta o burndown e o lead time
    # e as métricas por membro sem inventar dados anteriores à instalação.
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS issue_events (
            id TEXT PRIMARY KEY,
            issue_id TEXT NOT NULL,
            project_id TEXT,
            record_id TEXT,
            sprint_id TEXT,
            event_type TEXT NOT NULL,
            field TEXT,
            old_value TEXT,
            new_value TEXT,
            actor_github_login TEXT NOT NULL,
            created_by_github_login TEXT NOT NULL,
            created_at TEXT NOT NULL,
            metadata TEXT
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_issue_events_issue ON issue_events(issue_id)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_issue_events_project ON issue_events(project_id)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_issue_events_user ON issue_events(created_by_github_login)"
    )

    # sprints e seus itens (modelo enxuto de scrum para o TCC):
    # a sprint guarda nome, objetivo, período e status; cada tarefa guarda os
    # pontos, o responsável, a origem (reunião/manual) e os vínculos opcionais
    # com uma gravação (record_id) e com uma issue do sistema (issue_id).
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS sprints (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            goal TEXT NOT NULL DEFAULT '',
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'planned',
            created_by_github_login TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS sprint_tasks (
            id TEXT PRIMARY KEY,
            sprint_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            assignee TEXT,
            points INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'todo',
            origin TEXT NOT NULL DEFAULT 'manual',
            record_id TEXT,
            issue_id TEXT,
            created_by_github_login TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            completed_at TEXT
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_sprint_tasks_sprint ON sprint_tasks(sprint_id)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_sprints_user ON sprints(created_by_github_login)"
    )

    conn.commit()
    conn.close()


def insert_record(
    record_id: str,
    filename: str,
    file_id: str,
    original_filename: str,
    user_github_login: str,
) -> dict:
    conn = _get_conn()
    now = datetime.utcnow().isoformat()
    conn.execute(
        """
        INSERT INTO audio_records (id, filename, file_id, original_filename, created_at, user_github_login, status)
        VALUES (?, ?, ?, ?, ?, ?, 'uploaded')
        """,
        (record_id, filename, file_id, original_filename, now, user_github_login),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM audio_records WHERE id = ?", (record_id,)).fetchone()
    conn.close()
    return _row_to_dict(row)


def update_record_status(record_id: str, status: str, **kwargs):
    # atualiza o status e campos opcionais (transcript, summary, tasks etc).
    # usa o vocabulário canônico para que extensão, API e dashboard coincidam.
    conn = _get_conn()
    allowed = {
        "transcript",
        "summary",
        "tasks",
        "decisions",
        "created_issues",
        "error_message",
        "status",
        "repo_full_name",
        "project_id",
    }
    safe_status = normalize_record_status(status)
    sets = ["status = ?"]
    values = [safe_status]
    for k, v in kwargs.items():
        if k in allowed:
            sets.append(f"{k} = ?")
            if isinstance(v, (list, dict)):
                values.append(json.dumps(v, ensure_ascii=False))
            else:
                values.append(v)
    values.append(record_id)
    sql = f"UPDATE audio_records SET {', '.join(sets)} WHERE id = ?"
    conn.execute(sql, values)
    conn.commit()
    conn.close()


def get_record(record_id: str) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM audio_records WHERE id = ?", (record_id,)).fetchone()
    conn.close()
    if row is None:
        return None
    return _row_to_dict(row)


def list_records(user_github_login: str, limit: int = 50, offset: int = 0) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        """
        SELECT * FROM audio_records
        WHERE user_github_login = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        """,
        (user_github_login, limit, offset),
    ).fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


def count_records(user_github_login: str) -> int:
    conn = _get_conn()
    row = conn.execute(
        """
        SELECT COUNT(*) as total
        FROM audio_records
        WHERE user_github_login = ?
        """,
        (user_github_login,),
    ).fetchone()
    conn.close()
    if row is None:
        return 0
    return int(row["total"])


def _row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    for field in ("tasks", "decisions", "created_issues"):
        if isinstance(d.get(field), str):
            try:
                d[field] = json.loads(d[field])
            except (json.JSONDecodeError, TypeError):
                pass
    return d


# ---------------------------------------------------------------------------
# histórico de eventos de issues
# ---------------------------------------------------------------------------

def record_issue_event(
    *,
    issue_id: str,
    event_type: str,
    actor_github_login: str,
    created_by_github_login: Optional[str] = None,
    project_id: Optional[str] = None,
    record_id: Optional[str] = None,
    sprint_id: Optional[str] = None,
    field: Optional[str] = None,
    old_value: Any = None,
    new_value: Any = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    # guarda um evento atômico sobre uma issue. os eventos são a base do
    # histórico real: não se inventam transições para dados anteriores à
    # instalação desta versão (os registros existentes ficam como
    # "histórico parcial").
    conn = _get_conn()
    now = datetime.utcnow().isoformat()
    conn.execute(
        """
        INSERT INTO issue_events (
            id, issue_id, project_id, record_id, sprint_id, event_type, field,
            old_value, new_value, actor_github_login, created_by_github_login,
            created_at, metadata
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            str(uuid.uuid4()),
            issue_id,
            project_id,
            record_id,
            sprint_id,
            event_type,
            field,
            _serialize_event_value(old_value),
            _serialize_event_value(new_value),
            actor_github_login,
            created_by_github_login or actor_github_login,
            now,
            _serialize_event_value(metadata),
        ),
    )
    conn.commit()
    conn.close()


def _emit_issue_change_events(old: dict, new: dict, actor: str) -> None:
    # compara o antes/depois de uma atualização e registra os eventos
    # relevantes (estado, responsável, pontos, prioridade, título).
    def changed(field: str) -> bool:
        return (old.get(field) or None) != (new.get(field) or None)

    project_id = new.get("project_id")
    record_id = new.get("record_id")

    if changed("state"):
        record_issue_event(
            issue_id=new["id"],
            event_type=EVENT_ISSUE_STATE_CHANGED,
            actor_github_login=actor,
            created_by_github_login=actor,
            project_id=project_id,
            record_id=record_id,
            field="state",
            old_value=old.get("state"),
            new_value=new.get("state"),
        )
    if changed("assignee"):
        record_issue_event(
            issue_id=new["id"],
            event_type=EVENT_ISSUE_ASSIGNED,
            actor_github_login=actor,
            created_by_github_login=actor,
            project_id=project_id,
            record_id=record_id,
            field="assignee",
            old_value=old.get("assignee"),
            new_value=new.get("assignee"),
        )
    if changed("points"):
        record_issue_event(
            issue_id=new["id"],
            event_type=EVENT_ISSUE_POINTS_CHANGED,
            actor_github_login=actor,
            created_by_github_login=actor,
            project_id=project_id,
            record_id=record_id,
            field="points",
            old_value=old.get("points"),
            new_value=new.get("points"),
        )
    if changed("priority"):
        record_issue_event(
            issue_id=new["id"],
            event_type=EVENT_ISSUE_PRIORITY_CHANGED,
            actor_github_login=actor,
            created_by_github_login=actor,
            project_id=project_id,
            record_id=record_id,
            field="priority",
            old_value=old.get("priority"),
            new_value=new.get("priority"),
        )

    for field in ("title", "body", "repo_full_name"):
        if changed(field):
            record_issue_event(
                issue_id=new["id"],
                event_type=EVENT_ISSUE_UPDATED,
                actor_github_login=actor,
                created_by_github_login=actor,
                project_id=project_id,
                record_id=record_id,
                field=field,
                old_value=old.get(field),
                new_value=new.get(field),
            )


def list_issue_events(
    github_login: str,
    *,
    issue_id: Optional[str] = None,
    project_id: Optional[str] = None,
    sprint_id: Optional[str] = None,
    event_type: Optional[str] = None,
    member: Optional[str] = None,
    limit: int = 500,
    offset: int = 0,
) -> tuple[list[dict], int]:
    # lista eventos acessíveis ao usuário (delimitados por created_by_github_login
    # para não expor dados de outros workspaces).
    clauses = ["created_by_github_login = ?"]
    values: list[Any] = [github_login]
    if issue_id:
        clauses.append("issue_id = ?")
        values.append(issue_id)
    if project_id:
        clauses.append("project_id = ?")
        values.append(project_id)
    if sprint_id:
        clauses.append("sprint_id = ?")
        values.append(sprint_id)
    if event_type:
        clauses.append("event_type = ?")
        values.append(event_type)
    if member:
        cleaned = str(member).strip().lstrip("@")
        clauses.append("(actor_github_login = ? OR new_value = ? OR old_value = ?)")
        values += [cleaned, cleaned, cleaned]

    where = " AND ".join(clauses)
    conn = _get_conn()
    rows = conn.execute(
        f"""
        SELECT * FROM issue_events
        WHERE {where}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        """,
        (*values, limit, offset),
    ).fetchall()
    total_row = conn.execute(
        f"SELECT COUNT(*) AS c FROM issue_events WHERE {where}", values
    ).fetchone()
    conn.close()
    events = []
    for row in rows:
        event = dict(row)
        if event.get("metadata"):
            try:
                event["metadata"] = json.loads(event["metadata"])
            except (json.JSONDecodeError, TypeError):
                pass
        events.append(event)
    return events, int(total_row["c"] if total_row is not None else 0)


def count_issue_events(github_login: str, *, project_id: Optional[str] = None) -> int:
    # usado para detectar "histórico parcial": se não houver eventos registrados,
    # as métricas são derivadas do estado atual sem transições reais.
    clauses = ["created_by_github_login = ?"]
    values: list[Any] = [github_login]
    if project_id:
        clauses.append("project_id = ?")
        values.append(project_id)
    conn = _get_conn()
    row = conn.execute(
        f"SELECT COUNT(*) AS c FROM issue_events WHERE {' AND '.join(clauses)}",
        values,
    ).fetchone()
    conn.close()
    return int(row["c"] if row is not None else 0)


# times e apelidos

def create_team(team_id: str, name: str, created_by_github_login: str) -> None:
    conn = _get_conn()
    now = datetime.utcnow().isoformat()
    conn.execute(
        """
        INSERT INTO teams (id, name, created_by_github_login, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (team_id, name, created_by_github_login, now),
    )
    conn.commit()
    conn.close()


def update_team(team_id: str, name: str, created_by_github_login: str) -> bool:
    conn = _get_conn()
    cursor = conn.execute(
        """
        UPDATE teams
        SET name = ?
        WHERE id = ? AND created_by_github_login = ?
        """,
        (name, team_id, created_by_github_login),
    )
    conn.commit()
    conn.close()
    return cursor.rowcount > 0


def team_belongs_to_user(team_id: str, github_login: str) -> bool:
    conn = _get_conn()
    row = conn.execute(
        "SELECT 1 FROM teams WHERE id = ? AND created_by_github_login = ?",
        (team_id, github_login),
    ).fetchone()
    conn.close()
    return row is not None


def add_team_members(team_id: str, github_logins: list[str]) -> None:
    if not github_logins:
        return
    conn = _get_conn()
    now = datetime.utcnow().isoformat()
    conn.executemany(
        """
        INSERT OR IGNORE INTO team_members (team_id, github_login, added_at)
        VALUES (?, ?, ?)
        """,
        [(team_id, gh, now) for gh in github_logins],
    )
    conn.commit()
    conn.close()


def upsert_user_aliases(github_login: str, aliases: list[tuple[str, str | None]]) -> None:
    # aliases no formato (alias, display_name)
    if not aliases:
        return
    conn = _get_conn()
    now = datetime.utcnow().isoformat()
    conn.executemany(
        """
        INSERT INTO user_aliases (github_login, alias, display_name, created_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(github_login, alias) DO UPDATE SET
            display_name=excluded.display_name
        """,
        [(github_login, a, dn, now) for (a, dn) in aliases],
    )
    conn.commit()
    conn.close()


def list_user_aliases(github_login: str) -> list[dict]:
    # aliases cadastrados pelo próprio usuário, mais recentes primeiro
    conn = _get_conn()
    rows = conn.execute(
        """
        SELECT alias, display_name, created_at
        FROM user_aliases
        WHERE github_login = ?
        ORDER BY created_at DESC, alias ASC
        """,
        (github_login,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_user_alias(github_login: str, alias: str) -> bool:
    # remove apenas alias do próprio usuário; retorna False se não existir
    conn = _get_conn()
    cursor = conn.execute(
        "DELETE FROM user_aliases WHERE github_login = ? AND alias = ?",
        (github_login, alias),
    )
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted


def remove_team_member(team_id: str, github_login: str) -> None:
    conn = _get_conn()
    conn.execute(
        "DELETE FROM team_members WHERE team_id = ? AND github_login = ?",
        (team_id, github_login),
    )
    conn.commit()
    conn.close()


def list_user_teams(github_login: str) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        """
        SELECT t.id, t.name, t.created_at,
               (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
        FROM teams t
        WHERE t.created_by_github_login = ?
        ORDER BY t.created_at DESC
        """,
        (github_login,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_team_members(team_id: str) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        """
        SELECT tm.github_login, tm.added_at
        FROM team_members tm
        WHERE tm.team_id = ?
        ORDER BY tm.added_at DESC
        """,
        (team_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_team_member_logins(team_id: str) -> set[str]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT github_login FROM team_members WHERE team_id = ?", (team_id,)
    ).fetchall()
    conn.close()
    return {str(r["github_login"]) for r in rows}


def get_project_member_logins(project_id: str) -> set[str]:
    # logins de todas as pessoas das equipes vinculadas ao projeto
    conn = _get_conn()
    rows = conn.execute(
        """
        SELECT DISTINCT tm.github_login
        FROM team_members tm
        JOIN project_teams pt ON pt.team_id = tm.team_id
        WHERE pt.project_id = ?
        """,
        (project_id,),
    ).fetchall()
    conn.close()
    return {str(r["github_login"]) for r in rows}


def validate_assignee_for_project(
    project_id: Optional[str], assignee: Optional[str], github_login: str
) -> bool:
    # o responsável deve ser uma pessoa real da equipe do projeto
    # (ou o próprio autor). evita-se o assignee de texto livre sem respaldo.
    cleaned = str(assignee or "").strip().lstrip("@")
    if not cleaned:
        return True
    if cleaned.lower() == str(github_login or "").lower():
        return True
    if not project_id:
        return True
    return cleaned.lower() in {
        m.lower() for m in get_project_member_logins(project_id)
    }


def get_team_detail(team_id: str, github_login: str) -> Optional[dict]:
    # detalhe de uma equipe: membros, projetos, repositórios e issues.
    conn = _get_conn()
    team = conn.execute(
        "SELECT * FROM teams WHERE id = ? AND created_by_github_login = ?",
        (team_id, github_login),
    ).fetchone()
    if team is None:
        conn.close()
        return None

    detail = dict(team)
    detail["members"] = [dict(r) for r in conn.execute(
        "SELECT tm.github_login, tm.added_at FROM team_members tm "
        "WHERE tm.team_id = ? ORDER BY tm.added_at ASC",
        (team_id,),
    ).fetchall()]
    detail["member_count"] = len(detail["members"])

    detail["projects"] = [dict(r) for r in conn.execute(
        """
        SELECT p.id, p.name, p.description, p.created_at, p.updated_at,
               (SELECT COUNT(*) FROM project_repositories pr WHERE pr.project_id = p.id) AS repositories
        FROM projects p
        JOIN project_teams pt ON pt.project_id = p.id
        WHERE pt.team_id = ? AND p.created_by_github_login = ? AND p.archived = 0
        ORDER BY p.updated_at DESC
        """,
        (team_id, github_login),
    ).fetchall()]

    detail["repositories"] = [r["repo_full_name"] for r in conn.execute(
        """
        SELECT DISTINCT pr.repo_full_name
        FROM project_repositories pr
        WHERE pr.project_id IN (
            SELECT project_id FROM project_teams WHERE team_id = ?
        )
        ORDER BY pr.repo_full_name
        """,
        (team_id,),
    ).fetchall()]

    member_logins = [m["github_login"] for m in detail["members"]]
    issues: list[dict] = []
    if member_logins:
        placeholders = ", ".join("?" for _ in member_logins)
        issues = [dict(r) for r in conn.execute(
            f"""
            SELECT * FROM issues
            WHERE created_by_github_login = ? AND assignee IN ({placeholders})
            ORDER BY updated_at DESC LIMIT 500
            """,
            (github_login, *member_logins),
        ).fetchall()]
    detail["issues"] = issues
    conn.close()
    return detail


def list_sprint_linked_issue_ids(sprint_id: str, github_login: str) -> set[str]:
    # issues vinculadas a uma sprint por meio das tarefas do backlog da sprint
    conn = _get_conn()
    rows = conn.execute(
        """
        SELECT st.issue_id FROM sprint_tasks st
        JOIN sprints s ON s.id = st.sprint_id
        WHERE st.sprint_id = ? AND st.issue_id IS NOT NULL
              AND s.created_by_github_login = ?
        """,
        (sprint_id, github_login),
    ).fetchall()
    conn.close()
    return {str(r["issue_id"]) for r in rows}


def get_user_aliases() -> Dict[str, str]:
    # retorna um mapa de alias normalizado para github_login
    conn = _get_conn()
    rows = conn.execute("SELECT github_login, alias FROM user_aliases").fetchall()
    conn.close()

    def norm(s: str) -> str:
        return re.sub(r"\s+", " ", s.strip().lower())

    out: Dict[str, str] = {}
    for r in rows:
        a = r["alias"]
        if not a:
            continue
        out[norm(a)] = r["github_login"]
    return out


# repositórios

def add_repository(
    repo_id: str,
    full_name: str,
    name: str,
    owner: str,
    private: bool,
    description: Optional[str],
    html_url: Optional[str],
    default_branch: Optional[str],
    created_by_github_login: str,
) -> bool:
    # registra um repositório no sistema (ignora se o usuário e repo já existir)
    conn = _get_conn()
    now = datetime.utcnow().isoformat()
    try:
        cursor = conn.execute(
            """
            INSERT OR IGNORE INTO repositories (
                id, full_name, name, owner, private, description, html_url,
                default_branch, created_by_github_login, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                repo_id,
                full_name,
                name,
                owner,
                int(private),
                description,
                html_url,
                default_branch,
                created_by_github_login,
                now,
            ),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def list_user_repositories(github_login: str) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        """
        SELECT id, full_name, name, owner, private, description, html_url,
               default_branch, created_at
        FROM repositories
        WHERE created_by_github_login = ?
        ORDER BY created_at DESC
        """,
        (github_login,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def remove_repository(github_login: str, full_name: str) -> bool:
    conn = _get_conn()
    cursor = conn.execute(
        "DELETE FROM repositories WHERE created_by_github_login = ? AND full_name = ?",
        (github_login, full_name),
    )
    conn.commit()
    conn.close()
    return cursor.rowcount > 0


# issues

_PRIORITIES = ("low", "medium", "high")


def _clamp_priority(value: Any) -> str:
    normalized = str(value or "medium").strip().lower()
    return normalized if normalized in _PRIORITIES else "medium"


def _clamp_points(value: Any) -> int:
    try:
        return max(0, min(int(value or 0), 100))
    except (TypeError, ValueError):
        return 0


def create_issue_row(
    *,
    issue_id: str,
    github_login: str,
    repo_full_name: str,
    title: str,
    body: str = "",
    source: str = "external",
    state: str = "open",
    points: int = 0,
    priority: str = "medium",
    priority_source: str = "system",
    assignee: Optional[str] = None,
    github_issue_id: Optional[int] = None,
    number: Optional[int] = None,
    html_url: Optional[str] = None,
    record_id: Optional[str] = None,
    project_id: Optional[str] = None,
) -> dict:
    # os pontos/prioridade vivem no sistema, pois o GitHub não os armazena
    # (github_issue_id é o vínculo com a issue real).
    
    conn = _get_conn()
    now = datetime.utcnow().isoformat()
    closed_at = now if state == "closed" else None
    conn.execute(
        """
        INSERT INTO issues (
            id, github_issue_id, number, title, body, state, repo_full_name,
            source, points, priority, priority_source, assignee, html_url,
            record_id, project_id, created_by_github_login, created_at, updated_at,
            closed_at, completed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            issue_id,
            github_issue_id,
            number,
            title,
            body,
            state,
            repo_full_name,
            source,
            _clamp_points(points),
            _clamp_priority(priority),
            priority_source,
            assignee,
            html_url,
            record_id,
            project_id,
            github_login,
            now,
            now,
            closed_at,
            closed_at,
        ),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM issues WHERE id = ?", (issue_id,)).fetchone()
    conn.close()
    if row is not None:
        created = dict(row)
        record_issue_event(
            issue_id=issue_id,
            event_type=EVENT_ISSUE_CREATED,
            actor_github_login=github_login,
            created_by_github_login=github_login,
            project_id=project_id,
            record_id=record_id,
            metadata={
                "title": created.get("title"),
                "source": created.get("source"),
                "state": created.get("state"),
                "github_issue_id": created.get("github_issue_id"),
            },
        )
        return created
    return {}


def upsert_external_issue(
    github_login: str,
    repo_full_name: str,
    issue_data: Dict[str, Any],
) -> bool:
    # insere ou atualiza uma issue externa proveniente do github.
    # nunca sobrescreve pontos e prioridade já definidos pelo usuário.
    # retorna true quando foi inserida (nova).
    conn = _get_conn()
    now = datetime.utcnow().isoformat()
    gh_id = issue_data.get("id")
    if gh_id is None:
        conn.close()
        return False

    title = issue_data.get("title") or "Sem título"
    body = issue_data.get("body") or ""
    state = issue_data.get("state") or "open"
    number = issue_data.get("number")
    html_url = issue_data.get("html_url") or ""

    assignees = issue_data.get("assignees") or []
    first_assignee = assignees[0] if isinstance(assignees, list) and assignees else None

    created_at = issue_data.get("created_at") or now

    row = conn.execute(
        "SELECT id FROM issues WHERE github_issue_id = ? AND created_by_github_login = ?",
        (gh_id, github_login),
    ).fetchone()

    if row is not None:
        before = conn.execute(
            "SELECT * FROM issues WHERE id = ?", (row["id"],)
        ).fetchone()
        conn.execute(
            """
            UPDATE issues
            SET title = ?, body = ?, state = ?, html_url = ?,
                updated_at = ?, closed_at = ?, completed_at = ?
            WHERE id = ?
            """,
            (
                title,
                body,
                state,
                html_url,
                now,
                now if state == "closed" else None,
                now if state == "closed" else None,
                row["id"],
            ),
        )
        conn.commit()
        after = conn.execute(
            "SELECT * FROM issues WHERE id = ?", (row["id"],)
        ).fetchone()
        conn.close()
        if before is not None and after is not None:
            # emite as transições reais (por exemplo, quando foi fechada no GitHub)
            _emit_issue_change_events(dict(before), dict(after), github_login)
        return False

    closed_at = now if state == "closed" else None
    conn.execute(
        """
        INSERT INTO issues (
            id, github_issue_id, number, title, body, state, repo_full_name,
            source, points, priority, priority_source, assignee, html_url,
            created_by_github_login, created_at, updated_at, closed_at, completed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'external', 0, 'medium', 'system', ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            str(uuid.uuid4()),
            gh_id,
            number,
            title,
            body,
            state,
            repo_full_name,
            first_assignee,
            html_url,
            github_login,
            created_at,
            now,
            closed_at,
            closed_at,
        ),
    )
    conn.commit()
    row_id = conn.execute(
        "SELECT id FROM issues WHERE github_issue_id = ? AND created_by_github_login = ?",
        (gh_id, github_login),
    ).fetchone()
    conn.close()
    if row_id is not None:
        record_issue_event(
            issue_id=row_id["id"],
            event_type=EVENT_ISSUE_CREATED,
            actor_github_login=github_login,
            created_by_github_login=github_login,
            metadata={"title": title, "source": "external", "state": state, "github_issue_id": gh_id},
        )
    return True


def get_user_issue(issue_id: str, github_login: str) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute(
        "SELECT * FROM issues WHERE id = ? AND created_by_github_login = ?",
        (issue_id, github_login),
    ).fetchone()
    conn.close()
    return dict(row) if row is not None else None


def list_user_issues(
    github_login: str,
    *,
    search: str = "",
    source: str = "",
    priority: str = "",
    state: str = "",
    repo_full_name: str = "",
    sort: str = "newest",
    limit: int = 1000,
    offset: int = 0,
) -> tuple[list[dict], int]:
    conn = _get_conn()
    clauses = ["created_by_github_login = ?"]
    values: list[Any] = [github_login]

    if search:
        like = f"%{search.strip()}%"
        clauses.append(
            "(title LIKE ? OR body LIKE ? OR repo_full_name LIKE ? "
            "OR CAST(number AS TEXT) LIKE ? OR CAST(points AS TEXT) = ?)"
        )
        values += [like, like, like, like, search.strip()]
    if source:
        clauses.append("source = ?")
        values.append(source)
    if priority:
        clauses.append("priority = ?")
        values.append(priority)
    if state:
        clauses.append("state = ?")
        values.append(state)
    if repo_full_name:
        clauses.append("repo_full_name = ?")
        values.append(repo_full_name)

    order_map = {
        "oldest": "created_at ASC",
        "newest": "created_at DESC",
        "points_desc": "points DESC, created_at DESC",
        "points_asc": "points ASC, created_at DESC",
        "priority_high": (
            "(CASE priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END) DESC, "
            "created_at DESC"
        ),
        "priority_low": (
            "(CASE priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END) ASC, "
            "created_at DESC"
        ),
    }
    order = order_map.get(sort, order_map["newest"])

    where = " AND ".join(clauses)
    rows = conn.execute(
        f"SELECT * FROM issues WHERE {where} ORDER BY {order} LIMIT ? OFFSET ?",
        (*values, limit, offset),
    ).fetchall()
    total_row = conn.execute(
        f"SELECT COUNT(*) AS c FROM issues WHERE {where}", values
    ).fetchone()
    conn.close()
    return [dict(r) for r in rows], int(total_row["c"] if total_row is not None else 0)


def update_issue_fields(
    issue_id: str, github_login: str, **fields
) -> Optional[dict]:
    allowed = {
        "title",
        "body",
        "repo_full_name",
        "assignee",
        "points",
        "priority",
        "priority_source",
        "state",
        "github_issue_id",
        "number",
        "html_url",
        "project_id",
    }
    sets = []
    values: list[Any] = []
    for key, value in fields.items():
        if key not in allowed:
            continue
        # normalização
        if key == "priority":
            value = _clamp_priority(value)
        elif key == "points":
            value = _clamp_points(value)
        elif key == "state":
            value = "closed" if str(value or "open").strip().lower() == "closed" else "open"
        sets.append(f"{key} = ?")
        values.append(value)

    if not sets:
        return get_user_issue(issue_id, github_login)

    conn = _get_conn()
    old_row = conn.execute(
        "SELECT * FROM issues WHERE id = ? AND created_by_github_login = ?",
        (issue_id, github_login),
    ).fetchone()
    if old_row is None:
        conn.close()
        return None
    old = dict(old_row)

    now = datetime.utcnow().isoformat()
    # transições de estado atualizam closed_at/completed_at (lead time real)
    if "state" in fields:
        if fields["state"] == "closed":
            sets.append("closed_at = ?")
            values.append(now)
            sets.append("completed_at = ?")
            values.append(now)
        else:
            sets.append("closed_at = ?")
            values.append(None)
            sets.append("completed_at = ?")
            values.append(None)

    values.append(now)
    values.extend([issue_id, github_login])
    conn.execute(
        f"UPDATE issues SET {', '.join(sets)}, updated_at = ? "
        "WHERE id = ? AND created_by_github_login = ?",
        values,
    )
    conn.commit()
    new_row = conn.execute(
        "SELECT * FROM issues WHERE id = ? AND created_by_github_login = ?",
        (issue_id, github_login),
    ).fetchone()
    conn.close()
    if new_row is None:
        return None
    updated = dict(new_row)
    _emit_issue_change_events(old, updated, github_login)
    return updated


def delete_user_issue(issue_id: str, github_login: str) -> bool:
    conn = _get_conn()
    row = conn.execute(
        "SELECT * FROM issues WHERE id = ? AND created_by_github_login = ?",
        (issue_id, github_login),
    ).fetchone()
    cursor = conn.execute(
        "DELETE FROM issues WHERE id = ? AND created_by_github_login = ?",
        (issue_id, github_login),
    )
    conn.commit()
    conn.close()
    deleted = cursor.rowcount > 0
    if deleted and row is not None:
        issue = dict(row)
        record_issue_event(
            issue_id=issue_id,
            event_type=EVENT_ISSUE_DELETED,
            actor_github_login=github_login,
            created_by_github_login=github_login,
            project_id=issue.get("project_id"),
            record_id=issue.get("record_id"),
            metadata={
                "title": issue.get("title"),
                "state": issue.get("state"),
                "source": issue.get("source"),
            },
        )
    return deleted


def create_draft_issues_from_tasks(
    record_id: str,
    github_login: str,
    repo_full_name: str,
    tasks: list[Dict[str, Any]],
    project_id: Optional[str] = None,
) -> list[dict]:
    # cria rascunhos a partir das tasks extraídas de uma reunião.
    # as issues rascunho ficam aguardando confirmação do usuário e
    # não são enviadas ao github até que sejam confirmadas.
    if not tasks:
        return []

    conn = _get_conn()
    now = datetime.utcnow().isoformat()
    created_ids: list[str] = []
    for task in tasks:
        issue_id = str(uuid.uuid4())
        assignees = task.get("assignees") or []
        first_assignee = (
            assignees[0] if isinstance(assignees, list) and assignees else None
        )
        conn.execute(
            """
            INSERT INTO issues (
                id, title, body, state, repo_full_name, source, points,
                priority, priority_source, assignee, record_id,
                project_id, created_by_github_login, created_at, updated_at
            )
            VALUES (?, ?, ?, 'open', ?, 'draft', ?, ?, 'system', ?, ?, ?, ?, ?, ?)
            """,
            (
                issue_id,
                task.get("title") or "Tarefa sem título",
                task.get("body") or "",
                repo_full_name or "",
                _clamp_points(task.get("points")),
                _clamp_priority(task.get("priority")),
                first_assignee,
                record_id,
                project_id,
                github_login,
                now,
                now,
            ),
        )
        created_ids.append(issue_id)
    conn.commit()

    rows = []
    for issue_id in created_ids:
        row = conn.execute("SELECT * FROM issues WHERE id = ?", (issue_id,)).fetchone()
        if row is not None:
            rows.append(dict(row))
    conn.close()

    for created in rows:
        record_issue_event(
            issue_id=created["id"],
            event_type=EVENT_ISSUE_CREATED,
            actor_github_login=github_login,
            created_by_github_login=github_login,
            project_id=project_id,
            record_id=record_id,
            metadata={
                "title": created.get("title"),
                "source": "draft",
                "state": created.get("state"),
            },
        )
    return rows


def delete_pending_drafts(record_id: str, github_login: str) -> int:
    # elimina rascunhos ainda não confirmados de uma reunião (para regravar).
    conn = _get_conn()
    cursor = conn.execute(
        "DELETE FROM issues WHERE record_id = ? AND created_by_github_login = ? "
        "AND github_issue_id IS NULL",
        (record_id, github_login),
    )
    conn.commit()
    conn.close()
    return cursor.rowcount


def mark_drafts_confirmed(
    record_id: str, github_login: str, created_meta: list[Dict[str, Any]]
) -> int:
    # vincula rascunhos pendentes de uma reunião com as issues criadas.
    # só faz match quando a quantidade coincide com a de rascunhos pendentes
    # (em ordem de criação), para não adivinhar.
    if not created_meta:
        return 0

    conn = _get_conn()
    pending = conn.execute(
        "SELECT id FROM issues "
        "WHERE record_id = ? AND created_by_github_login = ? "
        "AND github_issue_id IS NULL ORDER BY created_at",
        (record_id, github_login),
    ).fetchall()

    if len(pending) != len(created_meta):
        conn.close()
        return 0

    now = datetime.utcnow().isoformat()
    for row, meta in zip(pending, created_meta):
        conn.execute(
            """
            UPDATE issues
            SET github_issue_id = ?, number = ?, html_url = ?,
                state = 'open', updated_at = ?
            WHERE id = ?
            """,
            (
                meta.get("id"),
                meta.get("number"),
                meta.get("html_url"),
                now,
                row["id"],
            ),
        )
    conn.commit()
    if pending and len(pending) == len(created_meta):
        for row, meta in zip(pending, created_meta):
            record_issue_event(
                issue_id=row["id"],
                event_type=EVENT_ISSUE_CONFIRMED,
                actor_github_login=github_login,
                created_by_github_login=github_login,
                metadata={
                    "github_issue_id": meta.get("id"),
                    "number": meta.get("number"),
                    "html_url": meta.get("html_url"),
                },
            )
    conn.close()
    return len(pending)


def append_created_issue_to_record(file_id: str, meta: Dict[str, Any]) -> None:
    # agrega uma issue criada ao registro de áudio (para manter a página da gravação).
    record = get_record(file_id)
    if record is None:
        return

    existing = record.get("created_issues") or []
    if isinstance(existing, str):
        try:
            existing = json.loads(existing)
        except (json.JSONDecodeError, TypeError):
            existing = []
    if not isinstance(existing, list):
        existing = []

    if all(
        not (isinstance(item, dict) and item.get("id") == meta.get("id"))
        for item in existing
    ):
        existing = existing + [meta]

    conn = _get_conn()
    conn.execute(
        "UPDATE audio_records SET created_issues = ? WHERE id = ?",
        (json.dumps(existing, ensure_ascii=False), file_id),
    )
    conn.commit()
    conn.close()


# projetos (reúne repositórios, equipes, gravações e issues)

def create_project(project_id: str, github_login: str, name: str, description: str = "") -> dict:
    conn = _get_conn()
    now = datetime.utcnow().isoformat()
    conn.execute(
        "INSERT INTO projects (id, name, description, created_by_github_login, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        (project_id, name, description, github_login, now, now),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    conn.close()
    return dict(row) if row else {}


def get_user_project(
    project_id: str, github_login: str, include_archived: bool = False
) -> Optional[dict]:
    conn = _get_conn()
    if include_archived:
        row = conn.execute(
            "SELECT * FROM projects WHERE id = ? AND created_by_github_login = ?",
            (project_id, github_login),
        ).fetchone()
    else:
        row = conn.execute(
            "SELECT * FROM projects WHERE id = ? AND created_by_github_login = ? AND archived = 0",
            (project_id, github_login),
        ).fetchone()
    conn.close()
    return dict(row) if row else None


def list_user_projects(github_login: str) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM projects WHERE created_by_github_login = ? AND archived = 0 ORDER BY updated_at DESC",
        (github_login,),
    ).fetchall()
    result = []
    for row in rows:
        project = dict(row)
        project["repositories"] = [r["repo_full_name"] for r in conn.execute(
            "SELECT repo_full_name FROM project_repositories WHERE project_id = ? ORDER BY repo_full_name",
            (project["id"],),
        ).fetchall()]
        project["team_ids"] = [r["team_id"] for r in conn.execute(
            "SELECT team_id FROM project_teams WHERE project_id = ? ORDER BY team_id",
            (project["id"],),
        ).fetchall()]
        project["record_count"] = conn.execute(
            "SELECT COUNT(*) FROM audio_records WHERE project_id = ? AND user_github_login = ?",
            (project["id"], github_login),
        ).fetchone()[0]
        issue_count_sql = "SELECT COUNT(*) FROM issues WHERE created_by_github_login = ? AND project_id = ?"
        issue_count_values: list[Any] = [github_login, project["id"]]
        if project["repositories"]:
            placeholders = ", ".join("?" for _ in project["repositories"])
            issue_count_sql = f"SELECT COUNT(*) FROM issues WHERE created_by_github_login = ? AND (project_id = ? OR repo_full_name IN ({placeholders}))"
            issue_count_values.extend(project["repositories"])
        project["issue_count"] = conn.execute(issue_count_sql, issue_count_values).fetchone()[0]
        result.append(project)
    conn.close()
    return result


def update_project(project_id: str, github_login: str, **fields) -> Optional[dict]:
    allowed = {"name", "description"}
    sets = [f"{key} = ?" for key in fields if key in allowed]
    values = [fields[key] for key in fields if key in allowed]
    if sets:
        values.extend([datetime.utcnow().isoformat(), project_id, github_login])
        conn = _get_conn()
        conn.execute(
            f"UPDATE projects SET {', '.join(sets)}, updated_at = ? WHERE id = ? AND created_by_github_login = ?",
            values,
        )
        conn.commit()
        conn.close()
    return get_user_project(project_id, github_login)


def delete_user_project(project_id: str, github_login: str) -> bool:
    conn = _get_conn()
    conn.execute("UPDATE audio_records SET project_id = NULL WHERE project_id = ?", (project_id,))
    conn.execute("UPDATE issues SET project_id = NULL WHERE project_id = ?", (project_id,))
    conn.execute("DELETE FROM project_repositories WHERE project_id = ?", (project_id,))
    conn.execute("DELETE FROM project_teams WHERE project_id = ?", (project_id,))
    cursor = conn.execute(
        "DELETE FROM projects WHERE id = ? AND created_by_github_login = ?",
        (project_id, github_login),
    )
    conn.commit()
    conn.close()
    return cursor.rowcount > 0


def archive_user_project(project_id: str, github_login: str) -> bool:
    # arquiva o projeto: os vínculos e métricas são mantidos para permitir
    # sua restauração (a UI promete recuperação), sem apagar dados diretamente.
    conn = _get_conn()
    now = datetime.utcnow().isoformat()
    cursor = conn.execute(
        "UPDATE projects SET archived = 1, archived_at = ?, updated_at = ? "
        "WHERE id = ? AND created_by_github_login = ?",
        (now, now, project_id, github_login),
    )
    conn.commit()
    conn.close()
    return cursor.rowcount > 0


def restore_user_project(project_id: str, github_login: str) -> bool:
    conn = _get_conn()
    cursor = conn.execute(
        "UPDATE projects SET archived = 0, archived_at = NULL, updated_at = ? "
        "WHERE id = ? AND created_by_github_login = ?",
        (datetime.utcnow().isoformat(), project_id, github_login),
    )
    conn.commit()
    conn.close()
    return cursor.rowcount > 0


def replace_project_links(project_id: str, github_login: str, repositories: list[str], team_ids: list[str]) -> bool:
    if get_user_project(project_id, github_login) is None:
        return False
    conn = _get_conn()
    conn.execute("DELETE FROM project_repositories WHERE project_id = ?", (project_id,))
    conn.execute("DELETE FROM project_teams WHERE project_id = ?", (project_id,))
    conn.executemany(
        "INSERT OR IGNORE INTO project_repositories (project_id, repo_full_name) VALUES (?, ?)",
        [(project_id, repo) for repo in repositories],
    )
    conn.executemany(
        "INSERT OR IGNORE INTO project_teams (project_id, team_id) VALUES (?, ?)",
        [(project_id, team_id) for team_id in team_ids],
    )
    conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (datetime.utcnow().isoformat(), project_id))
    conn.commit()
    conn.close()
    return True


def get_project_detail(project_id: str, github_login: str) -> Optional[dict]:
    project = get_user_project(project_id, github_login)
    if project is None:
        return None
    conn = _get_conn()
    project["repositories"] = [r["repo_full_name"] for r in conn.execute(
        "SELECT repo_full_name FROM project_repositories WHERE project_id = ? ORDER BY repo_full_name",
        (project_id,),
    ).fetchall()]
    project["team_ids"] = [r["team_id"] for r in conn.execute(
        "SELECT team_id FROM project_teams WHERE project_id = ? ORDER BY team_id",
        (project_id,),
    ).fetchall()]
    repo_names = project["repositories"]
    issue_filter = "i.project_id = ?"
    issue_values: list[Any] = [project_id]
    if repo_names:
        placeholders = ", ".join("?" for _ in repo_names)
        issue_filter = f"({issue_filter} OR i.repo_full_name IN ({placeholders}))"
        issue_values.extend(repo_names)
    project["records"] = [_row_to_dict(row) for row in conn.execute(
        "SELECT * FROM audio_records WHERE project_id = ? AND user_github_login = ? ORDER BY created_at DESC",
        (project_id, github_login),
    ).fetchall()]
    project["issues"] = [dict(row) for row in conn.execute(
        f"SELECT i.* FROM issues i WHERE i.created_by_github_login = ? AND {issue_filter} ORDER BY i.updated_at DESC",
        [github_login, *issue_values],
    ).fetchall()]
    project["team_members"] = [dict(row) for row in conn.execute(
        "SELECT DISTINCT COALESCE(ua.display_name, tm.github_login) AS name, '@' || tm.github_login AS user_name, tm.github_login AS team_github_login, t.name AS team_name FROM team_members tm JOIN project_teams pt ON pt.team_id = tm.team_id JOIN teams t ON t.id = tm.team_id LEFT JOIN user_aliases ua ON ua.github_login = tm.github_login AND ua.alias = tm.github_login WHERE pt.project_id = ? ORDER BY tm.github_login",
        (project_id,),
    ).fetchall()]
    conn.close()
    return project


def attach_record_to_project(record_id: str, project_id: Optional[str], github_login: str) -> Optional[dict]:
    conn = _get_conn()
    if project_id and get_user_project(project_id, github_login) is None:
        conn.close()
        return None
    affected_issues = [
        dict(r)
        for r in conn.execute(
            "SELECT * FROM issues WHERE record_id = ? AND created_by_github_login = ?",
            (record_id, github_login),
        ).fetchall()
    ]
    conn.execute(
        "UPDATE audio_records SET project_id = ? WHERE id = ? AND user_github_login = ?",
        (project_id, record_id, github_login),
    )
    conn.execute(
        "UPDATE issues SET project_id = ? WHERE record_id = ? AND created_by_github_login = ?",
        (project_id, record_id, github_login),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM audio_records WHERE id = ?", (record_id,)).fetchone()
    conn.close()

    for issue in affected_issues:
        if (issue.get("project_id") or None) == (project_id or None):
            continue
        record_issue_event(
            issue_id=issue["id"],
            event_type=EVENT_ISSUE_LINKED if project_id else EVENT_ISSUE_UNLINKED,
            actor_github_login=github_login,
            created_by_github_login=github_login,
            project_id=project_id,
            record_id=record_id,
            old_value=issue.get("project_id"),
            new_value=project_id,
        )

    return _row_to_dict(row) if row else None


def attach_issue_to_project(issue_id: str, project_id: Optional[str], github_login: str) -> Optional[dict]:
    conn = _get_conn()
    if project_id and get_user_project(project_id, github_login) is None:
        conn.close()
        return None
    old = conn.execute(
        "SELECT * FROM issues WHERE id = ? AND created_by_github_login = ?",
        (issue_id, github_login),
    ).fetchone()
    conn.execute(
        "UPDATE issues SET project_id = ?, updated_at = ? WHERE id = ? AND created_by_github_login = ?",
        (project_id, datetime.utcnow().isoformat(), issue_id, github_login),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM issues WHERE id = ? AND created_by_github_login = ?", (issue_id, github_login)).fetchone()
    conn.close()
    if row is not None and (old is None or (old["project_id"] or None) != (row["project_id"] or None)):
        record_issue_event(
            issue_id=issue_id,
            event_type=EVENT_ISSUE_LINKED if row["project_id"] else EVENT_ISSUE_UNLINKED,
            actor_github_login=github_login,
            created_by_github_login=github_login,
            project_id=row["project_id"],
            record_id=row["record_id"],
            old_value=(old["project_id"] if old else None),
            new_value=row["project_id"],
        )
    return dict(row) if row else None


# sprints (scrum enxuto do TCC)

_SPRINT_STATUS = ("planned", "active", "completed")
_SPRINT_TASK_STATUS = ("todo", "in_progress", "done")
_SPRINT_TASK_ORIGIN = ("meeting", "manual")


def create_sprint(
    *,
    sprint_id: str,
    github_login: str,
    name: str,
    goal: str = "",
    start_date: str,
    end_date: str,
    status: str = "planned",
) -> dict:
    conn = _get_conn()
    now = datetime.utcnow().isoformat()
    safe_status = status if status in _SPRINT_STATUS else "planned"
    conn.execute(
        """
        INSERT INTO sprints (
            id, name, goal, start_date, end_date, status,
            created_by_github_login, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            sprint_id,
            name,
            goal,
            start_date,
            end_date,
            safe_status,
            github_login,
            now,
            now,
        ),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM sprints WHERE id = ?", (sprint_id,)).fetchone()
    conn.close()
    return dict(row) if row is not None else {}


def get_user_sprint(sprint_id: str, github_login: str) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute(
        "SELECT * FROM sprints WHERE id = ? AND created_by_github_login = ?",
        (sprint_id, github_login),
    ).fetchone()
    conn.close()
    return dict(row) if row is not None else None


def list_user_sprints(github_login: str) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        """
        SELECT * FROM sprints
        WHERE created_by_github_login = ?
        ORDER BY start_date DESC, created_at DESC
        """,
        (github_login,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_sprint_fields(sprint_id: str, github_login: str, **fields) -> Optional[dict]:
    allowed = {"name", "goal", "start_date", "end_date", "status"}
    sets = []
    values: list[Any] = []
    for key, value in fields.items():
        if key not in allowed:
            continue
        if key == "status":
            value = value if value in _SPRINT_STATUS else "planned"
        sets.append(f"{key} = ?")
        values.append(value)

    if not sets:
        return get_user_sprint(sprint_id, github_login)

    values.append(datetime.utcnow().isoformat())
    values.extend([sprint_id, github_login])
    conn = _get_conn()
    conn.execute(
        f"UPDATE sprints SET {', '.join(sets)}, updated_at = ? "
        "WHERE id = ? AND created_by_github_login = ?",
        values,
    )
    conn.commit()
    conn.close()
    return get_user_sprint(sprint_id, github_login)


def delete_user_sprint(sprint_id: str, github_login: str) -> bool:
    conn = _get_conn()
    conn.execute(
        "DELETE FROM sprint_tasks WHERE sprint_id = ? AND created_by_github_login = ?",
        (sprint_id, github_login),
    )
    cursor = conn.execute(
        "DELETE FROM sprints WHERE id = ? AND created_by_github_login = ?",
        (sprint_id, github_login),
    )
    conn.commit()
    conn.close()
    return cursor.rowcount > 0


def create_sprint_task(
    *,
    task_id: str,
    sprint_id: str,
    github_login: str,
    title: str,
    description: str = "",
    assignee: Optional[str] = None,
    points: int = 0,
    status: str = "todo",
    origin: str = "manual",
    record_id: Optional[str] = None,
    issue_id: Optional[str] = None,
) -> Optional[dict]:
    # a tarefa só existe se a sprint pertence ao usuário autenticado.
    sprint = get_user_sprint(sprint_id, github_login)
    if sprint is None:
        return None

    conn = _get_conn()
    now = datetime.utcnow().isoformat()
    safe_status = status if status in _SPRINT_TASK_STATUS else "todo"
    safe_origin = origin if origin in _SPRINT_TASK_ORIGIN else "manual"
    conn.execute(
        """
        INSERT INTO sprint_tasks (
            id, sprint_id, title, description, assignee, points, status, origin,
            record_id, issue_id, created_by_github_login, created_at, updated_at,
            completed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            task_id,
            sprint_id,
            title,
            description,
            assignee,
            _clamp_points(points),
            safe_status,
            safe_origin,
            record_id,
            issue_id,
            github_login,
            now,
            now,
            now if safe_status == "done" else None,
        ),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM sprint_tasks WHERE id = ?", (task_id,)).fetchone()
    conn.close()
    return dict(row) if row is not None else None


def get_user_sprint_task(task_id: str, github_login: str) -> Optional[dict]:
    # garante que a task pertence ao usuário e a uma sprint dele também.
    conn = _get_conn()
    row = conn.execute(
        """
        SELECT st.*
        FROM sprint_tasks st
        JOIN sprints s ON s.id = st.sprint_id
        WHERE st.id = ? AND st.created_by_github_login = ?
              AND s.created_by_github_login = ?
        """,
        (task_id, github_login, github_login),
    ).fetchone()
    conn.close()
    return dict(row) if row is not None else None


def list_sprint_tasks(sprint_id: str, github_login: str) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        """
        SELECT * FROM sprint_tasks
        WHERE sprint_id = ? AND created_by_github_login = ?
        ORDER BY (status = 'done') ASC, (status = 'in_progress') DESC,
                 points DESC, created_at ASC
        """,
        (sprint_id, github_login),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_sprint_task_fields(task_id: str, github_login: str, **fields) -> Optional[dict]:
    allowed = {
        "title",
        "description",
        "assignee",
        "points",
        "status",
        "origin",
        "record_id",
        "issue_id",
    }
    sets = []
    values: list[Any] = []
    for key, value in fields.items():
        if key not in allowed:
            continue
        if key == "points":
            value = _clamp_points(value)
        elif key == "origin":
            value = value if value in _SPRINT_TASK_ORIGIN else "manual"
        elif key == "status":
            if value not in _SPRINT_TASK_STATUS:
                continue
            # ao concluir (done) registra quando; ao reabrir zera o marcador.
            sets.append("status = ?")
            values.append(value)
            sets.append("completed_at = ?")
            values.append(datetime.utcnow().isoformat() if value == "done" else None)
            continue
        sets.append(f"{key} = ?")
        values.append(value)

    if not sets:
        return get_user_sprint_task(task_id, github_login)

    values.append(datetime.utcnow().isoformat())
    values.extend([task_id, github_login])
    conn = _get_conn()
    conn.execute(
        f"UPDATE sprint_tasks SET {', '.join(sets)}, updated_at = ? "
        "WHERE id = ? AND created_by_github_login = ?",
        values,
    )
    conn.commit()
    conn.close()
    return get_user_sprint_task(task_id, github_login)


def delete_user_sprint_task(task_id: str, github_login: str) -> bool:
    conn = _get_conn()
    cursor = conn.execute(
        "DELETE FROM sprint_tasks WHERE id = ? AND created_by_github_login = ?",
        (task_id, github_login),
    )
    conn.commit()
    conn.close()
    return cursor.rowcount > 0


def build_burndown(sprint: dict, tasks: list[dict]) -> list[dict]:
    # série de trabalho restante por dia da sprint:
    #   remaining -> total de pontos menos os concluídos até o dia (linha real);
    #   ideal     -> reta do total no início até 0 no fim (linha ideal).
    # como o GitHub não guarda pontuação, os pontos vivem no sistema.
    total = sum(_clamp_points(t.get("points")) for t in tasks)

    def parse_date(value) -> datetime:
        if not value:
            return datetime.utcnow()
        try:
            return datetime.fromisoformat(str(value)[:10])
        except (TypeError, ValueError):
            return datetime.utcnow()

    start = parse_date(sprint.get("start_date"))
    end = parse_date(sprint.get("end_date"))
    if end < start:
        start, end = end, start

    day_count = max(1, (end - start).days + 1)

    completed_by_day: Dict[str, int] = {}
    for t in tasks:
        if t.get("status") == "done" and t.get("completed_at"):
            day = str(t["completed_at"])[:10]
            completed_by_day[day] = completed_by_day.get(day, 0) + _clamp_points(
                t.get("points")
            )

    series = []
    for day_index in range(day_count):
        day = (start + timedelta(days=day_index)).isoformat()[:10]
        done_until = sum(
            points for key, points in completed_by_day.items() if key <= day
        )
        remaining = max(0, total - done_until)
        ideal = total if day_count == 1 else total * (1 - day_index / (day_count - 1))
        series.append(
            {
                "date": day,
                "remaining": round(remaining, 1),
                "ideal": round(ideal, 1),
            }
        )
    return series
