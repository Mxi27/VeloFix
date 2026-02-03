import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
    Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"

// Define status flow for the progress stepper
const STATUS_STEPS = [
    { value: 'eingegangen', label: 'Eingegangen', icon: Clock },
    { value: 'warten_auf_teile', label: 'Warten auf Teile', icon: AlertCircle },
    { value: 'in_bearbeitung', label: 'In Bearbeitung', icon: Wrench },
    { value: 'abholbereit', label: 'Abholbereit', icon: PackageCheck },
    { value: 'abgeholt', label: 'Abgeholt', icon: CheckCircle2 }
]

const BIKE_TYPE_TRANSLATIONS: Record<string, string> = {
    'road': 'Rennrad',
    'mountain': 'Mountainbike',
    'city': 'Citybike',
    'ebike': 'E-Bike',
    'trekking': 'Trekkingrad',
    'gravel': 'Gravelbike',
    'kids': 'Kinderfahrrad',
    'cargo': 'Lastenrad'
}

export default function OrderStatusPage() {
    const { orderId } = useParams<{ orderId: string }>()
    const [order, setOrder] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Force dark mode for this page to match dashboard vibe
        document.documentElement.classList.add('dark')

        const fetchOrder = async () => {
            if (!orderId) return

            try {
                const { data, error } = await supabase
                    .rpc('get_public_order_status', { p_order_id: orderId })

                if (error) throw error
                if (!data) throw new Error("Auftrag nicht gefunden")

                setOrder(data)
            } catch (err: any) {
                console.error("Error fetching status:", err)
                setError(err.message || JSON.stringify(err))
            } finally {
                setLoading(false)
            }
        }

        fetchOrder()

        // Cleanup: verify if we should remove dark mode? 
        // If the main app is dark, it doesn't matter. If light, we might want to reset.
        // For now, let's keep it 'modern black' as requested.
    }, [orderId])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="mt-4 text-zinc-400">Lade Auftrag...</p>
            </div>
        )
    }

    if (error || !order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4 text-center text-white">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Hoppla!</h1>
                <p className="text-zinc-400 mb-6">{error || "Diesen Auftrag konnten wir leider nicht finden."}</p>
                <p className="text-sm text-zinc-500">Bitte überprüfen Sie den Link oder kontaktieren Sie uns.</p>
            </div>
        )
    }

    // Determine active step index
    const effectiveStatus = order.status === 'abgeschlossen' ? 'abgeholt' : order.status
    const currentStatusIndex = STATUS_STEPS.findIndex(s => s.value === effectiveStatus)
    const activeIndex = currentStatusIndex === -1 ? 0 : currentStatusIndex

    // Date formatting helper
    const formatDate = (dateString: string) => {
        if (!dateString) return "Datum unbekannt";
        try {
            const date = new Date(dateString)
            if (isNaN(date.getTime())) return "Datum ungültig"
            return date.toLocaleDateString('de-DE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        } catch (e) {
            return dateString
        }
    }

    // Translate Bike Type
    const displayBikeType = (type: string) => {
        if (!type) return "";
        const lowerType = type.toLowerCase();
        return BIKE_TYPE_TRANSLATIONS[lowerType] || type;
    }

    return (
        <div className="min-h-screen bg-black text-foreground py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-primary/20">
            <div className="max-w-4xl mx-auto space-y-12">

                {/* Header / Workshop Info */}
                <div className="text-center space-y-4">
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white glow-text">
                        {order.workshop?.name || "VeloFix Service"}
                    </h1>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Ihr Reparatur-Status live verfolgen
                    </p>
                </div>

                {/* Main Status Card */}
                <Card className="border border-zinc-800 bg-zinc-950/50 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-xl">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-primary to-purple-600 opacity-75" />

                    <CardHeader className="text-center pb-8 pt-10">
                        <CardTitle className="text-2xl md:text-4xl font-bold tracking-tight text-white mb-2">
                            Auftrag {order.order_number}
                        </CardTitle>
                        <CardDescription className="text-base text-zinc-400">
                            Erstellt am {formatDate(order.created_at || order.created_date)}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pb-12 px-6 sm:px-12">
                        {/* Status Stepper */}
                        <div className="relative mt-8 mb-16">
                            {/* Mobile Vertical Line */}
                            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-zinc-800 md:hidden rounded-full" />

                            <div className="flex flex-col md:flex-row justify-between relative md:space-x-2 space-y-12 md:space-y-0">
                                {STATUS_STEPS.map((step, index) => {
                                    const isActive = index === activeIndex
                                    const isCompleted = index < activeIndex

                                    return (
                                        <div key={step.value} className="relative z-10 flex md:flex-col items-center flex-1 group">
                                            {/* Connector Line for Desktop */}
                                            {index !== 0 && (
                                                <div className={cn(
                                                    "hidden md:block absolute top-6 right-1/2 w-full h-0.5 -z-10 transition-all duration-700 delay-100",
                                                    index <= activeIndex ? "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" : "bg-zinc-800"
                                                )} style={{ right: "50%" }} />
                                            )}

                                            {/* Icon Circle */}
                                            <div className={cn(
                                                "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border-2 transition-all duration-500 shadow-xl z-20 bg-zinc-950",
                                                isActive ? "border-primary text-primary shadow-primary/20 scale-110" :
                                                    isCompleted ? "border-primary/50 text-white" :
                                                        "border-zinc-800 text-zinc-600"
                                            )}>
                                                <step.icon className={cn("transition-all duration-300", isActive ? "h-6 w-6" : "h-5 w-5")} />
                                            </div>

                                            {/* Label */}
                                            <div className="ml-8 md:ml-0 md:mt-6 md:text-center flex flex-col justify-center min-h-[3rem]">
                                                <p className={cn(
                                                    "text-base md:text-sm font-medium transition-colors duration-300",
                                                    isActive ? "text-white" :
                                                        isCompleted ? "text-zinc-300" : "text-zinc-600"
                                                )}>
                                                    {step.label}
                                                </p>
                                                {isActive && (
                                                    <div className="md:absolute md:top-full md:left-1/2 md:-translate-x-1/2 md:mt-2">
                                                        <Badge className="px-2 py-0 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground border-none animate-pulse">
                                                            Aktuell
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Status Text Large */}
                        <div className="text-center p-8 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                            <p className="text-zinc-500 text-xs uppercase tracking-[0.2em] font-bold mb-3">Aktueller Status</p>
                            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-lg">
                                {STATUS_STEPS.find(s => s.value === effectiveStatus)?.label || effectiveStatus}
                            </h2>
                        </div>
                    </CardContent>
                </Card>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Bike Details */}
                    <Card className="border border-zinc-800 bg-zinc-950/50 shadow-xl rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors">
                        <CardHeader className="pb-4 border-b border-zinc-800/50">
                            <CardTitle className="flex items-center gap-3 text-lg text-white">
                                <Bike className="h-5 w-5 text-primary" />
                                Ihr Fahrrad
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div>
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Modell</p>
                                <p className="font-semibold text-xl text-white">{order.bike_model || "Keine Angabe"}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Marke / Typ</p>
                                <p className="font-medium text-base text-zinc-300">
                                    {[order.bike_brand, displayBikeType(order.bike_type)].filter(Boolean).join(' - ') || "-"}
                                </p>
                            </div>
                            <div className="pt-2">
                                <div className="flex justify-between items-baseline p-4 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                                    <p className="text-sm font-medium text-zinc-400">Geschätzte Kosten</p>
                                    <p className="font-bold text-xl text-white">
                                        {order.estimated_price ? `${order.estimated_price} €` : "Nach Absprache"}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Info */}
                    <Card className="border border-zinc-800 bg-zinc-950/50 shadow-xl rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors">
                        <CardHeader className="pb-4 border-b border-zinc-800/50">
                            <CardTitle className="flex items-center gap-3 text-lg text-white">
                                <MapPin className="h-5 w-5 text-primary" />
                                Kontakt
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div>
                                <p className="font-bold text-lg mb-1 text-white">{order.workshop?.name}</p>
                                <p className="text-zinc-400 leading-relaxed text-sm">
                                    {order.workshop?.address}<br />
                                    {order.workshop?.postal_code} {order.workshop?.city}
                                </p>
                            </div>
                            <div className="space-y-3 pt-2">
                                {order.workshop?.phone && (
                                    <a href={`tel:${order.workshop.phone}`} className="flex items-center gap-3 text-zinc-300 hover:text-white transition-colors p-2 -ml-2 rounded-md hover:bg-zinc-900 w-fit">
                                        <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                            <Phone className="h-4 w-4" />
                                        </div>
                                        <span className="font-medium text-sm">{order.workshop.phone}</span>
                                    </a>
                                )}
                                {order.workshop?.email && (
                                    <a href={`mailto:${order.workshop.email}`} className="flex items-center gap-3 text-zinc-300 hover:text-white transition-colors p-2 -ml-2 rounded-md hover:bg-zinc-900 w-fit">
                                        <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                            <Mail className="h-4 w-4" />
                                        </div>
                                        <span className="font-medium text-sm">{order.workshop.email}</span>
                                    </a>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
