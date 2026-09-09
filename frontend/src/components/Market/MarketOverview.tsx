import React from 'react'
import {MarketAnalysis} from "@/types/jobradar";
import MarketCard from "@/components/Market/MarketCard";
import {
    coveragePercent,
    formatPercent,
    GAP_FREQUENCY_THRESHOLD,
    mostDemanded,
    significantGaps,
    toPercent
} from "@/lib/market";

interface MarketOverviewProps {
    market: MarketAnalysis;
}

/**
 * Answers: "what was actually analyzed, and where do I stand at a glance?"
 * Every tile here reads straight from the backend response — no derived
 * scoring, no invented fields.
 */
const MarketOverview = ({market}: MarketOverviewProps) => {
    const {jobs_analyzed, skill_coverage, skill_gaps, top_skills, user_skill_presence} = market;

    const skills = top_skills ?? [];
    const mySkills = user_skill_presence ?? [];
    const leader = mostDemanded(skills);
    const gaps = significantGaps(skill_gaps ?? []);

    return (
        <section className={"flex flex-col gap-4"}>
            <div className={"flex items-baseline justify-between gap-4"}>
                <h2 className={"flex items-center gap-2.5 font-heading text-base font-bold uppercase tracking-[0.06em]"}>
                    <span aria-hidden className={"h-3.5 w-1 shrink-0 bg-primary"} />
                    Market overview
                </h2>
                <p className={"font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground"}>
                    Based on {jobs_analyzed.toLocaleString()} job postings
                </p>
            </div>

            <div className={"grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5"}>
                {/* The five tiles sweep the warm ramp left to right, yellow → red. */}
                <MarketCard
                    label={"Jobs analyzed"}
                    value={jobs_analyzed.toLocaleString()}
                    hint={"postings in this snapshot"}
                    className={"[--tile-accent:var(--chart-ramp-1)]"}
                />
                <MarketCard
                    label={"Skill coverage"}
                    value={`${coveragePercent(skill_coverage)}%`}
                    hint={`${skill_coverage.covered} of ${skill_coverage.total} tracked skills`}
                    accent
                    className={"[--tile-accent:var(--chart-ramp-2)]"}
                />
                <MarketCard
                    label={"Most demanded"}
                    value={leader ? leader.skill : "—"}
                    hint={
                        leader
                            ? `${formatPercent(leader.frequency)} of jobs · ${leader.job_count.toLocaleString()} postings`
                            : "no skills returned"
                    }
                    className={"[--tile-accent:var(--chart-ramp-3)]"}
                />
                <MarketCard
                    label={"Your skills in market"}
                    value={mySkills.length}
                    hint={"matched against this market"}
                    className={"[--tile-accent:var(--chart-ramp-4)]"}
                />
                <MarketCard
                    label={"Skill gaps"}
                    value={gaps.length}
                    hint={`missing, in ${toPercent(GAP_FREQUENCY_THRESHOLD)}%+ of jobs`}
                    className={"[--tile-accent:var(--chart-ramp-5)]"}
                />
            </div>
        </section>
    )
}
export default MarketOverview
