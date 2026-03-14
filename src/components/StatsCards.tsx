import { useState, useEffect } from "react"
import { Wrench, CheckCircle, Receipt } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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

    useEffect(() => {
        if (workshopId) {
            fetchStats()
        }
    }, [workshopId])

    const fetchStats = async () => {
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
    }

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="border-0 shadow-sm">
                        <CardContent className="py-4 px-5">
                            <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="h-7 w-12" />
                                </div>
                                <Skeleton className="h-9 w-9 rounded-lg" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    const cards = [
        {
            title: "Offene Aufträge",
            value: stats.openOrders,
            icon: Wrench,
            color: "text-amber-600 dark:text-amber-400",
            bgColor: "bg-amber-50 dark:bg-amber-950/40",
        },
        {
            title: "Heute fertig",
            value: stats.completedToday,
            icon: CheckCircle,
            color: "text-emerald-600 dark:text-emerald-400",
            bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
        },
        {
            title: "Leasing offen",
            value: stats.leasingPending,
            icon: Receipt,
            color: "text-blue-600 dark:text-blue-400",
            bgColor: "bg-blue-50 dark:bg-blue-950/40",
        },
    ]

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {cards.map((card) => {
                const Icon = card.icon
                return (
                    <Card
                        key={card.title}
                        className="group relative overflow-hidden border border-border transition-all duration-300 hover:-translate-y-0.5"
                        style={{ boxShadow: 'var(--shadow-card)' }}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-elevated)')}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
                    >
                        <CardContent className="py-5 px-5">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                        {card.title}
                                    </p>
                                    <p className="text-3xl font-bold tracking-tight tabular-nums">
                                        {card.value}
                                    </p>
                                </div>

                                <div className={cn(
                                    "flex items-center justify-center h-10 w-10 rounded-lg",
                                    card.bgColor
                                )}>
                                    <Icon className={cn("h-5 w-5", card.color)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
