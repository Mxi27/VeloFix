/**
 * Todoist-style status tag colors — clean pill badges with subtle tints.
 */
export const STATUS_COLORS: Record<string, string> = {
    eingegangen:      "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    warten_auf_teile: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    in_bearbeitung:   "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    kontrolle_offen:  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    abholbereit:      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    abgeholt:         "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    abgeschlossen:    "bg-neutral-500/10 text-neutral-500 dark:text-neutral-400",
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

export const BIKE_TYPE_LABELS: Record<string, string> = {
    road: 'Rennrad',
    mtb: 'Mountainbike',
    city: 'Citybike',
    ebike: 'E-Bike',
    other: 'Sonstiges'
}
