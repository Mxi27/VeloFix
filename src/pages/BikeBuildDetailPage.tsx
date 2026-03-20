import { useEffect, useState } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import type { Database } from "@/types/supabase"

type BikeBuild = Database['public']['bike_builds']['Row']
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { PageTransition } from "@/components/PageTransition"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { isUuid } from "@/lib/utils"
import { BikeBuildOverview } from "@/components/neurad/BikeBuildOverview"
import { BikeBuildWizard } from "@/components/neurad/BikeBuildWizard"
import { BikeBuildControl } from "@/components/neurad/BikeBuildControl"

export default function BikeBuildDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const returnPath = (location.state as { from?: string } | null)?.from ?? '/dashboard/bike-builds'
    const { workshopId } = useAuth()

    const [build, setBuild] = useState<BikeBuild | null>(null)
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'overview' | 'workshop' | 'control'>('overview')

    useEffect(() => {
        const fetchBuild = async () => {
            if (!id || !workshopId) return
            setLoading(true)
            try {
                const isIdUuid = isUuid(id)
                const { data, error } = await supabase
                    .from('bike_builds')
                    .select('*')
                    .or(isIdUuid ? `id.eq.${id},internal_number.eq.${id}` : `internal_number.eq.${id}`)
                    .single()

                if (error) throw error
                setBuild(data)

                // Subscriptions should use the UUID
                const realId = data.id
                const channel = supabase
                    .channel(`bike_build_detail_${realId}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'bike_builds',
                            filter: `id=eq.${realId}`
                        },
                        (payload) => {
                            setBuild((current) => {
                                const updated = payload.new as BikeBuild
                                if (!current) return updated
                                return { ...current, ...updated }
                            })
                        }
                    )
                    .subscribe()

                return () => {
                    supabase.removeChannel(channel)
                }
            } catch (error) {
                console.error("Error fetching build", error)
                toast.error("Baufahrrad nicht gefunden")
                navigate("/dashboard/bike-builds")
            } finally {
                setLoading(false)
            }
        }

        fetchBuild()
    }, [id, workshopId, navigate])

    const refreshBuild = async () => {
        if (!id) return
        const isIdUuid = isUuid(id)
        const { data } = await supabase
            .from('bike_builds')
            .select('*')
            .or(isIdUuid ? `id.eq.${id},internal_number.eq.${id}` : `internal_number.eq.${id}`)
            .single()
        if (data) {
            setBuild((current: any) => {
                if (!current) return data
                return { ...current, ...data }
            })
        }
    }

    const handleDelete = async () => {
        if (!id) return
        try {
            const { error } = await supabase
                .from('bike_builds')
                .update({ status: 'trash' })
                .eq('id', id)

            if (error) throw error

            toast.success("Neurad-Montage in den Papierkorb verschoben")
            navigate(returnPath)
        } catch (error) {
            console.error(error)
            toast.error("Fehler beim Löschen")
        }
    }

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!build) return null

    return (
        <PageTransition>
            <DashboardLayout>
                {viewMode === 'workshop' ? (
                    <BikeBuildWizard
                        build={build}
                        onBack={() => {
                            refreshBuild()
                            setViewMode('overview')
                        }}
                        onComplete={async () => {
                            refreshBuild()
                            setViewMode('overview')
                        }}
                    />
                ) : viewMode === 'control' ? (
                    <BikeBuildControl
                        build={build}
                        onBack={() => {
                            refreshBuild()
                            setViewMode('overview')
                        }}
                        onComplete={async () => {
                            refreshBuild()
                            setViewMode('overview')
                        }}
                    />
                ) : (
                    <BikeBuildOverview
                        build={build}
                        returnPath={returnPath}
                        onStartWorkshop={() => setViewMode('workshop')}
                        onStartControl={() => setViewMode('control')}
                        onDelete={handleDelete}
                        onUpdate={refreshBuild}
                    />
                )}
            </DashboardLayout>
        </PageTransition>
    )
}
