import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import {
    ArrowLeft,
    User,
    Bike,
    CreditCard,
    Mail,
    Phone,
    Euro,
    Clock,
    Play,
    Pause,
    PackageCheck,
    Check,
    Save,
    AlertCircle,
    Loader2
} from "lucide-react"
import { LoadingScreen } from "@/components/LoadingScreen"
import { PageTransition } from "@/components/PageTransition"

interface ChecklistItem {
    text: string
    completed: boolean
    type?: 'acceptance' | 'service'
}

interface Order {
    id: string
    order_number: string
    customer_name: string
    customer_email: string | null
    customer_phone: string | null
    bike_model: string | null
    bike_type: string | null
    is_leasing: boolean
    leasing_provider: string | null
    status: string
    created_at: string
    estimated_price: number | null
    final_price: number | null
    checklist: ChecklistItem[] | null
    notes: string[] | null
}

// ... existing code ...


const STATUS_OPTIONS = [
    { value: 'eingegangen', label: 'Eingegangen', icon: Clock },
    { value: 'in_bearbeitung', label: 'In Bearbeitung', icon: Play },
    { value: 'warten_auf_teile', label: 'Warten auf Teile', icon: Pause },
    { value: 'abholbereit', label: 'Abholbereit', icon: PackageCheck },
]

const BIKE_TYPE_LABELS: Record<string, string> = {
    road: 'Rennrad',
    mtb: 'Mountainbike',
    city: 'Citybike',
    ebike: 'E-Bike'
}

export default function OrderDetailPage() {
    const { orderId } = useParams<{ orderId: string }>()
    const navigate = useNavigate()
    const { workshopId } = useAuth()
    const [order, setOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [templates, setTemplates] = useState<any[]>([])
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    // Editable fields
    const [notes, setNotes] = useState("")
    const [finalPrice, setFinalPrice] = useState("")

    useEffect(() => {
        const fetchOrder = async () => {
            if (!workshopId || !orderId) return

            setLoading(true)

            // Fetch order and templates in parallel
            const [orderResult, templatesResult] = await Promise.all([
                supabase
                    .from('orders')
                    .select('*')
                    .eq('id', orderId)
                    .eq('workshop_id', workshopId)
                    .single(),
                supabase
                    .from('checklist_templates')
                    .select('*')
                    .eq('workshop_id', workshopId)
                    .order('name')
            ])

            if (orderResult.error) {
                console.error("Error fetching order:", orderResult.error)
            } else {
                setOrder(orderResult.data)
                // Accessing index 0 if it's an array, or joining if multiple lines? 
                // Best approach for textarea: join with newlines
                const notesData = orderResult.data.notes
                const notesString = Array.isArray(notesData)
                    ? notesData.join('\n')
                    : (typeof notesData === 'string' ? notesData : "")

                setNotes(notesString)
                setFinalPrice(orderResult.data.final_price?.toString() || "")
            }

            if (templatesResult.data) {
                setTemplates(templatesResult.data)
            }

            setLoading(false)
        }

        fetchOrder()
    }, [workshopId, orderId])

    const handleStatusChange = async (newStatus: string) => {
        if (!order) return

        setSaving(true)
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', order.id)

        if (error) {
            console.error("Error updating status:", error)
            alert("Fehler beim Aktualisieren des Status")
        } else {
            setOrder({ ...order, status: newStatus })
        }
        setSaving(false)
    }

    const handleSaveNotes = async () => {
        if (!order || !workshopId) return

        setSaving(true)
        // Convert string back to array for DB
        // Using [notes] to store as single block, or split('\n') for lines?
        // split('\n') is more "array-like"
        const notesArray = notes.split('\n')

        const { error } = await supabase
            .from('orders')
            .update({ notes: notesArray })
            .eq('id', order.id)
            .eq('workshop_id', workshopId)

        if (error) {
            console.error("Error saving notes:", error)
            alert(`Fehler beim Speichern der Notizen: ${error.message || JSON.stringify(error)}`)
        } else {
            setOrder({ ...order, notes: notesArray })
        }
        setSaving(false)
    }

    const handleSaveFinalPrice = async () => {
        if (!order || !workshopId) return

        const price = parseFloat(finalPrice)
        if (isNaN(price)) {
            alert("Bitte geben Sie einen gültigen Preis ein")
            return
        }

        setSaving(true)
        const { error } = await supabase
            .from('orders')
            .update({ final_price: price })
            .eq('id', order.id)
            .eq('workshop_id', workshopId)

        if (error) {
            console.error("Error saving price:", error)
            alert(`Fehler beim Speichern des Preises: ${error.message || JSON.stringify(error)}`)
        } else {
            setOrder({ ...order, final_price: price })
        }
        setSaving(false)
    }

    // Helper to check if dirty
    const currentNotesString = order && Array.isArray(order.notes) ? order.notes.join('\n') : (order?.notes || "")
    const isNotesDirty = order ? notes !== currentNotesString : false
    const isPriceDirty = order ? finalPrice !== (order.final_price?.toString() || "") : false

    const handleApplyTemplate = async () => {
        if (!order || !selectedTemplateId) return

        const template = templates.find(t => t.id === selectedTemplateId)
        if (!template) return

        setSaving(true)

        // Strict overwrite as requested: "entire checklist content deleted and overwritten"
        let newChecklist: ChecklistItem[] = []
        if (template.items && Array.isArray(template.items)) {
            newChecklist = template.items.map((item: any) => ({
                text: item.text,
                completed: false,
                type: 'service'
            }))
        }

        // Save
        const { error } = await supabase
            .from('orders')
            .update({ checklist: newChecklist as any })
            .eq('id', order.id)

        if (error) {
            console.error("Error applying template:", error)
            alert("Fehler beim Anwenden der Vorlage")
        } else {
            setOrder({ ...order, checklist: newChecklist })
            setIsDialogOpen(false)
            setSelectedTemplateId("")
        }
        setSaving(false)
    }

    const handleToggleChecklist = async (index: number, checked: boolean) => {
        if (!order || !order.checklist) return

        // Optimistic update
        const newChecklist = [...order.checklist]
        newChecklist[index] = { ...newChecklist[index], completed: checked }

        setOrder({ ...order, checklist: newChecklist })

        // Save to backend
        const { error } = await supabase
            .from('orders')
            .update({ checklist: newChecklist as any }) // cast for supabase compatibility if needed
            .eq('id', order.id)

        if (error) {
            console.error("Error updating checklist:", error)
            // Revert on error
            setOrder({ ...order, checklist: order.checklist })
            alert("Fehler beim Speichern der Checkliste")
        }
    }

    if (loading) {
        return <LoadingScreen />
    }

    if (!order) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <h2 className="text-2xl font-bold">Auftrag nicht gefunden</h2>
                    <Button onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Zurück zum Dashboard
                    </Button>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <PageTransition>
            <DashboardLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/dashboard')}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Zurück
                            </Button>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">
                                    {order.order_number}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Erstellt am {new Date(order.created_at).toLocaleDateString('de-DE', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Badge
                                variant="outline"
                                className={order.is_leasing
                                    ? "bg-primary/10 text-primary border-primary/20"
                                    : "bg-muted text-muted-foreground border-border"
                                }
                            >
                                {order.is_leasing ? "Leasing" : "Standard"}
                            </Badge>
                        </div>
                    </div>

                    {/* 3 Column Grid */}
                    <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                        {/* Left Column - Customer & Bike Data */}
                        <div className="space-y-6">
                            {/* Customer Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <User className="h-4 w-4 text-primary" />
                                        </div>
                                        Kundendaten
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Name</p>
                                        <p className="font-medium">{order.customer_name}</p>
                                    </div>
                                    {order.customer_email && (
                                        <div className="flex items-start gap-2">
                                            <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-muted-foreground">E-Mail</p>
                                                <p className="font-medium text-sm truncate">{order.customer_email}</p>
                                            </div>
                                        </div>
                                    )}
                                    {order.customer_phone && (
                                        <div className="flex items-start gap-2">
                                            <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Telefon</p>
                                                <p className="font-medium">{order.customer_phone}</p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Bike Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Bike className="h-4 w-4 text-primary" />
                                        </div>
                                        Fahrrad
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Modell</p>
                                        <p className="font-medium">{order.bike_model || 'Nicht angegeben'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Typ</p>
                                        <p className="font-medium">
                                            {order.bike_type ? BIKE_TYPE_LABELS[order.bike_type] || order.bike_type : 'Nicht angegeben'}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Price Overview */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Euro className="h-4 w-4 text-primary" />
                                        </div>
                                        Preisübersicht
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-4">
                                        <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                                            <p className="text-xs text-muted-foreground mb-1">Geschätzter Preis</p>
                                            <div className="text-2xl font-bold tracking-tight text-primary">
                                                {order.estimated_price !== null
                                                    ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(order.estimated_price)
                                                    : '—'
                                                }
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="actual-price" className="text-xs text-muted-foreground ml-1">
                                                Tatsächlicher Preis
                                            </Label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <Input
                                                        id="final-price"
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={finalPrice}
                                                        onChange={(e) => setFinalPrice(e.target.value)}
                                                        className="pr-8"
                                                    />
                                                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">€</span>
                                                </div>
                                                <Button
                                                    size="icon"
                                                    onClick={handleSaveFinalPrice}
                                                    disabled={saving || !isPriceDirty}
                                                    variant={isPriceDirty ? "default" : "outline"}
                                                    className={cn("shrink-0 transition-all", isPriceDirty && "animate-pulse")}
                                                >
                                                    {saving ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : isPriceDirty ? (
                                                        <Save className="h-4 w-4" />
                                                    ) : (
                                                        <Check className="h-4 w-4 text-green-500" />
                                                    )}
                                                </Button>
                                            </div>
                                            {!isPriceDirty && finalPrice && (
                                                <p className="text-[10px] text-muted-foreground text-right mr-1">
                                                    Gespeichert
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Leasing Information */}
                            {order.is_leasing && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <CreditCard className="h-4 w-4 text-primary" />
                                            </div>
                                            Leasing
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Anbieter</p>
                                            <p className="font-medium">{order.leasing_provider || 'Nicht angegeben'}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Middle Column - Checklist */}
                        <div className="space-y-6">
                            <Card className="h-fit">
                                <CardHeader>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base">Checkliste</CardTitle>
                                            <div className="text-xs text-muted-foreground">
                                                {order.checklist?.filter(i => i.completed).length || 0} / {order.checklist?.length || 0} erledigt
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                                <SelectTrigger className="h-8 text-xs bg-muted/50 flex-1">
                                                    <SelectValue placeholder="Vorlage wählen..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {templates.map(t => (
                                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                size="sm"
                                                className="h-8"
                                                disabled={!selectedTemplateId}
                                                onClick={() => setIsDialogOpen(true)}
                                            >
                                                Anwenden
                                            </Button>

                                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Checkliste überschreiben?</DialogTitle>
                                                        <DialogDescription>
                                                            Diese Aktion wird die gesamte aktuelle Checkliste löschen und durch die Punkte der Vorlage
                                                            "{templates.find(t => t.id === selectedTemplateId)?.name}" ersetzen.
                                                            Dies kann nicht rückgängig gemacht werden.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <DialogFooter>
                                                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                                            Abbrechen
                                                        </Button>
                                                        <Button onClick={handleApplyTemplate} disabled={saving}>
                                                            {saving ? "Wird angewendet..." : "Überschreiben"}
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {order.checklist && order.checklist.length > 0 ? (
                                        <div className="space-y-2">
                                            {order.checklist.map((item, index) => (
                                                <div
                                                    key={index}
                                                    className={cn(
                                                        "flex items-start gap-4 p-3 rounded-xl border transition-all duration-200 group",
                                                        item.completed
                                                            ? "bg-primary/5 border-primary/20 shadow-sm"
                                                            : "bg-card border-border/40 hover:border-primary/40 hover:bg-accent/5"
                                                    )}
                                                >
                                                    <Checkbox
                                                        id={`item-${index}`}
                                                        checked={item.completed}
                                                        onCheckedChange={(checked) => handleToggleChecklist(index, checked as boolean)}
                                                        className={cn(
                                                            "mt-0.5 transition-all duration-300",
                                                            item.completed ? "data-[state=checked]:bg-primary data-[state=checked]:border-primary" : "border-muted-foreground/40"
                                                        )}
                                                    />
                                                    <div className="grid gap-1 leading-none flex-1 py-0.5">
                                                        <label
                                                            htmlFor={`item-${index}`}
                                                            className={cn(
                                                                "text-sm font-medium leading-normal cursor-pointer transition-colors duration-300",
                                                                item.completed ? "text-muted-foreground/70" : "text-foreground"
                                                            )}
                                                        >
                                                            {typeof item === 'string' ? item : item.text}
                                                        </label>
                                                        {item.type === 'acceptance' && (
                                                            <div className="flex">
                                                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground bg-background/50 border-border/50">
                                                                    Annahme
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-xl border-muted/50 bg-muted/5">
                                            <PackageCheck className="h-10 w-10 mb-3 opacity-20" />
                                            <p className="font-medium">Keine Checkliste</p>
                                            <p className="text-xs max-w-[180px]">Wähle oben eine Vorlage aus, um zu starten.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column - Notes & Status */}
                        <div className="space-y-6">
                            {/* Internal Notes */}
                            <Card className="flex flex-col">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-base font-medium">Interne Notizen</CardTitle>
                                    {isNotesDirty && (
                                        <Badge variant="secondary" className="text-[10px] h-5">Ungespeichert</Badge>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-3 pt-4 flex-1">
                                    <Textarea
                                        placeholder="Notizen für Mechaniker eingeben..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="resize-none min-h-[150px] focus-visible:ring-primary/20"
                                    />
                                    <Button
                                        onClick={handleSaveNotes}
                                        disabled={saving || !isNotesDirty}
                                        className="w-full"
                                        size="sm"
                                        variant={isNotesDirty ? "default" : "outline"}
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Speichern...
                                            </>
                                        ) : isNotesDirty ? (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Änderungen speichern
                                            </>
                                        ) : (
                                            <>
                                                <Check className="mr-2 h-4 w-4 text-green-500" />
                                                Aktuell
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Status Change */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Status ändern</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {order.is_leasing && (
                                        <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-3">
                                            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                            <p className="text-xs text-yellow-700 dark:text-yellow-600">
                                                Leasing-Code wird bei Abholung erfasst
                                            </p>
                                        </div>
                                    )}

                                    {STATUS_OPTIONS.map((statusOption) => {
                                        const Icon = statusOption.icon
                                        const isActive = order.status === statusOption.value

                                        return (
                                            <Button
                                                key={statusOption.value}
                                                variant={isActive ? "default" : "outline"}
                                                className={`w-full justify-start ${isActive ? '' : 'text-foreground'}`}
                                                onClick={() => handleStatusChange(statusOption.value)}
                                                disabled={saving || isActive}
                                            >
                                                <Icon className="mr-2 h-4 w-4" />
                                                {statusOption.label}
                                            </Button>
                                        )
                                    })}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}
