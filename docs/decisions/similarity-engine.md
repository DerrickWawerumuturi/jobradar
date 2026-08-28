# Decision: similarity engine

**File:** `src/Agent/Framework/SimilarityEngine.py`

## What it does

Scores every retrieved job against the parsed CV and returns them sorted by
overall match, descending.

## The model

Four facets are compared independently by cosine similarity, then combined as a
weighted sum:

```python
weights = {
    "title":      0.30,
    "skills":     0.50,
    "experience": 0.10,
    "location":   0.10,
}
```

Each facet is a cosine similarity between the user's embedding and the job's
embedding for that facet. `overall_score` is the weighted sum; all five scores
are returned so the UI can show a breakdown rather than a single opaque number.

## Why weighted cosine rather than keyword overlap

Keyword matching cannot see that "ML Engineer" and "Machine Learning Engineer"
are the same role, or that PyTorch experience is relevant to a TensorFlow
posting. Embedding cosine handles near-synonyms without maintaining a synonym
table.

Skills carry half the weight because they are the most specific signal about
fit. Title is the next strongest but is noisy — seniority words and company
conventions vary. Experience and location are down-weighted because they are the
least reliably populated fields in the provider payloads.

## Why the sub-scores are returned

Returning only `overall_score` would make the ranking unexplainable. Exposing
the four components lets the dashboard show *why* a job ranked where it did,
which is the difference between a recommendation and a black box.

## Known limitation: two facets carry no signal

No provider returns an `experience_level`, so every job embeds the same empty
experience string and `experience_score` is **identical for every job**.
`location_score` is identical whenever all postings share a location, which is
common since the search is country-scoped.

The weights still allocate 20% of the overall score to these two facets. That
does not distort the *ranking* — a constant added to every job cannot reorder
them — but it does compress `overall_score` into a narrow band, because 20% of
every score is the same middling number.

This is why real `overall_score` values land around 0.2–0.5 rather than spanning
0–1, and why a top match displays as roughly "48%" rather than the "92%" a naive
reader expects.

The frontend detects constant sub-scores at runtime and greys them out rather
than presenting them as differentiators.

## If this is revisited

- Populating `experience_level` (parsing it from the description, since
  providers do not supply it) would make that facet real and widen the score
  band.
- Alternatively, renormalise `overall_score` across the returned set so the best
  match anchors near the top of the range. This makes the number readable but
  makes it *relative* to the batch rather than absolute — a deliberate tradeoff,
  not a free improvement.
- Weights are currently uncalibrated. `evals/` exists as the place to justify
  them against labelled data rather than intuition.
