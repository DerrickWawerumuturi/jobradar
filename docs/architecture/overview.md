# System overview

JobRadar answers one question: *where does this CV stand in the current job
market, and what should be learned next?*

It is one repository, two deployables:

| Part | Path | Deploys to | Role |
|---|---|---|---|
| API | `backend/` | Azure Container Apps | Produces the intelligence |
| Dashboard | `frontend/` | Vercel | Presents the intelligence |

They share a repo but never a process. The boundary is deliberate and
load-bearing: **all analysis happens server-side.**
The frontend may reshape numbers for display (`0.5555` → `55.6%`) but never
recomputes similarity, frequency or gaps.

## End-to-end flow

```
CV (PDF)
   │  multipart POST /analyze
   ▼
pdf_inspector.extract_text            plain text
   │
   ▼
QueryInterpreter  ──► Groq LLM        ParsedQuery (role, skills, location…)
   │
   ▼
SearchEngine      ──► local:<country> + remote:global legs   (concurrent)
                      JSearch · Muse · Remotive · RemoteOK · Jooble
   │                                  list[Job]
   ├────────────────────────────► persist raw jobs ──┐
   ▼                                                 │
parse_retrieved_jobs ──► extraction pool (4 processes)
   │                                  list[ProcessedJob]  (job + skills)
   ├────────────────────────────► persist skills ────┤
   ├──────────────┐                                  ▼
   ▼              ▼                            Postgres (Neon)
SentenceEmbedder  MarketAnalyzer                jobs · skills · job_skills
   │              │                             searches · observations
   ▼              │
SimilarityEngine  │
   │              │
   ▼              ▼
        JobRadarAnalysis
   { market, ranked_jobs }
```

Persistence is a side branch. It is fail-soft and nothing downstream reads from
it — the database accumulates a historical dataset while the analysis path
behaves exactly as before. See `decisions/persistent-job-storage.md`.

## Response contract

```jsonc
{
  "market": {
    "jobs_analyzed": 20,
    "top_skills":          [{ "skill", "job_count", "frequency" }],
    "skill_gaps":          [ ...same shape... ],
    "user_skill_presence": [ ...same shape... ],
    "skill_coverage": { "covered": 2, "total": 20, "coverage": 0.1 }
  },
  "search": {
    "location": { "country_code": "ke", "country_name": "Kenya", "source": "llm" },
    "scopes": ["local:ke", "remote:global"],
    "widened_below_floor": false, "minimum_jobs_floor": 15,
    "duplicates_removed": 0, "remote_ineligible_removed": 16,
    "jobs_returned": 25, "providers": [ ... ]
  },
  "ranked_jobs": [
    {
      "job": {
        "job":    { "db_id", "title", "company", "description", "location",
                    "salary_min", "salary_max", "salary_currency",
                    "salary_period", "posted_at", "posted_at_utc", ... },
        "skills": ["Python (Programming Language)", ...]
      },
      "overall_score", "title_score", "skills_score",
      "experience_score", "location_score"
    }
  ]
}
```

`db_id` is the `jobs.id` row the posting was stored under, and is what the
dashboard sends when bookmarking. It is `null` when persistence is disabled
or the write failed, since storage is fail-soft.

Note the double nesting on `ranked_jobs[i].job.job` — it falls out of
`SimilarityEngine` wrapping a `ProcessedJob`, which itself wraps a `Job`. The
frontend type mirrors this exactly; see `decisions/` in the frontend repo.

`frequency` is a ratio in 0–1. `coverage` equals `covered / total`.

## Performance shape

One analysis takes roughly **45 seconds warm**. Skill extraction dominates
everything else:

| Stage | Share |
|---|---|
| Skill extraction (spaCy + SkillNer) | ~80% |
| Job provider APIs | ~10% |
| Groq interpretation, embeddings, scoring | <10% |

This is CPU-bound single-process NLP work. It is not GPU-shaped — spaCy's
`en_core_web_lg` runs on CPU, and the only GPU-capable component (MiniLM) costs
about a second.

See `architecture/backend.md` for module detail and `decisions/` for why each
component works the way it does.

## Operational notes

- `job_radar_agent` is a module-level singleton, so models load once at import.
  Under `uvicorn --reload` that cost is paid again on every file save.
- The extraction process pool is created lazily on first analysis and adds
  roughly 22s to that first run only.
- `/analyze` is serialised behind an `asyncio.Lock`; concurrent uploads queue.
- `GET /health` is a cheap liveness probe the dashboard polls.
