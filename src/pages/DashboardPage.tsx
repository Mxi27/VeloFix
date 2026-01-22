import { DashboardLayout } from "@/layouts/DashboardLayout"
import { StatsCards } from "@/components/StatsCards"
import { OrdersTable } from "@/components/OrdersTable"
import { PageTransition } from "@/components/PageTransition"

import { useState } from "react"

export default function DashboardPage() {
    const [refreshKey, setRefreshKey] = useState(0)

    const handleOrderCreated = () => {
        setRefreshKey(prev => prev + 1)
    }

    return (
        <PageTransition>
            <DashboardLayout onOrderCreated={handleOrderCreated}>
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                </div>

                <StatsCards />

                <div className="mt-8">
                    <OrdersTable key={refreshKey} />
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}
