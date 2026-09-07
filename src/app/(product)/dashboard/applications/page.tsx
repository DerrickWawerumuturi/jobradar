'use client'

import React, {useMemo, useRef, useState} from 'react'
import Link from "next/link";
import {AnimatePresence, motion, MotionConfig} from "motion/react";
import {
    ArrowUpRightIcon,
    BuildingIcon,
    CalendarIcon,
    ChevronDownIcon,
    CircleDashedIcon,
    ClockIcon,
    FileTextIcon,
    GaugeIcon,
    MapPinIcon,
    PlusIcon,
    RssIcon,
    TypeIcon
} from "lucide-react";

import {cn} from "@/lib/utils";
import {ApplicationRow, ApplicationStatus} from "@/types/jobradar";
import {CLOSED, PIPELINE, STATUS_LABEL, useApplications} from "@/lib/applications-store";
import {useAnalysis} from "@/lib/analysis-store";
import {timeAgo, toOpportunities} from "@/lib/dashboard-data";
import {GRID_TD, GridTh, Monogram, PageBar, ScoreChip, SectionLabel, StatusChip, Toolbar, ViewChip} from "@/components/dashboard/bits";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Dialog, DialogContent, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {DeleteButton} from "@/components/ui/delete-button";
import {Folder} from "@/components/ui/folder-component";

const TRANSITIONS: Exclude<ApplicationStatus, "saved">[] =
    ["applied", "screening", "interview", "offer", "rejected", "withdrawn"];

const TRACK_SUGGESTIONS = 5;

const VIEWS = [
    {id: "all", label: "All"},
    {id: "active", label: "Active"},
    {id: "closed", label: "Closed"}
] as const;
type ViewId = typeof VIEWS[number]["id"];

/**
 * Watermelon's filter-disclosure feel: the chip morphs into a small panel of
 * status chips that spring in staggered; pick one and it snaps back.
 */
function StatusDisclosure({app}: { app: ApplicationRow }) {
    const {transition} = useApplications();
    const [open, setOpen] = useState(false);
    const [anchor, setAnchor] = useState({left: 0, top: 0});
    const layoutId = `status-${app.id}`;

    const openAt = (event: React.MouseEvent<HTMLButtonElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setAnchor({
            left: Math.min(rect.left - 6, window.innerWidth - 200),
            top: Math.min(rect.top - 6, window.innerHeight - 250)
        });
        setOpen(true);
    };

    const select = (status: Exclude<ApplicationStatus, "saved">) => {
        transition(app.id, status);
        setTimeout(() => setOpen(false), 180);
    };

    return (
        <MotionConfig transition={{type: "spring", bounce: 0.25, duration: 0.5}}>
            <AnimatePresence mode={"popLayout"} initial={false}>
                {open ? (
                    <motion.div
                        key={"open"}
                        layoutId={layoutId}
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        exit={{opacity: 0, transition: {duration: 0}}}
                        style={{position: "fixed", left: anchor.left, top: anchor.top}}
                        className={"z-50 flex w-46 flex-col gap-0.5 rounded-xl border border-input bg-popover p-1.5 shadow-2xl"}
                    >
                        {TRANSITIONS.filter((status) => status !== app.status).map((status, index) => (
                            <motion.button
                                key={status}
                                initial={{opacity: 0, scale: 1.06, y: 14}}
                                animate={{opacity: 1, scale: 1, y: 0}}
                                whileTap={{scale: 0.97}}
                                transition={{type: "spring", stiffness: 240, damping: 20, delay: index * 0.04}}
                                onClick={() => select(status)}
                                className={"flex w-full rounded-lg px-2 py-1.5 text-left hover:bg-foreground/5"}
                            >
                                <StatusChip status={status} />
                            </motion.button>
                        ))}
                    </motion.div>
                ) : (
                    <motion.button
                        key={"closed"}
                        layoutId={layoutId}
                        disabled={app.id < 0}
                        onClick={openAt}
                        aria-label={"Change status"}
                        className={"inline-flex items-center gap-1 disabled:opacity-50"}
                    >
                        <StatusChip status={app.status} />
                        <ChevronDownIcon className={"size-3 text-muted-foreground"} />
                    </motion.button>
                )}
            </AnimatePresence>
            {open && <div aria-hidden className={"fixed inset-0 z-40"} onClick={() => setOpen(false)} />}
        </MotionConfig>
    )
}

const INPUT = "rounded-md border border-input bg-transparent px-3 py-2 text-[13px] outline-none placeholder:text-muted-foreground/50 focus:border-foreground/30";

/** An application made outside JobRadar — entered by hand, tracked the same. */
function AddApplicationDialog() {
    const {addManual} = useApplications();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({title: "", company: "", url: "", location: "", applied: true});

    const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({...prev, [key]: event.target.value}));

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.title.trim()) return;
        addManual({
            title: form.title.trim(),
            company: form.company.trim() || null,
            url: form.url.trim() || null,
            location: form.location.trim() || null,
            status: form.applied ? "applied" : "saved"
        });
        setForm({title: "", company: "", url: "", location: "", applied: true});
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={(props) => (
                <button
                    {...props}
                    className={cn(props.className, "ml-2 inline-flex items-center gap-1.5 rounded-md bg-accent-lime px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-accent-lime-ink transition-opacity hover:opacity-90")}
                >
                    <PlusIcon className={"size-3"} /> Add your own
                </button>
            )} />
            <DialogContent className={"sm:max-w-md"}>
                <DialogTitle className={"text-base font-bold"}>Add an application</DialogTitle>
                <form onSubmit={submit} className={"flex flex-col gap-3"}>
                    <input required autoFocus value={form.title} onChange={set("title")} placeholder={"Role — e.g. Backend Engineer"} className={INPUT} />
                    <input value={form.company} onChange={set("company")} placeholder={"Company"} className={INPUT} />
                    <input value={form.url} onChange={set("url")} type={"url"} placeholder={"Job link (https://…)"} className={INPUT} />
                    <input value={form.location} onChange={set("location")} placeholder={"Location"} className={INPUT} />
                    <div className={"flex gap-1"} role={"radiogroup"} aria-label={"Starting status"}>
                        {([["applied", true], ["saved", false]] as const).map(([label, applied]) => (
                            <button
                                key={label}
                                type={"button"}
                                role={"radio"}
                                aria-checked={form.applied === applied}
                                onClick={() => setForm((prev) => ({...prev, applied}))}
                                className={cn(
                                    "rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors",
                                    form.applied === applied ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <StatusChip status={label} />
                            </button>
                        ))}
                    </div>
                    <button
                        type={"submit"}
                        className={"mt-1 rounded-md bg-accent-lime px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.1em] text-accent-lime-ink transition-opacity hover:opacity-90 disabled:opacity-40"}
                        disabled={!form.title.trim()}
                    >
                        Track it
                    </button>
                </form>
            </DialogContent>
        </Dialog>
    )
}

/** Only bookmarks are deletable — a sent application would lose its history. */
function RemoveCell({app}: { app: ApplicationRow }) {
    const {toggleSave} = useApplications();
    if (app.status !== "saved" || app.id < 0 || app.job_id == null) return null;

    return (
        <DeleteButton
            className={"origin-left scale-70 -my-1.5"}
            onConfirm={() => toggleSave({
                jobId: app.job_id!,
                role: app.title,
                company: app.company,
                match: Number(app.match_score) || null
            })}
        />
    )
}

/** The CV exactly as it was when this job was saved. */
function CvSnapshot({app}: { app: ApplicationRow }) {
    const cv = app.cv_snapshot;
    if (!cv) return <span className={"text-muted-foreground/50"}>—</span>;

    const skills = (cv.skills ?? []).filter((s): s is string => Boolean(s));

    return (
        <Dialog>
            <DialogTrigger render={(props) => (
                <button
                    {...props}
                    aria-label={"View the CV this was saved with"}
                    className={cn(props.className, "inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground")}
                >
                    <FileTextIcon className={"size-3.5"} /> view
                </button>
            )} />
            <DialogContent className={"sm:max-w-md"}>
                <DialogTitle className={"text-base font-bold"}>
                    CV at save time
                </DialogTitle>
                <div className={"flex flex-col gap-3 text-[13px]"}>
                    <div>
                        <p className={"font-medium"}>{cv.name ?? "Unnamed"}</p>
                        <p className={"font-mono text-[11px] text-muted-foreground"}>
                            {[cv.title, cv.experience_level, cv.location].filter(Boolean).join(" · ") || "no details"}
                        </p>
                    </div>
                    <div>
                        <SectionLabel>Skills ({skills.length})</SectionLabel>
                        <div className={"mt-2 flex flex-wrap gap-1.5"}>
                            {skills.slice(0, 16).map((skill) => (
                                <span key={skill} className={"rounded-[3px] border border-border px-2 py-0.5 font-mono text-[10.5px] text-muted-foreground"}>
                                    {skill}
                                </span>
                            ))}
                            {skills.length > 16 && (
                                <span className={"self-center text-[11px] text-muted-foreground"}>+{skills.length - 16} more</span>
                            )}
                        </div>
                    </div>
                    <p className={"text-[11px] leading-relaxed text-muted-foreground"}>
                        This is the profile the {Math.round(Number(app.match_score ?? 0))}% match was
                        computed against — it stays frozen even as your CV evolves.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}

/** "+ Track a job" — the top unsaved matches, one click each. */
function TrackJobMenu() {
    const {analysis} = useAnalysis();
    const {byJobId, toggleSave, pending} = useApplications();

    const candidates = useMemo(() => {
        if (!analysis) return [];
        return toOpportunities(analysis)
            .filter((row) => row.jobId != null && !byJobId.has(row.jobId))
            .slice(0, TRACK_SUGGESTIONS);
    }, [analysis, byJobId]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={(props) => (
                <button
                    {...props}
                    className={cn(props.className, "flex w-full items-center gap-1.5 border-b border-border/70 px-4 py-2.5 text-left text-[13px] text-muted-foreground transition-colors hover:bg-foreground/3 hover:text-foreground sm:px-5")}
                >
                    <PlusIcon className={"size-3.5"} /> Track a job
                </button>
            )} />
            <DropdownMenuContent align={"start"} className={"w-80"}>
                {candidates.length > 0 ? candidates.map((row) => (
                    <DropdownMenuItem
                        key={row.key}
                        disabled={row.jobId != null && pending.has(row.jobId)}
                        onClick={() => row.jobId != null && toggleSave({
                            jobId: row.jobId, role: row.role, company: row.company, match: row.match
                        })}
                        className={"cursor-pointer gap-2.5"}
                    >
                        <Monogram label={row.company ?? row.role} />
                        <span className={"min-w-0 flex-1"}>
                            <span className={"block truncate text-[13px]"}>{row.role}</span>
                            <span className={"block truncate font-mono text-[10.5px] text-muted-foreground"}>{row.company ?? "—"}</span>
                        </span>
                        <ScoreChip value={row.match} />
                    </DropdownMenuItem>
                )) : (
                    <p className={"px-2 py-2 text-xs text-muted-foreground"}>
                        {analysis ? "Every current match is already tracked." : "Run a scan first — matches show up here."}
                    </p>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    render={(props) => (
                        <Link {...props} href={"/dashboard/opportunities"} className={cn(props.className, "cursor-pointer text-xs text-muted-foreground")}>
                            Browse all opportunities →
                        </Link>
                    )}
                />
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default function ApplicationsPage() {
    const {apps, state, counts, refresh, toggleSave} = useApplications();
    const [view, setView] = useState<ViewId>("all");

    // Long-press on a row (touch only) opens the action sheet — the delete
    // column is hidden on phones, this is its mobile home.
    const [sheet, setSheet] = useState<ApplicationRow | null>(null);
    const pressTimer = useRef<number | null>(null);
    const startPress = (app: ApplicationRow) => {
        pressTimer.current = window.setTimeout(() => setSheet(app), 450);
    };
    const cancelPress = () => {
        if (pressTimer.current != null) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
    };
    // Optimistic updates replace rows, so read the live one while open.
    const sheetApp = sheet ? apps.find((a) => a.id === sheet.id) ?? sheet : null;

    const visible = useMemo(() => [...apps]
        .filter((app) => view === "all"
            || (view === "closed") === CLOSED.includes(app.status))
        .sort((a, b) => new Date(b.last_status_at).getTime() - new Date(a.last_status_at).getTime()),
        [apps, view]);

    const closed = counts.rejected + counts.withdrawn;

    return (
        <div className={"flex min-h-screen flex-col"}>
            <PageBar
                title={"Applications"}
                meta={state === "ready" ? `${apps.length} tracked · ${counts.interview} in interview` : undefined}
            />

            {state === "signed-out" && (
                <div className={"px-4 py-8 sm:px-8"}>
                    <div className={"flex flex-col items-center gap-3 rounded-lg border border-border bg-card/50 px-6 py-14 text-center"}>
                        <p className={"text-sm text-muted-foreground"}>
                            Tracking lives with your account, so it follows you across devices.
                        </p>
                        <Link
                            href={"/sign-in"}
                            className={"rounded-md bg-accent-lime px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.1em] text-accent-lime-ink transition-opacity hover:opacity-90"}
                        >
                            Sign in
                        </Link>
                    </div>
                </div>
            )}

            {state === "error" && (
                <div className={"mx-4 mt-4 flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/8 px-4 py-3 text-sm sm:mx-8"}>
                    <span>Couldn&apos;t load your applications.</span>
                    <button onClick={() => refresh()} className={"font-mono text-xs uppercase tracking-[0.1em] text-primary hover:underline"}>
                        Retry
                    </button>
                </div>
            )}

            {(state === "ready" || state === "loading") && (
                <>
                    <Toolbar>
                        <div className={"flex gap-1.5"} role={"tablist"} aria-label={"Filter applications"}>
                            {VIEWS.map((v) => (
                                <ViewChip
                                    key={v.id}
                                    active={view === v.id}
                                    onClick={() => setView(v.id)}
                                    count={v.id === "all" ? apps.length : v.id === "closed" ? closed : apps.length - closed}
                                >
                                    {v.label}
                                </ViewChip>
                            ))}
                        </div>
                        <div className={"ml-auto flex items-center gap-4"}>
                            {[...PIPELINE.map((status) => ({label: STATUS_LABEL[status], n: counts[status]})),
                                {label: "Closed", n: closed}].map((cell) => (
                                <span key={cell.label} className={"hidden font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground md:inline"}>
                                    <b className={"mr-1 text-[12px] font-bold tabular-nums text-foreground"}>{cell.n}</b>{cell.label}
                                </span>
                            ))}
                            <AddApplicationDialog />
                        </div>
                    </Toolbar>

                    {visible.length > 0 ? (
                        <div className={"flex-1 overflow-x-auto"}>
                            <table className={"w-full border-collapse"}>
                                <thead>
                                    <tr>
                                        <GridTh icon={TypeIcon} className={"min-w-36 pl-4 sm:pl-5 md:min-w-44"}>Role</GridTh>
                                        <GridTh icon={BuildingIcon} className={"hidden min-w-32 md:table-cell"}>Company</GridTh>
                                        <GridTh icon={GaugeIcon}>Match</GridTh>
                                        <GridTh icon={MapPinIcon} className={"hidden lg:table-cell"}>Location</GridTh>
                                        <GridTh icon={RssIcon} className={"hidden md:table-cell"}>Source</GridTh>
                                        <GridTh icon={CircleDashedIcon}>Status</GridTh>
                                        <GridTh icon={FileTextIcon} className={"hidden md:table-cell"}>CV</GridTh>
                                        <GridTh icon={CalendarIcon} className={"hidden xl:table-cell"}>First moved</GridTh>
                                        <GridTh icon={ClockIcon} className={"hidden sm:table-cell"}>Updated</GridTh>
                                        <GridTh className={"hidden w-16 sm:table-cell"} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {visible.map((app) => (
                                        <tr
                                            key={app.id}
                                            onTouchStart={() => startPress(app)}
                                            onTouchEnd={cancelPress}
                                            onTouchMove={cancelPress}
                                            className={cn(
                                                "transition-colors hover:bg-foreground/3",
                                                CLOSED.includes(app.status) && "opacity-55"
                                            )}>
                                            <td className={cn(GRID_TD, "pl-4 sm:pl-5")}>
                                                {app.url ? (
                                                    <a
                                                        href={app.url}
                                                        target={"_blank"}
                                                        rel={"noreferrer noopener"}
                                                        className={"group inline-flex items-center gap-1 font-medium hover:underline"}
                                                    >
                                                        {app.title ?? "Untitled role"}
                                                        <ArrowUpRightIcon className={"size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"} />
                                                    </a>
                                                ) : (
                                                    <span className={"font-medium"}>{app.title ?? "Untitled role"}</span>
                                                )}
                                                {app.company && (
                                                    <span className={"mt-0.5 block truncate font-mono text-[10.5px] text-muted-foreground md:hidden"}>
                                                        {app.company}
                                                    </span>
                                                )}
                                            </td>
                                            <td className={cn(GRID_TD, "hidden md:table-cell")}>
                                                {app.company ? (
                                                    <span className={"inline-flex items-center gap-2"}>
                                                        <Monogram label={app.company} />
                                                        <span className={"truncate text-[12.5px]"}>{app.company}</span>
                                                    </span>
                                                ) : <span className={"text-muted-foreground/50"}>—</span>}
                                            </td>
                                            <td className={GRID_TD}><ScoreChip value={app.match_score} /></td>
                                            <td className={cn(GRID_TD, "hidden font-mono text-[11px] text-muted-foreground lg:table-cell")}>
                                                {app.remote ? "Remote" : app.location ?? "—"}
                                            </td>
                                            <td className={cn(GRID_TD, "hidden md:table-cell")}>
                                                {app.provider ? (
                                                    <span className={"inline-flex items-center gap-1.5"}>
                                                        <Monogram label={app.provider} className={"size-4 text-[9px]"} />
                                                        <span className={"font-mono text-[11px] lowercase text-muted-foreground"}>{app.provider}</span>
                                                    </span>
                                                ) : <span className={"text-muted-foreground/50"}>—</span>}
                                            </td>
                                            <td className={GRID_TD}><StatusDisclosure app={app} /></td>
                                            <td className={cn(GRID_TD, "hidden md:table-cell")}><CvSnapshot app={app} /></td>
                                            <td className={cn(GRID_TD, "hidden font-mono text-[11px] text-muted-foreground xl:table-cell")}>
                                                {app.status !== "saved" && app.applied_at
                                                    ? new Date(app.applied_at).toLocaleDateString(undefined, {month: "short", day: "numeric"})
                                                    : "—"}
                                            </td>
                                            <td className={cn(GRID_TD, "hidden font-mono text-[11px] text-muted-foreground sm:table-cell")}>
                                                {timeAgo(app.last_status_at)}
                                            </td>
                                            <td className={cn(GRID_TD, "hidden py-1 sm:table-cell")}><RemoveCell app={app} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <TrackJobMenu />
                        </div>
                    ) : state === "ready" && (
                        <div className={"px-4 py-8 sm:px-8"}>
                            <div className={"flex flex-col items-center gap-4 rounded-lg border border-border bg-card/50 px-6 py-12 text-center"}>
                                <Folder color={"orange"} size={"sm"} aria-hidden />
                                <p className={"text-sm text-muted-foreground"}>
                                    {view === "all" ? "Your applications folder is empty." : "Nothing in this view."}
                                </p>
                                <Link href={"/dashboard/opportunities"} className={"text-sm text-primary hover:underline"}>
                                    Save a job in Opportunities → it lands here
                                </Link>
                            </div>
                        </div>
                    )}

                    <p aria-hidden className={"hidden -rotate-1 px-5 py-3 font-hand text-lg text-primary/70 sm:block"}>
                        click a status to move it along → later this feeds interview rates, response times, what&apos;s working
                    </p>
                </>
            )}

            <AnimatePresence>
                {sheetApp && (
                    <>
                        <motion.div
                            key={"sheet-backdrop"}
                            initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}
                            onClick={() => setSheet(null)}
                            className={"fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"}
                        />
                        <motion.div
                            key={"sheet"}
                            initial={{y: "100%"}} animate={{y: 0}} exit={{y: "100%"}}
                            transition={{type: "spring", bounce: 0.2, duration: 0.4}}
                            className={"fixed inset-x-0 bottom-0 z-50 flex flex-col gap-4 rounded-t-2xl border-t border-input bg-popover p-5 pb-8"}
                        >
                            <div className={"mx-auto h-1 w-10 rounded-full bg-foreground/20"} />
                            <div className={"flex items-center gap-3"}>
                                <span className={"min-w-0 flex-1"}>
                                    <span className={"block truncate font-medium"}>{sheetApp.title ?? "Untitled role"}</span>
                                    <span className={"block truncate font-mono text-[11px] text-muted-foreground"}>{sheetApp.company ?? "—"}</span>
                                </span>
                                <ScoreChip value={sheetApp.match_score} />
                            </div>
                            <div className={"flex items-center gap-3"}>
                                <span className={"font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"}>Status</span>
                                <StatusDisclosure app={sheetApp} />
                            </div>
                            <div className={"flex items-center gap-3 border-t border-border pt-4"}>
                                {sheetApp.url && (
                                    <a
                                        href={sheetApp.url}
                                        target={"_blank"}
                                        rel={"noreferrer noopener"}
                                        className={"inline-flex items-center gap-1.5 rounded-md bg-accent-lime px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-accent-lime-ink"}
                                    >
                                        View job <ArrowUpRightIcon className={"size-3"} />
                                    </a>
                                )}
                                {sheetApp.status === "saved" && sheetApp.id > 0 && sheetApp.job_id != null ? (
                                    <DeleteButton
                                        className={"ml-auto"}
                                        onConfirm={() => {
                                            toggleSave({
                                                jobId: sheetApp.job_id!,
                                                role: sheetApp.title,
                                                company: sheetApp.company,
                                                match: Number(sheetApp.match_score) || null
                                            });
                                            setSheet(null);
                                        }}
                                    />
                                ) : sheetApp.status !== "saved" && (
                                    <p className={"ml-auto max-w-[55%] text-right text-[10.5px] leading-snug text-muted-foreground"}>
                                        Sent applications keep their history — they can be closed, not deleted.
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
