'use client'

import React from 'react'
import {signOut} from "next-auth/react";
import {RefreshCwIcon} from "lucide-react";

import {useApplications} from "@/lib/applications-store";

/**
 * Shown when the backend refuses this browser's token: the session was minted
 * before an app update and carries a stale identity. One fresh sign-in fixes
 * it and reconnects the account's data.
 */
export default function StaleSessionBanner() {
    const {staleSession} = useApplications();
    if (!staleSession) return null;

    return (
        <div className={"flex flex-wrap items-center justify-between gap-3 border-b border-primary/40 bg-primary/10 px-4 py-2.5 sm:px-5"}>
            <p className={"text-[12.5px] text-foreground"}>
                This sign-in predates an app update, so your data can&apos;t load here.
                One fresh sign-in reconnects everything.
            </p>
            <button
                onClick={() => signOut({redirectTo: "/sign-in"})}
                className={"inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-primary-foreground transition-opacity hover:opacity-90"}
            >
                <RefreshCwIcon className={"size-3.5"} /> Sign out &amp; back in
            </button>
        </div>
    )
}
