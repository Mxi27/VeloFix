import { DashboardLayout } from "@/layouts/DashboardLayout"
import { PageTransition } from "@/components/PageTransition"
import { BikeAssemblyTable } from "@/components/BikeAssemblyTable"
import { CreateBikeBuildModal } from "@/components/CreateBikeBuildModal"
import { Bike, Clock, Wrench, CheckCircle } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import useSWR from "swr"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface StatsData {
    total: number
    offen: number
    inMontage: number
    montiert: number
    kontrolliert: number
}

export default function BikeBuildsPage() {
    const { workshopId, userRole } = useAuth()

    const { data: stats, isLoading: statsLoading } = useSWR<StatsData>(
        workshopId ? ['bike_builds_stats', workshopId] : null,
        async () => {
            const { data, error } = await supabase
                .from('bike_builds')
                .select('status')
                .eq('workshop_id', workshopId)
                .neq('status', 'trash')

            if (error) throw error

            return {
                total: data.length,
                offen: data.filter(b => b.status === 'offen').length,
                inMontage: data.filter(b => b.status === 'in_progress').length,
                montiert: data.filter(b => b.status === 'fertig').length,
                kontrolliert: data.filter(b => b.status === 'abgeschlossen').length,
            }
        },
        { refreshInterval: 30000 }
    )

    const pills = [
        {
            label: "Offen",
            value: stats?.offen ?? 0,
            icon: Clock,
            iconColor: "text-amber-500",
            valueColor: "text-amber-600 dark:text-amber-400",
        },
        {
            label: "In Montage",
            value: stats?.inMontage ?? 0,
            icon: Wrench,
            iconColor: "text-blue-500",
            valueColor: "text-blue-600 dark:text-blue-400",
        },
        {
            label: "Montiert",
            value: stats?.montiert ?? 0,
            icon: CheckCircle,
            iconColor: "text-emerald-500",
            valueColor: "text-emerald-600 dark:text-emerald-400",
        },
    ]

    return (
        <PageTransition>
            <DashboardLayout>
                {/* Header — matches DashboardPage */}
                <div className="px-1 mb-5">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                                <Bike className="h-4 w-4" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight leading-tight text-foreground">
                                    Neuradaufbau
                                </h1>
                                <p className="text-sm text-muted-foreground mt-0.5">Alle Neuräder im Überblick</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {userRole !== 'read' && <CreateBikeBuildModal />}
                        </div>
                    </div>
                </div>

                {/* Stats Pills — matches StatsCards */}
                <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                    {statsLoading ? (
                        <div className="flex items-center gap-2 flex-wrap">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-8 w-36 rounded-full" />
                            ))}
                        </div>
                    ) : (
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
                    )}
                </div>

                {/* Table */}
                <BikeAssemblyTable />
            </DashboardLayout>
        </PageTransition>
    )
}
