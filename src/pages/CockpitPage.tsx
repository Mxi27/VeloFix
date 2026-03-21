import { DashboardLayout } from "@/layouts/DashboardLayout"
import { PageTransition } from "@/components/PageTransition"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { useState, useEffect, useMemo } from "react"
import {
    ShieldCheck, ListTodo, CheckCircle2,
    ChevronRight, ChevronDown, Zap, UserCheck, FastForward,
    Calendar, Clock, Pause, Play, PackageCheck, Check, Archive, Filter
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
    const [orderFilter, setOrderFilter] = useState<'all' | 'repairs' | 'builds'>('all')
    const [qcFilter, setQcFilter] = useState<'all' | 'repairs' | 'builds'>('all')
    
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
        // 1. YOUR ASSIGNMENTS (Repairs + Builds + QCs)
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
        const myQCRepairs = orders.filter(o => {
            const isAssignedController = activeEmployee?.id && o.qc_mechanic_id === activeEmployee.id
            return isAssignedController && o.status === 'kontrolle_offen'
        })
        const myQCBuilds = bikeBuilds.filter(b => {
             const isAssignedController = activeEmployee?.id && b.qc_mechanic_id === activeEmployee.id
             return isAssignedController && b.status === 'fertig'
        })

        const myAssignments = [
            ...myRepairs.map(o => ({ type: 'order' as const, data: o })),
            ...myBuildsInProgress.map(b => ({ type: 'build' as const, data: b })),
            ...myQCRepairs.map(o => ({ type: 'qc_order' as const, data: o })),
            ...myQCBuilds.map(b => ({ type: 'qc_build' as const, data: b }))
        ].sort((a, b) => {
            const dateA = a.type.includes('order') ? (a.data as Order).due_date : (a.data as BikeBuild).created_at
            const dateB = b.type.includes('order') ? (b.data as Order).due_date : (b.data as BikeBuild).created_at
            if (!dateA) return 1
            if (!dateB) return -1
            return new Date(dateA).getTime() - new Date(dateB).getTime()
        })

        // 2. OPEN QC (Unassigned team controls)
        const openQCRepairs = orders.filter(o => o.status === 'kontrolle_offen' && !o.qc_mechanic_id)
        const openQCBuilds = bikeBuilds.filter(b => b.status === 'fertig' && !b.qc_mechanic_id)
        
        let openQCAssignments = [
            ...openQCRepairs.map(o => ({ type: 'order' as const, data: o })),
            ...openQCBuilds.map(b => ({ type: 'build' as const, data: b }))
        ]

        if (qcFilter === 'repairs') {
            openQCAssignments = openQCAssignments.filter(item => item.type === 'order')
        } else if (qcFilter === 'builds') {
            openQCAssignments = openQCAssignments.filter(item => item.type === 'build')
        }

        // 3. OPEN WORK (Unassigned team repairs/builds)
        const unassignedOrders = orders.filter(o => (!o.mechanic_ids || o.mechanic_ids.length === 0) && (o.status !== 'kontrolle_offen' && o.status !== 'fertig'))
        const unassignedBuilds = bikeBuilds.filter(b => !b.assigned_employee_id && (b.status !== 'fertig' && b.status !== 'abgeschlossen'))

        let openWorkAssignments = [
            ...unassignedOrders.map(o => ({ type: 'order' as const, data: o })),
            ...unassignedBuilds.map(b => ({ type: 'build' as const, data: b }))
        ]

        if (orderFilter === 'repairs') {
            openWorkAssignments = openWorkAssignments.filter(item => item.type === 'order')
        } else if (orderFilter === 'builds') {
            openWorkAssignments = openWorkAssignments.filter(item => item.type === 'build')
        }

        // 4. TASKS (Personal + Urgent)
        const threeDaysFromNow = addDays(new Date(), 3)
        const myTasks = shopTasks.filter(t => {
            const isAssigned = myMatchIds.length > 0 && myMatchIds.includes(t.assigned_to || '')
            const isDueSoon = t.due_date && new Date(t.due_date) <= threeDaysFromNow
            return isAssigned || isDueSoon
        })

        return { 
            myAssignments,
            openQCAssignments,
            openWorkAssignments,
            myTasks
        }
    }, [orders, bikeBuilds, shopTasks, myMatchIds, activeEmployee, orderFilter, qcFilter])

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
                    {/* Header — compact, integrated */}
                    <div className="flex-shrink-0 px-5 py-2.5 border-b border-border/50 bg-card/50 backdrop-blur-sm compact:py-1.5">
                        <div className="flex items-center justify-between max-w-[1600px] mx-auto w-full gap-4">

                            {/* Left: Identity */}
                            {(isSharedMode || isAdmin) ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center gap-2.5 group outline-none shrink-0">
                                            <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-bold text-sm shrink-0 group-hover:bg-primary/22 transition-colors">
                                                {displayName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="text-left hidden sm:block">
                                                <p className="text-[10px] text-muted-foreground font-medium leading-none mb-0.5">{getGreeting()}</p>
                                                <div className="flex items-center gap-1">
                                                    <p className="text-sm font-bold text-foreground leading-none">{displayName}</p>
                                                    <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 group-hover:translate-y-0.5 transition-transform" />
                                                </div>
                                            </div>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="start"
                                        className="w-60 rounded-lg border border-border bg-popover p-1.5"
                                    >
                                        {nonSharedModeEmployees.map(emp => (
                                            <DropdownMenuItem
                                                key={emp.id}
                                                onClick={() => selectEmployee(emp.id)}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
                                                    activeEmployee?.id === emp.id && "bg-primary/10 text-primary"
                                                )}
                                            >
                                                <div className={cn(
                                                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                                    activeEmployee?.id === emp.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                                )}>
                                                    {emp.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="flex-1 font-medium text-sm">{emp.name}</span>
                                                {activeEmployee?.id === emp.id && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <div className="flex items-center gap-2.5 shrink-0">
                                    <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className="text-[10px] text-muted-foreground font-medium leading-none mb-0.5">{getGreeting()}</p>
                                        <p className="text-sm font-bold text-foreground leading-none">{displayName}</p>
                                    </div>
                                </div>
                            )}

                    {/* Right: Today's achievements — compact stat pills */}
                    <div className="flex items-center gap-0.5 bg-card rounded-lg border border-border px-1.5 py-1 overflow-x-auto no-scrollbar shrink-0">
                        <StatPill icon={ListTodo}    label="Reparaturen" value={achievements.bikesFinished}  color="blue"   />
                        <div className="h-4 w-[1px] bg-border/50 mx-1 shrink-0" />
                        <StatPill icon={Zap}         label="Neuräder"    value={achievements.buildsFinished} color="amber"  />
                        <div className="h-4 w-[1px] bg-border/50 mx-1 shrink-0" />
                        <StatPill icon={ShieldCheck} label="Kontrollen"  value={achievements.qcFinished}     color="purple" />
                        <div className="h-4 w-[1px] bg-border/50 mx-1 shrink-0" />
                        <StatPill icon={CheckCircle2} label="Aufgaben"   value={achievements.tasksFinished}  color="orange" />
                    </div>
                        </div>
                    </div>

                    {/* Panels */}
                    <div className="flex-1 overflow-y-auto xl:overflow-hidden custom-scrollbar p-6 md:p-8 xl:p-10 lg:p-8 compact:p-1 xl:compact:p-2">
                        <div className="max-w-[1600px] mx-auto grid gap-6 md:grid-cols-2 xl:grid-cols-4 compact:gap-2 min-h-full xl:h-full transition-all">
                            <CockpitPanel
                                title="Deine Zuweisungen"
                                icon={UserCheck}
                                accent="blue"
                                count={cockpitData.myAssignments.length}
                                empty={myMatchIds.length === 0 ? "Klicke deinen Namen an um dich auszuwählen" : "Keine Zuweisungen gefunden"}
                                className="xl:order-1"
                            >
                                <div className="space-y-0">
                                    {cockpitData.myAssignments.map((item, idx) => {
                                        if (item.type === 'order') return (
                                            <OrderRow 
                                                key={`my-${item.data.id}-${idx}`} 
                                                order={item.data} 
                                                onClick={() => navigate(`/dashboard/orders/${(item.data as Order).order_number}`, cockpitReturnState)} 
                                            />
                                        )
                                        if (item.type === 'build') return (
                                            <BuildRow 
                                                key={`my-${item.data.id}-${idx}`} 
                                                build={item.data} 
                                                onClick={() => navigate(`/dashboard/bike-builds/${(item.data as BikeBuild).internal_number}`, cockpitReturnState)} 
                                            />
                                        )
                                        if (item.type === 'qc_order') return (
                                            <OrderRow
                                                key={`qc-${item.data.id}-${idx}`}
                                                order={item.data}
                                                onClick={() => navigate(`/dashboard/orders/${(item.data as Order).order_number}/control`, cockpitReturnState)}
                                            />
                                        )
                                        if (item.type === 'qc_build') return (
                                            <BuildRow
                                                key={`qc-${item.data.id}-${idx}`}
                                                build={item.data}
                                                onClick={() => navigate(`/dashboard/bike-builds/${(item.data as BikeBuild).internal_number}`, cockpitReturnState)}
                                            />
                                        )
                                        return null
                                    })}
                                </div>
                            </CockpitPanel>

                            <CockpitPanel
                                title="Offene Kontrollen"
                                icon={ShieldCheck}
                                accent="purple"
                                count={cockpitData.openQCAssignments.length}
                                empty="Alles geprüft!"
                                className="xl:order-3"
                                action={
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className={cn(
                                                "p-1.5 rounded-md transition-all outline-none",
                                                qcFilter !== 'all' 
                                                    ? "bg-purple-500/20 text-purple-500 shadow-sm" 
                                                    : "text-purple-500/40 hover:text-purple-500 hover:bg-purple-500/10"
                                            )}>
                                                <Filter className={cn("h-3.5 w-3.5", qcFilter !== 'all' && "fill-current")} />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem onClick={() => setQcFilter('all')} className={cn(qcFilter === 'all' && "bg-primary/10 text-primary")}>
                                                Alle anzeigen
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setQcFilter('repairs')} className={cn(qcFilter === 'repairs' && "bg-primary/10 text-primary")}>
                                                Nur Reparaturen
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setQcFilter('builds')} className={cn(qcFilter === 'builds' && "bg-primary/10 text-primary")}>
                                                Nur Neuräder
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                }
                            >
                                <div className="space-y-0">
                                    {cockpitData.openQCAssignments.map((item, idx) => {
                                        if (item.type === 'order') return (
                                            <OrderRow
                                                key={`open-qc-${item.data.id}-${idx}`}
                                                order={item.data}
                                                onClick={() => navigate(`/dashboard/orders/${(item.data as Order).order_number}/control`, cockpitReturnState)}
                                            />
                                        )
                                        if (item.type === 'build') return (
                                            <BuildRow
                                                key={`open-qc-${item.data.id}-${idx}`}
                                                build={item.data}
                                                onClick={() => navigate(`/dashboard/bike-builds/${(item.data as BikeBuild).internal_number}`, cockpitReturnState)}
                                            />
                                        )
                                        return null
                                    })}
                                </div>
                            </CockpitPanel>

                            <CockpitPanel
                                title="Deine Aufgaben"
                                icon={ListTodo}
                                accent="orange"
                                count={cockpitData.myTasks.length}
                                empty="Keine Aufgaben fällig"
                                className="xl:order-2"
                            >
                                <div className="space-y-0">
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

                            <CockpitPanel
                                title="Offene Aufträge"
                                icon={FastForward}
                                accent="emerald"
                                count={cockpitData.openWorkAssignments.length}
                                empty="Alles erledigt!"
                                className="xl:order-4"
                                action={
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className={cn(
                                                "p-1.5 rounded-md transition-all outline-none",
                                                orderFilter !== 'all' 
                                                    ? "bg-emerald-500/20 text-emerald-500 shadow-sm" 
                                                    : "text-emerald-500/40 hover:text-emerald-500 hover:bg-emerald-500/10"
                                            )}>
                                                <Filter className={cn("h-3.5 w-3.5", orderFilter !== 'all' && "fill-current")} />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem onClick={() => setOrderFilter('all')} className={cn(orderFilter === 'all' && "bg-primary/10 text-primary")}>
                                                Alle anzeigen
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setOrderFilter('repairs')} className={cn(orderFilter === 'repairs' && "bg-primary/10 text-primary")}>
                                                Nur Reparaturen
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setOrderFilter('builds')} className={cn(orderFilter === 'builds' && "bg-primary/10 text-primary")}>
                                                Nur Neuräder
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                }
                            >
                                <div className="space-y-0">
                                    {cockpitData.openWorkAssignments.map((item, idx) => {
                                        if (item.type === 'order') return (
                                            <OrderRow 
                                                key={`open-work-${item.data.id}-${idx}`} 
                                                order={item.data} 
                                                onClick={() => navigate(`/dashboard/orders/${(item.data as Order).order_number}`, cockpitReturnState)} 
                                            />
                                        )
                                        if (item.type === 'build') return (
                                            <BuildRow 
                                                key={`open-work-${item.data.id}-${idx}`} 
                                                build={item.data} 
                                                onClick={() => navigate(`/dashboard/bike-builds/${(item.data as BikeBuild).internal_number}`, cockpitReturnState)} 
                                            />
                                        )
                                        return null
                                    })}
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

const STAT_COLOR_MAP = {
    blue:   { icon: 'text-blue-400',   bg: 'bg-blue-500/15',   border: 'border-blue-500/25'   },
    amber:  { icon: 'text-amber-400',  bg: 'bg-amber-500/15',  border: 'border-amber-500/25'  },
    purple: { icon: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/25' },
    orange: { icon: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/25' },
} as const

function StatPill({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: keyof typeof STAT_COLOR_MAP }) {
    const { icon: iconColor } = STAT_COLOR_MAP[color]
    return (
        <div className="flex items-center gap-2 whitespace-nowrap px-2 py-1">
            <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColor)} />
            <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold tabular-nums text-foreground">{value}</span>
                <span className="text-[11px] text-muted-foreground hidden lg:block">{label}</span>
            </div>
        </div>
    )
}

const ACCENT_MAP = {
    blue:    { icon: 'text-blue-400',    bg: 'bg-blue-500/15',    border: 'border-t-blue-400',    headerBg: 'from-blue-500/10',    ringColor: 'ring-blue-500/10'    },
    purple:  { icon: 'text-purple-400',  bg: 'bg-purple-500/15',  border: 'border-t-purple-400',  headerBg: 'from-purple-500/10',  ringColor: 'ring-purple-500/10'  },
    orange:  { icon: 'text-orange-400',  bg: 'bg-orange-500/15',  border: 'border-t-orange-400',  headerBg: 'from-orange-500/10',  ringColor: 'ring-orange-500/10'  },
    emerald: { icon: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-t-emerald-400', headerBg: 'from-emerald-500/10', ringColor: 'ring-emerald-500/10' },
} as const

function CockpitPanel({ title, icon: Icon, accent, count, empty, children, className, action }: any) {
    const { icon: iconColor, bg } = ACCENT_MAP[accent as keyof typeof ACCENT_MAP]
    const isEmpty = count === 0

    return (
        <div className={cn(
            "flex flex-col border border-border bg-card overflow-hidden min-w-0 h-full min-h-[300px] lg:min-h-[360px] max-h-[40vh] xl:max-h-none",
            "rounded-sm",
            className
        )}>
            {/* Panel header — flat, Notion database header style */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                    <div className={cn("p-1.5 rounded-sm shrink-0", bg)}>
                        <Icon className={cn("h-3.5 w-3.5", iconColor)} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground text-sm leading-tight">{title}</h3>
                        <p className="text-[10px] text-muted-foreground/60 tabular-nums">
                            {count > 0 ? `${count} Einträge` : 'Leer'}
                        </p>
                    </div>
                </div>
                {action}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                {isEmpty ? (
                    <div className="flex flex-col items-center justify-center gap-2 h-full py-10 lg:py-20">
                        <div className={cn("p-3 rounded-sm opacity-20", bg)}>
                            <Icon className={cn("h-6 w-6", iconColor)} />
                        </div>
                        <p className="text-sm text-center px-8 text-muted-foreground/40">{empty}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/40">
                        {children}
                    </div>
                )}
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
            className="group w-full flex items-center gap-3 px-4 py-2.5 compact:px-3 compact:py-1.5 hover:bg-muted/60 transition-colors text-left"
        >
            <div className={cn("shrink-0 transition-colors",
                order.status === 'warten_auf_teile' ? "text-rose-400" :
                order.status === 'in_bearbeitung'   ? "text-indigo-400" :
                order.status === 'eingegangen'      ? "text-blue-400" :
                order.status === 'kontrolle_offen'  ? "text-amber-400" :
                urgency.isOverdue ? "text-red-400" : "text-muted-foreground/40 group-hover:text-primary")}>
                <StatusIcon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col items-start">
                <div className="flex items-center gap-2 w-full">
                    <span className="font-medium text-sm truncate text-foreground">{order.bike_brand} {order.bike_model}</span>
                    {selfCheckWarning && <ShieldCheck className="h-3 w-3 text-amber-400 shrink-0" />}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground/60 font-mono tracking-wide">{order.order_number}</span>
                    {order.bike_color && <span className="text-[10px] text-muted-foreground/35 truncate">· {order.bike_color}</span>}
                </div>
            </div>
            <div className="shrink-0 flex items-center gap-1.5">
                {order.due_date ? (
                    <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-[3px] uppercase tracking-wider",
                        urgency.isOverdue ? "bg-red-500/10 text-red-400" : "text-muted-foreground/50")}>
                        {urgency.shortLabel}
                    </span>
                ) : (
                    <Calendar className="h-3 w-3 text-muted-foreground/25" />
                )}
                <ChevronRight className="h-3 w-3 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
        </button>
    )
}

function BuildRow({ build, onClick }: any) {
    return (
        <button onClick={onClick} className="group w-full flex items-center gap-3 px-4 py-2.5 compact:px-3 compact:py-1.5 hover:bg-muted/60 transition-colors text-left">
            <div className="shrink-0 text-amber-400 transition-all">
                <Zap className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col items-start">
                <span className="font-medium text-sm truncate text-foreground">{build.brand} {build.model}</span>
                <span className="text-[10px] text-muted-foreground/60 font-mono tracking-wide mt-0.5">{build.internal_number}</span>
            </div>
            <ChevronRight className="h-3 w-3 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>
    )
}

function TaskRow({ task, onToggle, onClick }: any) {
    const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))
    return (
        <div className="group flex items-start gap-3 px-4 py-2.5 compact:py-1.5 hover:bg-muted/60 transition-colors cursor-pointer border-0" onClick={onClick}>
            <div className="pt-0.5 shrink-0" onClick={e => { e.stopPropagation(); onToggle() }}>
                <Checkbox checked={task.status === 'done'} className="h-4 w-4 rounded-sm" />
            </div>
            <div className="flex-1 min-w-0">
                <p className={cn("text-sm leading-snug", task.status === 'done' ? "line-through text-muted-foreground/40" : "text-foreground")}>{task.title}</p>
                {task.due_date && task.status !== 'done' && (
                    <div className="flex items-center gap-1 mt-0.5">
                        <Calendar className={cn("h-3 w-3", isOverdue ? "text-red-400" : "text-muted-foreground/50")} />
                        <span className={cn("text-[10px]", isOverdue ? "text-red-400" : "text-muted-foreground/50")}>
                            {format(new Date(task.due_date), "d. MMM", { locale: de })}
                        </span>
                    </div>
                )}
            </div>
            <div className={cn("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0",
                task.priority === 'high'   ? "bg-red-500" :
                task.priority === 'medium' ? "bg-amber-400" :
                "bg-muted-foreground/20"
            )} />
        </div>
    )
}
