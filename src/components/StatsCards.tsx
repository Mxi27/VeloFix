import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Skeleton } from "@/components/ui/skeleton"

interface Stats {
    openOrders: number
    completedToday: number
    leasingPending: number
}

/**
 * Notion-style database property counts — inline, flat, no cards.
 */
export function StatsCards() {
    const { workshopId } = useAuth()
    const [stats, setStats] = useState<Stats>({ openOrders: 0, completedToday: 0, leasingPending: 0 })
    const [loading, setLoading] = useState(true)

    const fetchStats = useCallback(async () => {
        if (!workshopId) return
        setLoading(true)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        try {
            const { data: orders, error } = await supabase
                .from('orders')
                .select('status, is_leasing, leasing_billed, updated_at')
                .eq('workshop_id', workshopId)
                .neq('status', 'trash')

            if (error) throw error

            const openStatuses = ['eingegangen', 'in_bearbeitung', 'warten_auf_teile', 'kontrolle_offen', 'abholbereit']
            const openOrders = orders?.filter(o => openStatuses.includes(o.status)).length || 0

            const completedToday = orders?.filter(o => {
                const finishedStatuses = ['abholbereit', 'abgeholt', 'abgeschlossen']
                if (!finishedStatuses.includes(o.status)) return false
                return new Date(o.updated_at) >= today
            }).length || 0

            const leasingPending = orders?.filter(o =>
                o.is_leasing && !o.leasing_billed && o.status === 'abgeholt'
            ).length || 0

            setStats({ openOrders, completedToday, leasingPending })
        } catch (error) {
            console.error('Error fetching stats:', error)
        } finally {
            setLoading(false)
        }
    }, [workshopId])

    useEffect(() => {
        if (workshopId) fetchStats()
    }, [workshopId, fetchStats])

    if (loading) {
        return (
            <div className="flex items-center gap-5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-28" />
            </div>
        )
    }

    const items = [
        { label: "Offen", value: stats.openOrders,      color: "text-foreground" },
        { label: "Heute fertig", value: stats.completedToday, color: "text-foreground" },
        { label: "Leasing offen", value: stats.leasingPending, color: stats.leasingPending > 0 ? "text-orange-600 dark:text-orange-400" : "text-foreground" },
    ]

    return (
        <div className="flex items-center gap-5 flex-wrap">
            {items.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span>{item.label}</span>
                    <span className={`font-semibold tabular-nums ${item.color}`}>{item.value}</span>
                </div>
            ))}
        </div>
    )
}
