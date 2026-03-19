import { useState, useCallback } from "react"

/**
 * Persists table column visibility state to localStorage.
 * Eliminates duplicate localStorage logic across all table components.
 *
 * @param storageKey - Unique key for this table, e.g. 'velofix-orders-table-columns-v1'
 * @param availableColumns - Column definitions with id and defaultVisible flag
 */
export function useColumnVisibility<T extends string>(
    storageKey: string,
    availableColumns: ReadonlyArray<{ id: T; defaultVisible: boolean }>
) {
    const [visibleColumns, setVisibleColumns] = useState<Record<T, boolean>>(() => {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
            try {
                return JSON.parse(saved) as Record<T, boolean>
            } catch {
                // Corrupted storage — fall back to defaults
            }
        }
        return availableColumns.reduce(
            (acc, col) => ({ ...acc, [col.id]: col.defaultVisible }),
            {} as Record<T, boolean>
        )
    })

    const toggleColumn = useCallback(
        (id: T) => {
            setVisibleColumns(prev => {
                const next = { ...prev, [id]: !prev[id] }
                localStorage.setItem(storageKey, JSON.stringify(next))
                return next
            })
        },
        [storageKey]
    )

    return { visibleColumns, toggleColumn }
}
