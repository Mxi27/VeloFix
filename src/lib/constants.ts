export const STATUS_COLORS: Record<string, string> = {
    eingegangen: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
    warten_auf_teile: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",
    in_bearbeitung: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",
    kontrolle_offen: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    abholbereit: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20",
    abgeholt: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    abgeschlossen: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/20",
}

export const BUILD_STATUS_COLORS = STATUS_COLORS;

// Neurad-specific status config
export const NEURAD_STATUSES = [
    {
        value: 'offen',
        label: 'Offen',
        color: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20',
        dotColor: 'bg-slate-400',
    },
    {
        value: 'in_progress',
        label: 'In Montage',
        color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',
        dotColor: 'bg-blue-500',
    },
    {
        value: 'fertig',
        label: 'Montiert',
        color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
        dotColor: 'bg-amber-500',
    },
    {
        value: 'abgeschlossen',
        label: 'Kontrolliert',
        color: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20',
        dotColor: 'bg-green-500',
    },
]

export const NEURAD_STATUS_MAP: Record<string, { label: string; color: string; dotColor: string }> = {
    offen: {
        label: 'Offen',
        color: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20',
        dotColor: 'bg-slate-400',
    },
    in_progress: {
        label: 'In Montage',
        color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',
        dotColor: 'bg-blue-500',
    },
    fertig: {
        label: 'Montiert',
        color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
        dotColor: 'bg-amber-500',
    },
    abgeschlossen: {
        label: 'Kontrolliert',
        color: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20',
        dotColor: 'bg-green-500',
    },
}
