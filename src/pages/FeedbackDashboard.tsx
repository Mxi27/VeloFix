import { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import {
    Star,
    MessageSquare,
    Zap,
    Loader2,
    TrendingUp,
    Users,
    ChevronDown,
    ChevronRight,
    ShieldCheck,
    MessageCircle,
    ThumbsUp,
    CheckCircle2,
    Search,
} from "lucide-react"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { de } from "date-fns/locale"

const PRICE_LABEL: Record<string, string> = {
    "schnäppchen": "Sogar günstiger",
    "sehr_fair": "Sehr fair",
    "fair": "Angemessen",
    "etwas_teuer": "Gehoben / Premium",
    "zu_teuer": "Eher teuer",
}

const PRICE_BUCKET_KEYS: Record<string, string[]> = {
    positive: ["schnäppchen", "sehr_fair"],
    neutral: ["fair"],
    negative: ["etwas_teuer", "zu_teuer"],
}

const VALUE_DRIVER_ICONS: Record<string, any> = {
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

function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
    const cls = size === "sm" ? "h-3 w-3" : "h-4 w-4"
    return (
        <div className="flex gap-0.5 items-center">
            {[1, 2, 3, 4, 5].map((s) => (
                <Star
                    key={s}
                    className={cn(
                        cls,
                        s <= rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/20 fill-muted/20"
                    )}
                />
            ))}
        </div>
    )
}

function FeedbackRow({ item }: { item: any }) {
    const [expanded, setExpanded] = useState(false)
    const hasComment = !!item.comment
    const drivers = item.main_value ? item.main_value.split(',').map((v: string) => v.trim()).filter(Boolean) : []

    return (
        <div
            onClick={() => setExpanded(!expanded)}
            className="cursor-pointer border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
        >
            <div className="flex items-start gap-4 px-4 py-4">
                {/* Stars + rating */}
                <div className="flex flex-col gap-1 min-w-[80px] pt-0.5">
                    <StarDisplay rating={item.rating} />
                    <span className="text-xs text-muted-foreground tabular-nums">{item.rating.toFixed(1)}</span>
                </div>

                {/* Order info */}
                <div className="flex flex-col gap-0.5 min-w-[130px]">
                    <span className="text-sm font-semibold text-foreground">
                        #{item.order?.order_number || item.id.substring(0, 8)}
                    </span>
                    {item.order?.bike_model && (
                        <span className="text-xs text-muted-foreground">{item.order.bike_model}</span>
                    )}
                    <span className="text-xs text-muted-foreground/60">
                        {format(new Date(item.created_at), "dd. MMM yy", { locale: de })}
                    </span>
                </div>

                {/* Comment */}
                <div className="flex-1 min-w-0 pt-0.5">
                    {hasComment ? (
                        <p className={cn("text-sm text-foreground/90 leading-relaxed", !expanded && "line-clamp-1")}>
                            {item.comment}
                        </p>
                    ) : (
                        <p className="text-sm text-muted-foreground/40 italic">Kein Kommentar</p>
                    )}
                </div>

                {/* Customer + price */}
                <div className="flex flex-col items-end gap-1 min-w-[120px]">
                    {item.order?.customer_name && (
                        <span className="text-xs font-medium text-foreground/80">{item.order.customer_name}</span>
                    )}
                    {item.price_perception && (
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-auto">
                            {PRICE_LABEL[item.price_perception]}
                        </Badge>
                    )}
                </div>

                <ChevronDown className={cn("h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0 transition-transform duration-200", expanded && "rotate-180")} />
            </div>

            {/* Expanded detail */}
            {expanded && (hasComment || drivers.length > 0) && (
                <div className="px-4 pb-4 pt-1 border-t border-border/30 bg-muted/20">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                        {hasComment && (
                            <p className="flex-1 text-sm text-foreground/70 italic leading-relaxed">
                                "{item.comment}"
                            </p>
                        )}
                        {drivers.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 content-start">
                                {drivers.map((v: string) => (
                                    <Badge key={v} variant="outline" className="text-[10px] font-medium px-2 py-0.5 h-auto gap-1">
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

export default function FeedbackDashboard() {
    const { workshopId } = useAuth()
    const [loading, setLoading] = useState(true)
    const [feedback, setFeedback] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [ratingFilter, setRatingFilter] = useState<number | null>(null)
    const [sortBy, setSortBy] = useState<'date' | 'best' | 'worst'>('date')
    const [viewAll, setViewAll] = useState(false)

    useEffect(() => {
        const fetchFeedback = async () => {
            if (!workshopId) return
            try {
                const { data, error } = await supabase
                    .from('order_feedback')
                    .select('*, order:orders(order_number, bike_model, customer_name)')
                    .eq('workshop_id', workshopId)
                    .order('created_at', { ascending: false })

                if (error) throw error
                setFeedback(data || [])
            } catch (err: any) {
                if (err?.code !== '42P01') {
                    console.error("Error fetching feedback:", err)
                }
            } finally {
                setLoading(false)
            }
        }
        fetchFeedback()
    }, [workshopId])

    const stats = useMemo(() => {
        if (feedback.length === 0) return null

        const avgRating = feedback.reduce((acc, f) => acc + f.rating, 0) / feedback.length

        const ratingDist = [5, 4, 3, 2, 1].map(r => ({
            rating: r,
            count: feedback.filter(f => f.rating === r).length,
        }))

        const valueCounts = feedback.reduce((acc: any, f) => {
            if (f.main_value) {
                f.main_value.split(',').forEach((v: string) => {
                    const k = v.trim()
                    acc[k] = (acc[k] || 0) + 1
                })
            }
            return acc
        }, {})

        const topValueDriver = Object.entries(valueCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || null

        const countsByBucket: Record<string, number> = { positive: 0, neutral: 0, negative: 0 }
        const sumByBucket: Record<string, number> = { positive: 0, neutral: 0, negative: 0 }

        feedback.forEach(f => {
            if (!f.price_perception) return
            const p = f.price_perception.trim()
            for (const [bucket, keys] of Object.entries(PRICE_BUCKET_KEYS)) {
                if (keys.includes(p)) {
                    countsByBucket[bucket]++
                    sumByBucket[bucket] += f.rating
                }
            }
        })

        const ratingByBucket: Record<string, number> = {}
        for (const b of ['positive', 'neutral', 'negative']) {
            ratingByBucket[b] = countsByBucket[b] > 0 ? sumByBucket[b] / countsByBucket[b] : 0
        }

        const totalWithPrice = feedback.filter(f => f.price_perception).length
        const positivePricePerc = totalWithPrice > 0
            ? (countsByBucket.positive + countsByBucket.neutral) / totalWithPrice
            : 0

        return { avgRating, ratingDist, valueCounts, topValueDriver, countsByBucket, ratingByBucket, positivePricePerc }
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
                    f.order?.order_number?.toString().toLowerCase().includes(q) ||
                    f.order?.customer_name?.toLowerCase().includes(q)
                )
            })
            .sort((a, b) => {
                if (sortBy === 'best') return b.rating - a.rating
                if (sortBy === 'worst') return a.rating - b.rating
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            })
    }, [feedback, searchQuery, ratingFilter, sortBy])

    const displayedFeedback = viewAll ? filteredFeedback : filteredFeedback.slice(0, 8)

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
            <div className="max-w-[1100px] mx-auto space-y-6 pb-12 px-4 md:px-6 pt-6">

                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Kundenfeedback</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Analysiere Zufriedenheit und Preiswahrnehmung deiner Kunden.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {stats && stats.positivePricePerc > 0.6 && (
                            <Badge variant="outline" className="gap-1.5 text-xs">
                                <TrendingUp className="h-3 w-3 text-emerald-500" />
                                Preispotenzial erkannt
                            </Badge>
                        )}
                        <Badge variant="secondary" className="gap-1.5 text-xs">
                            <Users className="h-3 w-3" />
                            {feedback.length} Bewertungen
                        </Badge>
                    </div>
                </div>

                {feedback.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-24 text-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                                <MessageSquare className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">Noch kein Kundenfeedback</p>
                                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                    Sobald Kunden das Feedback-Formular ausfüllen, erscheinen die Daten hier.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">

                        {/* KPI Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Satisfaction Card */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Gesamtzufriedenheit</CardTitle>
                                </CardHeader>
                                <CardContent className="flex gap-6 items-center">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-5xl font-bold tabular-nums tracking-tight text-foreground">
                                            {stats!.avgRating.toFixed(1)}
                                        </span>
                                        <StarDisplay rating={Math.round(stats!.avgRating)} size="md" />
                                        <span className="text-xs text-muted-foreground mt-1">{feedback.length} Bewertungen</span>
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        {[5, 4, 3, 2, 1].map(r => {
                                            const item = stats!.ratingDist.find(d => d.rating === r)
                                            const count = item?.count || 0
                                            const pct = feedback.length > 0 ? (count / feedback.length) * 100 : 0
                                            return (
                                                <div key={r} className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground w-3 text-right tabular-nums">{r}</span>
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
                                                    <span className="text-xs text-muted-foreground w-4 tabular-nums text-right">{count}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Value Drivers Card */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Was Kunden schätzen</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-3">
                                        {Object.entries(VALUE_DRIVER_LABELS).map(([key, label]) => {
                                            const count = stats!.valueCounts[key] || 0
                                            const pct = feedback.length > 0 ? Math.round((count / feedback.length) * 100) : 0
                                            const isTop = key === stats!.topValueDriver
                                            const Icon = VALUE_DRIVER_ICONS[key] || CheckCircle2

                                            return (
                                                <div
                                                    key={key}
                                                    className={cn(
                                                        "rounded-xl p-3 border flex flex-col gap-2 transition-colors",
                                                        isTop
                                                            ? "bg-primary/5 border-primary/20"
                                                            : "bg-muted/30 border-border/40 opacity-70"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <Icon className={cn("h-4 w-4", isTop ? "text-primary" : "text-muted-foreground")} />
                                                        <span className="text-sm font-bold tabular-nums">{pct}%</span>
                                                    </div>
                                                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Price Analysis Card */}
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Preis-Check</CardTitle>
                                        <CardDescription className="text-xs mt-0.5">Ø-Bewertung nach Preiswahrnehmung</CardDescription>
                                    </div>
                                    <Badge variant="secondary" className="text-sm font-bold px-3 py-1 h-auto">
                                        {Math.round(stats!.positivePricePerc * 100)}% Fair-Quote
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {[
                                        { key: 'positive', label: 'Günstig', description: 'Kunden finden Preise niedrig', colorClass: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40' },
                                        { key: 'neutral', label: 'Fair', description: 'Kunden finden Preise angemessen', colorClass: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/40' },
                                        { key: 'negative', label: 'Teuer', description: 'Kunden finden Preise hoch', colorClass: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40' },
                                    ].map(bucket => {
                                        const avg = stats!.ratingByBucket[bucket.key]
                                        const count = stats!.countsByBucket[bucket.key]
                                        return (
                                            <div key={bucket.key} className={cn("rounded-xl p-4 border", bucket.colorClass)}>
                                                <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">{bucket.label}</p>
                                                <p className="text-xs opacity-60 mb-3">{bucket.description}</p>
                                                <div className="flex items-end gap-1.5">
                                                    <span className="text-3xl font-bold tabular-nums">
                                                        {count > 0 ? avg.toFixed(1) : '—'}
                                                    </span>
                                                    {count > 0 && <Star className="h-4 w-4 fill-current mb-1 opacity-70" />}
                                                </div>
                                                <p className="text-xs opacity-60 mt-1">{count} {count === 1 ? 'Stimme' : 'Stimmen'}</p>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Feedback List */}
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex flex-col md:flex-row md:items-center gap-3">
                                    <CardTitle className="text-sm font-medium text-muted-foreground shrink-0">Alle Feedbacks</CardTitle>

                                    {/* Search */}
                                    <div className="relative flex-1 max-w-xs">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            placeholder="Suchen..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-8 h-8 text-sm"
                                        />
                                    </div>

                                    {/* Rating filter */}
                                    <div className="flex items-center gap-1">
                                        {[null, 5, 4, 3, 2, 1].map(r => (
                                            <button
                                                key={r ?? 'all'}
                                                onClick={() => setRatingFilter(r)}
                                                className={cn(
                                                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                                                    ratingFilter === r
                                                        ? "bg-foreground text-background"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                                )}
                                            >
                                                {r === null ? "Alle" : r}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Sort */}
                                    <div className="flex items-center gap-1 ml-auto">
                                        {([{ id: 'date', label: 'Neueste' }, { id: 'best', label: 'Beste' }, { id: 'worst', label: 'Schlechteste' }] as const).map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => setSortBy(s.id)}
                                                className={cn(
                                                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                                                    sortBy === s.id
                                                        ? "bg-foreground text-background"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                                )}
                                            >
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="p-0">
                                {displayedFeedback.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <p className="text-sm text-muted-foreground">Keine Feedbacks für diese Auswahl.</p>
                                    </div>
                                ) : (
                                    <div>
                                        {displayedFeedback.map(item => (
                                            <FeedbackRow key={item.id} item={item} />
                                        ))}
                                    </div>
                                )}

                                {!viewAll && filteredFeedback.length > 8 && (
                                    <div className="p-4 border-t border-border/40">
                                        <Button
                                            variant="ghost"
                                            className="w-full text-muted-foreground"
                                            onClick={() => setViewAll(true)}
                                        >
                                            Alle {filteredFeedback.length} Feedbacks laden
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
