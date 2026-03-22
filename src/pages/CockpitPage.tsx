import { DashboardLayout } from "@/layouts/DashboardLayout"
import { PageTransition } from "@/components/PageTransition"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import {
    ShieldCheck, ListTodo, CheckCircle2,
    ChevronRight, ChevronDown, Zap,
    Clock, Pause, Play, PackageCheck, Check, Archive, Filter,
    Plus, X, Circle
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

interface QuickNote {
    id: string
    text: string
    createdAt: number
}

const QUICK_NOTES_STORAGE_KEY = "velofix_quick_notes"

function useQuickNotes() {
    const [notes, setNotes] = useState<QuickNote[]>(() => {
        try {
            const stored = localStorage.getItem(QUICK_NOTES_STORAGE_KEY)
            return stored ? JSON.parse(stored) : []
        } catch {
            return []
        }
    })

    const save = useCallback((updated: QuickNote[]) => {
        setNotes(updated)
        localStorage.setItem(QUICK_NOTES_STORAGE_KEY, JSON.stringify(updated))
    }, [])

    const addNote = useCallback((text: string) => {
        const trimmed = text.trim()
        if (!trimmed) return
        save([{ id: crypto.randomUUID(), text: trimmed, createdAt: Date.now() }, ...notes])
    }, [notes, save])

    const removeNote = useCallback((id: string) => {
        save(notes.filter(n => n.id !== id))
    }, [notes, save])

    return { notes, addNote, removeNote }
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

    const [achievements, setAchievements] = useState({
        bikesFinished: 0,
        qcFinished: 0,
        tasksFinished: 0,
        buildsFinished: 0,
        bikesRepaired: 0
    })

    // Section collapse state
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
    const toggleSection = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

    // Show-more state for long lists
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})
    const toggleExpand = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
    const INITIAL_SHOW = 8

    useEffect(() => {
        if (!workshopId) return
        const fetchData = async () => {
            try {
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

                const startOfToday = new Date()
                startOfToday.setHours(0, 0, 0, 0)
                const startOfTodayISO = startOfToday.toISOString()

                const [finishedOrdersRes, finishedTasksRes, finishedBuildsRes] = await Promise.all([
                    supabase.from('orders').select('id, status, updated_at, qc_mechanic_id')
                        .eq('workshop_id', workshopId).gte('updated_at', startOfTodayISO)
                        .in('status', ['kontrolle_offen', 'fertig', 'abgeschlossen', 'abgeholt']),
                    supabase.from('shop_tasks').select('id, status, updated_at')
                        .eq('workshop_id', workshopId).eq('status', 'done').gte('updated_at', startOfTodayISO),
                    supabase.from('bike_builds').select('id, status, updated_at')
                        .eq('workshop_id', workshopId).eq('status', 'abgeschlossen').gte('updated_at', startOfTodayISO)
                ])

                const finishedOrders = finishedOrdersRes.data || []

                setAchievements({
                    bikesFinished: finishedOrders.filter(o => o.status === 'abgeschlossen' || o.status === 'abgeholt').length,
                    qcFinished: finishedOrders.filter(o =>
                        o.status === 'fertig' && activeEmployee?.id && o.qc_mechanic_id === activeEmployee.id
                    ).length,
                    bikesRepaired: finishedOrders.length,
                    tasksFinished: (finishedTasksRes.data || []).length,
                    buildsFinished: (finishedBuildsRes.data || []).length
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

        const openQCRepairs = orders.filter(o => o.status === 'kontrolle_offen' && !o.qc_mechanic_id)
        const openQCBuilds = bikeBuilds.filter(b => b.status === 'fertig' && !b.qc_mechanic_id)
        let openQCAssignments = [
            ...openQCRepairs.map(o => ({ type: 'order' as const, data: o })),
            ...openQCBuilds.map(b => ({ type: 'build' as const, data: b }))
        ]
        if (qcFilter === 'repairs') openQCAssignments = openQCAssignments.filter(item => item.type === 'order')
        else if (qcFilter === 'builds') openQCAssignments = openQCAssignments.filter(item => item.type === 'build')

        const unassignedOrders = orders.filter(o => (!o.mechanic_ids || o.mechanic_ids.length === 0) && (o.status !== 'kontrolle_offen' && o.status !== 'fertig'))
        const unassignedBuilds = bikeBuilds.filter(b => !b.assigned_employee_id && (b.status !== 'fertig' && b.status !== 'abgeschlossen'))
        let openWorkAssignments = [
            ...unassignedOrders.map(o => ({ type: 'order' as const, data: o })),
            ...unassignedBuilds.map(b => ({ type: 'build' as const, data: b }))
        ]
        if (orderFilter === 'repairs') openWorkAssignments = openWorkAssignments.filter(item => item.type === 'order')
        else if (orderFilter === 'builds') openWorkAssignments = openWorkAssignments.filter(item => item.type === 'build')

        const threeDaysFromNow = addDays(new Date(), 3)
        const myTasks = shopTasks.filter(t => {
            const isAssigned = myMatchIds.length > 0 && myMatchIds.includes(t.assigned_to || '')
            const isDueSoon = t.due_date && new Date(t.due_date) <= threeDaysFromNow
            return isAssigned || isDueSoon
        })

        return { myAssignments, openQCAssignments, openWorkAssignments, myTasks }
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
    const { notes, addNote, removeNote } = useQuickNotes()

    const todayTotal = achievements.bikesFinished + achievements.buildsFinished + achievements.qcFinished + achievements.tasksFinished
    const urgentCount = cockpitData.myAssignments.filter(item => {
        if (item.type === 'order' || item.type === 'qc_order') {
            const o = item.data as Order
            return o.due_date && isPast(new Date(o.due_date)) && !isToday(new Date(o.due_date))
        }
        return false
    }).length

    return (
        <PageTransition>
            <DashboardLayout fullWidth>
                <div className="flex flex-col h-full overflow-hidden">

                    {/* ── Header ─────────────────────────────────────── */}
                    <div className="flex-shrink-0 border-b border-border/40">
                        <div className="max-w-5xl mx-auto w-full px-6 py-4">
                            <div className="flex items-center justify-between gap-4">
                                {/* Left: Identity */}
                                <div className="flex items-center gap-3">
                                    {(isSharedMode || isAdmin) ? (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="flex items-center gap-3 group outline-none">
                                                    <div className="h-9 w-9 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                                        {displayName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="text-left hidden sm:block">
                                                        <p className="text-xs text-muted-foreground leading-none mb-0.5">{getGreeting()}</p>
                                                        <div className="flex items-center gap-1">
                                                            <p className="text-base font-bold text-foreground leading-none">{displayName}</p>
                                                            <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:translate-y-0.5 transition-transform" />
                                                        </div>
                                                    </div>
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-60 rounded-lg border border-border bg-popover p-1.5">
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
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                                {displayName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="hidden sm:block">
                                                <p className="text-xs text-muted-foreground leading-none mb-0.5">{getGreeting()}</p>
                                                <p className="text-base font-bold text-foreground leading-none">{displayName}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Today summary */}
                                <div className="flex items-center gap-4 text-sm">
                                    {urgentCount > 0 && (
                                        <div className="flex items-center gap-1.5 text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full text-xs font-medium">
                                            <div className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                                            {urgentCount} überfällig
                                        </div>
                                    )}
                                    {todayTotal > 0 && (
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                                            <span className="text-xs"><span className="font-semibold text-foreground">{todayTotal}</span> heute erledigt</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Content ────────────────────────────────────── */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="max-w-5xl mx-auto w-full px-6 py-6">
                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

                                {/* ── Left column: My work ── */}
                                <div className="space-y-1">

                                    {/* Section: Meine Zuweisungen */}
                                    <SectionHeader
                                        title="Meine Zuweisungen"
                                        count={cockpitData.myAssignments.length}
                                        color="text-blue-500"
                                        collapsed={collapsed['assignments']}
                                        onToggle={() => toggleSection('assignments')}
                                    />
                                    {!collapsed['assignments'] && (
                                        <div className="mb-6">
                                            {cockpitData.myAssignments.length === 0 ? (
                                                <EmptyState text={myMatchIds.length === 0 ? "Wähle deinen Namen oben aus" : "Keine Zuweisungen — alles erledigt!"} />
                                            ) : (
                                                <div className="border border-border/40 rounded-lg overflow-hidden divide-y divide-border/30">
                                                    {(expanded['assignments'] ? cockpitData.myAssignments : cockpitData.myAssignments.slice(0, INITIAL_SHOW)).map((item, idx) => {
                                                        if (item.type === 'order') return (
                                                            <OrderRow key={`my-${item.data.id}-${idx}`} order={item.data}
                                                                onClick={() => navigate(`/dashboard/orders/${(item.data as Order).order_number}`, cockpitReturnState)} />
                                                        )
                                                        if (item.type === 'build') return (
                                                            <BuildRow key={`my-${item.data.id}-${idx}`} build={item.data}
                                                                onClick={() => navigate(`/dashboard/bike-builds/${(item.data as BikeBuild).internal_number}`, cockpitReturnState)} />
                                                        )
                                                        if (item.type === 'qc_order') return (
                                                            <OrderRow key={`qc-${item.data.id}-${idx}`} order={item.data} isQC
                                                                onClick={() => navigate(`/dashboard/orders/${(item.data as Order).order_number}/control`, cockpitReturnState)} />
                                                        )
                                                        if (item.type === 'qc_build') return (
                                                            <BuildRow key={`qcb-${item.data.id}-${idx}`} build={item.data} isQC
                                                                onClick={() => navigate(`/dashboard/bike-builds/${(item.data as BikeBuild).internal_number}`, cockpitReturnState)} />
                                                        )
                                                        return null
                                                    })}
                                                    <ShowMoreButton total={cockpitData.myAssignments.length} limit={INITIAL_SHOW} expanded={expanded['assignments']} onToggle={() => toggleExpand('assignments')} />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Section: Offene Kontrollen */}
                                    <SectionHeader
                                        title="Offene Kontrollen"
                                        count={cockpitData.openQCAssignments.length}
                                        color="text-purple-500"
                                        collapsed={collapsed['qc']}
                                        onToggle={() => toggleSection('qc')}
                                        action={
                                            <FilterDropdown
                                                value={qcFilter}
                                                onChange={setQcFilter}
                                            />
                                        }
                                    />
                                    {!collapsed['qc'] && (
                                        <div className="mb-6">
                                            {cockpitData.openQCAssignments.length === 0 ? (
                                                <EmptyState text="Alles geprüft!" />
                                            ) : (
                                                <div className="border border-border/40 rounded-lg overflow-hidden divide-y divide-border/30">
                                                    {(expanded['qc'] ? cockpitData.openQCAssignments : cockpitData.openQCAssignments.slice(0, INITIAL_SHOW)).map((item, idx) => {
                                                        if (item.type === 'order') return (
                                                            <OrderRow key={`oqc-${item.data.id}-${idx}`} order={item.data}
                                                                onClick={() => navigate(`/dashboard/orders/${(item.data as Order).order_number}/control`, cockpitReturnState)} />
                                                        )
                                                        if (item.type === 'build') return (
                                                            <BuildRow key={`oqcb-${item.data.id}-${idx}`} build={item.data}
                                                                onClick={() => navigate(`/dashboard/bike-builds/${(item.data as BikeBuild).internal_number}`, cockpitReturnState)} />
                                                        )
                                                        return null
                                                    })}
                                                    <ShowMoreButton total={cockpitData.openQCAssignments.length} limit={INITIAL_SHOW} expanded={expanded['qc']} onToggle={() => toggleExpand('qc')} />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Section: Offene Aufträge */}
                                    <SectionHeader
                                        title="Offene Aufträge"
                                        count={cockpitData.openWorkAssignments.length}
                                        color="text-emerald-500"
                                        collapsed={collapsed['open']}
                                        onToggle={() => toggleSection('open')}
                                        action={
                                            <FilterDropdown
                                                value={orderFilter}
                                                onChange={setOrderFilter}
                                            />
                                        }
                                    />
                                    {!collapsed['open'] && (
                                        <div className="mb-6">
                                            {cockpitData.openWorkAssignments.length === 0 ? (
                                                <EmptyState text="Alles zugewiesen!" />
                                            ) : (
                                                <div className="border border-border/40 rounded-lg overflow-hidden divide-y divide-border/30">
                                                    {(expanded['open'] ? cockpitData.openWorkAssignments : cockpitData.openWorkAssignments.slice(0, INITIAL_SHOW)).map((item, idx) => {
                                                        if (item.type === 'order') return (
                                                            <OrderRow key={`ow-${item.data.id}-${idx}`} order={item.data}
                                                                onClick={() => navigate(`/dashboard/orders/${(item.data as Order).order_number}`, cockpitReturnState)} />
                                                        )
                                                        if (item.type === 'build') return (
                                                            <BuildRow key={`owb-${item.data.id}-${idx}`} build={item.data}
                                                                onClick={() => navigate(`/dashboard/bike-builds/${(item.data as BikeBuild).internal_number}`, cockpitReturnState)} />
                                                        )
                                                        return null
                                                    })}
                                                    <ShowMoreButton total={cockpitData.openWorkAssignments.length} limit={INITIAL_SHOW} expanded={expanded['open']} onToggle={() => toggleExpand('open')} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* ── Right column: Tasks + Notes ── */}
                                <div className="space-y-1">

                                    {/* Section: Meine Aufgaben */}
                                    <SectionHeader
                                        title="Meine Aufgaben"
                                        count={cockpitData.myTasks.length}
                                        color="text-orange-500"
                                        collapsed={collapsed['tasks']}
                                        onToggle={() => toggleSection('tasks')}
                                    />
                                    {!collapsed['tasks'] && (
                                        <div className="mb-6">
                                            {cockpitData.myTasks.length === 0 ? (
                                                <EmptyState text="Keine Aufgaben fällig" />
                                            ) : (
                                                <div className="border border-border/40 rounded-lg overflow-hidden divide-y divide-border/30">
                                                    {cockpitData.myTasks.map(task => (
                                                        <TaskRow key={task.id} task={task}
                                                            onToggle={() => toggleTaskComplete(task.id, task.status)}
                                                            onClick={() => navigate('/dashboard/tasks', cockpitReturnState)} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Section: Schnellnotizen */}
                                    <SectionHeader
                                        title="Schnellnotizen"
                                        count={notes.length}
                                        color="text-rose-500"
                                        collapsed={collapsed['notes']}
                                        onToggle={() => toggleSection('notes')}
                                    />
                                    {!collapsed['notes'] && (
                                        <div className="mb-6">
                                            <QuickNotesSection notes={notes} onAdd={addNote} onRemove={removeNote} />
                                        </div>
                                    )}

                                    {/* Today's Stats */}
                                    {todayTotal > 0 && (
                                        <>
                                            <SectionHeader
                                                title="Heute erledigt"
                                                count={todayTotal}
                                                color="text-emerald-500"
                                                collapsed={collapsed['stats']}
                                                onToggle={() => toggleSection('stats')}
                                            />
                                            {!collapsed['stats'] && (
                                                <div className="mb-6 border border-border/40 rounded-lg overflow-hidden">
                                                    <div className="grid grid-cols-2 divide-x divide-border/30">
                                                        <StatCell icon={ListTodo} label="Reparaturen" value={achievements.bikesFinished} color="text-blue-500" />
                                                        <StatCell icon={Zap} label="Neuräder" value={achievements.buildsFinished} color="text-amber-500" />
                                                    </div>
                                                    <div className="grid grid-cols-2 divide-x divide-border/30 border-t border-border/30">
                                                        <StatCell icon={ShieldCheck} label="Kontrollen" value={achievements.qcFinished} color="text-purple-500" />
                                                        <StatCell icon={CheckCircle2} label="Aufgaben" value={achievements.tasksFinished} color="text-orange-500" />
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}

// ── Section Header (Todoist-style) ────────────────────────────────────────

function SectionHeader({ title, count, color, collapsed, onToggle, action }: {
    title: string
    count: number
    color: string
    collapsed?: boolean
    onToggle: () => void
    action?: React.ReactNode
}) {
    return (
        <div className="flex items-center gap-2 py-2 group">
            <button
                onClick={onToggle}
                className="flex items-center gap-2 flex-1 min-w-0 outline-none"
            >
                <ChevronRight className={cn(
                    "h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200 shrink-0",
                    !collapsed && "rotate-90"
                )} />
                <span className={cn("text-sm font-bold", color)}>{title}</span>
                <span className="text-xs text-muted-foreground/50 tabular-nums">{count}</span>
            </button>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    )
}

// ── Empty State ───────────────────────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
    return (
        <div className="py-6 text-center">
            <p className="text-xs text-muted-foreground/40">{text}</p>
        </div>
    )
}

// ── Show More Button ──────────────────────────────────────────────────────

function ShowMoreButton({ total, limit, expanded, onToggle }: { total: number; limit: number; expanded?: boolean; onToggle: () => void }) {
    if (total <= limit) return null
    const remaining = total - limit
    return (
        <button
            onClick={onToggle}
            className="w-full py-2 text-xs text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/20 transition-colors text-center"
        >
            {expanded ? 'Weniger anzeigen' : `${remaining} weitere anzeigen...`}
        </button>
    )
}

// ── Stat Cell ─────────────────────────────────────────────────────────────

function StatCell({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
    return (
        <div className="px-4 py-3 flex items-center gap-3">
            <Icon className={cn("h-4 w-4 shrink-0", color)} />
            <div>
                <p className="text-lg font-bold text-foreground tabular-nums leading-none">{value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
            </div>
        </div>
    )
}

// ── Filter Dropdown ───────────────────────────────────────────────────────

function FilterDropdown({ value, onChange }: {
    value: 'all' | 'repairs' | 'builds'
    onChange: (v: 'all' | 'repairs' | 'builds') => void
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className={cn(
                    "p-1 rounded transition-all outline-none",
                    value !== 'all' ? "text-primary bg-primary/10" : "text-muted-foreground/30 hover:text-muted-foreground"
                )}>
                    <Filter className={cn("h-3.5 w-3.5", value !== 'all' && "fill-current")} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onChange('all')} className={cn(value === 'all' && "bg-primary/10 text-primary")}>
                    Alle anzeigen
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChange('repairs')} className={cn(value === 'repairs' && "bg-primary/10 text-primary")}>
                    Nur Reparaturen
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChange('builds')} className={cn(value === 'builds' && "bg-primary/10 text-primary")}>
                    Nur Neuräder
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

// ── Quick Notes Section ───────────────────────────────────────────────────

function QuickNotesSection({ notes, onAdd, onRemove }: {
    notes: QuickNote[]
    onAdd: (text: string) => void
    onRemove: (id: string) => void
}) {
    const [input, setInput] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)

    const handleAdd = () => {
        if (!input.trim()) return
        onAdd(input)
        setInput("")
    }

    return (
        <div className="border border-border/40 rounded-lg overflow-hidden">
            {notes.length > 0 && (
                <div className="divide-y divide-border/30">
                    {notes.map(note => (
                        <div key={note.id} className="group flex items-start gap-3 px-3.5 py-2.5 hover:bg-muted/30 transition-colors">
                            <span className="text-rose-400/40 mt-0.5 shrink-0 text-sm leading-none">—</span>
                            <p className="flex-1 text-sm text-foreground/80 leading-snug break-words min-w-0">{note.text}</p>
                            <button
                                onClick={() => onRemove(note.id)}
                                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/30 hover:text-red-400"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            {/* Input */}
            <div className={cn("flex items-center gap-2 px-3.5 py-2.5", notes.length > 0 && "border-t border-border/30")}>
                <Plus className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    placeholder="Notiz hinzufügen..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/30 outline-none min-w-0"
                />
                {input.trim() && (
                    <button
                        onClick={handleAdd}
                        className="shrink-0 text-xs text-rose-500 font-medium hover:text-rose-400 transition-colors"
                    >
                        Hinzufügen
                    </button>
                )}
            </div>
        </div>
    )
}

// ── Row Components ────────────────────────────────────────────────────────

const STATUS_ICON_MAP: Record<string, React.ElementType> = {
    'eingegangen': Clock,
    'in_bearbeitung': Play,
    'warten_auf_teile': Pause,
    'kontrolle_offen': ShieldCheck,
    'abholbereit': PackageCheck,
    'fertig': PackageCheck,
    'abgeschlossen': Archive,
    'abgeholt': Check,
}

function OrderRow({ order, onClick, isQC }: { order: Order; onClick: () => void; isQC?: boolean }) {
    const urgency = getUrgencyInfo(order.due_date)
    const StatusIcon = STATUS_ICON_MAP[order.status] || Circle

    const statusColor = cn(
        order.status === 'warten_auf_teile' ? "text-orange-400" :
        order.status === 'in_bearbeitung'   ? "text-violet-400" :
        order.status === 'eingegangen'      ? "text-blue-400" :
        order.status === 'kontrolle_offen'  ? "text-amber-400" :
        order.status === 'abholbereit'      ? "text-emerald-400" :
        "text-muted-foreground/40"
    )

    return (
        <button
            onClick={onClick}
            className="group w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/30 transition-colors text-left"
        >
            {/* Status icon */}
            <StatusIcon className={cn("h-4 w-4 shrink-0", statusColor)} />

            {/* Content */}
            <div className="flex-1 min-w-0 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground font-medium truncate">
                            {[order.bike_brand, order.bike_model].filter(Boolean).join(' ') || 'Fahrrad'}
                        </span>
                        {isQC && (
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded shrink-0">QC</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground/40 font-mono">{order.order_number}</span>
                        <span className="text-muted-foreground/20">·</span>
                        <span className="text-[10px] text-muted-foreground/40 truncate">{order.customer_name}</span>
                    </div>
                </div>
            </div>

            {/* Right: due date + arrow */}
            <div className="shrink-0 flex items-center gap-2">
                {order.due_date && (
                    <span className={cn(
                        "text-[10px] font-medium tabular-nums",
                        urgency.isOverdue ? "text-red-400" :
                        urgency.isDueToday ? "text-amber-400" :
                        "text-muted-foreground/30"
                    )}>
                        {urgency.shortLabel}
                    </span>
                )}
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/15 group-hover:text-foreground/40 transition-colors shrink-0" />
            </div>
        </button>
    )
}

function BuildRow({ build, onClick, isQC }: { build: BikeBuild; onClick: () => void; isQC?: boolean }) {
    return (
        <button onClick={onClick} className="group w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/30 transition-colors text-left">
            <Zap className="h-4 w-4 shrink-0 text-amber-400" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground font-medium truncate">{build.brand} {build.model}</span>
                    {isQC && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded shrink-0">QC</span>
                    )}
                </div>
                <span className="text-[10px] text-muted-foreground/40 font-mono mt-0.5 block">{build.internal_number}</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/15 group-hover:text-foreground/40 transition-colors shrink-0" />
        </button>
    )
}

function TaskRow({ task, onToggle, onClick }: { task: ShopTask; onToggle: () => void; onClick: () => void }) {
    const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))
    return (
        <div className="group flex items-start gap-3 px-3.5 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer" onClick={onClick}>
            <div className="pt-0.5 shrink-0" onClick={e => { e.stopPropagation(); onToggle() }}>
                <Checkbox checked={task.status === 'done'} className="h-4 w-4 rounded-sm" />
            </div>
            <div className="flex-1 min-w-0">
                <p className={cn("text-sm leading-snug", task.status === 'done' ? "line-through text-muted-foreground/30" : "text-foreground")}>
                    {task.title}
                </p>
                {task.due_date && task.status !== 'done' && (
                    <span className={cn("text-[10px] mt-0.5 inline-block", isOverdue ? "text-red-400" : "text-muted-foreground/30")}>
                        {format(new Date(task.due_date), "d. MMM", { locale: de })}
                    </span>
                )}
            </div>
            <div className={cn("mt-2 h-1.5 w-1.5 rounded-full shrink-0",
                task.priority === 'high'   ? "bg-red-500" :
                task.priority === 'medium' ? "bg-amber-400" :
                "bg-muted-foreground/15"
            )} />
        </div>
    )
}
