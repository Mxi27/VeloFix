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
                    {/* Clean Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                                <Bike className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">
                                    Neuradaufbau
                                </h1>
                                <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                                        {stats?.offen ?? 0} Offen
                                    </span>
                                    <span className="text-border">•</span>
                                    <span className="flex items-center gap-1.5">
                                        <Wrench className="h-3.5 w-3.5 text-blue-500" />
                                        {stats?.active ?? 0} In Arbeit
                                    </span>
                                </div>
                            </div>
                        </div>
                        <CreateBikeBuildModal />
                    </div>

                    {/* Table */}
                    <BikeAssemblyTable />
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}
