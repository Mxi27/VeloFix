import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { PageTransition } from "@/components/PageTransition"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { BikeBuildOverview } from "@/components/neurad/BikeBuildOverview"
import { BikeBuildWizard } from "@/components/neurad/BikeBuildWizard"
import { BikeBuildControl } from "@/components/neurad/BikeBuildControl"

export default function BikeBuildDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { workshopId } = useAuth()

    const [build, setBuild] = useState<any | null>(null)
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'overview' | 'workshop' | 'control'>('overview')

    useEffect(() => {
        const fetchBuild = async () => {
            if (!id || !workshopId) return
            setLoading(true)
            try {
                const { data, error } = await supabase
                    .from('bike_builds')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (error) throw error
                setBuild(data)
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
        const { data } = await supabase.from('bike_builds').select('*').eq('id', id).single()
        if (data) setBuild(data)
    }

    const handleDelete = async () => {
        if (!id) return
        try {
            const { error } = await supabase
                .from('bike_builds')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast.success("Neurad-Montage gelöscht")
            navigate("/dashboard/bike-builds")
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
                        onComplete={() => {
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
                        onComplete={() => {
                            refreshBuild()
                            setViewMode('overview')
                        }}
                    />
                ) : (
                    <BikeBuildOverview
                        build={build}
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
