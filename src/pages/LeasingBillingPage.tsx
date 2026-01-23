import { DashboardLayout } from "@/layouts/DashboardLayout"
import { OrdersTable } from "@/components/OrdersTable"
import { PageTransition } from "@/components/PageTransition"

export default function LeasingBillingPage() {
    return (
        <PageTransition>
            <DashboardLayout>
                <div className="space-y-6">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Leasing Abrechnung</h2>
                        <p className="text-muted-foreground">
                            Leasing Aufträge, die abgeholt wurden, aber noch nicht abgeschlossen sind.
                        </p>
                    </div>

                    <OrdersTable mode="leasing_billing" />
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}
