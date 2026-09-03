'use client'

import React, {useEffect, useMemo, useState} from 'react'
import {
    CartesianGrid,
    Legend,
    ReferenceArea,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";

import {SkillStat} from "@/types/jobradar";
import {byDemand, significantGaps, toPercent} from "@/lib/market";
import {axisDomainMax, axisTicks, GridGeneratorArgs, interiorLines} from "@/lib/chart-ramp";
import PanelHeader from "@/components/Market/PanelHeader";
import PanelNote from "@/components/Market/PanelNote";
import {FrameRect, FrameRectProps} from "@/components/Market/PanelFrame";

interface SkillLandscapeProps {
    userSkills: SkillStat[];
    gaps: SkillStat[];
}

interface LandscapePoint {
    skill: string;
    percent: number;
    jobCount: number;
    lane: number;
}

/* Presentation constants. */
const DOT_RADIUS = 5.5;
const LABEL_LIMIT = 10;
const LABEL_MAX_CHARS = 18;
const GOLDEN_RATIO_CONJUGATE = 0.6180339887498949;

/**
 * Spread points vertically so equal-frequency skills don't sit on top of each
 * other. A golden-ratio (low-discrepancy) sequence over the index — derived,
 * never randomised, so the layout is stable across re-renders — puts
 * consecutive demand ranks far apart vertically and reads as an organic
 * scatter rather than a rigid grid. `phase` decorrelates the two series.
 */
function laneFor(index: number, phase: number): number {
    const t = (index * GOLDEN_RATIO_CONJUGATE + phase) % 1;
    return 0.7 + t * 8.6;
}

function toPoints(skills: SkillStat[], phase: number): LandscapePoint[] {
    return byDemand(skills).map((stat, index) => ({
        skill: stat.skill,
        percent: toPercent(stat.frequency),
        jobCount: stat.job_count,
        lane: laneFor(index, phase)
    }));
}

function truncateTo(label: string, maxChars: number): string {
    return label.length > maxChars
        ? `${label.slice(0, maxChars - 1)}…`
        : label;
}

/** Labels and the callout pill only fit once the container is desktop-ish. */
function useWideEnoughForLabels(): boolean {
    const [wide, setWide] = useState(false);

    useEffect(() => {
        const query = window.matchMedia("(min-width: 640px)");
        const update = () => setWide(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);

    return wide;
}

function LandscapeTooltip({active, payload}: {
    active?: boolean;
    payload?: Array<{ payload: LandscapePoint }>;
}) {
    const point = payload?.[0]?.payload;
    if (!active || !point) return null;

    return (
        <div className={"rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg shadow-black/30"}>
            <p className={"font-medium"}>{point.skill}</p>
            <p className={"font-mono text-[11px] text-muted-foreground"}>
                {point.jobCount.toLocaleString()} {point.jobCount === 1 ? "job" : "jobs"} · {point.percent}% of postings
            </p>
        </div>
    )
}

function LandscapeLegend() {
    return (
        <div className={"flex flex-wrap items-center gap-x-5 gap-y-1 pb-2"}>
            <span className={"flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-panel-green-ink-muted"}>
                <span aria-hidden className={"h-2.5 w-2.5 shrink-0 rounded-full bg-chart-ramp-3"} />
                On your CV
            </span>
            <span className={"flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-panel-green-ink-muted"}>
                <span aria-hidden className={"h-2.5 w-2.5 shrink-0 rounded-full border-2 border-accent-lime bg-chart-hollow"} />
                Not on your CV
            </span>
        </div>
    )
}

const PILL_HEIGHT = 20;
const PILL_LEADER = 14;

/** The inspo-style annotation: lime pill + leader line pointing at one dot. */
function CalloutPill({cx, cy, flip, name}: {
    cx: number;
    cy: number;
    flip: boolean;
    name: string;
}) {
    const label = truncateTo(name, 20).toUpperCase();
    const width = label.length * 6.4 + 18;
    const gap = DOT_RADIUS + 3;
    const lineEnd = flip ? cx - gap - PILL_LEADER : cx + gap + PILL_LEADER;
    const rectX = flip ? lineEnd - width : lineEnd;

    return (
        <g>
            <line
                x1={flip ? cx - gap : cx + gap}
                y1={cy}
                x2={lineEnd}
                y2={cy}
                stroke={"var(--accent-lime)"}
                strokeWidth={1.5}
            />
            <rect
                x={rectX}
                y={cy - PILL_HEIGHT / 2}
                width={width}
                height={PILL_HEIGHT}
                rx={PILL_HEIGHT / 2}
                fill={"var(--accent-lime)"}
            />
            <text
                x={rectX + width / 2}
                y={cy + 3.5}
                textAnchor={"middle"}
                fontSize={9.5}
                fontWeight={700}
                letterSpacing={"0.06em"}
                fontFamily={"var(--font-jetbrains-mono), monospace"}
                fill={"var(--accent-lime-ink)"}
            >
                {label}
            </text>
        </g>
    )
}

interface DotShapeProps {
    cx?: number;
    cy?: number;
    payload?: LandscapePoint;
}

interface LandscapeDotOptions {
    hollow: boolean;
    colour: string;
    label?: "plain" | "callout";
    flip: boolean;
}

/**
 * One scatter mark. Colour = ownership: solid orange discs are skills on the
 * CV, hollow lime rings (with a faint disc so they stay visible on the green)
 * are skills the market wants that the CV lacks. The annotated callout point
 * is filled solid lime to tie it to its pill.
 */
function LandscapeDot({cx, cy, payload, hollow, colour, label, flip}: DotShapeProps & LandscapeDotOptions) {
    if (cx == null || cy == null || !payload) return <g />;

    const calloutDot = label === "callout";

    return (
        <g>
            <circle
                cx={cx}
                cy={cy}
                r={DOT_RADIUS}
                fill={
                    calloutDot
                        ? "var(--accent-lime)"
                        : hollow ? "var(--chart-hollow-fill)" : colour
                }
                stroke={hollow ? colour : "var(--panel-green)"}
                strokeWidth={hollow && !calloutDot ? 2 : 1}
            />
            {label === "plain" && (
                <text
                    x={flip ? cx - DOT_RADIUS - 6 : cx + DOT_RADIUS + 6}
                    y={cy + 3}
                    textAnchor={flip ? "end" : "start"}
                    fontSize={10}
                    fontFamily={"var(--font-jetbrains-mono), monospace"}
                    fill={hollow ? "var(--panel-green-ink-muted)" : "var(--panel-green-ink)"}
                >
                    {truncateTo(payload.skill, LABEL_MAX_CHARS)}
                </text>
            )}
            {label === "callout" && (
                <CalloutPill cx={cx} cy={cy} flip={flip} name={payload.skill} />
            )}
        </g>
    )
}

/**
 * Answers: "where do my skills sit against what this market asks for?"
 *
 * Deliberately one axis, not two. `job_count` and `frequency` are the same
 * measurement (frequency = job_count / jobs_analyzed), so plotting one against
 * the other would only ever draw a straight line. The real second dimension in
 * this data is categorical — whether the skill is on the user's CV — so it is
 * encoded as filled vs hollow, with the vertical axis used purely to stop
 * equal-frequency points overlapping.
 */
const SkillLandscape = ({userSkills, gaps}: SkillLandscapeProps) => {
    const mine = useMemo(() => toPoints(userSkills ?? [], 0), [userSkills]);
    const missing = useMemo(() => toPoints(significantGaps(gaps ?? []), 0.5), [gaps]);
    const showLabels = useWideEnoughForLabels();

    const maxPercent = useMemo(
        () => Math.max(0, ...mine.map((p) => p.percent), ...missing.map((p) => p.percent)),
        [mine, missing]
    );

    /*
     * Direct labels are capped to the most-demanded few — with ~35 points,
     * labelling everything collides; everything else stays in the tooltip.
     * The single most-demanded missing skill gets the lime callout instead.
     */
    const labelled = useMemo(() => {
        const top = [...mine, ...missing]
            .sort((a, b) => b.percent - a.percent)
            .slice(0, LABEL_LIMIT)
            .map((point) => point.skill);
        return new Set(top);
    }, [mine, missing]);

    if (mine.length === 0 && missing.length === 0) return null;

    const xMax = axisDomainMax(maxPercent);
    const calloutSkill = missing[0]?.skill;

    const labelKind = (point: LandscapePoint): "plain" | "callout" | undefined => {
        if (!showLabels) return undefined;
        if (point.skill === calloutSkill) return "callout";
        return labelled.has(point.skill) ? "plain" : undefined;
    };

    /* Points in the right ~third get their annotation on the left, and vice versa. */
    const flips = (point: LandscapePoint): boolean => point.percent > xMax * 0.62;

    return (
        <section className={"chart-panel chart-panel-green flex flex-col gap-6 px-5 py-7 sm:px-8"}>
            <PanelHeader
                title={"Market skill landscape"}
                qualifier={""}
                lead={"Every dot is one skill — the further right it sits, the more jobs ask for it"}
            />

            <div className={"h-[340px] w-full"}>
                <ResponsiveContainer width={"100%"} height={"100%"}>
                    <ScatterChart margin={{top: 8, right: 18, bottom: 4, left: 18}}>
                        <CartesianGrid
                            stroke={"var(--panel-green-grid)"}
                            horizontalCoordinatesGenerator={({offset}: GridGeneratorArgs) =>
                                interiorLines(offset?.top ?? 0, offset?.height ?? 0)}
                            verticalCoordinatesGenerator={({offset}: GridGeneratorArgs) =>
                                interiorLines(offset?.left ?? 0, offset?.width ?? 0)}
                        />
                        <XAxis
                            type={"number"}
                            dataKey={"percent"}
                            domain={[0, xMax]}
                            ticks={axisTicks(xMax)}
                            unit={"%"}
                            name={"Market demand"}
                            tick={{
                                fontSize: 10,
                                fill: "var(--panel-green-ink-muted)",
                                fontFamily: "var(--font-jetbrains-mono), monospace"
                            }}
                            tickMargin={8}
                            axisLine={false}
                            tickLine={false}
                            height={46}
                            label={{
                                value: "SHARE OF POSTINGS REQUESTING THE SKILL (%)",
                                position: "insideBottom",
                                offset: 0,
                                style: {
                                    fontSize: 9,
                                    letterSpacing: "0.14em",
                                    fill: "var(--panel-green-ink-muted)",
                                    fontFamily: "var(--font-jetbrains-mono), monospace"
                                }
                            }}
                        />
                        <YAxis
                            type={"number"}
                            dataKey={"lane"}
                            domain={[0, 10]}
                            width={24}
                            tick={false}
                            tickLine={false}
                            axisLine={false}
                            label={{
                                value: "SKILLS - SPACING ONLY",
                                angle: -90,
                                position: "insideLeft",
                                offset: 6,
                                style: {
                                    textAnchor: "middle",
                                    fontSize: 9,
                                    letterSpacing: "0.14em",
                                    fill: "var(--panel-green-ink-muted)",
                                    fontFamily: "var(--font-jetbrains-mono), monospace"
                                }
                            }}
                        />
                        {/* The boxed plot frame, anchored to the data area. */}
                        <ReferenceArea
                            x1={0}
                            x2={xMax}
                            y1={0}
                            y2={10}
                            shape={(props: FrameRectProps) => <FrameRect {...props} />}
                        />
                        <Tooltip
                            content={<LandscapeTooltip />}
                            cursor={{stroke: "var(--panel-green-frame)", strokeDasharray: "3 3"}}
                        />
                        <Legend
                            verticalAlign={"top"}
                            align={"left"}
                            content={<LandscapeLegend />}
                        />
                        <Scatter
                            name={"On your CV"}
                            data={mine}
                            fill={"var(--chart-ramp-3)"}
                            isAnimationActive={false}
                            shape={(props: DotShapeProps) => (
                                <LandscapeDot
                                    {...props}
                                    hollow={false}
                                    colour={"var(--chart-ramp-3)"}
                                    label={props.payload ? labelKind(props.payload) : undefined}
                                    flip={props.payload ? flips(props.payload) : false}
                                />
                            )}
                        />
                        <Scatter
                            name={"Not on your CV"}
                            data={missing}
                            fill={"var(--chart-hollow-fill)"}
                            isAnimationActive={false}
                            shape={(props: DotShapeProps) => (
                                <LandscapeDot
                                    {...props}
                                    hollow
                                    colour={"var(--accent-lime)"}
                                    label={props.payload ? labelKind(props.payload) : undefined}
                                    flip={props.payload ? flips(props.payload) : false}
                                />
                            )}
                        />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>

            <PanelNote
                points={[
                    <>Each dot is one skill — the further right it sits, the more of these postings ask for it (a dot at 40% means 4 in 10 jobs).</>,
                    <>Solid orange dots are skills already on your CV; lime rings are ones you don&apos;t have yet.</>,
                    <>Up and down positions mean nothing — they only keep dots from covering each other.</>,
                    <>The lime tag marks the most-wanted skill missing from your CV. Hover any dot for its exact numbers.</>
                ]}
            />
        </section>
    )
}
export default SkillLandscape
