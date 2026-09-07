'use client'

import React from 'react'
import Link from "next/link";
import {CheckIcon, ExternalLinkIcon, XIcon} from "lucide-react";

import {cn} from "@/lib/utils";
import {toPercent} from "@/lib/market";
import {OpportunityRow} from "@/lib/dashboard-data";
import {useApplications} from "@/lib/applications-store";
import {ScoreChip, SectionLabel, SkillTag, StatusChip} from "@/components/dashboard/bits";

const SUB_SCORES = [
    {key: "title", label: "Role fit"},
    {key: "skills", label: "Skills"},
    {key: "experience", label: "Experience"},
    {key: "location", label: "Location"}
] as const;

const ADVANTAGE_LIMIT = 8;
const GAP_LIMIT = 8;

function Meter({label, value, inert}: { label: string; value: number; inert: boolean }) {
    const percent = toPercent(value);
    return (
        <div className={"flex items-center gap-3"}>
            <span className={cn("w-24 shrink-0 text-xs", inert ? "text-muted-foreground/60" : "text-muted-foreground")}>
                {label}
            </span>
            <div className={"h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/8"}>
                <div
                    className={cn("h-full rounded-full", inert ? "bg-muted-foreground/30" : "bg-success")}
                    style={{width: `${percent}%`}}
                />
            </div>
            <span className={"w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground"}>
                {percent}%
            </span>
        </div>
    )
}

interface BreakdownProps {
    row: OpportunityRow;
    /** Sub-scores identical across every ranked job — no signal, shown dimmed. */
    inertScores: Set<string>;
    onClose: () => void;
}

/** The breakdown itself — shared by the desktop drawer and the mobile card. */
export function BreakdownContent({row, inertScores, onClose}: BreakdownProps) {
    const {state, byJobId, pending, toggleSave, markApplied} = useApplications();

    const app = row.jobId != null ? byJobId.get(row.jobId) : undefined;
    const saved = app != null;
    const applied = app != null && app.status !== "saved";
    const busy = row.jobId != null && pending.has(row.jobId);
    const target = row.jobId == null ? null : {
        jobId: row.jobId, role: row.role, company: row.company, match: row.match
    };

    return (
        <>
                <div className={"flex items-start justify-between gap-3"}>
                    <div>
                        <SectionLabel>Match breakdown</SectionLabel>
                        <h3 className={"mt-2 text-lg font-bold leading-snug"}>{row.role}</h3>
                        <p className={"mt-1 font-mono text-[11.5px] text-muted-foreground"}>
                            {[row.company, row.location].filter(Boolean).join(" · ")}
                        </p>
                    </div>
                    <button aria-label={"Close"} onClick={onClose} className={"text-muted-foreground hover:text-foreground"}>
                        <XIcon className={"size-4"} />
                    </button>
                </div>

                <div className={"flex items-center gap-3"}>
                    <span className={"font-mono text-4xl font-bold leading-none text-accent-lime"}>{row.match}</span>
                    <span className={"font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"}>% match</span>
                    {app && <StatusChip status={app.status} className={"ml-auto"} />}
                </div>

                <div className={"flex flex-col gap-2.5 border-t border-border pt-4"}>
                    {SUB_SCORES.map(({key, label}) => (
                        <Meter key={key} label={label} value={row.scores[key]} inert={inertScores.has(key)} />
                    ))}
                    {inertScores.size > 0 && (
                        <p className={"text-[11px] leading-relaxed text-muted-foreground/80"}>
                            Dimmed scores are identical for every match in this scan, so the postings
                            carry no data to compare them on.
                        </p>
                    )}
                </div>

                <div>
                    <SectionLabel>You bring ({row.have.length})</SectionLabel>
                    <div className={"mt-2 flex flex-wrap gap-1.5"}>
                        {row.have.length > 0
                            ? row.have.slice(0, ADVANTAGE_LIMIT).map((skill) => <SkillTag key={skill} skill={skill} tone={"have"} />)
                            : <p className={"text-xs text-muted-foreground"}>None of this posting&apos;s listed skills are on your CV.</p>}
                        {row.have.length > ADVANTAGE_LIMIT && (
                            <span className={"self-center text-[11px] text-muted-foreground"}>+{row.have.length - ADVANTAGE_LIMIT} more</span>
                        )}
                    </div>
                </div>

                <div>
                    <SectionLabel>Your gap ({row.missing.length})</SectionLabel>
                    <div className={"mt-2 flex flex-wrap gap-1.5"}>
                        {row.missing.length > 0
                            ? row.missing.slice(0, GAP_LIMIT).map((skill) => <SkillTag key={skill} skill={skill} tone={"gap"} />)
                            : <span className={"text-xs text-success"}>✓ none, your CV covers everything it lists</span>}
                        {row.missing.length > GAP_LIMIT && (
                            <span className={"self-center text-[11px] text-muted-foreground"}>+{row.missing.length - GAP_LIMIT} more</span>
                        )}
                    </div>
                </div>

                <p className={"text-xs leading-relaxed text-muted-foreground"}>
                    Covers <b className={"text-foreground"}>{row.have.length} of the {row.required} skills</b> this
                    posting lists. Skills are extracted from the posting text; scores compare its
                    wording against your CV.
                </p>

                <div className={"mt-auto flex flex-wrap gap-2 border-t border-border pt-4"}>
                    {row.url && (
                        <a
                            href={row.url}
                            target={"_blank"}
                            rel={"noreferrer noopener"}
                            className={"inline-flex items-center gap-1.5 rounded-md bg-accent-lime px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-accent-lime-ink transition-opacity hover:opacity-90"}
                        >
                            View job <ExternalLinkIcon className={"size-3"} />
                        </a>
                    )}
                    {state === "signed-out" ? (
                        <Link
                            href={"/sign-in"}
                            className={"inline-flex items-center rounded-md border border-border px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"}
                        >
                            Sign in to track it
                        </Link>
                    ) : (
                        <>
                            <button
                                disabled={target == null || busy || applied}
                                title={target == null ? "This posting wasn't stored, so it can't be saved" : undefined}
                                onClick={() => target && toggleSave(target)}
                                className={cn(
                                    "inline-flex items-center gap-1.5 rounded-md border px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                                    saved ? "border-success/45 text-success" : "border-border hover:border-foreground/25"
                                )}
                            >
                                {saved && <CheckIcon className={"size-3"} />}
                                {saved ? "Saved" : "Save"}
                            </button>
                            <button
                                disabled={target == null || busy || applied}
                                title={target == null ? "This posting wasn't stored, so it can't be tracked" : undefined}
                                onClick={() => target && markApplied(target)}
                                className={cn(
                                    "inline-flex items-center gap-1.5 rounded-md border px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                                    applied ? "border-success/45 text-success" : "border-border hover:border-foreground/25"
                                )}
                            >
                                {applied && <CheckIcon className={"size-3"} />}
                                {applied ? "Applied" : "Mark applied"}
                            </button>
                        </>
                    )}
                </div>
        </>
    )
}
