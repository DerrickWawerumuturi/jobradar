'use client'

import React, {useEffect, useMemo, useState} from 'react'
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    ReferenceArea,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";

import {SkillStat} from "@/types/jobradar";
import {byDemand, toPercent} from "@/lib/market";
import {axisDomainMax, axisTicks, GridGeneratorArgs, interiorLines, rampColour} from "@/lib/chart-ramp";
import {FrameRect, FrameRectProps} from "@/components/Market/PanelFrame";
import {Button} from "@/components/ui/button";

const ROW_HEIGHT = 36;
const LABEL_MAX_CHARS = 26;
const AXIS_WIDTH = 200;
/* Narrow screens get a tighter category axis so bars keep most of the width. */
const COMPACT_LABEL_MAX_CHARS = 16;
const COMPACT_AXIS_WIDTH = 124;

/** Purely presentational: tracks the small-screen breakpoint for axis sizing. */
function useCompactAxis(): boolean {
    const [compact, setCompact] = useState(false);

    useEffect(() => {
        const query = window.matchMedia("(max-width: 640px)");
        const update = () => setCompact(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);

    return compact;
}

interface SkillBarChartProps {
    skills: SkillStat[];
    /** How many bars to show before the "show all" toggle is used. */
    initialCount?: number;
    /** Any CSS colour; defaults to the theme's chart hue. */
    fill?: string;
    /** Bars are outlined rather than filled — used for skills the user lacks. */
    outlined?: boolean;
}

interface DemandDatum {
    skill: string;
    jobCount: number;
    percent: number;
}

function truncateTo(label: string, maxChars: number): string {
    return label.length > maxChars
        ? `${label.slice(0, maxChars - 1)}…`
        : label;
}

function SkillTooltip({active, payload}: {
    active?: boolean;
    payload?: Array<{ payload: DemandDatum }>;
}) {
    const datum = payload?.[0]?.payload;
    if (!active || !datum) return null;

    return (
        <div className={"rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg shadow-black/30"}>
            <p className={"font-medium"}>{datum.skill}</p>
            <p className={"font-mono text-[11px] text-muted-foreground"}>
                {datum.jobCount.toLocaleString()} {datum.jobCount === 1 ? "job" : "jobs"} · {datum.percent}% of postings
            </p>
        </div>
    )
}

/**
 * Shared horizontal bar chart for the three skill-frequency views (market
 * demand, the user's own skills, and gaps).
 *
 * Magnitude across named categories, so: horizontal bars, one hue per chart
 * (length already encodes the value), no legend. Percentage is direct-labelled
 * because it is the measure being ranked; the raw job count lives in the
 * tooltip so each bar carries a single number.
 */
const SkillBarChart = ({
    skills,
    initialCount = 12,
    fill = "var(--chart-3)",
    outlined = false
}: SkillBarChartProps) => {
    const [showAll, setShowAll] = useState(false);
    const compact = useCompactAxis();

    const ranked = useMemo<DemandDatum[]>(
        () => byDemand(skills ?? []).map((stat) => ({
            skill: stat.skill,
            jobCount: stat.job_count,
            percent: toPercent(stat.frequency)
        })),
        [skills]
    );

    if (ranked.length === 0) return null;

    const visible = showAll ? ranked : ranked.slice(0, initialCount);
    const hiddenCount = ranked.length - visible.length;
    /* Bars ride the warm ramp scaled to this chart's own maximum. */
    const maxPercent = Math.max(0, ...ranked.map((datum) => datum.percent));
    /*
     * The axis is scaled to the data, not locked to 0–100%: bars stretch the
     * full width so differences between skills stay visible.
     */
    const xMax = axisDomainMax(maxPercent);

    return (
        <div className={"flex flex-col gap-3"}>
            <div style={{height: visible.length * ROW_HEIGHT + 84}}>
                <ResponsiveContainer width={"100%"} height={"100%"}>
                    <BarChart
                        data={visible}
                        layout={"vertical"}
                        margin={{top: 14, right: 56, bottom: 10, left: 8}}
                        barCategoryGap={8}
                    >
                        {/* Fine square "graph paper" inside the boxed plot frame. */}
                        <CartesianGrid
                            stroke={"var(--chart-grid, var(--border))"}
                            horizontalCoordinatesGenerator={({offset}: GridGeneratorArgs) =>
                                interiorLines(offset?.top ?? 0, offset?.height ?? 0)}
                            verticalCoordinatesGenerator={({offset}: GridGeneratorArgs) =>
                                interiorLines(offset?.left ?? 0, offset?.width ?? 0)}
                        />
                        {/* No coordinates = the full data area, so the box hugs the plot. */}
                        <ReferenceArea
                            shape={(props: FrameRectProps) => <FrameRect {...props} />}
                        />
                        <XAxis
                            type={"number"}
                            domain={[0, xMax]}
                            ticks={axisTicks(xMax)}
                            unit={"%"}
                            tick={{
                                fontSize: 10,
                                fill: "var(--muted-foreground)",
                                fontFamily: "var(--font-jetbrains-mono), monospace"
                            }}
                            axisLine={false}
                            tickLine={false}
                            height={44}
                            label={{
                                value: "SHARE OF POSTINGS REQUESTING THE SKILL (%)",
                                position: "insideBottom",
                                offset: 0,
                                style: {
                                    fontSize: 9,
                                    letterSpacing: "0.14em",
                                    fill: "var(--muted-foreground)",
                                    fontFamily: "var(--font-jetbrains-mono), monospace"
                                }
                            }}
                        />
                        <YAxis
                            type={"category"}
                            dataKey={"skill"}
                            width={compact ? COMPACT_AXIS_WIDTH : AXIS_WIDTH}
                            tick={{fontSize: compact ? 11 : 12, fill: "var(--foreground)"}}
                            tickFormatter={(label: string) =>
                                truncateTo(label, compact ? COMPACT_LABEL_MAX_CHARS : LABEL_MAX_CHARS)}
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                        />
                        <Tooltip
                            content={<SkillTooltip />}
                            cursor={{fill: "var(--muted)", opacity: 0.4}}
                        />
                        <Bar
                            dataKey={"percent"}
                            fill={outlined ? "var(--chart-hollow-fill)" : fill}
                            stroke={outlined ? fill : undefined}
                            strokeWidth={outlined ? 1.5 : 0}
                            radius={[0, 2, 2, 0]}
                            maxBarSize={18}
                        >
                            {/* Colour = magnitude: each bar steps the yellow → red ramp. */}
                            {visible.map((datum) => (
                                <Cell
                                    key={datum.skill}
                                    fill={outlined
                                        ? "var(--chart-hollow-fill)"
                                        : rampColour(datum.percent, maxPercent)}
                                    stroke={outlined
                                        ? rampColour(datum.percent, maxPercent)
                                        : undefined}
                                />
                            ))}
                            <LabelList
                                dataKey={"percent"}
                                position={"right"}
                                formatter={(value: unknown) => (value == null ? "" : `${value}%`)}
                                className={"fill-muted-foreground"}
                                fontSize={10}
                                fontFamily={"var(--font-jetbrains-mono), monospace"}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {(hiddenCount > 0 || showAll) && (
                <div>
                    <Button
                        variant={"outline"}
                        size={"sm"}
                        onClick={() => setShowAll((prev) => !prev)}
                    >
                        {showAll ? `Show top ${initialCount}` : `Show all ${ranked.length}`}
                    </Button>
                </div>
            )}
        </div>
    )
}
export default SkillBarChart
