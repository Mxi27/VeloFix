import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import {
    Star,
    MessageSquare,
    Wrench,
    Bike,
    Loader2,
    Users,
    Check,
    ChevronsUpDown,
    TrendingUp,
    TrendingDown,
    Search,
    ChevronDown,
    Filter,
} from "lucide-react"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { format, subDays } from "date-fns"
import { de } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "../components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// ── Types ────────────────────────────────────────────────────────────────────

interface FeedbackItem {
    id: string
    title: string
    subtitle: string
    date: string
    rating: number
    feedback?: string
    type: 'repair' | 'build'
    mechanic_ids?: string[]
    last_actor_name?: string
    inspector?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type TimeFilter = '7d' | '30d' | '90d' | 'all'
type SortOrder = 'date-desc' | 'date-asc' | 'rating-desc' | 'rating-asc'
type TypeFilter = 'all' | 'repair' | 'build'

const TIME_OPTIONS: { value: TimeFilter; label: string }[] = [
    { value: '7d', label: '7 Tage' },
    { value: '30d', label: '30 Tage' },
    { value: '90d', label: '90 Tage' },
    { value: 'all', label: 'Alle' },
]

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
    { value: 'date-desc', label: 'Neueste' },
    { value: 'date-asc', label: 'Älteste' },
    { value: 'rating-desc', label: 'Beste zuerst' },
    { value: 'rating-asc', label: 'Schlechteste zuerst' },
]

// ── Component ────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
    const { workshopId } = useAuth()
    const { activeEmployee, employees } = useEmployee()
    const navigate = useNavigate()

    const [viewEmployeeId, setViewEmployeeId] = useState<string | 'all'>(activeEmployee?.id || 'all')
    const [openCombobox, setOpenCombobox] = useState(false)
    const [loading, setLoading] = useState(false)
    const [repairFeedback, setRepairFeedback] = useState<FeedbackItem[]>([])
    const [buildFeedback, setBuildFeedback] = useState<FeedbackItem[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [timeFilter, setTimeFilter] = useState<TimeFilter>("30d")
    const [sortOrder, setSortOrder] = useState<SortOrder>("date-desc")
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
    const [showFilters, setShowFilters] = useState(false)

    useEffect(() => {
        if (activeEmployee) setViewEmployeeId(activeEmployee.id)
    }, [activeEmployee])

    const currentViewEmployee = employees.find(e => e.id === viewEmployeeId)

    // ── Data fetching ────────────────────────────────────────────────────────

    useEffect(() => {
        const fetchData = async () => {
            if (!workshopId) return
            setLoading(true)
            try {
                const { data: orders, error: ordersError } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('workshop_id', workshopId)
                    .not('end_control', 'is', null)
                    .order('created_at', { ascending: false })
                if (ordersError) throw ordersError

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const validRepairs: FeedbackItem[] = orders.filter((o: any) => {
                    const hasRating = o.end_control?.rating && o.end_control?.completed
                    if (!hasRating) return false
                    if (viewEmployeeId !== 'all') {
                        const credited = o.end_control?.mechanic_ids || o.mechanic_ids || []
                        return credited.includes(viewEmployeeId)
                    }
                    return true
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }).map((o: any) => ({
                    id: o.id,
                    title: o.order_number,
                    subtitle: o.bike_model,
                    date: o.end_control.last_updated || o.updated_at,
                    rating: o.end_control.rating,
                    feedback: o.end_control.feedback,
                    type: 'repair' as const,
                    mechanic_ids: o.end_control?.mechanic_ids || o.mechanic_ids || [],
                }))
                setRepairFeedback(validRepairs)

                const { data: builds, error: buildsError } = await supabase
                    .from('bike_builds')
                    .select('*')
                    .eq('workshop_id', workshopId)
                    .not('control_data', 'is', null)
                    .order('created_at', { ascending: false })
                if (buildsError) throw buildsError

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const validBuilds: FeedbackItem[] = builds.filter((b: any) => {
                    const hasRating = b.control_data?.rating && b.control_data?.completed
                    if (viewEmployeeId === 'all') return hasRating
                    const isBuilder = b.assembly_progress?.last_actor?.id === viewEmployeeId
                    return isBuilder && hasRating
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }).map((b: any) => ({
                    id: b.id,
                    title: `${b.brand} ${b.model}`,
                    subtitle: b.internal_number || 'Ohne Nummer',
                    date: b.control_data.last_updated || b.updated_at,
                    rating: b.control_data.rating,
                    feedback: b.control_data.feedback,
                    type: 'build' as const,
                    last_actor_name: b.assembly_progress?.last_actor?.name,
                }))
                setBuildFeedback(validBuilds)
            } catch (err: unknown) {
                const pgCode = typeof err === 'object' && err !== null && 'code' in err
                    ? (err as { code: string }).code : null
                if (pgCode === '42P01') {
                    console.warn("Feedback table not yet created.")
                } else {
                    console.error("Error fetching feedback:", err)
                }
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [workshopId, viewEmployeeId])

    // ── Filtering & sorting ──────────────────────────────────────────────────

    const allFeedback = useMemo(() => {
        return [...repairFeedback, ...buildFeedback]
            .filter(item => {
                if (typeFilter !== 'all' && item.type !== typeFilter) return false

                const matchesSearch = searchTerm === "" ||
                    item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.subtitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.feedback?.toLowerCase().includes(searchTerm.toLowerCase())

                if (timeFilter !== 'all') {
                    const date = new Date(item.date)
                    const now = new Date()
                    const diffDays = Math.ceil(Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
                    if (timeFilter === '7d' && diffDays > 7) return false
                    if (timeFilter === '30d' && diffDays > 30) return false
                    if (timeFilter === '90d' && diffDays > 90) return false
                }
                return matchesSearch
            })
            .sort((a, b) => {
                if (sortOrder === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime()
                if (sortOrder === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime()
                if (sortOrder === 'rating-desc') return b.rating - a.rating
                if (sortOrder === 'rating-asc') return a.rating - b.rating
                return 0
            })
    }, [repairFeedback, buildFeedback, searchTerm, timeFilter, sortOrder, typeFilter])

    // ── Metrics ──────────────────────────────────────────────────────────────

    const avgRating = useMemo(() =>
        allFeedback.length > 0
            ? allFeedback.reduce((acc, curr) => acc + curr.rating, 0) / allFeedback.length
            : 0
    , [allFeedback])

    const trend = useMemo(() => {
        const now = new Date()
        const thirtyDaysAgo = subDays(now, 30)
        const sixtyDaysAgo = subDays(now, 60)
        const allItems = [...repairFeedback, ...buildFeedback]
        const recent = allItems.filter(item => new Date(item.date) >= thirtyDaysAgo)
        const previous = allItems.filter(item => {
            const d = new Date(item.date)
            return d >= sixtyDaysAgo && d < thirtyDaysAgo
        })
        const recentAvg = recent.length > 0 ? recent.reduce((a, c) => a + c.rating, 0) / recent.length : 0
        const previousAvg = previous.length > 0 ? previous.reduce((a, c) => a + c.rating, 0) / previous.length : 0
        if (previous.length === 0) return { diff: 0, direction: 'neutral' as const }
        const diff = recentAvg - previousAvg
        return {
            diff: Math.abs(diff),
            direction: diff > 0.1 ? 'up' as const : diff < -0.1 ? 'down' as const : 'neutral' as const,
        }
    }, [repairFeedback, buildFeedback])

    const ratingDistribution = useMemo(() => {
        const dist = [0, 0, 0, 0, 0]
        allFeedback.forEach(f => { if (f.rating >= 1 && f.rating <= 5) dist[f.rating - 1]++ })
        return dist
    }, [allFeedback])

    const totalRepairs = allFeedback.filter(f => f.type === 'repair').length
    const totalBuilds = allFeedback.filter(f => f.type === 'build').length

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto pb-10">

                {/* ── Header ── */}
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Feedback</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Qualitätsbewertungen aus Endkontrollen
                        </p>
                    </div>

                    {/* Employee selector */}
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                className="h-9 gap-2 text-sm font-normal shrink-0"
                            >
                                {viewEmployeeId === 'all' ? (
                                    <>
                                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span>Alle</span>
                                    </>
                                ) : (
                                    <>
                                        <Avatar className="h-5 w-5 border">
                                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                                {currentViewEmployee?.initials || currentViewEmployee?.name.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="max-w-[100px] truncate">{currentViewEmployee?.name}</span>
                                    </>
                                )}
                                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0" align="end">
                            <Command>
                                <CommandInput placeholder="Suchen..." />
                                <CommandList>
                                    <CommandEmpty>Kein Mitarbeiter gefunden.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem
                                            value="all"
                                            onSelect={() => { setViewEmployeeId('all'); setOpenCombobox(false) }}
                                            className="cursor-pointer"
                                        >
                                            <Users className="mr-2 h-4 w-4 text-primary" />
                                            Alle Mitarbeiter
                                            {viewEmployeeId === 'all' && <Check className="ml-auto h-4 w-4 text-primary" />}
                                        </CommandItem>
                                    </CommandGroup>
                                    <CommandSeparator />
                                    <CommandGroup heading="Mitarbeiter">
                                        {employees.map((emp) => (
                                            <CommandItem
                                                key={emp.id}
                                                value={emp.name}
                                                onSelect={() => { setViewEmployeeId(emp.id); setOpenCombobox(false) }}
                                                className="cursor-pointer"
                                            >
                                                <Avatar className="mr-2 h-5 w-5 border">
                                                    <AvatarFallback
                                                        className="text-[10px]"
                                                        style={{ backgroundColor: `${emp.color}20`, color: emp.color }}
                                                    >
                                                        {emp.initials || emp.name.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {emp.name}
                                                {viewEmployeeId === emp.id && <Check className="ml-auto h-4 w-4 text-primary" />}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* ── Stats Row ── */}
                <div className="flex items-center gap-6 mb-6 pb-5 border-b border-border/40">
                    {/* Average */}
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} className={cn(
                                    "h-4 w-4",
                                    s <= Math.round(avgRating)
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-muted-foreground/20"
                                )} />
                            ))}
                        </div>
                        <span className="text-xl font-bold tabular-nums">{avgRating.toFixed(1)}</span>
                        {trend.direction !== 'neutral' && (
                            <span className={cn(
                                "text-xs font-medium flex items-center gap-0.5",
                                trend.direction === 'up' ? "text-green-500" : "text-red-500"
                            )}>
                                {trend.direction === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {trend.direction === 'up' ? '+' : '-'}{trend.diff.toFixed(1)}
                            </span>
                        )}
                    </div>

                    <div className="h-6 w-px bg-border/40" />

                    {/* Count */}
                    <span className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{allFeedback.length}</span> Bewertungen
                    </span>

                    <div className="h-6 w-px bg-border/40" />

                    {/* Distribution mini bar */}
                    <div className="flex items-center gap-1.5">
                        {ratingDistribution.map((count, i) => {
                            const max = Math.max(...ratingDistribution, 1)
                            const height = Math.max(4, (count / max) * 20)
                            return (
                                <div key={i} className="flex flex-col items-center gap-0.5" title={`${i + 1} Sterne: ${count}`}>
                                    <div
                                        className={cn(
                                            "w-2 rounded-full transition-all",
                                            i >= 3 ? "bg-green-500/60" : i === 2 ? "bg-amber-500/60" : "bg-red-500/60"
                                        )}
                                        style={{ height: `${height}px` }}
                                    />
                                    <span className="text-[9px] text-muted-foreground/50 tabular-nums">{i + 1}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* ── Search & Filter Bar ── */}
                <div className="flex items-center gap-2 mb-1">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                        <Input
                            placeholder="Suchen..."
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
                        {(timeFilter !== '30d' || sortOrder !== 'date-desc' || typeFilter !== 'all') && (
                            <span className="ml-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                                !
                            </span>
                        )}
                    </Button>
                </div>

                {/* ── Filter Expandable ── */}
                {showFilters && (
                    <div className="flex flex-wrap items-center gap-2 py-3 mb-1">
                        {/* Type tabs */}
                        <div className="flex items-center bg-muted/30 rounded-lg p-0.5 gap-0.5">
                            {([
                                { value: 'all' as TypeFilter, label: 'Alle', count: allFeedback.length },
                                { value: 'repair' as TypeFilter, label: 'Reparaturen', count: totalRepairs },
                                { value: 'build' as TypeFilter, label: 'Neurad', count: totalBuilds },
                            ]).map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setTypeFilter(opt.value)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                                        typeFilter === opt.value
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {opt.label}
                                    <span className="ml-1 text-muted-foreground/50">{opt.count}</span>
                                </button>
                            ))}
                        </div>

                        <div className="h-5 w-px bg-border/30" />

                        {/* Time filter */}
                        <div className="flex items-center gap-1">
                            {TIME_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setTimeFilter(opt.value)}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                                        timeFilter === opt.value
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        <div className="h-5 w-px bg-border/30" />

                        {/* Sort */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                                    {SORT_OPTIONS.find(s => s.value === sortOrder)?.label}
                                    <ChevronDown className="h-3 w-3" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[180px] p-1" align="start">
                                {SORT_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setSortOrder(opt.value)}
                                        className={cn(
                                            "w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-colors",
                                            sortOrder === opt.value
                                                ? "bg-primary/10 text-primary"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </PopoverContent>
                        </Popover>
                    </div>
                )}

                {/* ── Feedback List ── */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : allFeedback.length === 0 ? (
                    <div className="text-center py-20">
                        <MessageSquare className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">Kein Feedback gefunden</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Für diesen Zeitraum liegen keine Bewertungen vor.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/30">
                        {allFeedback.map((item) => (
                            <FeedbackRow
                                key={`${item.type}-${item.id}`}
                                item={item}
                                onClick={() => navigate(
                                    item.type === 'repair'
                                        ? `/dashboard/orders/${item.id}`
                                        : `/dashboard/bike-builds/${item.id}`
                                )}
                            />
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}

// ── Feedback Row ─────────────────────────────────────────────────────────────

function FeedbackRow({ item, onClick }: { item: FeedbackItem; onClick: () => void }) {
    const { employees } = useEmployee()

    const mechanicNames = item.mechanic_ids && item.mechanic_ids.length > 0
        ? item.mechanic_ids.map(id => employees.find(e => e.id === id)?.name).filter(Boolean)
        : item.last_actor_name ? [item.last_actor_name] : []

    return (
        <button
            onClick={onClick}
            className="w-full text-left py-3.5 px-1 flex items-start gap-3 group hover:bg-muted/20 rounded-lg transition-colors -mx-1"
        >
            {/* Rating circle */}
            <div className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-sm font-bold border-2",
                item.rating >= 4
                    ? "border-green-500/30 text-green-500 bg-green-500/5"
                    : item.rating === 3
                        ? "border-amber-500/30 text-amber-500 bg-amber-500/5"
                        : "border-red-500/30 text-red-500 bg-red-500/5"
            )}>
                {item.rating}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                        {item.title}
                    </span>
                    <span className="text-xs text-muted-foreground/40">·</span>
                    <span className="text-xs text-muted-foreground truncate">{item.subtitle}</span>
                </div>

                <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={cn(
                        "text-[10px] px-1.5 py-0 h-[18px] font-normal border-0",
                        item.type === 'repair'
                            ? "bg-blue-500/8 text-blue-400"
                            : "bg-purple-500/8 text-purple-400"
                    )}>
                        {item.type === 'repair' ? <Wrench className="w-2.5 h-2.5 mr-1" /> : <Bike className="w-2.5 h-2.5 mr-1" />}
                        {item.type === 'repair' ? 'Reparatur' : 'Neurad'}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground/50">
                        {item.date ? format(new Date(item.date), "d. MMM yy", { locale: de }) : '—'}
                    </span>
                    {mechanicNames.slice(0, 2).map((name, i) => (
                        <span key={i} className="text-[11px] text-muted-foreground/40">{name}</span>
                    ))}
                </div>

                {item.feedback && (
                    <p className="text-xs text-muted-foreground/50 mt-1.5 line-clamp-1 italic">
                        „{item.feedback}"
                    </p>
                )}
            </div>

            {/* Stars */}
            <div className="flex items-center gap-0.5 shrink-0 mt-1">
                {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={cn(
                        "h-3 w-3",
                        s <= item.rating
                            ? "fill-amber-400/70 text-amber-400/70"
                            : "text-muted-foreground/10"
                    )} />
                ))}
            </div>
        </button>
    )
}
