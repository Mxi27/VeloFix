/**
 * Todoist-style status tag colors — clean pill badges with subtle tints.
 * Single source of truth for all status colors across the app.
 */
export const STATUS_COLORS: Record<string, string> = {
    eingegangen:      "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    warten_auf_teile: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    in_bearbeitung:   "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    kontrolle_offen:  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    abholbereit:      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    abgeholt:         "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    abgeschlossen:    "bg-neutral-500/10 text-neutral-500 dark:text-neutral-400",
    // Generic task statuses (used by dashboard cards)
    todo:             "bg-neutral-500/10 text-neutral-500 dark:text-neutral-400",
    in_progress:      "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    done:             "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
}

/** Dot indicator colors for each order status — used as `bg-*` in the table. */
export const STATUS_DOT_COLORS_MAP: Record<string, string> = {
    eingegangen:      "bg-blue-500",
    warten_auf_teile: "bg-orange-500",
    in_bearbeitung:   "bg-violet-500",
    kontrolle_offen:  "bg-amber-500",
    abholbereit:      "bg-emerald-500",
    abgeholt:         "bg-teal-500",
    abgeschlossen:    "bg-neutral-400",
}

export const STATUS_LABELS: Record<string, string> = {
    eingegangen:      "Eingegangen",
    warten_auf_teile: "Warten auf Teile",
    in_bearbeitung:   "In Bearbeitung",
    kontrolle_offen:  "Kontrolle offen",
    abholbereit:      "Abholbereit",
    abgeholt:         "Abgeholt",
    abgeschlossen:    "Abgeschlossen",
    todo:             "Offen",
    in_progress:      "In Arbeit",
    done:             "Erledigt",
}

export const BUILD_STATUS_COLORS = STATUS_COLORS;

export const NEURAD_STATUSES = [
    {
        value: 'offen',
        label: 'Offen',
        color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
        dotColor: 'bg-orange-500',
    },
    {
        value: 'in_progress',
        label: 'In Montage',
        color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
        dotColor: 'bg-violet-500',
    },
    {
        value: 'fertig',
        label: 'Montiert',
        color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        dotColor: 'bg-blue-500',
    },
    {
        value: 'abgeschlossen',
        label: 'Kontrolliert',
        color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        dotColor: 'bg-emerald-500',
    },
]

export const NEURAD_STATUS_MAP: Record<string, { label: string; color: string; dotColor: string }> = {
    offen: {
        label: 'Offen',
        color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
        dotColor: 'bg-orange-500',
    },
    in_progress: {
        label: 'In Montage',
        color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
        dotColor: 'bg-violet-500',
    },
    fertig: {
        label: 'Montiert',
        color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        dotColor: 'bg-blue-500',
    },
    abgeschlossen: {
        label: 'Kontrolliert',
        color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        dotColor: 'bg-emerald-500',
    },
}

/** Resolve order status info (label, badge color, dot color) from any status string. */
export function getOrderStatusInfo(status: string) {
    const label = STATUS_LABELS[status] || status.replace(/_/g, ' ')
    const color = STATUS_COLORS[status] || "bg-neutral-500/10 text-neutral-500"
    const dotColor = STATUS_DOT_COLORS_MAP[status] || "bg-neutral-400"
    return { label, color, dotColor }
}

/** Resolve Neurad status info from any status string. */
export function getNeuradStatusInfo(status: string) {
    return NEURAD_STATUS_MAP[status] || { label: status, color: 'bg-muted text-muted-foreground border-border/60', dotColor: 'bg-muted-foreground' }
}

export const BIKE_TYPE_LABELS: Record<string, string> = {
    road: 'Rennrad',
    mtb: 'Mountainbike',
    city: 'Citybike',
    ebike: 'E-Bike',
    other: 'Sonstiges'
}
