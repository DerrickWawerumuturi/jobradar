'use client'

import React, {useState} from 'react'
import Link from "next/link";
import {signOut, useSession} from "next-auth/react";
import {AlertTriangleIcon, ClipboardListIcon, DatabaseIcon, FileTextIcon, RadarIcon, Trash2Icon} from "lucide-react";
import {toast} from "sonner";

import {cn, initials} from "@/lib/utils";
import {useCv} from "@/lib/cv-store";
import {useAnalysis} from "@/lib/analysis-store";
import {useApplications} from "@/lib/applications-store";
import {DeleteAccount, DeleteMyData} from "@/lib/api";
import {IconBadge, PageBar, Panel, SectionLabel, TagChip} from "@/components/dashboard/bits";
import CVReviewForm from "@/components/Form";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import {Dialog, DialogContent, DialogTitle, DialogTrigger} from "@/components/ui/dialog";

function ConfirmDialog({trigger, title, body, confirmLabel, onConfirm, destructive}: {
    trigger: React.ReactNode;
    title: string;
    body: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
    destructive?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={(props) => <span {...props}>{trigger}</span>} />
            <DialogContent className={"sm:max-w-md"}>
                <DialogTitle className={"text-base font-bold"}>{title}</DialogTitle>
                <p className={"text-sm text-muted-foreground"}>{body}</p>
                <button
                    onClick={async () => {
                        setBusy(true);
                        try {
                            await onConfirm();
                            setOpen(false);
                        } catch (e) {
                            toast.error(e instanceof Error ? e.message : "That failed, nothing was removed");
                        } finally {
                            setBusy(false);
                        }
                    }}
                    disabled={busy}
                    className={cn(
                        "rounded-md px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.1em] transition-opacity hover:opacity-90 disabled:opacity-50",
                        destructive ? "bg-destructive text-white" : "bg-accent-lime text-accent-lime-ink"
                    )}
                >
                    {busy ? "Working…" : confirmLabel}
                </button>
            </DialogContent>
        </Dialog>
    )
}

const ACTION_BTN = "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors";

export default function ProfilePage() {
    const {data: session} = useSession();
    const {cv, clear: clearCv} = useCv();
    const {analysis, fileName, clear: clearAnalysis} = useAnalysis();
    const {apps, refresh} = useApplications();

    const wipeData = async () => {
        await DeleteMyData();
        clearCv();
        clearAnalysis();
        await refresh();
        toast("Your data is wiped. The account stays, a fresh scan starts you over.");
    };

    const wipeAccount = async () => {
        await DeleteAccount();
        clearCv();
        clearAnalysis();
        toast("Account deleted. Take care out there.");
        await signOut({redirectTo: "/"});
    };

    const dataRows = [
        {icon: FileTextIcon, color: "#f76b15", label: "CV", value: cv ? (cv.name ?? "saved") : "none"},
        {icon: RadarIcon, color: "#0091ff", label: "Last scan", value: analysis ? (fileName ?? "stored") : "none"},
        {icon: ClipboardListIcon, color: "#30a46c", label: "Applications", value: `${apps.length} tracked`}
    ];

    return (
        <div className={"flex min-h-screen flex-col"}>
            <PageBar title={"My profile"} meta={cv?.name ?? undefined} />

            <div className={"mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 sm:px-5"}>
                {/* Who you are */}
                <Panel className={"flex items-center gap-4"}>
                    <Avatar className={"size-14"}>
                        <AvatarImage src={session?.user?.image ?? undefined} />
                        <AvatarFallback className={"bg-primary text-lg text-white"}>
                            {session?.user?.name ? initials(session.user.name) : "?"}
                        </AvatarFallback>
                    </Avatar>
                    <div className={"min-w-0 flex-1"}>
                        <p className={"truncate text-lg font-bold"}>{session?.user?.name ?? "Not signed in"}</p>
                        <p className={"truncate text-sm text-muted-foreground"}>{session?.user?.email}</p>
                        <p className={"mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70"}>
                            Signed in with Google
                        </p>
                    </div>
                    {analysis && <TagChip tone={"have"}>scan on file</TagChip>}
                </Panel>

                {/* What we hold for you */}
                <Panel className={"flex flex-col gap-4"}>
                    <div className={"flex items-center gap-2"}>
                        <IconBadge icon={DatabaseIcon} color={"#0ca678"} />
                        <SectionLabel>Your data</SectionLabel>
                    </div>
                    <div className={"grid gap-2 sm:grid-cols-3"}>
                        {dataRows.map((row) => (
                            <div key={row.label} className={"rounded-lg border border-border bg-background/40 px-3 py-2.5"}>
                                <p className={"flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground"}>
                                    <IconBadge icon={row.icon} color={row.color} className={"size-4 rounded-[5px]"} /> {row.label}
                                </p>
                                <p className={"mt-1 truncate text-[13px] font-medium"}>{row.value}</p>
                            </div>
                        ))}
                    </div>
                    <div className={"flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"}>
                        <p className={"max-w-sm text-[11.5px] leading-snug text-muted-foreground"}>
                            Wipes the CV, stored scan and tracked applications from our servers
                            and this browser. Your account and sign-in stay.
                        </p>
                        <ConfirmDialog
                            trigger={
                                <span className={cn(ACTION_BTN, "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground")}>
                                    <Trash2Icon className={"size-3.5"} /> Delete my data
                                </span>
                            }
                            title={"Wipe your data?"}
                            body={"CV, stored scan, and every tracked application will be removed from our servers and this browser. Your account remains, and a fresh scan rebuilds everything. No undo."}
                            confirmLabel={"Wipe my data"}
                            onConfirm={wipeData}
                        />
                    </div>
                </Panel>

                {/* The CV itself */}
                {cv ? (
                    <Panel>
                        <Accordion>
                            <AccordionItem value={"cv"}>
                                <AccordionTrigger className={"py-1"}>
                                    <span className={"flex items-center gap-2.5"}>
                                        <IconBadge icon={FileTextIcon} color={"#f76b15"} />
                                        <span className={"text-left"}>
                                            <span className={"block text-sm font-bold"}>Your CV</span>
                                            <span className={"block font-mono text-[10.5px] text-muted-foreground"}>
                                                what every match is scored against, keep it current
                                            </span>
                                        </span>
                                    </span>
                                </AccordionTrigger>
                                <AccordionContent className={"pt-4"}>
                                    <CVReviewForm />
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </Panel>
                ) : (
                    <Panel className={"flex flex-col items-center gap-3 py-10 text-center"}>
                        <p className={"text-sm text-muted-foreground"}>No CV yet. It&apos;s built from your first scan.</p>
                        <Link
                            href={"/dashboard/scan"}
                            className={"rounded-md bg-accent-lime px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.1em] text-accent-lime-ink transition-opacity hover:opacity-90"}
                        >
                            Run a scan
                        </Link>
                    </Panel>
                )}

                {/* Danger zone: its own card, at the bottom, unmissable */}
                <section className={"rounded-2xl border border-destructive/40 bg-destructive/5 p-4 sm:p-5"}>
                    <div className={"flex items-center gap-2"}>
                        <AlertTriangleIcon className={"size-4 text-destructive"} />
                        <SectionLabel className={"text-destructive"}>Danger zone</SectionLabel>
                    </div>
                    <div className={"mt-3 flex flex-wrap items-center justify-between gap-3"}>
                        <p className={"max-w-sm text-[11.5px] leading-snug text-muted-foreground"}>
                            Deletes your account and everything under it, permanently.
                            You&apos;ll be signed out and treated as brand new if you ever return.
                        </p>
                        <ConfirmDialog
                            trigger={
                                <span className={cn(ACTION_BTN, "border-destructive/40 text-destructive hover:bg-destructive/10")}>
                                    <Trash2Icon className={"size-3.5"} /> Delete account
                                </span>
                            }
                            title={"Delete your account?"}
                            body={"Account, CV, stored scan, and every tracked application, gone permanently from our servers and this browser. There is no undo and no recovery."}
                            confirmLabel={"Yes, delete my account"}
                            onConfirm={wipeAccount}
                            destructive
                        />
                    </div>
                </section>
            </div>
        </div>
    )
}
