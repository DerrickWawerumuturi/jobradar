'use client'

import React from 'react'
import Link from "next/link";
import {useCv} from "@/lib/cv-store";
import {PageBar} from "@/components/dashboard/bits";
import CVReviewForm from "@/components/Form";

export default function ProfilePage() {
    const {cv} = useCv();

    return (
        <div className={"flex min-h-screen flex-col"}>
            <PageBar title={"My profile"} meta={cv?.name ?? undefined} />

            {!cv ? (
                <div className={"px-4 py-8 sm:px-8"}>
                    <div className={"flex flex-col items-center gap-3 rounded-lg border border-border bg-card/50 px-6 py-14 text-center"}>
                        <p className={"text-sm text-muted-foreground"}>
                            No profile yet — it's built from your CV.
                        </p>
                        <Link
                            href={"/"}
                            className={"rounded-md bg-accent-lime px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.1em] text-accent-lime-ink transition-opacity hover:opacity-90"}
                        >
                            Upload a CV
                        </Link>
                    </div>
                </div>
            ) : (
                <div className={"mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 sm:px-5"}>
                    <p className={"text-sm text-muted-foreground"}>
                        This is the profile every match is scored against — keep it honest and current.
                    </p>
                    <CVReviewForm />
                </div>
            )}
        </div>
    )
}
