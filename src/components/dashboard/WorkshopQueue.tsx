import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
    Wrench,
    Search,
    ArrowUpDown,
    ArrowRight,
} from "lucide-react"
import type { OrderItem } from "./OrderCard"
import { STATUS_COLORS, STATUS_LABELS, DueDateBadge } from "./OrderCard"
import { cn } from "@/lib/utils"
import { isPast, isToday } from "date-fns"

interface WorkshopQueueProps {
    orders: OrderItem[]
    employees: { id: string, name: string }[]
}

export const WorkshopQueue = ({ orders, employees }: WorkshopQueueProps) => {
    const navigate = useNavigate()
    const [search, setSearch] = useState("")
    const [filterStatus] = useState<string>("all")
    const [showUnassignedOnly, setShowUnassignedOnly] = useState(false)
    const [sortBy, setSortBy] = useState<'due_date' | 'created_at'>('due_date')

    const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || "—"

    const filteredOrders = useMemo(() => {
        return orders
            .filter(order => {
                // Search filter
                const searchLower = search.toLowerCase()
                const matchesSearch =
                    order.customer_name.toLowerCase().includes(searchLower) ||
                    order.bike_model.toLowerCase().includes(searchLower) ||
                    order.order_number.toLowerCase().includes(searchLower)

                if (!matchesSearch) return false

                // Status filter
                if (filterStatus !== 'all' && order.status !== filterStatus) return false

                // Unassigned filter
                if (showUnassignedOnly) {
                    const hasMechanics = order.mechanic_ids && order.mechanic_ids.length > 0
                    if (hasMechanics) return false
                }

                return true
            })
            .sort((a, b) => {
                // Primary Sort
                if (sortBy === 'due_date') {
                    const dateA = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
                    const dateB = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER
                    if (dateA !== dateB) return dateA - dateB
                } else {
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                }

                // Secondary Sort (always created_at)
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            })
    }, [orders, search, filterStatus, showUnassignedOnly, sortBy])

    return (
        <section className="space-y-4">
            {/* ─── Header & Filters ─── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10">
                        <Wrench className="h-4 w-4 text-amber-600" />
                    </div>
                    <h2 className="text-lg font-semibold tracking-tight">Warteschlange</h2>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700 ml-1">
                        {filteredOrders.length}
                    </Badge>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                    {/* Search */}
                    <div className="relative w-40 sm:w-56 shrink-0">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Suchen..."
                            className="h-9 pl-8 text-xs bg-background"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Filter: Unassigned */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
                        className={cn(
                            "h-9 text-xs border-dashed",
                            showUnassignedOnly && "bg-amber-50 border-amber-200 text-amber-700 border-solid"
                        )}
                    >
                        {showUnassignedOnly ? "Nur Unzugewiesene" : "Alle Aufträge"}
                    </Button>

                    {/* Sort Toggle */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSortBy(prev => prev === 'due_date' ? 'created_at' : 'due_date')}
                        className="h-9 w-9 px-0 sm:w-auto sm:px-3 text-muted-foreground"
                        title="Sortierung ändern"
                    >
                        <ArrowUpDown className="h-3.5 w-3.5 sm:mr-2" />
                        <span className="hidden sm:inline text-xs">
                            {sortBy === 'due_date' ? 'Nach Fälligkeit' : 'Nach Eingang'}
                        </span>
                    </Button>
                </div>
            </div>

            {/* ─── Table List ─── */}
            <Card className="border-none shadow-sm overflow-hidden bg-background">
                {filteredOrders.length > 0 ? (
                    <div className="div-y divide-border/40">
                        {/* Header Row */}
                        <div className="grid grid-cols-[80px_1fr_120px_120px_100px_32px] gap-3 px-4 py-3 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:grid">
                            <span>Nr.</span>
                            <span>Fahrrad / Kunde</span>
                            <span>Mechaniker</span>
                            <span>Fällig</span>
                            <span>Status</span>
                            <span></span>
                        </div>

                        <div className="divide-y divide-border/30">
                            {filteredOrders.map(order => {
                                const isOverdue = order.due_date && isPast(new Date(order.due_date)) && !isToday(new Date(order.due_date))
                                const isUnassigned = !order.mechanic_ids || order.mechanic_ids.length === 0

                                return (
                                    <div
                                        key={order.id}
                                        onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                                        className={cn(
                                            "group grid grid-cols-1 md:grid-cols-[80px_1fr_120px_120px_100px_32px] gap-2 md:gap-3 px-4 py-3 cursor-pointer transition-all",
                                            "hover:bg-accent/40 items-center",
                                            isOverdue && "bg-red-50/20"
                                        )}
                                    >
                                        {/* Order Number */}
                                        <div className="flex items-center justify-between md:justify-start">
                                            <span className="font-mono text-sm font-semibold text-primary/80">{order.order_number}</span>
                                            {/* Mobile Status Badge override */}
                                            <Badge variant="secondary" className={cn("md:hidden text-[10px] h-5 px-1.5 font-normal border", STATUS_COLORS[order.status])}>
                                                {STATUS_LABELS[order.status] || order.status}
                                            </Badge>
                                        </div>

                                        {/* Info */}
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{order.bike_model}</p>
                                            <p className="text-xs text-muted-foreground truncate">{order.customer_name}</p>
                                        </div>

                                        {/* Mechanics */}
                                        <div className="hidden md:flex items-center">
                                            {isUnassigned ? (
                                                <span className="text-xs text-amber-600/80 italic flex items-center gap-1">
                                                    Offen
                                                </span>
                                            ) : (
                                                <div className="flex -space-x-1.5">
                                                    {order.mechanic_ids!.map(mid => (
                                                        <div key={mid} className="h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center text-[9px] font-medium text-muted-foreground" title={getEmployeeName(mid)}>
                                                            {getEmployeeName(mid).charAt(0)}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Due Date */}
                                        <div className="mt-1 md:mt-0 flex items-center justify-between md:justify-start gap-4">
                                            <div className="md:hidden text-xs text-muted-foreground">Fällig:</div>
                                            <DueDateBadge date={order.due_date} />
                                        </div>

                                        {/* Status (Desktop) */}
                                        <div className="hidden md:flex items-center">
                                            <Badge variant="secondary" className={cn("text-[10px] h-5 px-1.5 font-normal border", STATUS_COLORS[order.status])}>
                                                {STATUS_LABELS[order.status] || order.status}
                                            </Badge>
                                        </div>

                                        {/* Chevron */}
                                        <div className="hidden md:flex justify-end">
                                            <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                            <Search className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <p className="font-medium text-sm">Keine Aufträge gefunden</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Versuche die Filter anzupassen oder suche nach einem anderen Begriff.
                        </p>
                        {(showUnassignedOnly || search) && (
                            <Button
                                variant="link"
                                size="sm"
                                onClick={() => {
                                    setSearch("")
                                    setShowUnassignedOnly(false)
                                }}
                                className="mt-2 text-xs"
                            >
                                Filter zurücksetzen
                            </Button>
                        )}
                    </CardContent>
                )}
            </Card>
        </section>
    )
}
