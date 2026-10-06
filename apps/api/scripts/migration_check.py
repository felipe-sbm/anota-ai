"""Sanity check de migrações sobre um banco existente (cópia)."""
import sqlite3

import app.models.database as db


def main() -> None:
    db.DB_PATH = "/tmp/migrate_check.db"
    db.init_db()

    conn = sqlite3.connect(db.DB_PATH)
    project_cols = [r[1] for r in conn.execute("PRAGMA table_info(projects)")]
    assert "archived" in project_cols, project_cols
    assert "archived_at" in project_cols

    issue_cols = [r[1] for r in conn.execute("PRAGMA table_info(issues)")]
    assert "closed_at" in issue_cols
    assert "completed_at" in issue_cols

    tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")]
    assert "issue_events" in tables
    conn.close()
    print("MIGRATION_CHECK_OK")


if __name__ == "__main__":
    main()