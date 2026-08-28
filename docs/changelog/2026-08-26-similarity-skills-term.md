# 2026-08-26 — half the match score was one arbitrary CV skill

`JOB MATCHES` ranked `Senior Graphic Designer` (35.3%) above two software
engineering postings for a software-engineer CV, and every result in the list
sat between 31% and 37% — a 5.5-point spread across the whole ranking.

Two files, two unrelated faults. The second one is why the first was never
caught locally.

---

### File
`src/Agent/utils/embedder.py`

### Why

`get_embeddings` built four user-side vectors. Three were encoded from single
strings; `skills` was encoded from a **list**:

```python
"title":  self.model.encode(query.primary_role),   # -> (384,)
"skills": self.model.encode(query.skills),         # -> (n_skills, 384)
```

`SentenceTransformer.encode` returns one row per element when given a list, so
that entry was a matrix where its neighbours were vectors. `cos_sim` therefore
produced `(n_skills, n_jobs)` rather than `(1, n_jobs)`, and
`SimilarityEngine.calculate` reads `skill_scores[0][i]` (`SimilarityEngine.py:34`).

**Row 0 is the first CV skill.** The skills term carries `0.50` of the total
weight (`SimilarityEngine.py:11`), so half of every match score was the cosine
of one skill — whichever one the Groq interpreter happened to emit first — and
the remaining rows were computed and discarded. `overall_scores` was likewise
`(n_skills, n_jobs)`, silently broadcast, and only its first row ever read.

Measured with the real model, CV skills `[react, python, kubernetes, fastapi,
postgresql, docker]` against four postings. Each row is what the skills term
would have been had that skill been first:

```
                    Graphic Designer   Backend Eng   Frontend Eng   Data Entry
row 0  react                    2.6          -2.6           55.7          2.2   <- USED
row 1  python                   2.1          23.6           -1.0         14.1
row 2  kubernetes               2.6          57.4            0.4         -2.7
row 3  fastapi                  2.9          11.3           -0.8          6.1
row 4  postgresql              13.7          42.6            4.3         17.6
row 5  docker                   5.5          48.3            0.4         -4.6
```

Because `react` was first, `Backend Engineer` scored **-2.6** on the term worth
half the ranking while `Data Entry Clerk` scored **+2.2**. The ordering was
close to arbitrary, and the compression into a narrow band followed from the
same cause: one short token against a bag of skill names produces small cosines
for everything.

### What changed

The user's skills are joined before encoding, which also puts them on the same
footing as the job side — that has always been `" ".join(j.skills)`
(`embedder.py:95`). `primary_role` and `experience_level` gained the `or ""`
guard `location` already had; both are `None`-able on `ParsedQuery`.

### Before → After

Same four postings, same CV:

```
before (row 0 = "react")            after (joined)
  n/a — ordering was by a single       63.3%  skills=80.7%  Backend Engineer
  arbitrary skill; Backend Engineer    34.2%  skills=22.3%  Frontend Engineer
  scored -2.6 on the skills term       17.2%  skills=-2.2%  Senior Graphic Designer
  and Data Entry Clerk +2.2            10.0%  skills=-4.8%  Data Entry Clerk

user-side component shapes   title (384,)  skills (6,384)  ->  all (384,)
skills score matrix          (6, 4)                        ->  (1, 4)
```

The spread across the ranking goes from a few points to 10%–63%. The compressed
band was mostly this bug rather than cosine calibration, so rescaling the
displayed percentage is less urgent than it looked.

---

### File
`src/Agent/utils/skill_extractor.py`

### Why

Line 10 was `spacy.load("/app/en_core_web_lg")` — the path `Dockerfile:19`
copies the model to. A checkout has it at `en_core_web_lg/en_core_web_lg-3.8.0`
instead, and there is no `/app` on a development machine, so **importing the
module at all raised `OSError` outside a container**.

`skill_extractor` is the module whose output most needs to be inspected by hand:
the market chart is one long argument with EMSI's vocabulary, and every fix so
far (`BOILERPLATE_MARKERS`, both denylists) was found by reading extraction
output. That could only be done by building an image and running it.

### What changed

`_load_spacy()` tries, in order: `JOBRADAR_SPACY_MODEL`, `/app/en_core_web_lg`,
the checkout's nested wheel layout resolved from `__file__`, then the installed
package name. The failure message lists every candidate and its error rather
than reporting only the last.

The installed-package name is tried last deliberately: resolving it depends on
the interpreter's import path rather than on a location this repository
controls, and in a checkout it resolves via a directory in the working
directory, which makes it sensitive to where the process was started.

### Before → After

```
import src.Agent.utils.skill_extractor, locally   OSError  ->  loads, core_web_lg 3.8.0
extract() on a sample posting                     n/a      ->  Docker (Software), Kubernetes,
                                                                PostgreSQL, Python (Programming
                                                                Language), RESTful API
```

Container behaviour is unchanged — `/app/en_core_web_lg` is still the first
non-override candidate and still wins there.

### Learning notes

The two faults compound: a scoring bug that only shows up in output nobody could
reproduce outside a container is a bug that survives. The hardcoded path did not
cause the ranking error, but it is a good part of why it lasted.

Worth noting the shape mismatch was invisible at every layer. `encode` accepts
both a string and a list, `cos_sim` accepts both a vector and a matrix,
broadcasting made the weighted sum succeed, and `[0][i]` is valid indexing on
both shapes. Nothing raised. The only symptom was a ranking that looked slightly
wrong — which is exactly the kind of symptom that gets attributed to "the model
isn't very good" rather than investigated.

## Still open

Neither of these touches the extraction-quality complaint that prompted the
investigation — `Infrastructure` at 24.4% remains the top market skill. EMSI
types it, `Collaboration` and `Reliability` as `Soft Skill` (336 of 31,278
entries), which `_canonical` does not currently read. That is the next change,
along with surfacing `job_count` next to `frequency`: 8.2% of 49 postings is
four job ads, and the chart currently presents that as market demand.
