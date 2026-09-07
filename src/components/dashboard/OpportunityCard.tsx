'use client'

import React, {useEffect} from 'react'
import {AnimatePresence, motion} from "motion/react";
import {XIcon} from "lucide-react";

import {OpportunityRow} from "@/lib/dashboard-data";
import {useApplications} from "@/lib/applications-store";
import {Monogram, ScoreChip, StatusChip, TagChip} from "@/components/dashboard/bits";
import {BreakdownContent} from "@/components/dashboard/OpportunityPeek";

interface OpportunityCardProps {
    row: OpportunityRow;
    inertScores: Set<string>;
    open: boolean;
    onOpen: () => void;
    onClose: () => void;
}

/**
 * Mobile stand-in for the desktop peek drawer: a compact card that morphs
 * into the full match breakdown (shared-element pattern via layoutId).
 */
export default function OpportunityCard({row, inertScores, open, onOpen, onClose}: OpportunityCardProps) {
    const {byJobId} = useApplications();
    const app = row.jobId != null ? byJobId.get(row.jobId) : undefined;
    const layoutId = `opp-card-${row.key}`;

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    return (
        <>
            <motion.button
                layoutId={layoutId}
                onClick={onOpen}
                className={"flex w-full flex-col gap-2.5 rounded-xl border border-input bg-secondary/40 p-4 text-left transition-colors hover:border-foreground/25"}
            >
                <span className={"flex w-full items-center gap-2.5"}>
                    <Monogram label={row.company ?? row.role} />
                    <span className={"min-w-0 flex-1"}>
                        <span className={"block truncate text-[14px] font-medium"}>{row.role}</span>
                        <span className={"block truncate font-mono text-[10.5px] text-muted-foreground"}>
                            {[row.company, row.location].filter(Boolean).join(" · ")}
                        </span>
                    </span>
                    <ScoreChip value={row.match} />
                </span>
                <span className={"flex w-full min-w-0 flex-wrap items-center gap-1.5"}>
                    {row.have.slice(0, 2).map((skill) => <TagChip key={skill} tone={"have"}>✓ {skill}</TagChip>)}
                    {row.missing.slice(0, 2).map((skill) => <TagChip key={skill} tone={"gap"}>△ {skill}</TagChip>)}
                    {app && <StatusChip status={app.status} className={"ml-auto"} />}
                </span>
            </motion.button>

            <AnimatePresence>
                {open && (
                    <div className={"fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"}>
                        <motion.div
                            initial={{opacity: 0}}
                            animate={{opacity: 1}}
                            exit={{opacity: 0}}
                            onClick={onClose}
                            className={"absolute inset-0 bg-black/60 backdrop-blur-sm"}
                        />
                        <motion.div
                            layoutId={layoutId}
                            role={"dialog"}
                            aria-label={`Match breakdown: ${row.role}`}
                            className={"relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-t-2xl border border-input bg-popover p-5 shadow-2xl sm:rounded-2xl"}
                        >
                            <BreakdownContent row={row} inertScores={inertScores} onClose={onClose} />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}
