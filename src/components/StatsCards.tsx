import { useState, useEffect, useCallback } from "react"
import { Wrench, CheckCircle, Receipt } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface Stats {
    openOrders: number
    completedToday: number
    leasingPending: number
}

export function StatsCards() {
    const { workshopId } = useAuth()
    const [stats, setStats] = useState<Stats>({
        openOrders: 0,
        completedToday: 0,
        leasingPending: 0
    })
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
                const updatedAt = new Date(o.updated_at)
                return updatedAt >= today
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

    const pills = [
        {
            label: "Offene Aufträge",
            value: stats.openOrders,
            icon: Wrench,
            iconColor: "text-amber-500",
            valueColor: "text-amber-600 dark:text-amber-400",
        },
        {
            label: "Heute fertig",
            value: stats.completedToday,
            icon: CheckCircle,
            iconColor: "text-emerald-500",
            valueColor: "text-emerald-600 dark:text-emerald-400",
        },
        {
            label: "Leasing offen",
            value: stats.leasingPending,
            icon: Receipt,
            iconColor: "text-blue-500",
            valueColor: "text-blue-600 dark:text-blue-400",
        },
    ]

    if (loading) {
        return (
            <div className="flex items-center gap-2 flex-wrap">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-8 w-36 rounded-full" />
                ))}
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {pills.map((pill) => {
                const Icon = pill.icon
                return (
                    <div
                        key={pill.label}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-muted/40 text-sm"
                    >
                        <Icon className={cn("h-3.5 w-3.5 shrink-0", pill.iconColor)} />
                        <span className="text-muted-foreground text-xs">{pill.label}</span>
                        <span className={cn("font-bold tabular-nums text-sm leading-none", pill.valueColor)}>
                            {pill.value}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}
