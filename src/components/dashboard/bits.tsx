import React from 'react'
import Link from "next/link";
import {LucideIcon} from "lucide-react";

import {cn} from "@/lib/utils";
import {ApplicationStatus} from "@/types/jobradar";
import {STATUS_LABEL} from "@/lib/applications-store";

/*
 * The dashboard's table anatomy, borrowed from Notion databases and Attio:
 * property-icon column headers, hairline cell grid (the spreadsheet bones),
 * tinted chips for scores and statuses, quiet row hover.
 */

export const TABLE_WRAP = "overflow-x-auto rounded-lg border border-border bg-card/70";
export const TH = "whitespace-nowrap border-b border-border px-3 py-2 text-left font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground";
export const TD = "border-b border-border/60 px-3 py-2.5 align-middle text-[13px]";
export const CELL_DIVIDE = "border-l border-border/40 first:border-l-0";

/* Full-bleed grid anatomy (the Attio treatment): title bar → toolbar → table,
 * separated by hairlines, the table flush to the content edges. */
/* border-input (white @ 12%) over border (8%) — the grid must read as a
 * spreadsheet, every cell visibly ruled. */
export const GRID_TH = "h-9 whitespace-nowrap border-b border-l border-input bg-card/70 px-3 text-left align-middle font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground first:border-l-0";
export const GRID_TD = "border-b border-l border-input px-3 py-2 align-middle text-[13px] first:border-l-0";
export const GRID_FOOT = "border-l border-input px-3 py-2 align-middle font-mono text-[10.5px] text-muted-foreground first:border-l-0";

export function PageBar({title, meta}: { title: string; meta?: React.ReactNode }) {
    return (
        <div className={"flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2 sm:px-5"}>
            <h1 className={"text-[15px] font-bold tracking-tight"}>
                {title}<span className={"text-primary"}>.</span>
            </h1>
            {meta && (
                <div className={"font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"}>{meta}</div>
            )}
        </div>
    )
}

export function Toolbar({children}: { children: React.ReactNode }) {
    return (
        <div className={"flex flex-wrap items-center gap-2 border-b border-border bg-card/40 px-4 py-2 sm:px-5"}>
            {children}
        </div>
    )
}

/** career-1 filter pill: grey at rest, white when active, real count badge. */
export function ViewChip({active, onClick, count, children}: {
    active: boolean;
    onClick: () => void;
    count?: number;
    children: React.ReactNode;
}) {
    return (
        <button
            role={"tab"}
            aria-selected={active}
            onClick={onClick}
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors",
                active
                    ? "bg-foreground font-bold text-background"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
        >
            {children}
            {count != null && (
                <span className={cn(
                    "rounded-full px-1.5 py-px text-[9.5px] tabular-nums",
                    active ? "bg-background/15" : "bg-background/50"
                )}>
                    {count}
                </span>
            )}
        </button>
    )
}

/** Raised grey section container — the career-1 surface treatment. */
export function Panel({children, className}: { children: React.ReactNode; className?: string }) {
    return (
        <section className={cn("rounded-2xl border border-input bg-card/60 p-4 sm:p-5", className)}>
            {children}
        </section>
    )
}

/** Attio-style soft-filled tag chip — categories, skills, statuses-at-rest. */
export function TagChip({children, tone = "neutral"}: {
    children: React.ReactNode;
    tone?: "have" | "gap" | "neutral";
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center whitespace-nowrap rounded-[4px] px-1.5 py-px font-mono text-[10.5px]",
                tone === "have" && "bg-success/15 text-success",
                tone === "gap" && "bg-primary/15 text-primary",
                tone === "neutral" && "bg-foreground/6 text-muted-foreground"
            )}
        >
            {children}
        </span>
    )
}

/** App-icon treatment for UI glyphs: solid color, white icon, no grey. */
export function IconBadge({icon: Icon, color, className}: {
    icon: LucideIcon;
    color: string;
    className?: string;
}) {
    return (
        <span
            style={{backgroundColor: color}}
            className={cn("grid size-5 shrink-0 place-items-center rounded-[6px] text-white shadow-[0_0_0_1px_oklch(1_0_0/10%)]", className)}
        >
            <Icon className={"size-3"} />
        </span>
    )
}

export function GridTh({icon: Icon, children, className}: {
    icon?: LucideIcon;
    children?: React.ReactNode;
    className?: string;
}) {
    return (
        <th className={cn(GRID_TH, className)}>
            <span className={"inline-flex items-center gap-1.5"}>
                {Icon && <Icon className={"size-3 opacity-70"} />}
                {children}
            </span>
        </th>
    )
}

export function Th({icon: Icon, children, className}: {
    icon?: LucideIcon;
    children?: React.ReactNode;
    className?: string;
}) {
    return (
        <th className={cn(TH, CELL_DIVIDE, className)}>
            <span className={"inline-flex items-center gap-1.5"}>
                {Icon && <Icon className={"size-3 opacity-70"} />}
                {children}
            </span>
        </th>
    )
}

export function SectionLabel({children, className}: { children: React.ReactNode; className?: string }) {
    return (
        <h2 className={cn("font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground", className)}>
            {children}
        </h2>
    )
}

/** Attio-style score chip — lime saturation tracks the match strength. */
export function ScoreChip({value, className}: { value: number | string | null; className?: string }) {
    const score = Math.round(Number(value ?? NaN));
    if (Number.isNaN(score)) return <span className={"text-muted-foreground"}>—</span>;

    return (
        <span
            className={cn(
                "inline-block rounded-[4px] px-2 py-0.5 font-mono text-xs font-bold tabular-nums",
                score >= 85 && "bg-accent-lime text-accent-lime-ink",
                score >= 70 && score < 85 && "bg-accent-lime/15 text-accent-lime",
                score >= 50 && score < 70 && "bg-chart-ramp-2/15 text-chart-ramp-2",
                score < 50 && "bg-primary/15 text-primary",
                className
            )}
        >
            {score}%
        </span>
    )
}

const STATUS_STYLE: Record<ApplicationStatus, { chip: string; dot: string }> = {
    saved: {chip: "bg-[#3e63dd]/18 text-[#93b0ff]", dot: "bg-[#93b0ff]"},
    applied: {chip: "bg-success/12 text-success", dot: "bg-success"},
    screening: {chip: "bg-chart-ramp-2/12 text-chart-ramp-2", dot: "bg-chart-ramp-2"},
    interview: {chip: "bg-primary/12 text-primary", dot: "bg-primary"},
    offer: {chip: "bg-accent-lime font-bold text-accent-lime-ink", dot: "bg-accent-lime-ink"},
    rejected: {chip: "bg-destructive/15 text-destructive", dot: "bg-destructive"},
    withdrawn: {chip: "bg-[#8e4ec6]/15 text-[#c395e8]", dot: "bg-[#c395e8]"}
};

/** Notion-style status chip — dot + label on a tinted pill. */
export function StatusChip({status, className}: { status: ApplicationStatus | null; className?: string }) {
    if (!status) return <span className={"font-mono text-xs text-muted-foreground/60"}>—</span>;
    const style = STATUS_STYLE[status];

    return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em]", style.chip, className)}>
            <span aria-hidden className={cn("size-1.5 rounded-full", style.dot)} />
            {STATUS_LABEL[status]}
        </span>
    )
}

/* Solid app-icon palette, white letter on every color, stable per name. */
const MONOGRAM_COLORS = [
    "#f76b15", "#0091ff", "#30a46c", "#8e4ec6",
    "#e54666", "#0ca678", "#3e63dd", "#ad5700"
];

/** Identity mark for anything without a real logo: solid color, white initial. */
export function Monogram({label, className}: { label: string; className?: string }) {
    const color = MONOGRAM_COLORS[
        [...label].reduce((sum, char) => sum + char.charCodeAt(0), 0) % MONOGRAM_COLORS.length
    ];
    return (
        <span
            aria-hidden
            style={{backgroundColor: color}}
            className={cn(
                "inline-grid size-5 shrink-0 place-items-center rounded-[6px] font-mono text-[10px] font-bold uppercase text-white shadow-[0_0_0_1px_oklch(1_0_0/10%)]",
                className
            )}
        >
            {label.trim().charAt(0) || "?"}
        </span>
    )
}

/** Shown wherever a view needs an analysis that hasn't been run yet. */
export function EmptyScan({message}: { message: string }) {
    return (
        <div className={"flex flex-col items-center gap-3 rounded-lg border border-border bg-card/50 px-6 py-14 text-center"}>
            <p className={"text-sm text-muted-foreground"}>{message}</p>
            <Link
                href={"/dashboard/scan"}
                className={"rounded-md bg-accent-lime px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.1em] text-accent-lime-ink transition-opacity hover:opacity-90"}
            >
                Run a scan
            </Link>
            <span aria-hidden className={"-rotate-2 font-hand text-xl text-primary/90"}>
                one CV upload → your whole market, mapped
            </span>
        </div>
    )
}

/** Segmented demand meter: ten flat cells, one solid color. The color is
 * the have/gap signal — green when the skill is on the CV, orange when not. */
export function DemandMeter({percent, tone, className}: {
    percent: number;
    tone: "have" | "gap";
    className?: string;
}) {
    const filled = Math.max(1, Math.round(percent / 10));
    return (
        <span className={cn("flex w-24 gap-[3px]", className)}>
            {Array.from({length: 10}, (_, cell) => (
                <span
                    key={cell}
                    className={cn(
                        "h-2 flex-1 rounded-[2px]",
                        cell < filled
                            ? tone === "have" ? "bg-success" : "bg-primary"
                            : "bg-foreground/8"
                    )}
                />
            ))}
        </span>
    )
}

/** ✓ you have it / △ the posting wants it and your CV doesn't show it. */
export function SkillTag({skill, tone}: { skill: string; tone: "have" | "gap" }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 whitespace-nowrap rounded-[4px] px-2 py-0.5 font-mono text-[10.5px]",
                tone === "have" ? "bg-success/15 text-success" : "bg-primary/15 text-primary"
            )}
        >
            <span aria-hidden>{tone === "have" ? "✓" : "△"}</span>
            {skill}
        </span>
    )
}
