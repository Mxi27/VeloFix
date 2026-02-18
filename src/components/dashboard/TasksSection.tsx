import { useNavigate, useLocation } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ListTodo, ShieldCheck, CheckCircle2, ArrowRight, AlertTriangle, AlertCircle } from "lucide-react"
import type { OrderItem } from "./OrderCard"
import { cn } from "@/lib/utils"
import { isPast, isToday, format } from "date-fns"
import { de } from "date-fns/locale"
import { getUrgencyInfo, sortByUrgency } from "@/lib/urgency"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

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
    currentEmployeeId?: string
}

const PRIORITY_CONFIG = {
    high: { color: "bg-red-500", label: "Hoch", badge: "bg-red-50 text-red-700 border-red-200" },
    medium: { color: "bg-amber-500", label: "Mittel", badge: "bg-amber-50 text-amber-700 border-amber-200" },
    low: { color: "bg-slate-300", label: "Niedrig", badge: "bg-slate-50 text-slate-600 border-slate-200" },
}

export const TasksSection = ({ shopTasks, qcOrders, currentEmployeeId }: TasksSectionProps) => {
    const navigate = useNavigate()
    const location = useLocation()

    return (
        <section className="space-y-6">

            {/* 1. Quality Control Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                            <ShieldCheck className="h-4 w-4 text-purple-600" />
                        </div>
                        <h3 className="font-semibold text-sm tracking-tight text-foreground/80">Qualitätskontrolle</h3>
                    </div>
                    {qcOrders.length > 0 && (
                        <Badge variant="secondary" className="bg-purple-100/50 text-purple-700 border-purple-200 hover:bg-purple-100">
                            {qcOrders.length}
                        </Badge>
                    )}
                </div>

                {qcOrders.length === 0 ? (
                    <Card className="border-dashed border-2 border-border/60 bg-muted/5 shadow-none">
                        <CardContent className="flex flex-col items-center justify-center py-8 text-center opacity-60">
                            <ShieldCheck className="h-8 w-8 text-muted-foreground/30 mb-2" />
                            <p className="text-xs font-medium text-muted-foreground">Keine Kontrollen ausstehend</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-3">
                        {qcOrders.map((order) => {
                            const isOverdue = order.due_date && isPast(new Date(order.due_date)) && !isToday(new Date(order.due_date))

                            // Check if the current viewer (or assigned QC) worked on the bike
                            // Smart Logic: Check if the user ACTUALLY completed any checklist items
                            const hasCompletedItems = order.checklist?.some(item =>
                                item.completed && String(item.completed_by) === String(currentEmployeeId)
                            )

                            // Fallback: If no checklist data, use the old mechanic assignments
                            // But usually, we want the smart check.
                            // If current user is in mechanic_ids OR completed an item
                            // For the warning to show for THIS viewer, we care if THEY worked on it.
                            // But for general "Self-Check" status (e.g. for filtering), we check the assigned QC.
                            // Here we want to warn the VIEWER if THEY are doing QC on their own work.
                            const isSelfCheck = hasCompletedItems || (currentEmployeeId && order.mechanic_ids?.includes(currentEmployeeId))

                            const urgency = getUrgencyInfo(order.due_date)
                            const UrgencyIcon = urgency.icon

                            return (
                                <TooltipProvider key={`qc-${order.id}`}>
                                    <Tooltip delayDuration={300}>
                                        <div
                                            onClick={() => navigate(`/dashboard/orders/${order.id}/control`, { state: { from: location.pathname } })}
                                            className={cn(
                                                "group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border",
                                                "bg-card shadow-sm hover:shadow-md",
                                                isOverdue ? "border-red-200 bg-red-50/10" : "border-border/50",
                                                isSelfCheck && "border-l-4 border-l-amber-500 pl-2.5" // Visual marker for self-check
                                            )}
                                        >
                                            {/* Icon Box */}
                                            <div className={cn(
                                                "p-2 rounded-lg shrink-0 transition-colors",
                                                urgency.bg,
                                                "group-hover:bg-opacity-80"
                                            )}>
                                                <UrgencyIcon className={cn("h-4 w-4", urgency.color)} />
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="font-medium text-sm truncate text-foreground/90 group-hover:text-purple-700 transition-colors">
                                                        {order.bike_model}
                                                    </span>

                                                    {isSelfCheck && (
                                                        <TooltipTrigger asChild>
                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                                                                <AlertTriangle className="h-3 w-3" />
                                                                <span>Warnung</span>
                                                            </div>
                                                        </TooltipTrigger>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs text-muted-foreground/80 truncate">{order.customer_name}</p>
                                                </div>
                                            </div>

                                            {/* Date/Status */}
                                            <div className={cn(
                                                "shrink-0 text-right ms-2",
                                                urgency.color
                                            )}>
                                                <p className="text-xs font-medium">{urgency.label}</p>
                                                {order.due_date && (
                                                    <p className="text-[10px] opacity-70">
                                                        {format(new Date(order.due_date), "dd.MM.")}
                                                    </p>
                                                )}
                                            </div>

                                            <TooltipContent side="top" className="bg-amber-50 text-amber-900 border-amber-200">
                                                <p className="font-semibold text-xs flex items-center gap-1.5">
                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                    Selbst-Kontrolle
                                                </p>
                                                <p className="text-[10px] opacity-90 mt-0.5">
                                                    Du hast dieses Rad bearbeitet.
                                                </p>
                                            </TooltipContent>
                                        </div>
                                    </Tooltip>
                                </TooltipProvider>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* 2. Shop Tasks Section */}
            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                            <ListTodo className="h-4 w-4 text-orange-600" />
                        </div>
                        <h3 className="font-semibold text-sm tracking-tight text-foreground/80">Meine Aufgaben</h3>
                    </div>
                    {shopTasks.length > 0 && (
                        <Badge variant="secondary" className="bg-orange-100/50 text-orange-700 border-orange-200 hover:bg-orange-100">
                            {shopTasks.length}
                        </Badge>
                    )}
                </div>

                {shopTasks.length === 0 ? (
                    <Card className="border-dashed border-2 border-border/60 bg-muted/5 shadow-none">
                        <CardContent className="flex flex-col items-center justify-center py-8 text-center opacity-60">
                            <CheckCircle2 className="h-8 w-8 text-muted-foreground/30 mb-2" />
                            <p className="text-xs font-medium text-muted-foreground">Keine Aufgaben offen</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-3">
                        {shopTasks.map((task) => {
                            const priority = PRIORITY_CONFIG[task.priority]
                            const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))

                            return (
                                <div
                                    key={task.id}
                                    onClick={() => navigate('/dashboard/tasks')}
                                    className={cn(
                                        "group flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200",
                                        "bg-card hover:shadow-md hover:border-orange-300/50 hover:bg-gradient-to-br hover:from-card hover:to-orange-50/30",
                                        isOverdue ? "border-red-200 bg-red-50/10" : "border-border/50"
                                    )}
                                >
                                    <div className={cn(
                                        "mt-1 h-2 w-2 rounded-full shrink-0 shadow-sm",
                                        task.priority === 'high' ? "bg-red-500 shadow-red-200" :
                                            task.priority === 'medium' ? "bg-amber-500 shadow-amber-200" :
                                                "bg-blue-500 shadow-blue-200"
                                    )} />

                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm leading-tight mb-1 group-hover:text-orange-700 transition-colors">
                                            {task.title}
                                        </p>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                            {task.due_date && (
                                                <span className={cn(
                                                    "flex items-center gap-1",
                                                    isOverdue && "text-red-600 font-medium bg-red-100/50 px-1 rounded"
                                                )}>
                                                    {isOverdue && <AlertCircle className="h-3 w-3" />}
                                                    {format(new Date(task.due_date), "d. MMM", { locale: de })}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </section>
    )
}
