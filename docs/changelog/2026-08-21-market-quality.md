# 2026-08-21 — market analysis quality

`MARKET SKILL DEMAND` reported **CAN-SPAM Act at 36.7%** as the top skill for a
software-engineer CV, followed by National Airspace System and DO-178B/C.

Two unrelated causes, only one of them a bug.

---

### File
`src/Agent/utils/skill_extractor.py`

### What changed

Added job-board furniture to `BOILERPLATE_MARKERS`.

### Why

"CAN-SPAM Act" was never in a job requirement. RemoteOK appends an anti-spam
notice to **every** posting it serves:

> Please mention the word **FELICITY** and tag RNDEuOTAu… when applying to show
> you read the job post completely. This is a beta feature to avoid **spam**
> applicants.

SkillNer read "spam" and matched the EMSI entry for CAN-SPAM Act. It appeared in
25 of 67 postings — every RemoteOK result — which is exactly why it topped the
chart.

### Before → After

```
postings containing "spam"   30/67  →  2/67
prepared characters          509k   →  111k  (78% cut)
```

### Learning notes

Boilerplate filtering is per-provider, not universal. The original markers were
written against JSearch's legal and benefits text; a new provider arrived with
its own furniture and the filter had nothing to say about it. Every provider
added is a new source of non-employer text.

---

### File
`src/Agent/utils/embedder.py`, `src/Agent/Framework/JobRadarAgent.py`

### What changed

`filter_by_role` drops postings outside the user's role before skill extraction.
`/analyze` reports `off_market_removed` and `jobs_analyzed`.

### Why

"National Airspace System" and "DO-178B/C" are the opposite failure: *correctly*
extracted skills from *genuine* avionics postings that had nothing to do with
the CV. `MarketAnalyzer` weights every posting equally, so a copywriter vacancy
in the corpus does not merely clutter the ranked list — its skills become market
demand.

Measured: 22 of 67 postings had non-technical titles. Remotive was the main
source — only **5 of 17** technical — because its `search` and `category`
parameters are inert and it returns its whole inventory regardless of query.

### How it works

Cosine of the user's **role + secondary roles + skills** against each **job
title**, keeping postings scoring at least `alpha × best_score`
(`JOBRADAR_RELEVANCE_ALPHA`, default 0.30).

Runs after persistence — an off-market posting is still a real observation of
the market and belongs in the dataset — and before extraction, so discarded
postings cost nothing.

### Design decisions

**Role + skills, compared against the title only.** Three formulations were
measured against a real corpus:

| Formulation | Best F1 |
|---|---|
| role vs title | 0.90 |
| **role + skills vs title** | **0.93** |
| role vs title + description | 0.87 |
| role + skills vs title + description | 0.84 |

Adding the description makes it *worse*. Postings share so much generic
corporate prose that including it pulls everything toward the mean.

**A relative threshold, not an absolute one.** An absolute cut does not survive
a change of query. Tuned to 0.21 on a software-engineer profile it was correct;
applied unchanged to a machine-learning profile it discarded genuine "Senior
Software Engineer" (0.113) and "Senior Software Engineer Golang" (0.100)
postings, because the profile string changes the scale of every cosine in the
batch. Scoring relative to the best match in the same batch self-calibrates.

**The filter cannot breach the minimum-jobs floor.** It takes `min_keep` and
tops back up from the best remaining, so it cannot undo the widening the search
just performed.

### Before → After

```
67 fetched -> 46 analyzed (21 off-market)

dropped:  Quality Control · Face Deduplication Collection · Freelance
          Copywriter · Sales Jedi · TEST JOB · Head of Marketing

top skills:  CAN-SPAM Act 36.7%      ->  Infrastructure 23.9%
             Infrastructure 20.4%    ->  Collaboration 17.4%
             DO-178B/C 12.2%         ->  Kubernetes 13.0%
             National Airspace 8.2%  ->  React.js / Python 8.7%
```

### Learning notes

A threshold tuned on one query is a constant fitted to one sample. It looked
like a hyperparameter and behaved like an overfit.

---

---

### File
`src/Agent/utils/skill_extractor.py`

### What changed

`MAX_EXTRACTION_CHARS` (default 4000, `JOBRADAR_MAX_EXTRACTION_CHARS`) caps what
one posting may send to the annotator. `_truncate` backs up to the nearest
paragraph, line or sentence break.

### Why

Extraction had returned to ~7 minutes. The cost is **not** linear in characters —
SkillNer's n-gram scorer compares candidate spans pairwise via
`token.similarity()`, so the longest postings dominate out of all proportion.

The length distribution over a real corpus is extremely skewed:

```
45 postings, 84,947 chars
p50 = 1,104    p75 = 1,617    p90 = 2,181    max = 28,919
```

**Three postings out of 45 carried 31% of all the text.** They are also the ones
where `_focus_on_requirements` found no requirements section and fell back to
keeping the whole posting — so the expensive tail was precisely the text least
likely to be worth annotating.

### Before → After

```
extraction, 45 postings   434.0s  ->  53.4s     (8.1x)
postings truncated                    3 of 45
```

Top skills are materially unchanged, which is the point — the cap removed cost,
not signal:

```
Infrastructure  23.9% -> 24.4%     Kubernetes  13.0% -> 13.3%
Collaboration   17.4% -> 15.6%     Gitlab       8.7% ->  8.9%
Reliability     13.0% -> 13.3%     Python       8.7% ->  8.9%
```

### Design decisions

Truncation happens after boilerplate stripping and section focusing, so the cap
only binds when those have already failed. It backs up to a clean break rather
than cutting mid-sentence, since a severed span would still be annotated.

### Learning notes

When cost is superlinear, the distribution matters more than the total. Trimming
84,947 characters evenly across 45 postings would have saved far less than
truncating three of them — and a linear mental model hides that entirely.

## Still open

Replacing SkillNer's n-gram scorer with a direct `PhraseMatcher` over `SKILL_DB`
surface forms — recorded as a follow-up on 2026-08-19 — remains the real fix.
The cap bounds the tail; the scorer is still the reason the middle costs what it
does. It changes recall, so it needs its own evaluation.

## Correction

An earlier `BrokenProcessPool` in this session was misattributed to worker
memory. It was an artefact of running the test through a heredoc: spawn-based
multiprocessing re-imports the main module and there is no file for `<stdin>`.
Running the same code from a real file with an `if __name__ == "__main__"` guard
does not reproduce it.

The retry added to `extraction_pool.py` is still worth keeping — the pool is a
module-level singleton, so without it one genuinely broken pool would fail every
later analysis in the process until restart — but it was not fixing the failure
observed here.
