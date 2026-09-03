from typing import Annotated

from fastapi import FastAPI, File, HTTPException, UploadFile,Depends
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pdf_inspector import pdf_inspector
import asyncio
import tempfile
import os
import sys

from src.database.services.ingestion import user_ingestion
from src.cv.current_user import current_user
from src.Agent.utils.types import CVQuery
from src.cv.dashboard import dashboard
from src.Agent.Framework.JobRadarAgent import job_radar_agent


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
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

    except Exception as err:
        # HTTPException goes through the middleware stack, so the error
        # response keeps its CORS headers instead of surfacing in the
        # browser as an opaque "Failed to fetch".
        raise HTTPException(status_code=500, detail=f"Analysis failed: {err}") from err
    finally:

        os.remove(temp_path)
@app.post("/cv/parse")
async def parse_cv(file: UploadFile = File(...)):
    contents = await file.read()
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp:
        temp.write(contents)
        temp_path = temp.name

    try:
        cv_text = await run_in_threadpool(pdf_inspector.extract_text, temp_path)
        result = await run_in_threadpool(dashboard.parse, cv_text)

        return result

    except Exception as err:
        raise HTTPException(status_code=500, detail=f"CV parsing failed: {err}") from err
    finally:
        os.remove(temp_path)

@app.put("/cv")
async def store_cv(cv: CVQuery, user = Depends(current_user)):
    try:
        await run_in_threadpool(user_ingestion.store, user, cv.model_dump())
    except Exception as err:
        raise  HTTPException(status_code=500, detail=f"Error storing your cv: {err}") from err

@app.get("/cv")
async def get_cv(user = Depends(current_user)):
    try:
        data = await run_in_threadpool(user_ingestion.fetch, user)
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Error fetching your cv: {err}") from err
    
    if data is None:
        raise HTTPException(status_code=404, detail="No Cv saved yet")
    return data
