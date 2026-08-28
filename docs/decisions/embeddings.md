# Decision: embeddings

**File:** `src/Agent/utils/embedder.py`

## Model

`sentence-transformers/all-MiniLM-L6-v2` — 6 layers, 384-dimensional output.

Chosen for cost rather than accuracy ceiling. It loads in ~6 seconds, encodes
the whole workload in ~1.2 seconds, and runs acceptably on CPU. A larger model
(e.g. `all-mpnet-base-v2`) would improve semantic resolution but multiply a
stage that is currently under 0.5% of total runtime — the wrong place to spend.

## What gets embedded

Four facets, once for the user and once per job, matching the four facets
`SimilarityEngine` scores:

| Facet | User source | Job source |
|---|---|---|
| title | `query.primary_role` | `job.title` |
| skills | `query.skills` | `" ".join(job.skills)` |
| experience | `query.experience_level` | `job.experience_level or ""` |
| location | `query.location or ""` | `job.location or ""` |

Jobs are encoded in batches (one `encode` call per facet across all jobs) rather
than per job, which is why this stage stays cheap as job count grows.

## Why skills are joined into one string

Job skills are joined with spaces and embedded as a single sentence rather than
embedded individually and pooled. This keeps one vector per job per facet, so
`cos_sim` produces a clean `1 × n` matrix and the scoring code stays simple.

The tradeoff is real: a long skill list dilutes any individual skill's
contribution to the vector. A posting listing 60 skills produces a vaguer
embedding than one listing 8. Per-skill embeddings with max-pooling against the
user's skills would be more precise and more expensive; it has not been needed
because the skills facet is already the strongest signal in the ranking.

## Empty strings are embedded, not skipped

`experience` and `location` fall back to `""` when absent. MiniLM returns a
valid vector for an empty string, so cosine similarity is defined — and because
every job supplies the same empty experience value, every job receives the same
`experience_score`.

This is deliberate rather than accidental: the alternative was excluding facets
per job, which would make scores non-comparable across jobs. Keeping the facet
constant is the honest degenerate case, and downstream consumers detect and
disclose it.

See `decisions/similarity-engine.md` for what this does to the score band.

## Hardware

This stage does not benefit from a GPU in practice. Metal is available on Apple
Silicon and MiniLM could use it, but the stage costs ~1.2 seconds against an
extraction stage costing ~35. Moving embeddings to a GPU would optimise 3% of
the runtime.

## Failure behaviour

`get_embeddings` wraps everything and re-raises as `RuntimeError`. There is no
partial-success path: if embedding fails the analysis cannot be scored, so
failing loudly is correct.
