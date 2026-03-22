import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import {
    CheckCircle2,
    Clock,
    Wrench,
    PackageCheck,
    MapPin,
    Phone,
    Mail,
    Bike,
    AlertCircle,
    Loader2,
    Star,
    MessageSquare,
    CreditCard,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { OrderFeedback } from "@/components/OrderFeedback"
import type { PublicOrderStatus } from "@/types/index"

const STATUS_STEPS = [
    {
        value: 'eingegangen',
        label: 'Eingegangen',
        sublabel: 'Wir haben Ihren Auftrag erhalten.',
        icon: Clock,
        colorClass: 'text-blue-500',
        bgClass: 'bg-blue-500/10',
        borderClass: 'border-blue-500/30',
        dotColor: '#3b82f6',
    },
    {
        value: 'warten_auf_teile',
        label: 'Warten auf Teile',
        sublabel: 'Wir bestellen die nötigen Ersatzteile.',
        icon: AlertCircle,
        colorClass: 'text-amber-500',
        bgClass: 'bg-amber-500/10',
        borderClass: 'border-amber-500/30',
        dotColor: '#f59e0b',
    },
    {
        value: 'in_bearbeitung',
        label: 'In Bearbeitung',
        sublabel: 'Unser Team arbeitet an Ihrem Rad.',
        icon: Wrench,
        colorClass: 'text-purple-500',
        bgClass: 'bg-purple-500/10',
        borderClass: 'border-purple-500/30',
        dotColor: '#a855f7',
    },
    {
        value: 'abholbereit',
        label: 'Abholbereit',
        sublabel: 'Ihr Fahrrad ist fertig – bereit zur Abholung!',
        icon: PackageCheck,
        colorClass: 'text-emerald-500',
        bgClass: 'bg-emerald-500/10',
        borderClass: 'border-emerald-500/30',
        dotColor: '#22c55e',
    },
    {
        value: 'abgeholt',
        label: 'Abgeholt',
        sublabel: 'Gute Fahrt! Wir freuen uns auf dein Feedback.',
        icon: Star,
        colorClass: 'text-primary',
        bgClass: 'bg-primary/10',
        borderClass: 'border-primary/30',
        dotColor: 'var(--velofix-primary)',
    },
]

export default function OrderStatusPage() {
    const { orderId } = useParams<{ orderId: string }>()
    const [order, setOrder] = useState<PublicOrderStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId) return
            try {
                const { data, error } = await supabase
                    .rpc('get_public_order_status', { p_order_id: orderId })

                if (error) throw error
                if (!data) throw new Error("Auftrag nicht gefunden")

                if (data.customer_note === undefined || data.estimated_price === undefined || data.bike_brand === undefined || data.bike_color === undefined || !data.workshop_id) {
                    try {
                        const { data: directData } = await supabase
                            .from('orders')
                            .select('customer_note, estimated_price, bike_brand, bike_color, workshop_id')
                            .eq('id', orderId)
                            .single()
                        if (directData) {
                            data.customer_note = directData.customer_note
                            data.estimated_price = directData.estimated_price
                            data.bike_brand = directData.bike_brand
                            data.bike_color = directData.bike_color
                            if (!data.workshop_id) data.workshop_id = directData.workshop_id
                        }
                    } catch (e) {
                        console.warn("Could not fetch extra fields directly:", e)
                    }
                }

                const wsId = data.workshop_id || data.workshop?.id
                if (wsId) {
                    try {
                        const { data: wsData } = await supabase
                            .from('workshops')
                            .select('google_review_url')
                            .eq('id', wsId)
                            .maybeSingle()
                        if (wsData) {
                            if (!data.workshop) data.workshop = {}
                            data.workshop.google_review_url = wsData.google_review_url
                        }
                    } catch (e) {
                        console.warn("Could not fetch workshop google review url:", e)
                    }
                }

                setOrder(data)
            } catch (err: unknown) {
                console.error("Error fetching status:", err)
                setError(err instanceof Error ? err.message : JSON.stringify(err))
            } finally {
                setLoading(false)
            }
        }
        fetchOrder()
    }, [orderId])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
                <div className="relative">
                    <div className="w-14 h-14 rounded-full border-2 border-primary/20 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">Lade Auftrag…</p>
            </div>
        )
    }

    if (error || !order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-background">
                <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-5">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <h1 className="text-2xl font-extrabold mb-2">Auftrag nicht gefunden</h1>
                <p className="text-sm text-muted-foreground max-w-xs">{error || "Bitte überprüfen Sie den Link oder kontaktieren Sie uns."}</p>
            </div>
        )
    }

    const getEffectiveStatus = (status: string) => {
        if (status === 'abgeschlossen') return 'abgeholt'
        if (status === 'kontrolle' || status === 'kontrolle_offen') return 'in_bearbeitung'
        return status
    }

    const effectiveStatus = getEffectiveStatus(order.status)
    const currentStatusIndex = STATUS_STEPS.findIndex(s => s.value === effectiveStatus)
    const activeIndex = currentStatusIndex === -1 ? 0 : currentStatusIndex
    const activeStep = STATUS_STEPS[activeIndex]
    const progressPct = activeIndex / (STATUS_STEPS.length - 1)

    const formatDate = (dateString: string) => {
        if (!dateString) return "Datum unbekannt"
        try {
            const date = new Date(dateString)
            if (isNaN(date.getTime())) return "Datum ungültig"
            return date.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })
        } catch { return dateString }
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Premium top accent */}
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent" />

            <div className="max-w-lg mx-auto px-4 py-10 space-y-5">

                {/* ── Header ── */}
                <div className="text-center space-y-1.5 pb-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">
                        Reparatur-Status
                    </p>
                    <h1 className="text-3xl font-extrabold tracking-tight">{order.workshop?.name || "VeloFix"}</h1>
                    <p className="text-sm text-muted-foreground">
                        Auftrag #{order.order_number} · {formatDate(order.created_at ?? order.created_date ?? '')}
                    </p>
                </div>

                {/* ── Active State Hero ── */}
                <div className={cn(
                    "relative overflow-hidden rounded-3xl p-7 text-center space-y-4 border-2",
                    activeStep.bgClass,
                    activeStep.borderClass,
                )}>
                    {/* Subtle radial glow */}
                    <div
                        className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{ background: `radial-gradient(ellipse at 50% 0%, ${activeStep.dotColor}40 0%, transparent 70%)` }}
                    />

                    <div className="relative flex justify-center">
                        <div className={cn(
                            "relative w-[76px] h-[76px] rounded-full flex items-center justify-center border-2",
                            activeStep.bgClass,
                            activeStep.borderClass,
                        )}>
                            <activeStep.icon className={cn("h-8 w-8", activeStep.colorClass)} />
                            <span
                                className="absolute inset-0 rounded-full animate-ping opacity-20"
                                style={{ background: activeStep.dotColor + '33' }}
                            />
                        </div>
                    </div>

                    <div className="relative">
                        <p className={cn("text-[10px] font-bold uppercase tracking-[0.22em] mb-1", activeStep.colorClass)}>
                            Aktueller Status
                        </p>
                        <h2 className="text-2xl font-extrabold">{activeStep.label}</h2>
                        <p className="text-sm text-muted-foreground mt-1.5">{activeStep.sublabel}</p>
                    </div>
                </div>

                {/* ── Feedback Section ── */}
                {effectiveStatus === 'abgeholt' && (
                    <div className="space-y-4 pt-1">
                        {/* Section header */}
                        <div className="flex items-center gap-3 px-1">
                            <div className="flex-1 h-px bg-gradient-to-r from-border/0 via-border to-border/0" />
                            <div className="flex items-center gap-1.5 shrink-0">
                                <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">
                                    Dein Feedback
                                </p>
                                <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                            </div>
                            <div className="flex-1 h-px bg-gradient-to-r from-border/0 via-border to-border/0" />
                        </div>

                        <OrderFeedback
                            orderId={order.id}
                            workshopId={order.workshop_id || order.workshop?.id || ''}
                            googleReviewUrl={order.workshop?.google_review_url ?? undefined}
                        />
                    </div>
                )}

                {/* ── Warnings ── */}
                {order.checklist && Array.isArray(order.checklist) && order.checklist.some((item: any) => item.warning) && (
                    <div className="space-y-2">
                        {order.checklist.filter((item: any) => item.warning).map((item: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 rounded-2xl p-4 bg-destructive/8 border border-destructive/25">
                                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-destructive">Wichtige Information</p>
                                    <p className="text-sm text-destructive/80 mt-0.5">{item.text}</p>
                                    {item.notes && <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Progress Track ── */}
                <div className="rounded-3xl overflow-hidden bg-card border border-border/50 shadow-sm">
                    {/* Progress bar */}
                    <div className="h-1 bg-muted/30">
                        <div
                            className="h-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-1000 ease-out"
                            style={{ width: `${progressPct * 100}%` }}
                        />
                    </div>

                    <div className="p-5 space-y-0">
                        {STATUS_STEPS.map((step, index) => {
                            const isActive = index === activeIndex
                            const isCompleted = index < activeIndex
                            const isFuture = index > activeIndex
                            const Icon = step.icon

                            return (
                                <div key={step.value} className="flex items-start gap-4 group">
                                    <div className="flex flex-col items-center">
                                        <div className={cn(
                                            "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 border-2",
                                            isActive && cn(step.bgClass, step.borderClass, "scale-110 shadow-sm"),
                                            isCompleted && cn(step.bgClass, step.borderClass),
                                            isFuture && "bg-muted border-border",
                                        )}>
                                            {isCompleted ? (
                                                <CheckCircle2 className={cn("h-4 w-4", step.colorClass)} />
                                            ) : (
                                                <Icon className={cn(
                                                    "h-4 w-4",
                                                    isActive ? step.colorClass : "text-muted-foreground/30",
                                                    isActive && "animate-pulse"
                                                )} />
                                            )}
                                        </div>
                                        {index < STATUS_STEPS.length - 1 && (
                                            <div className={cn(
                                                "w-px flex-1 my-1 min-h-[20px]",
                                                isCompleted ? "bg-border" : "bg-border/30"
                                            )} />
                                        )}
                                    </div>

                                    <div className={cn(
                                        "pb-5 flex-1 mt-1.5 transition-all duration-500",
                                        isFuture && "opacity-30"
                                    )}>
                                        <p className={cn(
                                            "font-semibold text-sm leading-tight",
                                            isActive ? step.colorClass : isCompleted ? "text-foreground/70" : "text-muted-foreground/30"
                                        )}>
                                            {step.label}
                                        </p>
                                        {isActive && (
                                            <p className="text-xs text-muted-foreground mt-0.5 animate-in fade-in duration-700">
                                                {step.sublabel}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* ── Details Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* Bike card */}
                    <div className="rounded-2xl p-5 space-y-3 bg-card border border-border/50 shadow-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Bike className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Ihr Fahrrad</span>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-0.5">Modell</p>
                            <p className="text-sm font-semibold">
                                {order.bike_brand && <span>{order.bike_brand} </span>}
                                {order.bike_model || "Keine Angabe"}
                                {order.bike_color && <span className="text-muted-foreground font-normal"> · {order.bike_color}</span>}
                            </p>
                        </div>
                        {order.customer_note && (
                            <div className="pt-3 border-t border-border/40">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <MessageSquare className="h-3 w-3 text-muted-foreground/50" />
                                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Ihr Wunsch</p>
                                </div>
                                <p className="text-sm text-muted-foreground italic leading-relaxed">"{order.customer_note}"</p>
                            </div>
                        )}
                        {order.estimated_price !== undefined && order.estimated_price !== null && (
                            <div className="pt-3 border-t border-border/40 flex justify-between items-center">
                                <div className="flex items-center gap-1.5">
                                    <CreditCard className="h-3 w-3 text-muted-foreground/50" />
                                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Geschätzt</p>
                                </div>
                                <p className="text-base font-extrabold">
                                    {typeof order.estimated_price === 'number'
                                        ? order.estimated_price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                        : order.estimated_price} €
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Contact card */}
                    <div className="rounded-2xl p-5 space-y-3 bg-card border border-border/50 shadow-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Kontakt</span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold">{order.workshop?.name}</p>
                            {(order.workshop?.address || order.workshop?.city) && (
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                    {order.workshop?.address && <>{order.workshop.address}<br /></>}
                                    {order.workshop?.postal_code} {order.workshop?.city}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2 pt-3 border-t border-border/40">
                            {order.workshop?.phone && (
                                <a
                                    href={`tel:${order.workshop.phone}`}
                                    className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                                >
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted/60 group-hover:bg-muted transition-colors">
                                        <Phone className="h-3.5 w-3.5" />
                                    </div>
                                    {order.workshop.phone}
                                </a>
                            )}
                            {order.workshop?.email && (
                                <a
                                    href={`mailto:${order.workshop.email}`}
                                    className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                                >
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted/60 group-hover:bg-muted transition-colors">
                                        <Mail className="h-3.5 w-3.5" />
                                    </div>
                                    {order.workshop.email}
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Footer ── */}
                <p className="text-center text-xs text-muted-foreground/30 pt-2">
                    © {new Date().getFullYear()} {order.workshop?.name || "VeloFix"}
                </p>
            </div>
        </div>
    )
}
