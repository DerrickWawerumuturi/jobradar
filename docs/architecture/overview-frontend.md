# System overview

JobRadar answers one question: *where does this CV stand in the current job
market, and what should be learned next?*

It is two repositories:

| Part | Repo | Role |
|---|---|---|
| Dashboard | this repo (Next.js) | Presents the intelligence |
| API | JobRadar API (FastAPI) | Produces the intelligence |

The split is deliberate and load-bearing: **all analysis happens server-side.**
This app may reshape numbers for display (`0.5555` → `55.6%`) but never
recomputes similarity, frequency or gaps. If a view needs information the API
does not return, the answer is a backend change, not a frontend calculation.

## Flow

```
/  (landing)
   │  user selects a PDF, presses Upload
   ▼
api/api.ts  ──►  POST http://127.0.0.1:8000/analyze     (~45s)
   │
   ▼
JobRadarAnalysis
   │
   ├─► AnalysisProvider state  ──►  localStorage["jobradar"]
   │
   ▼
router.push("/analysis")
   │
   ├── /analysis         overview · coverage
   ├── /analysis/skills  demand · my skills · landscape
   ├── /analysis/gaps    gaps (high / medium)
   └── /analysis/jobs    ranked matches
```

Every analysis route reads the same result from context. Nothing re-fetches.

## The data contract

`src/types/jobradar.ts` is the single source of truth for the API response and
must be updated before any component reads a new field.

```jsonc
{
  "market": {
    "jobs_analyzed": 20,
    "top_skills":          [{ "skill", "job_count", "frequency" }],
    "skill_gaps":          [ ...same shape... ],
    "user_skill_presence": [ ...same shape... ],
    "skill_coverage": { "covered": 2, "total": 20, "coverage": 0.1 }
  },
  "ranked_jobs": [
    {
      "job": {
        "job":    { "title", "company", "location", ... },   // the posting
        "skills": ["Python (Programming Language)", ...]      // its skills
      },
      "overall_score", "title_score", "skills_score",
      "experience_score", "location_score"
    }
  ]
}
```

Two things to internalise:

- **`ranked_jobs[i].job.job`** is the posting — double nesting, not a typo. It
  falls out of the backend wrapping a scored job around a processed job around a
  raw job.
- **Every posting field is nullable.** The backend's `Job` model defaults all of
  them to `None`.

`frequency` is a ratio in 0–1, so it always passes through `toPercent`.
`coverage` equals `covered / total`.

## Timing reality

An analysis takes **roughly 45 seconds** (previously ~5 minutes). This shapes
the UX more than anything else:

- The result is persisted to `localStorage`, so navigation and reloads never
  cost another round trip.
- `BackendStatus` polls `/health` so an unreachable API is visible *before* the
  user spends the wait.
- Analysis is started explicitly by the Upload button, never as a side effect.

## Stack

Next.js 16 App Router · React 19 · TypeScript strict · Tailwind v4 (CSS-first,
no config file) · shadcn built on `@base-ui/react` · Recharts 3 · sonner ·
lucide.

See `architecture/frontend.md` for module detail and `decisions/` for the
reasoning behind each area.
