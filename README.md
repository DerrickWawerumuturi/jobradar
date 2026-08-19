# JobRadar
Job-hunt intelligence agent. Ingests ML/AI postings, embeds them into pgvector,
answers questions with citations, and runs skill-gap analysis against your profile.

Status: scaffold. Every file in src/ is a stub with TODOs — the logic is yours to write.

## Run (once built)
    python -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    cp .env.example .env   # fill in
    python -m src.ingest   # Day 4
    uvicorn src.api:app --reload  # Day 8

See design.md for the plan.
