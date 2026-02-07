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

            const openStatuses = ['eingegangen', 'in_bearbeitung', 'wartet_auf_teile', 'bereit_zur_abholung']
            const openOrders = orders?.filter(o => openStatuses.includes(o.status)).length || 0

            const completedToday = orders?.filter(o => {
                if (o.status !== 'abgeholt') return false
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
            bgColor: "bg-amber-100 dark:bg-amber-950/50",
            gradient: "bg-gradient-to-br from-amber-500/5 to-orange-500/10",
            borderColor: "border-amber-200/50 dark:border-amber-800/30",
        },
        {
            title: "Heute fertig",
            value: stats.completedToday,
            icon: CheckCircle,
            color: "text-emerald-600 dark:text-emerald-400",
            bgColor: "bg-emerald-100 dark:bg-emerald-950/50",
            gradient: "bg-gradient-to-br from-emerald-500/5 to-green-500/10",
            borderColor: "border-emerald-200/50 dark:border-emerald-800/30",
        },
        {
            title: "Leasing offen",
            value: stats.leasingPending,
            icon: Receipt,
            color: "text-blue-600 dark:text-blue-400",
            bgColor: "bg-blue-100 dark:bg-blue-950/50",
            gradient: "bg-gradient-to-br from-blue-500/5 to-cyan-500/10",
            borderColor: "border-blue-200/50 dark:border-blue-800/30",
        },
    ]

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {cards.map((card) => {
                const Icon = card.icon
                return (
                    <Card
                        key={card.title}
                        className={cn(
                            "group relative overflow-hidden border transition-all duration-300",
                            "hover:shadow-lg hover:-translate-y-0.5",
                            card.borderColor
                        )}
                    >
                        <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity", card.gradient)} />
                        <CardContent className="relative py-5 px-5">
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
                                    "flex items-center justify-center h-11 w-11 rounded-xl transition-transform group-hover:scale-110",
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
