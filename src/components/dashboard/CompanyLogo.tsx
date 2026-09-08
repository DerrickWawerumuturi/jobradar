'use client'

import React, {useState} from 'react'
import {cn} from "@/lib/utils";
import {Monogram} from "@/components/dashboard/bits";
import {jobSource} from "@/lib/job-source";

/** "Acme Technologies Ltd." -> "acmetechnologies" */
function slugify(company: string): string {
    return company
        .toLowerCase()
        .replace(/\b(inc|ltd|llc|gmbh|corp|co|group|labs|technologies|technology|solutions)\b\.?/g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
}

interface CompanyLogoProps {
    company: string | null;
    /** The job's posting URL: a career-page host IS the company's domain. */
    url?: string | null;
    className?: string;
}

/**
 * Best-effort real company logo via unavatar (which 404s honestly when it has
 * nothing, unlike favicon services), falling back to the colored monogram.
 * Candidate order: exact domain guess, then name lookup.
 */
export default function CompanyLogo({company, url, className}: CompanyLogoProps) {
    const [step, setStep] = useState(0);
    if (!company) return <Monogram label={"?"} className={className} />;

    // jobSource labels company-site hosts with their own domain: that domain
    // is the authoritative logo lookup, ahead of any name guessing.
    const source = jobSource(url, null);
    const ownDomain = source.domain && source.label === source.domain ? source.domain : null;
    const slug = slugify(company);
    // Same-origin proxy: third-party favicon hosts get adblocked/rate-limited.
    const candidates = [
        ...(ownDomain ? [`/api/logo?q=${ownDomain}`] : []),
        ...(slug ? [`/api/logo?q=${slug}.com`, `/api/logo?q=${slug}`] : [])
    ];

    if (step >= candidates.length) return <Monogram label={company} className={className} />;

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={candidates[step]}
            alt=""
            width={20}
            height={20}
            loading={"lazy"}
            onError={() => setStep((s) => s + 1)}
            className={cn("size-5 shrink-0 rounded-[5px] object-cover", className)}
        />
    )
}
