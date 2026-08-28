# 2026-08-25 — `/analyze` failing intermittently at the query interpreter

`POST /analyze` returned `500 Internal Server Error` about half the time, within
three seconds, before any search or extraction ran. The response body was
`Internal Server Error` and the traceback ended at:

```
File "/app/src/Agent/Framework/QueryInterpreter.py", line 20, in interpreter
    raise ValueError("Error in the interpreter")
ValueError: Error in the interpreter
```

Found while verifying the container fix in
`docs/changelog/2026-08-25-container-oom.md`; unrelated to it.

---

### Files
`src/Agent/utils/llm_client.py`, `src/Agent/Framework/QueryInterpreter.py`,
`src/Agent/utils/parser.py`

### Why

`GROQ_MODEL_NAME` is `openai/gpt-oss-20b`, a **reasoning** model. It spends
completion budget thinking before it emits any JSON, and when the document is
cut off mid-way Groq rejects the *whole* response rather than returning the
truncated text:

```
400 json_validate_failed — "max completion tokens reached before generating a
valid document"
```

The call set neither `max_completion_tokens` nor `reasoning_effort`, so it ran
against a default cap lower than what the model actually wanted. How much it
wanted varied per call even at `temperature=0`, because the *reasoning* is what
varies — which is why the failure was intermittent rather than total, and why it
looked like it had "worked before".

Measured over identical calls with one 5,903-character CV:

```
effort   cap     ok     completion tokens   CV skills parsed
medium   (none)  2/5    1043-1739           35-39
medium   2048    3/6    1043-1521           30-35
medium   4096    5/6    1526-2377           34-39
low      2048    6/6    215 (flat)          30
```

`low` is perfectly reliable, and was the obvious fix — but it is reliable because
it barely thinks, and it drops real skills. Against the same CV it loses
`fastapi`, `langchain`, `hugging face`, `machine learning`, `data science`,
`chromadb`, `openai api` and `svm`. Those feed `SkillExtractor.normalize()` and
then every coverage and gap number downstream, so quietly parsing eight fewer
skills is not a free reliability win.

Raising the cap instead is bounded by a second limit. The requested completion
budget counts towards the free tier's **8,000 tokens per minute even when it goes
unused**, so `max_completion_tokens=8192` fails before the model is called at all:

```
413 rate_limit_exceeded — "Limit 8000, Requested 10763"
```

At 4,096 this CV asks for ~6,700 of the 8,000, which fits — but a CV about half
again as long would not.

### What changed

`medium` at a 4,096 cap is preferred, and `low` at 2,048 is a **fallback**,
rather than either being *the* setting. `_should_downgrade()` retries once, on
exactly the two failures a cheaper effort survives: `json_validate_failed` (the
model wanted more than the cap) and `413` (the request did not fit the
per-minute budget). Anything else still raises.

Both knobs are `JOBRADAR_GROQ_*` env vars.

Separately, `QueryInterpreter.interpreter` and `parse_generated_query` both
caught `Exception` and raised a bare `ValueError` with the cause discarded. They
now chain it. The original error was only diagnosable because
`generate_response` happens to `print` it before re-raising.

### Before → After

```
POST /analyze          500 about half the time  →  200
                                                   (6/6 locally, 2/2 on Azure)
CV skills parsed       35-39 when it worked     →  35-39, 30 after a fallback
wall clock on Azure    3s to failure            →  36-40s to a full result
error surfaced         "Error in the interpreter"  →  the Groq error, chained
```

### Learning notes

The intermittency was the tell. A config that is wrong for the *model* fails
every time; a config that is wrong for the model's *budget* fails only when the
budget is exceeded, and for a reasoning model that varies per call even at
`temperature=0`.

Worth noting that the obvious fix and the correct fix were different, and only
comparing *output* rather than success rate showed it. `reasoning_effort="low"`
turns a 50% failure rate into 0% and looks finished, until you diff the parsed
skills against what the failing configuration had been producing.
