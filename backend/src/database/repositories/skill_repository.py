# DO UPDATE rather than DO NOTHING: DO NOTHING suppresses the RETURNING row for
# skills that already exist, and the id of an existing skill is exactly what the
# caller needs. The assignment is a deliberate no-op.
UPSERT_SKILLS = """
insert into skills (name, normalized_name)
values {rows}
on conflict (normalized_name) do update set name = skills.name
returning id, normalized_name
"""

DELETE_JOB_SKILLS = """
delete from job_skills
where job_id = any(%s) and extractor_version = %s
"""

INSERT_JOB_SKILLS = """
insert into job_skills (job_id, skill_id, extractor_version)
values {rows}
on conflict (job_id, skill_id, extractor_version) do nothing
"""

BATCH_SIZE = 500


def normalize_name(name: str) -> str:
    return " ".join(name.split()).lower()


def get_or_create_skills(conn, names: set[str]) -> dict[str, int]:
    """Map normalized skill name -> skills.id, creating rows as needed."""
    unique: dict[str, str] = {}
    for name in names:
        cleaned = " ".join((name or "").split())
        if cleaned:
            unique.setdefault(normalize_name(cleaned), cleaned)

    if not unique:
        return {}

    ids: dict[str, int] = {}
    items = list(unique.items())

    for start in range(0, len(items), BATCH_SIZE):
        chunk = items[start:start + BATCH_SIZE]
        sql = UPSERT_SKILLS.format(rows=", ".join(["(%s, %s)"] * len(chunk)))
        params = [value for normalized, display in chunk for value in (display, normalized)]

        with conn.cursor() as cur:
            cur.execute(sql, params)
            ids.update({row["normalized_name"]: row["id"] for row in cur.fetchall()})

    return ids


def replace_job_skills(
    conn,
    job_skill_ids: dict[int, set[int]],
    extractor_version: str,
) -> int:
    """
    Rewrite this extractor version's output for the given jobs.

    Scoped to one version so reprocessing under a new extractor leaves the
    previous generation's rows intact — that pairing is what makes two
    extractors comparable over identical input.
    """
    if not job_skill_ids:
        return 0

    pairs = [
        (job_id, skill_id)
        for job_id, skill_ids in job_skill_ids.items()
        for skill_id in skill_ids
    ]

    with conn.cursor() as cur:
        cur.execute(DELETE_JOB_SKILLS, (list(job_skill_ids.keys()), extractor_version))

        for start in range(0, len(pairs), BATCH_SIZE):
            chunk = pairs[start:start + BATCH_SIZE]
            sql = INSERT_JOB_SKILLS.format(
                rows=", ".join(["(%s, %s, %s)"] * len(chunk))
            )
            params = [
                value
                for job_id, skill_id in chunk
                for value in (job_id, skill_id, extractor_version)
            ]
            cur.execute(sql, params)

    return len(pairs)
