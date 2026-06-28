from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime
from typing import Optional

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
    allowed = {"transcript", "summary", "tasks", "created_issues", "error_message", "status", "repo_full_name"}
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


def _row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    # Parse JSON fields back to Python objects
    for field in ("tasks", "created_issues"):
        if isinstance(d.get(field), str):
            try:
                d[field] = json.loads(d[field])
            except (json.JSONDecodeError, TypeError):
                pass
    return d
