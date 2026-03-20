import { DashboardLayout } from "@/layouts/DashboardLayout"
import { OrdersTable } from "@/components/OrdersTable"
import { PageTransition } from "@/components/PageTransition"
import { PageHeader } from "@/components/PageHeader"
import { Archive } from "lucide-react"

export default function ArchivePage() {
    return (
        <PageTransition>
            <DashboardLayout>
                <div className="space-y-6">
                    <PageHeader
                        icon={Archive}
                        title="Archiv"
                        description="Alle abgeschlossenen Aufträge und Leasing-Abrechnungen."
                    />

                    <OrdersTable showArchived={true} />
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}
