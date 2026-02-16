import { useEffect, useState, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { PageTransition } from "@/components/PageTransition"
import { CreateShopTaskDialog } from "@/components/CreateShopTaskDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Search,
    ArrowUpCircle,
    ArrowDownCircle,
    MinusCircle,
    CheckCircle2,
    MoreHorizontal,
    Trash2,
    Circle,
    PlayCircle,
    RefreshCw,
    Tag,
    ListTodo,
    Clock,
    Filter,
    LayoutGrid,
    List,
    GripVertical,
} from "lucide-react"
import { format, isPast, isToday } from "date-fns"
import { de } from "date-fns/locale"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { TaskDetailDialog } from "@/components/TaskDetailDialog"
import type { ShopTask } from "@/components/TaskDetailDialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { motion, AnimatePresence } from "framer-motion"
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    type DragStartEvent,
    type DragEndEvent,
} from "@dnd-kit/core"
import { useDroppable } from "@dnd-kit/core"
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

// ── Constants ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
    high: { icon: ArrowUpCircle, color: 'text-red-500', bg: 'bg-red-500', label: 'Hoch', strip: 'bg-red-500' },
    medium: { icon: MinusCircle, color: 'text-orange-500', bg: 'bg-orange-500', label: 'Mittel', strip: 'bg-orange-400' },
    low: { icon: ArrowDownCircle, color: 'text-blue-500', bg: 'bg-blue-500', label: 'Niedrig', strip: 'bg-blue-400' },
}

const RECURRENCE_LABELS: Record<string, string> = {
    daily: 'Täglich',
    weekly: 'Wöchentlich',
    biweekly: 'Alle 2 Wochen',
    monthly: 'Monatlich',
}

const STATUS_ORDER = ['open', 'in_progress', 'done'] as const

const COLUMN_CONFIG = [
    {
        key: 'open' as const,
        title: 'Offen',
        icon: Circle,
        iconColor: 'text-slate-400',
        headerBg: 'bg-slate-50/80 dark:bg-slate-900/30',
        badgeBg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
        emptyText: 'Keine offenen Aufgaben',
    },
    {
        key: 'in_progress' as const,
        title: 'In Arbeit',
        icon: PlayCircle,
        iconColor: 'text-blue-500',
        headerBg: 'bg-blue-50/80 dark:bg-blue-950/30',
        badgeBg: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
        emptyText: 'Keine Aufgaben in Arbeit',
    },
    {
        key: 'done' as const,
        title: 'Erledigt',
        icon: CheckCircle2,
        iconColor: 'text-emerald-500',
        headerBg: 'bg-emerald-50/80 dark:bg-emerald-950/30',
        badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
        emptyText: 'Noch nichts erledigt',
    },
]

// ── Main Component ──────────────────────────────────────────────────────

type ViewMode = 'kanban' | 'list'

export default function TasksPage() {
    const { workshopId } = useAuth()
    const [tasks, setTasks] = useState<ShopTask[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [priorityFilter, setPriorityFilter] = useState<string>("all")
    const [categoryFilter, setCategoryFilter] = useState<string>("all")
    const [viewMode, setViewMode] = useState<ViewMode>('kanban')

    // Detail View
    const [selectedTask, setSelectedTask] = useState<ShopTask | null>(null)
    const [isDetailOpen, setIsDetailOpen] = useState(false)

    // Drag State
    const [activeTask, setActiveTask] = useState<ShopTask | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor)
    )

    const fetchTasks = async () => {
        if (!workshopId) return
        setLoading(true)

        try {
            let query = supabase
                .from('shop_tasks')
                .select(`
                    *,
                    assigned_employee:employees!shop_tasks_assigned_to_fkey(name, color)
                `)
                .eq('workshop_id', workshopId)
                .neq('status', 'archived')
                .order('due_date', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: false })

            if (priorityFilter !== 'all') {
                query = query.eq('priority', priorityFilter)
            }

            const { data, error } = await query

            if (error) throw error
            setTasks(data || [])
        } catch (err: any) {
            console.error('Error fetching tasks (with join):', err)
            // Fallback without join
            try {
                let fallbackQuery = supabase
                    .from('shop_tasks')
                    .select('*')
                    .eq('workshop_id', workshopId)
                    .neq('status', 'archived')
                    .order('due_date', { ascending: true, nullsFirst: false })
                    .order('created_at', { ascending: false })

                if (priorityFilter !== 'all') {
                    fallbackQuery = fallbackQuery.eq('priority', priorityFilter)
                }

                const { data, error } = await fallbackQuery
                if (error) throw error
                setTasks(data || [])
            } catch (fallbackErr: any) {
                console.error('Fallback fetch failed:', fallbackErr)
                toast.error(`Fehler: ${fallbackErr.message}`)
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchTasks() }, [workshopId, priorityFilter])

    // Filters
    const filteredTasks = useMemo(() => tasks.filter(task => {
        const matchesSearch = !searchTerm ||
            task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.description?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter
        return matchesSearch && matchesCategory
    }), [tasks, searchTerm, categoryFilter])

    const categories = useMemo(() =>
        [...new Set(tasks.map(t => t.category).filter(Boolean))] as string[]
        , [tasks])

    // Stats
    const openCount = tasks.filter(t => t.status === 'open').length
    const inProgressCount = tasks.filter(t => t.status === 'in_progress').length
    const doneCount = tasks.filter(t => t.status === 'done').length
    const recurringCount = tasks.filter(t => t.is_recurring).length

    // ── Drag Handlers ───────────────────────────────────────────────────

    const handleDragStart = (event: DragStartEvent) => {
        const task = tasks.find(t => t.id === event.active.id)
        if (task) setActiveTask(task)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveTask(null)

        if (!over) return

        const taskId = active.id as string
        const targetColumn = over.id as string

        // Only process if dropped on a valid column
        if (!STATUS_ORDER.includes(targetColumn as any)) return

        const task = tasks.find(t => t.id === taskId)
        if (!task || task.status === targetColumn) return

        // Optimistic update
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, status: targetColumn as any } : t
        ))

        const { error } = await supabase
            .from('shop_tasks')
            .update({ status: targetColumn })
            .eq('id', taskId)

        if (error) {
            toast.error("Fehler beim Verschieben")
            fetchTasks()
        } else {
            toast.success(`Nach "${COLUMN_CONFIG.find(c => c.key === targetColumn)?.title}" verschoben`)
        }
    }

    // ── Quick Actions ───────────────────────────────────────────────────

    const handleQuickStatusChange = async (e: React.MouseEvent, taskId: string, newStatus: string) => {
        e.stopPropagation()
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t))

        const { error } = await supabase
            .from('shop_tasks')
            .update({ status: newStatus })
            .eq('id', taskId)

        if (error) {
            toast.error("Fehler beim Aktualisieren")
            fetchTasks()
        }
    }

    const deleteTask = async (e: React.MouseEvent, taskId: string) => {
        e.stopPropagation()
        if (!confirm("Bist du sicher?")) return

        const { error } = await supabase
            .from('shop_tasks')
            .delete()
            .eq('id', taskId)

        if (error) {
            toast.error("Fehler beim Löschen")
        } else {
            toast.success("Gelöscht")
            setTasks(prev => prev.filter(t => t.id !== taskId))
        }
    }

    const getNextStatus = (s: string) => {
        return s === 'open' ? 'in_progress' : s === 'in_progress' ? 'done' : 'open'
    }

    return (
        <PageTransition>
            <DashboardLayout>
                {/* ── Premium Header ── */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-orange-500/5 border border-primary/10 p-6 mb-6">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                    <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex p-3 rounded-xl bg-primary/10 border border-primary/20">
                                <ListTodo className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Werkstatt-Aufgaben</h1>
                                <p className="text-muted-foreground text-sm mt-0.5">
                                    Verwalte allgemeine und wiederkehrende Aufgaben.
                                </p>
                            </div>
                        </div>
                        <CreateShopTaskDialog onTaskCreated={fetchTasks} />
                    </div>

                    {/* Mini Stats */}
                    <div className="relative flex flex-wrap gap-3 mt-5">
                        {[
                            { icon: Circle, color: 'text-slate-400', count: openCount, label: 'Offen' },
                            { icon: PlayCircle, color: 'text-blue-500', count: inProgressCount, label: 'In Arbeit' },
                            { icon: CheckCircle2, color: 'text-emerald-500', count: doneCount, label: 'Erledigt' },
                        ].map(stat => (
                            <div key={stat.label} className="flex items-center gap-2 bg-background/60 backdrop-blur-sm border border-border/50 rounded-full px-3.5 py-1.5 text-sm">
                                <stat.icon className={`h-3 w-3 ${stat.color}`} />
                                <span className="text-muted-foreground font-medium">{stat.count}</span>
                                <span className="text-muted-foreground/60 text-xs">{stat.label}</span>
                            </div>
                        ))}
                        {recurringCount > 0 && (
                            <div className="flex items-center gap-2 bg-background/60 backdrop-blur-sm border border-border/50 rounded-full px-3.5 py-1.5 text-sm">
                                <RefreshCw className="h-3 w-3 text-violet-500" />
                                <span className="text-muted-foreground font-medium">{recurringCount}</span>
                                <span className="text-muted-foreground/60 text-xs">Wiederkehrend</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Search, Filter & View Toggle ── */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Aufgaben suchen..."
                            className="pl-10 bg-card border-border/50 rounded-xl h-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                            <SelectTrigger className="w-[150px] bg-card border-border/50 rounded-xl h-10">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                                    <SelectValue placeholder="Priorität" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle Prioritäten</SelectItem>
                                <SelectItem value="high">Hoch</SelectItem>
                                <SelectItem value="medium">Mittel</SelectItem>
                                <SelectItem value="low">Niedrig</SelectItem>
                            </SelectContent>
                        </Select>

                        {categories.length > 0 && (
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-[150px] bg-card border-border/50 rounded-xl h-10">
                                    <div className="flex items-center gap-2">
                                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                                        <SelectValue placeholder="Kategorie" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Alle Kategorien</SelectItem>
                                    {categories.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* View Toggle */}
                        <div className="flex bg-card border border-border/50 rounded-xl overflow-hidden">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-10 w-10 rounded-none transition-colors ${viewMode === 'kanban'
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                onClick={() => setViewMode('kanban')}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-10 w-10 rounded-none border-l border-border/50 transition-colors ${viewMode === 'list'
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                onClick={() => setViewMode('list')}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* ── Content ── */}
                {loading ? (
                    <div className={viewMode === 'kanban' ? "grid gap-6 md:grid-cols-3" : "space-y-2"}>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="space-y-3">
                                <div className="h-12 w-full bg-muted/20 animate-pulse rounded-xl" />
                                <div className="h-28 w-full bg-muted/20 animate-pulse rounded-xl" />
                                <div className="h-28 w-full bg-muted/20 animate-pulse rounded-xl" />
                            </div>
                        ))}
                    </div>
                ) : viewMode === 'kanban' ? (
                    <KanbanView
                        tasks={filteredTasks}
                        sensors={sensors}
                        activeTask={activeTask}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onTaskClick={(task) => { setSelectedTask(task); setIsDetailOpen(true) }}
                        onStatusChange={handleQuickStatusChange}
                        onDelete={deleteTask}
                        getNextStatus={getNextStatus}
                    />
                ) : (
                    <ListView
                        tasks={filteredTasks}
                        onTaskClick={(task) => { setSelectedTask(task); setIsDetailOpen(true) }}
                        onStatusChange={handleQuickStatusChange}
                        onDelete={deleteTask}
                        getNextStatus={getNextStatus}
                    />
                )}

                <TaskDetailDialog
                    task={selectedTask}
                    open={isDetailOpen}
                    onOpenChange={setIsDetailOpen}
                    onUpdate={() => fetchTasks()}
                />
            </DashboardLayout>
        </PageTransition>
    )
}

// ── Kanban View ─────────────────────────────────────────────────────────

interface KanbanViewProps {
    tasks: ShopTask[]
    sensors: ReturnType<typeof useSensors>
    activeTask: ShopTask | null
    onDragStart: (e: DragStartEvent) => void
    onDragEnd: (e: DragEndEvent) => void
    onTaskClick: (task: ShopTask) => void
    onStatusChange: (e: React.MouseEvent, taskId: string, newStatus: string) => void
    onDelete: (e: React.MouseEvent, taskId: string) => void
    getNextStatus: (s: string) => string
}

function KanbanView({ tasks, sensors, activeTask, onDragStart, onDragEnd, onTaskClick, onStatusChange, onDelete, getNextStatus }: KanbanViewProps) {
    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            <div className="grid gap-6 md:grid-cols-3">
                {COLUMN_CONFIG.map(column => {
                    const columnTasks = tasks.filter(t => t.status === column.key)

                    return (
                        <DroppableColumn
                            key={column.key}
                            column={column}
                            tasks={columnTasks}
                            onTaskClick={onTaskClick}
                            onStatusChange={onStatusChange}
                            onDelete={onDelete}
                            getNextStatus={getNextStatus}
                        />
                    )
                })}
            </div>

            <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                {activeTask && (
                    <div className="opacity-90 rotate-2 scale-105">
                        <TaskCard
                            task={activeTask}
                            index={0}
                            onClick={() => { }}
                            onStatusChange={() => { }}
                            onDelete={() => { }}
                            getNextStatus={getNextStatus}
                            isDragging
                        />
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    )
}

// ── Droppable Column ────────────────────────────────────────────────────

interface DroppableColumnProps {
    column: typeof COLUMN_CONFIG[number]
    tasks: ShopTask[]
    onTaskClick: (task: ShopTask) => void
    onStatusChange: (e: React.MouseEvent, taskId: string, newStatus: string) => void
    onDelete: (e: React.MouseEvent, taskId: string) => void
    getNextStatus: (s: string) => string
}

function DroppableColumn({ column, tasks, onTaskClick, onStatusChange, onDelete, getNextStatus }: DroppableColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id: column.key })
    const taskIds = useMemo(() => tasks.map(t => t.id), [tasks])

    return (
        <div className="flex flex-col">
            {/* Column Header */}
            <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${column.headerBg} mb-3`}>
                <div className="flex items-center gap-2.5">
                    <column.icon className={`h-4 w-4 ${column.iconColor}`} />
                    <span className="font-semibold text-sm tracking-tight">{column.title}</span>
                </div>
                <Badge variant="secondary" className={`text-xs px-2 py-0.5 font-medium ${column.badgeBg}`}>
                    {tasks.length}
                </Badge>
            </div>

            {/* Droppable Area */}
            <div
                ref={setNodeRef}
                className={`space-y-2.5 min-h-[200px] p-1 rounded-xl transition-all duration-200 ${isOver
                    ? 'bg-primary/5 ring-2 ring-primary/20 ring-dashed'
                    : ''
                    }`}
            >
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    <AnimatePresence mode="popLayout">
                        {tasks.length > 0 ? (
                            tasks.map((task, i) => (
                                <SortableTaskCard
                                    key={task.id}
                                    task={task}
                                    index={i}
                                    onClick={() => onTaskClick(task)}
                                    onStatusChange={onStatusChange}
                                    onDelete={onDelete}
                                    getNextStatus={getNextStatus}
                                />
                            ))
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border/40 rounded-xl"
                            >
                                <column.icon className="h-8 w-8 text-muted-foreground/20 mb-3" />
                                <p className="text-sm text-muted-foreground/60">{column.emptyText}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </SortableContext>
            </div>
        </div>
    )
}

// ── Sortable Task Card (Kanban) ─────────────────────────────────────────

interface SortableTaskCardProps {
    task: ShopTask
    index: number
    onClick: () => void
    onStatusChange: (e: React.MouseEvent, taskId: string, newStatus: string) => void
    onDelete: (e: React.MouseEvent, taskId: string) => void
    getNextStatus: (s: string) => string
}

function SortableTaskCard(props: SortableTaskCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: props.task.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <TaskCard {...props} dragListeners={listeners} isDragging={isDragging} />
        </div>
    )
}

// ── Task Card ───────────────────────────────────────────────────────────

interface TaskCardProps {
    task: ShopTask
    index: number
    onClick: () => void
    onStatusChange: (e: React.MouseEvent, taskId: string, newStatus: string) => void
    onDelete: (e: React.MouseEvent, taskId: string) => void
    getNextStatus: (s: string) => string
    isDragging?: boolean
    dragListeners?: any
}

function TaskCard({ task, index, onClick, onStatusChange, onDelete, getNextStatus, isDragging, dragListeners }: TaskCardProps) {
    const priorityConfig = PRIORITY_CONFIG[task.priority]
    const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'done'
    const isDueToday = task.due_date && isToday(new Date(task.due_date)) && task.status !== 'done'

    return (
        <motion.div
            layout={!isDragging}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.2, delay: index * 0.02 }}
        >
            <div
                onClick={onClick}
                className={`group relative bg-card border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${isDragging
                    ? 'border-primary/30 shadow-lg ring-2 ring-primary/10'
                    : 'border-border/50 hover:border-primary/20 hover:shadow-md'
                    }`}
            >
                {/* Priority Strip */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${priorityConfig.strip} opacity-60`} />

                <div className="p-4 pl-5">
                    {/* Title Row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            {/* Drag Handle */}
                            {dragListeners && (
                                <button
                                    {...dragListeners}
                                    className="mt-0.5 flex-shrink-0 h-5 w-5 rounded flex items-center justify-center text-muted-foreground/30 hover:text-muted-foreground/60 cursor-grab active:cursor-grabbing transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <GripVertical className="h-3.5 w-3.5" />
                                </button>
                            )}

                            {/* Quick Toggle */}
                            <button
                                className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${task.status === 'done'
                                    ? 'border-emerald-500 bg-emerald-500 text-white'
                                    : task.status === 'in_progress'
                                        ? 'border-blue-400 bg-blue-400/10 hover:bg-blue-400/20'
                                        : 'border-muted-foreground/25 hover:border-primary/50'
                                    }`}
                                onClick={(e) => onStatusChange(e, task.id, getNextStatus(task.status))}
                            >
                                {task.status === 'done' && <CheckCircle2 className="h-3 w-3" />}
                                {task.status === 'in_progress' && <PlayCircle className="h-3 w-3 text-blue-500" />}
                            </button>

                            <div className="min-w-0">
                                <h3 className={`font-semibold text-sm leading-tight ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                                    {task.title}
                                </h3>
                                {task.description && (
                                    <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-2 leading-relaxed">
                                        {task.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Actions Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuLabel className="text-xs">Aktionen</DropdownMenuLabel>
                                <DropdownMenuItem onClick={(e) => onDelete(e, task.id)} className="text-red-600 text-xs">
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                                    Löschen
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Meta Row */}
                    <div className="flex items-center gap-2 flex-wrap mt-3">
                        <div className={`flex items-center gap-1 text-[11px] font-medium ${priorityConfig.color}`}>
                            <priorityConfig.icon className="h-3 w-3" />
                            {priorityConfig.label}
                        </div>

                        {task.due_date && (
                            <div className={`flex items-center gap-1 text-[11px] font-medium ${isOverdue ? 'text-red-500' : isDueToday ? 'text-orange-500' : 'text-muted-foreground/60'
                                }`}>
                                <Clock className="h-3 w-3" />
                                {format(new Date(task.due_date), "dd. MMM", { locale: de })}
                                {isOverdue && <span className="text-[10px]">!</span>}
                            </div>
                        )}

                        {task.is_recurring && (
                            <Badge variant="outline" className="h-5 text-[10px] px-1.5 border-violet-200 text-violet-600 bg-violet-50 dark:border-violet-800 dark:text-violet-400 dark:bg-violet-950 font-medium gap-1">
                                <RefreshCw className="h-2.5 w-2.5" />
                                {task.recurrence_rule?.type ? RECURRENCE_LABELS[task.recurrence_rule.type] || '' : ''}
                            </Badge>
                        )}

                        {task.category && (
                            <Badge variant="outline" className="h-5 text-[10px] px-1.5 font-normal text-muted-foreground border-border/50 gap-1">
                                <Tag className="h-2.5 w-2.5" />
                                {task.category}
                            </Badge>
                        )}

                        {task.assigned_employee && (
                            <div className="ml-auto">
                                <Avatar className="h-5 w-5 border">
                                    <AvatarFallback className="text-[8px] font-medium" style={{ backgroundColor: task.assigned_employee.color, color: 'white' }}>
                                        {task.assigned_employee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

// ── List View ───────────────────────────────────────────────────────────

interface ListViewProps {
    tasks: ShopTask[]
    onTaskClick: (task: ShopTask) => void
    onStatusChange: (e: React.MouseEvent, taskId: string, newStatus: string) => void
    onDelete: (e: React.MouseEvent, taskId: string) => void
    getNextStatus: (s: string) => string
}

function ListView({ tasks, onTaskClick, onStatusChange, onDelete, getNextStatus }: ListViewProps) {
    // Group by status for list view too
    const grouped = useMemo(() => {
        return COLUMN_CONFIG.map(col => ({
            ...col,
            tasks: tasks.filter(t => t.status === col.key),
        }))
    }, [tasks])

    return (
        <div className="space-y-6">
            {grouped.map(group => (
                <div key={group.key}>
                    {/* Section Header */}
                    <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl ${group.headerBg} mb-2`}>
                        <group.icon className={`h-4 w-4 ${group.iconColor}`} />
                        <span className="font-semibold text-sm tracking-tight">{group.title}</span>
                        <Badge variant="secondary" className={`text-xs px-2 py-0.5 font-medium ${group.badgeBg}`}>
                            {group.tasks.length}
                        </Badge>
                    </div>

                    {group.tasks.length > 0 ? (
                        <div className="divide-y divide-border/30">
                            {group.tasks.map(task => (
                                <ListRow
                                    key={task.id}
                                    task={task}
                                    onClick={() => onTaskClick(task)}
                                    onStatusChange={onStatusChange}
                                    onDelete={onDelete}
                                    getNextStatus={getNextStatus}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="py-6 text-center text-sm text-muted-foreground/40">
                            {group.emptyText}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

// ── List Row ────────────────────────────────────────────────────────────

interface ListRowProps {
    task: ShopTask
    onClick: () => void
    onStatusChange: (e: React.MouseEvent, taskId: string, newStatus: string) => void
    onDelete: (e: React.MouseEvent, taskId: string) => void
    getNextStatus: (s: string) => string
}

function ListRow({ task, onClick, onStatusChange, onDelete, getNextStatus }: ListRowProps) {
    const priorityConfig = PRIORITY_CONFIG[task.priority]
    const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'done'
    const isDueToday = task.due_date && isToday(new Date(task.due_date)) && task.status !== 'done'

    return (
        <div
            onClick={onClick}
            className="group flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer rounded-lg"
        >
            {/* Status Toggle */}
            <button
                className={`flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${task.status === 'done'
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : task.status === 'in_progress'
                        ? 'border-blue-400 bg-blue-400/10 hover:bg-blue-400/20'
                        : 'border-muted-foreground/25 hover:border-primary/50'
                    }`}
                onClick={(e) => onStatusChange(e, task.id, getNextStatus(task.status))}
            >
                {task.status === 'done' && <CheckCircle2 className="h-3 w-3" />}
                {task.status === 'in_progress' && <PlayCircle className="h-3 w-3 text-blue-500" />}
            </button>

            {/* Title + Description */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h3 className={`font-medium text-sm truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                    </h3>
                    {task.is_recurring && (
                        <RefreshCw className="h-3 w-3 text-violet-500 flex-shrink-0" />
                    )}
                </div>
                {task.description && (
                    <p className="text-xs text-muted-foreground/50 truncate mt-0.5">{task.description}</p>
                )}
            </div>

            {/* Meta */}
            <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                {task.category && (
                    <Badge variant="outline" className="h-5 text-[10px] px-1.5 font-normal text-muted-foreground border-border/50 gap-1">
                        <Tag className="h-2.5 w-2.5" />
                        {task.category}
                    </Badge>
                )}

                <div className={`flex items-center gap-1 text-[11px] font-medium ${priorityConfig.color}`}>
                    <priorityConfig.icon className="h-3.5 w-3.5" />
                </div>

                {task.due_date && (
                    <span className={`text-xs font-medium whitespace-nowrap ${isOverdue ? 'text-red-500' : isDueToday ? 'text-orange-500' : 'text-muted-foreground/50'
                        }`}>
                        {format(new Date(task.due_date), "dd. MMM", { locale: de })}
                    </span>
                )}

                {task.assigned_employee && (
                    <Avatar className="h-5 w-5 border">
                        <AvatarFallback className="text-[8px] font-medium" style={{ backgroundColor: task.assigned_employee.color, color: 'white' }}>
                            {task.assigned_employee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                )}
            </div>

            {/* Delete Action */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={(e) => onDelete(e, task.id)} className="text-red-600 text-xs">
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Löschen
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
