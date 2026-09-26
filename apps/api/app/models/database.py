from __future__ import annotations

import json
import os
import re
import sqlite3
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DB_PATH = os.path.join(DB_DIR, "anota_ai.db")


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


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
    }
    sets = ["status = ?"]
    values = [status]
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
) -> dict:
    # os pontos/prioridade vivem no sistema, pois o GitHub não os armazena
    # (github_issue_id é o vínculo com a issue real).
    
    conn = _get_conn()
    now = datetime.utcnow().isoformat()
    conn.execute(
        """
        INSERT INTO issues (
            id, github_issue_id, number, title, body, state, repo_full_name,
            source, points, priority, priority_source, assignee, html_url,
            record_id, created_by_github_login, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            github_login,
            now,
            now,
        ),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM issues WHERE id = ?", (issue_id,)).fetchone()
    conn.close()
    return dict(row) if row is not None else {}


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
        conn.execute(
            """
            UPDATE issues
            SET title = ?, body = ?, state = ?, html_url = ?, updated_at = ?
            WHERE id = ?
            """,
            (title, body, state, html_url, now, row["id"]),
        )
        conn.commit()
        conn.close()
        return False

    conn.execute(
        """
        INSERT INTO issues (
            id, github_issue_id, number, title, body, state, repo_full_name,
            source, points, priority, priority_source, assignee, html_url,
            created_by_github_login, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'external', 0, 'medium', 'system', ?, ?, ?, ?, ?)
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
        ),
    )
    conn.commit()
    conn.close()
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
        sets.append(f"{key} = ?")
        values.append(value)

    if not sets:
        return get_user_issue(issue_id, github_login)

    values.append(datetime.utcnow().isoformat())
    values.extend([issue_id, github_login])
    conn = _get_conn()
    conn.execute(
        f"UPDATE issues SET {', '.join(sets)}, updated_at = ? "
        "WHERE id = ? AND created_by_github_login = ?",
        values,
    )
    conn.commit()
    conn.close()
    return get_user_issue(issue_id, github_login)


def delete_user_issue(issue_id: str, github_login: str) -> bool:
    conn = _get_conn()
    cursor = conn.execute(
        "DELETE FROM issues WHERE id = ? AND created_by_github_login = ?",
        (issue_id, github_login),
    )
    conn.commit()
    conn.close()
    return cursor.rowcount > 0


def create_draft_issues_from_tasks(
    record_id: str,
    github_login: str,
    repo_full_name: str,
    tasks: list[Dict[str, Any]],
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
                created_by_github_login, created_at, updated_at
            )
            VALUES (?, ?, ?, 'open', ?, 'draft', ?, ?, 'system', ?, ?, ?, ?, ?)
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
