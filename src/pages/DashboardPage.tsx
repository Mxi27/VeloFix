import { DashboardLayout } from "@/layouts/DashboardLayout"
import { StatsCards } from "@/components/StatsCards"
import { OrdersTable } from "@/components/OrdersTable"
import { PageTransition } from "@/components/PageTransition"
import { useAuth } from "@/contexts/AuthContext"
import { useState } from "react"
import { Sparkles } from "lucide-react"

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
                {/* Premium Header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-primary/3 border border-primary/10 p-6 mb-6">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    <div className="relative flex items-center gap-4">
                        <div className="hidden sm:flex p-3 rounded-xl bg-primary/10 border border-primary/20">
                            <Sparkles className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                {getGreeting()}, <span className="text-gradient">{firstName}</span>
                            </h1>
                            <p className="text-muted-foreground text-sm mt-0.5">
                                {today} — Alles bereit für einen produktiven Tag
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <StatsCards key={`stats-${refreshKey}`} />

                {/* Orders */}
                <div className="mt-8">
                    <h2 className="text-lg font-semibold mb-4">Aktuelle Aufträge</h2>
                    <OrdersTable key={refreshKey} />
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}
