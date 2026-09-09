import React from 'react'
import {cn} from "@/lib/utils";

interface AnnotationProps {
    children: React.ReactNode
    /** Mirrors the arrow so it points down-left instead of down-right. */
    flip?: boolean
    hideArrow?: boolean
    className?: string
}

/**
 * A handwritten margin note with a sketched arrow — decorative guidance,
 * invisible to screen readers.
 */
const Annotation = ({children, flip, hideArrow, className}: AnnotationProps) => (
    <div
        aria-hidden
        className={cn(
            // Hidden on small screens: margin notes need margins to live in.
            "pointer-events-none hidden select-none items-start gap-1 sm:flex",
            flip && "flex-row-reverse",
            className
        )}
    >
        <span className={"anim-ink -rotate-2 font-hand text-2xl leading-tight text-primary/90"}>
            {children}
        </span>
        {!hideArrow && (
            <svg
                viewBox={"0 0 40 44"}
                fill={"none"}
                className={cn("mt-4 size-9 shrink-0 text-primary/80", flip && "-scale-x-100")}
            >
                <path
                    className={"anim-draw"}
                    d={"M5 4 C 25 7, 34 19, 28 37"}
                    stroke={"currentColor"}
                    strokeWidth={"2"}
                    strokeLinecap={"round"}
                />
                <path
                    className={"anim-draw-2"}
                    d={"M20 31 L 28 40 L 34.5 29.5"}
                    stroke={"currentColor"}
                    strokeWidth={"2"}
                    strokeLinecap={"round"}
                    strokeLinejoin={"round"}
                />
            </svg>
        )}
    </div>
)
export default Annotation
