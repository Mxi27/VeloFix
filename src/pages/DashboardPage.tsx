import { DashboardLayout } from "@/layouts/DashboardLayout"
import { StatsCards } from "@/components/StatsCards"
import { OrdersTable } from "@/components/OrdersTable"
import { PageTransition } from "@/components/PageTransition"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { useState, useEffect, useMemo, useRef } from "react"
import {
    Sparkles, Bike, ShieldCheck, ListTodo, Clock, CheckCircle2,
    ChevronRight, ChevronDown, Zap
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { useNavigate, useLocation } from "react-router-dom"
import { isPast, isToday, format, differenceInDays, addDays } from "date-fns"
import { de } from "date-fns/locale"
import { getUrgencyInfo } from "@/lib/urgency"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
}

interface BikeBuild {
    id: string
    internal_number: string
    brand: string
    model: string
    status: string
    assigned_employee_id: string | null
    qc_mechanic_id: string | null
    created_at: string
}

interface ShopTask {
    id: string
    title: string
    description: string | null
    status: string
    due_date: string | null
    priority: 'low' | 'medium' | 'high'
    assigned_to?: string | null
}

const DASHBOARD_VIEW_KEY = 'velofix-dashboard-view'

export default function DashboardPage() {
    const { user, workshopId } = useAuth()
    const { activeEmployee, employees, selectEmployee } = useEmployee()
    const navigate = useNavigate()
    const location = useLocation()
    const [refreshKey, setRefreshKey] = useState(0)
    const [showEmployeePicker, setShowEmployeePicker] = useState(false)
    const pickerRef = useRef<HTMLDivElement>(null)

    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        const params = new URLSearchParams(location.search)
        const urlView = params.get('view') as ViewMode | null
        if (urlView === 'general' || urlView === 'cockpit') return urlView
        return (localStorage.getItem(DASHBOARD_VIEW_KEY) as ViewMode) || 'general'
    })

    const [orders, setOrders] = useState<Order[]>([])
    const [bikeBuilds, setBikeBuilds] = useState<BikeBuild[]>([])
    const [shopTasks, setShopTasks] = useState<ShopTask[]>([])

    // Close picker when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setShowEmployeePicker(false)
            }
        }
        if (showEmployeePicker) document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [showEmployeePicker])

    // Sync viewMode to localStorage + URL
    useEffect(() => {
        localStorage.setItem(DASHBOARD_VIEW_KEY, viewMode)
        const params = new URLSearchParams(location.search)
        if (viewMode === 'cockpit') params.set('view', 'cockpit')
        else params.delete('view')
        const newUrl = `${location.pathname}${params.toString() ? '?' + params.toString() : ''}`
        if (newUrl !== location.pathname + location.search) {
            window.history.replaceState({}, '', newUrl)
        }
    }, [viewMode])

    useEffect(() => {
        if (!workshopId) return
        const fetchData = async () => {
            try {
                const [ordersRes, buildsRes, tasksRes] = await Promise.all([
                    supabase.from('orders').select('id,order_number,customer_name,bike_model,status,due_date,created_at,mechanic_ids,qc_mechanic_id')
                        .eq('workshop_id', workshopId)
                        .neq('status', 'abgeschlossen').neq('status', 'abgeholt').neq('status', 'trash')
                        .order('due_date', { ascending: true, nullsFirst: false }),
                    supabase.from('bike_builds').select('id,internal_number,brand,model,status,assigned_employee_id,qc_mechanic_id,created_at')
                        .eq('workshop_id', workshopId).neq('status', 'abgeschlossen'),
                    supabase.from('shop_tasks').select('*').eq('workshop_id', workshopId)
                        .in('status', ['open', 'in_progress'])
                        .order('priority', { ascending: false })
                        .order('due_date', { ascending: true, nullsFirst: false }),
                ])
                setOrders(ordersRes.data || [])
                setBikeBuilds(buildsRes.data || [])
                setShopTasks(tasksRes.data || [])
            } catch (error) { console.error('Fetch error:', error) }
        }
        fetchData()
        const interval = setInterval(fetchData, 30000)
        return () => clearInterval(interval)
    }, [workshopId, refreshKey])

    const handleOrderCreated = () => setRefreshKey(p => p + 1)

    // Employee IDs to match against mechanic_ids:
    // - activeEmployee.id  (employee table row ID — used by EmployeeSelector)
    // - activeEmployee.user_id (Supabase auth ID — used when status changes via kiosk)
    // - user?.id (current logged-in auth ID — used when non-kiosk mechanics assign themselves)
    const myMatchIds = useMemo(() => {
        const ids: string[] = []
        if (activeEmployee?.id) ids.push(activeEmployee.id)
        if (activeEmployee?.user_id) ids.push(activeEmployee.user_id)
        if (user?.id) ids.push(user.id)
        return [...new Set(ids)] // dedupe
    }, [activeEmployee, user])

    const cockpitReturnState = { state: { from: '/dashboard?view=cockpit' } }

    const cockpitData = useMemo(() => {
        // My assigned repair orders (check both employee.id and user_id)
        const myOrders = orders.filter(o =>
            myMatchIds.length > 0 && o.mechanic_ids?.some(id => myMatchIds.includes(id))
        )

        // QC: repair orders with status kontrolle_offen
        const qcRepairOrders = orders.filter(o => o.status === 'kontrolle_offen')

        // QC: neurad builds with status 'fertig' (ready for control)
        const qcBuilds = bikeBuilds.filter(b => b.status === 'fertig')

        // Tasks: assigned to current employee OR due within 3 days
        const threeDaysFromNow = addDays(new Date(), 3)
        const myTasks = shopTasks.filter(t => {
            const isAssigned = myMatchIds.length > 0 && myMatchIds.includes(t.assigned_to || '')
            const isDueSoon = t.due_date && new Date(t.due_date) <= threeDaysFromNow
            return isAssigned || isDueSoon
        })

        // Next up: unassigned or not assigned to current user, sorted by due date
        const assignedOrderIds = new Set(myOrders.map(o => o.id))
        const nextUp = orders
            .filter(o => !assignedOrderIds.has(o.id))
            .slice(0, 15)

        return { myOrders, qcRepairOrders, qcBuilds, myTasks, nextUp }
    }, [orders, bikeBuilds, shopTasks, myMatchIds])

    const toggleTaskComplete = async (taskId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'done' ? 'open' : 'done'
        setShopTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
        await supabase.from('shop_tasks').update({ status: newStatus }).eq('id', taskId)
    }

    const getGreeting = () => {
        const h = new Date().getHours()
        if (h < 12) return "Guten Morgen"
        if (h < 18) return "Guten Tag"
        return "Guten Abend"
    }

    const displayName = activeEmployee?.name || user?.user_metadata?.full_name?.split(' ')[0] || 'Team'
    const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
    const qcTotalCount = cockpitData.qcRepairOrders.length + cockpitData.qcBuilds.length

    const regularEmployees = employees.filter(e => !e.is_kiosk_mode)

    return (
        <PageTransition>
            <DashboardLayout onOrderCreated={handleOrderCreated}>

                {/* ── Premium Header ── */}
                <div className="relative z-10 rounded-2xl bg-gradient-to-br from-primary/5 via-background/80 to-transparent border border-border/30 p-5 mb-5 backdrop-blur-sm">
                    <div className="absolute top-0 right-0 w-80 h-56 bg-primary/4 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    <div className="relative flex items-center justify-between gap-4 flex-wrap">

                        {/* Greeting + Employee Dropdown */}
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/15 text-primary">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <h1 className="text-xl font-bold tracking-tight leading-tight text-foreground">
                                        {getGreeting()},
                                    </h1>
                                    {/* Radix DropdownMenu — portaled, always correct position */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="flex items-center gap-0.5 text-xl font-bold text-primary/90 hover:text-primary transition-colors leading-tight outline-none">
                                                {displayName}
                                                <ChevronDown className="h-4 w-4 ml-0.5" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="start"
                                            sideOffset={8}
                                            className="w-52 rounded-2xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/20 p-1"
                                        >
                                            {regularEmployees.map(emp => (
                                                <DropdownMenuItem
                                                    key={emp.id}
                                                    onClick={() => selectEmployee(emp.id)}
                                                    className={cn(
                                                        "flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer",
                                                        activeEmployee?.id === emp.id && "bg-primary/10 text-primary"
                                                    )}
                                                >
                                                    <span className={cn(
                                                        "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                                        activeEmployee?.id === emp.id
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-muted text-muted-foreground"
                                                    )}>
                                                        {emp.name.charAt(0).toUpperCase()}
                                                    </span>
                                                    <span className="flex-1 truncate text-sm">{emp.name}</span>
                                                    {activeEmployee?.id === emp.id && (
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                                                    )}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <p className="text-sm text-muted-foreground mt-0.5">{today}</p>
                            </div>
                        </div>

                        {/* View Toggle */}
                        <div className="flex bg-muted/40 border border-border/40 rounded-xl p-1 gap-1">
                            {(['general', 'cockpit'] as ViewMode[]).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-sm transition-all duration-200 font-medium",
                                        viewMode === mode
                                            ? "bg-background shadow-sm text-foreground border border-border/30"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {mode === 'general' ? 'Allgemein' : 'Cockpit'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Views ── */}
                {viewMode === 'cockpit' ? (
                    <div className="grid gap-4 lg:grid-cols-3">

                        {/* ── Col 1: Meine Räder ── */}
                        <CockpitPanel
                            title="Meine Räder"
                            icon={Bike}
                            accent="blue"
                            count={cockpitData.myOrders.length}
                            empty={
                                myMatchIds.length === 0
                                    ? "Klicke deinen Namen an um dich auszuwählen"
                                    : "Keine Räder zugewiesen"
                            }
                        >
                            {cockpitData.myOrders.map(order => (
                                <OrderRow
                                    key={order.id}
                                    order={order}
                                    onClick={() => navigate(`/dashboard/orders/${order.id}`, cockpitReturnState)}
                                />
                            ))}
                        </CockpitPanel>

                        {/* ── Col 2: QC + Tasks ── */}
                        <div className="flex flex-col gap-4">
                            <CockpitPanel
                                title="Qualitätskontrolle"
                                icon={ShieldCheck}
                                accent="purple"
                                count={qcTotalCount}
                                empty="Keine Kontrolle offen"
                                className="flex-1"
                            >
                                {cockpitData.qcRepairOrders.map(order => {
                                    const isSelfCheck = myMatchIds.some(id =>
                                        order.mechanic_ids?.includes(id)
                                    )
                                    return (
                                        <OrderRow
                                            key={order.id}
                                            order={order}
                                            selfCheckWarning={isSelfCheck}
                                            onClick={() => navigate(`/dashboard/orders/${order.id}/control`, cockpitReturnState)}
                                        />
                                    )
                                })}
                                {cockpitData.qcBuilds.map(build => (
                                    <BuildRow
                                        key={build.id}
                                        build={build}
                                        onClick={() => navigate(
                                            `/dashboard/bike-builds/${build.id}`,
                                            { state: { from: '/dashboard?view=cockpit' } }
                                        )}
                                    />
                                ))}
                            </CockpitPanel>

                            <CockpitPanel
                                title="Aufgaben"
                                icon={ListTodo}
                                accent="orange"
                                count={cockpitData.myTasks.length}
                                empty="Keine Aufgaben fällig"
                                className="flex-1"
                            >
                                {cockpitData.myTasks.map(task => (
                                    <TaskRow
                                        key={task.id}
                                        task={task}
                                        onToggle={() => toggleTaskComplete(task.id, task.status)}
                                        onClick={() => navigate('/dashboard/tasks', cockpitReturnState)}
                                    />
                                ))}
                            </CockpitPanel>
                        </div>

                        {/* ── Col 3: Als Nächstes ── */}
                        <CockpitPanel
                            title="Als Nächstes"
                            icon={Clock}
                            accent="emerald"
                            count={cockpitData.nextUp.length}
                            empty="Keine weiteren Aufträge"
                        >
                            {cockpitData.nextUp.map(order => (
                                <OrderRow
                                    key={order.id}
                                    order={order}
                                    onClick={() => navigate(`/dashboard/orders/${order.id}`, cockpitReturnState)}
                                />
                            ))}
                        </CockpitPanel>
                    </div>
                ) : (
                    <>
                        <StatsCards key={`stats-${refreshKey}`} />
                        <div className="mt-6">
                            <OrdersTable key={refreshKey} />
                        </div>
                    </>
                )}
            </DashboardLayout>
        </PageTransition>
    )
}

// ── Panel ─────────────────────────────────────────────────────────

const ACCENT_MAP = {
    blue: { icon: 'text-blue-500', bg: 'bg-blue-500/10' },
    purple: { icon: 'text-purple-500', bg: 'bg-purple-500/10' },
    orange: { icon: 'text-orange-500', bg: 'bg-orange-500/10' },
    emerald: { icon: 'text-emerald-500', bg: 'bg-emerald-500/10' },
} as const

interface CockpitPanelProps {
    title: string
    icon: React.ComponentType<{ className?: string }>
    accent: keyof typeof ACCENT_MAP
    count: number
    empty: string
    children?: React.ReactNode
    className?: string
}

function CockpitPanel({ title, icon: Icon, accent, count, empty, children, className }: CockpitPanelProps) {
    const { icon: iconColor, bg } = ACCENT_MAP[accent]
    const items = Array.isArray(children) ? children.flat().filter(Boolean) : children ? [children] : []
    const isEmpty = items.length === 0

    return (
        <div className={cn(
            "flex flex-col rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden",
            className
        )}>
            {/* Header — ultra-minimal */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-lg", bg)}>
                        <Icon className={cn("h-3.5 w-3.5", iconColor)} />
                    </div>
                    <span className="text-sm font-semibold tracking-tight">{title}</span>
                </div>
                {count > 0 && (
                    <span className="text-xs font-mono text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5">
                        {count}
                    </span>
                )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
                {isEmpty ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-10">
                        <CheckCircle2 className="h-6 w-6 text-muted-foreground/20" />
                        <p className="text-xs text-muted-foreground/50 text-center px-4 max-w-[160px] leading-relaxed">{empty}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/25">{children}</div>
                )}
            </div>
        </div>
    )
}

// ── Order Row ─────────────────────────────────────────────────────

interface OrderRowProps {
    order: Order
    onClick: () => void
    selfCheckWarning?: boolean
}

function OrderRow({ order, onClick, selfCheckWarning }: OrderRowProps) {
    const urgency = getUrgencyInfo(order.due_date)
    const UrgencyIcon = urgency.icon
    const isOverdue = urgency.isOverdue

    return (
        <button
            onClick={onClick}
            className="group w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        >
            <div className={cn(
                "p-1.5 rounded-lg shrink-0 transition-colors",
                isOverdue ? "bg-red-500/10" : urgency.isDueToday ? "bg-amber-500/10" : "bg-muted/40"
            )}>
                <UrgencyIcon className={cn("h-3.5 w-3.5", urgency.color)} />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {order.bike_model || 'Fahrrad'}
                    </span>
                    {selfCheckWarning && (
                        <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
                            Eigene Arbeit
                        </span>
                    )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                    <span className="font-mono">{order.order_number}</span> · {order.customer_name}
                </p>
            </div>

            <div className="shrink-0 flex items-center gap-1">
                {isOverdue && order.due_date ? (
                    <span className="text-[11px] font-semibold text-red-500">
                        +{differenceInDays(new Date(), new Date(order.due_date))}d
                    </span>
                ) : order.due_date ? (
                    <span className={cn("text-[11px] font-medium", urgency.color)}>
                        {urgency.shortLabel}
                    </span>
                ) : null}
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/25 group-hover:text-muted-foreground/60 transition-colors" />
            </div>
        </button>
    )
}

// ── Bike Build Row (Neurad QC) ────────────────────────────────────

interface BuildRowProps {
    build: BikeBuild
    onClick: () => void
}

function BuildRow({ build, onClick }: BuildRowProps) {
    return (
        <button
            onClick={onClick}
            className="group w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        >
            <div className="p-1.5 rounded-lg bg-amber-500/10 shrink-0">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
                <span className="text-sm font-medium block truncate group-hover:text-primary transition-colors">
                    {build.brand} {build.model}
                </span>
                <p className="text-[11px] text-muted-foreground">
                    <span className="font-mono">{build.internal_number}</span> · Neurad
                </p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/25 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
        </button>
    )
}

// ── Task Row ──────────────────────────────────────────────────────

interface TaskRowProps {
    task: ShopTask
    onToggle: () => void
    onClick: () => void
}

function TaskRow({ task, onToggle, onClick }: TaskRowProps) {
    const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))
    const isDueSoon = task.due_date && !isOverdue && differenceInDays(new Date(task.due_date), new Date()) <= 3

    return (
        <div
            className="group flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={onClick}
        >
            <div className="pt-0.5 shrink-0" onClick={e => { e.stopPropagation(); onToggle() }}>
                <Checkbox
                    checked={task.status === 'done'}
                    className="h-4 w-4"
                />
            </div>
            <div className="flex-1 min-w-0">
                <p className={cn(
                    "text-sm leading-snug",
                    task.status === 'done' ? "line-through text-muted-foreground" : "font-medium"
                )}>
                    {task.title}
                </p>
                {task.due_date && task.status !== 'done' && (
                    <p className={cn(
                        "text-[10px] mt-0.5",
                        isOverdue ? "text-red-500 font-semibold" : isDueSoon ? "text-amber-500" : "text-muted-foreground"
                    )}>
                        {format(new Date(task.due_date), "d. MMM", { locale: de })}
                        {isOverdue && " · Überfällig"}
                    </p>
                )}
            </div>
            <div className={cn(
                "mt-1.5 h-1.5 w-1.5 rounded-full shrink-0",
                task.priority === 'high' && "bg-red-500",
                task.priority === 'medium' && "bg-amber-400",
                task.priority === 'low' && "bg-slate-300",
            )} />
        </div>
    )
}
