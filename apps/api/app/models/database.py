from __future__ import annotations

import json
import os
import re
import sqlite3
from datetime import datetime
from typing import Dict, Optional

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
            created_issues  TEXT,
            repo_full_name  TEXT DEFAULT '',
            error_message   TEXT
        )
        """
    )

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
    """Atualiza status e campos opcionais (transcript, summary, tasks, etc)."""
    conn = _get_conn()
    allowed = {
        "transcript",
        "summary",
        "tasks",
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
    for field in ("tasks", "created_issues"):
        if isinstance(d.get(field), str):
            try:
                d[field] = json.loads(d[field])
            except (json.JSONDecodeError, TypeError):
                pass
    return d


# -------------------------
# Teams / aliases
# -------------------------

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
    """aliases: [(alias, display_name)]"""
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
    """Retorna map {normalized_alias: github_login}."""
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

