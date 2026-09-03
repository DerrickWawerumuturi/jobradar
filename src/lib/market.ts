import {SkillCoverage, SkillStat} from "@/types/jobradar";

/**
 * Display-only transforms over JobRadarAnalysis.
 *
 * These reshape backend numbers for rendering (0.5555 -> "55.6%") and guard
 * against assumptions we cannot verify from the type alone (e.g. whether the
 * backend already sorted a skill list). They must not re-derive any market
 * analysis — that is the backend's job.
 */

/**
 * The backend sends `frequency` as a ratio (0.5555) but `coverage` could be
 * either a ratio or an already-scaled percentage. Normalise both to 0-100.
 */
export function toPercent(value: number): number {
    if (!Number.isFinite(value)) return 0;
    const scaled = value <= 1 ? value * 100 : value;
    return Math.round(scaled * 10) / 10;
}

export function formatPercent(value: number): string {
    return `${toPercent(value)}%`;
}

/**
 * Coverage is derived from covered/total rather than read from `coverage`,
 * because that ratio is unambiguous. Falls back to the reported value only
 * when total is missing.
 */
export function coveragePercent(coverage: SkillCoverage): number {
    if (coverage.total > 0) {
        return toPercent(coverage.covered / coverage.total);
    }
    return toPercent(coverage.coverage);
}

/**
 * Sort order of the backend's skill lists is not guaranteed by the type, so
 * every consumer sorts defensively on a copy.
 */
export function byDemand(skills: SkillStat[]): SkillStat[] {
    return [...skills].sort(
        (a, b) => b.frequency - a.frequency || b.job_count - a.job_count
    );
}

export function mostDemanded(skills: SkillStat[]): SkillStat | null {
    return byDemand(skills)[0] ?? null;
}

/**
 * `skill_gaps` is every market skill the user lacks — hundreds of entries
 * trailing off to skills seen in a single posting. Anything below this market
 * frequency is too rare to act on, so the dashboard treats 20% ("asked for in
 * at least a fifth of postings") as the floor for a gap worth surfacing.
 */
export const GAP_FREQUENCY_THRESHOLD = 0.2;

export function significantGaps(
    gaps: SkillStat[],
    threshold: number = GAP_FREQUENCY_THRESHOLD
): SkillStat[] {
    return byDemand(gaps).filter((gap) => gap.frequency >= threshold);
}

/** Gaps at or above this frequency are the ones worth learning first. */
export const GAP_HIGH_PRIORITY_THRESHOLD = 0.4;

export type GapPriority = "high" | "medium";

export function gapPriority(gap: SkillStat): GapPriority {
    return gap.frequency >= GAP_HIGH_PRIORITY_THRESHOLD ? "high" : "medium";
}

/**
 * The backend compares skills case-insensitively, so anything matching skills
 * across the two sides of the response has to do the same.
 */
export function skillKey(skill: string): string {
    return skill.trim().toLowerCase();
}

export function toSkillKeys(skills: SkillStat[]): Set<string> {
    return new Set((skills ?? []).map((stat) => skillKey(stat.skill)));
}

/**
 * Split a posting's extracted skills into the ones the user already has and
 * the ones they don't. Pure set arithmetic over data the backend returned —
 * no scoring is recomputed here.
 */
export function partitionJobSkills(
    jobSkills: string[],
    userSkillKeys: Set<string>
): { matched: string[]; missing: string[] } {
    const matched: string[] = [];
    const missing: string[] = [];

    for (const skill of jobSkills ?? []) {
        if (!skill?.trim()) continue;
        (userSkillKeys.has(skillKey(skill)) ? matched : missing).push(skill);
    }

    return {
        matched: matched.sort((a, b) => a.localeCompare(b)),
        missing: missing.sort((a, b) => a.localeCompare(b))
    };
}

/**
 * True when a sub-score carries no signal because it is identical for every
 * ranked job — currently the case for experience (no posting has an
 * experience_level) and for location whenever all postings share one.
 */
export function isConstantScore(values: number[]): boolean {
    if (values.length < 2) return false;
    return values.every((value) => Math.abs(value - values[0]) < 1e-9);
}
