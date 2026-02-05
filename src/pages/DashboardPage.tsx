import { DashboardLayout } from "@/layouts/DashboardLayout"
import { StatsCards } from "@/components/StatsCards"
import { OrdersTable } from "@/components/OrdersTable"
import { PageTransition } from "@/components/PageTransition"
import { useAuth } from "@/contexts/AuthContext"
import { useState } from "react"

export default function DashboardPage() {
    const { user } = useAuth()
    const [refreshKey, setRefreshKey] = useState(0)

    const handleOrderCreated = () => {
        setRefreshKey(prev => prev + 1)
    }

    // Time-based greeting
    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return "Guten Morgen"
        if (hour < 18) return "Guten Tag"
        return "Guten Abend"
    }

    const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Team'
    const today = new Date().toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    })

    return (
        <PageTransition>
            <DashboardLayout onOrderCreated={handleOrderCreated}>
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {getGreeting()}, {firstName}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        {today}
                    </p>
                </div>

                {/* Stats */}
                <StatsCards key={`stats-${refreshKey}`} />

                {/* Orders */}
                <div className="mt-8">
                    <h2 className="text-lg font-medium mb-4">Aktuelle Aufträge</h2>
                    <OrdersTable key={refreshKey} />
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}
