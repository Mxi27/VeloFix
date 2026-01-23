import { DashboardLayout } from "@/layouts/DashboardLayout"
import { OrdersTable } from "@/components/OrdersTable"
import { PageTransition } from "@/components/PageTransition"

export default function ArchivePage() {
    return (
        <PageTransition>
            <DashboardLayout>
                <div className="space-y-6">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Archiv</h2>
                        <p className="text-muted-foreground">
                            Alle abgeschlossenen Aufträge und Leasing-Abrechnungen.
                        </p>
                    </div>

                    <OrdersTable showArchived={true} />
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}
