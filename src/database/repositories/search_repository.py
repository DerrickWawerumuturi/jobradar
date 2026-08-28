from datetime import datetime

from psycopg.types.json import Jsonb

INSERT_SEARCH = """
insert into searches
    (query_json, primary_role, location, remote, started_at, jobs_returned,
     country_code, city, scopes, widened)
values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
returning id
"""

INSERT_PROVIDER_RUNS = """
insert into search_provider_runs
    (search_id, provider, request_params, status, http_status, error, jobs_returned, duration_ms)
values {rows}
"""

VALID_STATUS = ("ok", "http_error", "timeout", "exception")


def create_search(
    conn,
    query,
    started_at: datetime,
    jobs_returned: int,
    coverage: dict | None = None,
) -> int:
    coverage = coverage or {}
    resolved = coverage.get("location") or {}

    with conn.cursor() as cur:
        cur.execute(INSERT_SEARCH, (
            Jsonb(query.model_dump(mode="json")),
            getattr(query, "primary_role", None),
            getattr(query, "location", None),
            getattr(query, "remote", None),
            started_at,
            jobs_returned,
            resolved.get("country_code"),
            resolved.get("city"),
            coverage.get("scopes"),
            bool(coverage.get("widened_below_floor")),
        ))
        return cur.fetchone()["id"]


def record_provider_runs(conn, search_id: int, runs: list[dict]) -> int:
    if not runs:
        return 0

    sql = INSERT_PROVIDER_RUNS.format(
        rows=", ".join(["(%s, %s, %s, %s, %s, %s, %s, %s)"] * len(runs))
    )
    params = []
    for run in runs:
        status = run.get("status")
        params.extend([
            search_id,
            run.get("provider"),
            Jsonb(run.get("request_params") or {}),
            status if status in VALID_STATUS else "exception",
            run.get("http_status"),
            run.get("error"),
            run.get("jobs_returned"),
            run.get("duration_ms"),
        ])

    with conn.cursor() as cur:
        cur.execute(sql, params)

    return len(runs)
