/**
 * Todoist-style status tag colors.
 */
export const STATUS_COLORS: Record<string, string> = {
    eingegangen:     "bg-[#d3e5ef] text-[#2b6e99]            dark:bg-[#2a3d50] dark:text-[#6c8fff]",
    warten_auf_teile:"bg-[#ffe2dd] text-[#c03e3e]            dark:bg-[#452a28] dark:text-[#de4c4a]",
    in_bearbeitung:  "bg-[#e8deee] text-[#7c5baa]            dark:bg-[#352a45] dark:text-[#c77dff]",
    kontrolle_offen: "bg-[#fdecc8] text-[#b08c00]            dark:bg-[#3d3520] dark:text-[#f0b429]",
    abholbereit:     "bg-[#dbeddb] text-[#2a7a45]            dark:bg-[#243528] dark:text-[#4ab06c]",
    abgeholt:        "bg-[#f5e0e9] text-[#a04070]            dark:bg-[#3d2535] dark:text-[#e07098]",
    abgeschlossen:   "bg-[#e3e2e0] text-[#808080]            dark:bg-[#363330] dark:text-[#8a8580]",
}

export const STATUS_LABELS: Record<string, string> = {
    eingegangen:     "Eingegangen",
    warten_auf_teile:"Warten auf Teile",
    in_bearbeitung:  "In Bearbeitung",
    kontrolle_offen: "Kontrolle offen",
    abholbereit:     "Abholbereit",
    abgeholt:        "Abgeholt",
    abgeschlossen:   "Abgeschlossen",
}

export const BUILD_STATUS_COLORS = STATUS_COLORS;

export const NEURAD_STATUSES = [
    {
        value: 'offen',
        label: 'Offen',
        color: 'bg-[#ffe2dd] text-[#c03e3e] dark:bg-[#452a28] dark:text-[#de4c4a]',
        dotColor: 'bg-[#de4c4a]',
    },
    {
        value: 'in_progress',
        label: 'In Montage',
        color: 'bg-[#fdecc8] text-[#b08c00] dark:bg-[#3d3520] dark:text-[#f0b429]',
        dotColor: 'bg-[#f0b429]',
    },
    {
        value: 'fertig',
        label: 'Montiert',
        color: 'bg-[#d3e5ef] text-[#2b6e99] dark:bg-[#2a3d50] dark:text-[#6c8fff]',
        dotColor: 'bg-[#6c8fff]',
    },
    {
        value: 'abgeschlossen',
        label: 'Kontrolliert',
        color: 'bg-[#dbeddb] text-[#2a7a45] dark:bg-[#243528] dark:text-[#4ab06c]',
        dotColor: 'bg-[#4ab06c]',
    },
]

export const NEURAD_STATUS_MAP: Record<string, { label: string; color: string; dotColor: string }> = {
    offen: {
        label: 'Offen',
        color: 'bg-[#ffe2dd] text-[#c03e3e] dark:bg-[#452a28] dark:text-[#de4c4a]',
        dotColor: 'bg-[#de4c4a]',
    },
    in_progress: {
        label: 'In Montage',
        color: 'bg-[#fdecc8] text-[#b08c00] dark:bg-[#3d3520] dark:text-[#f0b429]',
        dotColor: 'bg-[#f0b429]',
    },
    fertig: {
        label: 'Montiert',
        color: 'bg-[#d3e5ef] text-[#2b6e99] dark:bg-[#2a3d50] dark:text-[#6c8fff]',
        dotColor: 'bg-[#6c8fff]',
    },
    abgeschlossen: {
        label: 'Kontrolliert',
        color: 'bg-[#dbeddb] text-[#2a7a45] dark:bg-[#243528] dark:text-[#4ab06c]',
        dotColor: 'bg-[#4ab06c]',
    },
}

export const BIKE_TYPE_LABELS: Record<string, string> = {
    road: 'Rennrad',
    mtb: 'Mountainbike',
    city: 'Citybike',
    ebike: 'E-Bike',
    other: 'Sonstiges'
}
