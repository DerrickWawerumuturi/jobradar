# Frontend architecture

Next.js 16 App Router app presenting the JobRadar analysis.

## Layout

```
api/api.ts                       API base URL + Analyze()   (outside src/)
src/
  app/
    layout.tsx                   fonts, dark lock, AnalysisProvider, Toaster
    page.tsx                     landing (Navbar + Hero)
    globals.css                  all design tokens (Tailwind v4 is CSS-first)
    analysis/
      layout.tsx                 masthead, tab nav, route guard
      page.tsx                   overview · coverage
      skills/page.tsx            demand · my skills · landscape
      gaps/page.tsx              gaps
      jobs/page.tsx              matches
  components/
    Navbar.tsx                   landing header
    Hero.tsx                     upload + analysis trigger
    BackendStatus.tsx            API liveness dot
    Market/                      analysis sections
    ui/                          shadcn primitives (@base-ui/react)
  lib/
    analysis-store.tsx           analysis context + persistence
    market.ts                    display transforms
    backend-health.ts            /health polling hook
    utils.ts                     cn()
  types/
    jobradar.ts                  API contract
```

`api/` sits **outside** `src/`, so it is imported by relative path
(`../../api/api`) rather than the `@/` alias.

## State

`AnalysisProvider` (`src/lib/analysis-store.tsx`) wraps the app in the root
layout and is the only place the analysis lives.

```ts
const { analysis, status, hydrated, fileName, save, setStatus, clear } = useAnalysis()
```

- Reads `localStorage["jobradar"]` once on mount, behind a shape guard.
- `hydrated` is false until that read completes. **Route guards must wait for
  it** — acting earlier bounces returning visitors off the analysis on first
  paint.
- `status` is `idle | analyzing | ready | error`.

See `decisions/state-management.md`.

## Routing

Five routes; the four analysis ones share `analysis/layout.tsx`, which renders
the masthead and tab nav and redirects to `/` when `hydrated && !analysis`.

Nested layouts must be typed with Next's generated `LayoutProps<"/analysis">`.
An inline `{ children: React.ReactNode }` fails typed-route validation in
Next 16.

## Dashboard sections

All under `src/components/Market/`. Each answers one question:

| Component | Question |
|---|---|
| `MarketOverview` / `MarketCard` | What was analyzed? |
| `SkillDemandChart` | What does the market ask for? |
| `UserSkillPresence` | How common are my skills? |
| `SkillGapChart` | What am I missing? |
| `SkillCoverage` | How much of the core skillset do I cover? |
| `JobMatches` | Which jobs fit me? |
| `SkillLandscape` | Where do I sit overall? |

`SkillBarChart` is the shared Recharts horizontal bar chart used by the demand
and my-skills sections. `SkillGapChart` deliberately does not use it — its rows
carry a reason as well as a magnitude.

See `decisions/data-visualization.md`.

## Display transforms

`src/lib/market.ts` holds every transform over the API response. Components do
not compute; they call these.

| Function | Purpose |
|---|---|
| `toPercent` / `formatPercent` | Ratio → 0–100 |
| `coveragePercent` | Derives coverage from `covered / total` |
| `byDemand` | Sorts a **copy** descending |
| `significantGaps` | Filters to `GAP_FREQUENCY_THRESHOLD` (20%) |
| `gapPriority` | High (≥40%) vs medium |
| `partitionJobSkills` | Splits a posting's skills into have/missing |
| `isConstantScore` | Detects sub-scores identical across all jobs |
| `skillKey` / `toSkillKeys` | Case-insensitive skill comparison |

Sorting always copies, and is applied even where the backend already sorts, so a
backend change cannot silently reorder a chart.

## Styling

Tailwind v4 with **no config file**. Every token lives in
`src/app/globals.css` inside `@theme inline`, `:root` and `.dark`.

The app is locked to dark via `className="dark"` on `<html>`. A single accent
(`#f5532a`) drives `--primary` and the `--chart-*` ramp, so all five charts
repaint from one token change. Charts read colour via `var(--chart-3)` rather
than literals — never hard-code a colour in a chart.

Fonts: Space Grotesk (display/body, `font-space`) and JetBrains Mono
(`font-mono`, used for every number, axis tick and small-caps label).

See `decisions/design-system.md`.

## UI primitives

`src/components/ui/` is shadcn built on **`@base-ui/react`, not Radix**:

- Composition uses a `render` prop, not `asChild`.
- Parts are `Backdrop` / `Popup`, not `Overlay` / `Content`.
- State variants are `data-open:` / `data-closed:`.

Add components with `npx shadcn@latest add <name>` and merge by hand; several
have local edits.

## Backend connection

`api/api.ts` exports `API_BASE_URL` (`http://127.0.0.1:8000`) and `Analyze()`,
which POSTs the PDF as multipart `FormData`. The URL is hardcoded, not
env-driven.

`src/lib/backend-health.ts` polls `GET /health` every 15s with a 4s timeout and
re-checks on window focus. `BackendStatus` renders it in the landing navbar and
analysis masthead.

## Commands

```bash
npm run dev     # http://localhost:3000
npm run build   # production build; also the only type-check gate
npx tsc --noEmit
```

There is no test runner and no lint config.

## Known limitations

- No UI has been visually verified; all work to date is compiler-verified only.
- `experience_score` and `location_score` are constant across jobs, because no
  posting carries an `experience_level`. `JobMatches` detects and discloses this
  at runtime.
- `overall_score` compresses into roughly 0.2–0.5, so a strong match displays
  near 48% rather than 90%.
- The API base URL is hardcoded and would need an env var to deploy.
