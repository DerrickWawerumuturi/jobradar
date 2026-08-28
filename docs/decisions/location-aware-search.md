# Decision: location-aware search

**Files:** `src/Agent/utils/location.py`, `src/Agent/Framework/SearchEngine.py`,
`src/Agent/utils/prompts.py`, `src/Agent/utils/types.py`

## The problem was ours, not the providers'

JobRadar searched three hardcoded countries — `us`, `gb`, `ca`. A user in
Nairobi got the American job market.

The obvious reading is that the providers only cover those markets. They do not:

- **JSearch** documents `ke`, `ng`, `gh`, `za`, `eg` and 40+ other codes.
- **The Muse** takes a `location` parameter in `"Nairobi, Kenya"` form.

The actual cause was that `query.location` — which the LLM had been extracting
correctly all along — never reached the search. It went to `embedder.py` to be
scored against job locations, and nowhere else. The location influenced
*ranking* and not *retrieval*, so JobRadar was ranking American jobs by how well
they matched a Kenyan address.

## Measured provider behaviour

Everything below was measured against the live APIs, because each one changed a
design decision.

| Finding | Consequence |
|---|---|
| `query="… in ke"` → **1 job**; `"… in Kenya"` → **10** | The ISO code belongs in `country`, never in the query text |
| `query="… in gb"` → **0 jobs** | The old `us/gb/ca` loop put the code in the text, so the gb leg had been returning nothing |
| Muse `location="Nairobi, Kenya"` still returns Dallas and New York | The filter narrows the corpus without restricting it; returned locations must be checked |
| Muse `category="machine learning engineer"` → **total=0**; `"Software Engineering"` → **100,852** | Only a real taxonomy value may be sent |
| RemoteOK `tags="machine learning engineer"` → **0**; `"machine learning"` → **24** | It matches one tag, not a job title |
| Remotive: only **8 of 17** remote postings open to Africa/worldwide | "Remote" is not "remote from Kenya" |

## Resolving a location the LLM produced

The model is asked for `country_code` (ISO 3166-1 alpha-2) and `city` directly,
because mapping "Nairobi" to a country needs world knowledge a local table does
not have. Everything it returns is then verified.

**Checking the code against the ISO list is not sufficient.** The first version
did exactly that and accepted `country_code="kn"` for `location="Nairobi,
Kenya"` — `kn` is Saint Kitts and Nevis, a perfectly valid code. A hallucinated
code is almost always a *valid code for the wrong country*, so format validation
cannot catch it.

The check that works is corroboration: the free-text `location` is parsed for a
country name independently, and when the two disagree the text wins and a
warning is recorded.

```
country_code 'kn' (Saint Kitts and Nevis) contradicts location 'Nairobi, Kenya';
using 'ke' (Kenya)
```

`ResolvedLocation.source` labels the outcome — `llm`, `corrected`, `recovered`
or `none` — so a confirmed location is distinguishable from a guess downstream.

**Known limit:** when the CV says only "Nairobi" and the model returns `kn`,
there is nothing to corroborate against and the wrong country survives. Catching
that needs a city→country dataset, which has not been added.

## Two legs, not one

```
local:ke        what Kenya advertises
remote:global   what the world advertises that can be done from Kenya
```

Someone outside the big markets has two markets, not one, and the remote half is
usually the larger. Searching only the local one hides most of their
opportunities; searching only the global one is what the hardcoded country list
effectively did.

Providers declare which legs they can serve. Remotive and RemoteOK are
remote-only, so asking them for jobs in Nairobi is a wasted request; Jooble is
local-only. Every leg for every capable provider runs concurrently.

## Remote does not mean remote-from-here

Remotive publishes `candidate_required_location`, and only 8 of 17 postings were
open to Africa or worldwide. A remote job restricted to the USA is not an
opportunity for a user in Nairobi, and presenting it as one repeats the original
failure in a subtler form.

`remote_eligibility()` returns three values, and the third is the important one:

| Value | Meaning | Action |
|---|---|---|
| `True` | open, or names the user's country/region | keep |
| `False` | names places, none of them the user's | drop |
| `None` | says nothing about eligibility | keep |

The first implementation collapsed `None` into `False` and **discarded every
RemoteOK posting**, because that board usually leaves the field blank and the
fallback string was `"Remote"` — an arrangement, not an eligibility list.
"Unknown" and "excluded" are different answers.

## The minimum-jobs floor

`MarketAnalyzer` computes `frequency = job_count / total_jobs`. At eight
postings every skill is a multiple of 12.5%, and `skill_coverage` is measured
against a "top 20" containing six entries. The dashboard renders those as
confident percentages.

Below `MIN_JOBS_FLOOR = 15` the search widens to the large markets, each labelled
`fallback:*` so the addition is visible rather than silent.

**The floor is measured after dedup and eligibility filtering**, which was not
true of the first version. 17 postings cleared a floor of 15, then reduced to 8
once the US-only remote jobs were dropped — under the floor, with nothing
widened. The check has to run on the count that reaches the analysis.

## Deduplication

Legs overlap: the same posting arrives from both the local and remote passes.
`MarketAnalyzer` counts skills once per job, so a duplicate does not merely
repeat in the list — it inflates every skill that posting mentions. The engine
now dedupes on `(provider, external_id)` before returning.

This was already latent with the three-country loop and is unavoidable with
overlapping scopes.

## Providers

| Provider | Legs | Key | Note |
|---|---|---|---|
| JSearch | local, remote, fallback | required | Widest reach; monthly quota on the free plan |
| The Muse | local, remote, fallback | required | Location filter is advisory; results are re-checked |
| Remotive | remote | none | Publishes candidate eligibility |
| RemoteOK | remote | none | Single-tag matching |
| Jooble | local, fallback | free key | 60+ countries; **not yet enabled** |

Jooble is implemented but disabled until `JOOBLE_API_KEY` is set. It is the only
provider here with real inventory outside the large markets, so local coverage
for Kenya effectively depends on it. Its `snippet` is a truncated description
rather than the full posting — the exact reason Adzuna was removed from this
project — so measure what skill extraction gets out of it before weighting it
equally.

Adzuna stays out: it truncates to 500 characters, and its country list excludes
Kenya anyway.

## Reporting what was searched

`/analyze` gained a `search` block: resolved location and how it was resolved,
which legs ran, whether the floor triggered a widening, how many postings were
dropped as duplicates or ineligible, and each provider's status.

A six-job analysis and a forty-job one are indistinguishable otherwise, and the
frequencies in `market` mean very different things in each.

## Open issue: Remotive returns its whole inventory

Measured: `search=`, `category=` and no parameters all return the same 17
postings, including "Patient Care Specialist" for a machine-learning query. Its
filters appear inert.

Those postings are counted equally by `MarketAnalyzer`, so a marketing job's
skills contribute to an ML engineer's "market demand". `SimilarityEngine` will
rank them low, but market statistics do not use the ranking.

No relevance filter has been added — deciding what counts as relevant changes
what "the market" means, which is a product decision rather than a bug fix.
