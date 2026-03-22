import { useEffect, useState, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { CreateShopTaskDialog } from "@/components/CreateShopTaskDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Search,
    CheckCircle2,
    MoreHorizontal,
    Trash2,
    Circle,
    PlayCircle,
    RefreshCw,
    Tag,
    Clock,
    Filter,
    ChevronDown,
} from "lucide-react"
import { format, isPast, isToday } from "date-fns"
import { de } from "date-fns/locale"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"
import { TaskDetailDialog } from "@/components/TaskDetailDialog"
import type { ShopTask } from "@/components/TaskDetailDialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// ── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_COLORS = {
    high: 'text-red-500 border-red-500',
    medium: 'text-orange-400 border-orange-400',
    low: 'text-blue-400 border-blue-400',
}

const RECURRENCE_LABELS: Record<string, string> = {
    daily: 'Täglich',
    weekly: 'Wöchentlich',
    biweekly: 'Alle 2 Wochen',
    monthly: 'Monatlich',
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function TasksPage() {
    const { workshopId } = useAuth()
    const [tasks, setTasks] = useState<ShopTask[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [showFilters, setShowFilters] = useState(false)
    const [priorityFilter, setPriorityFilter] = useState<string>("all")
    const [categoryFilter, setCategoryFilter] = useState<string>("all")
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ done: true })

    const [selectedTask, setSelectedTask] = useState<ShopTask | null>(null)
    const [isDetailOpen, setIsDetailOpen] = useState(false)

    const fetchTasks = async () => {
        if (!workshopId) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('shop_tasks')
                .select(`*, assigned_employee:employees!shop_tasks_assigned_to_fkey(name, color)`)
                .eq('workshop_id', workshopId)
                .neq('status', 'archived')
                .order('due_date', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: false })
            if (error) throw error
            setTasks(data || [])
        } catch {
            try {
                const { data, error } = await supabase
                    .from('shop_tasks')
                    .select('*')
                    .eq('workshop_id', workshopId)
                    .neq('status', 'archived')
                    .order('due_date', { ascending: true, nullsFirst: false })
                    .order('created_at', { ascending: false })
                if (error) throw error
                setTasks(data || [])
            } catch (err: unknown) {
                console.error('Fetch failed:', err)
                toast.error("Fehler beim Laden der Aufgaben")
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchTasks() }, [workshopId])

    // ── Filtering ────────────────────────────────────────────────────────────

    const filteredTasks = useMemo(() => tasks.filter(task => {
        const matchesSearch = !searchTerm ||
            task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.description?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
        const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter
        return matchesSearch && matchesPriority && matchesCategory
    }), [tasks, searchTerm, priorityFilter, categoryFilter])

    const categories = useMemo(() =>
        [...new Set(tasks.map(t => t.category).filter(Boolean))] as string[]
    , [tasks])

    // ── Grouped by status ────────────────────────────────────────────────────

    const sections = useMemo(() => [
        {
            key: 'in_progress',
            title: 'In Arbeit',
            icon: PlayCircle,
            color: 'text-blue-500',
            tasks: filteredTasks.filter(t => t.status === 'in_progress'),
        },
        {
            key: 'open',
            title: 'Offen',
            icon: Circle,
            color: 'text-muted-foreground',
            tasks: filteredTasks.filter(t => t.status === 'open'),
        },
        {
            key: 'done',
            title: 'Erledigt',
            icon: CheckCircle2,
            color: 'text-emerald-500',
            tasks: filteredTasks.filter(t => t.status === 'done'),
        },
    ], [filteredTasks])

    const totalOpen = tasks.filter(t => t.status !== 'done' && t.status !== 'archived').length

    // ── Actions ──────────────────────────────────────────────────────────────

    const getNextStatus = (s: string) =>
        s === 'open' ? 'in_progress' : s === 'in_progress' ? 'done' : 'open'

    const handleStatusChange = async (e: React.MouseEvent, taskId: string, newStatus: string) => {
        e.stopPropagation()
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as ShopTask['status'] } : t))
        const { error } = await supabase.from('shop_tasks').update({ status: newStatus }).eq('id', taskId)
        if (error) { toast.error("Fehler"); fetchTasks() }
    }

    const deleteTask = async (e: React.MouseEvent, taskId: string) => {
        e.stopPropagation()
        if (!confirm("Aufgabe löschen?")) return
        const { error } = await supabase.from('shop_tasks').delete().eq('id', taskId)
        if (error) { toast.error("Fehler beim Löschen") }
        else { setTasks(prev => prev.filter(t => t.id !== taskId)) }
    }

    const toggleSection = (key: string) =>
        setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

    const hasActiveFilters = priorityFilter !== 'all' || categoryFilter !== 'all'

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto pb-10">

                {/* ── Header ── */}
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Aufgaben</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {totalOpen} offen · {tasks.filter(t => t.status === 'done').length} erledigt
                        </p>
                    </div>
                    <CreateShopTaskDialog onTaskCreated={fetchTasks} />
                </div>

                {/* ── Search + Filter ── */}
                <div className="flex items-center gap-2 mb-1">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                        <Input
                            placeholder="Aufgabe suchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-9 bg-transparent border-border/40 text-sm"
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn("h-9 gap-1.5 text-xs", showFilters && "bg-muted")}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter className="h-3.5 w-3.5" />
                        Filter
                        {hasActiveFilters && (
                            <span className="ml-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">!</span>
                        )}
                    </Button>
                </div>

                {showFilters && (
                    <div className="flex flex-wrap items-center gap-2 py-3 mb-1">
                        {/* Priority filter */}
                        <div className="flex items-center gap-1">
                            {(['all', 'high', 'medium', 'low'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPriorityFilter(p)}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                                        priorityFilter === p
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                    )}
                                >
                                    {p === 'all' ? 'Alle' : p === 'high' ? '🔴 Hoch' : p === 'medium' ? '🟠 Mittel' : '🔵 Niedrig'}
                                </button>
                            ))}
                        </div>

                        {categories.length > 0 && (
                            <>
                                <div className="h-5 w-px bg-border/30" />
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCategoryFilter('all')}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                                            categoryFilter === 'all'
                                                ? "bg-primary/10 text-primary"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                        )}
                                    >
                                        Alle
                                    </button>
                                    {categories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setCategoryFilter(cat)}
                                            className={cn(
                                                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                                                categoryFilter === cat
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                            )}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── Task Sections ── */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="h-5 w-5 border-2 border-muted-foreground/20 border-t-muted-foreground rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="mt-4 space-y-2">
                        {sections.map(section => {
                            if (section.tasks.length === 0 && section.key === 'done') return null
                            const isCollapsed = collapsed[section.key]

                            return (
                                <div key={section.key}>
                                    {/* Section header */}
                                    <button
                                        onClick={() => toggleSection(section.key)}
                                        className="w-full flex items-center gap-2 py-2 px-1 group"
                                    >
                                        <ChevronDown className={cn(
                                            "h-3.5 w-3.5 text-muted-foreground/40 transition-transform",
                                            isCollapsed && "-rotate-90"
                                        )} />
                                        <section.icon className={cn("h-4 w-4", section.color)} />
                                        <span className={cn("text-sm font-semibold", section.color)}>
                                            {section.title}
                                        </span>
                                        <span className="text-xs text-muted-foreground/40 font-medium">
                                            {section.tasks.length}
                                        </span>
                                    </button>

                                    {/* Tasks */}
                                    {!isCollapsed && (
                                        <div className="divide-y divide-border/20">
                                            {section.tasks.length > 0 ? (
                                                section.tasks.map(task => (
                                                    <TaskRow
                                                        key={task.id}
                                                        task={task}
                                                        onClick={() => { setSelectedTask(task); setIsDetailOpen(true) }}
                                                        onStatusChange={handleStatusChange}
                                                        onDelete={deleteTask}
                                                        getNextStatus={getNextStatus}
                                                    />
                                                ))
                                            ) : (
                                                <p className="py-6 text-center text-sm text-muted-foreground/30">
                                                    Keine Aufgaben
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                <TaskDetailDialog
                    task={selectedTask}
                    open={isDetailOpen}
                    onOpenChange={setIsDetailOpen}
                    onUpdate={() => fetchTasks()}
                />
            </div>
        </DashboardLayout>
    )
}

// ── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, onClick, onStatusChange, onDelete, getNextStatus }: {
    task: ShopTask
    onClick: () => void
    onStatusChange: (e: React.MouseEvent, taskId: string, newStatus: string) => void
    onDelete: (e: React.MouseEvent, taskId: string) => void
    getNextStatus: (s: string) => string
}) {
    const isDone = task.status === 'done'
    const isInProgress = task.status === 'in_progress'
    const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && !isDone
    const isDueToday = task.due_date && isToday(new Date(task.due_date)) && !isDone
    const priorityColor = PRIORITY_COLORS[task.priority]

    return (
        <div
            onClick={onClick}
            className="group flex items-start gap-3 py-3 px-1 cursor-pointer hover:bg-muted/20 rounded-lg transition-colors -mx-1"
        >
            {/* Checkbox */}
            <button
                className={cn(
                    "mt-0.5 h-[18px] w-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                    isDone
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : isInProgress
                            ? "border-blue-400 bg-blue-400/10 hover:bg-blue-400/20"
                            : cn("hover:border-current", priorityColor),
                )}
                onClick={(e) => onStatusChange(e, task.id, getNextStatus(task.status))}
            >
                {isDone && <CheckCircle2 className="h-3 w-3" />}
                {isInProgress && <PlayCircle className="h-3 w-3 text-blue-500" />}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "text-sm font-medium truncate",
                        isDone && "line-through text-muted-foreground/50"
                    )}>
                        {task.title}
                    </span>
                </div>

                {task.description && (
                    <p className={cn(
                        "text-xs mt-0.5 line-clamp-1",
                        isDone ? "text-muted-foreground/30" : "text-muted-foreground/50"
                    )}>
                        {task.description}
                    </p>
                )}

                {/* Meta */}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {task.due_date && (
                        <span className={cn(
                            "text-[11px] font-medium flex items-center gap-1",
                            isOverdue ? "text-red-500" : isDueToday ? "text-orange-500" : "text-muted-foreground/40"
                        )}>
                            <Clock className="h-3 w-3" />
                            {format(new Date(task.due_date), "d. MMM", { locale: de })}
                            {isOverdue && " !"}
                        </span>
                    )}

                    {task.is_recurring && (
                        <span className="text-[11px] text-violet-400 flex items-center gap-1 font-medium">
                            <RefreshCw className="h-2.5 w-2.5" />
                            {task.recurrence_rule?.type ? RECURRENCE_LABELS[task.recurrence_rule.type] || '' : 'Wdh.'}
                        </span>
                    )}

                    {task.category && (
                        <span className="text-[11px] text-muted-foreground/35 flex items-center gap-1">
                            <Tag className="h-2.5 w-2.5" />
                            {task.category}
                        </span>
                    )}
                </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 shrink-0 mt-0.5">
                {task.assigned_employee && (
                    <Avatar className="h-5 w-5 border">
                        <AvatarFallback
                            className="text-[8px] font-medium"
                            style={{ backgroundColor: task.assigned_employee.color, color: 'white' }}
                        >
                            {task.assigned_employee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={(e) => onDelete(e, task.id)} className="text-red-500 text-xs">
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Löschen
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}
