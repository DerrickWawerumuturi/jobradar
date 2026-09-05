from datetime import datetime, timezone

from psycopg.errors import ForeignKeyViolation
from src.database.repositories.application_repository import (
    create, current_status, list_for_user, update_status, insert_event,
    find_by_user_and_job, delete, timeline,
)
from src.database.session import connection
from src.database.repositories.user_repository import get_user_id



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
    user_id = get_user_id(
        conn,
        payload["sub"],
    )
    if user_id is None:
        raise UserNotFound(f"User not found, user id is None: {user_id}")
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