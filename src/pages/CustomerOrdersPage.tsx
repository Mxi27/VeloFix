import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { CreateCustomerOrderModal } from "@/components/CreateCustomerOrderModal"
import { CustomerOrdersTable } from "@/components/CustomerOrdersTable"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { PageTransition } from "@/components/PageTransition"
import { PageHeader } from "@/components/PageHeader"

export default function CustomerOrdersPage() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    return (
        <PageTransition>
            <DashboardLayout>
                <PageHeader
                    icon={Plus}
                    title="Kundenbestellungen"
                    action={
                        <Button 
                            className="flex items-center gap-2 shadow-lg shadow-primary/20 font-bold h-9 px-4"
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            <Plus className="h-4 w-4" />
                            Neue Bestellung
                        </Button>
                    }
                />
                
                <div className="w-full">
                    <CustomerOrdersTable />
                </div>

                <CreateCustomerOrderModal 
                    open={isCreateModalOpen} 
                    onOpenChange={setIsCreateModalOpen}
                />
            </DashboardLayout>
        </PageTransition>
    )
}
