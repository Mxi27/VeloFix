import { DashboardLayout } from "@/layouts/DashboardLayout"
import { OrdersTable } from "@/components/OrdersTable"
import { PageTransition } from "@/components/PageTransition"
import { PageHeader } from "@/components/PageHeader"
import { Banknote } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function LeasingBillingPage() {
    const { userRole } = useAuth()
    const isAdmin = userRole === 'admin' || userRole === 'owner'

    if (!isAdmin) {
        return (
            <PageTransition>
                <DashboardLayout>
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <Card className="max-w-md w-full">
                            <CardHeader>
                                <CardTitle>Zugriff verweigert</CardTitle>
                                <CardDescription>
                                    Sie benötigen Administrator-Rechte, um Leasing-Abrechnungen zu sehen.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </div>
                </DashboardLayout>
            </PageTransition>
        )
    }
    return (
        <PageTransition>
            <DashboardLayout>
                <div className="space-y-6">
                    <PageHeader
                        icon={Banknote}
                        title="Leasing Abrechnung"
                        description="Leasing Aufträge, die abgeholt wurden, aber noch nicht abgeschlossen sind."
                    />

                    <OrdersTable mode="leasing_billing" />
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}
