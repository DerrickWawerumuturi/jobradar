from datetime import datetime
from typing import Literal, TypedDict

from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field, field_validator
from dataclasses import field
from dataclasses import dataclass

from torch import Tensor


class ParsedQuery(BaseModel):
    primary_role: str | None = None
    secondary_roles: list[str] = Field(default_factory=list)
    # The Muse filters on its own category taxonomy, not on a job title. The
    # prompt has always asked for this; the field was missing here, so pydantic
    # dropped it and the provider was sent a role string that matched nothing.
    category: str | None = None
    skills: list[str] = Field(default_factory=list)
    experience_level: str | None = None
    job_requirements: str | None = None
    education: str | None = None
    location: str | None = None
    # Asked for separately from `location` so the search has something a
    # provider will accept. Validated against ISO 3166-1 before it is used.
    country_code: str | None = None
    city: str | None = None
    remote: bool | None = None
    employment_type: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    currency: str | None = None
    industries: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    exclude_keywords: list[str] = Field(default_factory=list)
    company_preferences: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    notes: str | None = None


class Job(BaseModel):
    id: str | None = None
    title: str | None = None
    company: str | None = None
    description: str | None = None
    salary: int | float | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str | None = None
    salary_period: str | None = None
    location: str | None = None
    remote: bool | None = None
    # Which regions a remote posting will actually hire from, as the provider
    # states it. "Remote" restricted to the USA is not remote for a user in
    # Nairobi, and roughly half of remote postings carry such a restriction.
    remote_eligibility: str | None = None
    experience_level: str | None = None
    employment_type: str | None = None
    url: str | None = None
    source: str | None = None
    posted_at: str | None = None
    # The provider's own absolute publication time, where it offers one.
    # `posted_at` stays whatever the provider called it, which for JSearch is a
    # relative phrase ("2 days ago") that is not a timestamp.
    posted_at_utc: str | None = None

    # Persistence-only. Excluded from serialisation so the storage layer can
    # identify a posting and keep its source payload without widening the
    # /analyze response.
    # Our own jobs.id, attached after persistence so the dashboard can bookmark
    # a posting. None when persistence is disabled or the write failed.
    db_id: int | None = None

    provider: str | None = Field(default=None, exclude=True)
    external_id: str | None = Field(default=None, exclude=True)
    raw: dict | None = Field(default=None, exclude=True, repr=False)

    @field_validator("id", "external_id", mode="before")
    @classmethod
    def _coerce_identifier(cls, value):
        """
        The Muse returns integer job ids and pydantic 2 does not coerce int to
        str, so every Muse posting used to fail validation and get skipped.
        """
        if value is None or isinstance(value, str):
            return value
        return str(value)


@dataclass
class SearchQuery:
    primary_role: str
    remote: bool | None = None
    experience_level: str | None = None
    job_requirements: str | None = None

@dataclass
class ProcessedJob:
    job: Job
    skills: list[str]

@dataclass
class SentenceEmbs(TypedDict):
    title: Tensor
    skills: list[Tensor]
    experience : Tensor
    location : Tensor

@dataclass(frozen=True)
class SearchScope:
    """One leg of a search: where to look and under what arrangement."""

    kind: str                      # local | remote | fallback
    label: str
    country_code: str | None = None
    country_name: str | None = None
    city: str | None = None
    place: str | None = None       # phrase for a provider's free-text query


@dataclass
class SearchOutcome:
    jobs: list = field(default_factory=list)
    coverage: dict = field(default_factory=dict)

class Education(BaseModel):
    school_name: str | None
    course_title: str | None


class Experience(BaseModel):
    company: str | None
    role: str | None
    start_date: str | None
    end_date: str | None
    description: str | None


class CVQuery(BaseModel):
    name: str | None
    title: str | None
    location: str | None
    phone_number: str | None
    email: str | None
    portfolio: str | None
    linkedIn: str | None
    professional_summary: str | None
    skills:list[str] = Field(default_factory=list)
    experience: list[Experience] = Field(default_factory=list)
    experience_level: str | None
    education: list[Education]


class BookmarkRequest(BaseModel):
    job_id: int
    title: str | None = None
    company: str | None = None
    source: str | None = None
    match_score: float | None = None
    cv_snapshot: dict | None = None


class ManualApplicationRequest(BaseModel):
    title: str
    company: str | None = None
    url: str | None = None
    location: str | None = None
    status: Literal["saved", "applied"] = "applied"
    cv_snapshot: dict | None = None


class TransitionRequest(BaseModel):
    to_status: Literal[
        "applied", "screening", "interview", "offer", "rejected", "withdrawn"
    ]
    occurred_at: datetime | None = None
    scheduled_for: datetime | None = None
    note: str | None = None
