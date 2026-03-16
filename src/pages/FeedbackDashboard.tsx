import { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import {
    Star,
    MessageSquare,
    Zap,
    Loader2,
    TrendingUp,
    TrendingDown,
    Users,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ShieldCheck,
    MessageCircle,
    ThumbsUp,
    CheckCircle2,
    Search,
    Minus,
} from "lucide-react"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { format, subDays } from "date-fns"
import { de } from "date-fns/locale"

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12

const PRICE_LABEL: Record<string, string> = {
    "schnäppchen": "Schnäppchen",
    "sehr_fair": "Sehr fair",
    "fair": "Fair",
    "etwas_teuer": "Eher teuer",
    "zu_teuer": "Zu teuer",
}

const PRICE_BUCKET_KEYS: Record<string, string[]> = {
    positive: ["schnäppchen", "sehr_fair"],
    neutral: ["fair"],
    negative: ["etwas_teuer", "zu_teuer"],
}

const VALUE_DRIVER_ICONS: Record<string, React.ElementType> = {
    qualitaet: ShieldCheck,
    schnelligkeit: Zap,
    beratung: MessageCircle,
    service: ThumbsUp,
}

const VALUE_DRIVER_LABELS: Record<string, string> = {
    qualitaet: "Qualität",
    schnelligkeit: "Schnelligkeit",
    beratung: "Beratung",
    service: "Service",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPageNumbers(current: number, total: number): (number | null)[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i)
    const pages: (number | null)[] = [0]
    if (current > 2) pages.push(null)
    for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) {
        pages.push(i)
    }
    if (current < total - 3) pages.push(null)
    pages.push(total - 1)
    return pages
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RatingBadge({ rating }: { rating: number }) {
    const cls =
        rating >= 4.5 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" :
        rating >= 4   ? "bg-green-500/15 text-green-400 border-green-500/25" :
        rating >= 3   ? "bg-amber-500/15 text-amber-400 border-amber-500/25" :
        rating >= 2   ? "bg-orange-500/15 text-orange-400 border-orange-500/25" :
                        "bg-red-500/15 text-red-400 border-red-500/25"
    return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-bold tabular-nums", cls)}>
            {rating.toFixed(1)}
            <Star className="h-2.5 w-2.5 fill-current" />
        </span>
    )
}

function ReviewRow({ item }: { item: any }) {
    const [expanded, setExpanded] = useState(false)
    const hasComment = !!item.comment
    const drivers: string[] = item.main_value
        ? item.main_value.split(',').map((v: string) => v.trim()).filter(Boolean)
        : []
    const expandable = hasComment || drivers.length > 0

    const accentColor =
        item.rating >= 4.5 ? "bg-emerald-500" :
        item.rating >= 4   ? "bg-green-500" :
        item.rating >= 3   ? "bg-amber-500" :
        item.rating >= 2   ? "bg-orange-500" : "bg-red-500"

    return (
        <div
            className={cn(
                "relative border-b border-border/40 last:border-0 transition-colors group",
                expandable ? "cursor-pointer hover:bg-muted/20" : "cursor-default"
            )}
            onClick={() => expandable && setExpanded(v => !v)}
        >
            {/* Accent bar */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-[3px]", accentColor)} />

            <div className="flex items-center gap-4 px-5 py-3 pl-5">
                {/* Rating */}
                <div className="shrink-0 w-[72px] pl-2">
                    <RatingBadge rating={item.rating} />
                </div>

                {/* Auftrag */}
                <div className="shrink-0 w-[150px]">
                    <p className="text-sm font-medium text-foreground leading-tight">
                        #{item.order?.order_number || item.id.substring(0, 8)}
                    </p>
                    {item.order?.bike_model && (
                        <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                            {item.order.bike_model}
                        </p>
                    )}
                </div>

                {/* Kunde */}
                <div className="shrink-0 w-[150px]">
                    <p className="text-sm text-foreground/80 truncate">
                        {item.order?.customer_name ?? (
                            <span className="text-muted-foreground/30 text-xs">—</span>
                        )}
                    </p>
                    <p className="text-xs text-muted-foreground/50 tabular-nums">
                        {format(new Date(item.created_at), "dd. MMM yyyy", { locale: de })}
                    </p>
                </div>

                {/* Preis */}
                <div className="shrink-0 w-[110px]">
                    {item.price_perception ? (
                        <Badge variant="secondary" className="text-[10px] h-5 px-2 whitespace-nowrap">
                            {PRICE_LABEL[item.price_perception]}
                        </Badge>
                    ) : (
                        <span className="text-muted-foreground/25 text-xs">—</span>
                    )}
                </div>

                {/* Kommentar */}
                <div className="flex-1 min-w-0">
                    {hasComment ? (
                        <p className="text-sm text-muted-foreground line-clamp-1 italic">
                            „{item.comment}"
                        </p>
                    ) : (
                        <span className="text-xs text-muted-foreground/25 italic">Kein Kommentar</span>
                    )}
                </div>

                {/* Expand icon */}
                <div className="shrink-0 w-5">
                    {expandable && (
                        <ChevronDown className={cn(
                            "h-4 w-4 text-muted-foreground/30 transition-transform duration-200",
                            "group-hover:text-muted-foreground/60",
                            expanded && "rotate-180 text-muted-foreground/60"
                        )} />
                    )}
                </div>
            </div>

            {/* Expanded detail */}
            {expanded && (
                <div className="px-6 pb-4 pt-2 pl-8 bg-muted/10 border-t border-border/30">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {hasComment && (
                            <p className="flex-1 text-sm text-foreground/70 italic leading-relaxed">
                                „{item.comment}"
                            </p>
                        )}
                        {drivers.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 shrink-0 content-start">
                                {drivers.map((v: string) => (
                                    <Badge key={v} variant="outline" className="text-[10px] h-5 px-2">
                                        {VALUE_DRIVER_LABELS[v] || v}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FeedbackDashboard() {
    const { workshopId } = useAuth()
    const [loading, setLoading] = useState(true)
    const [feedback, setFeedback] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [ratingFilter, setRatingFilter] = useState<number | null>(null)
    const [sortBy, setSortBy] = useState<"date" | "best" | "worst">("date")
    const [page, setPage] = useState(0)

    useEffect(() => {
        const fetchFeedback = async () => {
            if (!workshopId) return
            try {
                const { data, error } = await supabase
                    .from("order_feedback")
                    .select("*, order:orders(order_number, bike_model, customer_name)")
                    .eq("workshop_id", workshopId)
                    .order("created_at", { ascending: false })
                if (error) throw error
                setFeedback(data || [])
            } catch (err: any) {
                if (err?.code !== "42P01") console.error("Error fetching feedback:", err)
            } finally {
                setLoading(false)
            }
        }
        fetchFeedback()
    }, [workshopId])

    // Reset to page 0 on filter/sort change
    useEffect(() => { setPage(0) }, [searchQuery, ratingFilter, sortBy])

    const stats = useMemo(() => {
        if (feedback.length === 0) return null

        const avgRating = feedback.reduce((s, f) => s + f.rating, 0) / feedback.length
        const satisfactionRate = feedback.filter(f => f.rating >= 4).length / feedback.length

        const ratingDist = [5, 4, 3, 2, 1].map(r => ({
            rating: r,
            count: feedback.filter(f => f.rating === r).length,
        }))

        const valueCounts = feedback.reduce((acc: Record<string, number>, f) => {
            if (f.main_value) {
                f.main_value.split(",").forEach((v: string) => {
                    const k = v.trim()
                    acc[k] = (acc[k] || 0) + 1
                })
            }
            return acc
        }, {})
        const topValueDriver = Object.entries(valueCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

        const countsByBucket: Record<string, number> = { positive: 0, neutral: 0, negative: 0 }
        feedback.forEach(f => {
            if (!f.price_perception) return
            const p = f.price_perception.trim()
            for (const [bucket, keys] of Object.entries(PRICE_BUCKET_KEYS)) {
                if (keys.includes(p)) countsByBucket[bucket]++
            }
        })
        const totalWithPrice = feedback.filter(f => f.price_perception).length
        const fairQuote = totalWithPrice > 0
            ? (countsByBucket.positive + countsByBucket.neutral) / totalWithPrice
            : 0

        // Trend last 30d vs. previous 30d
        const now = new Date()
        const d30 = subDays(now, 30)
        const d60 = subDays(now, 60)
        const recent = feedback.filter(f => new Date(f.created_at) >= d30)
        const previous = feedback.filter(f => { const d = new Date(f.created_at); return d >= d60 && d < d30 })
        const recentAvg = recent.length > 0 ? recent.reduce((s, f) => s + f.rating, 0) / recent.length : null
        const prevAvg = previous.length > 0 ? previous.reduce((s, f) => s + f.rating, 0) / previous.length : null
        const trendDiff = recentAvg !== null && prevAvg !== null ? recentAvg - prevAvg : null

        return { avgRating, satisfactionRate, ratingDist, valueCounts, topValueDriver, countsByBucket, fairQuote, trendDiff }
    }, [feedback])

    const filteredFeedback = useMemo(() => {
        const q = searchQuery.toLowerCase()
        return feedback
            .filter(f => {
                if (ratingFilter !== null && f.rating !== ratingFilter) return false
                if (!q) return true
                return (
                    f.comment?.toLowerCase().includes(q) ||
                    f.order?.bike_model?.toLowerCase().includes(q) ||
                    f.order?.order_number?.toString().includes(q) ||
                    f.order?.customer_name?.toLowerCase().includes(q)
                )
            })
            .sort((a, b) => {
                if (sortBy === "best") return b.rating - a.rating
                if (sortBy === "worst") return a.rating - b.rating
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            })
    }, [feedback, searchQuery, ratingFilter, sortBy])

    const totalPages = Math.ceil(filteredFeedback.length / PAGE_SIZE)
    const pagedFeedback = filteredFeedback.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="max-w-[1100px] mx-auto space-y-5 pb-12 px-4 md:px-6 pt-6">

                {/* Page header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Kundenfeedback</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Zufriedenheit, Preisempfinden und alle Bewertungen auf einen Blick
                    </p>
                </div>

                {/* Empty state */}
                {feedback.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-24 text-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                                <MessageSquare className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-semibold">Noch kein Kundenfeedback</p>
                                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                    Sobald Kunden das Feedback-Formular ausfüllen, erscheinen die Daten hier.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* ── 1. KPI Strip ── */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-xs text-muted-foreground mb-2">Ø Bewertung</p>
                                    <div className="flex items-end gap-1.5">
                                        <span className="text-3xl font-bold tabular-nums tracking-tight">
                                            {stats!.avgRating.toFixed(1)}
                                        </span>
                                        <Star className="h-5 w-5 fill-amber-400 text-amber-400 mb-0.5" />
                                    </div>
                                    <div className="flex gap-0.5 mt-1.5">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <Star key={s} className={cn(
                                                "h-3 w-3",
                                                s <= Math.round(stats!.avgRating)
                                                    ? "fill-amber-400 text-amber-400"
                                                    : "text-muted-foreground/20 fill-muted/10"
                                            )} />
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-xs text-muted-foreground mb-2">Bewertungen</p>
                                    <div className="flex items-end gap-1.5">
                                        <span className="text-3xl font-bold tabular-nums tracking-tight">
                                            {feedback.length}
                                        </span>
                                        <Users className="h-4 w-4 text-muted-foreground mb-0.5" />
                                    </div>
                                    {stats!.trendDiff !== null && (
                                        <p className={cn(
                                            "text-xs mt-1.5 flex items-center gap-1",
                                            stats!.trendDiff > 0.05 ? "text-emerald-500" :
                                            stats!.trendDiff < -0.05 ? "text-red-400" :
                                            "text-muted-foreground"
                                        )}>
                                            {stats!.trendDiff > 0.05
                                                ? <TrendingUp className="h-3 w-3" />
                                                : stats!.trendDiff < -0.05
                                                    ? <TrendingDown className="h-3 w-3" />
                                                    : <Minus className="h-3 w-3" />
                                            }
                                            {stats!.trendDiff > 0 ? "+" : ""}{stats!.trendDiff.toFixed(1)} vs. Vormonat
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-xs text-muted-foreground mb-2">Zufriedenheitsrate</p>
                                    <div className="flex items-end gap-1.5">
                                        <span className="text-3xl font-bold tabular-nums tracking-tight">
                                            {Math.round(stats!.satisfactionRate * 100)}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1.5">Anteil 4★ und besser</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-xs text-muted-foreground mb-2">Fair-Quote</p>
                                    <div className="flex items-end gap-1.5">
                                        <span className="text-3xl font-bold tabular-nums tracking-tight">
                                            {Math.round(stats!.fairQuote * 100)}%
                                        </span>
                                        {stats!.fairQuote > 0.6 && (
                                            <TrendingUp className="h-4 w-4 text-emerald-500 mb-0.5" />
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1.5">Preis als fair oder günstiger</p>
                                </CardContent>
                            </Card>

                        </div>

                        {/* ── 2. Insight Cards ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Rating Distribution — clickable to filter list */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium">Bewertungsverteilung</CardTitle>
                                    <p className="text-xs text-muted-foreground">Klicke auf eine Zeile um zu filtern</p>
                                </CardHeader>
                                <CardContent className="space-y-1.5">
                                    {[5, 4, 3, 2, 1].map(r => {
                                        const item = stats!.ratingDist.find(d => d.rating === r)
                                        const count = item?.count || 0
                                        const pct = feedback.length > 0 ? (count / feedback.length) * 100 : 0
                                        const active = ratingFilter === r
                                        return (
                                            <button
                                                key={r}
                                                onClick={() => setRatingFilter(active ? null : r)}
                                                className={cn(
                                                    "w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors text-left",
                                                    active ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted/40"
                                                )}
                                            >
                                                <span className="text-xs font-medium text-muted-foreground w-3 tabular-nums text-right shrink-0">{r}</span>
                                                <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all duration-700",
                                                            r === 5 ? "bg-emerald-500" :
                                                            r === 4 ? "bg-green-500" :
                                                            r === 3 ? "bg-amber-500" :
                                                            r === 2 ? "bg-orange-500" : "bg-red-500"
                                                        )}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground tabular-nums w-6 text-right shrink-0">{count}</span>
                                                <span className="text-xs text-muted-foreground/40 tabular-nums w-9 text-right shrink-0">{pct.toFixed(0)}%</span>
                                            </button>
                                        )
                                    })}
                                    {ratingFilter !== null && (
                                        <button
                                            onClick={() => setRatingFilter(null)}
                                            className="w-full text-xs text-primary/60 hover:text-primary pt-1 text-center transition-colors"
                                        >
                                            Filter zurücksetzen
                                        </button>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="flex flex-col gap-4">

                                {/* Value Drivers */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-medium">Was Kunden schätzen</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {Object.entries(VALUE_DRIVER_LABELS).map(([key, label]) => {
                                            const count = stats!.valueCounts[key] || 0
                                            const pct = feedback.length > 0 ? (count / feedback.length) * 100 : 0
                                            const isTop = key === stats!.topValueDriver
                                            const Icon = VALUE_DRIVER_ICONS[key] || CheckCircle2
                                            return (
                                                <div key={key} className="flex items-center gap-3">
                                                    <Icon className={cn(
                                                        "h-4 w-4 shrink-0",
                                                        isTop ? "text-primary" : "text-muted-foreground/35"
                                                    )} />
                                                    <span className={cn(
                                                        "text-xs w-24 shrink-0",
                                                        isTop ? "font-medium text-foreground" : "text-muted-foreground"
                                                    )}>
                                                        {label}
                                                    </span>
                                                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                "h-full rounded-full transition-all duration-700",
                                                                isTop ? "bg-primary" : "bg-muted-foreground/25"
                                                            )}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs tabular-nums text-muted-foreground w-8 text-right shrink-0">
                                                        {Math.round(pct)}%
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </CardContent>
                                </Card>

                                {/* Price Perception */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-medium">Preiswahrnehmung</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { key: "positive", label: "Günstig", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                                                { key: "neutral",  label: "Fair",    color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
                                                { key: "negative", label: "Teuer",   color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
                                            ].map(b => {
                                                const count = stats!.countsByBucket[b.key]
                                                const total = feedback.filter(f => f.price_perception).length
                                                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                                                return (
                                                    <div key={b.key} className={cn("rounded-xl p-3 border text-center", b.bg)}>
                                                        <p className={cn("text-xl font-bold tabular-nums", b.color)}>{pct}%</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{b.label}</p>
                                                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">{count} Stimmen</p>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>

                            </div>
                        </div>

                        {/* ── 3. Reviews List ── */}
                        <Card>
                            {/* Filter toolbar */}
                            <CardHeader className="pb-0 border-b border-border/40">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
                                    <div>
                                        <CardTitle className="text-sm font-medium">
                                            Alle Bewertungen
                                        </CardTitle>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {filteredFeedback.length !== feedback.length
                                                ? `${filteredFeedback.length} von ${feedback.length} angezeigt`
                                                : `${feedback.length} Einträge`
                                            }
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                            <Input
                                                placeholder="Suchen..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                className="pl-8 h-8 text-sm w-44"
                                            />
                                        </div>
                                        <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
                                            <SelectTrigger className="h-8 w-[150px] text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="date">Neueste zuerst</SelectItem>
                                                <SelectItem value="best">Beste zuerst</SelectItem>
                                                <SelectItem value="worst">Schlechteste zuerst</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {/* Rating filter pills */}
                                <div className="flex items-center gap-1 pb-2">
                                    {([null, 5, 4, 3, 2, 1] as const).map(r => (
                                        <button
                                            key={r ?? "all"}
                                            onClick={() => setRatingFilter(r)}
                                            className={cn(
                                                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                                                ratingFilter === r
                                                    ? "bg-foreground text-background"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                            )}
                                        >
                                            {r === null ? "Alle" : `${r}★`}
                                        </button>
                                    ))}
                                </div>
                            </CardHeader>

                            {/* Column headers */}
                            <div className="px-5 py-2 pl-8 bg-muted/20 border-b border-border/30">
                                <div className="flex items-center gap-4 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                                    <span className="w-[72px] shrink-0">Rating</span>
                                    <span className="w-[150px] shrink-0">Auftrag</span>
                                    <span className="w-[150px] shrink-0">Kunde</span>
                                    <span className="w-[110px] shrink-0">Preis</span>
                                    <span className="flex-1">Kommentar</span>
                                </div>
                            </div>

                            <CardContent className="p-0">
                                {pagedFeedback.length === 0 ? (
                                    <div className="py-16 text-center">
                                        <p className="text-sm text-muted-foreground">Keine Bewertungen für diese Auswahl.</p>
                                    </div>
                                ) : (
                                    pagedFeedback.map(item => <ReviewRow key={item.id} item={item} />)
                                )}
                            </CardContent>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-5 py-3 border-t border-border/40">
                                    <p className="text-xs text-muted-foreground tabular-nums">
                                        {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredFeedback.length)} von {filteredFeedback.length}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 w-7 p-0"
                                            disabled={page === 0}
                                            onClick={() => setPage(p => p - 1)}
                                        >
                                            <ChevronLeft className="h-3.5 w-3.5" />
                                        </Button>
                                        {getPageNumbers(page, totalPages).map((p, i) =>
                                            p === null ? (
                                                <span key={`ellipsis-${i}`} className="text-muted-foreground/40 text-xs px-1 w-7 text-center">…</span>
                                            ) : (
                                                <Button
                                                    key={p}
                                                    variant={page === p ? "default" : "ghost"}
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-xs"
                                                    onClick={() => setPage(p)}
                                                >
                                                    {p + 1}
                                                </Button>
                                            )
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 w-7 p-0"
                                            disabled={page >= totalPages - 1}
                                            onClick={() => setPage(p => p + 1)}
                                        >
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Card>

                    </>
                )}
            </div>
        </DashboardLayout>
    )
}
