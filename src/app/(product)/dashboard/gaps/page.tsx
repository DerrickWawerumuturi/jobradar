'use client'

import React, {useMemo, useState} from 'react'
import {useRouter} from "next/navigation";
import {BriefcaseIcon, HashIcon, TrendingUpIcon, TypeIcon} from "lucide-react";

import {cn} from "@/lib/utils";
import {useAnalysis} from "@/lib/analysis-store";
import {byDemand, skillKey, toPercent, toSkillKeys} from "@/lib/market";
import SkillBadge from "@/components/dashboard/SkillBadge";
import {DemandMeter, EmptyScan, GRID_FOOT, GRID_TD, GridTh, PageBar, ScoreChip} from "@/components/dashboard/bits";
import CompanyLogo from "@/components/dashboard/CompanyLogo";
import {OpportunityRow, toOpportunities} from "@/lib/dashboard-data";

const DEMAND_LIMIT = 15;
const ROLE_CHIPS = 3;

/* Attio's multi-colored category chips: each role gets a stable soft tint,
 * so the same role reads as the same color all the way down the table. */
const CHIP_TONES = [
    "bg-success/15 text-success",
    "bg-chart-ramp-2/15 text-chart-ramp-2",
    "bg-accent-lime/15 text-accent-lime",
    "bg-primary/15 text-primary",
    "bg-chart-ramp-1/15 text-chart-ramp-1",
    "bg-foreground/8 text-foreground/80"
];

/** Chip = a real job. Hover shows its card; click opens the breakdown. */
function JobChip({row}: { row: OpportunityRow }) {
    const router = useRouter();
    const [card, setCard] = useState<{ left: number; top: number } | null>(null);
    const tone = CHIP_TONES[
        [...row.role].reduce((sum, char) => sum + char.charCodeAt(0), 0) % CHIP_TONES.length
    ];
    const label = row.role.length > 22 ? `${row.role.slice(0, 21)}…` : row.role;

    return (
        <span
            onMouseEnter={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setCard({
                    left: Math.min(rect.left, window.innerWidth - 300),
                    top: Math.min(rect.bottom + 8, window.innerHeight - 90)
                });
            }}
            onMouseLeave={() => setCard(null)}
        >
            <button
                onClick={() => router.push(`/dashboard/opportunities?sel=${encodeURIComponent(row.key)}`)}
                className={cn("inline-flex cursor-pointer whitespace-nowrap rounded-[4px] px-1.5 py-px font-mono text-[10.5px] transition-opacity hover:opacity-80", tone)}
            >
                {label}
            </button>
            {card && (
                <span
                    style={{position: "fixed", left: card.left, top: card.top}}
                    className={"z-50 flex w-72 items-center gap-2.5 rounded-xl border border-input bg-popover p-3 shadow-2xl"}
                >
                    <CompanyLogo company={row.company ?? row.role} url={row.url} />
                    <span className={"min-w-0 flex-1"}>
                        <span className={"block truncate text-[13px] font-medium"}>{row.role}</span>
                        <span className={"block truncate font-mono text-[10.5px] text-muted-foreground"}>
                            {[row.company, row.location].filter(Boolean).join(" · ")}
                        </span>
                    </span>
                    <ScoreChip value={row.match} />
                </span>
            )}
        </span>
    )
}

export default function GapsPage() {
    const {analysis, hydrated} = useAnalysis();

    const market = analysis?.market;
    const haveKeys = useMemo(() => toSkillKeys(market?.user_skill_presence ?? []), [market]);
    const demand = useMemo(() => byDemand(market?.top_skills ?? []).slice(0, DEMAND_LIMIT), [market]);

    // Which scanned jobs actually list each skill, best match first, one chip
    // per distinct role title.
    const jobsBySkill = useMemo(() => {
        const map = new Map<string, OpportunityRow[]>();
        if (!analysis) return map;
        for (const row of toOpportunities(analysis)) {
            for (const skill of [...row.have, ...row.missing]) {
                const key = skillKey(skill);
                const jobs = map.get(key) ?? [];
                if (!jobs.some((j) => j.role === row.role)) jobs.push(row);
                map.set(key, jobs);
            }
        }
        return map;
    }, [analysis]);

    if (!hydrated) return null;

    return (
        <div className={"flex min-h-screen flex-col"}>
            <PageBar
                title={"What the market wants"}
                meta={market ? `counted from ${market.jobs_analyzed} jobs` : undefined}
            />

            {!market ? (
                <div className={"px-4 py-8 sm:px-8"}>
                    <EmptyScan message={"No scan yet. Demand numbers come from real postings, so run one first."} />
                </div>
            ) : (
                <div className={"flex-1 overflow-x-auto"}>
                    <table className={"w-full border-collapse"}>
                        <thead>
                            <tr>
                                <GridTh className={"w-[5%] pl-4 text-right sm:pl-5"}>#</GridTh>
                                <GridTh icon={TypeIcon} className={"w-[22%]"}>Skill</GridTh>
                                <GridTh icon={BriefcaseIcon} className={"hidden w-[47%] md:table-cell"}>Roles asking</GridTh>
                                <GridTh icon={TrendingUpIcon} className={"w-[16%]"}>Demand</GridTh>
                                <GridTh icon={HashIcon} className={"hidden w-[10%] sm:table-cell"}>Jobs</GridTh>
                            </tr>
                        </thead>
                        <tbody>
                            {demand.map((stat, index) => {
                                const have = haveKeys.has(skillKey(stat.skill));
                                const percent = toPercent(stat.frequency);
                                const jobs = jobsBySkill.get(skillKey(stat.skill)) ?? [];
                                return (
                                    <tr key={stat.skill} className={"transition-colors hover:bg-foreground/3"}>
                                        <td className={cn(GRID_TD, "pl-4 text-right font-mono text-[10.5px] tabular-nums text-muted-foreground/60 sm:pl-5")}>
                                            {index + 1}
                                        </td>
                                        <td className={GRID_TD}>
                                            <span className={"flex items-center gap-2.5"}>
                                                <SkillBadge skill={stat.skill} tone={have ? "have" : "gap"} />
                                                <span className={"truncate text-[13px] font-medium"}>{stat.skill}</span>
                                            </span>
                                        </td>
                                        <td className={cn(GRID_TD, "hidden md:table-cell")}>
                                            <span className={"flex flex-wrap items-center gap-1.5"}>
                                                {jobs.slice(0, ROLE_CHIPS).map((job) => <JobChip key={job.key} row={job} />)}
                                                {jobs.length > ROLE_CHIPS && (
                                                    <span className={"font-mono text-[10px] text-muted-foreground/70"}>
                                                        +{jobs.length - ROLE_CHIPS}
                                                    </span>
                                                )}
                                                {jobs.length === 0 && <span className={"text-muted-foreground/50"}>—</span>}
                                            </span>
                                        </td>
                                        <td className={GRID_TD}>
                                            <div className={"flex items-center gap-2.5"}>
                                                <DemandMeter percent={percent} tone={have ? "have" : "gap"} />
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
                                <td className={cn(GRID_FOOT, "pl-4 sm:pl-5")} />
                                <td className={GRID_FOOT}>
                                    <b className={"font-medium text-foreground"}>{demand.length}</b> count
                                </td>
                                <td className={cn(GRID_FOOT, "hidden md:table-cell")}>hover a role, click it for the full breakdown</td>
                                <td className={GRID_FOOT}>
                                    <span className={"text-success"}>green</span> on your CV · <span className={"text-primary"}>orange</span> missing
                                </td>
                                <td className={cn(GRID_FOOT, "hidden sm:table-cell")} />
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    )
}
