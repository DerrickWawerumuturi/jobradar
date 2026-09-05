from psycopg.types.json import Jsonb




GET_CV = """
select c.data
from cvs c
join users u on u.id = c.user_id
where u.sub = %s
"""
SELECT_USER = """
select u.id
from users u
where u.sub = %s
"""

UPSERT_USER = """
insert into users (sub, email, name, image)
values (%s, %s, %s, %s)
on conflict (sub) do update set
    email = excluded.email,
    name  = excluded.name,
    image = excluded.image,
    updated_at = now()
returning id
"""

SAVE_CV = """
insert into cvs(user_id, data)
values (%s, %s)
on conflict(user_id) do update set
    data = excluded.data,
    updated_at = now()
"""


def get_user_id(conn, sub):
    with conn.cursor() as cur:
        cur.execute(SELECT_USER, (sub,))
        row = cur.fetchone()
        return row["id"] if row else None


def upsert_user(conn, sub, email, name, image) -> int:
    with conn.cursor() as cur:
        cur.execute(UPSERT_USER, (sub, email, name, image))
        return cur.fetchone()["id"]

def save_cv(conn, user_id, data: dict) -> None:
    with conn.cursor() as cur:
        cur.execute(SAVE_CV, (user_id, Jsonb(data)))

def get_cv(conn, sub: str) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(GET_CV, (sub,))
        row = cur.fetchone()
        return row["data"] if row else None