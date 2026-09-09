import React from 'react'

interface PanelHeaderProps {
    title: string;
    /** Lighter-weight qualifier rendered after the title, editorial-style. */
    qualifier?: string;
    /** Subtitle before the lime slash. */
    lead: React.ReactNode;
    /** Subtitle after the lime slash; omit for a plain subtitle. */
    tail?: React.ReactNode;
}

/**
 * The centred editorial header every chart panel shares: bold uppercase title
 * with a lighter parenthesised qualifier, and a mono subtitle split by the
 * lime accent slash. Ink colours come from the enclosing `.chart-panel` scope
 * and fall back to the page tokens outside one.
 */
const PanelHeader = ({title, qualifier, lead, tail}: PanelHeaderProps) => (
    <div className={"flex flex-col items-center gap-1.5 text-center"}>
        <h2 className={"font-heading text-lg font-bold uppercase tracking-[0.05em] text-[var(--panel-ink,var(--foreground))]"}>
            {title}
            {qualifier && (
                <>
                    {" "}
                    <span className={"font-medium opacity-70"}>({qualifier})</span>
                </>
            )}
        </h2>
        <p className={"font-mono text-xs text-[var(--panel-ink-muted,var(--muted-foreground))]"}>
            {lead}
            {tail && (
                <>
                    {" "}
                    <span aria-hidden className={"font-bold text-accent-lime"}>/</span>
                    {" "}
                    {tail}
                </>
            )}
        </p>
    </div>
)
export default PanelHeader
