from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class JobIdentity:
    provider: str
    external_id: str


@dataclass
class JobRecord:
    """One row of `jobs` as the repository writes it. Source data only."""

    provider: str
    external_id: str
    identity_source: str
    fingerprint: str
    payload_hash: str
    raw_payload: dict

    title: str | None = None
    company: str | None = None
    description: str | None = None
    location: str | None = None
    remote: bool | None = None
    employment_type: str | None = None
    experience_level: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str | None = None
    salary_period: str | None = None
    url: str | None = None
    remote_eligibility: str | None = None
    posted_at: datetime | None = None
    posted_at_raw: str | None = None

    @property
    def identity(self) -> JobIdentity:
        return JobIdentity(self.provider, self.external_id)


@dataclass(frozen=True)
class UpsertedJob:
    id: int
    provider: str
    external_id: str
    inserted: bool


@dataclass(frozen=True)
class ObservationRecord:
    job_id: int
    search_id: int | None
    provider: str
    payload_hash: str
    payload_changed: bool
    result_rank: int | None = None
    raw_payload: dict | None = None
