# Decision: state management

**File:** `src/lib/analysis-store.tsx`

## The constraint

An analysis takes ~45 seconds and produces one object every route needs. Losing
it costs the user another 45 seconds. That single fact drives every decision
here.

## Why context rather than a store library

There is exactly one piece of shared state — `JobRadarAnalysis` plus its upload
status. React context covers it with no dependency. Redux, Zustand or Jotai
would all be reasonable if this grew, but adding one now would be ceremony
around a single value.

The analysis previously lived in `Hero`'s `useState`, which was fine while the
analysis was one page inside `Hero`. It stopped being fine the moment the
analysis became four routes: navigating destroyed the result.

**Route splitting was a state problem before it was a routing problem.** The
routes were trivial; lifting state so they could share it was the work.

## Why localStorage

Persistence across reloads, and only that. It is not a cache in front of the
API — there is no revalidation and no TTL. Reloading the tab should not cost 45
seconds; that is the entire goal.

Two keys: `jobradar` for the analysis, `jobradar:file` for the CV filename shown
in the masthead.

## `hydrated` is the important part

```ts
const { analysis, hydrated } = useAnalysis()
if (hydrated && !analysis) router.replace("/")
```

localStorage can only be read in an effect, so on first render `analysis` is
`null` **whether or not a result exists**. A guard that treats `null` as "no
analysis" redirects every returning visitor away from the analysis before their
data loads.

`hydrated` distinguishes *"not yet known"* from *"known to be empty"*. Any route
guard, and anything else that acts on absence, must wait for it.

This generalises: state restored from async storage needs three states, not two.

## The shape guard

```ts
function isAnalysis(value: unknown): value is JobRadarAnalysis {
  return Boolean(candidate?.market?.skill_coverage && Array.isArray(candidate.ranked_jobs))
}
```

Cached data outlives code. A response stored before an API shape change will
deserialise into an object the current components cannot render, and the crash
happens on mount with no obvious cause — the user simply sees a broken page
after an update.

Anything failing the guard is deleted rather than kept. A `try/catch` around
`JSON.parse` covers corruption; the guard covers staleness. The original code
had neither.

## Writes cannot lose the result

```ts
try { localStorage.setItem(...) } catch (e) { console.error(...) }
```

`setItem` throws on quota exhaustion and in some private-browsing modes. The
in-memory state is set *before* the write, so a storage failure costs
persistence but never the analysis the user just waited for.

## Analysis is triggered explicitly

Previously an effect watched `cv && !open && uploadStatus === 'idle'`, meaning
*closing the upload dialog* started a multi-minute request. Dismissing the
dialog fired work the user had not asked for.

`Hero` now calls the API from the Upload button and routes to `/analysis` on
success. User-initiated work should be called from the interaction that intends
it, not inferred from a combination of state.

## Learning note

Effects that trigger side effects from incidental state combinations are hard to
reason about and easy to fire unintentionally. The question to ask of any effect
that starts work is: *what set of states makes this run, and did the user mean
all of them?*
