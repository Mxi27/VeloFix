import { useNavigate, useLocation } from "react-router-dom"
import { Bike, CheckCircle2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { OrderItem } from "./OrderCard"
import { STATUS_COLORS, STATUS_LABELS } from "./OrderCard"
import { cn } from "@/lib/utils"
import { getUrgencyInfo, sortByUrgency } from "@/lib/urgency"

interface MyBikesSectionProps {
    orders: OrderItem[]
}

export const MyBikesSection = ({ orders }: MyBikesSectionProps) => {
    const navigate = useNavigate()
    const location = useLocation()


    // Sort by urgency using shared utility
    const sortedOrders = sortByUrgency(orders)

    if (orders.length === 0) {
        return (
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 rounded-lg bg-blue-500/10">
                        <Bike className="h-4 w-4 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-semibold tracking-tight">Meine Räder</h2>
                </div>

                <Card className="border-dashed border-2 border-border/50 bg-muted/10">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                        </div>
                        <p className="font-semibold text-base">Alles erledigt!</p>
                        <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
                            Dir sind keine Räder zugeteilt. Sieh dir die Liste unten an, um dir einen Auftrag zu schnappen.
                        </p>
                    </CardContent>
                </Card>
            </section>
        )
    }

    return (
        <section>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10">
                        <Bike className="h-4 w-4 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-semibold tracking-tight">Meine Räder</h2>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                        {orders.length}
                    </Badge>
                </div>
            </div>

            {/* Compact List View - Priority on scannability */}
            <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-2">
                    <div className="grid gap-3">
                        {sortedOrders.map((order) => {
                            const urgency = getUrgencyInfo(order.due_date)
                            const UrgencyIcon = urgency.icon

                            return (
                                <div
                                    key={order.id}
                                    onClick={() => navigate(`/dashboard/orders/${order.id}/work`, { state: { from: location.pathname } })}
                                    className="group flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200"
                                >
                                    {/* Urgency Indicator */}
                                    <div className={cn(
                                        "p-2 rounded-lg shrink-0 transition-colors",
                                        urgency.bg,
                                        "group-hover:bg-opacity-80"
                                    )}>
                                        <UrgencyIcon className={cn("h-4 w-4", urgency.color)} />
                                    </div>

                                    {/* Order Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-mono text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">{order.order_number}</span>
                                            <Badge variant="secondary" className={cn("text-[10px] h-5 px-1.5 font-normal border", STATUS_COLORS[order.status])}>
                                                {STATUS_LABELS[order.status]}
                                            </Badge>
                                        </div>
                                        <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{order.bike_model}</p>
                                        <p className="text-xs text-muted-foreground truncate">{order.customer_name}</p>
                                    </div>

                                    {/* Due Date Badge */}
                                    <div className={cn(
                                        "shrink-0 text-right ms-2",
                                        urgency.color
                                    )}>
                                        <p className="text-xs font-medium">{urgency.label}</p>
                                        {order.due_date && (
                                            <p className="text-[10px] opacity-70">
                                                {new Date(order.due_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </section>
    )
}
