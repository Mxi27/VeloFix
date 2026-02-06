import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    }, [orderId])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Lade Auftrag...</p>
            </div>
        )
    }

    if (error || !order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h1 className="text-2xl font-bold mb-2 text-foreground">Hoppla!</h1>
                <p className="text-muted-foreground mb-6">{error || "Diesen Auftrag konnten wir leider nicht finden."}</p>
                <p className="text-sm text-muted-foreground">Bitte überprüfen Sie den Link oder kontaktieren Sie uns.</p>
            </div>
        )
    }

    const effectiveStatus = order.status === 'abgeschlossen' ? 'abgeholt' : order.status
    const currentStatusIndex = STATUS_STEPS.findIndex(s => s.value === effectiveStatus)
    const activeIndex = currentStatusIndex === -1 ? 0 : currentStatusIndex

    const formatDate = (dateString: string) => {
        if (!dateString) return "Datum unbekannt"
        try {
            const date = new Date(dateString)
            if (isNaN(date.getTime())) return "Datum ungültig"
            return date.toLocaleDateString('de-DE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        } catch {
            return dateString
        }
    }

    const displayBikeType = (type: string) => {
        if (!type) return ""
        const lowerType = type.toLowerCase()
        return BIKE_TYPE_TRANSLATIONS[lowerType] || type
    }

    return (
        <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                        {order.workshop?.name || "VeloFix Service"}
                    </h1>
                    <p className="text-muted-foreground">
                        Reparatur-Status
                    </p>
                </div>

                {/* Order Info Card */}
                <Card className="border-border">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl text-card-foreground">
                            Auftrag {order.order_number}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Erstellt am {formatDate(order.created_at || order.created_date)}
                        </p>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Status Stepper - Simplified */}
                        <div className="space-y-4">
                            {STATUS_STEPS.map((step, index) => {
                                const isActive = index === activeIndex
                                const isCompleted = index < activeIndex

                                return (
                                    <div
                                        key={step.value}
                                        className={cn(
                                            "flex items-center gap-4 p-3 rounded-lg transition-colors",
                                            isActive && "bg-primary/10 border border-primary/20",
                                            isCompleted && "opacity-60"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center border-2",
                                            isActive ? "bg-primary border-primary text-primary-foreground" :
                                                isCompleted ? "bg-muted border-primary/50 text-primary" :
                                                    "bg-muted border-border text-muted-foreground"
                                        )}>
                                            <step.icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className={cn(
                                                "font-medium",
                                                isActive ? "text-foreground" : "text-muted-foreground"
                                            )}>
                                                {step.label}
                                            </p>
                                        </div>
                                        {isActive && (
                                            <Badge variant="default" className="bg-primary text-primary-foreground">
                                                Aktuell
                                            </Badge>
                                        )}
                                        {isCompleted && (
                                            <CheckCircle2 className="h-5 w-5 text-primary" />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Bike Details */}
                    <Card className="border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base text-card-foreground">
                                <Bike className="h-4 w-4 text-primary" />
                                Ihr Fahrrad
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Modell</p>
                                <p className="font-medium text-card-foreground">{order.bike_model || "Keine Angabe"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Typ</p>
                                <p className="text-card-foreground">
                                    {displayBikeType(order.bike_type) || "-"}
                                </p>
                            </div>
                            {order.estimated_price && (
                                <div className="pt-2 border-t border-border">
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-muted-foreground">Geschätzte Kosten</p>
                                        <p className="font-bold text-card-foreground">{order.estimated_price} €</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Contact Info */}
                    <Card className="border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base text-card-foreground">
                                <MapPin className="h-4 w-4 text-primary" />
                                Kontakt
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="font-medium text-card-foreground">{order.workshop?.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {order.workshop?.address}<br />
                                    {order.workshop?.postal_code} {order.workshop?.city}
                                </p>
                            </div>
                            <div className="space-y-2 pt-2 border-t border-border">
                                {order.workshop?.phone && (
                                    <a href={`tel:${order.workshop.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                                        <Phone className="h-4 w-4" />
                                        {order.workshop.phone}
                                    </a>
                                )}
                                {order.workshop?.email && (
                                    <a href={`mailto:${order.workshop.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                                        <Mail className="h-4 w-4" />
                                        {order.workshop.email}
                                    </a>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-muted-foreground pt-4">
                    © {new Date().getFullYear()} {order.workshop?.name || "VeloFix"}
                </p>
            </div>
        </div>
    )
}
