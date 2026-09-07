'use client'

import React, {useMemo} from 'react'
import {HashIcon, TrendingUpIcon, TypeIcon, UserIcon} from "lucide-react";

import {cn} from "@/lib/utils";
import {useAnalysis} from "@/lib/analysis-store";
import {byDemand, coveragePercent, significantGaps, skillKey, toPercent, toSkillKeys} from "@/lib/market";
import {EmptyScan, GRID_FOOT, GRID_TD, GridTh, PageBar, SectionLabel, TagChip} from "@/components/dashboard/bits";

const DEMAND_LIMIT = 15;

export default function GapsPage() {
    const {analysis, hydrated} = useAnalysis();

    const market = analysis?.market;
    const haveKeys = useMemo(() => toSkillKeys(market?.user_skill_presence ?? []), [market]);
    const demand = useMemo(() => byDemand(market?.top_skills ?? []).slice(0, DEMAND_LIMIT), [market]);
    const topGap = useMemo(() => significantGaps(market?.skill_gaps ?? [])[0] ?? null, [market]);

    if (!hydrated) return null;

    const strongest = byDemand(market?.user_skill_presence ?? []).slice(0, 2);
    const gapCount = demand.filter((stat) => !haveKeys.has(skillKey(stat.skill))).length;

    const coverage = market ? coveragePercent(market.skill_coverage) : 0;
    // The coverage lift is only claimable when the gap is one of the skills
    // coverage is measured against.
    const lift = market && topGap && market.top_skills.some((s) => skillKey(s.skill) === skillKey(topGap.skill))
        ? toPercent((market.skill_coverage.covered + 1) / market.skill_coverage.total)
        : null;

    return (
        <div className={"flex min-h-screen flex-col"}>
            <PageBar
                title={"What the market wants"}
                meta={market ? `counted from ${market.jobs_analyzed} postings` : undefined}
            />

            {!market ? (
                <div className={"px-4 py-8 sm:px-8"}>
                    <EmptyScan message={"No scan yet — demand numbers are counted from real postings, so run one first."} />
                </div>
            ) : (
                <div className={"grid flex-1 items-start lg:grid-cols-[1.25fr_1fr]"}>
                    <div className={"overflow-x-auto"}>
                        <table className={"w-full border-collapse"}>
                            <thead>
                                <tr>
                                    <GridTh icon={TypeIcon} className={"w-[28%] pl-4 sm:pl-5"}>Skill</GridTh>
                                    <GridTh icon={UserIcon} className={"w-[14%]"}>You</GridTh>
                                    <GridTh icon={TrendingUpIcon} className={"w-[42%]"}>Demand</GridTh>
                                    <GridTh icon={HashIcon} className={"hidden w-[16%] sm:table-cell"}>Postings</GridTh>
                                </tr>
                            </thead>
                            <tbody>
                                {demand.map((stat) => {
                                    const have = haveKeys.has(skillKey(stat.skill));
                                    const percent = toPercent(stat.frequency);
                                    return (
                                        <tr key={stat.skill} className={"transition-colors hover:bg-foreground/3"}>
                                            <td className={cn(GRID_TD, "pl-4 font-mono text-xs font-medium sm:pl-5")}>{stat.skill}</td>
                                            <td className={GRID_TD}>
                                                <TagChip tone={have ? "have" : "gap"}>{have ? "✓ yes" : "△ gap"}</TagChip>
                                            </td>
                                            <td className={GRID_TD}>
                                                <div className={"flex items-center gap-2.5"}>
                                                    <div className={"h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/8"}>
                                                        <div
                                                            className={cn("h-full rounded-full", have ? "bg-success" : "bg-primary")}
                                                            style={{width: `${percent}%`}}
                                                        />
                                                    </div>
                                                    <span className={"w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground"}>
                                                        {Math.round(percent)}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className={cn(GRID_TD, "hidden font-mono text-[11px] tabular-nums text-muted-foreground sm:table-cell")}>
                                                {stat.job_count}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td className={cn(GRID_FOOT, "pl-4 sm:pl-5")}>
                                        <b className={"font-medium text-foreground"}>{demand.length}</b> count
                                    </td>
                                    <td className={GRID_FOOT}>{gapCount} gaps</td>
                                    <td className={GRID_FOOT}>% of {market.jobs_analyzed} postings</td>
                                    <td className={cn(GRID_FOOT, "hidden sm:table-cell")} />
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className={"flex flex-col gap-4 border-t border-border p-4 sm:p-6 lg:min-h-full lg:border-l lg:border-t-0"}>
                        {topGap && (
                            <div className={"rounded-lg border border-primary/35 bg-primary/6 px-5 py-4"}>
                                <SectionLabel className={"text-primary"}>If you learn one thing</SectionLabel>
                                <p className={"mt-2 text-[13.5px] leading-relaxed text-muted-foreground"}>
                                    <b className={"text-foreground"}>{topGap.skill}</b> appears in{" "}
                                    <b className={"text-foreground"}>{Math.round(toPercent(topGap.frequency))}%</b> of
                                    the postings analyzed — the most-demanded skill your CV doesn&apos;t show.
                                    {lift != null && <>
                                        {" "}Adding it lifts your profile coverage from{" "}
                                        <b className={"text-foreground"}>{Math.round(coverage)}% to {Math.round(lift)}%</b>.
                                    </>}
                                </p>
                            </div>
                        )}
                        {strongest.length > 0 && (
                            <div className={"rounded-lg border border-success/35 bg-success/6 px-5 py-4"}>
                                <SectionLabel className={"text-success"}>Already paying off</SectionLabel>
                                <p className={"mt-2 text-[13.5px] leading-relaxed text-muted-foreground"}>
                                    {strongest.map((stat, index) => (
                                        <React.Fragment key={stat.skill}>
                                            {index > 0 && " and "}
                                            <b className={"text-foreground"}>{stat.skill}</b> is asked for in{" "}
                                            <b className={"text-foreground"}>{Math.round(toPercent(stat.frequency))}%</b>
                                        </React.Fragment>
                                    ))}
                                    {" "}of the postings analyzed — your CV already carries the market&apos;s
                                    most-wanted skills.
                                </p>
                            </div>
                        )}
                        <p aria-hidden className={"-rotate-2 self-start font-hand text-xl text-primary/90"}>
                            every number here is counted from real postings, not vibes
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
