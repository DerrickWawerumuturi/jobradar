# Decision: market analyzer

**File:** `src/Agent/Framework/SimilarityEngine.py` (`MarketAnalyzer`)

## What it does

Aggregates skills across all retrieved jobs to describe the market, and compares
that market against the user's own skills.

Produces four things:

| Output | Meaning |
|---|---|
| `top_skills` | Most requested skills, `top_k=20` |
| `skill_gaps` | Every market skill the user lacks, ranked |
| `user_skill_presence` | The user's skills that appear in this market |
| `skill_coverage` | `covered / total` against the top 20 |

## Counting rule: once per job

`calculate_skill_frequency` builds a **set** of skills per job before counting:

```python
unique_skills = {skill.strip().lower(): skill.strip() for skill in job.skills ...}
```

A posting that says "Python" nine times counts once. Without this, verbose
postings would dominate the frequency table purely by being long-winded.

`frequency` is `job_count / total_jobs`, a ratio in 0–1.

## Case-insensitive matching, canonical display

Counting keys on the lowercased skill, but the **canonical spelling is preserved
for display** via a first-seen `display_names` map. This is why the API returns
`React.js` rather than `react.js`.

The three membership tests (`get_skill_gaps`, `get_user_skill_market_presence`,
`calculate_skill_coverage`) all compare `skill["skill"].lower()` against a
lowercased user set, so casing can never cause a false gap.

## The vocabulary problem

This is the subtlest thing in the module and the source of a real bug.

CV skills arrive from the LLM as free text (`react`, `aws`). Job skills arrive
from SkillNer as canonical EMSI names (`React.js`, `Amazon Web Services`). The
comparisons here are exact string matching. Matching across two independently
produced label sets **fails silently** — it does not error, it just reports the
user has nothing in common with the market.

The fix lives upstream: `JobRadarAgent` runs CV skills through
`skill_extractor.normalize()` so both sides share one vocabulary before
`analyze()` is called. `MarketAnalyzer` assumes this has happened.

This bug predated canonical names (`aws` never matched `amazon web service`
either) but adopting canonical names would have made it far worse, so both
changes had to land together.

## The denominator bug

Extraction failures used to be swallowed into an empty skill set. Those postings
still counted toward `jobs_analyzed`, so a job contributing zero skills inflated
the denominator of every frequency. With three failures in twenty-two postings,
every percentage in the market analysis was understated by roughly 14%.

Postings whose extraction fails are now dropped before reaching this module.

Postings that extract *successfully* but yield no skills are still counted, and
that is intentional — they are real postings that genuinely mention no
recognisable skill.

## `top_k = 20`

`get_top_skills` and `calculate_skill_coverage` both default to 20. Coverage is
therefore "how many of the market's twenty most requested skills do you have",
which is why `skill_coverage.total` is always 20.

The number is arbitrary but must stay consistent between the two, or coverage
would be measured against a different set than the one displayed.

## `skill_gaps` is unbounded

`get_skill_gaps` returns *every* market skill the user lacks — commonly 200–300
entries, trailing off to skills seen in a single posting. It is a complete
ranked list, not a shortlist, and consumers are expected to threshold it.

The dashboard cuts at 20% frequency. Deciding that threshold is a product
judgment, which is why it lives in the consumer rather than here.
