import { DashboardLayout } from "@/layouts/DashboardLayout"
import { PageTransition } from "@/components/PageTransition"
import { BikeAssemblyTable } from "@/components/BikeAssemblyTable"
import { CreateBikeBuildModal } from "@/components/CreateBikeBuildModal"
import { Bike, Clock, Wrench } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import useSWR from "swr"

interface StatsData {
    total: number
    offen: number
    active: number
}

export default function BikeBuildsPage() {
    const { workshopId } = useAuth()

    // Fetch stats
    const { data: stats } = useSWR<StatsData>(
        workshopId ? ['bike_builds_stats', workshopId] : null,
        async () => {
            const { data, error } = await supabase
                .from('bike_builds')
                .select('status')
                .eq('workshop_id', workshopId)

            if (error) throw error

            return {
                total: data.length,
                offen: data.filter(b => b.status === 'offen').length,
                active: data.filter(b => b.status === 'active' || b.status === 'in_progress').length,
            }
        },
        { refreshInterval: 30000 }
    )

    return (
        <PageTransition>
            <DashboardLayout>
                <div className="space-y-6">
                    {/* ── Premium Header ── */}
                    <div className="relative z-10 rounded-2xl bg-gradient-to-br from-primary/5 via-background/80 to-transparent border border-border/30 p-5 mb-5 backdrop-blur-sm">
                        <div className="absolute top-0 right-0 w-80 h-56 bg-primary/4 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                        <div className="relative flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-4">
                                <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/15 text-primary">
                                    <Bike className="h-5 w-5" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold tracking-tight leading-tight text-foreground">
                                        Neuradaufbau
                                    </h1>
                                    <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1.5 bg-background/50 px-2 py-0.5 rounded-md border border-border/40">
                                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                                            <span className="font-medium text-foreground">{stats?.offen ?? 0}</span> Offen
                                        </span>
                                        <span className="flex items-center gap-1.5 bg-background/50 px-2 py-0.5 rounded-md border border-border/40">
                                            <Wrench className="h-3.5 w-3.5 text-blue-500" />
                                            <span className="font-medium text-foreground">{stats?.active ?? 0}</span> In Arbeit
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <CreateBikeBuildModal />
                        </div>
                    </div>

                    {/* Table */}
                    <BikeAssemblyTable />
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}
