'use client'

import React, {useEffect} from 'react'
import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";

import {useAnalysis} from "@/lib/analysis-store";
import {cn} from "@/lib/utils";

const TABS = [
    {href: "/analysis", label: "Overview"},
    {href: "/analysis/skills", label: "Skills"},
    {href: "/analysis/gaps", label: "Gaps"},
    {href: "/analysis/jobs", label: "Matches"}
] as const;

export default function AnalysisLayout({children}: LayoutProps<"/analysis">) {
    const {analysis, hydrated, fileName} = useAnalysis();
    const pathname = usePathname();
    const router = useRouter();

    // Only redirect once localStorage has actually been read, otherwise the
    // first paint would bounce every visitor back to the landing page.
    useEffect(() => {
        if (hydrated && !analysis) router.replace("/");
    }, [hydrated, analysis, router]);

    if (!hydrated || !analysis) return null;

    return (
        <div className={"mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-5 py-6 lg:px-8"}>
            <header className={"flex flex-wrap items-center justify-between gap-4"}>
                <nav className={"flex w-fit max-w-full flex-wrap gap-1 rounded-lg border border-border bg-card p-1"}>
                    {TABS.map((tab) => {
                        const active = pathname === tab.href;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                    "inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 font-mono text-xs uppercase tracking-[0.12em] transition-colors",
                                    active
                                        ? "bg-secondary text-foreground"
                                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                )}
                            >
                                <span
                                    aria-hidden
                                    className={cn(
                                        "size-1.5 rounded-full transition-colors",
                                        active ? "bg-primary" : "bg-border"
                                    )}
                                />
                                {tab.label}
                            </Link>
                        )
                    })}
                </nav>

                <p className={"font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"}>
                    <span className={"text-primary"}>{analysis.market.jobs_analyzed.toLocaleString()}</span>
                    {" "}postings analyzed
                    {fileName ? ` · ${fileName}` : ""}
                </p>
            </header>

            {children}
        </div>
    )
}
