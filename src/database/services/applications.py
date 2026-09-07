from datetime import datetime, timezone

from psycopg.errors import ForeignKeyViolation
from src.database.repositories.application_repository import (
    create, create_manual, current_status, list_for_user, update_status,
    insert_event, find_by_user_and_job, delete, timeline,
)
from src.database.session import connection
from src.database.repositories.user_repository import get_user_id, upsert_user



INITIAL_STATUS = "saved"

class ApplicationNotFound(Exception):
    pass

class UserNotFound(Exception):
    pass

class JobNotFound(Exception):
    pass

class BookmarkNotRemovable(Exception):
    pass


def _getuser(conn, payload):
    sub = payload.get("sub")
    if not sub:
        raise UserNotFound("token carries no subject")

    user_id = get_user_id(conn, sub)
    if user_id is None:
        # First authenticated touch — provision on the spot, exactly as
        # PUT /cv does, instead of failing until a CV is saved.
        user_id = upsert_user(conn, sub, payload.get("email"), payload.get("name"), None)
    return user_id


def _create_bookmark(conn, user_id, job_id, title, company, source,
                     match_score, cv_snapshot, occurred_at):
    application_id = create(
        conn, user_id, job_id, title, company, source, match_score, cv_snapshot
    )
    insert_event(conn, application_id, None, INITIAL_STATUS, occurred_at, None, None)
    return application_id


class ApplicationIngestionService:

    def bookmark(self,
                 payload,
                 job_id, title, company, source, match_score,
                 cv_snapshot, last_status_at, scheduled_for = None, note= None):
        occurred_at = last_status_at or datetime.now(timezone.utc)

        with connection() as conn:
            user_id = _getuser(conn, payload)

            bookmark_id = create(
                conn,
                user_id,
                job_id,
                title,
                company,
                source,
                match_score,
                cv_snapshot
            )

            insert_event(
                conn,
                bookmark_id,
                None,
                INITIAL_STATUS,
                occurred_at,
                scheduled_for,
                note

            )

            return bookmark_id

    def transition(self, payload, application_id, to_status,
                   occurred_at, scheduled_for=None, note=None):
        occurred_at = occurred_at or datetime.now(timezone.utc)
        with connection() as conn:
            user_id = _getuser(conn, payload)

            status_now = current_status(
                conn,
                user_id,
                application_id
            )



            if status_now is None:
                raise ApplicationNotFound(f"application {application_id}")

            update_status(
                conn,
                application_id,
                to_status,
                occurred_at,
            )

            insert_event(
                conn,
                application_id,
                status_now,
                to_status,
                occurred_at,
                scheduled_for,
                note,
            )

    def add_manual(self, payload, title, company=None, url=None, location=None,
                   status="applied", cv_snapshot=None) -> int:
        # Created as `saved` first so the event trail always starts at the
        # beginning, then moved if the user already applied.
        occurred_at = datetime.now(timezone.utc)
        with connection() as conn:
            user_id = _getuser(conn, payload)

            application_id = create_manual(
                conn, user_id, title, company, cv_snapshot, url, location
            )
            insert_event(conn, application_id, None, INITIAL_STATUS, occurred_at, None, None)

            if status != INITIAL_STATUS:
                update_status(conn, application_id, status, occurred_at)
                insert_event(conn, application_id, INITIAL_STATUS, status, occurred_at, None, None)

            return application_id

    def list_applications(self, payload) -> list[dict] | None:
        with connection() as conn:
            user_id = _getuser(conn, payload)

            list_applications = list_for_user(
                conn,
                user_id
            )

            return list_applications

    def toggle_bookmark(self, payload, job_id, title=None, company=None,
                        source=None, match_score=None, cv_snapshot=None,
                        occurred_at=None) -> dict:
        # Removal only while still `saved`: deleting a sent application would
        # cascade away its whole event history.
        occurred_at = occurred_at or datetime.now(timezone.utc)

        with connection() as conn:
            user_id = _getuser(conn, payload)
            existing = find_by_user_and_job(conn, user_id, job_id)

            if existing is None:
                try:
                    application_id = _create_bookmark(
                        conn, user_id, job_id, title, company, source,
                        match_score, cv_snapshot, occurred_at,
                    )
                except ForeignKeyViolation as err:
                    raise JobNotFound(f"job {job_id}") from err
                return {"bookmarked": True, "application_id": application_id}

            if existing["status"] != INITIAL_STATUS:
                raise BookmarkNotRemovable(
                    f"application {existing['id']} is {existing['status']}, not a bookmark"
                )

            delete(conn, user_id, existing["id"])
            return {"bookmarked": False, "application_id": None}

    def history(self, payload, application_id) -> list[dict]:
        with connection() as conn:
            user_id = _getuser(conn, payload)

            if current_status(conn, user_id, application_id) is None:
                raise ApplicationNotFound(f"application {application_id}")

            return timeline(conn, user_id, application_id)


application_service = ApplicationIngestionService()