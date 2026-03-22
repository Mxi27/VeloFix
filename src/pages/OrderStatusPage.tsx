import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import {
    Check,
    Clock,
    Wrench,
    PackageCheck,
    MapPin,
    Phone,
    Mail,
    Bike,
    AlertTriangle,
    Loader2,
    Star,
    MessageSquare,
    Package,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { OrderFeedback } from "@/components/OrderFeedback"
import type { PublicOrderStatus } from "@/types/index"

// ── Status Steps ─────────────────────────────────────────────────────────────

const STATUS_STEPS = [
    { value: 'eingegangen', label: 'Eingegangen', icon: Clock },
    { value: 'warten_auf_teile', label: 'Teile', icon: Package },
    { value: 'in_bearbeitung', label: 'In Arbeit', icon: Wrench },
    { value: 'abholbereit', label: 'Abholbereit', icon: PackageCheck },
    { value: 'abgeholt', label: 'Abgeholt', icon: Star },
]

const STATUS_MESSAGES: Record<string, { title: string; subtitle: string; icon: React.ElementType; gradient: string }> = {
    eingegangen: {
        title: 'Auftrag eingegangen',
        subtitle: 'Wir haben Ihren Auftrag erhalten und kümmern uns darum.',
        icon: Clock,
        gradient: 'from-blue-500/20 to-blue-600/5 text-blue-400 ring-blue-500/20',
    },
    warten_auf_teile: {
        title: 'Teile werden bestellt',
        subtitle: 'Wir besorgen die benötigten Ersatzteile für Ihre Reparatur.',
        icon: Package,
        gradient: 'from-amber-500/20 to-amber-600/5 text-amber-400 ring-amber-500/20',
    },
    in_bearbeitung: {
        title: 'Wird repariert',
        subtitle: 'Unser Team arbeitet gerade an Ihrem Fahrrad.',
        icon: Wrench,
        gradient: 'from-purple-500/20 to-purple-600/5 text-purple-400 ring-purple-500/20',
    },
    abholbereit: {
        title: 'Bereit zur Abholung!',
        subtitle: 'Ihr Fahrrad ist fertig und wartet auf Sie.',
        icon: PackageCheck,
        gradient: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400 ring-emerald-500/20',
    },
    abgeholt: {
        title: 'Abgeholt',
        subtitle: 'Gute Fahrt! Wir freuen uns über Ihr Feedback.',
        icon: Bike,
        gradient: 'from-primary/20 to-primary/5 text-primary ring-primary/20',
    },
}

// ── Component ────────────────────────────────────────────────────────────────

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
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error || !order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-background">
                <div className="text-4xl mb-4">🔍</div>
                <h1 className="text-xl font-bold mb-1">Auftrag nicht gefunden</h1>
                <p className="text-sm text-muted-foreground max-w-xs">
                    {error || "Bitte überprüfen Sie den Link oder kontaktieren Sie uns."}
                </p>
            </div>
        )
    }

    const getEffectiveStatus = (status: string) => {
        if (status === 'abgeschlossen') return 'abgeholt'
        if (status === 'kontrolle' || status === 'kontrolle_offen') return 'in_bearbeitung'
        return status
    }

    const effectiveStatus = getEffectiveStatus(order.status)
    const activeIndex = Math.max(0, STATUS_STEPS.findIndex(s => s.value === effectiveStatus))
    const statusMessage = STATUS_MESSAGES[effectiveStatus] || STATUS_MESSAGES.eingegangen

    const formatDate = (dateString: string) => {
        if (!dateString) return ""
        try {
            const date = new Date(dateString)
            if (isNaN(date.getTime())) return ""
            return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
        } catch { return dateString }
    }

    const bikeDisplay = [order.bike_brand, order.bike_model].filter(Boolean).join(' ') || 'Keine Angabe'
    const dateDisplay = formatDate(order.created_at ?? order.created_date ?? '')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const warnings = order.checklist && Array.isArray(order.checklist) ? order.checklist.filter((item: any) => item.warning) : []

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-md mx-auto px-5 py-8 sm:py-14">

                {/* ── Workshop name ── */}
                <p className="text-center text-sm font-medium text-muted-foreground/60 mb-10">
                    {order.workshop?.name || "VeloFix"}
                </p>

                {/* ── Hero Status ── */}
                <div className="text-center mb-10">
                    <div className={cn(
                        "h-16 w-16 rounded-2xl mx-auto mb-5 flex items-center justify-center",
                        "bg-gradient-to-b ring-1 ring-inset",
                        statusMessage.gradient,
                    )}>
                        <statusMessage.icon className="h-7 w-7" />
                    </div>
                    <h1 className="text-[1.65rem] font-bold tracking-tight leading-tight mb-2">
                        {statusMessage.title}
                    </h1>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
                        {statusMessage.subtitle}
                    </p>
                </div>

                {/* ── Horizontal Progress ── */}
                <div className="mb-10 px-2">
                    {/* Dots + Line */}
                    <div className="relative flex items-center justify-between">
                        {/* Background line */}
                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-border/30 rounded-full" />
                        {/* Progress line */}
                        <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-primary rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${(activeIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                        />

                        {STATUS_STEPS.map((step, i) => {
                            const isCompleted = i < activeIndex
                            const isActive = i === activeIndex
                            const isFuture = i > activeIndex

                            return (
                                <div key={step.value} className="relative z-10 flex flex-col items-center">
                                    <div className={cn(
                                        "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-500",
                                        isCompleted && "bg-primary text-primary-foreground",
                                        isActive && "bg-primary text-primary-foreground ring-[3px] ring-primary/20 ring-offset-2 ring-offset-background",
                                        isFuture && "bg-muted/60 text-muted-foreground/30 border border-border/40",
                                    )}>
                                        {isCompleted ? (
                                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                        ) : (
                                            <step.icon className="h-3.5 w-3.5" />
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Labels */}
                    <div className="flex justify-between mt-2.5">
                        {STATUS_STEPS.map((step, i) => (
                            <span key={step.value} className={cn(
                                "text-[10px] font-medium w-12 text-center leading-tight",
                                i <= activeIndex ? "text-foreground/70" : "text-muted-foreground/30"
                            )}>
                                {step.label}
                            </span>
                        ))}
                    </div>
                </div>

                {/* ── Warnings ── */}
                {warnings.length > 0 && (
                    <div className="mb-6 space-y-2">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {warnings.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">{item.text}</p>
                                    {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Order Info ── */}
                <div className="rounded-2xl bg-card border border-border/40 overflow-hidden mb-6">
                    <div className="px-5 py-4 flex items-center justify-between border-b border-border/20">
                        <span className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">Auftragsdetails</span>
                        <span className="text-xs text-muted-foreground/40 font-mono">#{order.order_number}</span>
                    </div>

                    <div className="divide-y divide-border/15">
                        {/* Bike */}
                        <InfoRow
                            icon={Bike}
                            label="Fahrrad"
                            value={bikeDisplay}
                            sub={order.bike_color || undefined}
                        />

                        {/* Date */}
                        {dateDisplay && (
                            <InfoRow
                                icon={Clock}
                                label="Erstellt"
                                value={dateDisplay}
                            />
                        )}

                        {/* Customer note */}
                        {order.customer_note && (
                            <InfoRow
                                icon={MessageSquare}
                                label="Ihr Wunsch"
                                value={`„${order.customer_note}"`}
                                italic
                            />
                        )}

                        {/* Price */}
                        {order.estimated_price != null && (
                            <InfoRow
                                icon={({ className }: { className?: string }) => <span className={cn("text-xs font-bold", className)}>€</span>}
                                label="Kostenvoranschlag"
                                value={`${typeof order.estimated_price === 'number'
                                    ? order.estimated_price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                    : order.estimated_price} €`}
                                bold
                            />
                        )}
                    </div>
                </div>

                {/* ── Feedback ── */}
                {effectiveStatus === 'abgeholt' && (
                    <div className="mb-6">
                        <OrderFeedback
                            orderId={order.id}
                            workshopId={order.workshop_id || order.workshop?.id || ''}
                            googleReviewUrl={order.workshop?.google_review_url ?? undefined}
                        />
                    </div>
                )}

                {/* ── Contact ── */}
                {order.workshop && (order.workshop.phone || order.workshop.email || order.workshop.address) && (
                    <div className="rounded-2xl bg-card border border-border/40 overflow-hidden mb-8">
                        <div className="px-5 py-4 border-b border-border/20">
                            <span className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">Kontakt</span>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Workshop name + address */}
                            <div>
                                <p className="font-semibold text-sm">{order.workshop.name}</p>
                                {(order.workshop.address || order.workshop.city) && (
                                    <p className="text-sm text-muted-foreground/60 mt-0.5">
                                        {[order.workshop.address, [order.workshop.postal_code, order.workshop.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
                                    </p>
                                )}
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2">
                                {order.workshop.phone && (
                                    <a
                                        href={`tel:${order.workshop.phone}`}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/8 hover:bg-primary/12 text-sm font-medium text-primary transition-colors"
                                    >
                                        <Phone className="h-4 w-4" />
                                        Anrufen
                                    </a>
                                )}
                                {order.workshop.email && (
                                    <a
                                        href={`mailto:${order.workshop.email}`}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Mail className="h-4 w-4" />
                                        E-Mail
                                    </a>
                                )}
                                {order.workshop.address && (
                                    <a
                                        href={`https://maps.google.com/?q=${encodeURIComponent([order.workshop.address, order.workshop.postal_code, order.workshop.city].filter(Boolean).join(' '))}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <MapPin className="h-4 w-4" />
                                        Route
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Footer ── */}
                <p className="text-center text-[11px] text-muted-foreground/20 pb-4">
                    © {new Date().getFullYear()} {order.workshop?.name || "VeloFix"}
                </p>
            </div>
        </div>
    )
}

// ── InfoRow Component ────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value, sub, italic, bold }: {
    icon: React.ElementType
    label: string
    value: string
    sub?: string
    italic?: boolean
    bold?: boolean
}) {
    return (
        <div className="px-5 py-3.5 flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-muted/30 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-4 w-4 text-muted-foreground/40" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[11px] text-muted-foreground/40 font-medium">{label}</p>
                <p className={cn(
                    "text-sm mt-0.5",
                    italic && "italic text-muted-foreground",
                    bold && "font-semibold",
                    !italic && !bold && "font-medium",
                )}>
                    {value}
                    {sub && <span className="text-muted-foreground/50 font-normal"> · {sub}</span>}
                </p>
            </div>
        </div>
    )
}
