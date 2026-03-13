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

const STATUS_STEPS = [
    {
        value: 'eingegangen',
        label: 'Eingegangen',
        sublabel: 'Wir haben Ihren Auftrag erhalten.',
        icon: Clock,
        hex: '#3b82f6',  // Blue
        bg: 'rgba(59, 130, 246, 0.12)',
        border: 'rgba(59, 130, 246, 0.35)',
        glow: '0 0 30px rgba(59,130,246,0.3)',
    },
    {
        value: 'warten_auf_teile',
        label: 'Warten auf Teile',
        sublabel: 'Wir bestellen die nötigen Ersatzteile.',
        icon: AlertCircle,
        hex: '#f59e0b',  // Amber
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.35)',
        glow: '0 0 30px rgba(245,158,11,0.3)',
    },
    {
        value: 'in_bearbeitung',
        label: 'In Bearbeitung',
        sublabel: 'Unser Team arbeitet an Ihrem Rad.',
        icon: Wrench,
        hex: '#a855f7',  // Purple
        bg: 'rgba(168, 85, 247, 0.12)',
        border: 'rgba(168, 85, 247, 0.35)',
        glow: '0 0 30px rgba(168,85,247,0.3)',
    },
    {
        value: 'abholbereit',
        label: 'Abholbereit',
        sublabel: 'Ihr Fahrrad ist fertig – bereit zur Abholung!',
        icon: PackageCheck,
        hex: '#22c55e',  // Green
        bg: 'rgba(34, 197, 94, 0.12)',
        border: 'rgba(34, 197, 94, 0.35)',
        glow: '0 0 30px rgba(34,197,94,0.3)',
    },
    {
        value: 'abgeholt',
        label: 'Abgeholt',
        sublabel: 'Vielen Dank – gute Fahrt!',
        icon: Star,
        hex: '#06b6d4',  // Cyan
        bg: 'rgba(6, 182, 212, 0.12)',
        border: 'rgba(6, 182, 212, 0.35)',
        glow: '0 0 30px rgba(6,182,212,0.3)',
    },
]

export default function OrderStatusPage() {
    const { orderId } = useParams<{ orderId: string }>()
    const [order, setOrder] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        document.documentElement.classList.add('dark')

        const fetchOrder = async () => {
            if (!orderId) return

            try {
                const { data, error } = await supabase
                    .rpc('get_public_order_status', { p_order_id: orderId })

                if (error) throw error
                if (!data) throw new Error("Auftrag nicht gefunden")

                // Fallback direct fetch for fields not returned by RPC
                if (data.customer_note === undefined || data.estimated_price === undefined || data.bike_brand === undefined) {
                    try {
                        const { data: directData } = await supabase
                            .from('orders')
                            .select('customer_note, estimated_price, bike_brand')
                            .eq('id', orderId)
                            .single()

                        if (directData) {
                            data.customer_note = directData.customer_note
                            data.estimated_price = directData.estimated_price
                            data.bike_brand = directData.bike_brand
                        }
                    } catch (e) {
                        console.warn("Could not fetch extra fields directly:", e)
                    }
                }

                setOrder(data)
            } catch (err: any) {
                console.error("Error fetching status:", err)
                setError(err.message || JSON.stringify(err))
            } finally {
                setLoading(false)
            }
        }

        fetchOrder()
    }, [orderId])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen" style={{ background: 'radial-gradient(ellipse at top, #0f172a 0%, #080c14 60%)' }}>
                <div className="relative">
                    <div className="absolute inset-0 rounded-full blur-2xl opacity-40" style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
                    <Loader2 className="relative h-12 w-12 animate-spin text-blue-400" />
                </div>
                <p className="mt-6 text-slate-400 text-sm tracking-wider uppercase">Lade Auftrag…</p>
            </div>
        )
    }

    if (error || !order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center" style={{ background: 'radial-gradient(ellipse at top, #0f172a 0%, #080c14 60%)' }}>
                <AlertCircle className="h-14 w-14 text-red-400 mb-5" />
                <h1 className="text-3xl font-bold mb-2 text-white">Hoppla!</h1>
                <p className="text-slate-400 mb-2">{error || "Diesen Auftrag konnten wir leider nicht finden."}</p>
                <p className="text-sm text-slate-500">Bitte überprüfen Sie den Link oder kontaktieren Sie uns.</p>
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

    const formatDate = (dateString: string) => {
        if (!dateString) return "Datum unbekannt"
        try {
            const date = new Date(dateString)
            if (isNaN(date.getTime())) return "Datum ungültig"
            return date.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })
        } catch {
            return dateString
        }
    }

    const progressPct = activeIndex / (STATUS_STEPS.length - 1)

    return (
        <div
            className="min-h-screen relative"
            style={{
                background: 'radial-gradient(ellipse at top, #0f172a 0%, #080c14 70%)',
            }}
        >
            {/* Ambient glow from active status color */}
            <div
                className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[260px] opacity-20 blur-3xl pointer-events-none transition-all duration-1000"
                style={{ background: `radial-gradient(ellipse, ${activeStep.hex}, transparent 70%)` }}
            />

            <div className="relative max-w-lg mx-auto px-4 py-12 space-y-6">

                {/* ── Header ── */}
                <div className="text-center space-y-1 pb-2">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Reparatur-Status</p>
                    <h1 className="text-2xl font-extrabold text-white">{order.workshop?.name || "VeloFix"}</h1>
                    <p className="text-sm text-slate-500">Auftrag #{order.order_number} · {formatDate(order.created_at || order.created_date)}</p>
                </div>

                {/* ── Active State Hero ── */}
                <div
                    className="relative overflow-hidden rounded-3xl p-6 text-center space-y-3"
                    style={{
                        background: activeStep.bg,
                        border: `1px solid ${activeStep.border}`,
                        boxShadow: activeStep.glow,
                    }}
                >
                    {/* Shimmer ring */}
                    <div
                        className="absolute inset-0 rounded-3xl opacity-10"
                        style={{ background: `radial-gradient(circle at 50% 0%, ${activeStep.hex}, transparent 60%)` }}
                    />

                    {/* Icon */}
                    <div className="flex justify-center">
                        <div
                            className="relative w-20 h-20 rounded-full flex items-center justify-center"
                            style={{ background: activeStep.bg, border: `2px solid ${activeStep.border}`, boxShadow: activeStep.glow }}
                        >
                            <activeStep.icon className="h-9 w-9" style={{ color: activeStep.hex }} />
                            {/* Pulse ring */}
                            <span
                                className="absolute inset-0 rounded-full animate-ping opacity-20"
                                style={{ background: activeStep.hex }}
                            />
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] mb-1" style={{ color: activeStep.hex }}>Aktueller Status</p>
                        <h2 className="text-2xl font-extrabold text-white">{activeStep.label}</h2>
                        <p className="text-sm text-slate-400 mt-1">{activeStep.sublabel}</p>
                    </div>
                </div>

                {/* ── Warnings ── */}
                {order.checklist && Array.isArray(order.checklist) && order.checklist.some((item: any) => item.warning) && (
                    <div className="space-y-2">
                        {order.checklist.filter((item: any) => item.warning).map((item: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 rounded-2xl p-4 bg-red-500/10 border border-red-500/25">
                                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-red-300">Wichtige Information</p>
                                    <p className="text-sm text-red-300/80 mt-0.5">{item.text}</p>
                                    {item.notes && <p className="text-xs text-slate-500 mt-1">{item.notes}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Progress Track ── */}
                <div
                    className="rounded-3xl p-5 space-y-0"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                    {/* Thin progress bar at top */}
                    <div className="mb-5 h-1 rounded-full overflow-hidden bg-white/5">
                        <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{
                                width: `${progressPct * 100}%`,
                                background: `linear-gradient(90deg, #3b82f6, ${activeStep.hex})`
                            }}
                        />
                    </div>

                    {STATUS_STEPS.map((step, index) => {
                        const isActive = index === activeIndex
                        const isCompleted = index < activeIndex
                        const isFuture = index > activeIndex
                        const Icon = step.icon

                        return (
                            <div key={step.value} className="flex items-start gap-4 group">
                                {/* Timeline column */}
                                <div className="flex flex-col items-center">
                                    <div
                                        className={cn(
                                            "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-500",
                                            isActive && "scale-110"
                                        )}
                                        style={{
                                            background: isActive ? step.hex : isCompleted ? `${step.hex}25` : 'rgba(255,255,255,0.05)',
                                            border: `2px solid ${isActive || isCompleted ? step.hex : 'rgba(255,255,255,0.1)'}`,
                                            boxShadow: isActive ? `0 0 16px ${step.hex}80` : 'none',
                                            color: isActive ? 'white' : isCompleted ? step.hex : 'rgba(255,255,255,0.25)'
                                        }}
                                    >
                                        {isCompleted ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : (
                                            <Icon className={cn("h-4 w-4", isActive && "animate-pulse")} />
                                        )}
                                    </div>
                                    {/* Connector line */}
                                    {index < STATUS_STEPS.length - 1 && (
                                        <div className="w-px flex-1 my-1 min-h-[20px]" style={{
                                            background: isCompleted
                                                ? `linear-gradient(to bottom, ${step.hex}, ${STATUS_STEPS[index + 1].hex})`
                                                : 'rgba(255,255,255,0.08)'
                                        }} />
                                    )}
                                </div>

                                {/* Label column */}
                                <div className={cn(
                                    "pb-5 flex-1 transition-all duration-500 mt-1.5",
                                    isFuture && "opacity-30"
                                )}>
                                    <p
                                        className={cn("font-semibold text-sm leading-tight")}
                                        style={{ color: isActive ? step.hex : isCompleted ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }}
                                    >
                                        {step.label}
                                    </p>
                                    {isActive && (
                                        <p className="text-xs text-slate-500 mt-0.5 animate-in fade-in duration-700">{step.sublabel}</p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* ── Details Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* Bike card */}
                    <div
                        className="rounded-2xl p-5 space-y-3"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <Bike className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">Ihr Fahrrad</span>
                        </div>

                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-0.5">Fahrrad</p>
                            <p className="text-sm font-semibold text-white">
                                {order.bike_brand} {order.bike_model || "Keine Angabe"}
                            </p>
                        </div>

                        {order.customer_note && (
                            <div className="pt-3 border-t border-white/5">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <MessageSquare className="h-3 w-3 text-slate-500" />
                                    <p className="text-[10px] uppercase tracking-widest text-slate-600">Ihr Wunsch</p>
                                </div>
                                <p className="text-sm text-slate-400 italic leading-relaxed">"{order.customer_note}"</p>
                            </div>
                        )}

                        {order.estimated_price !== undefined && order.estimated_price !== null && (
                            <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                                <div className="flex items-center gap-1.5">
                                    <CreditCard className="h-3 w-3 text-slate-500" />
                                    <p className="text-[10px] uppercase tracking-widest text-slate-600">Geschätzt</p>
                                </div>
                                <p className="text-base font-extrabold text-white">
                                    {typeof order.estimated_price === 'number'
                                        ? order.estimated_price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                        : order.estimated_price} €
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Contact card */}
                    <div
                        className="rounded-2xl p-5 space-y-3"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <MapPin className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">Kontakt</span>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-white">{order.workshop?.name}</p>
                            {(order.workshop?.address || order.workshop?.city) && (
                                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                    {order.workshop?.address && <>{order.workshop.address}<br /></>}
                                    {order.workshop?.postal_code} {order.workshop?.city}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2 pt-3 border-t border-white/5">
                            {order.workshop?.phone && (
                                <a
                                    href={`tel:${order.workshop.phone}`}
                                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group"
                                >
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors">
                                        <Phone className="h-3.5 w-3.5" />
                                    </div>
                                    {order.workshop.phone}
                                </a>
                            )}
                            {order.workshop?.email && (
                                <a
                                    href={`mailto:${order.workshop.email}`}
                                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group"
                                >
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors">
                                        <Mail className="h-3.5 w-3.5" />
                                    </div>
                                    {order.workshop.email}
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Footer ── */}
                <p className="text-center text-xs text-slate-600 pt-2">
                    © {new Date().getFullYear()} {order.workshop?.name || "VeloFix"} · Powered by VeloFix
                </p>
            </div>
        </div>
    )
}
