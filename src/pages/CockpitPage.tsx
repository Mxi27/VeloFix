import { DashboardLayout } from "@/layouts/DashboardLayout"
import { PageTransition } from "@/components/PageTransition"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { useState, useEffect, useMemo } from "react"
import {
    ShieldCheck, ListTodo, CheckCircle2,
    ChevronRight, ChevronDown, Zap, UserCheck, FastForward,
    Calendar, Bike, Clock, Pause, Play, PackageCheck, Check, Archive
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"
import { isPast, isToday, format, addDays } from "date-fns"
import { de } from "date-fns/locale"
import { getUrgencyInfo } from "@/lib/urgency"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Order {
    id: string
    order_number: string
    customer_name: string
    bike_brand: string | null
    bike_model: string | null
    bike_color: string | null
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

export default function CockpitPage() {
    const { user, workshopId } = useAuth()
    const { activeEmployee, employees, selectEmployee, isAdmin, isSharedMode } = useEmployee()
    const navigate = useNavigate()

    const [orders, setOrders] = useState<Order[]>([])
    const [bikeBuilds, setBikeBuilds] = useState<BikeBuild[]>([])
    const [shopTasks, setShopTasks] = useState<ShopTask[]>([])
    
    // Achievement stats for today
    const [achievements, setAchievements] = useState({
        bikesFinished: 0,
        qcFinished: 0,
        tasksFinished: 0,
        buildsFinished: 0,
        bikesRepaired: 0
    })

    useEffect(() => {
        if (!workshopId) return
        const fetchData = async () => {
            try {
                // Fetch active cockpit items
                const [ordersRes, buildsRes, tasksRes] = await Promise.all([
                    supabase.from('orders').select('id,order_number,customer_name,bike_brand,bike_model,bike_color,status,due_date,created_at,mechanic_ids,qc_mechanic_id')
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

                // Fetch achievements today
                const startOfToday = new Date()
                startOfToday.setHours(0, 0, 0, 0)
                const startOfTodayISO = startOfToday.toISOString()

                const [finishedOrdersRes, finishedTasksRes, finishedBuildsRes] = await Promise.all([
                    supabase.from('orders')
                        .select('id, status, updated_at, qc_mechanic_id')
                        .eq('workshop_id', workshopId)
                        .gte('updated_at', startOfTodayISO)
                        .in('status', ['kontrolle_offen', 'fertig', 'abgeschlossen', 'abgeholt']),
                    supabase.from('shop_tasks')
                        .select('id, status, updated_at')
                        .eq('workshop_id', workshopId)
                        .eq('status', 'done')
                        .gte('updated_at', startOfTodayISO),
                    supabase.from('bike_builds')
                        .select('id, status, updated_at')
                        .eq('workshop_id', workshopId)
                        .eq('status', 'abgeschlossen')
                        .gte('updated_at', startOfTodayISO)
                ])

                const finishedOrders = finishedOrdersRes.data || []
                const finishedTasks = finishedTasksRes.data || []
                const finishedBuilds = finishedBuildsRes.data || []
                
                // Achievement logic:
                // - bikesFinished: All orders that reached 'abgeschlossen' or 'abgeholt' today
                // - qcFinished: Orders where the ACTIVE EMPLOYEE performed the control today
                // - tasksFinished: Tasks completed today
                // - buildsFinished: Builds completed today
                
                setAchievements({
                    bikesFinished: finishedOrders.filter(o => o.status === 'abgeschlossen' || o.status === 'abgeholt').length,
                    qcFinished: finishedOrders.filter(o => 
                        o.status === 'fertig' && 
                        activeEmployee?.id && 
                        o.qc_mechanic_id === activeEmployee.id
                    ).length,
                    bikesRepaired: finishedOrders.length, // Keeping this if needed, but UI will change
                    tasksFinished: finishedTasks.length,
                    buildsFinished: finishedBuilds.length
                })

            } catch (error) { console.error('Fetch error:', error) }
        }
        fetchData()
        const interval = setInterval(fetchData, 30000)
        return () => clearInterval(interval)
    }, [workshopId])

    const myMatchIds = useMemo(() => {
        const ids: string[] = []
        if (activeEmployee?.id) ids.push(activeEmployee.id)
        if (activeEmployee?.user_id) ids.push(activeEmployee.user_id)
        if (user?.id) ids.push(user.id)
        return [...new Set(ids)]
    }, [activeEmployee, user])

    const cockpitReturnState = { state: { from: '/dashboard/cockpit' } }

    const cockpitData = useMemo(() => {
        // 1. YOUR REPAIRS (Assigned to you as mechanic)
        const myRepairs = orders.filter(o => {
            const isAssignedMechanic = myMatchIds.length > 0 && o.mechanic_ids?.some(id => myMatchIds.includes(id))
            const inRepairPhase = o.status !== 'kontrolle_offen' && o.status !== 'fertig'
            return isAssignedMechanic && inRepairPhase
        })
        const myBuildsInProgress = bikeBuilds.filter(b => {
             const isAssignedBuilder = activeEmployee?.id && b.assigned_employee_id === activeEmployee.id
             const inBuildPhase = b.status !== 'fertig' && b.status !== 'abgeschlossen'
             return isAssignedBuilder && inBuildPhase
        })

        // 2. YOUR CONTROLS (Assigned to you as controller)
        const myQCRepairs = orders.filter(o => {
            const isAssignedController = activeEmployee?.id && o.qc_mechanic_id === activeEmployee.id
            return isAssignedController && o.status === 'kontrolle_offen'
        })
        const myQCBuilds = bikeBuilds.filter(b => {
             const isAssignedController = activeEmployee?.id && b.qc_mechanic_id === activeEmployee.id
             return isAssignedController && b.status === 'fertig'
        })

        // 3. TASKS (Personal + Urgent)
        const threeDaysFromNow = addDays(new Date(), 3)
        const myTasks = shopTasks.filter(t => {
            const isAssigned = myMatchIds.length > 0 && myMatchIds.includes(t.assigned_to || '')
            const isDueSoon = t.due_date && new Date(t.due_date) <= threeDaysFromNow
            return isAssigned || isDueSoon
        })

        // 4. OPEN ASSIGNMENTS (Team Backlog)
        const openOrders = orders.filter(o => {
            const isUnassignedRepair = (!o.mechanic_ids || o.mechanic_ids.length === 0) && (o.status !== 'kontrolle_offen' && o.status !== 'fertig')
            const isUnassignedQC = o.status === 'kontrolle_offen' && !o.qc_mechanic_id
            return isUnassignedRepair || isUnassignedQC
        })
        const openBuilds = bikeBuilds.filter(b => {
            const isUnassignedBuild = !b.assigned_employee_id && (b.status !== 'fertig' && b.status !== 'abgeschlossen')
            const isUnassignedQC = b.status === 'fertig' && !b.qc_mechanic_id
            return isUnassignedBuild || isUnassignedQC
        })

        return { 
            myRepairs, 
            myBuildsInProgress,
            myQCRepairs,
            myQCBuilds,
            myTasks, 
            openOrders,
            openBuilds
        }
    }, [orders, bikeBuilds, shopTasks, myMatchIds])

    const toggleTaskComplete = async (taskId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'done' ? 'open' : 'done'
        setShopTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
        await supabase.from('shop_tasks').update({ status: newStatus }).eq('id', taskId)
    }

    const getGreeting = () => {
        const h = new Date().getHours()
        if (h < 12) return "Guten Morgen"
        if (h < 17) return "Guten Tag"
        return "Guten Abend"
    }

    const displayName = activeEmployee?.name || user?.user_metadata?.full_name?.split(' ')[0] || 'Team'
    const nonSharedModeEmployees = employees.filter(e => !e.is_kiosk_mode)

    return (
        <PageTransition>
            <DashboardLayout fullWidth>
                <div className="flex flex-col h-full overflow-hidden">
                    {/* Header */}
                    <div className="flex-shrink-0 px-6 py-8 border-b bg-card/30 backdrop-blur-sm relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-7xl mx-auto">
                            <div className="flex items-center gap-5">
                                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/10">
                                    <Bike className="h-7 w-7" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                                            {getGreeting()},
                                        </h1>
                                        {(isSharedMode || isAdmin) ? (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="flex items-center gap-1 text-3xl font-bold text-primary hover:text-primary/80 transition-all outline-none group">
                                                        {displayName}
                                                        <ChevronDown className="h-6 w-6 ml-1 group-hover:translate-y-0.5 transition-transform" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    align="start"
                                                    className="w-64 rounded-xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl p-1.5"
                                                >
                                                    {nonSharedModeEmployees.map(emp => (
                                                        <DropdownMenuItem
                                                            key={emp.id}
                                                            onClick={() => selectEmployee(emp.id)}
                                                            className={cn(
                                                                "flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer",
                                                                activeEmployee?.id === emp.id && "bg-primary/10 text-primary"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                                                activeEmployee?.id === emp.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                                            )}>
                                                                {emp.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="flex-1 font-medium">{emp.name}</span>
                                                            {activeEmployee?.id === emp.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        ) : (
                                            <span className="text-3xl font-bold tracking-tight text-foreground">{displayName}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Today's Results / Achievements */}
                            <div className="flex flex-col items-end gap-2">
                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest px-1">Heutige Erfolge</span>
                                <div className="flex items-center gap-3 bg-background/40 p-1 rounded-2xl border border-border/50 backdrop-blur-sm shadow-sm">
                                    <div className="flex items-center gap-4 px-3 py-1.5 overflow-x-auto">
                                        <div className="flex items-center gap-2 group whitespace-nowrap" title="Fertige Reparaturen">
                                            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                                                <ListTodo className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-muted-foreground font-bold leading-none">Reparaturen</span>
                                                <span className="text-base font-bold tabular-nums">{achievements.bikesFinished}</span>
                                            </div>
                                        </div>
                                        <div className="h-6 w-[1px] bg-border/40" />
                                        <div className="flex items-center gap-2 group whitespace-nowrap" title="Fertige Neuräder">
                                            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                                                <Zap className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-muted-foreground font-bold leading-none">Neuräder</span>
                                                <span className="text-base font-bold tabular-nums">{achievements.buildsFinished}</span>
                                            </div>
                                        </div>
                                        <div className="h-6 w-[1px] bg-border/40" />
                                        <div className="flex items-center gap-2 group whitespace-nowrap" title="Bestandene Kontrollen">
                                            <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
                                                <ShieldCheck className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-muted-foreground font-bold leading-none">Kontrollen</span>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-base font-bold tabular-nums">{achievements.qcFinished}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="h-6 w-[1px] bg-border/40" />
                                        <div className="flex items-center gap-2 group whitespace-nowrap" title="Erledigte Aufgaben">
                                            <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
                                                <CheckCircle2 className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-muted-foreground font-bold leading-none">Aufgaben</span>
                                                <span className="text-base font-bold tabular-nums">{achievements.tasksFinished}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Panels */}
                    <div className="flex-1 overflow-auto p-6 md:p-8">
                        <div className="max-w-7xl mx-auto grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {/* Column 1: Deine Aufträge */}
                            <CockpitPanel
                                title="Deine Aufträge"
                                icon={UserCheck}
                                accent="blue"
                                count={cockpitData.myRepairs.length + cockpitData.myBuildsInProgress.length}
                                empty={myMatchIds.length === 0 ? "Klicke deinen Namen an um dich auszuwählen" : "Keine Aufträge zugewiesen"}
                            >
                                <div className="space-y-1 p-2">
                                    {cockpitData.myRepairs.map(order => (
                                        <OrderRow 
                                            key={order.id} 
                                            order={order} 
                                            onClick={() => navigate(`/dashboard/orders/${order.order_number}`, cockpitReturnState)} 
                                        />
                                    ))}
                                    {cockpitData.myBuildsInProgress.map(build => (
                                        <BuildRow 
                                            key={build.id} 
                                            build={build} 
                                            onClick={() => navigate(`/dashboard/bike-builds/${build.internal_number}`, cockpitReturnState)} 
                                        />
                                    ))}
                                </div>
                            </CockpitPanel>

                            {/* Column 2: QC + Tasks */}
                            <div className="flex flex-col gap-6">
                                <CockpitPanel
                                    title="Deine Kontrollen"
                                    icon={ShieldCheck}
                                    accent="purple"
                                    count={cockpitData.myQCRepairs.length + cockpitData.myQCBuilds.length}
                                    empty="Keine zugewiesenen Kontrollen"
                                    className="flex-1"
                                >
                                    <div className="space-y-1 p-2">
                                        {cockpitData.myQCRepairs.map(order => (
                                            <OrderRow
                                                key={order.id}
                                                order={order}
                                                onClick={() => navigate(`/dashboard/orders/${order.order_number}/control`, cockpitReturnState)}
                                            />
                                        ))}
                                        {cockpitData.myQCBuilds.map(build => (
                                            <BuildRow
                                                key={build.id}
                                                build={build}
                                                onClick={() => navigate(`/dashboard/bike-builds/${build.internal_number}`, cockpitReturnState)}
                                            />
                                        ))}
                                    </div>
                                </CockpitPanel>

                                <CockpitPanel
                                    title="Aufgaben"
                                    icon={ListTodo}
                                    accent="orange"
                                    count={cockpitData.myTasks.length}
                                    empty="Keine Aufgaben fällig"
                                    className="flex-1"
                                >
                                    <div className="space-y-1 p-2">
                                        {cockpitData.myTasks.map(task => (
                                            <TaskRow
                                                key={task.id}
                                                task={task}
                                                onToggle={() => toggleTaskComplete(task.id, task.status)}
                                                onClick={() => navigate('/dashboard/tasks', cockpitReturnState)}
                                            />
                                        ))}
                                    </div>
                                </CockpitPanel>
                            </div>

                            {/* Column 3: Offene Aufträge */}
                            <CockpitPanel
                                title="Offene Aufträge"
                                icon={FastForward}
                                accent="emerald"
                                count={cockpitData.openOrders.length + cockpitData.openBuilds.length}
                                empty="Alles erledigt!"
                            >
                                <div className="space-y-1 p-2">
                                    {cockpitData.openOrders.map(order => (
                                        <OrderRow 
                                            key={order.id} 
                                            order={order} 
                                            onClick={() => navigate(`/dashboard/orders/${order.order_number}`, cockpitReturnState)} 
                                        />
                                    ))}
                                    {cockpitData.openBuilds.map(build => (
                                        <BuildRow 
                                            key={build.id} 
                                            build={build} 
                                            onClick={() => navigate(`/dashboard/bike-builds/${build.internal_number}`, cockpitReturnState)} 
                                        />
                                    ))}
                                </div>
                            </CockpitPanel>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}

// ── Components ──────────────────────────────────────────────────────────

const STATUS_ICON_MAP: Record<string, any> = {
    'eingegangen': Clock,
    'in_bearbeitung': Play,
    'warten_auf_teile': Pause,
    'kontrolle_offen': ShieldCheck,
    'abholbereit': PackageCheck,
    'fertig': PackageCheck,
    'abgeschlossen': Archive,
    'abgeholt': Check,
}

const ACCENT_MAP = {
    blue: { icon: 'text-blue-500', bg: 'bg-blue-500/10', border: 'hover:border-blue-500/30' },
    purple: { icon: 'text-purple-500', bg: 'bg-purple-500/10', border: 'hover:border-purple-500/30' },
    orange: { icon: 'text-orange-500', bg: 'bg-orange-500/10', border: 'hover:border-orange-500/30' },
    emerald: { icon: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'hover:border-emerald-500/30' },
} as const

function CockpitPanel({ title, icon: Icon, accent, count, empty, children, className }: any) {
    const { icon: iconColor, bg } = ACCENT_MAP[accent as keyof typeof ACCENT_MAP]
    const isEmpty = count === 0 && (!children || (Array.isArray(children) && children.length === 0))

    return (
        <div className={cn("flex flex-col rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden min-w-0 transition-all hover:shadow-md", className)}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/30 bg-muted/20">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl", bg)}>
                        <Icon className={cn("h-4 w-4", iconColor)} />
                    </div>
                    <span className="font-bold tracking-tight">{title}</span>
                </div>
                {count > 0 && <span className="text-xs font-bold tabular-nums text-muted-foreground bg-background/80 border border-border/20 rounded-lg px-2 py-1 shadow-sm">{count}</span>}
            </div>
            <div className="flex-1 overflow-y-auto max-h-[600px]">
                {isEmpty ? (
                    <div className="flex flex-col items-center justify-center gap-3 h-full opacity-40 py-20">
                        <div className={cn("p-4 rounded-full", bg)}>
                            <Icon className={cn("h-8 w-8", iconColor)} />
                        </div>
                        <p className="text-sm font-medium text-center px-8">{empty}</p>
                    </div>
                ) : children}
            </div>
        </div>
    )
}

function OrderRow({ order, onClick, selfCheckWarning }: any) {
    const urgency = getUrgencyInfo(order.due_date)
    const StatusIcon = STATUS_ICON_MAP[order.status] || ListTodo

    return (
        <button
            onClick={onClick}
            className="group w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted/50 transition-all border border-transparent hover:border-border/50"
        >
            <div className={cn("shrink-0 transition-colors", 
                order.status === 'warten_auf_teile' ? "text-rose-500" :
                order.status === 'in_bearbeitung' ? "text-indigo-500" :
                order.status === 'eingegangen' ? "text-blue-500" :
                urgency.isOverdue ? "text-red-500" : "text-muted-foreground group-hover:text-primary")}>
                <StatusIcon className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col items-start">
                <div className="flex items-center gap-2 w-full">
                    <span className="font-bold text-[13px] tracking-tight truncate">{order.bike_brand} {order.bike_model}</span>
                    {selfCheckWarning && <ShieldCheck className="h-3 w-3 text-amber-500 shrink-0" />}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-bold tracking-wider opacity-60">REPARATUR · {order.order_number}</span>
                    {order.bike_color && <span className="text-[10px] text-muted-foreground/30 font-medium truncate italic">{order.bike_color}</span>}
                </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
                 {order.due_date ? (
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider", 
                        urgency.isOverdue ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground")}>
                        {urgency.shortLabel}
                    </span>
                 ) : (
                    <Calendar className="h-3 w-3 text-muted-foreground/20" />
                 )}
                 <ChevronRight className="h-4 w-4 text-muted-foreground/10 group-hover:text-primary transition-colors" />
            </div>
        </button>
    )
}

function BuildRow({ build, onClick }: any) {
    return (
        <button onClick={onClick} className="group w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted/50 transition-all border border-transparent hover:border-border/50">
            <div className="shrink-0 text-amber-500 group-hover:text-amber-600 transition-all">
                <Zap className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col items-start">
                <span className="font-bold text-[13px] tracking-tight truncate">{build.brand} {build.model}</span>
                <span className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase opacity-60">NEURAD · {build.internal_number}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/10 group-hover:text-primary transition-colors" />
        </button>
    )
}

function TaskRow({ task, onToggle, onClick }: any) {
    const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))
    return (
        <div className="group flex items-start gap-4 px-3 py-3 rounded-xl hover:bg-muted/50 transition-all cursor-pointer" onClick={onClick}>
            <div className="pt-0.5 shrink-0" onClick={e => { e.stopPropagation(); onToggle() }}>
                <Checkbox checked={task.status === 'done'} className="h-5 w-5 rounded-md" />
            </div>
            <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-semibold leading-relaxed", task.status === 'done' ? "line-through text-muted-foreground/50" : "text-foreground")}>{task.title}</p>
                {task.due_date && task.status !== 'done' && (
                    <div className="flex items-center gap-1.5 mt-1">
                        <Calendar className={cn("h-3 w-3", isOverdue ? "text-red-500" : "text-muted-foreground")} />
                        <span className={cn("text-[10px] font-bold", isOverdue ? "text-red-500" : "text-muted-foreground")}>
                            {format(new Date(task.due_date), "d. MMM", { locale: de })}
                        </span>
                    </div>
                )}
            </div>
            <div className={cn("mt-2 h-2 w-2 rounded-full", task.priority === 'high' ? "bg-red-500 shadow-sm shadow-red-500/50" : task.priority === 'medium' ? "bg-amber-400" : "bg-slate-300")} />
        </div>
    )
}
