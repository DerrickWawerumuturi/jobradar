import {JobPosting, JobRadarAnalysis, RankedJob} from "@/types/jobradar";
import {partitionJobSkills, toPercent, toSkillKeys} from "@/lib/market";

/** A ranked job flattened into what the dashboard tables render. */
export interface OpportunityRow {
    key: string;
    /** Our jobs.id — null means the posting wasn't persisted and can't be saved. */
    jobId: number | null;
    role: string;
    company: string | null;
    location: string;
    /** 0-100. */
    match: number;
    /** Skills the posting lists that are on / missing from the CV. */
    have: string[];
    missing: string[];
    required: number;
    posted: string | null;
    /** "USD 120k–150k/yr", exactly as the provider priced it — null when unlisted. */
    salary: string | null;
    type: string | null;
    url: string | null;
    scores: { title: number; skills: number; experience: number; location: number };
}

export function toOpportunities(analysis: JobRadarAnalysis): OpportunityRow[] {
    const userSkillKeys = toSkillKeys(analysis.market?.user_skill_presence ?? []);

    return [...(analysis.ranked_jobs ?? [])]
        .sort((a, b) => b.overall_score - a.overall_score)
        .map((ranked, index) => toRow(ranked, index, userSkillKeys))
        .filter((row): row is OpportunityRow => row !== null);
}

function toRow(ranked: RankedJob, index: number, userSkillKeys: Set<string>): OpportunityRow | null {
    const posting = ranked.job?.job;
    if (!posting) return null;

    const skills = ranked.job?.skills ?? [];
    const {matched, missing} = partitionJobSkills(skills, userSkillKeys);

    return {
        key: String(posting.db_id ?? posting.id ?? `${posting.title}-${index}`),
        jobId: posting.db_id ?? null,
        role: posting.title ?? "Untitled role",
        company: posting.company,
        location: posting.remote ? "Remote" : posting.location ?? "—",
        match: toPercent(ranked.overall_score),
        have: matched,
        missing,
        required: skills.length,
        posted: posting.posted_at ?? formatDate(posting.posted_at_utc),
        salary: formatSalary(posting),
        type: posting.employment_type,
        url: posting.url ?? posting.source,
        scores: {
            title: ranked.title_score,
            skills: ranked.skills_score,
            experience: ranked.experience_score,
            location: ranked.location_score
        }
    };
}

const SALARY_PERIOD: Record<string, string> = {
    YEAR: "/yr", MONTH: "/mo", WEEK: "/wk", DAY: "/day", HOUR: "/hr"
};

function formatSalary(posting: JobPosting): string | null {
    const min = posting.salary_min;
    const max = posting.salary_max ?? posting.salary;
    if (min == null && max == null) return null;

    const compact = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n));
    const range = min != null && max != null && max !== min
        ? `${compact(min)}–${compact(max)}`
        : compact((max ?? min)!);
    const currency = posting.salary_currency ? `${posting.salary_currency} ` : "";
    const period = posting.salary_period
        ? SALARY_PERIOD[posting.salary_period.toUpperCase()] ?? ""
        : "";
    return `${currency}${range}${period}`;
}

function formatDate(iso: string | null): string | null {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString(undefined, {month: "short", day: "numeric"});
}

/** "2h ago" for timestamps the backend returns as ISO strings. */
export function timeAgo(iso: string | null | undefined): string {
    if (!iso) return "—";
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "—";
    const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
    return `${Math.round(minutes / (60 * 24))}d ago`;
}
