'use client'

import React, {useState} from 'react'
import {AnimatePresence, motion, MotionConfig} from "motion/react";
import {ChevronDownIcon} from "lucide-react";

import {ApplicationRow, ApplicationStatus} from "@/types/jobradar";
import {useApplications} from "@/lib/applications-store";
import {StatusChip} from "@/components/dashboard/bits";

const TRANSITIONS: Exclude<ApplicationStatus, "saved">[] =
    ["applied", "screening", "interview", "offer", "rejected", "withdrawn"];

/**
 * Watermelon's filter-disclosure feel: the chip morphs into a small panel of
 * status chips that spring in staggered; pick one and it snaps back.
 */
export default function StatusDisclosure({app}: { app: ApplicationRow }) {
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
