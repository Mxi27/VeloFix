import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    User,
    ShieldCheck,
    ArrowRight,
    Calendar,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Filter,
    ArrowUpDown
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { format, isToday, isPast } from "date-fns"
import { de } from "date-fns/locale"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TaskOrder {
    id: string
    order_number: string
    customer_name: string
    bike_model: string
    status: string
    due_date: string | null
    created_at: string
}

type SortOption = 'due_date' | 'created_at' | 'status'
type SortDirection = 'asc' | 'desc'

export function DashboardTasks() {
    const { user, workshopId } = useAuth()
    const { activeEmployee } = useEmployee()
    const navigate = useNavigate()

    const [myTasks, setMyTasks] = useState<TaskOrder[]>([])
    const [qcTasks, setQcTasks] = useState<TaskOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [isOpen, setIsOpen] = useState(true)

    // Sort & Filter State
    const [sortBy, setSortBy] = useState<SortOption>('due_date')
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
    const [statusFilter, setStatusFilter] = useState<string | null>(null)

    useEffect(() => {
        const fetchTasks = async () => {
            if (!workshopId || !user) return

            setLoading(true)

            // 1. Resolve Employee ID
            let employeeId = activeEmployee?.id

            if (!employeeId) {
                const { data: empData } = await supabase
                    .from('employees')
                    .select('id')
                    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
                    .eq('workshop_id', workshopId)
                    .maybeSingle()

                if (empData) {
                    employeeId = empData.id
                }
            }

            // Even if no employeeId found, we stop loading but return empty arrays
            if (!employeeId) {
                setLoading(false)
                return
            }

            // 2. My Tasks
            const { data: myOrders } = await supabase
                .from('orders')
                .select('id, order_number, customer_name, bike_model, status, due_date, created_at, mechanic_ids')
                .eq('workshop_id', workshopId)
                .neq('status', 'abgeschlossen')
                .neq('status', 'abgeholt')
                .neq('status', 'trash')
                .contains('mechanic_ids', [employeeId])

            if (myOrders) setMyTasks(myOrders)

            // 3. QC Tasks
            const { data: qcOrders } = await supabase
                .from('orders')
                .select('id, order_number, customer_name, bike_model, status, due_date, created_at, qc_mechanic_id')
                .eq('workshop_id', workshopId)
                .neq('status', 'abgeschlossen')
                .neq('status', 'abgeholt')
                .neq('status', 'trash')
                .eq('qc_mechanic_id', employeeId)

            if (qcOrders) setQcTasks(qcOrders)

            setLoading(false)
        }

        fetchTasks()
    }, [workshopId, user, activeEmployee])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'abholbereit': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
            case 'in_bearbeitung': return 'text-blue-600 bg-blue-50 border-blue-200'
            case 'warten_auf_teile': return 'text-amber-600 bg-amber-50 border-amber-200'
            case 'eingegangen': return 'text-slate-600 bg-slate-50 border-slate-200'
            default: return 'text-slate-600 bg-slate-50 border-slate-200'
        }
    }

    const getStatusLabel = (status: string) => {
        return status.replace(/_/g, ' ')
    }

    const processTasks = (tasks: TaskOrder[]) => {
        let processed = [...tasks]

        // Filter
        if (statusFilter) {
            processed = processed.filter(t => t.status === statusFilter)
        }

        // Sort
        processed.sort((a, b) => {
            let valA, valB

            switch (sortBy) {
                case 'due_date':
                    valA = a.due_date ? new Date(a.due_date).getTime() : 9999999999999 // nulls last
                    valB = b.due_date ? new Date(b.due_date).getTime() : 9999999999999
                    break
                case 'created_at':
                    valA = new Date(a.created_at).getTime()
                    valB = new Date(b.created_at).getTime()
                    break
                case 'status':
                    valA = a.status
                    valB = b.status
                    break
                default:
                    return 0
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1
            return 0
        })

        return processed
    }

    const filteredMyTasks = processTasks(myTasks)
    const filteredQcTasks = processTasks(qcTasks)

    const toggleSort = (field: SortOption) => {
        if (sortBy === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortBy(field)
            setSortDirection('asc')
        }
    }

    const TaskCard = ({ order, type }: { order: TaskOrder, type: 'mechanic' | 'qc' }) => {
        const isOverdue = order.due_date && isPast(new Date(order.due_date)) && !isToday(new Date(order.due_date))
        const isDueToday = order.due_date && isToday(new Date(order.due_date))

        return (
            <div
                onClick={() => navigate(type === 'qc' ? `/dashboard/orders/${order.id}/control` : `/dashboard/orders/${order.id}/work`)}
                className="group flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:border-primary/20 hover:bg-accent/5 hover:shadow-sm transition-all cursor-pointer"
            >
                <div className="flex items-start gap-3 overflow-hidden">
                    <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${isOverdue ? 'bg-red-500' : (isDueToday ? 'bg-orange-500' : 'bg-slate-300')}`} />
                    <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate">{order.order_number}</span>
                            <Badge variant="secondary" className={`text-[10px] h-5 px-1.5 font-normal capitalize border ${getStatusColor(order.status)}`}>
                                {getStatusLabel(order.status)}
                            </Badge>
                        </div>
                        <p className="text-sm font-medium truncate">{order.bike_model} <span className="text-muted-foreground font-normal">• {order.customer_name}</span></p>

                        {order.due_date && (
                            <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600 font-medium' : (isDueToday ? 'text-orange-600 font-medium' : 'text-muted-foreground')}`}>
                                <Calendar className="h-3 w-3" />
                                {format(new Date(order.due_date), "dd. MMM", { locale: de })}
                                {isOverdue && " (Überfällig)"}
                                {isDueToday && " (Heute)"}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="grid gap-6 md:grid-cols-2 mb-8">
                <div className="h-[200px] w-full bg-muted/20 animate-pulse rounded-xl" />
                <div className="h-[200px] w-full bg-muted/20 animate-pulse rounded-xl" />
            </div>
        )
    }

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-4 mb-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <span className="sr-only">Toggle tasks</span>
                        </Button>
                    </CollapsibleTrigger>
                    <h2 className="text-lg font-semibold tracking-tight">Meine Aufgaben</h2>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                        {myTasks.length + qcTasks.length}
                    </Badge>
                </div>

                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-2">
                                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="hidden sm:inline">Sortieren</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Sortieren nach</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => toggleSort('due_date')} className="flex justify-between">
                                Fälligkeit
                                {sortBy === 'due_date' && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleSort('created_at')} className="flex justify-between">
                                Erstellt am
                                {sortBy === 'created_at' && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleSort('status')} className="flex justify-between">
                                Status
                                {sortBy === 'status' && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className={`h-8 gap-2 ${statusFilter ? 'bg-primary/10 border-primary/20 text-primary' : ''}`}>
                                <Filter className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Filter</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Status Filter</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                                Alle anzeigen
                                {!statusFilter && <CheckCircle2 className="h-3 w-3 ml-auto" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setStatusFilter('in_bearbeitung')}>
                                In Bearbeitung
                                {statusFilter === 'in_bearbeitung' && <CheckCircle2 className="h-3 w-3 ml-auto" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setStatusFilter('warten_auf_teile')}>
                                Warten auf Teile
                                {statusFilter === 'warten_auf_teile' && <CheckCircle2 className="h-3 w-3 ml-auto" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setStatusFilter('eingegangen')}>
                                Eingegangen
                                {statusFilter === 'eingegangen' && <CheckCircle2 className="h-3 w-3 ml-auto" />}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <CollapsibleContent>
                <div className="grid gap-6 md:grid-cols-2">
                    {/* My Tasks Column */}
                    <Card className="flex flex-col h-full border-none shadow-sm bg-gradient-to-br from-card to-card/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600">
                                    <User className="h-4 w-4" />
                                </div>
                                Aufräge
                                {filteredMyTasks.length > 0 && (
                                    <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">
                                        {filteredMyTasks.length}
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-[150px]">
                            {filteredMyTasks.length > 0 ? (
                                <div className="space-y-2">
                                    {filteredMyTasks.slice(0, 5).map(order => (
                                        <TaskCard key={order.id} order={order} type="mechanic" />
                                    ))}
                                    {filteredMyTasks.length > 5 && (
                                        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground mt-2">
                                            + {filteredMyTasks.length - 5} weitere anzeigen
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground border-2 border-dashed border-border/50 rounded-lg">
                                    <CheckCircle2 className="h-8 w-8 mb-2 opacity-20" />
                                    <p className="text-sm">Keine offenen Aufträge.</p>
                                    {statusFilter && <p className="text-xs text-muted-foreground/60 mt-1">Filter aktiv</p>}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* QC Tasks Column */}
                    <Card className="flex flex-col h-full border-none shadow-sm bg-gradient-to-br from-card to-card/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600">
                                    <ShieldCheck className="h-4 w-4" />
                                </div>
                                Qualitätskontrolle
                                {filteredQcTasks.length > 0 && (
                                    <Badge variant="secondary" className="ml-auto bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200">
                                        {filteredQcTasks.length}
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-[150px]">
                            {filteredQcTasks.length > 0 ? (
                                <div className="space-y-2">
                                    {filteredQcTasks.slice(0, 5).map(order => (
                                        <TaskCard key={order.id} order={order} type="qc" />
                                    ))}
                                    {filteredQcTasks.length > 5 && (
                                        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground mt-2">
                                            + {filteredQcTasks.length - 5} weitere anzeigen
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground border-2 border-dashed border-border/50 rounded-lg">
                                    <ShieldCheck className="h-8 w-8 mb-2 opacity-20" />
                                    <p className="text-sm">Keine ausstehenden Kontrollen.</p>
                                    {statusFilter && <p className="text-xs text-muted-foreground/60 mt-1">Filter aktiv</p>}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}
