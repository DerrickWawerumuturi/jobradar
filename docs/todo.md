# Todo

Deferred work, with enough context to pick it up cold.

## Bookmark UI (frontend)

The backend is done — `POST /dashboard/applications` toggles a bookmark on and
off. What is missing is the control on the jobs/analysis results that calls it.

See `architecture/applications-api.md` for the contract. Note `db_id` is null on
postings that were not persisted, and those cannot be bookmarked.

## Columns with no write path

`applications.notes`, `cover_letter` and `next_action_at` exist and nothing sets
them. Add to the transition body, or a separate PATCH, when the UI needs them.

## Toggle race

Two simultaneous clicks can both see "no existing row" and both insert; the
second hits `application_user_job_key`. Theoretical at current scale. The fix is
catching `UniqueViolation` in `toggle_bookmark` and treating it as already saved.
