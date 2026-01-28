import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, Calendar, Bike } from "lucide-react"
import { STATUS_COLORS } from "@/lib/constants"

interface Order {
    id: string
    order_number: string
    customer_name: string
    customer_email: string | null
    bike_model: string | null
    is_leasing: boolean
    status: string
    created_at: string
    estimated_price: number | null
}

interface OrderCardProps {
    order: Order
    onViewOrder: (orderId: string) => void
}

export function OrderCard({ order, onViewOrder }: OrderCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
        >
            <Card
                variant="glass"
                className="cursor-pointer hover:shadow-elevated-lg transition-all duration-300"
                onClick={() => onViewOrder(order.id)}
            >
                <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <div className="font-mono text-sm font-bold text-primary">
                                {order.order_number}
                            </div>
                            <div className="font-semibold text-base">{order.customer_name}</div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="shrink-0"
                            onClick={(e) => {
                                e.stopPropagation()
                                onViewOrder(order.id)
                            }}
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Customer Email */}
                    {order.customer_email && (
                        <div className="text-xs text-muted-foreground truncate">
                            {order.customer_email}
                        </div>
                    )}

                    {/* Bike Model */}
                    {order.bike_model && (
                        <div className="flex items-center gap-2 text-sm">
                            <Bike className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground truncate">{order.bike_model}</span>
                        </div>
                    )}

                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            variant="outline"
                            className={order.is_leasing
                                ? "bg-brand-purple/10 text-brand-purple border-brand-purple/20"
                                : "bg-brand-blue/10 text-brand-blue border-brand-blue/20"
                            }
                        >
                            {order.is_leasing ? "Leasing" : "Standard"}
                        </Badge>
                        <Badge
                            variant="secondary"
                            className={`capitalize ${STATUS_COLORS[order.status] || "bg-muted text-foreground"}`}
                        >
                            {order.status.replace(/_/g, ' ')}
                        </Badge>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(order.created_at).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                        })}</span>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
