'use client'

import React, {useEffect, useMemo, useState} from 'react'
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useSession} from "next-auth/react";
import {CircleDashedIcon, GaugeIcon, InfoIcon, TypeIcon} from "lucide-react";
import {AnimatedCounter} from "@/components/ui/animated-counter";
import {Folder, type FolderPage} from "@/components/ui/folder-component";

import {cn} from "@/lib/utils";
import {useAnalysis} from "@/lib/analysis-store";
import {PIPELINE, STATUS_LABEL, useApplications} from "@/lib/applications-store";
import {byDemand, coveragePercent, significantGaps, toPercent} from "@/lib/market";
import {toOpportunities} from "@/lib/dashboard-data";
import {CELL_DIVIDE, DemandMeter, EmptyScan, Monogram, Panel, ScoreChip, SectionLabel, StatusChip, TABLE_WRAP, TD, Th} from "@/components/dashboard/bits";
import StatusDisclosure from "@/components/dashboard/StatusDisclosure";
import SkillBadge from "@/components/dashboard/SkillBadge";
import CompanyLogo from "@/components/dashboard/CompanyLogo";

const TOP_COUNT = 5;
const STRONG_MATCH = 70;

const STAT_TONES = {green: "green", lime: "lime", navy: "navy", maroon: "maroon"} as const;

/**
 * Each stat is a folder in its own brand color — the number stamped on the
 * front, the cards fanning on hover, the definition in the hover tooltip (ⓘ).
 */
/** Truncate for the width of a folder card. */
const short = (text: string, max = 11) =>
    text.length > max ? `${text.slice(0, max - 1)}…` : text;

function Stat({label, value, unit, sub, tone, cards}: {
    label: string;
    value: string | number;
    unit?: string;
    sub: string;
    tone: keyof typeof STAT_TONES;
    /** Real content for the fanning pages, left to right. */
    cards?: FolderPage[];
}) {
    const lime = tone === "lime";
    return (
        <div title={sub} className={"group flex flex-col items-center gap-1"}>
            <div className={"relative max-sm:-my-4 max-sm:scale-[0.78]"}>
                <Folder color={STAT_TONES[tone]} size={"xs"} pages={cards} aria-hidden />
                <p className={cn(
                    "pointer-events-none absolute inset-x-0 bottom-8 text-center font-mono text-[24px] font-bold leading-none tabular-nums",
                    lime ? "text-accent-lime-ink" : "text-white"
                )}>
                    {typeof value === "number" ? <AnimatedCounter value={value} /> : value}
                    {unit && <small className={cn("text-xs font-normal", lime ? "text-accent-lime-ink/70" : "text-white/70")}>{unit}</small>}
                </p>
            </div>
            <div className={"flex items-center gap-1.5"}>
                <SectionLabel>{label}</SectionLabel>
                <InfoIcon aria-hidden className={"size-3 shrink-0 text-muted-foreground opacity-35 transition-opacity group-hover:opacity-80"} />
            </div>
        </div>
    )
}

export default function OverviewPage() {
    const router = useRouter();
    const {data: session} = useSession();
    const {analysis, hydrated} = useAnalysis();
    const {apps, state, counts, byJobId} = useApplications();
    const [greeting, setGreeting] = useState("Welcome back");

    useEffect(() => {
        const hour = new Date().getHours();
        setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
    }, []);

    const rows = useMemo(() => analysis ? toOpportunities(analysis) : [], [analysis]);
    const market = analysis?.market;

    const strong = rows.filter((row) => row.match >= STRONG_MATCH).length;
    const inProgress = counts.applied + counts.screening + counts.interview + counts.offer;
    const awaiting = counts.applied + counts.screening + counts.interview;
    const gaps = significantGaps(market?.skill_gaps ?? []).slice(0, 3);
    // What's written on each folder's pages — counted, like everything else.
    const coverageCards: FolderPage[] = byDemand(market?.user_skill_presence ?? [])
        .slice(0, 3).map((stat) => ({
            title: short(stat.skill),
            lines: [`${Math.round(toPercent(stat.frequency))}% demand`, `${stat.job_count} jobs`]
        }));
    const strongCards: FolderPage[] = rows.filter((row) => row.match >= STRONG_MATCH)
        .slice(0, 3).map((row) => ({
            title: short(row.role),
            lines: [short(row.company ?? "—", 13), `${row.match}% match`, short(row.location, 13)]
        }));
    const providerCards: FolderPage[] = (analysis?.search?.providers ?? [])
        .filter((p) => p.provider).slice(0, 3).map((p) => ({
            title: short(p.provider!),
            lines: [`${p.jobs ?? "—"} jobs`, ...(p.scope ? [short(p.scope, 13)] : [])]
        }));
    const pipelineCards: FolderPage[] = [...apps]
        .sort((a, b) => new Date(b.last_status_at).getTime() - new Date(a.last_status_at).getTime())
        .slice(0, 3).map((app) => ({
            title: short(app.title ?? "Untitled"),
            lines: [STATUS_LABEL[app.status], short(app.company ?? "", 13)]
        }));
    const providers = [...new Set(
        (analysis?.search?.providers ?? []).map((p) => p.provider).filter(Boolean)
    )] as string[];

    const radarApps = [...apps]
        .sort((a, b) => new Date(b.last_status_at).getTime() - new Date(a.last_status_at).getTime())
        .slice(0, 3);
    const radarOpps = rows
        .filter((row) => row.jobId == null || !byJobId.has(row.jobId))
        .slice(0, Math.max(2, TOP_COUNT + 1 - radarApps.length));

    const firstName = session?.user?.name?.split(" ")[0];

    if (!hydrated) return null;

    return (
        <div className={"mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-8 lg:py-12"}>
            <header className={"flex flex-wrap items-end justify-between gap-4"}>
                <div>
                    <h1 className={"text-[26px] font-bold tracking-tight"}>
                        {greeting}{firstName ? `, ${firstName}` : ""}<span className={"text-primary"}>.</span>
                    </h1>
                    <p className={"mt-1 text-sm text-muted-foreground"}>
                        Here&apos;s where you stand in your job market.
                    </p>
                </div>
                {rows.length > 0 && (
                    <span aria-hidden className={"hidden -rotate-2 font-hand text-xl text-primary/90 md:block"}>
                        every number below is counted, not guessed →
                    </span>
                )}
            </header>

            {!analysis ? (
                <EmptyScan message={"Your dashboard fills itself from a scan. Upload your CV and JobRadar maps the market around it."} />
            ) : (
                <>
                    <div className={"grid grid-cols-2 gap-3 lg:grid-cols-4"}>
                        <Stat
                            tone={"green"}
                            label={"Profile coverage"}
                            value={Math.round(coveragePercent(market!.skill_coverage))}
                            unit={"%"}
                            sub={`covers ${market!.skill_coverage.covered} of the ${market!.skill_coverage.total} skills your market asks for most`}
                            cards={coverageCards}
                        />
                        <Stat
                            tone={"lime"}
                            label={"Strong matches"}
                            value={strong}
                            sub={`jobs at ${STRONG_MATCH}%+ fit, of ${rows.length} ranked against your CV`}
                            cards={strongCards}
                        />
                        <Stat
                            tone={"navy"}
                            label={"Jobs analyzed"}
                            value={market!.jobs_analyzed}
                            sub={providers.length ? `across ${providers.join(" · ")}` : "in your last scan"}
                            cards={providerCards}
                        />
                        <Stat
                            tone={"maroon"}
                            label={"In progress"}
                            value={state === "signed-out" ? "—" : inProgress}
                            sub={state === "signed-out"
                                ? "sign in to track applications"
                                : `${awaiting} waiting on a reply`}
                            cards={state === "signed-out" ? undefined : pipelineCards}
                        />
                    </div>

                    <section className={"flex flex-col gap-3"}>
                        <div className={"flex items-baseline justify-between"}>
                            <SectionLabel>On your radar</SectionLabel>
                            <Link href={"/dashboard/opportunities"} className={"font-mono text-[10px] uppercase tracking-[0.1em] text-primary hover:underline"}>
                                All {rows.length} jobs →
                            </Link>
                        </div>
                        <div className={TABLE_WRAP}>
                            <table className={"w-full border-collapse"}>
                                <thead>
                                    <tr>
                                        <Th icon={TypeIcon} className={"w-[52%]"}>Role</Th>
                                        <Th icon={GaugeIcon} className={"w-[18%]"}>Match</Th>
                                        <Th icon={CircleDashedIcon} className={"w-[30%]"}>Status</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {radarApps.map((app) => (
                                        <tr key={`app-${app.id}`} className={"transition-colors hover:bg-foreground/3"}>
                                            <td className={cn(TD, CELL_DIVIDE)}>
                                                <span className={"flex items-center gap-2.5"}>
                                                    <CompanyLogo company={app.company ?? app.title} url={app.url} />
                                                    <span className={"min-w-0"}>
                                                        <span className={"block truncate font-medium"}>{app.title ?? "Untitled role"}</span>
                                                        <span className={"block truncate font-mono text-[11px] text-muted-foreground"}>
                                                            {app.company ?? "your application"}
                                                        </span>
                                                    </span>
                                                </span>
                                            </td>
                                            <td className={cn(TD, CELL_DIVIDE)}><ScoreChip value={app.match_score} /></td>
                                            <td className={cn(TD, CELL_DIVIDE)}><StatusDisclosure app={app} /></td>
                                        </tr>
                                    ))}
                                    {radarOpps.map((row) => (
                                        <tr
                                            key={row.key}
                                            tabIndex={0}
                                            onClick={() => router.push(`/dashboard/opportunities?sel=${encodeURIComponent(row.key)}`)}
                                            onKeyDown={(event) => event.key === "Enter" &&
                                                router.push(`/dashboard/opportunities?sel=${encodeURIComponent(row.key)}`)}
                                            className={"cursor-pointer transition-colors hover:bg-foreground/3"}
                                        >
                                            <td className={cn(TD, CELL_DIVIDE)}>
                                                <span className={"flex items-center gap-2.5"}>
                                                    <CompanyLogo company={row.company ?? row.role} url={row.url} />
                                                    <span className={"min-w-0"}>
                                                        <span className={"block truncate font-medium"}>{row.role}</span>
                                                        <span className={"block truncate font-mono text-[11px] text-muted-foreground"}>
                                                            {[row.company, row.location].filter(Boolean).join(" · ")}
                                                        </span>
                                                    </span>
                                                </span>
                                            </td>
                                            <td className={cn(TD, CELL_DIVIDE)}><ScoreChip value={row.match} /></td>
                                            <td className={cn(TD, CELL_DIVIDE)}>
                                                <span className={"font-mono text-[10px] uppercase tracking-[0.08em] text-accent-lime"}>new match →</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <div className={"grid gap-4 md:grid-cols-2"}>
                        <Panel className={"flex flex-col gap-3"}>
                            <div className={"flex items-baseline justify-between"}>
                                <SectionLabel>Worth learning next</SectionLabel>
                                <Link href={"/dashboard/gaps"} className={"font-mono text-[10px] uppercase tracking-[0.1em] text-primary hover:underline"}>
                                    All gaps →
                                </Link>
                            </div>
                            {gaps.length > 0 ? gaps.map((gap) => {
                                const percent = toPercent(gap.frequency);
                                return (
                                    <div key={gap.skill}>
                                        <div className={"mb-1.5 flex items-center justify-between gap-2"}>
                                            <span className={"flex min-w-0 items-center gap-2"}>
                                                <SkillBadge skill={gap.skill} tone={"gap"} className={"size-5"} />
                                                <span className={"truncate font-mono text-xs font-medium"}>{gap.skill}</span>
                                            </span>
                                            <span className={"shrink-0 font-mono text-[10.5px] tabular-nums text-muted-foreground"}>
                                                {Math.round(percent)}% of jobs
                                            </span>
                                        </div>
                                        <DemandMeter percent={percent} tone={"gap"} />
                                    </div>
                                )
                            }) : (
                                <p className={"text-sm text-muted-foreground"}>
                                    No significant gaps. Your CV covers what this market keeps asking for.
                                </p>
                            )}
                        </Panel>

                        <Panel className={"flex flex-col gap-3"}>
                            <div className={"flex items-baseline justify-between"}>
                                <SectionLabel>Your pipeline</SectionLabel>
                                <Link href={"/dashboard/applications"} className={"font-mono text-[10px] uppercase tracking-[0.1em] text-primary hover:underline"}>
                                    Open tracker →
                                </Link>
                            </div>
                            {state === "signed-out" ? (
                                <p className={"text-sm text-muted-foreground"}>
                                    <Link href={"/sign-in"} className={"text-primary hover:underline"}>Sign in</Link>
                                    {" "}to save jobs and track applications across devices.
                                </p>
                            ) : (
                                <div className={"grid grid-cols-5 rounded-lg border border-border bg-card/50 divide-x divide-border/60"}>
                                    {PIPELINE.map((status) => (
                                        <div key={status} className={"px-3 py-3 text-center"}>
                                            <p className={"font-mono text-lg font-bold tabular-nums"}><AnimatedCounter value={counts[status]} /></p>
                                            <p className={"mt-0.5 flex items-center justify-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground"}>
                                                <StatusChip status={status} className={"px-0 py-0 !bg-transparent"} />
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {state === "ready" && apps.length === 0 && (
                                <p aria-hidden className={"-rotate-2 self-start font-hand text-lg text-primary/80"}>
                                    save a job → your pipeline starts here
                                </p>
                            )}
                        </Panel>
                    </div>
                </>
            )}
        </div>
    )
}
