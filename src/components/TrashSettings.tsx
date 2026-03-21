import { OrdersTable } from "@/components/OrdersTable"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
export function TrashSettings() {
    const { userRole } = useAuth()
    const isAdmin = userRole === 'admin' || userRole === 'owner'

    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center py-10">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle>Zugriff verweigert</CardTitle>
                        <CardDescription>
                            Sie benötigen Administrator-Rechte, um den Papierkorb zu verwalten.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
                Gelöschte Aufträge. Diese werden nach 30 Tagen automatisch endgültig gelöscht.
            </p>
            <OrdersTable mode="trash" />
        </div>
    )
}
