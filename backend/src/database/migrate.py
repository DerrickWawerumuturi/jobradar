"""
Apply pending SQL migrations.

    python -m src.database.migrate          apply everything outstanding
    python -m src.database.migrate --status list applied and pending

Files are applied in filename order, each in its own transaction, and recorded
in schema_migrations. Re-running is a no-op.
"""

import sys
from pathlib import Path

import psycopg

from src.database.session import migration_url

MIGRATIONS_DIR = Path(__file__).parent / "migrations"

BOOTSTRAP = """
create table if not exists schema_migrations (
    version    text primary key,
    applied_at timestamptz not null default now()
);
"""


def _all_migrations() -> list[Path]:
    return sorted(MIGRATIONS_DIR.glob("*.sql"))


def _applied(conn) -> set[str]:
    with conn.cursor() as cur:
        cur.execute(BOOTSTRAP)
        cur.execute("select version from schema_migrations")
        rows = cur.fetchall()
    conn.commit()
    return {row[0] for row in rows}


def status() -> int:
    with psycopg.connect(migration_url()) as conn:
        applied = _applied(conn)

    for path in _all_migrations():
        mark = "applied" if path.stem in applied else "pending"
        print(f"  [{mark}] {path.stem}")
    return 0


def migrate() -> int:
    with psycopg.connect(migration_url()) as conn:
        applied = _applied(conn)
        pending = [p for p in _all_migrations() if p.stem not in applied]

        if not pending:
            print("Schema up to date")
            return 0

        for path in pending:
            print(f"Applying {path.stem}")
            with conn.cursor() as cur:
                cur.execute(path.read_text())
                cur.execute(
                    "insert into schema_migrations (version) values (%s)",
                    (path.stem,),
                )
            conn.commit()

        print(f"Applied {len(pending)} migration(s)")
    return 0


if __name__ == "__main__":
    sys.exit(status() if "--status" in sys.argv else migrate())
