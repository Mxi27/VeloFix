import { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { 
    Star, 
    MessageSquare, 
    MapPin, 
    Zap,
    Wallet,
    Loader2,
    TrendingUp,
    Users,
    Award,
    ChevronRight,
    BarChart3,
} from "lucide-react"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { de } from "date-fns/locale"

const PRICE_LABEL: Record<string, string> = {
    sehr_fair: "Sehr fair",
    preis_leistung: "Fair",
    etwas_teuer: "Etwas teuer",
    zu_teuer: "Zu teuer",
    schnäppchen: "Schnäppchen",
    fair: "Fair",
    teuer: "Teuer",
}

const PRICE_COLOR: Record<string, string> = {
    sehr_fair: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    preis_leistung: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    schnäppchen: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    fair: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    etwas_teuer: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    teuer: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    zu_teuer: "bg-red-500/15 text-red-400 border-red-500/20",
}

function StarRow({ rating, small }: { rating: number; small?: boolean }) {
    return (
        <div className={cn("flex gap-0.5", small ? "items-center" : "")}>
            {[1, 2, 3, 4, 5].map((s) => (
                <Star
                    key={s}
                    className={cn(
                        small ? "h-3 w-3" : "h-4 w-4",
                        s <= rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-white/10 fill-white/5"
                    )}
                />
            ))}
        </div>
    )
}

export default function FeedbackDashboard() {
    const { workshopId } = useAuth()
    const [loading, setLoading] = useState(true)
    const [feedback, setFeedback] = useState<any[]>([])

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
                if (err?.code === '42P01') {
                    console.warn("Feedback table not yet created.")
                } else {
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

        const avgRating = feedback.reduce((acc, curr) => acc + curr.rating, 0) / feedback.length

        const priceCounts = feedback.reduce((acc: any, curr) => {
            if (curr.price_perception) {
                acc[curr.price_perception] = (acc[curr.price_perception] || 0) + 1
            }
            return acc
        }, {})

        const valueCounts = feedback.reduce((acc: any, curr) => {
            if (curr.main_value) {
                acc[curr.main_value] = (acc[curr.main_value] || 0) + 1
            }
            return acc
        }, {})

        const positive = ['schnäppchen', 'fair', 'sehr_fair', 'preis_leistung']
        const positivePricePerc = positive.reduce((acc, k) => acc + (priceCounts[k] || 0), 0) / feedback.length

        // Rating distribution
        const ratingDist = [5, 4, 3, 2, 1].map(r => ({
            rating: r,
            count: feedback.filter(f => f.rating === r).length,
        }))

        // Zip code analysis
        const zipStats = feedback.reduce((acc: any, curr) => {
            if (!curr.customer_postal_code) return acc
            if (!acc[curr.customer_postal_code]) acc[curr.customer_postal_code] = { count: 0, sumRating: 0 }
            acc[curr.customer_postal_code].count++
            acc[curr.customer_postal_code].sumRating += curr.rating
            return acc
        }, {})

        const topZips = Object.entries(zipStats)
            .map(([zip, data]: [string, any]) => ({
                zip,
                count: data.count,
                avgRating: data.sumRating / data.count
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)

        const valueEntries = Object.entries(valueCounts)
        const topValueDriver = valueEntries.length > 0
            ? valueEntries.sort((a: any, b: any) => b[1] - a[1])[0][0]
            : "—"

        return {
            avgRating,
            priceCounts,
            valueCounts,
            positivePricePerc,
            topZips,
            topValueDriver,
            ratingDist,
        }
    }, [feedback])

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        )
    }

    const hasData = feedback.length > 0

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8 pb-12">

                {/* ── Page Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Übersicht</p>
                        <h1 className="text-3xl font-bold tracking-tight">Kundenfeedback</h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Analyse der Kundenzufriedenheit und Preiswahrnehmung.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {stats && stats.positivePricePerc > 0.7 && (
                            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 px-3 py-1.5 text-xs gap-1.5 font-semibold">
                                <TrendingUp className="h-3.5 w-3.5" />
                                Preiserhöhungs-Potenzial
                            </Badge>
                        )}
                        <Badge variant="outline" className="px-3 py-1.5 text-xs font-semibold gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            {feedback.length} {feedback.length === 1 ? "Bewertung" : "Bewertungen"}
                        </Badge>
                    </div>
                </div>

                {!hasData ? (
                    /* ── Empty State ── */
                    <Card className="glass">
                        <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <MessageSquare className="h-7 w-7 text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold text-lg">Noch kein Feedback vorhanden</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Sobald Kunden ihr Feedback abgeben, erscheint es hier.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* ── Hero KPI Strip ── */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Average Rating */}
                            <Card className="glass col-span-2 lg:col-span-1 overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
                                <CardContent className="p-5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ø Bewertung</p>
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                            <Star className="h-4 w-4 text-amber-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-4xl font-black text-foreground tabular-nums">
                                            {stats!.avgRating.toFixed(1)}
                                        </span>
                                    </div>
                                    <StarRow rating={Math.round(stats!.avgRating)} />
                                </CardContent>
                            </Card>

                            {/* Total */}
                            <Card className="glass overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                                <CardContent className="p-5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gesamt</p>
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Users className="h-4 w-4 text-primary" />
                                        </div>
                                    </div>
                                    <p className="text-4xl font-black tabular-nums">{feedback.length}</p>
                                    <p className="text-xs text-muted-foreground">Kundenabgaben</p>
                                </CardContent>
                            </Card>

                            {/* Price satisfaction */}
                            <Card className="glass overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                                <CardContent className="p-5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Preis-OK</p>
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                            <Wallet className="h-4 w-4 text-emerald-400" />
                                        </div>
                                    </div>
                                    <p className="text-4xl font-black tabular-nums text-emerald-500">
                                        {Math.round(stats!.positivePricePerc * 100)}%
                                    </p>
                                    <p className="text-xs text-muted-foreground">finden Preis fair</p>
                                </CardContent>
                            </Card>

                            {/* Top value driver */}
                            <Card className="glass overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
                                <CardContent className="p-5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Top Faktor</p>
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                            <Award className="h-4 w-4 text-purple-400" />
                                        </div>
                                    </div>
                                    <p className="text-xl font-bold capitalize leading-tight mt-1">
                                        {stats!.topValueDriver === "qualitaet" && "Qualität"}
                                        {stats!.topValueDriver === "schnelligkeit" && "Schnelligkeit"}
                                        {stats!.topValueDriver === "beratung" && "Beratung"}
                                        {stats!.topValueDriver === "preis" && "Preis"}
                                        {!["qualitaet","schnelligkeit","beratung","preis"].includes(stats!.topValueDriver) && (stats!.topValueDriver || "—")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Haupttreiber</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* ── Charts Row ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Rating distribution */}
                            <Card className="glass lg:col-span-1">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <BarChart3 className="h-4 w-4 text-amber-400" />
                                        Bewertungsverteilung
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {stats!.ratingDist.map(({ rating: r, count }) => {
                                        const pct = feedback.length > 0 ? (count / feedback.length) * 100 : 0
                                        return (
                                            <div key={r} className="flex items-center gap-3">
                                                <div className="flex items-center gap-1 w-14 shrink-0">
                                                    <span className="text-xs font-bold tabular-nums text-muted-foreground">{r}</span>
                                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                                </div>
                                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-700"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground w-6 text-right tabular-nums">{count}</span>
                                            </div>
                                        )
                                    })}
                                </CardContent>
                            </Card>

                            {/* Price perception */}
                            <Card className="glass lg:col-span-1">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Wallet className="h-4 w-4 text-cyan-400" />
                                        Preis-Wahrnehmung
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {[
                                        { label: "Sehr fair / Schnäppchen", keys: ["sehr_fair", "schnäppchen"], color: "from-emerald-500 to-emerald-400" },
                                        { label: "Fair / OK", keys: ["preis_leistung", "fair"], color: "from-cyan-500 to-cyan-400" },
                                        { label: "Etwas teuer", keys: ["etwas_teuer", "teuer"], color: "from-amber-500 to-amber-400" },
                                        { label: "Zu teuer", keys: ["zu_teuer"], color: "from-red-500 to-red-400" },
                                    ].map((opt) => {
                                        const count = opt.keys.reduce((acc, k) => acc + (stats!.priceCounts[k] || 0), 0)
                                        const pct = feedback.length > 0 ? (count / feedback.length) * 100 : 0
                                        return (
                                            <div key={opt.label} className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">{opt.label}</span>
                                                    <span className="font-bold tabular-nums">{count}</span>
                                                </div>
                                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", opt.color)}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </CardContent>
                            </Card>

                            {/* Regional */}
                            <Card className="glass lg:col-span-1">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-purple-400" />
                                        Top PLZ-Gebiete
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {stats!.topZips.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-6">Keine PLZ-Daten</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {stats!.topZips.map((item, idx) => (
                                                <div key={item.zip} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 border border-border/50 hover:bg-muted/60 transition-colors">
                                                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                                        <span className="text-[10px] font-black text-purple-400">{idx + 1}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold">{item.zip}</p>
                                                        <p className="text-[10px] text-muted-foreground">{item.count} {item.count === 1 ? "Kunde" : "Kunden"}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-amber-400">
                                                        <span className="text-xs font-bold tabular-nums">{item.avgRating.toFixed(1)}</span>
                                                        <Star className="h-3 w-3 fill-current" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* ── Recent Feedback Feed ── */}
                        <Card className="glass">
                            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
                                <div>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4 text-primary" />
                                        Neuestes Kundenfeedback
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-0.5">
                                        Die letzten {Math.min(feedback.length, 10)} Bewertungen
                                    </CardDescription>
                                </div>
                                {feedback.length > 10 && (
                                    <Badge variant="outline" className="gap-1 text-xs cursor-pointer hover:bg-muted/50 transition-colors">
                                        Alle anzeigen <ChevronRight className="h-3 w-3" />
                                    </Badge>
                                )}
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-3">
                                    {feedback.slice(0, 10).map((item) => (
                                        <div
                                            key={item.id}
                                            className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-3 hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    {/* Avatar placeholder */}
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center shrink-0">
                                                        <Star className="h-4 w-4 text-primary/60" />
                                                    </div>
                                                    <div>
                                                        <StarRow rating={item.rating} small />
                                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                                            {format(new Date(item.created_at), "d. MMMM yyyy", { locale: de })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "capitalize text-[10px] border shrink-0",
                                                        item.price_perception && PRICE_COLOR[item.price_perception] 
                                                            ? PRICE_COLOR[item.price_perception] 
                                                            : "bg-muted/50 text-muted-foreground"
                                                    )}
                                                >
                                                    {item.price_perception 
                                                        ? (PRICE_LABEL[item.price_perception] || item.price_perception.replace('_', ' ')) 
                                                        : (item.main_value || "Keine Angabe")}
                                                </Badge>
                                            </div>

                                            {item.comment && (
                                                <p className="text-sm text-foreground/80 italic leading-relaxed pl-12">
                                                    „{item.comment}"
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between pt-1 border-t border-border/30 pl-12">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-muted-foreground font-mono">#{item.order?.order_number}</span>
                                                    {item.order?.bike_model && (
                                                        <>
                                                            <span className="text-muted-foreground/30 text-[10px]">·</span>
                                                            <span className="text-[10px] text-muted-foreground">{item.order.bike_model}</span>
                                                        </>
                                                    )}
                                                </div>
                                                {item.customer_postal_code && (
                                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                        <MapPin className="h-3 w-3" />
                                                        {item.customer_postal_code}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Value Drivers breakdown */}
                        <Card className="glass">
                            <CardHeader className="pb-3 border-b border-border/50">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-yellow-400" />
                                    Was schätzen Kunden am meisten?
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        { key: "qualitaet", label: "Qualität & Sicherheit", icon: "🛡️" },
                                        { key: "schnelligkeit", label: "Schnelligkeit", icon: "⚡" },
                                        { key: "beratung", label: "Beratung", icon: "💬" },
                                        { key: "preis", label: "Günstiger Preis", icon: "💰" },
                                    ].map((driver) => {
                                        const count = stats!.valueCounts[driver.key] || 0
                                        const pct = feedback.length > 0 ? Math.round((count / feedback.length) * 100) : 0
                                        const isTop = driver.key === stats!.topValueDriver
                                        return (
                                            <div
                                                key={driver.key}
                                                className={cn(
                                                    "rounded-2xl p-4 border text-center space-y-2 transition-all",
                                                    isTop
                                                        ? "bg-primary/10 border-primary/25"
                                                        : "bg-muted/30 border-border/40"
                                                )}
                                            >
                                                <span className="text-2xl">{driver.icon}</span>
                                                <p className="text-xs font-semibold text-muted-foreground leading-tight">{driver.label}</p>
                                                <p className={cn("text-2xl font-black tabular-nums", isTop ? "text-primary" : "text-foreground")}>
                                                    {pct}%
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">{count} {count === 1 ? "Stimme" : "Stimmen"}</p>
                                                {isTop && (
                                                    <Badge variant="outline" className="text-[9px] border-primary/30 text-primary bg-primary/5 px-2 py-0.5">
                                                        Top
                                                    </Badge>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </DashboardLayout>
    )
}
