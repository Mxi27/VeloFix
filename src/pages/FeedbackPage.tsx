import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Star, MessageSquare, Wrench, Bike, Calendar, Loader2, Users, Check, ChevronsUpDown, TrendingUp, TrendingDown, Search } from "lucide-react"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { format, subDays } from "date-fns"
import { de } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

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

// Animated Rating Ring Component
function RatingRing({ rating, size = 140 }: { rating: number; size?: number }) {
    const percentage = (rating / 5) * 100
    const strokeWidth = 8
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percentage / 100) * circumference

    const getColor = () => {
        if (rating >= 4.5) return "rgb(34, 197, 94)" // green
        if (rating >= 4) return "rgb(132, 204, 22)" // lime
        if (rating >= 3) return "rgb(234, 179, 8)" // yellow
        return "rgb(239, 68, 68)" // red
    }

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-muted/20"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={getColor()}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold tracking-tight">{rating.toFixed(1)}</span>
                <div className="flex items-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            className={cn(
                                "h-3 w-3",
                                star <= Math.round(rating)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground/30"
                            )}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

export default function FeedbackPage() {
    const { workshopId } = useAuth()
    const { activeEmployee, employees } = useEmployee()
    const navigate = useNavigate()

    const [viewEmployeeId, setViewEmployeeId] = useState<string | 'all'>(activeEmployee?.id || 'all')
    const [openCombobox, setOpenCombobox] = useState(false)

    const [loading, setLoading] = useState(false)
    const [repairFeedback, setRepairFeedback] = useState<any[]>([])
    const [buildFeedback, setBuildFeedback] = useState<any[]>([])

    useEffect(() => {
        if (activeEmployee) {
            setViewEmployeeId(activeEmployee.id)
        }
    }, [activeEmployee])

    const currentViewEmployee = employees.find(e => e.id === viewEmployeeId)

    const [searchTerm, setSearchTerm] = useState("")
    const [timeFilter, setTimeFilter] = useState("30d")
    const [sortOrder, setSortOrder] = useState("date-desc")

    useEffect(() => {
        const fetchData = async () => {
            if (!workshopId) return

            setLoading(true)
            try {
                let ordersQuery = supabase
                    .from('orders')
                    .select('*')
                    .eq('workshop_id', workshopId)
                    .not('end_control', 'is', null)
                    .order('created_at', { ascending: false })

                // Filter is applied client-side to check both order.mechanic_ids AND end_control.mechanic_ids
                // if (viewEmployeeId !== 'all') {
                //    ordersQuery = ordersQuery.contains('mechanic_ids', [viewEmployeeId])
                // }

                const { data: orders, error: ordersError } = await ordersQuery
                if (ordersError) throw ordersError

                const validRepairs = orders.filter((o: any) => {
                    const hasRating = o.end_control?.rating && o.end_control?.completed
                    if (!hasRating) return false

                    if (viewEmployeeId !== 'all') {
                        const credited = o.end_control?.mechanic_ids || o.mechanic_ids || []
                        return credited.includes(viewEmployeeId)
                    }
                    return true
                }).map((o: any) => ({
                    id: o.id,
                    title: o.order_number,
                    subtitle: o.bike_model,
                    date: o.end_control.last_updated || o.updated_at,
                    rating: o.end_control.rating,
                    feedback: o.end_control.feedback,
                    type: 'repair',
                    mechanic_ids: o.end_control?.mechanic_ids || o.mechanic_ids || []
                }))
                setRepairFeedback(validRepairs)

                const { data: builds, error: buildsError } = await supabase
                    .from('bike_builds')
                    .select('*')
                    .eq('workshop_id', workshopId)
                    .not('control_data', 'is', null)
                    .order('created_at', { ascending: false })

                if (buildsError) throw buildsError

                const validBuilds = builds.filter((b: any) => {
                    const hasRating = b.control_data?.rating && b.control_data?.completed
                    if (viewEmployeeId === 'all') return hasRating
                    const isBuilder = b.assembly_progress?.last_actor?.id === viewEmployeeId
                    return isBuilder && hasRating
                }).map((b: any) => ({
                    id: b.id,
                    title: `${b.brand} ${b.model}`,
                    subtitle: b.internal_number || 'Ohne Nummer',
                    date: b.control_data.last_updated || b.updated_at,
                    rating: b.control_data.rating,
                    feedback: b.control_data.feedback,
                    inspector: b.control_data.inspector?.name,
                    type: 'build',
                    last_actor_name: b.assembly_progress?.last_actor?.name
                }))
                setBuildFeedback(validBuilds)

            } catch (error) {
                console.error("Error fetching feedback:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [workshopId, viewEmployeeId])

    const allFeedback = useMemo(() => {
        return [...repairFeedback, ...buildFeedback]
            .filter(item => {
                const matchesSearch = searchTerm === "" ||
                    item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.subtitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.feedback?.toLowerCase().includes(searchTerm.toLowerCase())

                if (timeFilter !== 'all') {
                    const date = new Date(item.date)
                    const now = new Date()
                    const diffTime = Math.abs(now.getTime() - date.getTime())
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

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
    }, [repairFeedback, buildFeedback, searchTerm, timeFilter, sortOrder])

    // Calculate metrics
    const avgRating = allFeedback.length > 0
        ? allFeedback.reduce((acc, curr) => acc + curr.rating, 0) / allFeedback.length
        : 0

    // Calculate trend (compare last 30 days to previous 30 days)
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
            direction: diff > 0.1 ? 'up' as const : diff < -0.1 ? 'down' as const : 'neutral' as const
        }
    }, [repairFeedback, buildFeedback])

    const filteredRepairs = allFeedback.filter(f => f.type === 'repair')
    const filteredBuilds = allFeedback.filter(f => f.type === 'build')

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto space-y-6 pb-10">

                {/* Hero Section */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-purple-500/5 border p-6 sm:p-8">
                    <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />

                    <div className="relative flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
                        {/* Rating Ring */}
                        <div className="shrink-0">
                            <RatingRing rating={avgRating} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center sm:text-left">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">Feedback Center</h1>
                            <p className="text-muted-foreground mb-4">
                                {allFeedback.length} Bewertungen insgesamt
                            </p>

                            {/* Trend Indicator */}
                            {trend.direction !== 'neutral' && (
                                <div className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                                    trend.direction === 'up'
                                        ? "bg-green-500/10 text-green-600"
                                        : "bg-red-500/10 text-red-600"
                                )}>
                                    {trend.direction === 'up' ? (
                                        <TrendingUp className="h-4 w-4" />
                                    ) : (
                                        <TrendingDown className="h-4 w-4" />
                                    )}
                                    <span>
                                        {trend.direction === 'up' ? '+' : '-'}{trend.diff.toFixed(1)} vs. Vormonat
                                    </span>
                                </div>
                            )}

                            {/* Quick Stats */}
                            <div className="flex justify-center sm:justify-start gap-6 mt-4">
                                <div>
                                    <div className="text-2xl font-bold">{repairFeedback.length}</div>
                                    <div className="text-xs text-muted-foreground">Reparaturen</div>
                                </div>
                                <div className="w-px bg-border" />
                                <div>
                                    <div className="text-2xl font-bold">{buildFeedback.length}</div>
                                    <div className="text-xs text-muted-foreground">Neuräder</div>
                                </div>
                            </div>
                        </div>

                        {/* Employee Selector */}
                        <div className="shrink-0">
                            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openCombobox}
                                        className="w-[200px] justify-between h-10 shadow-sm"
                                    >
                                        {viewEmployeeId === 'all' ? (
                                            <span className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-primary" />
                                                <span>Alle</span>
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5 border">
                                                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                                        {currentViewEmployee?.initials || currentViewEmployee?.name.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="truncate">{currentViewEmployee?.name}</span>
                                            </span>
                                        )}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                                                    onSelect={() => {
                                                        setViewEmployeeId('all')
                                                        setOpenCombobox(false)
                                                    }}
                                                    className="cursor-pointer"
                                                >
                                                    <Users className="mr-2 h-4 w-4 text-primary" />
                                                    <span>Alle Mitarbeiter</span>
                                                    {viewEmployeeId === 'all' && <Check className="ml-auto h-4 w-4 text-primary" />}
                                                </CommandItem>
                                            </CommandGroup>
                                            <CommandSeparator />
                                            <CommandGroup heading="Mitarbeiter">
                                                {employees.map((employee) => (
                                                    <CommandItem
                                                        key={employee.id}
                                                        value={employee.name}
                                                        onSelect={() => {
                                                            setViewEmployeeId(employee.id)
                                                            setOpenCombobox(false)
                                                        }}
                                                        className="cursor-pointer"
                                                    >
                                                        <Avatar className="mr-2 h-5 w-5 border">
                                                            <AvatarFallback
                                                                className="text-[10px]"
                                                                style={{ backgroundColor: `${employee.color}20`, color: employee.color }}
                                                            >
                                                                {employee.initials || employee.name.substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span>{employee.name}</span>
                                                        {viewEmployeeId === employee.id && <Check className="ml-auto h-4 w-4 text-primary" />}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </div>

                {/* Compact Filter Bar */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Suchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-background h-9"
                        />
                    </div>
                    <Select value={timeFilter} onValueChange={setTimeFilter}>
                        <SelectTrigger className="w-[140px] h-9 bg-background">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Alle Zeit</SelectItem>
                            <SelectItem value="7d">7 Tage</SelectItem>
                            <SelectItem value="30d">30 Tage</SelectItem>
                            <SelectItem value="90d">90 Tage</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                        <SelectTrigger className="w-[140px] h-9 bg-background">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date-desc">Neueste</SelectItem>
                            <SelectItem value="date-asc">Älteste</SelectItem>
                            <SelectItem value="rating-desc">Beste</SelectItem>
                            <SelectItem value="rating-asc">Schlechteste</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Feedback List */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Tabs defaultValue="all" className="w-full">
                        <TabsList className="bg-muted/50 p-1 h-auto">
                            <TabsTrigger value="all" className="py-1.5 px-4">Alle ({allFeedback.length})</TabsTrigger>
                            <TabsTrigger value="repairs" className="py-1.5 px-4">Reparaturen ({filteredRepairs.length})</TabsTrigger>
                            <TabsTrigger value="builds" className="py-1.5 px-4">Neurad ({filteredBuilds.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="all" className="mt-4 space-y-3">
                            {allFeedback.length === 0 ? <EmptyFeedbackState /> : allFeedback.map((item) => <FeedbackCard key={`${item.type}-${item.id}`} item={item} navigate={navigate} />)}
                        </TabsContent>

                        <TabsContent value="repairs" className="mt-4 space-y-3">
                            {filteredRepairs.length === 0 ? <EmptyFeedbackState /> : filteredRepairs.map((item) => <FeedbackCard key={`repair-${item.id}`} item={item} navigate={navigate} />)}
                        </TabsContent>

                        <TabsContent value="builds" className="mt-4 space-y-3">
                            {filteredBuilds.length === 0 ? <EmptyFeedbackState /> : filteredBuilds.map((item) => <FeedbackCard key={`build-${item.id}`} item={item} navigate={navigate} />)}
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </DashboardLayout>
    )
}

function FeedbackCard({ item, navigate }: { item: any, navigate: any }) {
    const { employees } = useEmployee()

    const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name

    const mechanicNames = item.mechanic_ids && item.mechanic_ids.length > 0
        ? item.mechanic_ids.map(getEmployeeName).filter(Boolean)
        : item.last_actor_name
            ? [item.last_actor_name]
            : []

    const handleClick = () => {
        if (item.type === 'repair') {
            navigate(`/dashboard/orders/${item.id}`)
        } else {
            navigate(`/dashboard/bike-builds/${item.id}`)
        }
    }

    const getRatingColor = (rating: number) => {
        if (rating >= 4) return "bg-green-500"
        if (rating >= 3) return "bg-yellow-500"
        return "bg-red-500"
    }

    return (
        <Card
            className="overflow-hidden transition-all hover:shadow-md cursor-pointer group"
            onClick={handleClick}
        >
            <div className="flex">
                {/* Rating indicator bar */}
                <div className={cn("w-1 shrink-0", getRatingColor(item.rating))} />

                <CardContent className="flex-1 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className={cn(
                                    "text-[10px] px-1.5 py-0 h-5",
                                    item.type === 'repair' ? "bg-blue-500/10 text-blue-600 border-blue-200" : "bg-purple-500/10 text-purple-600 border-purple-200"
                                )}>
                                    {item.type === 'repair' ? <Wrench className="w-3 h-3 mr-1" /> : <Bike className="w-3 h-3 mr-1" />}
                                    {item.type === 'repair' ? 'Reparatur' : 'Neurad'}
                                </Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {item.date ? format(new Date(item.date), "d. MMM", { locale: de }) : '—'}
                                </span>
                                {mechanicNames.map((name: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                                        {name}
                                    </Badge>
                                ))}
                            </div>
                            <h3 className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                                {item.title}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>

                            {item.feedback && (
                                <div className="mt-2 flex items-start gap-2 bg-muted/30 p-2 rounded-md">
                                    <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                                    <p className="text-xs text-muted-foreground italic line-clamp-2">"{item.feedback}"</p>
                                </div>
                            )}
                        </div>

                        {/* Rating Badge */}
                        <div className="flex items-center gap-1 bg-muted/50 px-2.5 py-1 rounded-full shrink-0">
                            <span className="font-bold text-sm">{item.rating}</span>
                            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        </div>
                    </div>
                </CardContent>
            </div>
        </Card>
    )
}

function EmptyFeedbackState() {
    return (
        <div className="text-center py-16 bg-muted/5 rounded-xl border-2 border-dashed border-muted-foreground/10">
            <div className="bg-muted/20 p-3 rounded-full w-fit mx-auto mb-3">
                <MessageSquare className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <h3 className="font-semibold">Kein Feedback gefunden</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
                Für diesen Zeitraum liegen keine Bewertungen vor.
            </p>
        </div>
    )
}
