# 2026-08-25 — Azure Container Apps crash loop

`jobradar-backend` in `jobradar-rg` (southafricanorth) served nothing. The
revision reported `Unhealthy` / `Container crashing: jobradar-backend`, and had
restarted **18 times**, every one exiting **137 (SIGKILL)** within 11–38s of
`ContainerStarted`.

No application logs existed to diagnose it with — `az containerapp logs show
--type console` returned only connection lines, and the Log Analytics workspace
contained no `ContainerAppConsoleLogs_CL` table at all.

---

### What changed

Deployment configuration only. No application code.

| | Before | After |
|---|---|---|
| CPU / memory | 0.5 vCPU / 1 GiB | 2 vCPU / 4 GiB |
| `JOBRADAR_EXTRACTION_WORKERS` | unset | `2` |
| `maxReplicas` | 10 | 1 |
| probes | `[]` (ACA defaults) | explicit Startup (TCP 8000) + Readiness (`/health`) |

`Dockerfile` additionally bakes in MiniLM (`HF_HOME=/opt/hf`, `HF_HUB_OFFLINE=1`)
and skillNer's `skill_db_relax_20.json` / `token_dist.json`.

### Why

**The container was OOM-killed during the import of `main.py`.**

`main.py:7` imports the module-level singleton at `JobRadarAgent.py:92`, and
uvicorn does not bind port 8000 until that import returns. The import loads, in
the main process: `en_core_web_lg` (`skill_extractor.py:10`, module scope — the
vector table alone is 392 MiB resident), skillNer's 31,278-entry `SKILL_DB` plus
a `PhraseMatcher` over all of it, and torch + MiniLM (`embedder.py:34`). That is
well over the 1 GiB the revision was given.

The diagnosis rested on the *variance* of the kill, since nothing was logged:

```
time from ContainerStarted to exit 137, across 18 restarts
11.0s  29.1s  38.1s  23.2s  16.1s  12.0s  12.0s  11.3s  13.8s
17.4s  13.2s  13.0s  12.1s  12.8s  12.8s  21.3s  13.0s  22.6s
```

A startup-probe threshold fires at a *constant* interval. A varying time-to-SIGKILL
is a cgroup OOM kill — the process dies whenever it happens to cross the limit.
`PYTHONUNBUFFERED=1` is set, so the absence of output was itself evidence: the
process never reached uvicorn's first log line. An application exception would
have printed a traceback and exited 1, not 137.

`JOBRADAR_EXTRACTION_WORKERS` had to be pinned in the same change. `_worker_count()`
(`extraction_pool.py:34`) calls `os.cpu_count()`, which **does not read cgroup CPU
quotas** — on an ACA node it returns the host core count, so `min(4, cpus - 1)`
resolves to 4 workers whatever the container is allocated. Each worker builds its
own `SkillExtractor`. Fixing only the memory would have moved the OOM from boot to
the first `/analyze`, which is the failure `extraction_pool.py:73-79` already
describes as *"a worker died — usually memory"*.

The probes were a second, independent fault, exposed only once the container
stayed up. ACA's default probe targets `/`, and `main.py` has no `/` route:

```
INFO:  100.100.0.48:53096 - "GET / HTTP/1.1" 404 Not Found
```

With `minReplicas: 0`, a request that triggers a scale-from-zero is held while
the replica boots. The replica never became routable, and the held request died
at the fixed 240s ingress timeout — while the revision itself read `Healthy`.

No liveness probe was added, deliberately. `/analyze` holds `analysis_lock`
(`main.py:44-56`) and saturates the pool for minutes; a liveness timeout would
kill the container mid-analysis.

### Before → After

```
revision health      Unhealthy / Failed        →  Healthy / Provisioned
exit code            137 (SIGKILL), 18×        →  no restarts
application logs     none, ever                →  "Application startup complete"
cold boot to bind    never reached             →  ~43s
GET /health (warm)   timeout                   →  200 in 0.21s
GET /health (cold)   timeout at 240s           →  200 in 48.6s, then 34.4s
```

Measured footprint in the container (`docker stats`, `--memory=4g`, 2 workers),
which is what the 4 GiB is actually sized against:

```
after import, before any request   1.18 GiB   <- on its own, over the old 1 GiB limit
peak during pool extraction        3.25 GiB   <- 81% of 4 GiB, with 2 workers
```

The first number is the crash. The second is why the worker count had to be
pinned in the same change: the default of 4 workers does not fit in 4 GiB either.

The two cold-start figures are before and after baking MiniLM and skillNer's
databases into the image: 48.6s while both were still fetched over the network
during the import, 34.4s once neither was. Verified by booting the new image with
`--network none`, which reaches "Application startup complete" in ~35s with no
network access at all.

### Also found, fixed separately

Two things surfaced during verification that are independent of this failure:

- **`/analyze` returned 500 before it reached any of the above**, for an
  unrelated reason: the Groq query interpreter was failing intermittently with
  `400 json_validate_failed`. Fixed separately in
  `docs/changelog/2026-08-25-groq-reasoning-effort.md`.
- **Images must be built `--platform linux/amd64`.** A native build on Apple
  Silicon produces arm64, which pushes to ACR without complaint and then cannot
  run on an ACA node.

### Learning notes

The absence of logs was the diagnostic, not an obstacle to it. Because
`PYTHONUNBUFFERED=1` was already set, "no output at all" ruled out every failure
mode that raises in Python and left only an external kill — and 137 with a
*varying* interval separated OOM from probe timeout without needing a single
line of application output.

Worth remembering that `os.cpu_count()` is blind to cgroup limits. Any container
sizing derived from it is derived from the host, not from what the container was
actually given.

The deployment had no representation in this repository — no CI, no bicep, no
scripts, and `Dockerfile`/`.dockerignore` untracked — so none of the configuration
that caused this was reviewable alongside the code that depended on it.
