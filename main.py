from fastapi import FastAPI, File, UploadFile
from pdf_inspector import pdf_inspector
import tempfile
import os
from src.Agent.Framework.JobRadarAgent import job_radar_agent
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()



app.add_middleware(

    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    contents = await file.read()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp:

        temp.write(contents)

        temp_path = temp.name

    try:

        cv_text = pdf_inspector.extract_text(temp_path)

        result = job_radar_agent.run(cv_text)

        return result

    finally:

        os.remove(temp_path)