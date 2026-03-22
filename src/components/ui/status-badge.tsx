import { cn } from "@/lib/utils"
import {
    STATUS_COLORS,
    STATUS_LABELS,
    STATUS_DOT_COLORS_MAP,
    NEURAD_STATUS_MAP,
} from "@/lib/constants"

interface StatusBadgeProps {
    status: string
    variant?: "order" | "neurad"
    showDot?: boolean
    className?: string
}

/**
 * Unified status badge used across all tables and cards.
 * Single source of truth for rendering order/neurad status pills.
 */
export function StatusBadge({ status, variant = "order", showDot = true, className }: StatusBadgeProps) {
    let label: string
    let color: string
    let dotColor: string

    if (variant === "neurad") {
        const info = NEURAD_STATUS_MAP[status] || { label: status, color: "bg-muted text-muted-foreground", dotColor: "bg-muted-foreground" }
        label = info.label
        color = info.color
        dotColor = info.dotColor
    } else {
        label = STATUS_LABELS[status] || status.replace(/_/g, " ")
        color = STATUS_COLORS[status] || "bg-neutral-500/10 text-neutral-500"
        dotColor = STATUS_DOT_COLORS_MAP[status] || "bg-neutral-400"
    }

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium max-w-full overflow-hidden",
                color,
                className,
            )}
        >
            {showDot && (
                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
            )}
            <span className="truncate">{label}</span>
        </span>
    )
}
