'use client'

import React, {Suspense, useEffect, useMemo, useState} from 'react'
import {useSearchParams} from "next/navigation";
import {SearchIcon} from "lucide-react";

import {useAnalysis} from "@/lib/analysis-store";
import {useApplications} from "@/lib/applications-store";
import {isConstantScore} from "@/lib/market";
import {toOpportunities} from "@/lib/dashboard-data";
import {EmptyScan, PageBar, Toolbar, ViewChip} from "@/components/dashboard/bits";
import OpportunityCard from "@/components/dashboard/OpportunityCard";

const VIEWS = [
    {id: "all", label: "All"},
    {id: "strong", label: "Strong · 70%+"},
    {id: "tracked", label: "Tracked"}
] as const;
type ViewId = typeof VIEWS[number]["id"];

/** Scans can return dozens of postings — render them in batches. */
const BATCH_SIZE = 10;

function Opportunities() {
    const {analysis, hydrated} = useAnalysis();
    const {byJobId} = useApplications();
    const [selected, setSelected] = useState<string | null>(useSearchParams().get("sel"));
    const [view, setView] = useState<ViewId>("all");
    const [query, setQuery] = useState("");

    const rows = useMemo(() => analysis ? toOpportunities(analysis) : [], [analysis]);

    const inertScores = useMemo(() => {
        const inert = new Set<string>();
        for (const key of ["title", "skills", "experience", "location"] as const) {
            if (isConstantScore(rows.map((row) => row.scores[key]))) inert.add(key);
        }
        return inert;
    }, [rows]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return rows.filter((row) => {
            if (view === "strong" && row.match < 70) return false;
            if (view === "tracked" && (row.jobId == null || !byJobId.has(row.jobId))) return false;
            if (!q) return true;
            return [row.role, row.company ?? "", ...row.have, ...row.missing]
                .some((text) => text.toLowerCase().includes(q));
        });
    }, [rows, view, query, byJobId]);

    const [limit, setLimit] = useState(BATCH_SIZE);
    useEffect(() => setLimit(BATCH_SIZE), [view, query]);
    // A deep link can point past the first batch — extend until it's rendered.
    useEffect(() => {
        if (!selected) return;
        const index = visible.findIndex((row) => row.key === selected);
        if (index >= limit) setLimit(index + 1);
    }, [selected, visible, limit]);

    const shown = visible.slice(0, limit);
    const remaining = visible.length - shown.length;

    if (!hydrated) return null;

    return (
        <div className={"flex min-h-screen flex-col"}>
            <PageBar
                title={"Opportunities"}
                meta={analysis ? `${rows.length} jobs · sorted by fit` : undefined}
            />

            {!analysis ? (
                <div className={"px-4 py-8 sm:px-8"}>
                    <EmptyScan message={"No scan yet. Upload your CV and JobRadar maps the market around it."} />
                </div>
            ) : (
                <>
                    <Toolbar>
                        <div className={"flex gap-1.5"} role={"tablist"} aria-label={"Filter opportunities"}>
                            {VIEWS.map((v) => (
                                <ViewChip
                                    key={v.id}
                                    active={view === v.id}
                                    onClick={() => setView(v.id)}
                                    count={v.id === "all" ? rows.length
                                        : v.id === "strong" ? rows.filter((row) => row.match >= 70).length
                                        : rows.filter((row) => row.jobId != null && byJobId.has(row.jobId!)).length}
                                >
                                    {v.label}
                                </ViewChip>
                            ))}
                        </div>
                        <label className={"ml-auto flex items-center gap-2 rounded-md border border-border px-2.5 py-1 focus-within:border-foreground/25"}>
                            <SearchIcon className={"size-3.5 text-muted-foreground"} />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder={"Search role, company, skill"}
                                className={"w-44 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"}
                            />
                        </label>
                    </Toolbar>

                    <div className={"flex w-full flex-col gap-2.5 px-4 py-5 sm:px-5"}>
                        {shown.map((row) => (
                            <OpportunityCard
                                key={row.key}
                                row={row}
                                inertScores={inertScores}
                                open={selected === row.key}
                                onOpen={() => setSelected(row.key)}
                                onClose={() => setSelected(null)}
                            />
                        ))}
                        {visible.length === 0 && (
                            <p className={"py-10 text-center text-sm text-muted-foreground"}>Nothing matches this view.</p>
                        )}
                        {remaining > 0 && (
                            <button
                                onClick={() => setLimit((prev) => prev + BATCH_SIZE)}
                                className={"mt-2 self-center rounded-full bg-muted/50 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"}
                            >
                                Show {Math.min(BATCH_SIZE, remaining)} more · {remaining} remaining
                            </button>
                        )}
                        {visible.length > 0 && (
                            <p className={"px-1 pt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70"}>
                                {shown.length} of {visible.length} jobs shown · from your last scan
                            </p>
                        )}
                    </div>

                    <p aria-hidden className={"hidden -rotate-1 px-5 pb-5 font-hand text-lg text-primary/80 sm:block"}>
                        tap any card → it opens into the full story
                    </p>
                </>
            )}
        </div>
    )
}

export default function OpportunitiesPage() {
    return (
        <Suspense fallback={null}>
            <Opportunities />
        </Suspense>
    )
}
