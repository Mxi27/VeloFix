import { DashboardLayout } from "@/layouts/DashboardLayout"
import { OrdersTable } from "@/components/OrdersTable"
import { PageTransition } from "@/components/PageTransition"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function TrashPage() {
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
                                    Sie benötigen Administrator-Rechte, um den Papierkorb zu verwalten.
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
