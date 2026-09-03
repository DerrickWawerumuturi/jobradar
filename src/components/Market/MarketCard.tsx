import React from 'react'
import {cn} from "@/lib/utils";

interface MarketCardInfo {
    label: string,
    value: string | number,
    hint?: string,
    /** Draws the value in the primary accent — reserve it for the headline metric. */
    accent?: boolean,
    className?: string,
}

const MarketCard = ({label, value, hint, accent, className}: MarketCardInfo) => {
    return (
        <div
            className={cn(
                "relative flex min-w-0 flex-col justify-between gap-4 overflow-hidden rounded-xl border border-border bg-card px-4 py-4",
                className
            )}
        >
            {/* Top hairline reads `--tile-accent` set by the parent (ramp sweep); accent cards fall back to primary. */}
            <span
                aria-hidden
                className={"absolute inset-x-0 top-0 h-0.5"}
                style={{
                    background: accent
                        ? "var(--tile-accent, var(--primary))"
                        : "var(--tile-accent, transparent)"
                }}
            />
            <h3 className={"truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"}>
                {label}
            </h3>
            <div className={"flex min-w-0 flex-col gap-1"}>
                <p
                    className={cn(
                        "truncate font-mono text-2xl leading-none font-bold tracking-tight tabular-nums xl:text-3xl",
                        accent && "text-primary"
                    )}
                    title={typeof value === "string" ? value : undefined}
                >
                    {value}
                </p>
                {hint && (
                    <p
                        className={"truncate font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground"}
                        title={hint}
                    >
                        {hint}
                    </p>
                )}
            </div>
        </div>
    )
}
export default MarketCard
