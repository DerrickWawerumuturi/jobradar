# Decision: persistent job storage

**Files:** `src/database/`, `src/Agent/Framework/JobRadarAgent.py`,
`src/Agent/Framework/SearchEngine.py`

## Why jobs are persisted at all

Before this change, every posting JobRadar fetched was discarded the moment the
response was serialised. Each analysis re-bought the same data from the same
APIs, and nothing accumulated.

That is fine for answering *"where does this CV stand today"* and useless for
every question JobRadar actually wants to answer next — how demand for a skill
moves, which skills cluster together, how long postings stay open, which
provider is worth paying for. All of those are questions about **change over
time**, and none can be answered retroactively. A market observation not
recorded on the day it happened cannot be recovered later at any price.

So the database is not an optimisation. It is the only way the interesting
questions become answerable at all, and the cost of not starting compounds
daily.

A secondary benefit landed immediately: `parse_retrieved_jobs` drops postings
with no description and postings whose SkillNer extraction raises — about 14% in
the run profiled in the changelog. Persisting before parsing means those are now
kept and reprocessable instead of lost.

## Why raw and processed data are separated

The split is a **table boundary**, not a column-naming convention:

| | Table | Contents |
|---|---|---|
| Raw | `jobs` | Provider values, verbatim, plus the complete `raw_payload` |
| Processed | `job_skills`, `skills` | What SkillExtractor derived |

Nothing in `jobs` is computed by JobRadar. Every column is either identity,
provenance, a value the provider supplied unchanged, or a timestamp we own.

The reason is that our parsing logic is the part most likely to be wrong. The
changelog for 2026-08-19 records an extraction rewrite that changed *every*
number in the dashboard; the remaining follow-up (replacing SkillNer's n-gram
scorer) will change them again. If derived values had overwritten source values,
each of those improvements would have required re-buying the entire history from
the provider APIs — assuming the postings still existed, which for a job board
they mostly do not.

With `raw_payload` retained, a future extractor reprocesses years of history
offline, for free.

An earlier draft of this schema had both `description` and `raw_description`
columns. They were dropped to one: today no cleaning step exists between the
provider's text and what we store, so the pair would have been two identical
8 KB blobs per row. If an HTML-stripping or normalisation step is ever added,
`raw_payload` still holds the original and the column can come back then.

## How deduplication works

The identity is `(provider, external_id)`, enforced by a unique constraint.

Title and company are deliberately not part of it. One company posts "Software
Engineer" many times; two companies post it constantly. Nothing about that
pairing identifies a posting.

Three things had to be built before that key could exist:

**`provider` did not exist in the codebase.** `Job.source` looked like it held
the provider name but actually held a URL — `job_apply_link` for JSearch,
`refs.landing_page` for Muse. Provider identity is now stamped in
`JOBPROVIDER.parse_job` from a class attribute, in the base class rather than in
each `normalize()`, so a new provider cannot forget it.

**`url` was the wrong fallback key.** The original scaffold schema
(`db/legacy_scaffold.sql`) deduped on `url unique`. With JSearch's mapping at the
time, `url` was `employer_website` — the company's homepage, identical for every
posting at that company. That key would have collapsed an entire employer's
postings into a single row. `url` now points at `job_apply_link`.

**Some postings have no id.** For those, `external_id` becomes
`fp:<sha256[:32]>` over `provider | company | title | location | url`, with
`identity_source` recording which route was taken. Description is excluded from
the hash: providers reflow and truncate it between calls, so including it would
mint a new identity for the same posting. The fingerprint is computed and stored
for *every* row regardless of whether it was needed, so its collision rate
against real provider ids stays measurable rather than assumed.

**Duplicates inside one batch** are collapsed before the write. JSearch is
queried once per country and returns the same posting in more than one of them;
Postgres rejects an `ON CONFLICT DO UPDATE` that would touch one row twice in a
single statement, so this cannot be left to the unique index.

Cross-provider duplicates — the same real job on both JSearch and Muse — are
deliberately **not** merged. They are two rows, which is correct: provider
coverage and duplicate-rate analysis needs both to exist. `fingerprint` is
indexed on every row so a later `canonical_job_id` can cluster them without a
backfill from the APIs.

## Idempotency

The write is a single batched upsert. Running the same search twice produces the
same row count.

Three rules are encoded in the `ON CONFLICT` clause:

- `coalesce(excluded.x, jobs.x)` — a later, thinner provider response can never
  null out a value we already hold.
- `first_seen_at` is absent from the update list, so it cannot move.
- The longer description wins, because providers truncate inconsistently between
  calls.

`returning (xmax = 0) as inserted` distinguishes an insert from an update, which
is where a real per-provider duplicate rate comes from.

## Why PostgreSQL

It was already the project's database, `DATABASE_URL` already pointed at Neon,
and `psycopg` and `pgvector` were already dependencies. Introducing a second
store for job data would have meant two consistency models and no way to join
postings against embeddings later.

Beyond inertia, the specific features being relied on are Postgres ones:
`ON CONFLICT DO UPDATE` for the idempotent upsert, `jsonb` for raw payloads that
have no fixed shape across providers, real foreign keys for the normalized skill
graph, and pgvector when Phase 6 arrives.

**Raw SQL migrations rather than an ORM.** Numbered `.sql` files, a
`schema_migrations` table and a small runner (`python -m src.database.migrate`).
The central operation here is a batched
`INSERT … ON CONFLICT DO UPDATE … RETURNING`, which is clearer as SQL than as ORM
calls, and the later ML work reads with `pandas.read_sql`, which wants no ORM at
all. The cost is hand-written row mapping and no autogenerated diffs — accepted
deliberately.

**Two Neon-specific settings**, both consequences of `DATABASE_URL` being the
`-pooler` host, which is PgBouncer in transaction mode:

- `prepare_threshold=None` on runtime connections. psycopg auto-prepares a
  statement after its fifth execution; under transaction pooling the next
  transaction may land on a different backend, producing intermittent
  `prepared statement already exists`. Disabled up front rather than debugged
  under load six months from now.
- Migrations use `DATABASE_URL_DIRECT` (the same host without `-pooler`), because
  DDL and `CREATE EXTENSION` want a real session.

Neon also scales to zero, so the pool runs `min_size=0` with a short connect
timeout, and a failure pauses writes for 60 seconds — otherwise a cold or down
database costs the timeout on every call of every analysis.

## How job observations work

`jobs` holds the current best-known state of a posting. `job_observations` holds
the timeline: one row per (job, search) sighting.

The distinction that matters most in this schema is between four timestamps that
are easy to confuse:

| | Meaning |
|---|---|
| `posted_at` | when the employer published it |
| `posted_at_raw` | what the provider actually said, verbatim |
| `first_seen_at` | when JobRadar first observed it |
| `last_seen_at` | when JobRadar most recently observed it |

A posting existed before we saw it, so `posted_at < first_seen_at` normally.
`posted_at_raw` exists because JSearch's `job_posted_at` is a **relative phrase**
— `"2 days ago"` — which is not a timestamp. `posted_at` is populated only from a
genuinely absolute field (`job_posted_at_datetime_utc`, or Muse's
`publication_date`) and is NULL otherwise, rather than guessed.

**An observation records exactly one fact: this job appeared in this result set
at this time.** No provider tells us when a posting closes, so `'seen'` is the
only status the check constraint allows. It would be easy and wrong to infer
"the company stopped advertising" from a job's disappearance — our query text and
page size vary between runs, so a posting may simply have fallen out of page one.

That is why `searches` and `search_provider_runs` were built alongside. Without
knowing which query ran, whether the provider answered, and how long it took,
absence is uninterpretable and every "how long did this job stay open" answer is
noise. With them, disappearance can eventually be qualified: *absent from a
search that used the same terms and succeeded* is evidence; *absent from a search
that timed out* is not.

`job_observations.raw_payload` is populated only when the payload differs from
the previous sighting. Storing it every time would duplicate ~8 KB per job per
run; storing it on change keeps full raw history at a fraction of the size and
makes "was this posting edited?" a cheap query.

## How the schema supports future ML

| Future task | What already exists for it |
|---|---|
| Skill co-occurrence | `job_skills` self-join on `job_id` — a full co-occurrence matrix, no JSON parsing |
| Skill demand over time | `job_skills ⋈ jobs.first_seen_at` from day one; `job_observations` upgrades this to active-postings-per-week |
| Ranking features | `job_skills` is a multi-hot design matrix straight out of the database |
| Extractor evaluation | `extractor_version` in the `job_skills` primary key |
| Provider quality | `search_provider_runs` plus the insert/update split from `xmax = 0` |
| pgvector / RAG | `jobs.id` is a stable FK; `job_embeddings` bolts on without touching anything |

`extractor_version` being part of the key is the one piece of deliberate
forward-design, and it earns its place immediately. When SkillExtractor changes,
v2 reprocesses stored `raw_payload` and both generations coexist **over identical
inputs** — which is an offline evaluation set for the extractor, obtained for
free. Without it, reprocessing would destroy the only evidence of whether the
change helped.

Skills are relational rather than a JSON array on the job for the same reason:
`"how many jobs mention Python and PyTorch"` is an index scan against
`job_skills` and a full-table JSON parse against the alternative, and the gap
widens with every row added.

## Why we are not training a model yet

The obvious move once this table fills is XGBoost over
`(user profile, job) → match probability`, trained on `overall_score`.

That model would be worthless, and it is worth writing down exactly why.
`overall_score` is a fixed weighted cosine — `0.30 · title + 0.50 · skills +
0.10 · experience + 0.10 · location`, defined in `SimilarityEngine`. A model
trained on it learns to approximate arithmetic we already have in closed form,
and adds error doing so. Worse, `architecture/backend.md` records that
`experience_score` and `location_score` are near-constant across postings, so a
fifth of that label is noise by construction.

A ranking model needs labels the product does not yet emit: saved, applied,
dismissed, interviewed. Those come from the dashboard, which today has no such
affordances. The sequence is therefore: collect postings (this change) → capture
interactions when the dashboard grows those buttons → *then* there is a
supervised problem worth solving.

Market-trend prediction has a different gate. It needs **elapsed time**, not more
rows. Skill trajectories fitted over a two-week window measure sampling
variance, not demand. That is a months-of-observation problem, and the schema's
job is to make sure those months are being recorded starting now.

The database is an investment in a capability that has a prerequisite. Building
the prerequisite is not the same as building the capability, and shipping a
model early would mean answering a question nobody asked with data that cannot
support it.

## Known gaps

- `skills.emsi_skill_id` is nullable and currently always NULL. `SkillExtractor`
  matches on `skill_id` and then returns only the canonical name; threading the
  id out would change `extract()`'s return shape and ripple into
  `MarketAnalyzer` and the embedder. Backfillable later.
- `jobs.experience_level` is populated only by The Muse, which publishes a level
  per posting. JSearch supplies none and JobRadar does not infer one.
- `Job.salary` (the legacy single figure) is not written to the database. Its
  source key never existed in JSearch's response, and a lone number cannot be
  honestly recorded as a minimum, a maximum or an exact figure. The four
  `salary_*` columns are populated from the provider's own min/max/currency/period
  fields instead.
- Cross-provider duplicate linking is not implemented; see the deduplication
  section.
