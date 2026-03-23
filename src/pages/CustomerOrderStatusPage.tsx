import { useParams } from "react-router-dom"
import useSWR from "swr"
import { supabase } from "@/lib/supabase"
import { StatusBadge } from "@/components/ui/status-badge"
import { LoadingScreen } from "@/components/LoadingScreen"
import { PageTransition } from "@/components/PageTransition"
import { 
    Package, 
    CheckCircle2, 
    Clock, 
    ShoppingCart, 
    Send,
    Bike,
    MapPin,
    Phone,
    Mail,
    AlertCircle
} from "lucide-react"
import type { CustomerOrder, CustomerOrderItem } from "@/types"

export default function CustomerOrderStatusPage() {
    const { token } = useParams<{ token: string }>()

    const fetchOrderByToken = async () => {
        if (!token) return null
        const { data, error } = await supabase
            .from("customer_orders")
            .select("*")
            .eq("status_token", token)
            .single()

        if (error) throw error
        return data as CustomerOrder
    }

    const { data: order, error, isLoading } = useSWR(
        token ? ["customer_order_public", token] : null,
        fetchOrderByToken
    )

    if (isLoading) return <LoadingScreen />
    if (error || !order) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                    <AlertCircle className="h-10 w-10 text-destructive" />
                </div>
                <h1 className="text-2xl font-bold">Link ungültig</h1>
                <p className="text-muted-foreground leading-relaxed">
                    Dieser Status-Link ist leider nicht mehr gültig oder die Bestellung wurde entfernt.
                    Bitte kontaktieren Sie uns direkt, falls Sie Fragen haben.
                </p>
            </div>
        </div>
    )

    return (
        <PageTransition>
            <div className="min-h-screen bg-muted/30 pb-12">
                {/* Header / Navbar Branding */}
                <div className="bg-background border-b border-border/40 py-4 px-6 sticky top-0 z-10 backdrop-blur-md bg-background/80">
                    <div className="max-w-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                                <Bike className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-bold tracking-tight text-lg">VeloFix <span className="text-primary">Status</span></span>
                        </div>
                        <StatusBadge status={order.status} variant="customer_order" />
                    </div>
                </div>

                <div className="max-w-2xl mx-auto px-6 pt-8 space-y-6">
                    {/* Welcome Card */}
                    <div className="rounded-3xl bg-card border border-border/40 p-6 md:p-8 shadow-xl shadow-primary/5 space-y-4">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold md:text-3xl tracking-tight">Hallo {order.customer_name},</h1>
                            <p className="text-muted-foreground text-sm md:text-base">
                                Vielen Dank für Ihr Vertrauen. Hier können Sie den aktuellen Status Ihrer Bestellung verfolgen.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                            <StatusStep 
                                active={order.status === "open" || order.status === "ordered" || order.status === "received"} 
                                completed={order.status === "notified" || order.status === "ready" || order.status === "completed"}
                                label="In Bearbeitung"
                                icon={<Clock className="h-4 w-4" />}
                            />
                            <StatusStep 
                                active={order.status === "notified" || order.status === "ready"} 
                                completed={order.status === "completed"}
                                label="Abholbereit"
                                icon={<CheckCircle2 className="h-4 w-4" />}
                            />
                            <StatusStep 
                                active={order.status === "completed"} 
                                completed={false}
                                label="Abgeschlossen"
                                icon={<Package className="h-4 w-4" />}
                            />
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-4">
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground px-4">Bestellte Artikel</h2>
                        <div className="rounded-3xl bg-card border border-border/40 shadow-sm overflow-hidden">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="p-5 flex items-center justify-between border-b border-border/40 last:border-0">
                                    <div className="space-y-1">
                                        <div className="font-bold text-base flex items-center gap-2">
                                            {item.quantity}x {item.name}
                                        </div>
                                        <p className="text-xs text-muted-foreground font-medium">Position {idx + 1}</p>
                                    </div>
                                    <ItemStatusBadge status={item.status} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-3xl bg-primary/5 border border-primary/10 p-6 space-y-3">
                            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <MapPin className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="font-bold">Standort & Abholung</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Sobald Ihre Bestellung auf "Abholbereit" steht, können Sie diese während unserer Öffnungszeiten abholen.
                            </p>
                        </div>
                        <div className="rounded-3xl bg-background border border-border/40 p-6 space-y-3">
                            <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center">
                                <Phone className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <h3 className="font-bold">Fragen?</h3>
                            <div className="space-y-2">
                                <a href="tel:0123456789" className="text-xs text-primary font-semibold flex items-center gap-2">
                                    <Phone className="h-3 w-3" /> 0123 456789
                                </a>
                                <a href="mailto:info@velofix.de" className="text-xs text-primary font-semibold flex items-center gap-2">
                                    <Mail className="h-3 w-3" /> info@velofix.de
                                </a>
                            </div>
                        </div>
                    </div>

                    <p className="text-center text-[10px] text-muted-foreground pt-4 uppercase tracking-widest font-bold">
                        Powered by VeloFix Dashboard
                    </p>
                </div>
            </div>
        </PageTransition>
    )
}

function StatusStep({ active, completed, label, icon }: { active: boolean, completed: boolean, label: string, icon: React.ReactNode }) {
    return (
        <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
            active 
            ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105 z-10" 
            : completed 
            ? "bg-primary/10 border-primary/20 text-primary" 
            : "bg-muted/50 border-border/20 text-muted-foreground opacity-50"
        }`}>
            <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${active ? "bg-white/20" : "bg-muted"}`}>
                {completed ? <CheckCircle2 className="h-4 w-4" /> : icon}
            </div>
            <span className="text-xs font-bold">{label}</span>
        </div>
    )
}

function ItemStatusBadge({ status }: { status: CustomerOrderItem["status"] }) {
    const config = {
        pending: { label: "In Bestellung", color: "bg-orange-500", icon: <Clock className="h-3 w-3" /> },
        ordered: { label: "Bestellt", color: "bg-blue-500", icon: <ShoppingCart className="h-3 w-3" /> },
        received: { label: "Eingetroffen", color: "bg-emerald-500", icon: <Package className="h-3 w-3" /> },
        notified: { label: "Abholbereit", color: "bg-violet-500", icon: <Send className="h-3 w-3" /> },
    }

    const item = config[status] || config.pending

    return (
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/40">
            <div className={`h-1.5 w-1.5 rounded-full ${item.color} shadow-[0_0_8px_currentColor]`} style={{ color: item.color.replace('bg-', '') }} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">{item.label}</span>
        </div>
    )
}
