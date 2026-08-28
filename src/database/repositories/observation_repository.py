from psycopg.types.json import Jsonb

from src.database.models.job import ObservationRecord

INSERT_OBSERVATIONS = """
insert into job_observations
    (job_id, search_id, provider, result_rank, payload_hash, payload_changed, raw_payload)
values {rows}
"""

BATCH_SIZE = 200


def record_observations(conn, observations: list[ObservationRecord]) -> int:
    if not observations:
        return 0

    written = 0
    for start in range(0, len(observations), BATCH_SIZE):
        chunk = observations[start:start + BATCH_SIZE]
        sql = INSERT_OBSERVATIONS.format(
            rows=", ".join(["(%s, %s, %s, %s, %s, %s, %s)"] * len(chunk))
        )
        params = []
        for observation in chunk:
            params.extend([
                observation.job_id,
                observation.search_id,
                observation.provider,
                observation.result_rank,
                observation.payload_hash,
                observation.payload_changed,
                Jsonb(observation.raw_payload) if observation.raw_payload else None,
            ])

        with conn.cursor() as cur:
            cur.execute(sql, params)
        written += len(chunk)

    return written
