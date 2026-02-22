import { DashboardLayout } from "@/layouts/DashboardLayout"
import { StatsCards } from "@/components/StatsCards"
import { OrdersTable } from "@/components/OrdersTable"
import { PageTransition } from "@/components/PageTransition"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { useState, useEffect, useMemo } from "react"
import { Sparkles, Bike, ShieldCheck, ListTodo, Clock, CheckCircle2, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { useNavigate, useLocation } from "react-router-dom"
import { isPast, isToday, format, differenceInDays } from "date-fns"
import { de } from "date-fns/locale"
import { getUrgencyInfo } from "@/lib/urgency"

type ViewMode = 'general' | 'cockpit'

interface Order {
    id: string
    order_number: string
    customer_name: string
    bike_model: string
    status: string
    due_date: string | null
    created_at: string
    mechanic_ids: string[] | null
    qc_mechanic_id: string | null
    checklist?: Array<{ completed: boolean; completed_by?: string }>
}

interface ShopTask {
    id: string
    title: string
    description: string | null
    status: string
    due_date: string | null
    priority: 'low' | 'medium' | 'high'
    created_at: string
}

// STORAGE KEY for persistence
const DASHBOARD_VIEW_KEY = 'velofix-dashboard-view'

export default function DashboardPage() {
    const { user, workshopId } = useAuth()
    const { activeEmployee, employees } = useEmployee()
    const navigate = useNavigate()
    const location = useLocation()
    const [refreshKey, setRefreshKey] = useState(0)

    // View Mode State with localStorage persistence and URL sync
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        // Check URL param first
        const params = new URLSearchParams(location.search)
        const urlView = params.get('view') as ViewMode | null
        if (urlView === 'general' || urlView === 'cockpit') {
            return urlView
        }
        // Fall back to localStorage
        return (localStorage.getItem(DASHBOARD_VIEW_KEY) as ViewMode) || 'general'
    })

    // Data State
    const [orders, setOrders] = useState<Order[]>([])
    const [shopTasks, setShopTasks] = useState<ShopTask[]>([])

    // Sync viewMode to localStorage and URL
    useEffect(() => {
        localStorage.setItem(DASHBOARD_VIEW_KEY, viewMode)
        const params = new URLSearchParams(location.search)
        if (viewMode === 'cockpit') {
            params.set('view', 'cockpit')
        } else {
            params.delete('view')
        }
        const newUrl = `${location.pathname}${params.toString() ? '?' + params.toString() : ''}`
        if (newUrl !== location.pathname + location.search) {
            window.history.replaceState({}, '', newUrl)
        }
    }, [viewMode])

    // Fetch all data
    useEffect(() => {
        if (!workshopId) return

        const fetchData = async () => {
            try {
                // Fetch orders
                const { data: ordersData } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('workshop_id', workshopId)
                    .neq('status', 'abgeschlossen')
                    .neq('status', 'abgeholt')
                    .neq('status', 'trash')
                    .order('due_date', { ascending: true, nullsFirst: false })

                setOrders(ordersData || [])

                // Fetch shop tasks
                const { data: tasksData } = await supabase
                    .from('shop_tasks')
                    .select('*')
                    .eq('workshop_id', workshopId)
                    .in('status', ['open', 'in_progress'])
                    .order('priority', { ascending: false })
                    .order('due_date', { ascending: true, nullsFirst: false })

                setShopTasks(tasksData || [])
            } catch (error) {
                console.error('Error fetching data:', error)
            }
        }

        fetchData()

        // Poll for updates every 30 seconds
        const interval = setInterval(fetchData, 30000)
        return () => clearInterval(interval)
    }, [workshopId, refreshKey])

    const handleOrderCreated = () => {
        setRefreshKey(prev => prev + 1)
    }

    // Get current employee ID
    const currentEmployeeId = useMemo(() => {
        if (activeEmployee?.id) return activeEmployee.id
        // Try to resolve employee from user
        if (user && employees) {
            const emp = employees.find(e => e.user_id === user.id || e.email === user.email)
            return emp?.id
        }
        return null
    }, [activeEmployee, user, employees])

    // Filter data for cockpit columns
    const cockpitData = useMemo(() => {
        // Column 1: My assigned bikes
        const myBikes = orders.filter(o =>
            currentEmployeeId && o.mechanic_ids?.includes(currentEmployeeId)
        )

        // Column 2 Top: QC orders
        const qcOrders = orders.filter(o => o.status === 'kontrolle_offen')

        // Column 2 Bottom: Shop tasks
        const tasks = shopTasks

        // Column 3: Next up (sorted by due date)
        const nextUp = [...orders]
            .filter(o => !currentEmployeeId || !o.mechanic_ids?.includes(currentEmployeeId))
            .sort((a, b) => {
                const dateA = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
                const dateB = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER
                return dateA - dateB
            })
            .slice(0, 15) // Limit to 15 for the queue

        return { myBikes, qcOrders, tasks, nextUp }
    }, [orders, shopTasks, currentEmployeeId])

    // Time-based greeting
    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return "Guten Morgen"
        if (hour < 18) return "Guten Tag"
        return "Guten Abend"
    }

    const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Team'
    const today = new Date().toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    })

    // Toggle task completion
    const toggleTaskComplete = async (taskId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'done' ? 'open' : 'done'

        // Optimistic update
        setShopTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, status: newStatus } : t
        ))

        try {
            const { error } = await supabase
                .from('shop_tasks')
                .update({ status: newStatus })
                .eq('id', taskId)

            if (error) throw error
        } catch (error) {
            console.error('Error updating task:', error)
            // Revert on error
            setShopTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, status: currentStatus } : t
            ))
        }
    }

    return (
        <PageTransition>
            <DashboardLayout onOrderCreated={handleOrderCreated}>
                {/* Premium Header with View Mode Toggle */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-primary/3 border border-primary/10 p-6 mb-6">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    <div className="relative flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex p-3 rounded-xl bg-primary/10 border border-primary/20">
                                <Sparkles className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">
                                    {getGreeting()}, <span className="text-gradient">{firstName}</span>
                                </h1>
                                <p className="text-muted-foreground text-sm mt-0.5">
                                    {today} — Alles bereit für einen produktiven Tag
                                </p>
                            </div>
                        </div>

                        {/* Segmented Control Switch */}
                        <div className="flex bg-muted/50 border border-border/50 rounded-xl p-1 gap-1">
                            <Button
                                variant={viewMode === 'general' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('general')}
                                className={cn(
                                    "rounded-lg transition-all duration-200",
                                    viewMode === 'general'
                                        ? "bg-background shadow-sm text-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                            >
                                Allgemein
                            </Button>
                            <Button
                                variant={viewMode === 'cockpit' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('cockpit')}
                                className={cn(
                                    "rounded-lg transition-all duration-200",
                                    viewMode === 'cockpit'
                                        ? "bg-background shadow-sm text-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                            >
                                Cockpit
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Cockpit Mode */}
                {viewMode === 'cockpit' ? (
                    <div className="grid gap-4 lg:grid-cols-3 h-[calc(100vh-220px)] min-h-[500px]">
                        {/* Column 1: Meine Räder */}
                        <CockpitColumn
                            title="Meine zugewiesenen Räder"
                            icon={Bike}
                            iconColor="text-blue-600"
                            iconBg="bg-blue-500/10"
                            count={cockpitData.myBikes.length}
                        >
                            <div className="space-y-0.5 overflow-y-auto custom-scrollbar">
                                {cockpitData.myBikes.length === 0 ? (
                                    <EmptyState message="Keine Räder zugewiesen" />
                                ) : (
                                    cockpitData.myBikes.map((order) => (
                                        <OrderListItem
                                            key={order.id}
                                            order={order}
                                            onClick={() => navigate(`/dashboard/orders/${order.id}/work`, { state: { from: location.pathname + '?view=cockpit' } })}
                                        />
                                    ))
                                )}
                            </div>
                        </CockpitColumn>

                        {/* Column 2: QC & Tasks */}
                        <div className="space-y-4 flex flex-col h-full">
                            {/* QC Section */}
                            <CockpitColumn
                                title="Qualitätskontrolle"
                                icon={ShieldCheck}
                                iconColor="text-purple-600"
                                iconBg="bg-purple-500/10"
                                count={cockpitData.qcOrders.length}
                                className="flex-1"
                            >
                                <div className="space-y-0.5 overflow-y-auto custom-scrollbar">
                                    {cockpitData.qcOrders.length === 0 ? (
                                        <EmptyState message="Keine Kontrolle offen" />
                                    ) : (
                                        cockpitData.qcOrders.map((order) => {
                                            const isSelfCheck = order.checklist?.some(item =>
                                                item.completed && item.completed_by === currentEmployeeId
                                            ) || (currentEmployeeId && order.mechanic_ids?.includes(currentEmployeeId))

                                            return (
                                                <OrderListItem
                                                    key={order.id}
                                                    order={order}
                                                    onClick={() => navigate(`/dashboard/orders/${order.id}/control`, { state: { from: location.pathname + '?view=cockpit' } })}
                                                    badge={isSelfCheck ? { text: "Eigene Arbeit", variant: "warning" } : undefined}
                                                />
                                            )
                                        })
                                    )}
                                </div>
                            </CockpitColumn>

                            {/* Tasks Section */}
                            <CockpitColumn
                                title="Meine Aufgaben"
                                icon={ListTodo}
                                iconColor="text-orange-600"
                                iconBg="bg-orange-500/10"
                                count={cockpitData.tasks.length}
                                className="flex-1"
                            >
                                <div className="space-y-0 overflow-y-auto custom-scrollbar">
                                    {cockpitData.tasks.length === 0 ? (
                                        <EmptyState message="Keine Aufgaben" />
                                    ) : (
                                        cockpitData.tasks.map((task) => (
                                            <TaskListItem
                                                key={task.id}
                                                task={task}
                                                onToggle={() => toggleTaskComplete(task.id, task.status)}
                                            />
                                        ))
                                    )}
                                </div>
                            </CockpitColumn>
                        </div>

                        {/* Column 3: Als Nächstes dran */}
                        <CockpitColumn
                            title="Als Nächstes dran"
                            icon={Clock}
                            iconColor="text-emerald-600"
                            iconBg="bg-emerald-500/10"
                            count={cockpitData.nextUp.length}
                        >
                            <div className="space-y-0.5 overflow-y-auto custom-scrollbar">
                                {cockpitData.nextUp.length === 0 ? (
                                    <EmptyState message="Keine weiteren Aufträge" />
                                ) : (
                                    cockpitData.nextUp.map((order) => (
                                        <OrderListItem
                                            key={order.id}
                                            order={order}
                                            onClick={() => navigate(`/dashboard/orders/${order.id}/work`, { state: { from: location.pathname + '?view=cockpit' } })}
                                        />
                                    ))
                                )}
                            </div>
                        </CockpitColumn>
                    </div>
                ) : (
                    <>
                        {/* General Mode */}
                        <StatsCards key={`stats-${refreshKey}`} />

                        {/* Orders */}
                        <div className="mt-8">
                            <OrdersTable key={refreshKey} />
                        </div>
                    </>
                )}
            </DashboardLayout>
        </PageTransition>
    )
}

// ── Cockpit Column Component ────────────────────────────────────────────────────

interface CockpitColumnProps {
    title: string
    icon: React.ComponentType<{ className?: string }>
    iconColor: string
    iconBg: string
    count: number
    children: React.ReactNode
    className?: string
}

function CockpitColumn({ title, icon: Icon, iconColor, iconBg, count, children, className }: CockpitColumnProps) {
    return (
        <Card className={cn("border-border/40 shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col", className)}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20 shrink-0">
                <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-lg", iconBg)}>
                        <Icon className={cn("h-4 w-4", iconColor)} />
                    </div>
                    <h3 className="font-semibold text-sm tracking-tight">{title}</h3>
                </div>
                <Badge variant="secondary" className="bg-muted/50 text-muted-foreground text-xs">
                    {count}
                </Badge>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0">
                {children}
            </div>
        </Card>
    )
}

// ── Empty State Component ─────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-10 w-10 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground">{message}</p>
        </div>
    )
}

// ── Order List Item (Jony Ive Style) ──────────────────────────────────────────────

interface OrderListItemProps {
    order: Order
    onClick: () => void
    badge?: { text: string; variant: 'warning' | 'danger' | 'info' }
}

function OrderListItem({ order, onClick, badge }: OrderListItemProps) {
    const urgency = getUrgencyInfo(order.due_date)
    const UrgencyIcon = urgency.icon

    return (
        <div
            onClick={onClick}
            className="group relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 border-b border-border/30 last:border-0 hover:bg-accent/40"
        >
            {/* Urgency Indicator */}
            <div className={cn(
                "p-1.5 rounded-md shrink-0",
                urgency.bg
            )}>
                <UrgencyIcon className={cn("h-3.5 w-3.5", urgency.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">
                        {order.bike_model}
                    </span>
                    {badge && (
                        <Badge variant={badge.variant === 'warning' ? 'secondary' : 'destructive'}
                            className={cn(
                                "text-[9px] h-4 px-1 font-medium shrink-0",
                                badge.variant === 'warning' && "bg-amber-100 text-amber-700 border-amber-200",
                                badge.variant === 'danger' && "bg-red-100 text-red-700 border-red-200",
                                badge.variant === 'info' && "bg-blue-100 text-blue-700 border-blue-200"
                            )}>
                            {badge.text}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono text-[10px]">{order.order_number}</span>
                    <span>•</span>
                    <span className="truncate">{order.customer_name}</span>
                </div>
            </div>

            {/* Due Date */}
            <div className={cn("shrink-0 text-right", urgency.color)}>
                {urgency.isOverdue ? (
                    <span className="text-xs font-medium flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {differenceInDays(new Date(), new Date(order.due_date!))}d
                    </span>
                ) : order.due_date ? (
                    <span className="text-xs font-medium">{urgency.shortLabel}</span>
                ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                )}
            </div>
        </div>
    )
}

// ── Task List Item (Jony Ive Style with Checkbox) ───────────────────────────────────

interface TaskListItemProps {
    task: ShopTask
    onToggle: () => void
}

function TaskListItem({ task, onToggle }: TaskListItemProps) {
    const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'done'

    return (
        <div className={cn(
            "group flex items-start gap-3 px-4 py-3 border-b border-border/30 last:border-0 transition-colors",
            task.status === 'done' && "bg-muted/20"
        )}>
            {/* Checkbox */}
            <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                    checked={task.status === 'done'}
                    onCheckedChange={onToggle}
                    className={cn(
                        "h-4 w-4 transition-colors",
                        task.status === 'done' && "bg-primary border-primary"
                    )}
                />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className={cn(
                    "text-sm leading-tight transition-colors",
                    task.status === 'done'
                        ? "line-through text-muted-foreground"
                        : "text-foreground font-medium"
                )}>
                    {task.title}
                </p>
                {task.description && task.status !== 'done' && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {task.description}
                    </p>
                )}
                {task.due_date && task.status !== 'done' && (
                    <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className={cn(
                            "text-[10px]",
                            isOverdue && "text-red-600 font-medium"
                        )}>
                            {format(new Date(task.due_date), "d. MMM", { locale: de })}
                            {isOverdue && " Überfällig"}
                        </span>
                    </div>
                )}
            </div>

            {/* Priority Indicator */}
            <div className={cn(
                "mt-1 h-2 w-2 rounded-full shrink-0",
                task.priority === 'high' && "bg-red-500",
                task.priority === 'medium' && "bg-amber-500",
                task.priority === 'low' && "bg-slate-300"
            )} />
        </div>
    )
}
