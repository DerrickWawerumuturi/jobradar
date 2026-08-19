# JobRadar — Design Doc (Day 3 deliverable)
Fill this in yourself. It signals engineering judgment; the prompts are not the answer.

## Problem
_One paragraph: what JobRadar does and why it's useful to you specifically._

## Data flow
_Source -> ingest -> chunk -> embed -> pgvector -> retrieve -> LLM -> answer/gap.
Draw the arrows. Where does dedupe happen? Where do citations attach?_

## Components
- Storage: Supabase Postgres + pgvector. Chunk size? Embedding dim?
- LLM: Anthropic. Which model for answers vs. extraction?
- Retrieval: cosine? k=? rerank?
- API: FastAPI endpoints listed.

## What "good" looks like (define BEFORE building evals)
- Retrieval: right posting in top-k for X% of eval questions.
- Answer: correct + every claim cited.
- Skill-gap: gaps are real and each cites a demanding role.

## Trade-offs / open questions
_Where did you cut a corner and why?_
