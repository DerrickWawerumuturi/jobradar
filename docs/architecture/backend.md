# Backend architecture

FastAPI service wrapping an agent pipeline. Entry point is `main.py`; the
pipeline lives under `src/Agent/`.

## Layout

```
main.py                              FastAPI app, /health and /analyze
pdf_inspector/                       PDF → text
skill_db_relax_20.json               EMSI skill database (31,278 entries)
src/Agent/
  Framework/
    JobRadarAgent.py                 orchestrator + module-level singleton
    QueryInterpreter.py              CV text → ParsedQuery (via LLM)
    SearchEngine.py                  job providers, concurrent fetch
    SimilarityEngine.py              scoring + MarketAnalyzer
  utils/
    skill_extractor.py               SkillNer wrapper, canonical names
    extraction_pool.py               process pool for extraction
    embedder.py                      sentence-transformers
    parser.py                        parsing/validation helpers
    location.py                      location resolution + remote eligibility
    llm_client.py                    Groq client
    prompts.py                       system/user prompts
    types.py                         pydantic + dataclass models
src/database/
  session.py                         pooled connections (Neon)
  migrate.py                         SQL migration runner
  fingerprint.py                     dedup fallback hash
  migrations/*.sql                   schema, applied in filename order
  models/job.py                      row-shape dataclasses
  repositories/                      SQL per table
  services/ingestion.py              the pipeline's only storage entry point
evals/                               eval harness and eval set
```

## Request lifecycle

`main.py::analyze` writes the upload to a temp file, then:

```python
async with analysis_lock:
    cv_text = await run_in_threadpool(pdf_inspector.extract_text, temp_path)
    result  = await run_in_threadpool(job_radar_agent.run, cv_text)
```

The temp file is removed in a `finally`. Both calls are offloaded because they
are synchronous and slow; running them inline pinned the event loop and made the
whole API unreachable for the duration. The lock is required *because* of the
offload — see `decisions/` and the changelog for detail.

## Pipeline stages

### 1. QueryInterpreter → ParsedQuery

`llm_client.GroqModel` calls Groq with `SYSTEM_PROMPT` + `USER_PROMPT`,
`response_format={"type": "json_object"}` and `temperature=0`. The JSON is
validated into `ParsedQuery` by `parser.parse_generated_query`.

`ParsedQuery` carries the role, skill list, experience level, location and
several unused-but-parsed fields. Every field is optional.

Model and key come from `GROQ_MODEL_NAME` / `GROQ_API_KEY`.

### 1b. Persistence (interleaved, not a stage)

Storage is a side branch off the orchestrator, not a step the analysis waits on.
`JobRadarAgent` makes three fail-soft calls into `JobIngestionService`: record
the search, persist raw postings before parsing, persist extracted skills after
it. Nothing downstream reads from the database, and a failure degrades JobRadar
to its previous behaviour rather than failing the request.

See `decisions/persistent-job-storage.md`, and the storage section below.

### 2. SearchEngine → list[Job]

Five providers behind a `JOBPROVIDER` ABC. The search runs in **legs**
(`SearchScope`), and each provider declares which legs it can serve:

| Provider | Legs | Key |
|---|---|---|
| JSearch | local, remote, fallback | required |
| The Muse | local, remote, fallback | required |
| Remotive | remote | none |
| RemoteOK | remote | none |
| Jooble | local, fallback | free key, not yet set |

A search resolves the user's location, then runs `local:<country>` and
`remote:global` concurrently — every provider × every leg it supports. Below
`MIN_JOBS_FLOOR = 15` usable postings it widens to `fallback:us` / `fallback:gb`.
Every call carries `REQUEST_TIMEOUT = (5, 30)`.

Results are deduplicated on `(provider, external_id)` and remote postings that
exclude the user's country are dropped. `get_jobs` returns a `SearchOutcome`
carrying the jobs plus a coverage report.

Adzuna stays out: it truncates descriptions to 500 characters, and its country
list excludes Kenya.

See `decisions/location-aware-search.md`.

`normalize` maps each provider's payload onto the shared `Job` model, whose
fields all default to `None`.

### 3. Skill extraction → list[ProcessedJob]

`parser.parse_retrieved_jobs` submits every description to `extraction_pool` and
pairs results back with their job as `ProcessedJob(job, skills)`.

`ExtractionPool` wraps a `ProcessPoolExecutor` whose initializer builds one
`SkillExtractor` per worker and keeps it warm for the process lifetime. Workers
default to `min(4, cpus - 1)`, overridable with `JOBRADAR_EXTRACTION_WORKERS`;
the cap is a memory bound, since each worker holds its own `en_core_web_lg` and
the 31k-entry matchers.

Processes rather than threads: the work is pure CPU, so the GIL blocks any
thread gain, and spaCy pipelines are unsafe to call concurrently on one object.

A posting whose extraction raises is **dropped**, not kept with an empty skill
list — keeping it counted a job toward `jobs_analyzed` that contributed no
skills, deflating every frequency.

### 4. SentenceEmbedder

`all-MiniLM-L6-v2` encodes four facets for the user and for every job: title,
skills, experience, location. See `decisions/embeddings.md`.

The same model also runs **before** extraction, scoring the user's role + skills
against each job title and dropping postings below `alpha × best_score`. This
keeps off-market postings — copywriter, sales, aviation — out of the market
statistics, which weight every posting equally. See the 2026-08-21 changelog.

### 5. SimilarityEngine + MarketAnalyzer

`SimilarityEngine.calculate` produces a weighted cosine score per job and
returns them sorted descending. `MarketAnalyzer.analyze` aggregates skill
frequency, gaps, user presence and coverage across all jobs.

See `decisions/similarity-engine.md` and `decisions/market-analyzer.md`.

## The skill vocabulary

Everything downstream of extraction compares skill *strings*, so both sides must
speak one vocabulary.

`SkillExtractor` emits **canonical EMSI names** looked up by `skill_id` from
`SKILL_DB` — not SkillNer's `doc_node_value`, which is the matched span from
lemmatised text and arrives mangled (`big datum`, `machine learn`).

CV skills arrive from the LLM as free text, so `JobRadarAgent` passes them
through `skill_extractor.normalize()` before market analysis, mapping them onto
the same canonical names. Unrecognised skills are kept verbatim rather than
dropped.

Two denylists filter known-bad matches:

- `DENYLISTED_SURFACE_FORMS` — abbreviation collisions with ordinary prose
  (`San` → Storage Area Network, `com` → Component Object Model, `e` → E
  programming language). `c`, `r` and `go` are deliberately absent; they are
  real languages.
- `DENYLISTED_SKILL_NAMES` — real database entries that are job titles or fields
  of study rather than differentiating skills (`Software Engineering`,
  `Computer Science`, `Job Descriptions`).

`prepare_description()` drops legal, benefits and company-culture blocks, then
keeps only requirements-style sections — about a 66% character reduction, with a
fallback to full text when under 400 characters survive.

## Storage layer

PostgreSQL on Neon. Six tables:

```
searches ─1─n─ search_provider_runs
   │
   └─n─ job_observations ─1─ jobs ─n─ job_skills ─1─ skills
```

`jobs` holds **source data only** — provider values verbatim plus the complete
`raw_payload` as `jsonb`. Everything JobRadar derives lives in `job_skills`, so
the raw/processed split is a table boundary rather than a column prefix.

Identity is `(provider, external_id)` with a unique constraint; postings without
a provider id get `fp:<sha256[:32]>` over provider/company/title/location/url,
recorded in `identity_source`. Writes are a single batched upsert, so repeating
a search updates `last_seen_at` and appends an observation rather than inserting
duplicates.

`extractor_version` is part of `job_skills`' primary key, so a future extractor
can reprocess stored payloads without destroying the current generation's output.

Migrations are numbered `.sql` files tracked in `schema_migrations`:

```
python -m src.database.migrate --status     list applied and pending
python -m src.database.migrate              apply outstanding
```

Two Neon-specific requirements: runtime connections set
`prepare_threshold=None` (the `-pooler` host is PgBouncer in transaction mode),
and migrations use `DATABASE_URL_DIRECT` — the same host without `-pooler`.

## Configuration

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY`, `GROQ_MODEL_NAME` | LLM interpretation |
| `JOBRADAR_GROQ_REASONING_EFFORT` | Preferred reasoning effort for the gpt-oss query interpreter (default `medium`; falls back to `low` on a budget failure) |
| `JOBRADAR_GROQ_MAX_COMPLETION_TOKENS` | Completion cap for that call (default 4096). Counts towards the tokens-per-minute limit even when unused, so raising it can cause a 413 |
| `JSEARCH_API_KEY`, `JSEARCH_HOST` | JSearch provider |
| `MUSE_API_KEY` | The Muse provider |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins for the dashboard (default `http://localhost:3000`). The browser calls the API directly, so an origin missing here refuses the preflight with a 400 |
| `ALLOWED_ORIGIN_REGEX` | Optional pattern for origins that cannot be enumerated, e.g. Vercel preview hostnames. Scope it to your project — `https://.*\.vercel\.app` admits anyone's deployment |
| `DATABASE_URL` | Neon pooled endpoint, used at runtime |
| `DATABASE_URL_DIRECT` | Neon direct endpoint, used by migrations |
| `JOOBLE_API_KEY` | Jooble provider (optional; disabled without it) |
| `JOBRADAR_EXTRACTION_WORKERS` | Override extraction pool size. **Set this explicitly in containers** — the default derives from `os.cpu_count()`, which ignores cgroup CPU quotas and reports the host's cores, so an unset value spins up 4 workers regardless of the container's allocation and each holds its own `en_core_web_lg` |
| `JOBRADAR_EXTRACTOR_VERSION` | Tag written to `job_skills` |
| `JOBRADAR_RELEVANCE_ALPHA` | Off-market cut, as a fraction of the best title match (default 0.30) |
| `JOBRADAR_MAX_EXTRACTION_CHARS` | Per-posting ceiling sent to the annotator (default 4000) |
| `JOBRADAR_SPACY_MODEL` | Path to `en_core_web_lg`. Tried first; otherwise `/app/en_core_web_lg` (the container layout), then the checkout's `en_core_web_lg/en_core_web_lg-3.8.0`, then the installed package |
| `JOBRADAR_DB_POOL_SIZE` | Connection pool max size |

Loaded via `python-dotenv` from `.env`. Persistence disables itself when
`DATABASE_URL` is unset. `.env` is in `.dockerignore`, so in a container every
value must come from the platform's own environment or secrets; `GROQ_API_KEY` is
the only one that is fatal when missing, because `Groq()` raises in its
constructor (`llm_client.py:14`) during the import-time singleton build.

Deployment sizing is a configuration concern of the same kind. Importing
`main.py` loads `en_core_web_lg`, skillNer's 31k-entry matchers and MiniLM into
the main process *before* uvicorn binds its port, which is ~2 GB before a single
request arrives, and each extraction worker adds its own pipeline on top. See
`docs/changelog/2026-08-25-container-oom.md`.

## Known limitations

- Only The Muse supplies `experience_level`, so `experience_score` carries
  little ranking signal. `location_score` now varies, since postings come from
  more than one market, but its 0.10 weight has not been revisited.
- Remotive's `search`/`category` filters are inert — it returns its whole
  inventory regardless of query (measured: 5 of 17 postings technical). The
  off-market filter compensates, but the wasted requests remain.
- Skill extraction is **superlinear** in posting length: 46 postings / 85,900
  prepared characters took 434s on four workers, where a linear model predicted
  32s. Capping per-posting length would help more than trimming the corpus.
- `overall_score` compresses into a narrow band (roughly 0.2–0.5), so raw
  percentages read low.
- SkillNer raises on some inputs; those postings are dropped and logged.
- Extraction remains ~80% of runtime, dominated by SkillNer's pairwise
  `token.similarity()` n-gram scoring.
