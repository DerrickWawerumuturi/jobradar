from fastapi import FastAPI, File, UploadFile
from fastapi.concurrency import run_in_threadpool
from pdf_inspector import pdf_inspector
import asyncio
import tempfile
import os
from src.Agent.Framework.JobRadarAgent import job_radar_agent
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# One analysis at a time. The work is moved off the event loop so the server
# stays responsive, but spaCy/SkillNer pipelines are shared mutable objects and
# are not safe to run concurrently, so requests queue rather than overlap.
analysis_lock = asyncio.Lock()



# The browser calls this container directly — a Next.js proxy is not an option,
# because an analysis takes far longer than a serverless function is allowed to
# run. That makes CORS load-bearing: an origin missing from here is refused at
# the preflight with a 400 and the frontend cannot talk to the API at all.
#
# Set ALLOWED_ORIGINS as a comma-separated list on the container app, e.g.
#   ALLOWED_ORIGINS=https://jobradar-frontend-pearl.vercel.app/,http://localhost:3000

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

# Vercel gives every preview deployment its own hostname, so they cannot be
# enumerated. Set ALLOWED_ORIGIN_REGEX to admit them, e.g.
#   ALLOWED_ORIGIN_REGEX=https://.*\.vercel\.app
ALLOWED_ORIGIN_REGEX = os.getenv("ALLOWED_ORIGIN_REGEX") or None

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/health")
async def health():
    """Cheap liveness probe so the frontend can show whether the API is up."""
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    contents = await file.read()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp:

        temp.write(contents)

        temp_path = temp.name

    try:
        # Both of these are synchronous and slow — PDF parsing, then several
        # minutes of scraping, embedding and scoring. Running them directly in
        # this async endpoint blocked the event loop, which made the whole API
        # (including /health) unreachable for the duration of every analysis.
        async with analysis_lock:
            cv_text = await run_in_threadpool(pdf_inspector.extract_text, temp_path)

            result = await run_in_threadpool(job_radar_agent.run, cv_text)

        return result

    finally:

        os.remove(temp_path)