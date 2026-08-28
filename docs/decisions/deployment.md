# Decision: deployment

**Files:** `Dockerfile`, `.dockerignore`

Deployed as a single container to **Azure Container Apps** — app
`jobradar-backend`, resource group `jobradar-rg`, region `southafricanorth`,
Consumption workload profile, image from `jobradarregistry.azurecr.io/jobradar`.

The ACA configuration lives in the portal, not in this repository. Nothing here
declares it, which is why the sizing fault in
`docs/changelog/2026-08-25-container-oom.md` was invisible to code review.

## Sizing: 2 vCPU / 4 GiB

Driven by memory, not by CPU. `main.py:7` triggers the module-level singleton at
`JobRadarAgent.py:92`, and **uvicorn does not bind its port until that import
returns**. Resident in the main process before the first request:

| | Approx. RSS |
|---|---|
| `en_core_web_lg` vectors (`skill_extractor.py:10`, module scope) | 392 MiB |
| skillNer `SKILL_DB` (31,278 entries) + `PhraseMatcher` over all of it | several hundred MB |
| torch + MiniLM (`embedder.py:34`) | ~400 MB |

Each extraction worker then forks and builds its own `SkillExtractor`. At 1 GiB
the container never survived the import; see the changelog for the evidence.

Measured in the container (`docker stats`, `--memory=4g`, 2 workers):

```
after import, before any request   1.18 GiB     <- exceeded the old 1 GiB limit on its own
peak during pool extraction        3.25 GiB     <- 81% of 4 GiB
```

Those two numbers are the whole sizing argument. The first is why the container
could not boot at 1 GiB. The second is why the worker count has to be pinned:
at the default of 4 workers the same peak does not fit in 4 GiB either.

Consumption locks CPU and memory to a fixed ratio (0.5→1Gi, 1→2Gi, 1.5→3Gi,
2→4Gi), so memory cannot be bought without CPU. The 2 vCPU is wanted anyway —
extraction is ~80% of runtime and superlinear in posting length.

## Scale to zero, capped at one replica

`minReplicas: 0`, `maxReplicas: 1`.

Scale-to-zero because this is a low-traffic service and Consumption bills per
vCPU-second and GiB-second only while a replica runs; the monthly free grant
(180,000 vCPU-s / 360,000 GiB-s per subscription) covers roughly 25 hours of
active runtime at this size.

`maxReplicas: 1` is a spend guardrail. It costs almost nothing in throughput —
`/analyze` is already serialised behind `analysis_lock` (`main.py:44-56`), so a
second replica only helps genuinely concurrent users — while an uncapped fan-out
to 10 replicas of 2 vCPU could exhaust the grant in a few hours.

The cost of scale-to-zero is that every cold request pays the full model load
(~43s measured). That is why the probes below matter, and why nothing in the
boot path may touch the network.

## Probes: startup and readiness, no liveness

```yaml
- type: Startup       # TCP 8000, period 5s, failureThreshold 60  → 300s grace
- type: Readiness     # GET /health, period 10s, failureThreshold 3
```

The default ACA probe targets `/`, and there is **no `/` route** — only `/health`
(`main.py:30`) and `/analyze`. A replica coming up from zero therefore never
became routable, and the request held during scale-from-zero died at the fixed
240s ingress timeout while the revision itself reported `Healthy`.

The startup probe is TCP rather than HTTP on purpose: the port binding *is* the
signal that the import finished, and it needs no route to exist yet.

**No liveness probe, deliberately.** `/analyze` holds `analysis_lock` and
saturates the extraction pool for minutes at a time. A liveness probe that timed
out under that load would kill the container in the middle of an analysis, which
is a worse failure than the one it would be guarding against.

## Nothing in the boot path may touch the network

Two dependencies download themselves at import unless baked in, both inside the
startup window and both on the critical path of every scale-from-zero:

- **MiniLM** — `embedder.py:34` constructs `SentenceTransformer` at import. The
  image now pre-fetches it and pins `HF_HOME=/opt/hf` with `HF_HUB_OFFLINE=1`.
- **skillNer's databases** — `skillNer/general_params.py:32-49` opens
  `skill_db_relax_20.json` **relative to the working directory** and, failing
  that, fetches it from `raw.githubusercontent.com` and writes 7.4 MB back into
  `/app`. The remote path parses the response with an unguarded `response.json()`
  (`remote_db.py:81`), so any 404 or proxy interstitial raises inside a
  module-level import and kills uvicorn before it binds. Both JSON files are now
  copied to `/app`.

This is the classic works-locally-fails-in-the-container shape: a development
checkout already has those files at the repository root from an earlier run, so
the `try` branch succeeds instantly and the remote fallback is never exercised.

## The 240s ingress limit is a real constraint

Consumption enforces a **fixed, non-configurable 240-second request timeout**;
raising it requires Premium Ingress. `docs/architecture/backend.md` records 46
postings taking 434s. A large `/analyze` will therefore exceed the timeout and
return 504 from a container that is perfectly healthy.

The durable fix is to make `/analyze` asynchronous — POST returns a job id and
the frontend polls — which also removes the cold start from the request path
entirely. That is a cross-repo change: the response contract, including the
double nesting at `ranked_jobs[i].job.job`, is mirrored verbatim by the frontend.

Until then, `JOBRADAR_MAX_EXTRACTION_CHARS` is the cheapest lever, since
extraction cost grows faster than character count.

## The spaCy model is not in the repository

`en_core_web_lg` unpacks to ~424 MiB, and its `vocab/vectors` file alone is
392 MiB — over GitHub's **100 MB per-file hard limit**, so a push carrying it is
rejected outright regardless of how long it is given. It is gitignored and the
image installs it from the spacy-models wheel at build time instead.

That is a *build-time* network dependency, which is fine; the rule that matters
is the one above — nothing in the **boot** path may touch the network.

`skill_extractor._load_spacy` tries `JOBRADAR_SPACY_MODEL`, then
`/app/en_core_web_lg` (the layout of images built before this change), then the
checkout's nested wheel layout, then the package name, which is what resolves in
a current image. `en_core_web_lg` is also in `.dockerignore`, so a developer's
local copy is not shipped into the build context.

One fragility worth knowing: `requirements.txt` pins no spacy version, and the
model wheel is installed in a separate layer, so pip resolves the two
independently. The 3.8.0 model requires `spacy>=3.8.0,<3.9.0`; a future spacy
3.9 would install first and then be downgraded by the second step rather than
failing loudly.

## Build for linux/amd64 explicitly

The ACA nodes are amd64. `docker build` on an Apple Silicon machine produces an
**arm64** image that pushes to the registry perfectly happily and then cannot
run, so the platform has to be forced:

```bash
docker build --platform linux/amd64 -t jobradar:<tag> .
docker tag jobradar:<tag> jobradarregistry.azurecr.io/jobradar:<tag>
docker push jobradarregistry.azurecr.io/jobradar:<tag>
az containerapp update -n jobradar-backend -g jobradar-rg \
  --image jobradarregistry.azurecr.io/jobradar:<tag>
```

The `docker build` in `CLAUDE.md` has no `--platform` because it is for running
the image locally, where the native architecture is what you want.

## Secrets

Values are currently set as plaintext `env` entries on the container app, which
means anyone with Reader on the resource group can read every provider key and
the full Neon connection string via `az containerapp show`. They belong in
container app secrets, referenced as `secretref:`. Note that `GROQ_API_KEY` is
import-fatal (`llm_client.py:14`), so it must not be absent during a migration
to secrets; every other key merely disables its provider.
