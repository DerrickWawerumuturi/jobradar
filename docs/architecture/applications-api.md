# Applications API

Application tracking for the dashboard. All routes require
`Authorization: Bearer <jwt>`; the user is taken from the token's `sub`.

## Routes

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/provision` | — | `{"ok": true}` |
| POST | `/dashboard/applications` | `BookmarkRequest` | `{"bookmarked": bool, "application_id": int\|null}` |
| GET | `/dashboard/applications` | — | list of applications |
| POST | `/dashboard/applications/{id}/transition` | `TransitionRequest` | `{"status": "<new>"}` |
| GET | `/dashboard/applications/{id}/history` | — | event timeline, newest first |

`POST /auth/provision` must be called once after sign-in. Nothing else creates
the `users` row, and every other route returns 401 until it exists.

## Bodies

```jsonc
// BookmarkRequest — job_id required, the rest snapshot the posting on create
{ "job_id": 2242, "title": "ML Engineer", "company": "Acme",
  "source": "linkedin", "match_score": 0.62, "cv_snapshot": { } }

// TransitionRequest — to_status required
{ "to_status": "applied", "occurred_at": null,
  "scheduled_for": null, "note": "applied on their site" }
```

`to_status` is one of `applied · screening · interview · offer · rejected ·
withdrawn`. `saved` is not accepted: it is a creation state only.

`occurred_at` defaults to now; send it only when backdating (a rejection read
days after it was decided).

## Bookmarking

`POST /dashboard/applications` is a **toggle**. No application for that job
creates one at `saved`; an existing one at `saved` is deleted; an existing one
at any other status returns **409**, because deleting it would cascade away its
event history.

`job_id` is the `db_id` on each posting in the `/analyze` response. It is
**null** when persistence was disabled or failed — those postings cannot be
bookmarked and the control should be disabled rather than posting null.

## Status codes

| code | meaning |
|---|---|
| 401 | bad token, or no `users` row (call `/auth/provision`) |
| 404 | application not found, not yours, or unknown `job_id` |
| 409 | un-bookmarking an application that has been sent |
| 422 | body failed validation |

404 covers "not yours" deliberately, so ids cannot be probed.

## Transitions

Any transition between the six statuses is allowed, including backwards — a
misclick is corrected by transitioning again, and both moves stay in the
timeline. Returning to `saved` is impossible once applied.
