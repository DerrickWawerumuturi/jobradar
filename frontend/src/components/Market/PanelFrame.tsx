import React from 'react'

/**
 * The boxed plot frame every chart shares: a thin rounded rectangle anchored
 * to the data area, used as a Recharts `<ReferenceArea shape={...}>`.
 * Recharts supplies x/y/width/height; the stroke reads `--chart-frame`, which
 * each `.chart-panel` colourway scopes to suit its ground.
 */
export interface FrameRectProps {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}

export function FrameRect({x, y, width, height}: FrameRectProps) {
    return (
        <rect
            x={x}
            y={y}
            width={width}
            height={height}
            rx={10}
            fill={"none"}
            stroke={"var(--chart-frame, var(--border))"}
            strokeWidth={1.5}
        />
    )
}
