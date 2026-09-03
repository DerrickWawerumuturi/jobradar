'use client'

import React, {useMemo, useState} from 'react'
import {ChevronDownIcon, ExternalLinkIcon} from "lucide-react";

import {RankedJob, SkillStat} from "@/types/jobradar";
import {cn} from "@/lib/utils";
import {isConstantScore, partitionJobSkills, toPercent, toSkillKeys} from "@/lib/market";
import {Button} from "@/components/ui/button";
import PanelNote from "@/components/Market/PanelNote";

interface JobMatchesProps {
    jobs: RankedJob[];
    /** The user's skills, used to split each posting's skills into have/missing. */
    userSkills: SkillStat[];
}

const INITIAL_COUNT = 8;
const MISSING_SKILL_LIMIT = 15;

const SUB_SCORES = [
    {key: "title_score", label: "Title"},
    {key: "skills_score", label: "Skills"},
    {key: "experience_score", label: "Experience"},
    {key: "location_score", label: "Location"}
] as const;

function ScoreMeter({label, value, inert}: {
    label: string;
    value: number;
    inert: boolean;
}) {
    const percent = toPercent(value);

    return (
        <div className={"flex flex-col gap-1"}>
            <div className={"flex items-baseline justify-between gap-2 text-xs"}>
                <span className={cn("font-medium", inert && "text-muted-foreground")}>{label}</span>
                <span className={"font-mono tabular-nums text-muted-foreground"}>{percent}%</span>
            </div>
            <div className={"h-1.5 w-full overflow-hidden rounded-full bg-muted"}>
                <div
                    className={cn("h-full rounded-full", inert && "bg-muted-foreground/40")}
                    style={{
                        width: `${percent}%`,
                        background: inert
                            ? undefined
                            : "linear-gradient(90deg, var(--chart-ramp-2), var(--chart-ramp-4))"
                    }}
                />
            </div>
        </div>
    )
}

function SkillChips({skills, tone}: { skills: string[]; tone: "have" | "missing" }) {
    return (
        <ul className={"flex flex-wrap gap-1.5"}>
            {skills.map((skill) => (
                <li
                    key={skill}
                    className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs",
                        tone === "have"
                            ? "bg-accent-lime/10 text-foreground ring-1 ring-accent-lime/45"
                            : "bg-muted text-muted-foreground ring-1 ring-chart-ramp-4/25"
                    )}
                >
                    {skill}
                </li>
            ))}
        </ul>
    )
}

function JobRow({ranked, userSkillKeys, inertScores, topMatch}: {
    ranked: RankedJob;
    userSkillKeys: Set<string>;
    inertScores: Set<string>;
    /** Presentation only: the highest-ranked posting gets the lime tag. */
    topMatch: boolean;
}) {
    const [open, setOpen] = useState(false);
    const posting = ranked.job?.job;
    const {matched, missing} = partitionJobSkills(ranked.job?.skills ?? [], userSkillKeys);

    if (!posting) return null;

    const meta = [
        posting.remote ? "Remote" : posting.location,
        posting.employment_type,
        posting.posted_at
    ].filter(Boolean);

    const visibleMissing = missing.slice(0, MISSING_SKILL_LIMIT);
    const hiddenMissing = missing.length - visibleMissing.length;

    return (
        <li className={"rounded-xl border border-border bg-card transition-colors has-[button[aria-expanded=true]]:border-primary/30"}>
            <button
                type={"button"}
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
                className={"flex w-full items-center gap-4 px-4 py-3 text-left"}
            >
                <span className={"w-14 shrink-0 font-mono text-lg font-bold tracking-tight tabular-nums text-primary"}>
                    {toPercent(ranked.overall_score)}%
                </span>
                <span className={"flex min-w-0 flex-col"}>
                    <span className={"flex min-w-0 items-center gap-2"}>
                        <span className={"truncate font-medium"}>{posting.title ?? "Untitled role"}</span>
                        {topMatch && (
                            <span className={"shrink-0 rounded-full bg-accent-lime px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-accent-lime-ink"}>
                                Best match
                            </span>
                        )}
                    </span>
                    <span className={"truncate text-xs text-muted-foreground"}>
                        {[posting.company, ...meta].filter(Boolean).join(" · ")}
                    </span>
                </span>
                <ChevronDownIcon
                    className={cn("ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
                />
            </button>

            {open && (
                <div className={"flex flex-col gap-5 border-t border-border px-4 py-4"}>
                    <div className={"grid gap-3 sm:grid-cols-2 lg:grid-cols-4"}>
                        {SUB_SCORES.map(({key, label}) => (
                            <ScoreMeter
                                key={key}
                                label={label}
                                value={ranked[key]}
                                inert={inertScores.has(key)}
                            />
                        ))}
                    </div>

                    {inertScores.size > 0 && (
                        <p className={"text-xs text-muted-foreground"}>
                            {[...inertScores]
                                .map((key) => SUB_SCORES.find((score) => score.key === key)?.label)
                                .filter(Boolean)
                                .join(" and ")}{" "}
                            {inertScores.size === 1 ? "scores are" : "scores are"} identical
                            for every match here, so they don&apos;t separate one job from
                            another — the postings carry no data to compare on.
                        </p>
                    )}

                    <div className={"flex flex-col gap-2"}>
                        <h4 className={"font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"}>
                            Skills you have ({matched.length})
                        </h4>
                        {matched.length > 0
                            ? <SkillChips skills={matched} tone={"have"} />
                            : <p className={"text-xs text-muted-foreground"}>
                                None of this posting&apos;s listed skills are on your CV.
                            </p>}
                    </div>

                    <div className={"flex flex-col gap-2"}>
                        <h4 className={"font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"}>
                            Skills you&apos;re missing ({missing.length})
                        </h4>
                        <SkillChips skills={visibleMissing} tone={"missing"} />
                        {hiddenMissing > 0 && (
                            <p className={"text-xs text-muted-foreground"}>
                                +{hiddenMissing} more
                            </p>
                        )}
                    </div>

                    {posting.source && (
                        <a
                            href={posting.source}
                            target={"_blank"}
                            rel={"noreferrer noopener"}
                            className={"inline-flex w-fit items-center gap-1.5 text-xs font-medium text-primary hover:underline"}
                        >
                            View posting <ExternalLinkIcon className={"h-3 w-3"} />
                        </a>
                    )}
                </div>
            )}
        </li>
    )
}

/** Answers: "which individual jobs align most closely with my current profile?" */
const JobMatches = ({jobs, userSkills}: JobMatchesProps) => {
    const [showAll, setShowAll] = useState(false);

    const ranked = useMemo(
        () => [...(jobs ?? [])].sort((a, b) => b.overall_score - a.overall_score),
        [jobs]
    );

    const userSkillKeys = useMemo(() => toSkillKeys(userSkills ?? []), [userSkills]);

    // Flag sub-scores that are the same for every job so the UI can say so
    // rather than presenting them as if they told the jobs apart.
    const inertScores = useMemo(() => {
        const inert = new Set<string>();
        for (const {key} of SUB_SCORES) {
            if (isConstantScore(ranked.map((job) => job[key]))) inert.add(key);
        }
        return inert;
    }, [ranked]);

    if (ranked.length === 0) return null;

    const visible = showAll ? ranked : ranked.slice(0, INITIAL_COUNT);
    const hiddenCount = ranked.length - visible.length;

    return (
        <section className={"flex flex-col gap-4"}>
            <div className={"flex flex-col gap-1"}>
                <h2 className={"flex items-center gap-2.5 font-heading text-base font-bold uppercase tracking-[0.06em]"}>
                    <span aria-hidden className={"h-3.5 w-1 shrink-0 bg-primary"} />
                    Job matches
                </h2>
                <p className={"font-mono text-xs text-muted-foreground"}>
                    Job postings sorted by how well they fit your CV, best first —
                    click one to see why
                </p>
            </div>

            <ul className={"flex flex-col gap-2"}>
                {visible.map((job) => (
                    <JobRow
                        key={job.job?.job?.id ?? job.job?.job?.source ?? job.job?.job?.title}
                        ranked={job}
                        userSkillKeys={userSkillKeys}
                        inertScores={inertScores}
                        topMatch={job === ranked[0]}
                    />
                ))}
            </ul>

            {(hiddenCount > 0 || showAll) && (
                <div>
                    <Button
                        variant={"outline"}
                        size={"sm"}
                        onClick={() => setShowAll((prev) => !prev)}
                    >
                        {showAll ? `Show top ${INITIAL_COUNT}` : `Show all ${ranked.length}`}
                    </Button>
                </div>
            )}

            <PanelNote
                points={[
                    <>Each row is a real job posting — the big percentage is its overall fit with your CV, best matches first.</>,
                    <>Click a row to see the four scores behind that number: title, skills, experience and location.</>,
                    <>Highlighted chips are skills the posting wants that you already have; grey chips are ones your CV doesn&apos;t show.</>,
                    <>Learning — or simply listing — the grey-chip skills would push a match higher.</>
                ]}
            />
        </section>
    )
}
export default JobMatches
