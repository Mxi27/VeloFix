import { DashboardLayout } from "@/layouts/DashboardLayout"
import { OrdersTable } from "@/components/OrdersTable"
import { PageTransition } from "@/components/PageTransition"
import { PageHeader } from "@/components/PageHeader"
import { CreateOrderModal } from "@/components/CreateOrderModal"
import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Bike } from "lucide-react"

export default function DashboardPage() {
    const { workshopId, userRole } = useAuth()
    const [refreshKey, setRefreshKey] = useState(0)
    const [isNewOrderOpen, setIsNewOrderOpen] = useState(false)

    useEffect(() => {
        if (!workshopId) return
        const fetchData = async () => {
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
                    action={userRole !== 'read' ? (
                        <CreateOrderModal
                            open={isNewOrderOpen}
                            onOpenChange={setIsNewOrderOpen}
                            onOrderCreated={handleOrderCreated}
                        >
                            <Button
                                variant="default"
                                size="sm"
                                className="h-9 px-4 gap-2"
                                onClick={() => setIsNewOrderOpen(true)}
                            >
                                <Plus className="h-4 w-4" />
                                Neuer Auftrag
                            </Button>
                        </CreateOrderModal>
                    ) : undefined}
                />

                {/* ── Orders Table ── */}
                <OrdersTable key={refreshKey} />

            </DashboardLayout>
        </PageTransition>
    )
}
