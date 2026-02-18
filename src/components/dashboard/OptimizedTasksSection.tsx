import { useNavigate, useLocation } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ListTodo, ShieldCheck, CheckCircle2, AlertTriangle, Clock, Circle } from "lucide-react"
import type { OrderItem } from "./OrderCard"
import { cn } from "@/lib/utils"
import { isPast, isToday, format, differenceInHours, differenceInDays } from "date-fns"
import { de } from "date-fns/locale"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getUrgencyInfo } from "@/lib/urgency"
import { motion } from "framer-motion"

export interface ShopTask {
  id: string
  title: string
  description: string | null
  status: string
  due_date: string | null
  priority: 'low' | 'medium' | 'high'
  created_at: string
}

interface OptimizedTasksSectionProps {
  shopTasks: ShopTask[]
  qcOrders: OrderItem[]
  currentEmployeeId?: string
}

const PRIORITY_INDICATOR = {
  high: "bg-red-500 shadow-red-200 shadow-sm",
  medium: "bg-amber-500 shadow-amber-200 shadow-sm",
  low: "bg-slate-300 shadow-slate-200 shadow-sm",
}

/**
 * ULTRA-OPTIMIZED Tasks Section
 * Focus: Immediate task recognition, one-click actions, smart grouping
 */
export const OptimizedTasksSection = ({ shopTasks, qcOrders, currentEmployeeId }: OptimizedTasksSectionProps) => {
  const navigate = useNavigate()
  const location = useLocation()

  const hasOpenTasks = shopTasks.length > 0 || qcOrders.length > 0
  const totalTasks = shopTasks.length + qcOrders.length

  if (!hasOpenTasks) {
    return (
      <section>
        <Card className="border-dashed border-2 border-border/60 bg-muted/5 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Keine Aufgaben</p>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      {/* QC Section - Always first if urgent */}
      {qcOrders.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <ShieldCheck className="h-4 w-4 text-purple-600" />
              </div>
              <h3 className="font-semibold text-sm tracking-tight text-foreground/80">Qualitätskontrolle</h3>
            </div>
            <Badge variant="secondary" className="bg-purple-100/50 text-purple-700 border-purple-200">
              {qcOrders.length}
            </Badge>
          </div>

          <div className="grid gap-2">
            {qcOrders.map((order) => {
              const urgency = getUrgencyInfo(order.due_date)
              const UrgencyIcon = urgency.icon

              // Check if this is a self-check
              const hasCompletedItems = order.checklist?.some(item =>
                item.completed && String(item.completed_by) === String(currentEmployeeId)
              )
              const isSelfCheck = hasCompletedItems || (currentEmployeeId && order.mechanic_ids?.includes(currentEmployeeId))

              return (
                <TooltipProvider key={`qc-${order.id}`}>
                  <Tooltip delayDuration={200}>
                    <div
                      onClick={() => navigate(`/dashboard/orders/${order.id}/control`, { state: { from: location.pathname } })}
                      className={cn(
                        "group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border",
                        "bg-card shadow-sm hover:shadow-md",
                        urgency.isOverdue && "border-red-200 bg-red-50/10",
                        isSelfCheck && "border-l-4 border-l-amber-500"
                      )}
                    >
                      {/* Urgency Icon */}
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
                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 text-[9px] font-bold uppercase tracking-wider">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                <span>Selbst</span>
                              </div>
                            </TooltipTrigger>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground/80 truncate">{order.customer_name}</p>
                      </div>

                      {/* Due Date */}
                      <div className={cn("shrink-0 text-right", urgency.color)}>
                        <p className="text-xs font-medium">{urgency.shortLabel || urgency.label}</p>
                        {order.due_date && (
                          <p className="text-[9px] opacity-70">
                            {format(new Date(order.due_date), "dd.MM.", { locale: de })}
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
        </div>
      )}

      {/* Shop Tasks Section */}
      {shopTasks.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <ListTodo className="h-4 w-4 text-orange-600" />
              </div>
              <h3 className="font-semibold text-sm tracking-tight text-foreground/80">Aufgaben</h3>
            </div>
            <Badge variant="secondary" className="bg-orange-100/50 text-orange-700 border-orange-200">
              {shopTasks.length}
            </Badge>
          </div>

          <div className="grid gap-2">
            {shopTasks.map((task) => {
              const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))

              return (
                <div
                  key={task.id}
                  onClick={() => navigate('/dashboard/tasks')}
                  className={cn(
                    "group flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200",
                    "bg-card hover:shadow-md",
                    isOverdue && "border-red-200 bg-red-50/10"
                  )}
                >
                  {/* Priority Indicator */}
                  <div className={cn(
                    "mt-1 h-2 w-2 rounded-full shrink-0",
                    PRIORITY_INDICATOR[task.priority]
                  )} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight mb-1 group-hover:text-orange-700 transition-colors">
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {task.description}
                      </p>
                    )}

                    {/* Due Date */}
                    {task.due_date && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className={cn(
                          "text-[10px]",
                          isOverdue && "text-red-600 font-medium bg-red-100/50 px-1 rounded"
                        )}>
                          {format(new Date(task.due_date), "d. MMM", { locale: de })}
                          {isOverdue && " Überfällig"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status Circle */}
                  <div className="shrink-0">
                    <Circle className="h-4 w-4 text-muted-foreground/30 group-hover:text-orange-500 transition-colors" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick Actions Footer */}
      <div className="pt-2 flex items-center justify-between px-2">
        <p className="text-[10px] text-muted-foreground">
          {totalTasks} {totalTasks === 1 ? 'Aufgabe' : 'Aufgaben'} • Klick für Details
        </p>
      </div>
    </section>
  )
}
