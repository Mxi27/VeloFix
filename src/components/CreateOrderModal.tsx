import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Wrench, CreditCard, ChevronRight, ChevronLeft, Check, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"

interface CreateOrderModalProps {
    children?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onOrderCreated?: () => void
}

export function CreateOrderModal({ children, open, onOpenChange, onOrderCreated }: CreateOrderModalProps) {
    const { user, workshopId } = useAuth()
    const [templates, setTemplates] = useState<any[]>([])
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
    const [availableProviders, setAvailableProviders] = useState<string[]>([])
    const [acceptanceChecklistItems, setAcceptanceChecklistItems] = useState<string[]>([
        "Sichtprüfung auf Beschädigungen dokumentiert",
        "Zubehör/Ausstattung erfasst (Licht, Schloss, Gepäckträger etc.)",
        "Akkustand/Akku vorhanden geprüft (bei E-Bike)",
        "Kundenwunsch / Reparaturauftrag notiert",
        "Kostenvoranschlag/Preisrahmen kommuniziert",
        "Voraussichtliches Abholtermin besprochen"
    ])

    const [step, setStep] = useState(1)
    const [orderType, setOrderType] = useState<"standard" | "leasing" | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [checklistState, setChecklistState] = useState<boolean[]>([])

    // Update checklistState when items change
    useEffect(() => {
        setChecklistState(new Array(acceptanceChecklistItems.length).fill(false))
    }, [acceptanceChecklistItems])

    // Form States
    const [customerName, setCustomerName] = useState("")
    const [customerEmail, setCustomerEmail] = useState("")
    const [customerPhone, setCustomerPhone] = useState("")
    const [bikeModel, setCustomerBikeModel] = useState("")
    const [bikeType, setCustomerBikeType] = useState("")
    const [estimatedPrice, setEstimatedPrice] = useState("")
    const [leasingProvider, setLeasingProvider] = useState("")
    const [notes, setNotes] = useState("")

    // Fetch templates and providers when modal opens
    useEffect(() => {
        if (workshopId && open) {
            // Fetch Templates
            supabase
                .from('checklist_templates')
                .select('*')
                .eq('workshop_id', workshopId)
                .order('name')
                .then(({ data }) => {
                    if (data) setTemplates(data)
                })

            // Fetch Leasing Providers & Acceptance Checklist
            supabase
                .from('workshops')
                .select('leasing_providers, acceptance_checklist')
                .eq('id', workshopId)
                .single()
                .then(({ data }) => {
                    if (data?.leasing_providers && Array.isArray(data.leasing_providers)) {
                        setAvailableProviders(data.leasing_providers)
                    } else {
                        setAvailableProviders([])
                    }

                    if (data?.acceptance_checklist && Array.isArray(data.acceptance_checklist) && data.acceptance_checklist.length > 0) {
                        setAcceptanceChecklistItems(data.acceptance_checklist)
                    }
                })
        }
    }, [workshopId, open])

    // Reset state when modal closes
    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setStep(1)
            setOrderType(null)
            setChecklistState(new Array(acceptanceChecklistItems.length).fill(false))
            // Reset form
            setCustomerName("")
            setCustomerEmail("")
            setCustomerPhone("")
            setCustomerBikeModel("")
            setCustomerBikeType("")
            setEstimatedPrice("")
            setLeasingProvider("")
            setNotes("")
            setSelectedTemplateId(null)
        }
        onOpenChange?.(newOpen)
    }

    // STEPS:
    // ...

    // Step 4 Render
    // ...
    <div className="space-y-3">
        {acceptanceChecklistItems.map((item, i) => (
            <div key={i} className="flex items-center space-x-3 border border-border/50 rounded-lg p-3 bg-muted/20 hover:bg-muted/40 transition-colors">
                <Checkbox
                    id={`check-${i}`}
                    checked={checklistState[i] || false}
                    onCheckedChange={(checked) => {
                        const newState = [...checklistState]
                        newState[i] = checked === true
                        setChecklistState(newState)
                    }}
                />
                <label htmlFor={`check-${i}`} className="text-sm font-medium w-full cursor-pointer">
                    {item}
                </label>
            </div>
        ))}
    </div>



    // STEPS:
    // 1: Type
    // 2: Leasing (if leasing)
    // 3: Data
    // 4: Acceptance
    // 5: Work Checklist (New!)
    // 6: Summary

    const handleNext = () => {
        if (step === 1 && orderType === "standard") {
            setStep(3) // Skip Leasing Step
            return
        }
        if (step < 6) {
            setStep(step + 1)
        }
    }

    const handleBack = () => {
        if (step === 3 && orderType === "standard") {
            setStep(1) // Skip Leasing Step back
            return
        }
        if (step > 1) {
            setStep(step - 1)
        }
    }

    const handleSubmit = async () => {
        if (!user || !workshopId) return

        setIsSubmitting(true)
        try {
            // 1. Acceptance Items (Completed during onboarding)
            // 1. Acceptance Items (Completed during onboarding)
            const acceptanceItems = acceptanceChecklistItems.filter((_, i) => checklistState[i])
                .map(text => ({ text, completed: true, type: 'acceptance' }))

            // 2. Service Items (To be done by mechanic)
            let serviceItems: any[] = []
            if (selectedTemplateId) {
                const template = templates.find(t => t.id === selectedTemplateId)
                if (template?.items && Array.isArray(template.items)) {
                    serviceItems = template.items.map((item: any) => ({
                        text: item.text,
                        completed: false, // Reset completion for the order
                        type: 'service'
                    }))
                }
            }

            // Combine both
            const finalChecklist = [...acceptanceItems, ...serviceItems]

            const orderNumber = `AV-${Math.floor(Math.random() * 10000)}`

            const { error } = await supabase
                .from('orders')
                .insert({
                    workshop_id: workshopId,
                    order_number: orderNumber,
                    customer_name: customerName,
                    customer_email: customerEmail || null,
                    customer_phone: customerPhone || null,
                    bike_model: bikeModel || null,
                    bike_type: bikeType || null,
                    is_leasing: orderType === 'leasing',
                    status: 'eingegangen',
                    leasing_provider: orderType === 'leasing' ? leasingProvider : null,
                    estimated_price: parseFloat(estimatedPrice) || 0,
                    checklist: finalChecklist,
                    notes: notes ? [notes] : []
                })

            if (error) throw error

            handleOpenChange(false)
            onOrderCreated?.()
        } catch (error: any) {
            console.error('Error creating order:', error)
            alert(`Fehler: ${error.message}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    const getStepTitle = () => {
        switch (step) {
            case 1: return "Neuer Auftrag"
            case 2: return "Leasing-Daten"
            case 3: return "Kunden- & Fahrraddaten"
            case 4: return "Annahme-Checkliste"
            case 5: return "Arbeits-Checkliste"
            case 6: return "Abschluss"
            default: return "Neuer Auftrag"
        }
    }

    const isStepValid = () => {
        switch (step) {
            case 1:
                return !!orderType
            case 2:
                return orderType === 'leasing' ? !!leasingProvider : true
            case 3:
                return !!(
                    customerName &&
                    customerEmail &&
                    customerPhone &&
                    bikeModel &&
                    bikeType
                )
            case 4:
                return checklistState.every(item => item)
            case 5:
                return true // Optional to select a template
            default:
                return true
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {children && <DialogTrigger asChild>{children}</DialogTrigger>}
            <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden bg-card text-card-foreground border-border gap-0">
                <div className="p-6 pb-4 border-b border-border/50">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">{getStepTitle()}</DialogTitle>
                    </DialogHeader>

                    {/* Progress Bar */}
                    <div className="flex gap-2 mt-6">
                        {[1, 2, 3, 4, 5, 6].map((s) => {
                            if (orderType === "standard" && s === 2) return null;
                            return (
                                <div
                                    key={s}
                                    className={cn(
                                        "h-1 flex-1 rounded-full transition-all duration-300",
                                        s <= step ? "bg-primary" : "bg-primary/20"
                                    )}
                                />
                            )
                        })}
                    </div>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {/* Step 1-3 preserved in UI rendering logic... */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-medium">Auftragstyp wählen</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                    onClick={() => setOrderType("standard")}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-8 rounded-xl border-2 transition-all gap-4 text-center hover:bg-accent/50",
                                        orderType === "standard"
                                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                                            : "border-border bg-card"
                                    )}
                                >
                                    <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                                        <Wrench className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="font-semibold">Standard</div>
                                        <div className="text-xs text-muted-foreground">Normale Reparatur</div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setOrderType("leasing")}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-8 rounded-xl border-2 transition-all gap-4 text-center hover:bg-accent/50",
                                        orderType === "leasing"
                                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                                            : "border-border bg-card"
                                    )}
                                >
                                    <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                                        <CreditCard className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="font-semibold">Leasing</div>
                                        <div className="text-xs text-muted-foreground">Mit Abrechnungs-Code</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-medium">Leasing-Informationen</h3>
                            <div className="space-y-2">
                                <Label htmlFor="provider">Leasing-Anbieter *</Label>
                                {availableProviders.length > 0 ? (
                                    <Select value={leasingProvider} onValueChange={setLeasingProvider}>
                                        <SelectTrigger id="provider" className="bg-muted/50">
                                            <SelectValue placeholder="Anbieter auswählen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableProviders.map(provider => (
                                                <SelectItem key={provider} value={provider}>
                                                    {provider}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="text-sm text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-900">
                                        Keine Leasing-Anbieter konfiguriert. Bitte fügen Sie diese in den Einstellungen hinzu.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-medium">Kunden- & Fahrraddaten</h3>
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name *</Label>
                                    <Input
                                        id="name"
                                        placeholder="Max Mustermann"
                                        className="bg-muted/50"
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">E-Mail *</Label>
                                        <Input
                                            id="email"
                                            placeholder="max@beispiel.de"
                                            className="bg-muted/50"
                                            value={customerEmail}
                                            onChange={e => setCustomerEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Telefon *</Label>
                                        <Input
                                            id="phone"
                                            placeholder="+49 123..."
                                            className="bg-muted/50"
                                            value={customerPhone}
                                            onChange={e => setCustomerPhone(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-border/50 my-2" />

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="model">Fahrrad-Modell *</Label>
                                        <Input
                                            id="model"
                                            placeholder="Trek Domane"
                                            className="bg-muted/50"
                                            value={bikeModel}
                                            onChange={e => setCustomerBikeModel(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="type">Fahrrad-Typ *</Label>
                                        <Select value={bikeType} onValueChange={setCustomerBikeType}>
                                            <SelectTrigger className="bg-muted/50">
                                                <SelectValue placeholder="Auswählen" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="road">Rennrad</SelectItem>
                                                <SelectItem value="mtb">Mountainbike</SelectItem>
                                                <SelectItem value="city">Citybike</SelectItem>
                                                <SelectItem value="ebike">E-Bike</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="price">Geschätzter Preis (optional)</Label>
                                    <div className="relative">
                                        <Input
                                            id="price"
                                            placeholder="0.00"
                                            type="number"
                                            className="pl-3 pr-8 bg-muted/50"
                                            value={estimatedPrice}
                                            onChange={e => setEstimatedPrice(e.target.value)}
                                        />
                                        <span className="absolute right-3 top-2.5 text-muted-foreground">€</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <ClipboardList className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium">Annahme-Checkliste</h3>
                                    <p className="text-sm text-muted-foreground">Alle Punkte müssen bestätigt werden</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {acceptanceChecklistItems.map((item, i) => (
                                    <div key={i} className="flex items-center space-x-3 border border-border/50 rounded-lg p-3 bg-muted/20 hover:bg-muted/40 transition-colors">
                                        <Checkbox
                                            id={`check-${i}`}
                                            checked={checklistState[i] || false}
                                            onCheckedChange={(checked) => {
                                                const newState = [...checklistState]
                                                newState[i] = checked === true
                                                setChecklistState(newState)
                                            }}
                                        />
                                        <label htmlFor={`check-${i}`} className="text-sm font-medium w-full cursor-pointer">
                                            {item}
                                        </label>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2 pt-2">
                                <Label className="text-sm font-medium">Anmerkungen (optional)</Label>
                                <Textarea
                                    className="bg-muted/20 min-h-[80px]"
                                    placeholder="Kratzer, Besonderheiten..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 5: Service Checklist Selection (NEW) */}
                    {step === 5 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <ClipboardList className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium">Arbeits-Checkliste zuweisen</h3>
                                    <p className="text-sm text-muted-foreground">Wählen Sie eine Vorlage für die Werkstatt</p>
                                </div>
                            </div>

                            <div className="grid gap-3">
                                <div
                                    className={cn(
                                        "flex items-center p-4 border rounded-lg cursor-pointer transition-all",
                                        selectedTemplateId === null
                                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                                            : "border-border hover:bg-accent/50"
                                    )}
                                    onClick={() => setSelectedTemplateId(null)}
                                >
                                    <div className="flex-1">
                                        <h4 className="font-medium">Keine Vorlage</h4>
                                        <p className="text-sm text-muted-foreground">Leere Checkliste starten</p>
                                    </div>
                                    {selectedTemplateId === null && <Check className="h-5 w-5 text-primary" />}
                                </div>

                                {templates.map(template => (
                                    <div
                                        key={template.id}
                                        className={cn(
                                            "flex items-center p-4 border rounded-lg cursor-pointer transition-all",
                                            selectedTemplateId === template.id
                                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                                : "border-border hover:bg-accent/50"
                                        )}
                                        onClick={() => setSelectedTemplateId(template.id)}
                                    >
                                        <div className="flex-1">
                                            <h4 className="font-medium">{template.name}</h4>
                                            {template.description && (
                                                <p className="text-sm text-muted-foreground">{template.description}</p>
                                            )}
                                        </div>
                                        {selectedTemplateId === template.id && <Check className="h-5 w-5 text-primary" />}
                                    </div>
                                ))}

                                {templates.length === 0 && (
                                    <div className="text-center p-6 border border-dashed rounded-lg text-muted-foreground">
                                        <p>Keine Vorlagen gefunden.</p>
                                        <p className="text-sm">Erstellen Sie Vorlagen in den Einstellungen.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 6 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-medium">Bereit zum Erstellen?</h3>
                            <div className="bg-muted p-4 rounded-lg space-y-3">
                                <h4 className="font-semibold mb-2">Zusammenfassung</h4>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                    <li><strong>Typ:</strong> {orderType === "leasing" ? "Leasing" : "Standard"}</li>
                                    <li><strong>Kunde:</strong> {customerName}</li>
                                    <li><strong>Rad:</strong> {bikeModel} ({bikeType})</li>
                                    {orderType === "leasing" && <li><strong>Provider:</strong> {leasingProvider}</li>}
                                    <li><strong>Preis:</strong> {estimatedPrice} €</li>
                                </ul>

                                <div className="border-t border-border/20 pt-2 mt-2">
                                    <p className="text-sm">
                                        <strong>Checkliste:</strong>{" "}
                                        {selectedTemplateId
                                            ? templates.find(t => t.id === selectedTemplateId)?.name
                                            : "Keine Vorlage gewählt"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 pt-2 border-t border-border/50 bg-muted/10 flex justify-between items-center">
                    {step > 1 ? (
                        <Button variant="outline" onClick={handleBack} className="px-6 border-border/50">
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Zurück
                        </Button>
                    ) : (
                        <div />
                    )}

                    {step < 6 ? (
                        <Button
                            onClick={handleNext}
                            disabled={!isStepValid()}
                            className="px-8"
                        >
                            Weiter
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-8"
                        >
                            {isSubmitting ? "Wird erstellt..." : "Auftrag erstellen"}
                            {!isSubmitting && <Check className="ml-2 h-4 w-4" />}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
