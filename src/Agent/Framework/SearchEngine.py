import os
import time
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor
from dotenv import find_dotenv, load_dotenv
import requests
from pydantic import ValidationError

from src.Agent.utils.parser import Job
from src.Agent.utils.types import SearchQuery, SearchOutcome, SearchScope
from src.Agent.utils import location as loc

load_dotenv(find_dotenv())

# (connect, read). Without these a single unresponsive provider stalls the
# whole analysis indefinitely.
REQUEST_TIMEOUT = (5, 30)

USER_AGENT = "JobRadar/1.0 (+https://github.com/DerrickWawerumuturi)"

# Below this many postings the market statistics stop meaning anything —
# frequency is job_count/total, so eight jobs make every skill a multiple of
# 12.5%. The search widens rather than reporting confident noise.
MIN_JOBS_FLOOR = 15

# Only used when the user's own market comes back too thin, and only ever as an
# explicitly labelled addition.
FALLBACK_MARKETS = (("us", "United States"), ("gb", "United Kingdom"))




class JOBPROVIDER(ABC):
    # Stamped onto every posting this provider returns. Set in the base class
    # rather than in each normalize() so a new provider cannot omit it — it is
    # half of the storage layer's deduplication key.
    name: str = "unknown"

    # Which kinds of scope this provider can actually serve. A remote-only board
    # cannot answer "jobs in Nairobi", so asking it is a wasted request.
    scopes: tuple = ("local", "remote", "fallback")

    def available(self) -> bool:
        """False when a required key is missing, so the provider is skipped."""
        return True

    def supports(self, scope: SearchScope) -> bool:
        return scope.kind in self.scopes

    @abstractmethod
    def search(self, query, scope: SearchScope, run_log=None) -> list[Job]:
        pass

    @abstractmethod
    def normalize(self, job_data: dict) -> dict:
        pass

    def parse_job(self, job_data: dict) -> Job:
        normalized = self.normalize(job_data)
        return Job(
            **normalized,
            provider=self.name,
            external_id=normalized.get("id"),
            raw=job_data,
        )

    def _collect(self, results, parsed):
        for item in results:
            try:
                parsed.append(self.parse_job(item))
            except ValidationError as e:
                print(f"[{self.name}] Skipping invalid job: {e}")
        return parsed

    def _finish(self, run_log, outcome, started, parsed, scope):
        if run_log is not None:
            outcome["jobs_returned"] = len(parsed)
            outcome["duration_ms"] = int((time.perf_counter() - started) * 1000)
            outcome["scope"] = scope.label
            run_log.append(outcome)


# Adzuna stays out: it truncates descriptions to 500 characters, which removes
# the skills the whole pipeline depends on. Its country list also excludes
# Kenya, so it would not have helped here either.


class JSearchProvider(JOBPROVIDER):
    name = "jsearch"

    def __init__(self):
        self.base_url = 'https://jsearch.p.rapidapi.com/search-v2'

    def available(self) -> bool:
        return bool(os.getenv("JSEARCH_API_KEY"))

    def search(self, query, scope: SearchScope, run_log=None):
        parsed_jobs = []

        # The ISO code belongs in `country`, never in the query text: measured,
        # "engineer in ke" returns one posting where "engineer in Kenya"
        # returns a full page. The previous code put the code in the text and
        # passed no country at all, which is why the gb leg returned nothing.
        text = query.primary_role or ""
        if scope.place:
            text = f"{text} in {scope.place}"

        params = {
            "query": text.strip(),
            "page": 1,
            "num_pages": "1",
            "job_requirements": query.job_requirements,
        }
        if scope.country_code:
            params["country"] = scope.country_code
        if scope.kind == "remote":
            params["work_from_home"] = "true"

        outcome = {"provider": self.name, "request_params": params, "status": "exception"}
        started = time.perf_counter()

        try:
            headers = {
                "x-rapidapi-key": os.getenv("JSEARCH_API_KEY"),
                "x-rapidapi-host": os.getenv("JSEARCH_HOST"),
                "Content-Type": "application/json"
            }
            res = requests.get(self.base_url, headers=headers, params=params,
                               timeout=REQUEST_TIMEOUT)
            outcome["http_status"] = res.status_code

            if res.status_code == 200:
                outcome["status"] = "ok"
                self._collect(res.json().get("data", {}).get("jobs", []), parsed_jobs)
            else:
                outcome["status"] = "http_error"
                outcome["error"] = res.text[:500]
                print(f"[jsearch/{scope.label}] Error {res.status_code}: {res.text[:200]}")
            return parsed_jobs

        except requests.Timeout as err:
            outcome["status"] = "timeout"
            outcome["error"] = str(err)[:500]
            print(f"[jsearch/{scope.label}] Timeout: {err}")
            return parsed_jobs
        except Exception as err:
            outcome["error"] = str(err)[:500]
            print(f"[jsearch/{scope.label}] Error: {err}")
            return parsed_jobs
        finally:
            self._finish(run_log, outcome, started, parsed_jobs, scope)

    def normalize(self, job_data: dict):
        city = job_data.get("job_city")
        country = job_data.get("job_country")
        return {
            "id": job_data.get("job_id"),
            "title": job_data.get("job_title"),
            "company": job_data.get("employer_name"),
            "description": job_data.get("job_description"),
            "salary": job_data.get("job_max_salary"),
            "salary_min": job_data.get("job_min_salary"),
            "salary_max": job_data.get("job_max_salary"),
            "salary_currency": job_data.get("job_salary_currency"),
            "salary_period": job_data.get("job_salary_period"),
            "remote": job_data.get("job_is_remote"),
            # Was job_country alone, which gave every posting from one call an
            # identical location and left location_score with no signal.
            "location": ", ".join(p for p in (city, country) if p) or country,
            # Was employer_website, the company homepage — identical for every
            # posting at that company.
            "url": job_data.get("job_apply_link"),
            "employment_type": job_data.get("job_employment_type"),
            "source": job_data.get("job_apply_link"),
            "posted_at": job_data.get("job_posted_at"),
            "posted_at_utc": job_data.get("job_posted_at_datetime_utc"),
        }


# The Muse rejects anything outside its own taxonomy by returning zero results,
# so the LLM's category is checked against this before it is sent.
MUSE_CATEGORIES = frozenset({
    "Software Engineering", "Data and Analytics", "Computer and IT",
    "Science and Engineering", "Design and UX", "Product Management",
    "Project Management", "IT", "Business Operations",
})


class MuseProvider(JOBPROVIDER):
    name = "muse"

    def __init__(self):
        self.base_url = "https://www.themuse.com/api/public/jobs"

    def search(self, query, scope: SearchScope, run_log=None):
        parsed_jobs = []
        params = {
            "api_key": os.getenv("MUSE_API_KEY"),
            "page": 1,
            "level": query.experience_level,
        }
        # Only a real taxonomy value, never a job title: measured,
        # category="machine learning engineer" returns total=0 while
        # "Software Engineering" returns 100k. No category beats a wrong one.
        category = (getattr(query, "category", None) or "").strip()
        if category in MUSE_CATEGORIES:
            params["category"] = category
        if scope.kind == "remote":
            params["location"] = "Flexible / Remote"
        elif scope.place:
            params["location"] = scope.place

        outcome = {
            "provider": self.name,
            "request_params": {k: v for k, v in params.items() if k != "api_key"},
            "status": "exception",
        }
        started = time.perf_counter()

        try:
            res = requests.get(self.base_url, params=params, timeout=REQUEST_TIMEOUT)
            outcome["http_status"] = res.status_code

            if res.status_code == 200:
                outcome["status"] = "ok"
                results = res.json().get("results", [])
                # The location filter narrows the corpus but does not restrict
                # it — measured, asking for "Nairobi, Kenya" still returns
                # Dallas and New York. The returned location is checked rather
                # than trusted.
                if scope.kind == "local":
                    results = [j for j in results if self._matches(j, scope)]
                self._collect(results, parsed_jobs)
            else:
                outcome["status"] = "http_error"
                outcome["error"] = res.text[:500]
            return parsed_jobs

        except requests.Timeout as err:
            outcome["status"] = "timeout"
            outcome["error"] = str(err)[:500]
            print(f"[muse/{scope.label}] Timeout: {err}")
            return parsed_jobs
        except Exception as err:
            outcome["error"] = str(err)[:500]
            print(f"[muse/{scope.label}] Error: {err}")
            return parsed_jobs
        finally:
            self._finish(run_log, outcome, started, parsed_jobs, scope)

    @staticmethod
    def _matches(job_data: dict, scope: SearchScope) -> bool:
        names = " | ".join(l.get("name", "") for l in job_data.get("locations", [])).lower()
        wanted = [p.lower() for p in (scope.city, scope.country_name) if p]
        return any(w in names for w in wanted)

    def normalize(self, job_data: dict) -> dict:
        locations = job_data.get("locations", [])
        location = locations[0].get("name") if locations else None
        # Provider-supplied, not inferred: The Muse publishes a level per
        # posting, so this is the one place experience_level is ever populated.
        levels = job_data.get("levels", [])
        level = levels[0].get("name") if levels else None
        landing_page = job_data.get("refs", {}).get("landing_page")
        return {
            "id": job_data.get("id"),
            "title": job_data.get("name"),
            "company": job_data.get("company", {}).get("name"),
            "description": job_data.get("contents"),
            "location": location,
            "remote": bool(location and "remote" in location.lower()),
            "experience_level": level,
            "employment_type": job_data.get("type"),
            "url": landing_page,
            "source": landing_page,
            "posted_at": job_data.get("publication_date"),
            "posted_at_utc": job_data.get("publication_date"),
        }


class RemotiveProvider(JOBPROVIDER):
    """Remote-only, global, no API key. Publishes candidate eligibility."""

    name = "remotive"
    scopes = ("remote",)

    def __init__(self):
        self.base_url = "https://remotive.com/api/remote-jobs"

    def search(self, query, scope: SearchScope, run_log=None):
        parsed_jobs = []
        params = {"search": query.primary_role or "", "limit": 50}
        outcome = {"provider": self.name, "request_params": params, "status": "exception"}
        started = time.perf_counter()

        try:
            res = requests.get(self.base_url, params=params, timeout=REQUEST_TIMEOUT,
                               headers={"User-Agent": USER_AGENT})
            outcome["http_status"] = res.status_code
            if res.status_code == 200:
                outcome["status"] = "ok"
                self._collect(res.json().get("jobs", []), parsed_jobs)
            else:
                outcome["status"] = "http_error"
                outcome["error"] = res.text[:500]
            return parsed_jobs
        except requests.Timeout as err:
            outcome["status"] = "timeout"
            outcome["error"] = str(err)[:500]
            return parsed_jobs
        except Exception as err:
            outcome["error"] = str(err)[:500]
            print(f"[remotive] Error: {err}")
            return parsed_jobs
        finally:
            self._finish(run_log, outcome, started, parsed_jobs, scope)

    def normalize(self, job_data: dict) -> dict:
        eligibility = job_data.get("candidate_required_location")
        return {
            "id": job_data.get("id"),
            "title": job_data.get("title"),
            "company": job_data.get("company_name"),
            "description": job_data.get("description"),
            "location": eligibility,
            "remote": True,
            "remote_eligibility": eligibility,
            "employment_type": job_data.get("job_type"),
            "url": job_data.get("url"),
            "source": job_data.get("url"),
            "posted_at": job_data.get("publication_date"),
            "posted_at_utc": job_data.get("publication_date"),
        }


class RemoteOKProvider(JOBPROVIDER):
    """Remote-only, global, no API key."""

    name = "remoteok"
    scopes = ("remote",)

    def __init__(self):
        self.base_url = "https://remoteok.com/api"

    @staticmethod
    def _tag_candidates(role: str) -> list:
        """
        RemoteOK matches a single tag, not a job title.

        Measured: tags="machine learning engineer" returns nothing while
        "machine learning" returns 24, so the role is shortened a word at a time
        until it matches something the board actually tags jobs with.
        """
        words = (role or "").split()
        return [" ".join(words[:n]) for n in range(len(words), 0, -1)] or [""]

    def search(self, query, scope: SearchScope, run_log=None):
        parsed_jobs = []
        params = {"tags": query.primary_role or ""}
        outcome = {"provider": self.name, "request_params": params, "status": "exception"}
        started = time.perf_counter()

        try:
            for tag in self._tag_candidates(query.primary_role):
                res = requests.get(self.base_url, params={"tags": tag},
                                   timeout=REQUEST_TIMEOUT,
                                   headers={"User-Agent": USER_AGENT})
                outcome["http_status"] = res.status_code
                if res.status_code != 200:
                    outcome["status"] = "http_error"
                    outcome["error"] = res.text[:500]
                    return parsed_jobs

                # The first element is a legend/disclaimer object, not a job.
                rows = [r for r in res.json() if isinstance(r, dict) and r.get("id")]
                if rows:
                    outcome["status"] = "ok"
                    outcome["request_params"] = {"tags": tag}
                    self._collect(rows, parsed_jobs)
                    return parsed_jobs

            outcome["status"] = "ok"
            return parsed_jobs
        except requests.Timeout as err:
            outcome["status"] = "timeout"
            outcome["error"] = str(err)[:500]
            return parsed_jobs
        except Exception as err:
            outcome["error"] = str(err)[:500]
            print(f"[remoteok] Error: {err}")
            return parsed_jobs
        finally:
            self._finish(run_log, outcome, started, parsed_jobs, scope)

    def normalize(self, job_data: dict) -> dict:
        where = (job_data.get("location") or "").strip()
        return {
            "id": job_data.get("id"),
            "title": job_data.get("position") or job_data.get("title"),
            "company": job_data.get("company"),
            "description": job_data.get("description"),
            "location": where or "Remote",
            "remote": True,
            # Left as None when the board says nothing, so it reads as unknown
            # rather than as a restriction.
            "remote_eligibility": where or None,
            "salary_min": job_data.get("salary_min"),
            "salary_max": job_data.get("salary_max"),
            "salary": job_data.get("salary_max"),
            "url": job_data.get("url") or job_data.get("apply_url"),
            "source": job_data.get("url"),
            "posted_at": job_data.get("date"),
            "posted_at_utc": job_data.get("date"),
        }


class JoobleProvider(JOBPROVIDER):
    """
    60+ country coverage from one free key — the widest local reach available,
    and the only provider here with real inventory outside the big markets.

    Its `snippet` is a truncated description, not the full posting. Adzuna was
    dropped from this project for exactly that reason, so measure what skill
    extraction gets out of these before trusting them equally.
    """

    name = "jooble"
    scopes = ("local", "fallback")

    def available(self) -> bool:
        return bool(os.getenv("JOOBLE_API_KEY"))

    def search(self, query, scope: SearchScope, run_log=None):
        parsed_jobs = []
        payload = {
            "keywords": query.primary_role or "",
            "location": scope.place or scope.country_name or "",
        }
        outcome = {"provider": self.name, "request_params": payload, "status": "exception"}
        started = time.perf_counter()

        try:
            res = requests.post(
                f"https://jooble.org/api/{os.getenv('JOOBLE_API_KEY')}",
                json=payload,
                headers={"Content-Type": "application/json", "User-Agent": USER_AGENT},
                timeout=REQUEST_TIMEOUT,
            )
            outcome["http_status"] = res.status_code
            if res.status_code == 200:
                outcome["status"] = "ok"
                self._collect(res.json().get("jobs", []), parsed_jobs)
            else:
                outcome["status"] = "http_error"
                outcome["error"] = res.text[:500]
            return parsed_jobs
        except requests.Timeout as err:
            outcome["status"] = "timeout"
            outcome["error"] = str(err)[:500]
            return parsed_jobs
        except Exception as err:
            outcome["error"] = str(err)[:500]
            print(f"[jooble] Error: {err}")
            return parsed_jobs
        finally:
            self._finish(run_log, outcome, started, parsed_jobs, scope)

    def normalize(self, job_data: dict) -> dict:
        return {
            "id": job_data.get("id"),
            "title": job_data.get("title"),
            "company": job_data.get("company"),
            "description": job_data.get("snippet"),
            "location": job_data.get("location"),
            "employment_type": job_data.get("type"),
            "url": job_data.get("link"),
            "source": job_data.get("link"),
            "posted_at": job_data.get("updated"),
            "posted_at_utc": job_data.get("updated"),
        }


class SearchEngine:
    def __init__(self):
        self.providers = [
            JSearchProvider(),
            MuseProvider(),
            RemotiveProvider(),
            RemoteOKProvider(),
            JoobleProvider(),
        ]

    def build_scopes(self, resolved) -> list[SearchScope]:
        """
        Two legs, deliberately.

        Someone in Nairobi has two markets, not one: what Kenya advertises, and
        what the world advertises that they can do from Kenya. Searching only
        the first hides most of their opportunities; searching only the second
        is what the old hardcoded us/gb/ca list effectively did.
        """
        scopes = []

        if resolved.known and not resolved.remote_only:
            scopes.append(SearchScope(
                kind="local",
                label=f"local:{resolved.country_code}",
                country_code=resolved.country_code,
                country_name=resolved.country_name,
                city=resolved.city,
                place=resolved.place_phrase(),
            ))

        scopes.append(SearchScope(
            kind="remote",
            label="remote:global",
            country_code=resolved.country_code,
            country_name=resolved.country_name,
        ))
        return scopes

    def _run_scopes(self, query, scopes, run_log):
        tasks = [
            (provider, scope)
            for scope in scopes
            for provider in self.providers
            if provider.available() and provider.supports(scope)
        ]
        if not tasks:
            return []

        def run(task):
            provider, scope = task
            try:
                return provider.search(query, scope, run_log=run_log)
            except Exception as e:
                print(f"{provider.__class__.__name__}/{scope.label} failed: {e}")
                return []

        # Every leg is an independent network wait, so they all overlap.
        with ThreadPoolExecutor(max_workers=min(8, len(tasks))) as pool:
            results = pool.map(run, tasks)

        return [job for batch in results for job in batch]

    @staticmethod
    def _dedupe(jobs):
        """
        One posting, one row in the analysis.

        Several legs can return the same job, and MarketAnalyzer counts skills
        per job — so a duplicate does not merely repeat in the list, it inflates
        every skill that posting mentions.
        """
        seen, unique = set(), []
        for job in jobs:
            key = (job.provider, job.external_id) if job.external_id else (
                job.provider, (job.title or "").lower(), (job.company or "").lower()
            )
            if key in seen:
                continue
            seen.add(key)
            unique.append(job)
        return unique, len(jobs) - len(unique)

    @staticmethod
    def _filter_eligible(jobs, country_code):
        """
        Drop remote postings that name eligible regions and exclude this user.

        Measured on Remotive: only 8 of 17 remote postings were open to Africa
        or worldwide. A remote job restricted to the USA is not a remote job for
        someone in Nairobi, and showing it as one is the same failure the
        hardcoded country list produced.
        """
        if not country_code:
            return jobs, 0

        kept, dropped = [], 0
        for job in jobs:
            if loc.remote_eligibility(job.remote_eligibility, country_code) is False:
                dropped += 1
                continue
            kept.append(job)
        return kept, dropped

    def get_jobs(self, query: SearchQuery, run_log: list | None = None) -> SearchOutcome:
        """
        Postings for this query, with a record of where they came from.

        `run_log`, when given, collects one entry per upstream request — status,
        parameters, timing. It is an out-parameter rather than a return value so
        the engine stays a job source and knows nothing about storage.
        """
        resolved = loc.resolve(query)
        if resolved.warning:
            print(f"Location: {resolved.warning}")

        scopes = self.build_scopes(resolved)
        jobs = self._run_scopes(query, scopes, run_log)

        # Dedup and the eligibility filter are what shrink the set, so the floor
        # has to be measured after them. Checking the raw count let 17 postings
        # clear a floor of 15 and then reduce to 8 once the US-only remote jobs
        # were dropped — under the floor, with nothing widened.
        jobs, duplicates = self._dedupe(jobs)
        jobs, ineligible = self._filter_eligible(jobs, resolved.country_code)

        widened = False
        if len(jobs) < MIN_JOBS_FLOOR:
            widened = True
            print(
                f"Only {len(jobs)} usable postings for "
                f"{resolved.country_name or 'this query'}; widening to "
                f"{', '.join(n for _, n in FALLBACK_MARKETS)}"
            )
            extra = [
                SearchScope(kind="fallback", label=f"fallback:{code}",
                            country_code=code, country_name=name, place=name)
                for code, name in FALLBACK_MARKETS
                if code != resolved.country_code
            ]
            jobs += self._run_scopes(query, extra, run_log)
            scopes = scopes + extra

            jobs, more_duplicates = self._dedupe(jobs)
            jobs, more_ineligible = self._filter_eligible(jobs, resolved.country_code)
            duplicates += more_duplicates
            ineligible += more_ineligible

        coverage = {
            "location": {
                "country_code": resolved.country_code,
                "country_name": resolved.country_name,
                "city": resolved.city,
                "remote_only": resolved.remote_only,
                "source": resolved.source,
                "warning": resolved.warning,
            },
            "scopes": [s.label for s in scopes],
            "widened_below_floor": widened,
            "minimum_jobs_floor": MIN_JOBS_FLOOR,
            "duplicates_removed": duplicates,
            "remote_ineligible_removed": ineligible,
            "jobs_returned": len(jobs),
            "providers": [
                {
                    "provider": entry.get("provider"),
                    "scope": entry.get("scope"),
                    "status": entry.get("status"),
                    "jobs": entry.get("jobs_returned"),
                }
                for entry in (run_log or [])
            ],
        }

        return SearchOutcome(jobs=jobs, coverage=coverage)
