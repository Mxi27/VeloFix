import { DashboardLayout } from "@/layouts/DashboardLayout"
import { OrdersTable } from "@/components/OrdersTable"
import { PageTransition } from "@/components/PageTransition"

export default function TrashPage() {
    return (
        <PageTransition>
            <DashboardLayout>
                <div className="space-y-6">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Papierkorb</h2>
                        <p className="text-muted-foreground">
                            Gelöschte Aufträge. Diese werden nach 30 Tagen automatisch endgültig gelöscht.
                        </p>
                    </div>

                    <OrdersTable mode="trash" />
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}
