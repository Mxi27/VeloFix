import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bike, ShieldCheck, ListChecks, CheckCircle2, ListTodo, ArrowRight } from "lucide-react"
import type { OrderItem } from "./OrderCard"
import { OrderCard, DueDateBadge } from "./OrderCard"
import { cn } from "@/lib/utils"
import { isPast, isToday } from "date-fns"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShopTask {
    id: string
    title: string
    description: string | null
    status: string
    due_date: string | null
    priority: 'low' | 'medium' | 'high'
    created_at: string
}

const PRIORITY_COLORS: Record<string, string> = {
    high: "bg-red-50 text-red-700 border-red-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-slate-50 text-slate-600 border-slate-200",
}

interface ActiveWorkSectionProps {
    myOrders: OrderItem[]
    qcOrders: OrderItem[]
    shopTasks: ShopTask[]
}

export const ActiveWorkSection = ({ myOrders, qcOrders, shopTasks }: ActiveWorkSectionProps) => {
    const navigate = useNavigate()

    return (
        <div className="grid gap-6 xl:grid-cols-12 mb-8">
            {/* ─── Left Column: Repairs (Main Focus) ─── */}
            <div className="xl:col-span-7 space-y-6">
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 rounded-lg bg-blue-500/10">
                            <Bike className="h-4 w-4 text-blue-600" />
                        </div>
                        <h2 className="text-lg font-semibold tracking-tight">Meine Räder</h2>
                        {myOrders.length > 0 && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 ml-1">
                                {myOrders.length}
                            </Badge>
                        )}
                    </div>

                    {myOrders.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {myOrders.map(order => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    onClick={() => navigate(`/dashboard/orders/${order.id}/work`)}
                                />
                            ))}
                        </div>
                    ) : (
                        <Card className="border-dashed border-2 border-border/50 bg-muted/10">
                            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                                <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                </div>
                                <p className="font-medium text-sm">Alles erledigt!</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Schnapp dir einen Auftrag aus der Warteschlange.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </section>
            </div>

            {/* ─── Right Column: Tasks & QC ─── */}
            <div className="xl:col-span-5 space-y-6">

                {/* QC Checks - Always show if there are any, otherwise hide or show small */}
                {qcOrders.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 rounded-lg bg-purple-500/10">
                                <ShieldCheck className="h-4 w-4 text-purple-600" />
                            </div>
                            <h2 className="text-lg font-semibold tracking-tight">Qualitätskontrolle</h2>
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 ml-1">
                                {qcOrders.length}
                            </Badge>
                        </div>
                        <div className="space-y-3">
                            {qcOrders.map(order => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    onClick={() => navigate(`/dashboard/orders/${order.id}/control`)}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Tasks */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 rounded-lg bg-orange-500/10">
                            <ListChecks className="h-4 w-4 text-orange-600" />
                        </div>
                        <h2 className="text-lg font-semibold tracking-tight">Meine Aufgaben</h2>
                        {shopTasks.length > 0 && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 ml-1">
                                {shopTasks.length}
                            </Badge>
                        )}
                    </div>

                    <Card className="border-none shadow-sm bg-gradient-to-br from-card to-card/50">
                        <CardContent className="p-4">
                            {shopTasks.length > 0 ? (
                                <div className="space-y-2">
                                    {shopTasks.map(task => {
                                        const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))

                                        return (
                                            <div
                                                key={task.id}
                                                onClick={() => navigate('/dashboard/tasks')}
                                                className={cn(
                                                    "group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                                                    "hover:shadow-sm hover:-translate-y-0.5 hover:border-primary/30",
                                                    isOverdue ? "border-red-200/80 bg-red-50/30" : "border-border/50 bg-card/80 hover:bg-card"
                                                )}
                                            >
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className={cn(
                                                        "w-1 self-stretch rounded-full shrink-0",
                                                        isOverdue ? "bg-red-500" : (task.priority === 'high' ? "bg-red-400" : task.priority === 'medium' ? "bg-amber-400" : "bg-border/60")
                                                    )} />
                                                    <div className="space-y-1 min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-medium text-sm truncate">{task.title}</span>
                                                            <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 border-0 bg-transparent py-0", PRIORITY_COLORS[task.priority])}>
                                                                {task.priority === 'high' ? '!!!' : task.priority === 'medium' ? '!!' : '!'}
                                                            </Badge>
                                                        </div>
                                                        <DueDateBadge date={task.due_date} />
                                                    </div>
                                                </div>
                                                <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary shrink-0 transition-colors ml-2" />
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6 text-center">
                                    <ListTodo className="h-8 w-8 text-muted-foreground/20 mb-2" />
                                    <p className="text-xs text-muted-foreground">Keine offenen Aufgaben</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>
            </div>
        </div>
    )
}
