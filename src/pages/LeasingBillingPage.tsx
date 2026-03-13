import { DashboardLayout } from "@/layouts/DashboardLayout"
import { OrdersTable } from "@/components/OrdersTable"
import { PageTransition } from "@/components/PageTransition"
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
                    {/* ── Premium Header ── */}
                    <div className="relative z-10 rounded-2xl bg-gradient-to-br from-primary/5 via-background/80 to-transparent border border-border/30 p-5 mb-5 backdrop-blur-sm">
                        <div className="absolute top-0 right-0 w-80 h-56 bg-primary/4 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                        <div className="relative flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-4">
                                <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/15 text-primary">
                                    <Banknote className="h-5 w-5" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold tracking-tight leading-tight text-foreground">
                                        Leasing Abrechnung
                                    </h1>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        Leasing Aufträge, die abgeholt wurden, aber noch nicht abgeschlossen sind.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <OrdersTable mode="leasing_billing" />
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}
