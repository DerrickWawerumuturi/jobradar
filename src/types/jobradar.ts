import {JSX} from "react";
import {Control, Path, PathValue} from "react-hook-form";
import {FormValues} from "@/lib/form";

/**
 * Only the form fields that hold a plain string. FormField renders a
 * text input, so array/object fields (skills, education) must not bind to it —
 * they get their own dedicated controllers.
 */
export type StringFieldPath = {
    [P in Path<FormValues>]: PathValue<FormValues, P> extends string ? P : never
}[Path<FormValues>];

export interface SkillStat {
    skill: string;
    job_count: number;
    frequency: number;
}

export interface SkillCoverage {
    covered: number;
    /** Length of `top_skills` — the market skillset coverage is measured against. */
    total: number;
    /** Ratio in 0-1, equal to covered/total. */
    coverage: number;
}

export interface MarketAnalysis {
    jobs_analyzed: number;
    skill_coverage: SkillCoverage;
    /** Every market skill the user lacks — hundreds of entries, not a shortlist. */
    skill_gaps: SkillStat[];
    /** Sorted by frequency descending. */
    top_skills: SkillStat[];
    user_skill_presence: SkillStat[];
}

/**
 * A scraped posting, exactly as the backend nests it. Every field is optional
 * on the Python side (`Job` in src/Agent/utils/types.py defaults them all to
 * None), so nothing here can be assumed present.
 *
 * `provider`, `external_id` and `raw` exist on the Python model but are marked
 * `exclude=True`, so they are persistence-only and never reach this response.
 */
export interface JobPosting {
    id: string | null;
    title: string | null;
    company: string | null;
    description: string | null;
    /** Legacy single figure; mirrors salary_max where a provider supplies one. */
    salary: number | null;
    salary_min: number | null;
    salary_max: number | null;
    /** ISO currency code, e.g. "USD". */
    salary_currency: string | null;
    /** What the figures are per: "YEAR", "HOUR", … Never assume annual. */
    salary_period: string | null;
    location: string | null;
    remote: boolean | null;
    /**
     * Where a remote posting will actually hire from, as the provider states
     * it. "Remote" restricted to the USA is not remote for a user elsewhere.
     */
    remote_eligibility: string | null;
    /** Null in every response observed so far. */
    experience_level: string | null;
    employment_type: string | null;
    url: string | null;
    source: string | null;
    /** Whatever the provider called it — often relative ("3 days ago"). */
    posted_at: string | null;
    /** The provider's absolute publication time, where one is offered. */
    posted_at_utc: string | null;
}

/** The posting plus the skills the backend extracted from its description. */
export interface JobWithSkills {
    job: JobPosting;
    skills: string[];
}

export interface RankedJob {
    job: JobWithSkills;

    overall_score: number;
    title_score: number;
    skills_score: number;
    /** Constant across all jobs while the backend returns experience_level: null. */
    experience_score: number;
    /** Constant across all jobs sharing a location value. */
    location_score: number;
}

/** Where the search decided to look, and how it got there. */
export interface SearchLocation {
    /** Validated ISO 3166-1 alpha-2, lowercase. */
    country_code: string | null;
    country_name: string | null;
    city: string | null;
    remote_only: boolean;
    /** How the location was determined: "llm" | "recovered" | "none" | "unknown". */
    source: string;
    warning: string | null;
}

/** One provider's result for one leg of the search. */
export interface ProviderCoverage {
    provider: string | null;
    /** The scope label, e.g. "local:ke", "remote:global", "fallback:us". */
    scope: string | null;
    /** "ok" | "http_error" | "timeout" | "exception". */
    status: string | null;
    jobs: number | null;
}

/**
 * What was actually searched, alongside the numbers it produced. A six-job
 * analysis and a forty-job one look identical without this, and the
 * frequencies in `market` mean very different things in each.
 */
export interface SearchCoverage {
    location: SearchLocation;
    scopes: string[];
    /** True when the user's own market was too thin and other markets were added. */
    widened_below_floor: boolean;
    minimum_jobs_floor: number;
    duplicates_removed: number;
    /** Remote postings that would not hire from the user's country. */
    remote_ineligible_removed: number;
    /** Postings surviving dedupe and eligibility, before the role filter. */
    jobs_returned: number;
    /** Postings dropped for being outside the user's role. */
    off_market_removed: number;
    /** What actually reached the analysis — the denominator behind every frequency. */
    jobs_analyzed: number;
    providers: ProviderCoverage[];
}

export interface JobRadarAnalysis {
    market: MarketAnalysis;
    ranked_jobs: RankedJob[];
    /**
     * Optional because analyses cached in localStorage before this field
     * existed will not carry it. Present on every fresh response.
     */
    search?: SearchCoverage;
}

export interface CvBreakdown {
    name: string | null,
    title: string | null,
    location: string | null,
    phone_number: string | null,
    email: string | null
    portfolio: string | null,
    linkedIn: string | null,
    professional_summary: string | null,
    skills: (string | null)[],
    experience: {
        company: string | null,
        role: string | null,
        start_date: string | null,
        end_date: string | null,
        description: string | null
    }[],
    experience_level: string | null,
    education: {
        school_name: string | null,
        course_title: string | null
    }[]
}
export interface JobradarResult {
    analysis: JobRadarAnalysis;
    cv_breakdown: CvBreakdown
}

export interface FormFieldParams {
    name: StringFieldPath,
    title: string,
    placeholder: string,
    isDescription: boolean,
    control: Control<FormValues>
}
