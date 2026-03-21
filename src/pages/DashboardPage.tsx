import { DashboardLayout } from "@/layouts/DashboardLayout"
import { StatsCards } from "@/components/StatsCards"
import { OrdersTable } from "@/components/OrdersTable"
import { PageTransition } from "@/components/PageTransition"
import { PageHeader } from "@/components/PageHeader"
import { CreateOrderModal } from "@/components/CreateOrderModal"
import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    PlusCircle,
    Bike,
} from "lucide-react"


export default function DashboardPage() {
    const { workshopId, userRole } = useAuth()
    const [refreshKey, setRefreshKey] = useState(0)
    const [isNewOrderOpen, setIsNewOrderOpen] = useState(false)

    useEffect(() => {
        if (!workshopId) return
        const fetchData = async () => {
            // We just need to trigger a re-render of OrdersTable or similar if needed, 
            // but OrdersTable usually handles its own fetching.
            // DashboardPage mostly manages full-page layout and stats.
        }
        fetchData()
    }, [workshopId, refreshKey])

    const handleOrderCreated = () => setRefreshKey(p => p + 1)

    return (
        <PageTransition>
            <DashboardLayout onOrderCreated={handleOrderCreated}>

                <PageHeader
                    icon={Bike}
                    title="Reparaturen"
                    description="Alle Werkstattaufträge im Überblick"
                    action={userRole !== 'read' ? (
                        <CreateOrderModal
                            open={isNewOrderOpen}
                            onOpenChange={setIsNewOrderOpen}
                            onOrderCreated={handleOrderCreated}
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 h-8 text-sm font-normal"
                                onClick={() => setIsNewOrderOpen(true)}
                            >
                                <PlusCircle className="h-4 w-4" />
                                Neuer Auftrag
                            </Button>
                        </CreateOrderModal>
                    ) : undefined}
                >
                    <StatsCards key={`stats-${refreshKey}`} />
                </PageHeader>

                {/* ── Orders Table ── */}
                <OrdersTable key={refreshKey} />

            </DashboardLayout>
        </PageTransition>
    )
}
