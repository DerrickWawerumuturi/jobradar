'use client'

import React from 'react'
import {cn} from "@/lib/utils";
import {useAnalysis} from "@/lib/analysis-store";
import {useBackendHealth} from "@/lib/backend-health";
import {API_BASE_URL} from "@/lib/api";

type StatusKey = "checking" | "waking" | "online" | "offline" | "analyzing";

const PRESENTATION: Record<StatusKey, {
    label: string;
    dot: string;
    text: string;
    pulse: boolean;
}> = {
    checking:  {label: "Checking",   dot: "bg-muted-foreground", text: "text-muted-foreground", pulse: true},
    waking:    {label: "Waking API", dot: "bg-primary",          text: "text-muted-foreground", pulse: true},
    online:    {label: "API online", dot: "bg-primary",          text: "text-muted-foreground", pulse: false},
    offline:   {label: "API offline", dot: "bg-destructive",     text: "text-destructive",      pulse: false},
    analyzing: {label: "Analyzing",  dot: "bg-primary",          text: "text-muted-foreground", pulse: true}
};

const HOST = API_BASE_URL.replace(/^https?:\/\//, "");

/**
 * Shows whether the analysis API is reachable. Worth the space because the
 * failure mode is otherwise expensive: upload, wait, then find out.
 */
const BackendStatus = ({className}: { className?: string }) => {
    const {status} = useAnalysis();
    const {health, slow} = useBackendHealth();

    const analyzing = status === "analyzing";

    // "offline" outranks "analyzing" deliberately: an API that dies part way
    // through a run is the single most useful thing this component can report.
    // "waking" only applies to a first check that is taking a while, which on
    // a scale-to-zero container is expected rather than a fault.
    const state: StatusKey =
        health === "offline" ? "offline"
            : analyzing ? "analyzing"
                : health === "checking" && slow ? "waking"
                    : health;

    const {label, dot, text, pulse} = PRESENTATION[state];

    const title =
        state === "offline" ? `The analysis API is not reachable at ${HOST}`
            : state === "waking" ? `Starting the API at ${HOST} — this takes about half a minute from cold`
                : analyzing ? "Analysis in progress — the API is still responding"
                    : `Analysis API at ${HOST}`;

    return (
        <span
            className={cn(
                "hidden sm:inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]",
                text,
                className
            )}
            title={title}
        >
            <span
                aria-hidden
                className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot, pulse && "animate-pulse")}
            />
            <span role={"status"} aria-live={"polite"}>{label}</span>
        </span>
    )
}
export default BackendStatus
