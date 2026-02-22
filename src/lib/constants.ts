export const STATUS_COLORS: Record<string, string> = {
    eingegangen: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25",
    warten_auf_teile: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/25",
    in_bearbeitung: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/25",
    kontrolle_offen: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25",
    abholbereit: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/25",
    abgeholt: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
    abgeschlossen: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
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
