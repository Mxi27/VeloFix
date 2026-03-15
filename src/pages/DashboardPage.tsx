import { DashboardLayout } from "@/layouts/DashboardLayout"
import { StatsCards } from "@/components/StatsCards"
import { OrdersTable } from "@/components/OrdersTable"
import { PageTransition } from "@/components/PageTransition"
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

                {/* ── Header ── */}
                <div className="px-1 mb-5">
                    <div className="flex items-center justify-between gap-4 flex-wrap">

                        {/* Title Section */}
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                                <Bike className="h-4 w-4" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight leading-tight text-foreground">
                                    Reparaturen
                                </h1>
                                <p className="text-sm text-muted-foreground mt-0.5">Alle Werkstattaufträge im Überblick</p>
                            </div>
                        </div>

                        {/* Right side: New Order button */}
                        <div className="flex items-center gap-2">
                            {userRole !== 'read' && (
                                <CreateOrderModal
                                    open={isNewOrderOpen}
                                    onOpenChange={setIsNewOrderOpen}
                                    onOrderCreated={handleOrderCreated}
                                >
                                    <Button
                                        size="sm"
                                        className="gap-1.5 h-9 font-medium"
                                        onClick={() => setIsNewOrderOpen(true)}
                                    >
                                        <PlusCircle className="h-4 w-4" />
                                        Neuer Auftrag
                                    </Button>
                                </CreateOrderModal>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Stats ── */}
                <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                    <StatsCards key={`stats-${refreshKey}`} />
                </div>

                {/* ── Orders Table ── */}
                <OrdersTable key={refreshKey} />

            </DashboardLayout>
        </PageTransition>
    )
}
