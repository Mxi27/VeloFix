import { useNavigate, useLocation } from "react-router-dom"
import { Bike, CheckCircle2, Clock, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { OrderItem } from "./OrderCard"
import { STATUS_COLORS, STATUS_LABELS } from "./OrderCard"
import { cn, formatRelativeTime } from "@/lib/utils"
import { isPast, isToday, differenceInHours, differenceInDays } from "date-fns"

interface MyBikesSectionProps {
    orders: OrderItem[]
}

export const MyBikesSection = ({ orders }: MyBikesSectionProps) => {
    const navigate = useNavigate()
    const location = useLocation()


    // Sort by urgency: overdue > due today > due soon > no due date
    const sortedOrders = [...orders].sort((a, b) => {
        const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
        const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER

        if (aDue !== bDue) return aDue - bDue
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    const getUrgencyInfo = (dueDate: string | null) => {
        if (!dueDate) return {
            icon: Clock,
            color: "text-muted-foreground",
            bg: "bg-muted/50 dark:bg-muted/20",
            label: "Kein Datum"
        }

        const date = new Date(dueDate)
        const isOverdue = isPast(date) && !isToday(date)
        const dueToday = isToday(date)

        if (isOverdue) {
            return {
                icon: AlertTriangle,
                color: "text-red-600 dark:text-red-400",
                bg: "bg-red-50 dark:bg-red-900/20",
                label: "Überfällig"
            }
        }
        if (dueToday) {
            return {
                icon: AlertTriangle,
                color: "text-amber-600 dark:text-amber-400",
                bg: "bg-amber-50 dark:bg-amber-900/20",
                label: "Heute fällig"
            }
        }

        const hoursUntil = differenceInHours(date, new Date())
        if (hoursUntil < 24) {
            return {
                icon: Clock,
                color: "text-orange-600 dark:text-orange-400",
                bg: "bg-orange-50 dark:bg-orange-900/20",
                label: "Morgen fällig"
            }
        }
        const daysUntil = differenceInDays(date, new Date())
        if (daysUntil <= 3) {
            return {
                icon: Clock,
                color: "text-blue-600 dark:text-blue-400",
                bg: "bg-blue-50 dark:bg-blue-900/20",
                label: `In ${daysUntil} Tagen`
            }
        }
        return {
            icon: Clock,
            color: "text-muted-foreground",
            bg: "bg-muted/50 dark:bg-muted/20",
            label: formatRelativeTime(date)
        }
    }

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
                    <div className="divide-y divide-border/30">
                        {sortedOrders.map((order) => {
                            const urgency = getUrgencyInfo(order.due_date)
                            const UrgencyIcon = urgency.icon

                            return (
                                <div
                                    key={order.id}
                                    onClick={() => navigate(`/dashboard/orders/${order.id}/work`, { state: { from: location.pathname } })}
                                    className="group flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-all border border-transparent hover:border-border/40"
                                >
                                    {/* Urgency Indicator */}
                                    <div className={cn(
                                        "p-2 rounded-md shrink-0 transition-colors",
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
                                        "shrink-0 text-right",
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
