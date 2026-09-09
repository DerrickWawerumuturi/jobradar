/**
 * Where a job actually lives, derived from its posting URL. Users know
 * "LinkedIn", not the aggregator API that found it.
 */

const BOARDS: [RegExp, string][] = [
    [/linkedin\./i, "LinkedIn"],
    [/bebee\./i, "beBee"],
    [/himalayas\.app/i, "Himalayas"],
    [/startup\.jobs/i, "Startup.jobs"],
    [/indeed\./i, "Indeed"],
    [/glassdoor\./i, "Glassdoor"],
    [/themuse\./i, "The Muse"],
    [/remotive\./i, "Remotive"],
    [/jooble\./i, "Jooble"],
    [/wellfound\.|angel\.co/i, "Wellfound"],
    [/greenhouse\./i, "Greenhouse"],
    [/lever\.co/i, "Lever"],
    [/workable\./i, "Workable"],
    [/smartrecruiters\./i, "SmartRecruiters"],
    [/bamboohr\./i, "BambooHR"],
    [/ziprecruiter\./i, "ZipRecruiter"],
    [/brightermonday\./i, "BrighterMonday"],
    [/fuzu\./i, "Fuzu"],
];

export interface JobSource {
    /** "LinkedIn", "acme.com", or "Added by you". */
    label: string;
    /** Root domain for favicon lookup; null when there is none. */
    domain: string | null;
}

/** Root domain, aware of two-part TLDs: careers.safaricom.co.ke -> safaricom.co.ke */
function rootDomain(host: string): string {
    const keep = /\.(co|com|or|org|net|ac|go|gov)\.[a-z]{2}$/i.test(host) ? 3 : 2;
    const parts = host.split(".");
    return parts.length > keep ? parts.slice(-keep).join(".") : host;
}

export function jobSource(url: string | null | undefined, provider: string | null | undefined): JobSource {
    if (url) {
        try {
            const host = new URL(url).hostname.replace(/^www\./, "");
            const root = rootDomain(host);
            for (const [pattern, label] of BOARDS) {
                if (pattern.test(host)) return {label, domain: root};
            }
            // Unrecognized host: it's the company's own site — show it honestly.
            return {label: root, domain: root};
        } catch {
            /* fall through */
        }
    }
    if (provider === "manual") return {label: "Added by you", domain: null};
    return {label: "—", domain: null};
}
