import { useNavigate, useLocation } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ListTodo, ShieldCheck, CheckCircle2, ArrowRight, AlertTriangle } from "lucide-react"
import type { OrderItem } from "./OrderCard"
import { cn } from "@/lib/utils"
import { isPast, isToday, format } from "date-fns"
import { de } from "date-fns/locale"

export interface ShopTask {
    id: string
    title: string
    description: string | null
    status: string
    due_date: string | null
    priority: 'low' | 'medium' | 'high'
    created_at: string
}

interface TasksSectionProps {
    shopTasks: ShopTask[]
    qcOrders: OrderItem[]
}

const PRIORITY_CONFIG = {
    high: { color: "bg-red-500", label: "Hoch", badge: "bg-red-50 text-red-700 border-red-200" },
    medium: { color: "bg-amber-500", label: "Mittel", badge: "bg-amber-50 text-amber-700 border-amber-200" },
    low: { color: "bg-slate-300", label: "Niedrig", badge: "bg-slate-50 text-slate-600 border-slate-200" },
}

export const TasksSection = ({ shopTasks, qcOrders }: TasksSectionProps) => {
    const navigate = useNavigate()
    const location = useLocation()


    const totalTasks = shopTasks.length + qcOrders.length

    if (totalTasks === 0) {
        return (
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 rounded-lg bg-orange-500/10">
                        <ListTodo className="h-4 w-4 text-orange-600" />
                    </div>
                    <h2 className="text-lg font-semibold tracking-tight">Aufgaben & Kontrolle</h2>
                </div>

                <Card className="border-dashed border-2 border-border/50 bg-muted/10">
                    <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500/30 mb-2" />
                        <p className="text-sm text-muted-foreground">Keine Aufgaben</p>
                    </CardContent>
                </Card>
            </section>
        )
    }

    return (
        <section>
            <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-orange-500/10">
                    <ListTodo className="h-4 w-4 text-orange-600" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight">Aufgaben & Kontrolle</h2>
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
                    {totalTasks}
                </Badge>
            </div>

            <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-2 space-y-2">
                    {/* QC Orders - Show first if any */}
                    {qcOrders.length > 0 && (
                        <>
                            <div className="px-2 pt-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <ShieldCheck className="h-3 w-3 text-purple-500" />
                                    Qualitätskontrolle
                                </p>
                            </div>
                            {qcOrders.slice(0, 3).map((order) => {
                                const isOverdue = order.due_date && isPast(new Date(order.due_date)) && !isToday(new Date(order.due_date))

                                return (
                                    <div
                                        key={`qc-${order.id}`}
                                        onClick={() => navigate(`/dashboard/orders/${order.id}/control`, { state: { from: location.pathname } })}
                                        className={cn(
                                            "group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all",
                                            "hover:bg-accent/50 border border-transparent hover:border-border/50",
                                            isOverdue && "bg-red-50/30"
                                        )}
                                    >
                                        <div className="h-1 w-1 rounded-full bg-purple-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-xs truncate">{order.bike_model}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">{order.customer_name}</p>
                                        </div>
                                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-purple-500 transition-colors shrink-0" />
                                    </div>
                                )
                            })}
                        </>
                    )}

                    {/* Shop Tasks */}
                    {shopTasks.length > 0 && (
                        <>
                            {qcOrders.length > 0 && <div className="border-t border-border/30 my-2" />}
                            <div className="px-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <ListTodo className="h-3 w-3 text-orange-500" />
                                    Shop Aufgaben
                                </p>
                            </div>
                            {shopTasks.slice(0, 4).map((task) => {
                                const priority = PRIORITY_CONFIG[task.priority]
                                const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))

                                return (
                                    <div
                                        key={task.id}
                                        onClick={() => navigate('/dashboard/tasks')}
                                        className={cn(
                                            "group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all",
                                            "hover:bg-accent/50 border border-transparent hover:border-border/50",
                                            isOverdue && "bg-red-50/30"
                                        )}
                                    >
                                        {/* Priority Indicator */}
                                        <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", priority.color)} />

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-medium text-xs truncate">{task.title}</span>
                                                {isOverdue && (
                                                    <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                                                )}
                                            </div>
                                            {task.due_date && (
                                                <p className={cn(
                                                    "text-[10px]",
                                                    isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
                                                )}>
                                                    {format(new Date(task.due_date), "dd. MMM", { locale: de })}
                                                </p>
                                            )}
                                        </div>

                                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-orange-500 transition-colors shrink-0" />
                                    </div>
                                )
                            })}
                        </>
                    )}
                </CardContent>
            </Card>
        </section>
    )
}
