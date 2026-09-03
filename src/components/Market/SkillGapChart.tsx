import React from 'react'
import {SkillStat} from "@/types/jobradar";
import {
    GAP_FREQUENCY_THRESHOLD,
    gapPriority,
    significantGaps,
    toPercent
} from "@/lib/market";
import PanelHeader from "@/components/Market/PanelHeader";
import PanelNote from "@/components/Market/PanelNote";

interface SkillGapChartProps {
    gaps: SkillStat[];
    jobsAnalyzed: number;
}

/**
 * A ranked list with an inline meter rather than a chart: each row has to carry
 * a reason as well as a magnitude, which a bar chart has nowhere to put.
 */
function GapRow({gap, jobsAnalyzed, leading}: {
    gap: SkillStat;
    jobsAnalyzed: number;
    leading: boolean;
}) {
    const percent = toPercent(gap.frequency);
    /* Meter colour tracks priority: high burns orange → red, medium stays yellow → amber. */
    const meterGradient = gapPriority(gap) === "high"
        ? "linear-gradient(90deg, var(--chart-ramp-3), var(--chart-ramp-5))"
        : "linear-gradient(90deg, var(--chart-ramp-1), var(--chart-ramp-2))";

    return (
        <li className={"flex flex-col gap-1.5 border-b border-border py-3 last:border-b-0"}>
            <div className={"flex min-w-0 items-baseline justify-between gap-4"}>
                <span className={"min-w-0 truncate font-medium"} title={gap.skill}>{gap.skill}</span>
                <span className={"shrink-0 font-mono text-xs tabular-nums text-muted-foreground"}>
                    <span className={"font-medium text-foreground"}>{percent}%</span>
                    {" "}· {gap.job_count.toLocaleString()} {gap.job_count === 1 ? "job" : "jobs"}
                </span>
            </div>

            <div
                className={"h-1.5 w-full overflow-hidden rounded-full bg-muted"}
                role={"presentation"}
            >
                <div
                    className={"h-full rounded-full"}
                    style={{width: `${percent}%`, background: meterGradient}}
                />
            </div>

            <p className={"text-xs text-muted-foreground"}>
                Requested in {gap.job_count} of {jobsAnalyzed} postings analyzed
                {leading && " — the most common skill missing from your CV"}.
            </p>
        </li>
    )
}

/** Answers: "what important skills does the market want that I don't have?" */
const SkillGapChart = ({gaps, jobsAnalyzed}: SkillGapChartProps) => {
    const ranked = significantGaps(gaps ?? []);
    const high = ranked.filter((gap) => gapPriority(gap) === "high");
    const medium = ranked.filter((gap) => gapPriority(gap) === "medium");

    return (
        <section className={"chart-panel chart-panel-green flex flex-col gap-6 px-5 py-7 sm:px-8"}>
            <PanelHeader
                title={"Skill gaps"}
                qualifier={"missing from your CV"}
                lead={<>Skills that at least {toPercent(GAP_FREQUENCY_THRESHOLD)}% of these job postings ask for but your CV doesn&apos;t mention</>}
            />

            {ranked.length === 0 ? (
                <p className={"rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground"}>
                    No skill appears in {toPercent(GAP_FREQUENCY_THRESHOLD)}% or more of
                    these postings without already being on your CV.
                </p>
            ) : (
                <div className={"flex flex-col gap-5"}>
                    {[
                        {label: "High priority", items: high},
                        {label: "Medium priority", items: medium}
                    ].filter((bucket) => bucket.items.length > 0).map((bucket) => (
                        <div key={bucket.label} className={"flex flex-col gap-2"}>
                            <h3 className={"font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"}>
                                {bucket.label}
                                {" "}
                                <span className={"text-accent-lime"}>({bucket.items.length})</span>
                            </h3>
                            <ul className={"rounded-xl border border-border bg-card px-4 py-1"}>
                                {bucket.items.map((gap) => (
                                    <GapRow
                                        key={gap.skill}
                                        gap={gap}
                                        jobsAnalyzed={jobsAnalyzed}
                                        leading={gap === ranked[0]}
                                    />
                                ))}
                            </ul>
                        </div>
                    ))}

                    <PanelNote
                        points={[
                            <>Each row is a skill employers keep asking for that your CV doesn&apos;t mention.</>,
                            <>The percentage and the coloured bar show how many postings want it: 30% means 3 in 10 jobs.</>,
                            <>Most-requested comes first, so the top row is usually the best thing to learn next.</>,
                            <>&quot;High priority&quot; simply means more postings ask for it than the &quot;medium&quot; ones.</>
                        ]}
                    />
                </div>
            )}
        </section>
    )
}
export default SkillGapChart
