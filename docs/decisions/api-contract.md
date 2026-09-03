# Decision: the API contract

**File:** `src/types/jobradar.ts`

## Why this file matters more than it looks

It is the only description of the API response anywhere in this repo. There is
no generated client and no schema — the backend's `/analyze` endpoint declares
no response model, so its OpenAPI document describes the request and nothing
else.

That means TypeScript cannot verify this file against reality. It verifies the
*code* against this file. If the file is wrong, everything compiles and fails at
runtime.

## This has already happened

The original type declared:

```ts
interface RankedJob {
  title: string; company: string; location: string | null; ...
  overall_score: number; ...
}
```

The API actually returns:

```jsonc
{
  "job": {
    "job":    { "title": "...", "company": "..." },
    "skills": ["Python (Programming Language)", ...]
  },
  "overall_score": 0.477, ...
}
```

Every `rankedJob.title` read would have compiled cleanly and been `undefined`.
The mismatch was only found by inspecting a real response.

It also cost a feature. The per-job `skills` array was absent from the type, so
"skills you have / skills you're missing" was assumed to need a backend change.
It did not — the data was already being returned and simply undeclared.

## The nesting is real

```
RankedJob
  └─ job            : JobWithSkills
       ├─ job       : JobPosting     ← the posting
       └─ skills    : string[]       ← skills extracted from it
```

`ranked_jobs[i].job.job.title` is correct. It falls out of the backend wrapping
a scored result around a `ProcessedJob` around a `Job`.

## Everything on a posting is nullable

The backend's `Job` pydantic model defaults **every** field to `None` —
including `title`, `company` and `id`. The type reflects that, and components
handle it (`posting.title ?? "Untitled role"`).

`salary` is `number | null`, not a string. It has been null in every observed
response, as has `experience_level`, but both are typed and commented rather
than omitted so the shape stays honest.

`posted_at` is a human string like `"3 days ago"`, not a timestamp. Do not try to
parse it as a date.

## The rule

**Derive this file from observed payloads, never from assumption.** Before
adding a component that reads a new field:

1. Check the field exists in a real response.
2. Add it here first.
3. Then write the component.

Fields observed as always-null get a comment saying so, so the next person knows
the difference between "not returned" and "not yet seen populated".

## Learning note

A type at a system boundary is a claim about someone else's data, and the
compiler cannot check that claim. Boundary types need the same scepticism as
untrusted input — the confidence a green type-check gives you is confidence in
your own consistency, not in the API's behaviour.
