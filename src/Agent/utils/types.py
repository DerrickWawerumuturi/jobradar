from typing import TypedDict

from pydantic import BaseModel, Field
from dataclasses import dataclass

from torch import Tensor


class ParsedQuery(BaseModel):
    primary_role: str | None = None
    secondary_roles: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    experience_level: str | None = None
    job_requirements: str | None = None
    education: str | None = None
    location: str | None = None
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
    location: str | None = None
    remote: bool | None = None
    experience_level: str | None = None
    employment_type: str | None = None
    url: str | None = None
    source: str | None = None
    posted_at: str | None = None


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
