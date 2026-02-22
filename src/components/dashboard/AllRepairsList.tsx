import { useEffect, useState, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
    List,
    Search,
    ArrowUpDown,
    ArrowRight,
    User,
} from "lucide-react"
import type { OrderItem } from "./OrderCard"
import { STATUS_COLORS, STATUS_LABELS } from "./OrderCard"
import { cn } from "@/lib/utils"
import { isPast, isToday, differenceInHours, differenceInDays } from "date-fns"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useEmployee } from "@/contexts/EmployeeContext"

interface AllRepairsListProps {
    orders: OrderItem[]
    employees: { id: string, name: string }[]
}

type SortOption = 'due_date' | 'created_at'
type FilterStatus = 'all' | 'all_open' | 'unassigned' | 'eingegangen' | 'in_bearbeitung' | 'warten_auf_teile' | 'kontrolle_offen' | 'abholbereit'

export const AllRepairsList = ({ orders, employees }: AllRepairsListProps) => {
    const { workshopId, user } = useAuth()
    // Force rebuild
    const navigate = useNavigate()
    const { activeEmployee } = useEmployee()
    const location = useLocation()

    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all_open')
    const [sortBy, setSortBy] = useState<SortOption>('due_date')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
    const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null)

    // Resolve current employee ID
    useEffect(() => {
        const resolveEmployee = async () => {
            if (!workshopId || !user) return
            let employeeId = activeEmployee?.id
            if (!employeeId) {
                const { data: empData } = await supabase
                    .from('employees')
                    .select('id')
                    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
                    .eq('workshop_id', workshopId)
                    .maybeSingle()
                if (empData) employeeId = empData.id
            }
            setMyEmployeeId(employeeId || null)
        }
        resolveEmployee()
    }, [workshopId, user, activeEmployee])

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
                if (filterStatus === 'unassigned') {
                    const hasMechanics = order.mechanic_ids && order.mechanic_ids.length > 0
                    return !hasMechanics
                }
                if (filterStatus === 'all_open') {
                    // Show everything except maybe future scheduled? 
                    // For now 'all_open' is same as 'all' but default selected
                    return true
                }

                if (filterStatus !== 'all' && order.status !== (filterStatus as string)) return false

                return true
            })
            .sort((a, b) => {
                const multiplier = sortDirection === 'asc' ? 1 : -1

                // Primary sort by selected option
                if (sortBy === 'due_date') {
                    const dateA = a.due_date ? new Date(a.due_date).getTime() : (sortDirection === 'asc' ? Number.MAX_SAFE_INTEGER : 0)
                    const dateB = b.due_date ? new Date(b.due_date).getTime() : (sortDirection === 'asc' ? Number.MAX_SAFE_INTEGER : 0)
                    if (dateA !== dateB) return (dateA - dateB) * multiplier
                } else {
                    const createdA = new Date(a.created_at).getTime()
                    const createdB = new Date(b.created_at).getTime()
                    if (createdA !== createdB) return (createdA - createdB) * multiplier
                }

                // Secondary sort: always by created_at as fallback
                return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * multiplier
            })
    }, [orders, search, filterStatus, sortBy, sortDirection])



    const getDueDisplay = (dueDate: string | null) => {
        if (!dueDate) return <span className="text-xs text-muted-foreground/50">Kein Datum</span>

        const date = new Date(dueDate)
        const isOverdue = isPast(date) && !isToday(date)
        const dueToday = isToday(date)

        if (isOverdue) {
            return (
                <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                    Überfällig
                </span>
            )
        }
        if (dueToday) {
            return (
                <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                    Heute
                </span>
            )
        }

        const hoursUntil = differenceInHours(date, new Date())
        if (hoursUntil < 24) {
            return <span className="text-xs font-medium text-orange-600">Morgen</span>
        }
        const daysUntil = differenceInDays(date, new Date())
        if (daysUntil <= 7) {
            return <span className="text-xs text-muted-foreground">{daysUntil} Tage</span>
        }

        return (
            <span className="text-xs text-muted-foreground">
                {date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
            </span>
        )
    }

    const isAssignedToMe = (order: OrderItem) => {
        return myEmployeeId && order.mechanic_ids?.includes(myEmployeeId)
    }

    return (
        <section className="space-y-4">
            {/* Header with Filters */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10">
                        <List className="h-4 w-4 text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-semibold tracking-tight">Alle Reparaturen</h2>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                        {filteredOrders.length}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-2">
                        Sortiert: {sortBy === 'due_date' ? 'Nach Fälligkeit' : 'Nach Erstellungsdatum'}
                    </span>
                </div>

                {/* Filter Bar - Compact & Smart */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative w-full sm:w-56">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Kunde, Rad, Nr..."
                            className="h-9 pl-8 text-xs bg-background"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Status Filter - Smart Select */}
                    <Select value={filterStatus} onValueChange={(v: FilterStatus) => setFilterStatus(v)}>
                        <SelectTrigger className="h-9 w-full sm:w-[180px] text-xs bg-background border-input/60">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all_open">Alle Offenen</SelectItem>
                            <SelectItem value="unassigned">
                                <span className="flex items-center gap-2 text-amber-600">
                                    <User className="h-3.5 w-3.5" />
                                    Nicht zugewiesen
                                </span>
                            </SelectItem>
                            <SelectItem value="all">Alle</SelectItem>
                            <SelectItem value="eingegangen">Eingegangen</SelectItem>
                            <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                            <SelectItem value="warten_auf_teile">Warten auf Teile</SelectItem>
                            <SelectItem value="kontrolle_offen">Kontrolle offen</SelectItem>
                            <SelectItem value="abholbereit">Abholbereit</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Sort Toggle */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (sortBy === 'due_date') {
                                setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
                            } else {
                                setSortBy('due_date')
                                setSortDirection('asc')
                            }
                        }}
                        className={cn(
                            "h-9 text-xs border-input/60 bg-background hover:bg-accent hover:text-accent-foreground",
                            sortBy === 'due_date' && "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
                        )}
                    >
                        <ArrowUpDown className={cn("h-3.5 w-3.5 mr-1.5 transition-transform", sortBy === 'due_date' && sortDirection === 'desc' && "rotate-180")} />
                        Fälligkeit
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (sortBy === 'created_at') {
                                setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
                            } else {
                                setSortBy('created_at')
                                setSortDirection('asc')
                            }
                        }}
                        className={cn(
                            "h-9 text-xs border-input/60 bg-background hover:bg-accent hover:text-accent-foreground",
                            sortBy === 'created_at' && "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
                        )}
                    >
                        <ArrowUpDown className={cn("h-3.5 w-3.5 mr-1.5 transition-transform", sortBy === 'created_at' && sortDirection === 'desc' && "rotate-180")} />
                        Erstellung
                    </Button>

                    {/* Clear Filters */}
                    {(search || filterStatus !== 'all_open') && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSearch(""); setFilterStatus('all_open') }}
                            className="h-9 text-xs text-muted-foreground hover:text-foreground"
                        >
                            Reset
                        </Button>
                    )}
                </div>
            </div>

            {/* Orders List - Compact Table */}
            <Card className="border-border/40 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
                {filteredOrders.length > 0 ? (
                    <div className="divide-y divide-border/40">
                        {/* Desktop Header */}
                        <div className="hidden md:grid grid-cols-[80px_1fr_100px_100px_100px_100px_32px] gap-3 px-6 py-3 border-b border-border/40 bg-muted/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <span>Nr.</span>
                            <span>Fahrrad / Kunde</span>
                            <span>Mechaniker</span>
                            <button
                                onClick={() => {
                                    if (sortBy === 'created_at') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
                                    else { setSortBy('created_at'); setSortDirection('asc') }
                                }}
                                className={cn("flex items-center gap-1 hover:text-foreground transition-colors", sortBy === 'created_at' && "text-primary")}
                            >
                                Erstellt
                                <ArrowUpDown className={cn("h-3 w-3", sortBy === 'created_at' ? "opacity-100" : "opacity-0 group-hover:opacity-50")} />
                            </button>
                            <button
                                onClick={() => {
                                    if (sortBy === 'due_date') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
                                    else { setSortBy('due_date'); setSortDirection('asc') }
                                }}
                                className={cn("flex items-center gap-1 hover:text-foreground transition-colors", sortBy === 'due_date' && "text-primary")}
                            >
                                Fällig
                                <ArrowUpDown className={cn("h-3 w-3", sortBy === 'due_date' ? "opacity-100" : "opacity-0 group-hover:opacity-50")} />
                            </button>
                            <span>Status</span>
                            <span></span>
                        </div>

                        {filteredOrders.map((order) => {
                            const isUnassigned = !order.mechanic_ids || order.mechanic_ids.length === 0
                            const assignedToMe = isAssignedToMe(order)

                            return (
                                <div
                                    key={order.id}
                                    onClick={() => navigate(`/dashboard/orders/${order.id}`, { state: { from: location.pathname } })}
                                    className={cn(
                                        "group grid grid-cols-1 md:grid-cols-[80px_1fr_100px_100px_100px_100px_32px] gap-2 md:gap-3 px-6 py-4 cursor-pointer items-center border-b border-border/30 last:border-0",
                                        "transition-all duration-200",
                                        "hover:bg-accent/40 dark:hover:bg-accent/20", // General hover
                                        assignedToMe && "bg-blue-50/20 dark:bg-blue-900/10 dark:hover:bg-blue-900/20" // Assigned highlight
                                    )}
                                >
                                    {/* Order Number */}
                                    <div className="flex items-center justify-between md:justify-start">
                                        <span className="font-mono text-sm font-semibold text-primary/80">
                                            {order.order_number}
                                        </span>
                                        {/* Mobile: Show status here */}
                                        <Badge variant="secondary" className={cn(
                                            "md:hidden text-[10px] h-5 px-1.5 font-normal border",
                                            STATUS_COLORS[order.status]
                                        )}>
                                            {STATUS_LABELS[order.status]}
                                        </Badge>
                                    </div>

                                    {/* Info */}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium truncate">{order.bike_model}</p>
                                            {assignedToMe && (
                                                <Badge variant="outline" className="hidden sm:inline-flex text-[10px] h-4 px-1 border-blue-200 text-blue-600 bg-blue-50">
                                                    Mein
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{order.customer_name}</p>
                                    </div>

                                    {/* Mechanics */}
                                    <div className="hidden md:flex items-center">
                                        {isUnassigned ? (
                                            <span className="text-xs text-amber-600/80 italic flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                Offen
                                            </span>
                                        ) : (
                                            <div className="flex -space-x-1.5">
                                                {order.mechanic_ids!.slice(0, 2).map(mid => (
                                                    <div
                                                        key={mid}
                                                        className="h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center text-[9px] font-medium text-muted-foreground"
                                                        title={getEmployeeName(mid)}
                                                    >
                                                        {getEmployeeName(mid).charAt(0)}
                                                    </div>
                                                ))}
                                                {order.mechanic_ids!.length > 2 && (
                                                    <div className="h-6 w-6 rounded-full bg-muted border border-border flex items-center justify-center text-[9px] font-medium text-muted-foreground">
                                                        +{order.mechanic_ids!.length - 2}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Created At */}
                                    <div className="hidden md:flex items-center text-xs text-muted-foreground">
                                        {new Date(order.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                    </div>

                                    {/* Due Date */}
                                    <div className="flex items-center justify-between md:justify-start">
                                        <span className="md:hidden text-xs text-muted-foreground">Fällig:</span>
                                        {getDueDisplay(order.due_date)}
                                    </div>

                                    {/* Status (Desktop) */}
                                    <div className="hidden md:flex items-center">
                                        <Badge variant="secondary" className={cn("text-[10px] h-5 px-1.5 font-normal border", STATUS_COLORS[order.status])}>
                                            {STATUS_LABELS[order.status]}
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
                ) : (
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                            <Search className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <p className="font-medium text-sm">Keine Aufträge gefunden</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {(search || filterStatus !== 'all') && "Versuche die Filter anzupassen"}
                        </p>
                    </CardContent>
                )}
            </Card>
        </section >
    )
}
