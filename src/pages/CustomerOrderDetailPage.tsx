import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import useSWR from "swr"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/ui/status-badge"
import { LoadingScreen } from "@/components/LoadingScreen"
import { PageTransition } from "@/components/PageTransition"
import { 
    ArrowLeft, 
    User, 
    Mail, 
    Phone, 
    Package, 
    Copy, 
    Trash2, 
    Save, 
    Loader2, 
    History,
    ExternalLink,
    CheckCircle2,
    Clock,
    ShoppingCart,
    MessageSquare,
    Send
} from "lucide-react"
import { toastSuccess, toastError } from "@/lib/toast-utils"
import { getCustomerOrderStatusInfo } from "@/lib/constants"
import type { CustomerOrder, CustomerOrderItem, CustomerOrderStatus } from "@/types"

export default function CustomerOrderDetailPage() {
    const { id } = useParams<{ id: string }>()
    const { workshopId } = useAuth()
    const navigate = useNavigate()
    const [isSaving, setIsSaving] = useState(false)

    // Form states
    const [customerName, setCustomerName] = useState("")
    const [customerEmail, setCustomerEmail] = useState("")
    const [customerPhone, setCustomerPhone] = useState("")
    const [notes, setNotes] = useState("")
    const [items, setItems] = useState<CustomerOrderItem[]>([])
    const [status, setStatus] = useState<CustomerOrderStatus>("open")

    const fetchOrder = async () => {
        if (!id) return null
        const { data, error } = await supabase
            .from("customer_orders")
            .select("*")
            .eq("id", id)
            .single()

        if (error) throw error
        return data as CustomerOrder
    }

    const { data: order, error, isLoading, mutate } = useSWR(
        id ? ["customer_order", id] : null,
        fetchOrder
    )

    useEffect(() => {
        if (order) {
            setCustomerName(order.customer_name)
            setCustomerEmail(order.customer_email || "")
            setCustomerPhone(order.customer_phone || "")
            setNotes(order.notes || "")
            setItems(order.items || [])
            setStatus(order.status)
        }
    }, [order])

    const handleSave = async () => {
        if (!id || !workshopId) return
        setIsSaving(true)
        try {
            const { error } = await supabase
                .from("customer_orders")
                .update({
                    customer_name: customerName,
                    customer_email: customerEmail || null,
                    customer_phone: customerPhone || null,
                    notes: notes || null,
                    items,
                    status,
                })
                .eq("id", id)

            if (error) throw error
            toastSuccess("Gespeichert", "Änderungen wurden übernommen.")
            mutate()
        } catch (error) {
            toastError("Fehler", "Speichern fehlgeschlagen.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleUpdateItemStatus = (index: number, newStatus: CustomerOrderItem["status"]) => {
        const newItems = [...items]
        newItems[index] = { ...newItems[index], status: newStatus }
        setItems(newItems)
    }

    const copyStatusLink = () => {
        if (!order) return
        const url = `${window.location.origin}/order-status/${order.status_token}`
        navigator.clipboard.writeText(url)
        toastSuccess("Link kopiert", "Der öffentliche Status-Link wurde kopiert.")
    }

    const handleDelete = async () => {
        if (!id) return
        if (!confirm("Möchten Sie diese Bestellung wirklich löschen?")) return

        try {
            const { error } = await supabase
                .from("customer_orders")
                .delete()
                .eq("id", id)

            if (error) throw error
            toastSuccess("Gelöscht", "Die Bestellung wurde entfernt.")
            navigate("/dashboard/customer-orders")
        } catch (error) {
            toastError("Fehler", "Löschen fehlgeschlagen.")
        }
    }

    if (isLoading) return <LoadingScreen />
    if (error || !order) return (
        <DashboardLayout>
            <div className="p-8 text-center">
                <p className="text-destructive">Bestellung nicht gefunden oder Fehler beim Laden.</p>
                <Button variant="link" onClick={() => navigate("/dashboard/customer-orders")}>
                    Zurück zur Übersicht
                </Button>
            </div>
        </DashboardLayout>
    )

    return (
        <PageTransition>
            <DashboardLayout>
                <div className="max-w-5xl mx-auto space-y-6 pb-20">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => navigate("/dashboard/customer-orders")}
                                className="h-10 w-10 rounded-full"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                                    Bestellung: {order.customer_name}
                                    <StatusBadge status={status} variant="customer_order" />
                                </h1>
                                <p className="text-sm text-muted-foreground mt-1 font-mono uppercase tracking-wider">
                                    erstellt am {new Date(order.created_at).toLocaleDateString("de-DE")}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={copyStatusLink} className="gap-2">
                                <Copy className="h-4 w-4" />
                                <span className="hidden sm:inline">Status-Link kopieren</span>
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:bg-destructive/10 gap-2 border-destructive/20">
                                <Trash2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Löschen</span>
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2 font-bold shadow-lg shadow-primary/20">
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Speichern
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Items Section */}
                            <div className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-semibold">
                                        <Package className="h-4 w-4 text-primary" />
                                        Bestellte Artikel
                                    </div>
                                    <span className="text-xs font-mono text-muted-foreground">{items.length} Positionen</span>
                                </div>
                                <div className="p-0">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="p-4 flex items-center justify-between border-b border-border/40 last:border-0 group hover:bg-muted/10 transition-colors">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="font-semibold text-sm flex items-center gap-2">
                                                    {item.quantity}x {item.name}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <StatusDot status={item.status} />
                                                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                                                        {getItemStatusLabel(item.status)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ItemStatusButton 
                                                    active={item.status === "pending"} 
                                                    onClick={() => handleUpdateItemStatus(idx, "pending")}
                                                    icon={<Clock className="h-3.5 w-3.5" />}
                                                    label="Offen"
                                                />
                                                <ItemStatusButton 
                                                    active={item.status === "ordered"} 
                                                    onClick={() => handleUpdateItemStatus(idx, "ordered")}
                                                    icon={<ShoppingCart className="h-3.5 w-3.5" />}
                                                    label="Bestellt"
                                                />
                                                <ItemStatusButton 
                                                    active={item.status === "received"} 
                                                    onClick={() => handleUpdateItemStatus(idx, "received")}
                                                    icon={<Package className="h-3.5 w-3.5" />}
                                                    label="Erhalten"
                                                />
                                                <ItemStatusButton 
                                                    active={item.status === "notified"} 
                                                    onClick={() => handleUpdateItemStatus(idx, "notified")}
                                                    icon={<Send className="h-3.5 w-3.5" />}
                                                    label="Benachrichtigt"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Internal Notes */}
                            <div className="rounded-2xl border border-border/40 bg-card shadow-sm p-6 space-y-4">
                                <div className="flex items-center gap-2 font-semibold">
                                    <MessageSquare className="h-4 w-4 text-primary" />
                                    Interne Notizen
                                </div>
                                <Textarea 
                                    value={notes} 
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Interne Anmerkungen, Lieferanteninfos etc..."
                                    className="min-h-[150px] bg-muted/30 border-border/40 focus:bg-background transition-all resize-none"
                                />
                            </div>
                        </div>

                        {/* Sidebar Info */}
                        <div className="space-y-6">
                            {/* Overall Status */}
                            <div className="rounded-2xl border border-border/40 bg-card shadow-sm p-6 space-y-4">
                                <div className="flex items-center gap-2 font-semibold">
                                    <History className="h-4 w-4 text-primary" />
                                    Gesamtstatus
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {["open", "ready", "completed"].map((s) => {
                                        const isActive = status === s
                                        const info = getCustomerOrderStatusInfo(s as CustomerOrderStatus)
                                        return (
                                            <button
                                                key={s}
                                                onClick={() => setStatus(s as CustomerOrderStatus)}
                                                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                                                    isActive 
                                                    ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20" 
                                                    : "bg-muted/30 border-border/40 hover:bg-muted/50"
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-2.5 w-2.5 rounded-full ${info.dotColor}`} />
                                                    <span className={`text-sm font-semibold ${isActive ? "text-primary" : "text-foreground"}`}>
                                                        {info.label}
                                                    </span>
                                                </div>
                                                {isActive && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Customer Data */}
                            <div className="rounded-2xl border border-border/40 bg-card shadow-sm p-6 space-y-4">
                                <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-widest text-muted-foreground/60">
                                    <User className="h-3.5 w-3.5" />
                                    Kunde
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-muted-foreground">Name</Label>
                                        <Input 
                                            value={customerName} 
                                            onChange={e => setCustomerName(e.target.value)} 
                                            className="h-10 bg-muted/30 border-border/40"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-muted-foreground">E-Mail</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                                            <Input 
                                                value={customerEmail} 
                                                onChange={e => setCustomerEmail(e.target.value)} 
                                                className="pl-9 h-10 bg-muted/30 border-border/40"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-muted-foreground">Telefon</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                                            <Input 
                                                value={customerPhone} 
                                                onChange={e => setCustomerPhone(e.target.value)} 
                                                className="pl-9 h-10 bg-muted/30 border-border/40"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Public Link Preview */}
                            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-4">
                                <div className="flex items-center gap-2 font-semibold text-primary">
                                    <ExternalLink className="h-4 w-4" />
                                    Kunden-Ansicht
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Diesen Link können Sie dem Kunden senden, damit dieser den Status selbst prüfen kann.
                                </p>
                                <Button 
                                    variant="outline" 
                                    className="w-full bg-background/50 border-primary/20 text-primary hover:bg-primary/10 font-bold h-11"
                                    onClick={() => window.open(`/order-status/${order.status_token}`, "_blank")}
                                >
                                    Vorschau öffnen
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}

function StatusDot({ status }: { status: CustomerOrderItem["status"] }) {
    switch (status) {
        case "pending": return <div className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
        case "ordered": return <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
        case "received": return <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
        case "notified": return <div className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.4)]" />
        default: return <div className="h-2 w-2 rounded-full bg-muted shadow-none" />
    }
}

function getItemStatusLabel(status: CustomerOrderItem["status"]) {
    switch (status) {
        case "pending": return "Ausstehend"
        case "ordered": return "Bestellt"
        case "received": return "Erhalten"
        case "notified": return "Benachrichtigt"
        default: return status
    }
}

interface ItemStatusButtonProps {
    active: boolean
    onClick: () => void
    icon: React.ReactNode
    label: string
}

function ItemStatusButton({ active, onClick, icon, label }: ItemStatusButtonProps) {
    return (
        <Button
            size="sm"
            variant={active ? "default" : "ghost"}
            onClick={onClick}
            className={`h-8 w-8 p-0 rounded-lg ${active ? "shadow-md" : "text-muted-foreground"}`}
            title={label}
        >
            {icon}
        </Button>
    )
}
