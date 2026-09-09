FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .

# CPU-only PyTorch
RUN pip install --no-cache-dir \
    torch \
    --index-url https://download.pytorch.org/whl/cpu

# Remaining application dependencies
RUN pip install --no-cache-dir -r requirements.txt

# spaCy model. Installed from the wheel rather than COPYied from the build
# context: the unpacked model is ~424 MiB and its vocab/vectors file alone is
# 392 MiB, over GitHub's 100 MB per-file limit, so it is not in the repository
# and a fresh clone has nothing to copy.
#
# `skill_extractor._load_spacy` resolves it by package name once no path
# candidate matches. Build-time network is fine here; it is the *boot* path
# that must not touch the network (see docs/decisions/deployment.md).
RUN pip install --no-cache-dir \
    https://github.com/explosion/spacy-models/releases/download/en_core_web_lg-3.8.0/en_core_web_lg-3.8.0-py3-none-any.whl

# Bake MiniLM into the image. embedder.py:34 builds SentenceTransformer at import
# time, so with no cached copy every scale-from-zero downloaded it from the HF Hub
# inside the startup window, before uvicorn could bind the port.
ENV HF_HOME=/opt/hf
ENV HF_HUB_OFFLINE=1
RUN HF_HUB_OFFLINE=0 python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

# skillNer/general_params.py reads these two relative to the working directory and
# silently falls back to fetching them from raw.githubusercontent.com when they are
# absent. That fallback parses the response with an unguarded response.json(), so a
# 404 or a proxy interstitial raises inside a module-level import and kills uvicorn
# before it binds. Baking them in removes the boot-time network dependency.
COPY skill_db_relax_20.json token_dist.json ./

COPY main.py .
COPY src ./src

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]