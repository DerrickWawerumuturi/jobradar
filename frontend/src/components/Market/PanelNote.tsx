import React from 'react'

/**
 * A friendly "Good to know" footnote pinned to the bottom of a chart panel:
 * lime tag, hairline separator, and short bullet points rather than prose so
 * the guidance scans in seconds. Works inside a `.chart-panel` scope (panel
 * inks) and falls back to the page tokens outside one.
 */
const PanelNote = ({points}: {points: React.ReactNode[]}) => (
    <div className={"flex flex-col gap-2 border-t border-border pt-3.5 sm:flex-row sm:items-start sm:gap-5"}>
        <span className={"mt-0.5 shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-accent-lime"}>
            Good&nbsp;to&nbsp;know
        </span>
        <ul className={"flex min-w-0 flex-col gap-1.5 text-xs leading-relaxed text-[var(--panel-ink-muted,var(--muted-foreground))]"}>
            {points.map((point, index) => (
                <li key={index} className={"flex gap-2"}>
                    <span aria-hidden className={"mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent-lime/70"} />
                    <span className={"min-w-0"}>{point}</span>
                </li>
            ))}
        </ul>
    </div>
)
export default PanelNote
