import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { 
    Star, 
    MessageSquare, 
    Zap,
    Loader2,
    TrendingUp,
    Users,
    ChevronRight,
    ChevronDown,
    Sparkles,
    ShieldCheck,
    MessageCircle,
    ThumbsUp,
    BrainCircuit,
    CheckCircle2
} from "lucide-react"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

function StarRow({ rating, small }: { rating: number; small?: boolean }) {
    return (
        <div className={cn("flex gap-0.5", small ? "items-center" : "")}>
            {[1, 2, 3, 4, 5].map((s) => (
                <Star
                    key={s}
                    className={cn(
                        small ? "h-3 w-3" : "h-4 w-4",
                        s <= rating
                            ? "fill-foreground text-foreground"
                            : "text-muted-foreground/20 fill-muted/20"
                    )}
                />
            ))}
        </div>
    )
}

function FeedbackItem({ item }: { item: any }) {
    const [expanded, setExpanded] = useState(false)
    const hasComment = !!item.comment
    const hasTags = !!item.price_perception || !!item.main_value
    
    return (
        <div 
            onClick={() => setExpanded(!expanded)}
            className={cn(
                "bg-card border rounded-3xl p-5 md:p-6 transition-all cursor-pointer group shadow-none",
                expanded ? "border-foreground/30 shadow-sm" : "border-border/40 hover:border-border/80"
            )}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center shrink-0 border border-border/40 group-hover:bg-muted transition-colors mt-0.5">
                    <MessageSquare className={cn("h-4 w-4 transition-colors", expanded ? "text-foreground" : "text-muted-foreground/80")} />
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <StarRow rating={item.rating} small />
                        <span className="text-xs font-semibold text-foreground">
                            #{item.order?.order_number || item.id.substring(0,8)}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
                            {format(new Date(item.created_at), "dd.MM.yyyy", { locale: de })}
                        </span>
                    </div>
                    
                    <div className="mt-2.5">
                        <p className={cn(
                            "text-sm font-medium transition-all duration-200",
                            hasComment ? "text-foreground/90" : "text-muted-foreground/40 italic",
                            expanded ? "leading-relaxed whitespace-normal" : "truncate"
                        )}>
                            {hasComment ? `"${item.comment}"` : "Kein Kommentar hinterlassen"}
                        </p>
                    </div>

                    <AnimatePresence>
                        {expanded && hasTags && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                className="flex flex-wrap gap-2 overflow-hidden"
                            >
                                {item.price_perception && (
                                    <Badge variant="secondary" className="bg-muted/80 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground border-border/40 rounded-lg">
                                        Pricing: {PRICE_LABEL[item.price_perception] || item.price_perception}
                                    </Badge>
                                )}
                                {item.main_value && item.main_value.split(',').map((val: string) => (
                                    val.trim() && (
                                        <Badge key={val} variant="outline" className="px-2.5 py-1 text-[11px] font-semibold border-border/40 text-foreground/70 rounded-lg bg-background/50">
                                            {VALUE_DRIVER_LABELS[val.trim()] || val.trim()}
                                        </Badge>
                                    )
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="shrink-0 p-1 text-muted-foreground/40 group-hover:text-foreground/70 transition-colors mt-1">
                    <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="h-5 w-5" />
                    </motion.div>
                </div>
            </div>
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
                const key = curr.price_perception.trim()
                acc[key] = (acc[key] || 0) + 1
            }
            return acc
        }, {})

        const valueCounts = feedback.reduce((acc: any, curr) => {
            if (curr.main_value) {
                curr.main_value.split(',').forEach((v: string) => {
                    const key = v.trim()
                    acc[key] = (acc[key] || 0) + 1
                })
            }
            return acc
        }, {})

        const positivePrice = ['schnäppchen', 'sehr_fair', 'fair']
        const positivePriceCount = positivePrice.reduce((acc, k) => acc + (priceCounts[k] || 0), 0)
        
        // Count total price feedback votes
        const totalPriceVotes = Object.values(priceCounts).reduce((a: any, b: any) => a + b, 0) as number
        const positivePricePerc = totalPriceVotes > 0 ? positivePriceCount / totalPriceVotes : 0
        const tooCheapPerc = totalPriceVotes > 0 ? ((priceCounts['schnäppchen'] || 0) + (priceCounts['sehr_fair'] || 0)) / totalPriceVotes : 0

        // Rating distribution
        const ratingDist = [5, 4, 3, 2, 1].map(r => ({
            rating: r,
            count: feedback.filter(f => f.rating === r).length,
        }))

        const valueEntries = Object.entries(valueCounts)
        const topValueDriver = valueEntries.length > 0
            ? valueEntries.sort((a: any, b: any) => b[1] - a[1])[0][0]
            : null

        return {
            avgRating,
            priceCounts,
            totalPriceVotes,
            valueCounts,
            positivePricePerc,
            tooCheapPerc,
            topValueDriver,
            ratingDist,
        }
    }, [feedback])

    const generateInsightText = () => {
        if (!stats) return null
        if (feedback.length < 3) return "Zu wenig Daten für eine KI-Analyse. Sammle mehr Kundenfeedbackpunkt, um strategische Insights zu erhalten."
        
        const isPerfect = stats.avgRating >= 4.8
        const ratingText = isPerfect ? "Dein Service ist exzellent bewertet." : `Dein Durchschnitt von ${stats.avgRating.toFixed(1)} ist solide.`
        
        let priceText = "Die wahrgenommenen Preise entsprechen der Markterwartung."
        if (stats.tooCheapPerc > 0.5) {
            priceText = `Bemerkenswert: ${Math.round(stats.tooCheapPerc * 100)}% deiner Kunden empfinden deine Preise als "Schnäppchen" oder "sehr fair". Du bist potenziell unter Wert verkauft – erwäge eine moderate Preiserhöhung.`
        } else if (stats.positivePricePerc < 0.3) {
            priceText = "Achtung: Einige Kunden empfinden die Preise im Verhältnis zur Leistung als zu hoch. Überprüfe die Positionierung."
        }

        let valueText = ""
        if (stats.topValueDriver) {
             valueText = ` Als stärkster Qualitätsfaktor hat sich "${VALUE_DRIVER_LABELS[stats.topValueDriver] || stats.topValueDriver}" herauskristallisiert.`
        }

        return `${ratingText} ${priceText}${valueText}`
    }

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
                </div>
            </DashboardLayout>
        )
    }

    const hasData = feedback.length > 0

    return (
        <DashboardLayout>
            <div className="max-w-[1200px] mx-auto space-y-10 pb-16 px-4 md:px-8 pt-6">

                {/* ── Page Header ── */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="flex flex-col md:flex-row md:items-end justify-between gap-6"
                >
                    <div className="space-y-2">
                        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Kundenfeedback</h1>
                        <p className="text-muted-foreground text-sm xl:text-base max-w-xl leading-relaxed">
                            Analysiere die Zufriedenheit und Preistoleranz deiner Kunden. Nutze diese echten Daten, 
                            um deine Marktpositionierung und Preisstrategie zu optimieren.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        {stats && stats.tooCheapPerc > 0.5 && (
                            <Badge variant="outline" className="px-3.5 py-1.5 text-xs font-semibold gap-2 border-foreground/20 bg-foreground/5 shadow-sm text-foreground">
                                <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                                Preispotenzial: Hoch
                            </Badge>
                        )}
                        <Badge variant="outline" className="px-3.5 py-1.5 text-xs font-medium gap-2 border-border/50 bg-card shadow-sm">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            {feedback.length} Bewertungen
                        </Badge>
                    </div>
                </motion.div>

                {!hasData ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <Card className="bg-card/30 border-dashed border-border/50 shadow-none">
                            <CardContent className="flex flex-col items-center justify-center py-32 text-center gap-6">
                                <div className="w-20 h-20 rounded-3xl bg-muted/40 flex items-center justify-center border border-border/40">
                                    <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                                </div>
                                <div className="max-w-md">
                                    <p className="font-semibold text-foreground text-lg tracking-tight">Noch kein Kundenfeedback</p>
                                    <p className="text-sm text-muted-foreground/80 mt-2 leading-relaxed">
                                        Sobald Kunden nach Abholung ihres Fahrrads das Feedback-Formular ausfüllen, 
                                        fließen die Daten live in diese Analyse ein.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ) : (
                    <div className="space-y-12">
                        {/* ── Premium AI Insights ── */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                            className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.03] via-card to-background p-8 md:p-10 shadow-sm relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-1000 pointer-events-none transform translate-x-12 -translate-y-12">
                                <BrainCircuit className="w-64 h-64" />
                            </div>
                            <div className="relative z-10 flex flex-col gap-4">
                                <div className="flex items-center gap-2.5">
                                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                                    <h2 className="text-xs font-bold tracking-widest uppercase text-primary">Strategische Erkenntnisse</h2>
                                </div>
                                <p className="text-lg md:text-xl font-medium text-foreground/90 leading-relaxed max-w-4xl tracking-tight">
                                    {generateInsightText()}
                                </p>
                            </div>
                        </motion.div>

                        {/* ── KPI Row ── */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                            className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
                        >
                            <Card className="bg-card border-border/30 shadow-none overflow-hidden flex flex-col justify-center py-5 rounded-3xl">
                                <CardContent className="p-6 md:p-8 space-y-5">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Ø Kundenurteil</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-6xl font-black text-foreground tabular-nums tracking-tighter">
                                            {stats!.avgRating.toFixed(1)}
                                        </span>
                                        <span className="text-base font-medium text-muted-foreground hidden sm:inline-block">/ 5</span>
                                    </div>
                                    <StarRow rating={Math.round(stats!.avgRating)} />
                                </CardContent>
                            </Card>

                            <Card className="bg-card border-border/30 shadow-none overflow-hidden flex flex-col justify-center py-5 rounded-3xl">
                                <CardContent className="p-6 md:p-8 space-y-5">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Preis-Wert-Fit</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-6xl font-black tabular-nums tracking-tighter text-foreground">
                                            {Math.round(stats!.positivePricePerc * 100)}%
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                                        finden den Preis angemessen oder sogar günstig
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="col-span-2 bg-card border-border/30 shadow-none overflow-hidden rounded-3xl">
                                <CardContent className="p-6 md:p-8 h-full flex flex-col justify-between">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-6">Preis-Wahrnehmung Detail</p>
                                    <div className="space-y-5 flex-1 justify-center flex flex-col">
                                        {[
                                            { label: "Schnäppchen / Sehr fair", keys: ["schnäppchen", "sehr_fair"], color: "bg-foreground" },
                                            { label: "Angemessen", keys: ["fair"], color: "bg-foreground/40" },
                                            { label: "Zu teuer / Gehoben", keys: ["etwas_teuer", "zu_teuer"], color: "bg-muted-foreground/20" },
                                        ].map((opt) => {
                                            const count = opt.keys.reduce((acc, k) => acc + (stats!.priceCounts[k] || 0), 0)
                                            const pct = stats!.totalPriceVotes > 0 ? (count / stats!.totalPriceVotes) * 100 : 0
                                            return (
                                                <div key={opt.label} className="space-y-2">
                                                    <div className="flex justify-between text-xs font-medium">
                                                        <span className="text-muted-foreground">{opt.label}</span>
                                                        <span className="tabular-nums font-semibold text-foreground">{count}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className={cn("h-full rounded-full transition-all duration-1000 ease-out", opt.color)}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* ── Main Insights Grid ── */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                        >
                            
                            {/* Value Drivers */}
                            <Card className="bg-card border-border/30 shadow-none flex flex-col rounded-3xl">
                                <CardHeader className="p-6 md:p-8 pb-4">
                                    <CardTitle className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Wichtigste Stärken</CardTitle>
                                    <CardDescription className="text-xs text-foreground/50">Was Kunden besonders hervorheben</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 p-6 md:p-8 pt-0">
                                    <div className="grid grid-cols-2 gap-4 h-full">
                                        {Object.entries(VALUE_DRIVER_LABELS).map(([key, label]) => {
                                            const count = stats!.valueCounts[key] || 0
                                            const pct = feedback.length > 0 ? Math.round((count / feedback.length) * 100) : 0
                                            const isTop = key === stats!.topValueDriver
                                            const Icon = VALUE_DRIVER_ICONS[key] || CheckCircle2

                                            return (
                                                <div
                                                    key={key}
                                                    className={cn(
                                                        "rounded-[1.25rem] p-5 border flex flex-col items-start gap-4 transition-all duration-300",
                                                        isTop
                                                            ? "bg-foreground/[0.03] border-foreground/10"
                                                            : "bg-transparent border-border/40 opacity-70 hover:opacity-100"
                                                    )}
                                                >
                                                    <div className={cn("p-2 rounded-xl border", isTop ? "border-foreground/20 text-foreground bg-background" : "border-transparent text-muted-foreground bg-muted/40")}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className={cn("text-4xl font-black tabular-nums mb-1 tracking-tighter", isTop ? "text-foreground" : "text-foreground/80")}>
                                                            {pct}%
                                                        </p>
                                                        <p className="text-xs font-semibold text-muted-foreground tracking-wide">{label}</p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Rating Distrib */}
                            <div className="grid grid-rows-1 gap-6">
                                <Card className="bg-card border-border/30 shadow-none w-full h-full rounded-3xl flex flex-col">
                                    <CardHeader className="p-6 md:p-8 pb-4">
                                        <CardTitle className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Sterne-Verteilung</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-1 p-6 md:p-8 pt-0 flex flex-col justify-center gap-1.5">
                                        {stats!.ratingDist.map(({ rating: r, count }) => {
                                            const pct = feedback.length > 0 ? (count / feedback.length) * 100 : 0
                                            return (
                                                <div key={r} className="flex items-center gap-4 py-2">
                                                    <div className="flex items-center gap-1.5 w-10 shrink-0 justify-end">
                                                        <span className="text-xs font-bold tabular-nums text-foreground">{r}</span>
                                                        <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
                                                    </div>
                                                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-foreground transition-all duration-1000 ease-out"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-semibold text-muted-foreground w-8 text-right tabular-nums">{count}</span>
                                                </div>
                                            )
                                        })}
                                    </CardContent>
                                </Card>
                            </div>

                        </motion.div>

                        {/* ── Feed ── */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
                            className="pt-8"
                        >
                            <div className="flex items-center justify-between mb-8 px-2">
                                <h3 className="text-xl font-bold tracking-tight">Letzte Bewertungen</h3>
                                {feedback.length > 5 && (
                                    <Button variant="ghost" size="sm" className="text-xs font-semibold tracking-wide text-muted-foreground hover:text-foreground">
                                        Alle ansehen <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-4">
                                {feedback.slice(0, 5).map((item) => (
                                    <FeedbackItem key={item.id} item={item} />
                                ))}
                            </div>
                        </motion.div>

                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
