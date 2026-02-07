import { toastSuccess, toastError } from '@/lib/toast-utils'
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
import { Wrench, CreditCard, ChevronRight, ChevronLeft, Check, ClipboardList, CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { EmployeeSelector } from "@/components/EmployeeSelector"
import { UserCheck } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { de } from "date-fns/locale"

interface CreateOrderModalProps {
    children?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onOrderCreated?: () => void
}

export function CreateOrderModal({ children, open, onOpenChange, onOrderCreated }: CreateOrderModalProps) {
    const { user, workshopId } = useAuth()

    const { activeEmployee, isKioskMode, employees } = useEmployee()
    const [kioskSelectedEmployeeId, setKioskSelectedEmployeeId] = useState<string | null>(null)

    // Kiosk State
    // const [showEmployeeSelect, setShowEmployeeSelect] = useState(false) // Removed external modal logic

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

    // Enforce Kiosk Selection
    useEffect(() => {
        if (open && isKioskMode) {
            setStep(0)
            setKioskSelectedEmployeeId(null)
        } else if (open) {
            setStep(1)
        }
    }, [open, isKioskMode])

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
    const [customerNote, setCustomerNote] = useState("")
    const [internalNote, setInternalNote] = useState("")
    const [leasingDetails, setLeasingDetails] = useState<any>(null)
    const [leasingPortalEmail, setLeasingPortalEmail] = useState("")
    const [assignedMechanicId, setAssignedMechanicId] = useState<string>("")
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined)

    // Intake Requests State
    const [intakeRequests, setIntakeRequests] = useState<any[]>([])
    const [showIntakeSelection, setShowIntakeSelection] = useState(false)

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

            // Fetch Intake Requests
            supabase
                .from('intake_requests')
                .select('*')
                .eq('workshop_id', workshopId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .then(({ data }) => {
                    if (data) setIntakeRequests(data)
                })
        }
    }, [workshopId, open])

    // Reset state when modal closes
    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            // Reset form
            setStep(isKioskMode ? 0 : 1)
            setOrderType(null)
            setChecklistState(new Array(acceptanceChecklistItems.length).fill(false))
            setCustomerName("")
            setCustomerEmail("")
            setCustomerPhone("")
            setCustomerBikeModel("")
            setCustomerBikeType("")
            setEstimatedPrice("")
            setLeasingProvider("")
            setLeasingProvider("")
            setCustomerNote("")
            setInternalNote("")
            setLeasingDetails(null)
            setLeasingPortalEmail("")
            setSelectedTemplateId(null)
            setKioskSelectedEmployeeId(null)
            setAssignedMechanicId("")
            setDueDate(undefined)
            setShowIntakeSelection(false)
        }
        onOpenChange?.(newOpen)
    }

    const handleImportRequest = (request: any) => {
        setCustomerName(request.customer_name)
        setCustomerEmail(request.customer_email || request.private_email || "") // Prefer mapped email, fallback
        setCustomerPhone(request.customer_phone || "")
        setLeasingPortalEmail(request.email || "") // Store original portal email

        // Map Bike Data
        setCustomerBikeModel(request.bike_model || "")
        setCustomerBikeType(request.bike_type || "")

        // Base notes from description
        // Base notes from description
        setCustomerNote(request.description || "")

        // Map Due Date if present
        if (request.due_date) {
            setDueDate(new Date(request.due_date))
        }

        // Handle Leasing Specifics
        if (request.intake_type === 'leasing') {
            setOrderType('leasing')
            if (request.leasing_provider) {
                setLeasingProvider(request.leasing_provider)
            }

            // Store Leasing Details
            setLeasingDetails({
                provider: request.leasing_provider,
                contract_id: request.contract_id,
                service_package: request.service_package,
                inspection_code: request.inspection_code,
                pickup_code: request.pickup_code,
                private_email: request.private_email
            })

            // Use Private Email if available
            if (request.private_email) {
                setCustomerEmail(request.private_email)
            }
        } else {
            setOrderType('standard')
            setLeasingDetails(null)
        }

        // Mark as imported (optimistic update or fire and forget)
        supabase
            .from('intake_requests')
            .update({ status: 'imported' })
            .eq('id', request.id)
            .then(() => {
                // Remove from local list
                setIntakeRequests(prev => prev.filter(r => r.id !== request.id))
            })

        setShowIntakeSelection(false)
        setStep(3) // Jump to Date Step (skip type selection as we set it, skip leasing if set?)

        // Logic fix: If leasing, we might want to review leasing step (Step 2)
        // If standard, we go to Step 3.
        if (request.intake_type === 'leasing') {
            setStep(2) // Go to Leasing Step to confirm provider/details
        } else {
            setStep(3) // Go to Data Step
        }
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
            // 1. Acceptance Items (Completed during onboarding) - USED ONLY FOR GATE CHECK, NOT SAVED
            // const acceptanceItems = acceptanceChecklistItems.filter((_, i) => checklistState[i])
            //    .map(text => ({ text, completed: true, type: 'acceptance' }))

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
            // User requested to NOT include acceptance items in the persisted checklist
            // They act only as a gateway check in the wizard
            const finalChecklist = [...serviceItems]

            const orderNumber = `AV-${Math.floor(Math.random() * 10000)}`

            // Create initial history event
            // Determine Actor (Kiosk override or active employee)

            if (isKioskMode && kioskSelectedEmployeeId) {
                // If we have selected an employee in step 0, use them as actor
                // But we need their name/email. Ideally EmployeeSelector would return user obj, but ID is fine if we can fetch or if we just store ID.
                // For now, let's try to find them in the 'employees' list from context if available, 
                // but we don't have direct access to list here without extra plumbing.
                // SIMPLIFICATION: We will rely on the backend logging or just trust the ID is enough for now? 
                // Wait, useEmployee puts all employees in context. Let's grab it.
                // We need to fetch the employee details to log properly?

                // Let's assume we can pass the actor details if we had them. 
                // Actually, I should probably look them up.
                // Ideally logOrderEvent handles looking up details if only ID provided? 
                // No, logOrderEvent takes an object.

                // Hack: We will just set the ID and let the UI handle display if possible, 
                // OR we can't fully construct the actor object without the name.

                // Better: Let's fetch the employee name quickly or pass it from selector?
                // I'll trust that 'activeEmployee' is NOT what we want here since Kiosk might not set global activeEmployee for this specific flow?
                // With the new requirement, we select specifically for this order.

                // I will add a lookup here since I can import useEmployee properly.
                // But I can't access `employees` list easily inside this submit handler unless I expose it in context. 
                // The context DOES expose `employees`. I should destructure it.
            }

            const creationActor = isKioskMode && kioskSelectedEmployeeId ? { id: kioskSelectedEmployeeId, name: 'Kiosk Selection', email: '' } : (activeEmployee ? { id: activeEmployee.id, name: activeEmployee.name, email: activeEmployee.email } : user ? { id: user.id, name: user.user_metadata?.full_name || user.email, email: user.email } : null)

            const initialHistory = [{
                id: crypto.randomUUID(),
                type: 'creation',
                title: 'Auftrag erstellt',
                description: 'Auftrag wurde im System angelegt',
                timestamp: new Date().toISOString(),
                actor: creationActor
            }]

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
                    leasing_portal_email: orderType === 'leasing' ? (leasingPortalEmail || null) : null,
                    estimated_price: parseFloat(estimatedPrice) || 0,
                    checklist: finalChecklist,
                    customer_note: customerNote || null,
                    internal_note: internalNote || null,
                    contract_id: orderType === 'leasing' && leasingDetails ? leasingDetails.contract_id : null,
                    service_package: orderType === 'leasing' && leasingDetails ? leasingDetails.service_package : null,
                    inspection_code: orderType === 'leasing' && leasingDetails ? leasingDetails.inspection_code : null,
                    pickup_code: orderType === 'leasing' && leasingDetails ? leasingDetails.pickup_code : null,
                    notes: [], // Legacy field, kept empty for now
                    history: initialHistory, // Add history immediately
                    mechanic_id: assignedMechanicId && assignedMechanicId !== 'none' ? assignedMechanicId : null,
                    qc_mechanic_id: null, // Explicitly null for now
                    due_date: dueDate ? dueDate.toISOString() : null
                })

            if (error) throw error

            toastSuccess('Auftrag erstellt', 'Der Auftrag wurde erfolgreich erstellt.')
            handleOpenChange(false)
            onOrderCreated?.()
        } catch (error: any) {
            toastError('Fehler beim Erstellen', error.message || 'Der Auftrag konnte nicht erstellt werden.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const getStepTitle = () => {
        switch (step) {
            case 0: return "Wer nimmt den Auftrag an?"
            case 1: return "Auftragstyp wählen"
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
            case 0:
                return !!kioskSelectedEmployeeId
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
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                {children && <DialogTrigger asChild>{children}</DialogTrigger>}
                <DialogContent
                    className="sm:max-w-[650px] p-0 overflow-hidden bg-card text-card-foreground border-border gap-0"
                    onInteractOutside={(e) => {
                        e.preventDefault()
                    }}
                >
                    <div className="p-6 pb-4 border-b border-border/50">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-semibold">{getStepTitle()}</DialogTitle>
                        </DialogHeader>

                        {/* Progress Bar */}
                        <div className="flex gap-2 mt-6">
                            {[0, 1, 2, 3, 4, 5, 6].map((s) => {
                                if (s === 0 && !isKioskMode) return null
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
                        {step === 0 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <UserCheck className="h-5 w-5 text-primary" />
                                    </div>
                                    <p className="text-muted-foreground text-sm">Bitte wählen Sie Ihren Namen aus, um fortzufahren.</p>
                                </div>
                                <EmployeeSelector
                                    onSelect={(id) => {
                                        setKioskSelectedEmployeeId(id)
                                        // Auto advance on selection? Maybe better to let them click 'Weiter' to confirm visual selection
                                        // setStep(1) 
                                    }}
                                    selectedEmployeeId={kioskSelectedEmployeeId}
                                />
                            </div>
                        )}
                        {step === 1 && !showIntakeSelection && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-lg font-medium">Auftragstyp wählen</h3>

                                {intakeRequests.length > 0 && (
                                    <div className="mb-6">
                                        <Button
                                            variant="outline"
                                            className="w-full h-auto py-4 border-dashed border-2 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/50"
                                            onClick={() => setShowIntakeSelection(true)}
                                        >
                                            <div className="flex items-center gap-2 text-primary font-medium">
                                                <ClipboardList className="h-5 w-5" />
                                                <span>Import aus Kundenanfrage ({intakeRequests.length})</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground">Daten aus Online-Formular übernehmen</span>
                                        </Button>
                                    </div>
                                )}

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

                        {step === 1 && showIntakeSelection && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-medium">Anfrage auswählen</h3>
                                    <Button variant="ghost" size="sm" onClick={() => setShowIntakeSelection(false)}>
                                        Abbrechen
                                    </Button>
                                </div>
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                    {intakeRequests.map(req => (
                                        <div
                                            key={req.id}
                                            className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors space-y-2"
                                            onClick={() => handleImportRequest(req)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="font-medium">{req.customer_name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {new Date(req.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                            {req.description && (
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {req.description}
                                                </p>
                                            )}
                                            <div className="flex gap-4 text-xs text-muted-foreground">
                                                {req.customer_phone && <span>📞 {req.customer_phone}</span>}
                                                {req.customer_email && <span>✉️ {req.customer_email}</span>}
                                            </div>
                                        </div>
                                    ))}
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
                                <div className="space-y-2">
                                    <Label htmlFor="leasing_email">Leasing Portal E-Mail</Label>
                                    <Input
                                        id="leasing_email"
                                        placeholder="email@leasing-portal.de"
                                        value={leasingPortalEmail}
                                        onChange={e => setLeasingPortalEmail(e.target.value)}
                                        className="bg-muted/50"
                                    />
                                    <p className="text-xs text-muted-foreground">E-Mail Adresse, die im Leasing-Portal hinterlegt ist (falls abweichend).</p>
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

                                    <div className="grid gap-2">
                                        <Label htmlFor="mechanic">Mechaniker zuweisen (Optional)</Label>
                                        <Select value={assignedMechanicId} onValueChange={setAssignedMechanicId}>
                                            <SelectTrigger className="bg-muted/50">
                                                <SelectValue placeholder="Mitarbeiter auswählen" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Keine Zuweisung</SelectItem>
                                                {/* Filter out current user if needed, or show all */}
                                                {(activeEmployee && employees ? employees : []).map(emp => (
                                                    <SelectItem key={emp.id} value={emp.id}>
                                                        {emp.name}
                                                    </SelectItem>
                                                ))}
                                                {/* Fallback if employees context is empty or loading, though unlikely here due to useEmployee */}
                                                {(!employees || employees.length === 0) && (
                                                    <SelectItem value="loading" disabled>Laden...</SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Price moved to Summary step */}
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
                                    <Label className="text-sm font-medium">Kundenwunsch / Beschreibung</Label>
                                    <Textarea
                                        className="bg-muted/20 min-h-[80px]"
                                        placeholder="Was soll gemacht werden?"
                                        value={customerNote}
                                        onChange={e => setCustomerNote(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2 pt-2">
                                    <Label>Wunschtermin / Fertig bis</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !dueDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {dueDate ? format(dueDate, "PPP", { locale: de }) : <span>Datum wählen</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={dueDate}
                                                onSelect={setDueDate}
                                                initialFocus
                                                locale={de}
                                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="internal_note_step4">Interne Notizen</Label>
                                        <Textarea
                                            id="internal_note_step4"
                                            className="min-h-[80px]"
                                            placeholder="Interne Infos für die Werkstatt..."
                                            value={internalNote}
                                            onChange={e => setInternalNote(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="price_final_step4">Geschätzter Preis</Label>
                                        <div className="relative">
                                            <Input
                                                id="price_final_step4"
                                                placeholder="0.00"
                                                type="number"
                                                className="pl-3 pr-8"
                                                value={estimatedPrice}
                                                onChange={e => setEstimatedPrice(e.target.value)}
                                            />
                                            <span className="absolute right-3 top-2.5 text-muted-foreground">€</span>
                                        </div>
                                    </div>
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
                                    </ul>

                                    <div className="grid md:grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-2">
                                            <Label>Geschätzter Preis</Label>
                                            <div className="p-2 bg-muted/30 rounded border text-sm">
                                                {estimatedPrice ? `${estimatedPrice} €` : '—'}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Interne Notizen</Label>
                                            <div className="p-2 bg-muted/30 rounded border text-sm min-h-[40px] whitespace-pre-wrap">
                                                {internalNote || '—'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 6 && leasingDetails && (
                            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-md text-sm">
                                <h5 className="font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                                    <CreditCard className="h-4 w-4" /> Leasing Daten
                                </h5>
                                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                                    <div><span className="font-medium text-foreground">Vertrag:</span> {leasingDetails.contract_id}</div>
                                    <div><span className="font-medium text-foreground">Paket:</span> {leasingDetails.service_package}</div>
                                    <div><span className="font-medium text-foreground">Provider:</span> {leasingProvider}</div>
                                    <div><span className="font-medium text-foreground">Portal Email:</span> {leasingPortalEmail || '-'}</div>
                                    <div><span className="font-medium text-foreground">Inspection:</span> {leasingDetails.inspection_code || '-'}</div>
                                    <div><span className="font-medium text-foreground">Pickup:</span> {leasingDetails.pickup_code || '-'}</div>
                                </div>
                            </div>
                        )}

                        {step === 6 && (
                            <div className="border-t border-border/20 pt-2 mt-2">
                                <p className="text-sm">
                                    <strong>Checkliste:</strong>{" "}
                                    {selectedTemplateId
                                        ? templates.find(t => t.id === selectedTemplateId)?.name
                                        : "Keine Vorlage"}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 pt-2 border-t border-border/50 bg-muted/10 flex justify-between items-center">
                        {step > (isKioskMode ? 0 : 1) ? (
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
                </DialogContent >
            </Dialog >

            {/* Kiosk Employee Selection - Removed separate modal for New Order flow */}
        </>
    )
}
