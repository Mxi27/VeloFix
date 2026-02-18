import { useNavigate, useLocation } from "react-router-dom"
import { Bike, CheckCircle2, AlertTriangle, ChevronRight, Wrench } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { OrderItem } from "./OrderCard"
import { STATUS_COLORS, STATUS_LABELS } from "./OrderCard"
import { cn } from "@/lib/utils"
import { getUrgencyInfo } from "@/lib/urgency"
import { motion } from "framer-motion"

interface OptimizedMyBikesSectionProps {
  orders: OrderItem[]
  showEmpty?: boolean
}

/**
 * ULTRA-OPTIMIZED My Bikes Section
 * Focus: Maximum scanability, zero-click actions, instant recognition
 */
export const OptimizedMyBikesSection = ({ orders, showEmpty = true }: OptimizedMyBikesSectionProps) => {
  const navigate = useNavigate()
  const location = useLocation()

  if (orders.length === 0 && showEmpty) {
    return (
      <section>
        <Card className="border-dashed border-2 border-border/50 bg-muted/10">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="font-semibold text-lg">Alles erledigt! 🎉</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-[240px]">
              Dir sind keine Räder zugeteilt. Genieße deinen freien Moment!
            </p>
          </CardContent>
        </Card>
      </section>
    )
  }

  if (orders.length === 0) {
    return null
  }

  // Group by urgency for better visual hierarchy
  const urgentOrders = orders.filter(o => {
    const urgency = getUrgencyInfo(o.due_date)
    return urgency.isUrgent
  })

  const normalOrders = orders.filter(o => {
    const urgency = getUrgencyInfo(o.due_date)
    return !urgency.isUrgent
  })

  const allOrders = [...urgentOrders, ...normalOrders]

  return (
    <section>
      {/* Ultra-Compact Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Bike className="h-4 w-4 text-blue-600" />
          </div>
          <h2 className="font-semibold text-sm tracking-tight">Meine Räder</h2>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
            {orders.length}
          </Badge>
        </div>

        {urgentOrders.length > 0 && (
          <Badge variant="destructive" className="animate-pulse gap-1">
            <AlertTriangle className="h-3 w-3" />
            {urgentOrders.length} Dringend
          </Badge>
        )}
      </div>

      {/* Hyper-Optimized List View */}
      <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-2">
          <div className="grid gap-2">
            {allOrders.map((order, index) => {
              const urgency = getUrgencyInfo(order.due_date)
              const UrgencyIcon = urgency.icon

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(`/dashboard/orders/${order.id}/work`, { state: { from: location.pathname } })}
                  className={cn(
                    "group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200",
                    "bg-card border border-border/50 shadow-sm",
                    "hover:shadow-md hover:border-primary/30 hover:scale-[1.01]",
                    urgency.isOverdue && "border-red-200 bg-red-50/10",
                    urgency.isDueToday && "border-amber-200 bg-amber-50/10",
                  )}
                >
                  {/* Urgency Indicator - Left Border */}
                  <div className={cn(
                    "absolute left-0 top-3 bottom-3 w-1 rounded-r-full",
                    urgency.isOverdue && "bg-red-500",
                    urgency.isDueToday && "bg-amber-500",
                    !urgency.isUrgent && "bg-blue-500"
                  )} />

                  {/* Urgency Icon */}
                  <div className={cn(
                    "p-2 rounded-lg shrink-0 transition-colors",
                    urgency.bg,
                    "group-hover:bg-opacity-80"
                  )}>
                    <UrgencyIcon className={cn("h-4 w-4", urgency.color)} />
                  </div>

                  {/* Order Info - Optimized for scanning */}
                  <div className="flex-1 min-w-0">
                    {/* Quick Status Row */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] font-semibold text-muted-foreground bg-muted/50 px-1.5 rounded">
                        {order.order_number}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[9px] h-4 px-1 font-medium border shrink-0",
                          STATUS_COLORS[order.status]
                        )}
                      >
                        {STATUS_LABELS[order.status]}
                      </Badge>
                    </div>

                    {/* Main Info */}
                    <p className="font-semibold text-sm truncate text-foreground/90 group-hover:text-primary transition-colors">
                      {order.bike_model}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {order.customer_name}
                    </p>
                  </div>

                  {/* Due Date & Action */}
                  <div className="shrink-0 text-right">
                    <div className={cn(
                      "flex flex-col items-end gap-0.5",
                      urgency.color
                    )}>
                      <span className="text-xs font-bold">{urgency.shortLabel || urgency.label}</span>
                      {order.due_date && (
                        <span className="text-[10px] opacity-70">
                          {new Date(order.due_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                        </span>
                      )}
                    </div>

                    {/* Hover Action Hint */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                      <ChevronRight className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Footer */}
      <div className="mt-3 flex items-center justify-between px-2">
        <p className="text-[10px] text-muted-foreground">
          {orders.length} {orders.length === 1 ? 'Auftrag' : 'Aufträge'} • Klick zum Öffnen
        </p>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Wrench className="h-3 w-3" />
          <span>⌘K für Scan</span>
        </div>
      </div>
    </section>
  )
}
