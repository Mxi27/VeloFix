import { toastSuccess, toastError } from '@/lib/toast-utils'
import { useEffect, useState } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { OrderHistory } from "@/components/OrderHistory"
import { logOrderEvent } from "@/lib/history"
import type { OrderHistoryEvent } from "@/lib/history"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
    Loader2,
    Archive,
    Wrench,
    ShieldCheck,
    Pencil,
    Trash2,
    Copy
} from "lucide-react"
import { LoadingScreen } from "@/components/LoadingScreen"
import { PageTransition } from "@/components/PageTransition"
import { STATUS_COLORS } from "@/lib/constants"
import { useEmployee } from "@/contexts/EmployeeContext"
import { EmployeeSelectionModal } from "@/components/EmployeeSelectionModal"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const STATUS_FLOW = [
    { value: 'eingegangen', label: 'Eingegangen', icon: Clock, color: STATUS_COLORS.eingegangen },
    { value: 'warten_auf_teile', label: 'Warten auf Teile', icon: Pause, color: STATUS_COLORS.warten_auf_teile },
    { value: 'in_bearbeitung', label: 'In Bearbeitung', icon: Play, color: STATUS_COLORS.in_bearbeitung },
    { value: 'abholbereit', label: 'Abholbereit', icon: PackageCheck, color: STATUS_COLORS.abholbereit },
]

const LEASING_STATUS = { value: 'abgeholt', label: 'Abgeholt', icon: Check, color: STATUS_COLORS.abgeholt }
const COMPLETED_STATUS = { value: 'abgeschlossen', label: 'Abgeschlossen', icon: Archive, color: STATUS_COLORS.abgeschlossen }

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
    leasing_portal_email: string | null
    status: string
    created_at: string
    estimated_price: number | null
    final_price: number | null
    checklist: ChecklistItem[] | null
    notes: string[] | null
    internal_note: string | null
    customer_note: string | null
    contract_id: string | null
    service_package: string | null
    inspection_code: string | null
    pickup_code: string | null
    leasing_code: string | null
    history: OrderHistoryEvent[] | null
    end_control: {
        steps: any[]
        completed: boolean
        rating?: number
        feedback?: string
    } | null
    mechanic_id: string | null
    qc_mechanic_id: string | null
}

const BIKE_TYPE_LABELS: Record<string, string> = {
    road: 'Rennrad',
    mtb: 'Mountainbike',
    city: 'Citybike',
    ebike: 'E-Bike'
}

export default function OrderDetailPage() {
    const { orderId } = useParams<{ orderId: string }>()
    const navigate = useNavigate()
    const { workshopId, user, userRole } = useAuth()
    const [order, setOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [templates, setTemplates] = useState<any[]>([])
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const isReadOnly = userRole === 'read'

    // Editable fields
    // Editable fields
    const [internalNote, setInternalNote] = useState("")
    const [customerNote, setCustomerNote] = useState("")


    // Leasing dialog state
    const [isLeasingDialogOpen, setIsLeasingDialogOpen] = useState(false)
    const [leasingCodeInput, setLeasingCodeInput] = useState("")

    // Assignment State
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false)
    const [assignmentType, setAssignmentType] = useState<'mechanic' | 'qc'>('mechanic')

    const getEmployeeName = (id: string) => {
        if (!employees) return "Lade..."
        return employees.find(e => e.id === id)?.name || "Unbekannt"
    }

    const handleAssignment = async (employeeId: string) => {
        if (!order) return

        const updateData = assignmentType === 'mechanic'
            ? { mechanic_id: employeeId }
            : { qc_mechanic_id: employeeId }

        console.log("Assigning:", updateData) // DEBUG

        const { error } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', order.id)

        if (error) {
            console.error(error)
            toastError("Fehler", "Zuweisung konnte nicht gespeichert werden.")
        } else {
            // Update local state
            setOrder(prev => prev ? ({ ...prev, ...updateData }) : null)
            setIsAssignmentModalOpen(false)
            toastSuccess("Zuweisung aktualisiert", `Mitarbeiter wurde erfolgreich zugewiesen.`)

            // Log Event
            const empName = getEmployeeName(employeeId)
            const fieldName = assignmentType === 'mechanic' ? 'Mechaniker' : 'Qualitätskontrolle'
            logOrderEvent(order.id, {
                type: 'info',
                title: 'Zuweisung geändert',
                description: `${fieldName} wurde ${empName} zugewiesen.`,
                actor: user ? { id: user.id, name: user.email || 'User' } : undefined
            }, user).catch(console.error)
        }
    }

    // Kiosk Interception
    const { isKioskMode, employees } = useEmployee()
    const [showEmployeeSelect, setShowEmployeeSelect] = useState(false)
    const [pendingAction, setPendingAction] = useState<{
        type: 'status' | 'save_notes_data' | 'save_leasing' | 'save_price_data' | 'toggle_checklist' | 'save_customer' | 'save_bike' | 'save_customer_note',
        payload?: any
    } | null>(null)

    const [showExitDialog, setShowExitDialog] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const handleDeleteOrder = async () => {
        if (!order) return

        try {
            // Soft Delete (Move to Trash)
            const { error } = await supabase
                .from('orders')
                .update({ status: 'trash', trash_date: new Date().toISOString() })
                .eq('id', order.id)

            if (error) throw error

            // Smooth transition support
            if (document.startViewTransition) {
                document.startViewTransition(() => {
                    navigate(returnPath)
                })
            } else {
                navigate(returnPath)
            }
        } catch (error: any) {
            toastError('Fehler beim Löschen', error.message || 'Der Auftrag konnte nicht gelöscht werden.')
        }
    }

    // Customer Edit State
    const [isCustomerEditDialogOpen, setIsCustomerEditDialogOpen] = useState(false)
    const [editCustomerName, setEditCustomerName] = useState("")
    const [editCustomerEmail, setEditCustomerEmail] = useState("")
    const [editCustomerPhone, setEditCustomerPhone] = useState("")


    // Bike Edit State
    const [isBikeEditDialogOpen, setIsBikeEditDialogOpen] = useState(false)
    const [editBikeModel, setEditBikeModel] = useState("")
    const [editBikeType, setEditBikeType] = useState("")

    // Standardized Edit States
    const [isInternalNoteEditDialogOpen, setIsInternalNoteEditDialogOpen] = useState(false)
    const [editInternalNote, setEditInternalNote] = useState("")

    const [isPriceEditDialogOpen, setIsPriceEditDialogOpen] = useState(false)
    const [editEstimatedPrice, setEditEstimatedPrice] = useState("")
    const [editFinalPrice, setEditFinalPrice] = useState("")

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
                setInternalNote(orderResult.data.internal_note || "")
                setCustomerNote(orderResult.data.customer_note || "")
                setEditInternalNote(orderResult.data.internal_note || "")
                setEditInternalNote(orderResult.data.internal_note || "")


                setEditFinalPrice(orderResult.data.final_price?.toString() || "")
                setEditEstimatedPrice(orderResult.data.estimated_price?.toString() || "")
                // Initialize leasing code input properly to allow editing
                setLeasingCodeInput(orderResult.data.leasing_code || "")
            }

            if (templatesResult.data) {
                setTemplates(templatesResult.data)
            }

            setLoading(false)
        }

        fetchOrder()

        // Realtime subscription
        const channel = supabase
            .channel(`order_detail_${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `id=eq.${orderId}`
                },
                (payload) => {
                    const newOrder = payload.new as Order
                    setOrder((currentOrder) => {
                        if (!currentOrder) return null;
                        // Merge updates safely
                        return {
                            ...currentOrder,
                            status: newOrder.status,
                            checklist: newOrder.checklist,
                            notes: newOrder.notes,
                            leasing_code: newOrder.leasing_code,
                            final_price: newOrder.final_price
                            // updated_at not strictly needed or in interface
                        } as Order
                    })

                    // Also update editable fields to match new state if we aren't editing them right now?
                    // For simplicity, we assume we want latest server state. 
                    // To avoid overwriting local edits if user is typing, we might check saving state 
                    // but for checklist sync (primary goal), updating state is key.
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [workshopId, orderId])

    // Handler for Kiosk selection
    const handleEmployeeSelected = (employeeId: string) => {
        const selectedEmp = employees.find(e => e.id === employeeId)
        if (!selectedEmp || !pendingAction) {
            setShowEmployeeSelect(false)
            setPendingAction(null)
            return
        }

        const actor = {
            id: selectedEmp.id,
            name: selectedEmp.name,
            email: selectedEmp.email || undefined
        }

        // Execute pending action with actor override
        switch (pendingAction.type) {
            case 'status':
                handleStatusChange(pendingAction.payload, actor)
                break
            case 'save_leasing':
                handleSaveLeasingCode(actor)
                break
            // Legacy cases removed or updated
            case 'toggle_checklist':
                handleToggleChecklist(pendingAction.payload.index, pendingAction.payload.checked, actor)
                break
            case 'save_customer':
                handleSaveCustomerData(actor)
                break
            case 'save_bike':
                handleSaveBikeData(actor)
                break
            case 'save_notes_data':
                handleSaveInternalNotesData(actor)
                break
            case 'save_price_data':
                handleSavePriceData(actor)
                break
        }

        setShowEmployeeSelect(false)
        setPendingAction(null)
    }

    const handleSaveCustomerData = async (actorOverride?: { id: string, name: string }) => {
        if (!order) return

        if (isKioskMode && !actorOverride) {
            setPendingAction({ type: 'save_customer' })
            setShowEmployeeSelect(true)
            return
        }

        setSaving(true)
        const updates = {
            customer_name: editCustomerName,
            customer_email: editCustomerEmail || null,
            customer_phone: editCustomerPhone || null
        }

        const { error } = await supabase
            .from('orders')
            .update(updates)
            .eq('id', order.id)

        if (error) {
            toastError('Fehler beim Speichern', 'Die Kundendaten konnten nicht gespeichert werden.')
        } else {
            setOrder({ ...order, ...updates })
            setIsCustomerEditDialogOpen(false)

            // Log Event
            logOrderEvent(order.id, {
                type: 'info',
                title: 'Kundendaten aktualisiert',
                description: `Kundendaten bearbeitet von ${actorOverride?.name || user?.email || 'User'}`,
                actor: actorOverride
            }, user).catch(console.error)
        }
        setSaving(false)
    }

    const handleSaveBikeData = async (actorOverride?: { id: string, name: string }) => {
        if (!order) return

        if (isKioskMode && !actorOverride) {
            setPendingAction({ type: 'save_bike' })
            setShowEmployeeSelect(true)
            return
        }

        setSaving(true)
        const updates = {
            bike_model: editBikeModel,
            bike_type: editBikeType || null
        }

        const { error } = await supabase
            .from('orders')
            .update(updates)
            .eq('id', order.id)

        if (error) {
            toastError('Fehler beim Speichern', 'Die Fahrraddaten konnten nicht gespeichert werden.')
        } else {
            setOrder({ ...order, ...updates })
            setIsBikeEditDialogOpen(false)

            // Log Event
            logOrderEvent(order.id, {
                type: 'info',
                title: 'Fahrraddaten aktualisiert',
                description: `Fahrraddaten bearbeitet von ${actorOverride?.name || user?.email || 'User'}`,
                actor: actorOverride
            }, user).catch(console.error)
        }
        setSaving(false)
    }

    const handleStatusChange = async (newStatus: string, actorOverride?: { id: string, name: string }) => {
        if (!order || saving) return

        // Intercept Kiosk Mode
        if (isKioskMode && !actorOverride) {
            setPendingAction({ type: 'status', payload: newStatus })
            setShowEmployeeSelect(true)
            return
        }

        setSaving(true)

        try {
            // 1. Update status
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', order.id)

            if (error) throw error

            // 2. Prepare History Event Data
            const newStatusLabel = [...STATUS_FLOW, LEASING_STATUS, COMPLETED_STATUS].find(s => s.value === newStatus)?.label || newStatus

            const event = await logOrderEvent(
                order.id,
                {
                    type: 'status_change',
                    title: 'Status geändert',
                    description: `Status zu "${newStatusLabel}" geändert`,
                    metadata: { old_status: order.status, new_status: newStatus },
                    actor: actorOverride
                },
                user
            )

            // 3. Update local state
            setOrder(prev => prev ? ({
                ...prev,
                status: newStatus,
                history: [event, ...(prev.history || [])]
            }) : null)

        } catch (error: any) {
            toastError('Fehler beim Status-Update', error.message || 'Der Status konnte nicht aktualisiert werden.')
        } finally {
            setSaving(false)
        }
    }

    const handleSaveLeasingCode = async (actorOverride?: { id: string, name: string }) => {
        if (!order || !workshopId) return

        if (isKioskMode && !actorOverride) {
            setPendingAction({ type: 'save_leasing' })
            setShowEmployeeSelect(true)
            return
        }

        // NOTE: We allow saving empty leasing code now as requested (nullable)

        setSaving(true)

        const updates: any = {
            leasing_code: leasingCodeInput
        }

        // Only update status if we are in the dialog flow
        if (isLeasingDialogOpen) {
            updates.status = LEASING_STATUS.value
        }

        const { error } = await supabase
            .from('orders')
            .update(updates)
            .eq('id', order.id)

        if (error) {
            toastError('Fehler beim Speichern', error.message || 'Der Leasing-Code konnte nicht gespeichert werden.')
        } else {
            setOrder({
                ...order,
                ...updates
            })

            // Log event if status changed or just info?
            // If status changed to Abgeholt (LEASING_STATUS), we should log it.
            // But handleStatusChange does logic too. 
            // LEASING_STATUS change here is implicit. We should probably log it.
            // But for now, let's just respect the Kiosk flow.

            setIsLeasingDialogOpen(false)
        }
        setSaving(false)
    }

    const handleSaveInternalNotesData = async (actorOverride?: { id: string, name: string }) => {
        if (!order || !workshopId) return

        if (isKioskMode && !actorOverride) {
            setPendingAction({ type: 'save_notes_data' }) // Reuse type or new type? reusing logic key
            setShowEmployeeSelect(true)
            return
        }

        setSaving(true)

        const { error } = await supabase
            .from('orders')
            .update({ internal_note: editInternalNote })
            .eq('id', order.id)
            .eq('workshop_id', workshopId)

        if (error) {
            toastError('Fehler beim Speichern', error.message || 'Die Notizen konnten nicht gespeichert werden.')
        } else {
            setOrder({ ...order, internal_note: editInternalNote })
            setInternalNote(editInternalNote)
            setIsInternalNoteEditDialogOpen(false)

            logOrderEvent(order.id, {
                type: 'info',
                title: 'Interne Notizen aktualisiert',
                description: `Notizen bearbeitet von ${actorOverride?.name || user?.email || 'User'}`,
                actor: actorOverride
            }, user).catch(console.error)
        }
        setSaving(false)
    }



    const handleSavePriceData = async (actorOverride?: { id: string, name: string }) => {
        if (!order || !workshopId) return

        if (isKioskMode && !actorOverride) {
            setPendingAction({ type: 'save_price_data' })
            setShowEmployeeSelect(true)
            return
        }

        const estPrice = parseFloat(editEstimatedPrice)
        const actPrice = parseFloat(editFinalPrice)

        // Allow saving empty strings as null? For now keeping strict number parse or 0/null logic if desired.
        // Assuming user enters valid numbers or we save null if empty string.
        // Let's safe parse. 
        const itemsToUpdate: any = {}
        if (editEstimatedPrice !== "") itemsToUpdate.estimated_price = isNaN(estPrice) ? null : estPrice
        if (editFinalPrice !== "") itemsToUpdate.final_price = isNaN(actPrice) ? null : actPrice

        setSaving(true)
        const { error } = await supabase
            .from('orders')
            .update(itemsToUpdate)
            .eq('id', order.id)
            .eq('workshop_id', workshopId)

        if (error) {
            toastError('Fehler beim Speichern', 'Die Preisdaten konnten nicht gespeichert werden.')
        } else {
            setOrder({ ...order, ...itemsToUpdate })
            setIsPriceEditDialogOpen(false)

            // Log Event
            logOrderEvent(order.id, {
                type: 'info',
                title: 'Preisdaten aktualisiert',
                description: `Preisdaten bearbeitet von ${actorOverride?.name || user?.email || 'User'}`,
                actor: actorOverride
            }, user).catch(console.error)
        }
        setSaving(false)
    }



    const handleApplyTemplate = async () => {
        if (!order || !selectedTemplateId) return

        const template = templates.find(t => t.id === selectedTemplateId)
        if (!template) return

        setSaving(true)

        // Strict overwrite as requested
        let newChecklist: ChecklistItem[] = []
        if (template.items && Array.isArray(template.items)) {
            newChecklist = template.items.map((item: any) => ({
                text: item.text,
                completed: false,
                type: 'service'
            }))
        }

        const { error } = await supabase
            .from('orders')
            .update({ checklist: newChecklist as any })
            .eq('id', order.id)

        if (error) {
            toastError('Fehler', 'Die Vorlage konnte nicht angewendet werden.')
        } else {
            setOrder({ ...order, checklist: newChecklist })
            setIsDialogOpen(false)
            setSelectedTemplateId("")
        }
        setSaving(false)
    }

    const handleToggleChecklist = async (index: number, checked: boolean, actorOverride?: { id: string, name: string }) => {
        if (!order || !order.checklist) return

        if (isKioskMode && !actorOverride) {
            setPendingAction({ type: 'toggle_checklist', payload: { index, checked } })
            setShowEmployeeSelect(true)
            return
        }

        const newChecklist = [...order.checklist]
        newChecklist[index] = { ...newChecklist[index], completed: checked }

        setOrder({ ...order, checklist: newChecklist })

        const { error } = await supabase
            .from('orders')
            .update({ checklist: newChecklist as any })
            .eq('id', order.id)

        if (error) {
            setOrder({ ...order, checklist: order.checklist })
            toastError('Fehler', 'Die Checkliste konnte nicht gespeichert werden.')
        } else {
            // Log event with attribution
            const itemText = order.checklist[index].text
            const action = checked ? "erledigt" : "unerledigt"

            logOrderEvent(order.id, {
                type: 'checklist_update',
                title: checked ? 'Checkliste Fortschritt' : 'Checkliste Änderung',
                description: `Punkt "${itemText}" markiert als ${action}`,
                metadata: { item_index: index, checked: checked },
                actor: actorOverride
            }, user).catch(console.error)
        }
    }

    const location = useLocation()
    const returnPath = location.state?.from || '/dashboard'

    if (loading) {
        return <LoadingScreen />
    }

    if (!order) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <h2 className="text-2xl font-bold">Auftrag nicht gefunden</h2>
                    <Button onClick={() => navigate(returnPath)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Zurück zur Übersicht
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    navigate(returnPath)
                                }}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Zurück
                            </Button>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
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
                        <div className="flex gap-2 self-start sm:self-center ml-12 sm:ml-0 items-center">
                            <Badge
                                variant="outline"
                                className={order.is_leasing
                                    ? "bg-primary/10 text-primary border-primary/20"
                                    : "bg-muted text-muted-foreground border-border"
                                }
                            >
                                {order.is_leasing ? "Leasing" : "Standard"}
                            </Badge>

                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                onClick={() => {
                                    const url = `${window.location.origin}/status/${order.id}`
                                    navigator.clipboard.writeText(url)
                                    toastSuccess('Link kopiert', 'Der Status-Link wurde in die Zwischenablage kopiert.')
                                }}
                            >
                                <Copy className="h-4 w-4" />
                                <span className="hidden sm:inline">Status-Link</span>
                            </Button>

                            <Button
                                size="sm"
                                onClick={() => navigate(`/dashboard/orders/${order.id}/work`)}
                                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-md shadow-blue-500/20"
                            >
                                <Wrench className="mr-2 h-4 w-4" />
                                {order.checklist && order.checklist.some((item: any) => item.completed || item.notes)
                                    ? "Weiterarbeiten"
                                    : "Arbeitsmodus starten"
                                }
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/dashboard/orders/${order.id}/control`)}
                                className="bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20"
                            >
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                Kontrolle
                            </Button>
                        </div>
                    </div>

                    {/* 3 Column Grid */}
                    <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                        {/* Left Column - Customer & Bike Data */}
                        <div className="space-y-6">
                            {/* Customer Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base w-full">
                                        <div className="flex items-center gap-2 flex-1">
                                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <User className="h-4 w-4 text-primary" />
                                            </div>
                                            Kundendaten
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 hover:bg-neutral-100"
                                            disabled={isReadOnly}
                                            onClick={() => {
                                                setEditCustomerName(order.customer_name)
                                                setEditCustomerEmail(order.customer_email || "")
                                                setEditCustomerPhone(order.customer_phone || "")

                                                setIsCustomerEditDialogOpen(true)
                                            }}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
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
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-muted-foreground">Telefon</p>
                                                <p className="font-medium text-sm truncate">{order.customer_phone}</p>
                                            </div>
                                        </div>
                                    )}

                                </CardContent>
                            </Card>

                            {/* Bike Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base w-full">
                                        <div className="flex items-center gap-2 flex-1">
                                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Bike className="h-4 w-4 text-primary" />
                                            </div>
                                            Fahrrad
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 hover:bg-neutral-100"
                                            disabled={isReadOnly}
                                            onClick={() => {
                                                setEditBikeModel(order.bike_model || "")
                                                setEditBikeType(order.bike_type || "")
                                                setIsBikeEditDialogOpen(true)
                                            }}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
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
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Anbieter</p>
                                                <p className="font-medium">{order.leasing_provider || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Portal E-Mail</p>
                                                <p className="font-medium text-sm truncate">{order.leasing_portal_email || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Vertrags-Nr.</p>
                                                <p className="font-medium text-sm truncate" title={order.contract_id || ""}>{order.contract_id || '—'}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-xs text-muted-foreground">Service Paket</p>
                                            <p className="font-medium">{order.service_package || '—'}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Inspektion Code</p>
                                                <p className="font-mono text-sm bg-muted/50 p-1 rounded px-2 mt-0.5 inline-block">{order.inspection_code || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Abhol Code</p>
                                                <p className="font-mono text-sm bg-muted/50 p-1 rounded px-2 mt-0.5 inline-block">{order.pickup_code || '—'}</p>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-border/50" />
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-2">Manueller Leasing-Code (Altsystem)</p>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={leasingCodeInput}
                                                    onChange={(e) => setLeasingCodeInput(e.target.value)}
                                                    placeholder="Code eingeben..."
                                                    className="h-8"
                                                />
                                                <Button
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    disabled={saving || (leasingCodeInput === (order.leasing_code || ""))}
                                                    onClick={() => handleSaveLeasingCode()}
                                                >
                                                    <Save className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Price Overview */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base w-full">
                                        <div className="flex items-center gap-2 flex-1">
                                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Euro className="h-4 w-4 text-primary" />
                                            </div>
                                            Preisübersicht
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 hover:bg-neutral-100"
                                            disabled={isReadOnly}
                                            onClick={() => {
                                                setEditEstimatedPrice(order.estimated_price?.toString() || "")
                                                setEditFinalPrice(order.final_price?.toString() || "")
                                                setIsPriceEditDialogOpen(true)
                                            }}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
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
                                            <Label className="text-xs text-muted-foreground ml-1">
                                                Tatsächlicher Preis
                                            </Label>
                                            <div className="text-xl font-medium px-2">
                                                {order.final_price !== null
                                                    ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(order.final_price)
                                                    : <span className="text-muted-foreground italic text-sm">Nicht festgelegt</span>
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>


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
                                            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId} disabled={isReadOnly}>
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
                                                disabled={!selectedTemplateId || isReadOnly}
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
                                                        disabled={isReadOnly}
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



                            {/* Order History */}
                            <Card className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="text-base font-medium">Auftrags-Verlauf</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <OrderHistory history={order.history || []} />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column - Notes & Status */}
                        <div className="space-y-6">

                            {/* Internal Notes */}
                            {/* Customer Notes (Kundenwunsch) */}
                            <Card className="flex flex-col">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-base font-medium flex items-center gap-2">
                                        Kundenwunsch
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-4 flex-1">
                                    <div className="bg-muted/30 rounded-md p-3 min-h-[80px] text-sm whitespace-pre-wrap">
                                        {customerNote || <span className="text-muted-foreground italic">Keine Beschreibung vorhanden.</span>}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Internal Notes */}
                            <Card className="flex flex-col">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-base font-medium flex items-center gap-2">
                                        Interne Notizen
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 hover:bg-neutral-100"
                                            disabled={isReadOnly}
                                            onClick={() => {
                                                setEditInternalNote(internalNote)
                                                setIsInternalNoteEditDialogOpen(true)
                                            }}
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </Button>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-4 flex-1">
                                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-md p-3 min-h-[100px] text-sm whitespace-pre-wrap">
                                        {internalNote || <span className="text-muted-foreground italic">Keine internen Notizen.</span>}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Assignments Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base font-medium flex items-center gap-2">
                                        <User className="h-4 w-4 text-primary" />
                                        Zuständigkeiten
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Mechanic */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-sm font-medium text-muted-foreground">Mechaniker</p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-xs text-primary hover:text-primary/80 px-2"
                                                disabled={isReadOnly}
                                                onClick={() => {
                                                    setAssignmentType('mechanic')
                                                    setIsAssignmentModalOpen(true)
                                                }}
                                            >
                                                {order.mechanic_id ? 'Ändern' : 'Zuweisen'}
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Wrench className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">
                                                {order.mechanic_id ? getEmployeeName(order.mechanic_id) : <span className="text-muted-foreground italic">Nicht zugewiesen</span>}
                                            </span>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* QC */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-sm font-medium text-muted-foreground">Qualitätskontrolle</p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-xs text-primary hover:text-primary/80 px-2"
                                                disabled={isReadOnly}
                                                onClick={() => {
                                                    setAssignmentType('qc')
                                                    setIsAssignmentModalOpen(true)
                                                }}
                                            >
                                                {order.qc_mechanic_id ? 'Ändern' : 'Zuweisen'}
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">
                                                {order.qc_mechanic_id ? getEmployeeName(order.qc_mechanic_id) : <span className="text-muted-foreground italic">Ausstehend</span>}
                                            </span>
                                        </div>
                                    </div>
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

                                    {STATUS_FLOW.map((statusOption) => {
                                        const Icon = statusOption.icon
                                        const isActive = order.status === statusOption.value

                                        return (
                                            <Button
                                                key={statusOption.value}
                                                variant={isActive ? "outline" : "outline"}
                                                className={`w-full justify-start ${isActive ? `${statusOption.color} border-current` : 'text-muted-foreground'}`}
                                                onClick={() => handleStatusChange(statusOption.value)}
                                                disabled={saving || isActive || isReadOnly}
                                            >
                                                <Icon className="mr-2 h-4 w-4" />
                                                {statusOption.label}
                                            </Button>
                                        )
                                    })}

                                    {LEASING_STATUS && (
                                        <Button
                                            variant={order.status === LEASING_STATUS.value ? "outline" : "ghost"}
                                            className={cn("w-full justify-start mt-2", order.status === LEASING_STATUS.value && "bg-blue-500/10 text-blue-600 border-blue-200")}
                                            onClick={() => handleStatusChange(LEASING_STATUS.value)}
                                            disabled={saving || order.status === LEASING_STATUS.value || order.status === COMPLETED_STATUS.value || isReadOnly}
                                        >
                                            <LEASING_STATUS.icon className="mr-2 h-4 w-4" />
                                            {LEASING_STATUS.label}
                                        </Button>
                                    )}

                                    <Button
                                        variant={order.status === COMPLETED_STATUS.value ? "outline" : "ghost"}
                                        className={cn("w-full justify-start", order.status === COMPLETED_STATUS.value && "bg-green-500/10 text-green-600 border-green-200")}
                                        onClick={() => handleStatusChange(COMPLETED_STATUS.value)}
                                        disabled={saving || order.status === COMPLETED_STATUS.value || isReadOnly}
                                    >
                                        <COMPLETED_STATUS.icon className="mr-2 h-4 w-4" />
                                        {COMPLETED_STATUS.label}
                                    </Button>
                                </CardContent>
                            </Card>


                        </div>
                    </div>

                    {/* Danger Zone - Subtle at bottom */}
                    {(userRole === 'admin' || userRole === 'owner') && (
                        <div className="mt-12 pt-8 border-t border-dashed border-muted-foreground/20">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Gefahrenzone</p>
                                    <p className="text-sm text-muted-foreground">Auftrag unwiderruflich in den Papierkorb verschieben</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Löschen
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DashboardLayout>

            {/* Edit Customer Dialog */}
            <Dialog open={isCustomerEditDialogOpen} onOpenChange={setIsCustomerEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Kundendaten bearbeiten</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                value={editCustomerName}
                                onChange={e => setEditCustomerName(e.target.value)}
                                placeholder="Name eingeben"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>E-Mail</Label>
                            <Input
                                value={editCustomerEmail}
                                onChange={e => setEditCustomerEmail(e.target.value)}
                                placeholder="E-Mail eingeben"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Telefon</Label>
                            <Input
                                value={editCustomerPhone}
                                onChange={e => setEditCustomerPhone(e.target.value)}
                                placeholder="Telefon eingeben"
                            />
                        </div>

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCustomerEditDialogOpen(false)}>Abbrechen</Button>
                        <Button
                            onClick={() => handleSaveCustomerData()}
                            disabled={!editCustomerName || saving}
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Bike Dialog */}
            <Dialog open={isBikeEditDialogOpen} onOpenChange={setIsBikeEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Fahrraddaten bearbeiten</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Modell</Label>
                            <Input
                                value={editBikeModel}
                                onChange={e => setEditBikeModel(e.target.value)}
                                placeholder="Modell eingeben"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Typ</Label>
                            <Select value={editBikeType} onValueChange={setEditBikeType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Typ wählen" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(BIKE_TYPE_LABELS).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBikeEditDialogOpen(false)}>Abbrechen</Button>
                        <Button
                            onClick={() => handleSaveBikeData()}
                            disabled={!editBikeModel || saving}
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>




            {/* Edit Price Dialog */}
            <Dialog open={isPriceEditDialogOpen} onOpenChange={setIsPriceEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Preise bearbeiten</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Geschätzter Preis (€)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={editEstimatedPrice}
                                onChange={e => setEditEstimatedPrice(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Tatsächlicher Preis (€)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={editFinalPrice}
                                onChange={e => setEditFinalPrice(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPriceEditDialogOpen(false)}>Abbrechen</Button>
                        <Button
                            onClick={() => handleSavePriceData()}
                            disabled={saving}
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Internal Note Dialog */}
            <Dialog open={isInternalNoteEditDialogOpen} onOpenChange={setIsInternalNoteEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Interne Notiz bearbeiten</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="internal-note" className="mb-2 block">Notiz</Label>
                        <Textarea
                            id="internal-note"
                            value={editInternalNote}
                            onChange={(e) => setEditInternalNote(e.target.value)}
                            className="min-h-[150px]"
                            placeholder="Interne Notizen hier eingeben..."
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsInternalNoteEditDialogOpen(false)}>Abbrechen</Button>
                        <Button
                            onClick={() => handleSaveInternalNotesData()}
                            disabled={saving}
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            {/* Dialog for Leasing Code */}
            <Dialog open={isLeasingDialogOpen} onOpenChange={setIsLeasingDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Leasing-Code eingeben</DialogTitle>
                        <DialogDescription>
                            Bitte geben Sie den Abholcode/Leasing-Code für dieses Rad ein, um den Auftrag abzuschließen.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="leasing-code" className="mb-2 block">Leasing Code</Label>
                        <Input
                            id="leasing-code"
                            value={leasingCodeInput}
                            onChange={(e) => setLeasingCodeInput(e.target.value)}
                            placeholder="z.B. 123456"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsLeasingDialogOpen(false)}>
                            Abbrechen
                        </Button>
                        <Button
                            onClick={() => handleSaveLeasingCode()}
                            disabled={!leasingCodeInput.trim() || saving}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Speichern
                                </>
                            ) : (
                                'Bestätigen & Abholen'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Kiosk Employee Selection */}
            <EmployeeSelectionModal
                open={showEmployeeSelect}
                onOpenChange={(open) => {
                    setShowEmployeeSelect(open)
                    if (!open) setPendingAction(null) // Clear pending action on cancel
                }}
                triggerAction={
                    pendingAction?.type === 'status' ? 'Status ändern' :
                        pendingAction?.type === 'save_notes_data' ? 'Notizen speichern' :
                            pendingAction?.type === 'save_price_data' ? 'Preise speichern' :
                                pendingAction?.type === 'toggle_checklist' ? 'Checkliste speichern' :
                                    pendingAction?.type === 'save_customer' ? 'Kundendaten speichern' :
                                        pendingAction?.type === 'save_bike' ? 'Fahrraddaten speichern' :
                                            'Speichern'
                }
                onEmployeeSelected={handleEmployeeSelected}
            />

            {/* General Assignment Modal */}
            <EmployeeSelectionModal
                open={isAssignmentModalOpen}
                onOpenChange={setIsAssignmentModalOpen}
                triggerAction={assignmentType === 'mechanic' ? "Mechaniker zuweisen" : "QC Mitarbeiter zuweisen"}
                onEmployeeSelected={handleAssignment}
            />

            <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ungespeicherte Änderungen</AlertDialogTitle>
                        <AlertDialogDescription>
                            Sie haben ungespeicherte Änderungen (Notizen oder Preis). Möchten Sie die Seite wirklich verlassen, ohne zu speichern?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button variant="outline" onClick={() => setShowExitDialog(false)}>
                            Abbrechen
                        </Button>
                        <Button variant="destructive" onClick={() => navigate(returnPath)}>
                            Verlassen
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Auftrag wirklich löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Der Auftrag wird in den Papierkorb verschoben und nach 30 Tagen automatisch endgültig gelöscht.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteOrder}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                            Verschieben
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </PageTransition >
    )
}
