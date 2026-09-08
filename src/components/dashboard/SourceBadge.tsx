'use client'

import React, {useState} from 'react'
import {jobSource} from "@/lib/job-source";
import {Monogram} from "@/components/dashboard/bits";

interface SourceBadgeProps {
    url: string | null | undefined;
    provider: string | null | undefined;
}

/** The venue a job lives on: its favicon and a name people recognize. */
export default function SourceBadge({url, provider}: SourceBadgeProps) {
    const [failed, setFailed] = useState(false);
    const {label, domain} = jobSource(url, provider);

    if (label === "—") return <span className={"text-muted-foreground/50"}>—</span>;

    return (
        <span className={"inline-flex items-center gap-1.5"}>
            {domain && !failed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={`/api/logo?q=${domain}`}
                    alt=""
                    width={16}
                    height={16}
                    loading={"lazy"}
                    onError={() => setFailed(true)}
                    className={"size-4 shrink-0 rounded-[4px] object-cover"}
                />
            ) : (
                <Monogram label={label} className={"size-4 text-[9px]"} />
            )}
            <span className={"font-mono text-[11px] text-muted-foreground"}>{label}</span>
        </span>
    )
}
