from psycopg.types.json import Jsonb

CREATE_APPLICATION = """
insert into application (user_id, job_id, title, company, source, match_score, cv_snapshot)
values (%s, %s, %s, %s,  %s, %s, %s)
returning id
"""

GET_STATUS = """
select a.status
from application a
where a.id = %s and a.user_id = %s
"""

UPDATE_STATUS = """
update application
set status          = %s,
    last_status_at  = %s,
    applied_at      = coalesce(applied_at, %s),
    updated_at      = now()
where id = %s
"""

INSERT_EVENT = """
insert into application_events(application_id, from_status, to_status, occurred_at, scheduled_for, note)
values (%s, %s, %s, %s, %s, %s)
"""

GET_LIST_FOR_USER = """
select a.id, a.job_id, a.title, a.company, a.match_score, a.status,
       a.applied_at, a.last_status_at, a.cv_snapshot,
       coalesce(j.url, a.url)           as url,
       coalesce(j.location, a.location) as location,
       j.remote,
       coalesce(j.provider, 'manual')   as provider
from application a
left join jobs j on j.id = a.job_id
where a.user_id = %s
order by a.last_status_at desc
"""

GET_TIMELINE = """
select e.from_status, e.to_status, e.occurred_at, e.scheduled_for, e.note
from application_events e
join application a on a.id = e.application_id
where e.application_id = %s and a.user_id = %s
order by e.occurred_at desc
"""

FIND_BY_USER_AND_JOB = """
select a.id, a.status
from application a
where a.user_id = %s and a.job_id = %s
"""

DELETE_APPLICATION = """
delete from application
where id = %s and user_id = %s
"""

CREATE_MANUAL = """
insert into application (user_id, job_id, title, company, source, cv_snapshot, url, location)
values (%s, null, %s, %s, 'manual', %s, %s, %s)
returning id
"""


def create(conn, user_id, job_id, title, company, source, match_score, cv_snapshot) -> int:
    with conn.cursor() as cur:
        cur.execute(CREATE_APPLICATION,
                    (user_id, job_id, title, company, source, match_score, Jsonb(cv_snapshot) if cv_snapshot else None,))
        return cur.fetchone()["id"]

def create_manual(conn, user_id, title, company, cv_snapshot, url, location) -> int:
    with conn.cursor() as cur:
        cur.execute(CREATE_MANUAL,
                    (user_id, title, company, Jsonb(cv_snapshot) if cv_snapshot else None, url, location,))
        return cur.fetchone()["id"]


def current_status(conn, user_id, application_id) -> str | None:
    with conn.cursor() as cur:
        cur.execute(GET_STATUS, (application_id, user_id))
        row = cur.fetchone()
        return row["status"] if row else None

def update_status(conn, application_id, to_status, occurred_at) -> None:
    with conn.cursor() as cur:
        cur.execute(UPDATE_STATUS,  (to_status, occurred_at, occurred_at, application_id,))

def insert_event(conn, application_id, from_status, to_status, occurred_at, scheduled_for, note) -> None:
    with conn.cursor() as cur:
        cur.execute(INSERT_EVENT, (application_id, from_status, to_status, occurred_at, scheduled_for, note))

def list_for_user(conn, user_id) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(GET_LIST_FOR_USER, (user_id,))
        applications = cur.fetchall()
        return applications

def timeline(conn, user_id, application_id) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(GET_TIMELINE, (application_id, user_id))
        timelines = cur.fetchall()
        return timelines

def find_by_user_and_job(conn, user_id, job_id) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(FIND_BY_USER_AND_JOB, (user_id, job_id))
        return cur.fetchone()

def delete(conn, user_id, application_id) -> bool:
    with conn.cursor() as cur:
        cur.execute(DELETE_APPLICATION, (application_id, user_id))
        return cur.rowcount > 0
