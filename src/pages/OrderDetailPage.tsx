import { toastSuccess, toastError } from '@/lib/toast-utils'
import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { OrderHistory } from "@/components/OrderHistory"
import { logOrderEvent } from "@/lib/history"
import type { OrderHistoryEvent } from "@/lib/history"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import { cn, isUuid } from "@/lib/utils"
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
    AlertCircle,
    Loader2,
    Archive,
    Wrench,
    ShieldCheck,
    Pencil,
    Trash2,
    Copy,
    Plus,
    X,
    ChevronDown,
    History,
    StickyNote,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LoadingScreen } from "@/components/LoadingScreen"
import { PageTransition } from "@/components/PageTransition"
import { BIKE_TYPE_LABELS, STATUS_COLORS } from "@/lib/constants"
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
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"


const STATUS_FLOW = [
    { value: 'eingegangen', label: 'Eingegangen', icon: Clock, color: STATUS_COLORS.eingegangen },
    { value: 'warten_auf_teile', label: 'Warten auf Teile', icon: Pause, color: STATUS_COLORS.warten_auf_teile },
    { value: 'in_bearbeitung', label: 'In Bearbeitung', icon: Play, color: STATUS_COLORS.in_bearbeitung },
    { value: 'kontrolle_offen', label: 'Kontrolle offen', icon: ShieldCheck, color: STATUS_COLORS.kontrolle_offen },
    { value: 'abholbereit', label: 'Abholbereit', icon: PackageCheck, color: STATUS_COLORS.abholbereit },
]

const LEASING_STATUS = { value: 'abgeholt', label: 'Abgeholt', icon: Check, color: STATUS_COLORS.abgeholt }
const COMPLETED_STATUS = { value: 'abgeschlossen', label: 'Abgeschlossen', icon: Archive, color: STATUS_COLORS.abgeschlossen }

const STATUS_SOLID_COLORS: Record<string, string> = {
    eingegangen: "bg-blue-500 shadow-blue-500/40",
    warten_auf_teile: "bg-rose-500 shadow-rose-500/40",
    in_bearbeitung: "bg-indigo-500 shadow-indigo-500/40",
    kontrolle_offen: "bg-amber-500 shadow-amber-500/40",
    abholbereit: "bg-sky-500 shadow-sky-500/40",
    abgeholt: "bg-emerald-500 shadow-emerald-500/40",
    abgeschlossen: "bg-slate-500 shadow-slate-500/40",
}

import { ChecklistTemplateSelector } from "@/components/ChecklistTemplateSelector"
import type { ChecklistItem } from "@/types/checklist"

interface Order {
    id: string
    order_number: string
    customer_name: string
    customer_email: string | null
    customer_phone: string | null
    bike_brand: string | null
    bike_model: string | null
    bike_color: string | null
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
    tags: string[] | null
    mechanic_ids: string[] | null // Array of UUIDs
    qc_mechanic_id: string | null
    due_date: string | null
}





export default function OrderDetailPage() {
    const { orderId } = useParams<{ orderId: string }>()
    const navigate = useNavigate()
    const { workshopId, user, userRole } = useAuth()
    const location = useLocation()
    const returnPath = location.state?.from || '/dashboard'
    const [order, setOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [templates, setTemplates] = useState<any[]>([])
    const [workshopTags, setWorkshopTags] = useState<any[]>([])
    const [selectedDetailTemplateIds, setSelectedDetailTemplateIds] = useState<string[]>([])
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
    const [tagInput, setTagInput] = useState("")

    const isReadOnly = userRole === 'read'

    // Editable fields
    const [internalNote, setInternalNote] = useState("")
    const [customerNote, setCustomerNote] = useState("")

    // Removal confirmation state
    const [templatesToRemove, setTemplatesToRemove] = useState<{ id: string, name: string }[]>([])
    const [showRemovalWarning, setShowRemovalWarning] = useState(false)

    // Custom Item state
    const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false)
    const [customItemText, setCustomItemText] = useState("")


    // Leasing dialog state
    const [isLeasingDialogOpen, setIsLeasingDialogOpen] = useState(false)
    const [leasingCodeInput, setLeasingCodeInput] = useState("") // Acts as Pickup Code in Dialog
    const [dialogLeasingCode, setDialogLeasingCode] = useState("") // Acts as Leasing Code in Dialog

    // Editable Leasing Fields
    const [isLeasingEditDialogOpen, setIsLeasingEditDialogOpen] = useState(false)
    const [editLeasingProvider, setEditLeasingProvider] = useState("")
    const [editLeasingPortalEmail, setEditLeasingPortalEmail] = useState("")
    const [editContractId, setEditContractId] = useState("")
    const [editServicePackage, setEditServicePackage] = useState("")
    const [editInspectionCode, setEditInspectionCode] = useState("")
    const [editPickupCode, setEditPickupCode] = useState("")

    // Assignment State
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false)
    const [assignmentType, setAssignmentType] = useState<'add_mechanic' | 'qc'>('add_mechanic')

    // Checkout Dialog
    const [showAbholbereitConfirm, setShowAbholbereitConfirm] = useState(false)
    const [showRevertConfirm, setShowRevertConfirm] = useState(false)
    const [showOrderTypeConfirm, setShowOrderTypeConfirm] = useState(false)
    const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{ status: string, actor?: { id: string, name: string } } | null>(null)
    const [pendingOrderTypeUpdate, setPendingOrderTypeUpdate] = useState<boolean | null>(null)

    // Collapsible states
    const [isKundenwunschOpen, setIsKundenwunschOpen] = useState(true)
    const [isChecklistOpen, setIsChecklistOpen] = useState(true)
    const [isInternalNotesOpen, setIsInternalNotesOpen] = useState(true)
    const [isCustomerDataOpen, setIsCustomerDataOpen] = useState(false)
    const [isBikeDataOpen, setIsBikeDataOpen] = useState(true)
    const [isPriceOpen, setIsPriceOpen] = useState(true)
    const [isLeasingOpen, setIsLeasingOpen] = useState(true)
    const [isAssignmentsOpen, setIsAssignmentsOpen] = useState(true)
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)


    const getEmployeeName = (id: string) => {
        if (!employees) return "Lade..."
        return employees.find(e => e.id === id)?.name || "Unbekannt"
    }

    const handleAssignment = async (employeeId: string) => {
        if (!order) return

        let updateData: any = {}

        if (assignmentType === 'add_mechanic') {
            // Add to array, prevent duplicates
            const currentIds = order.mechanic_ids || []
            if (!currentIds.includes(employeeId)) {
                updateData = { mechanic_ids: [...currentIds, employeeId] }
            } else {
                // Already assigned, just close modal
                setIsAssignmentModalOpen(false)
                return
            }
        } else {
            updateData = { qc_mechanic_id: employeeId }
        }

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
            const fieldName = assignmentType === 'add_mechanic' ? 'Mechaniker' : 'Qualitätskontrolle'
            logOrderEvent(order.id, {
                type: 'info',
                title: 'Zuweisung geändert',
                description: `${empName} wurde als ${fieldName} zugewiesen.`,
                actor: activeEmployee ? { id: activeEmployee.id, name: activeEmployee.name } : (user ? { id: user.id, name: user.email || 'User' } : undefined)
            }, user).catch(console.error)
        }
    }

    const handleRemoveMechanic = async (employeeId: string) => {
        if (!order || !order.mechanic_ids) return

        const newIds = order.mechanic_ids.filter(id => id !== employeeId)

        const { error } = await supabase
            .from('orders')
            .update({ mechanic_ids: newIds })
            .eq('id', order.id)

        if (error) {
            toastError("Fehler", "Mitarbeiter konnte nicht entfernt werden.")
        } else {
            setOrder({ ...order, mechanic_ids: newIds })
            toastSuccess("Entfernt", "Mitarbeiter wurde entfernt.")
        }
    }

    // Shared Mode Interception
    const { isSharedMode, employees, activeEmployee } = useEmployee()
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
    const [editBikeBrand, setEditBikeBrand] = useState("")
    const [editBikeModel, setEditBikeModel] = useState("")
    const [editBikeType, setEditBikeType] = useState("")
    const [editBikeColor, setEditBikeColor] = useState("")

    // Standardized Edit States
    const [isInternalNoteEditDialogOpen, setIsInternalNoteEditDialogOpen] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (isInternalNoteEditDialogOpen) {
            // Small timeout to ensure the modal animation hasn't blocked focus
            const timer = setTimeout(() => {
                const el = textareaRef.current
                if (el) {
                    el.focus()
                    // Force cursor to end
                    const val = el.value
                    el.value = ''
                    el.value = val
                    el.setSelectionRange(val.length, val.length)
                }
            }, 150)
            return () => clearTimeout(timer)
        }
    }, [isInternalNoteEditDialogOpen])
    const [editInternalNote, setEditInternalNote] = useState("")

    const [isPriceEditDialogOpen, setIsPriceEditDialogOpen] = useState(false)
    const [editEstimatedPrice, setEditEstimatedPrice] = useState("")
    const [editFinalPrice, setEditFinalPrice] = useState("")

    useEffect(() => {
        const fetchOrder = async () => {
            if (!workshopId || !orderId) return

            setLoading(true)

            // Fetch order and templates in parallel
            const isIdUuid = isUuid(orderId)
            const [orderResult, templatesResult, tagsResult] = await Promise.all([
                supabase
                    .from('orders')
                    .select('*')
                    .or(isIdUuid ? `id.eq.${orderId},order_number.eq.${orderId}` : `order_number.eq.${orderId}`)
                    .eq('workshop_id', workshopId)
                    .single(),
                supabase
                    .from('checklist_templates')
                    .select('*')
                    .eq('workshop_id', workshopId)
                    .order('name'),
                supabase
                    .from('workshop_tags')
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

                // Initialize leasing edit fields
                setEditLeasingProvider(orderResult.data.leasing_provider || "")
                setEditLeasingPortalEmail(orderResult.data.leasing_portal_email || "")
                setEditContractId(orderResult.data.contract_id || "")
                setEditServicePackage(orderResult.data.service_package || "")
                setEditInspectionCode(orderResult.data.inspection_code || "")
                setEditPickupCode(orderResult.data.pickup_code || "")
            }

            if (templatesResult.data) {
                setTemplates(templatesResult.data)
            }

            if (tagsResult.data) {
                setWorkshopTags(tagsResult.data)
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
                            final_price: newOrder.final_price,
                            tags: newOrder.tags
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

    const handleSaveDueDate = async (date: Date | undefined) => {
        if (!order) return

        // Optimistic update
        const oldDate = order.due_date
        const newDateStr = date ? date.toISOString() : null

        setOrder({ ...order, due_date: newDateStr })

        const { error } = await supabase
            .from('orders')
            .update({ due_date: newDateStr })
            .eq('id', order.id)

        if (error) {
            setOrder({ ...order, due_date: oldDate })
            toastError("Fehler", "Datum konnte nicht gespeichert werden.")
        } else {
            const dateFormatted = date ? format(date, 'dd.MM.yyyy', { locale: de }) : 'Entfernt'
            toastSuccess("Termin aktualisiert", `Fertigstellungstermin: ${dateFormatted}`)

            logOrderEvent(order.id, {
                type: 'info',
                title: 'Fertigstellungstermin geändert',
                description: date ? `Termin auf ${dateFormatted} gesetzt.` : 'Termin entfernt.',
                actor: activeEmployee ? { id: activeEmployee.id, name: activeEmployee.name } : (user ? { id: user.id, name: user.email || 'User' } : undefined)
            }, user).catch(console.error)
        }
    }



    const handleSaveCustomerData = async (actorOverride?: { id: string, name: string }) => {
        if (!order) return

        if (isSharedMode && !actorOverride) {
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
                description: `Kundendaten bearbeitet von ${actorOverride?.name || activeEmployee?.name || user?.email || 'User'}`,
                actor: actorOverride || (activeEmployee ? { id: activeEmployee.id, name: activeEmployee.name } : undefined)
            }, user).catch(console.error)
        }
        setSaving(false)
    }

    const handleSaveBikeData = async (actorOverride?: { id: string, name: string }) => {
        if (!order) return

        if (isSharedMode && !actorOverride) {
            setPendingAction({ type: 'save_bike' })
            setShowEmployeeSelect(true)
            return
        }

        setSaving(true)
        const updates = {
            bike_brand: editBikeBrand || null,
            bike_model: editBikeModel,
            bike_type: editBikeType || null,
            bike_color: editBikeColor || null
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
                description: `Fahrraddaten bearbeitet von ${actorOverride?.name || activeEmployee?.name || user?.email || 'User'}`,
                actor: actorOverride || (activeEmployee ? { id: activeEmployee.id, name: activeEmployee.name } : undefined)
            }, user).catch(console.error)
        }
        setSaving(false)
    }

    const handleStatusChange = async (newStatus: string, actorOverride?: { id: string, name: string }) => {
        if (!order || saving) return

        // Intercept Shared Mode
        if (isSharedMode && !actorOverride) {
            setPendingAction({ type: 'status', payload: newStatus })
            setShowEmployeeSelect(true)
            return
        }

        // Intercept 'abgeholt' for Leasing orders
        if (order.is_leasing && newStatus === LEASING_STATUS.value) {
            // Pre-fill the dialog with current values
            setLeasingCodeInput(order.pickup_code || "")
            setDialogLeasingCode(order.leasing_code || "")
            setIsLeasingDialogOpen(true)
            return
        }

        // Intercept 'abholbereit' for confirmation (Setting to it)
        if (newStatus === 'abholbereit' && !showAbholbereitConfirm) {
            setPendingStatusUpdate({ status: newStatus, actor: actorOverride })
            setShowAbholbereitConfirm(true)
            return
        }

        // Intercept Reversions from 'abholbereit' or 'abgeschlossen'
        const isReversionFromFinalStatus = (order.status === 'abholbereit' || order.status === 'abgeschlossen') &&
            newStatus !== 'abholbereit' && newStatus !== 'abgeschlossen'

        if (isReversionFromFinalStatus && !showRevertConfirm) {
            setPendingStatusUpdate({ status: newStatus, actor: actorOverride })
            setShowRevertConfirm(true)
            return
        }

        setSaving(true)

        try {
            // 1. Prepare updates
            const updates: any = { status: newStatus }

            // Auto-assign QC mechanic if status changed to 'kontrolle_offen'
            if (newStatus === 'kontrolle_offen') {
                const actingEmployeeId = actorOverride?.id || activeEmployee?.id
                // Verify we have a valid ID before assigning
                if (actingEmployeeId) {
                    updates.qc_mechanic_id = actingEmployeeId

                    // Also ensure this user is in the mechanic_ids list (as they worked on it)
                    const currentMechanics = order.mechanic_ids || []
                    if (!currentMechanics.includes(actingEmployeeId)) {
                        updates.mechanic_ids = [...currentMechanics, actingEmployeeId]
                    }
                }
            }

            // 1. Update status and other fields
            const { error } = await supabase
                .from('orders')
                .update(updates)
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
                    actor: actorOverride || (activeEmployee ? { id: activeEmployee.id, name: activeEmployee.name } : undefined)
                },
                user
            )

            // 3. Update local state
            setOrder(prev => prev ? ({
                ...prev,
                ...updates,
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

        if (isSharedMode && !actorOverride) {
            setPendingAction({ type: 'save_leasing' })
            setShowEmployeeSelect(true)
            return
        }

        setSaving(true)

        // The dialog input `leasingCodeInput` is now primarily used for `pickup_code` in this flow
        // BUT we also have `leasingCode` from the separate state if we want to handle both in the dialog.
        // Wait, I need to make sure the dialog uses TWO inputs.
        // Let's refactor this function to read from state directly or passing params?
        // Actually, let's assume the state variables `leasingCodeInput` (now behaving as Pickup Code) 
        // and a NEW state or reused state for Leasing Code are available.
        // I will use `leasingCodeInput` for Pickup Code and `editLeasingCode` (which I need to ensure exists or reuse `editLeasingCode`?)
        // Let's look at what I have... `leasingCodeInput` was `pickup_code`.
        // I need a state for the second field in the dialog.

        // Let's assume I add `dialogLeasingCode` state or similar.
        // For now, I will use `leasingCodeInput` as Pickup Code and add a new state locally or reuse `editLeasingCode` if appropriate?
        // No, `editLeasingCode` is for the general edit dialog. 
        // I should probably unify them or just add a second state for this specific dialog.

        // REVISITING logic: I will use `leasingCodeInput` for Pickup Code (as before)
        // and add `dialogLeasingCode` for Leasing Code.

        const updates: any = {
            pickup_code: leasingCodeInput,
            leasing_code: dialogLeasingCode
        }

        // Only update status if we are in the dialog flow (which we are if this is called)
        if (isLeasingDialogOpen) {
            updates.status = LEASING_STATUS.value
        }

        const { error } = await supabase
            .from('orders')
            .update(updates)
            .eq('id', order.id)

        if (error) {
            toastError('Fehler beim Speichern', error.message || 'Der Abhol-Code konnte nicht gespeichert werden.')
        } else {
            // Create a local update object
            const updatedOrder = {
                ...order,
                ...updates,
                // If status changed, we need to update history too, but handleStatusChange does it separately.
                // However, since we intercepted handleStatusChange, we must do the history log here manually
                // OR we can't easily reuse handleStatusChange because it would trigger recursion or complex logic.
                // Let's log the event here.
            }

            // Log Status Change Event
            const newStatus = LEASING_STATUS.value
            const newStatusLabel = LEASING_STATUS.label

            try {
                const event = await logOrderEvent(
                    order.id,
                    {
                        type: 'status_change',
                        title: 'Status geändert (Leasing)',
                        description: `Status zu "${newStatusLabel}" geändert. Abhol-Code: ${leasingCodeInput}`,
                        metadata: { old_status: order.status, new_status: newStatus, pickup_code: leasingCodeInput },
                        actor: actorOverride || (activeEmployee ? { id: activeEmployee.id, name: activeEmployee.name } : undefined)
                    },
                    user
                )
                updatedOrder.history = [event, ...(order.history || [])]
            } catch (e) {
                console.error("Failed to log event", e)
            }

            setOrder(updatedOrder)
            setIsLeasingDialogOpen(false)
            toastSuccess("Abgeschlossen", "Auftrag wurde auf 'Abgeholt' gesetzt.")
        }
        setSaving(false)
    }

    const handleSaveLeasingData = async (actorOverride?: { id: string, name: string }) => {
        if (!order || !workshopId) return

        // No kiosk interception needed for simple edit unless desired, assuming standard edit flow

        setSaving(true)

        const updates = {
            leasing_provider: editLeasingProvider,
            leasing_portal_email: editLeasingPortalEmail || null,
            contract_id: editContractId || null,
            service_package: editServicePackage || null,
            inspection_code: editInspectionCode || null,
            pickup_code: editPickupCode || null
        }

        const { error } = await supabase
            .from('orders')
            .update(updates)
            .eq('id', order.id)

        if (error) {
            toastError('Fehler beim Speichern', 'Die Leasing-Daten konnten nicht gespeichert werden.')
        } else {
            setOrder({ ...order, ...updates })
            setIsLeasingEditDialogOpen(false)

            logOrderEvent(order.id, {
                type: 'info',
                title: 'Leasing-Daten aktualisiert',
                description: `Leasing-Daten bearbeitet von ${actorOverride?.name || activeEmployee?.name || user?.email || 'User'}`,
                actor: actorOverride || (activeEmployee ? { id: activeEmployee.id, name: activeEmployee.name } : undefined)
            }, user).catch(console.error)
        }
        setSaving(false)
    }

    const handleSaveInternalNotesData = async (actorOverride?: { id: string, name: string }) => {
        if (!order || !workshopId) return

        if (isSharedMode && !actorOverride) {
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
                description: `Notizen bearbeitet von ${actorOverride?.name || activeEmployee?.name || user?.email || 'User'}`,
                actor: actorOverride || (activeEmployee ? { id: activeEmployee.id, name: activeEmployee.name } : undefined)
            }, user).catch(console.error)
        }
        setSaving(false)
    }



    const handleSavePriceData = async (actorOverride?: { id: string, name: string }) => {
        if (!order || !workshopId) return

        if (isSharedMode && !actorOverride) {
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
                description: `Preisdaten bearbeitet von ${actorOverride?.name || activeEmployee?.name || user?.email || 'User'}`,
                actor: actorOverride || (activeEmployee ? { id: activeEmployee.id, name: activeEmployee.name } : undefined)
            }, user).catch(console.error)
        }
        setSaving(false)
    }

    const handleOrderTypeUpdate = async (isLeasing: boolean, actorOverride?: { id: string, name: string }) => {
        if (!order || !workshopId) return

        setSaving(true)

        const updates: any = { is_leasing: isLeasing }

        // If switching to standard, clear leasing fields
        if (!isLeasing) {
            updates.leasing_provider = null
            updates.leasing_portal_email = null
            updates.contract_id = null
            updates.service_package = null
            updates.inspection_code = null
            updates.pickup_code = null
            updates.leasing_code = null
        }

        const { error } = await supabase
            .from('orders')
            .update(updates)
            .eq('id', order.id)

        if (error) {
            toastError('Fehler', 'Auftragstyp konnte nicht aktualisiert werden.')
        } else {
            setOrder({ ...order, ...updates })

            // Log Event
            logOrderEvent(order.id, {
                type: 'info',
                title: 'Auftragstyp geändert',
                description: `Auftragstyp zu ${isLeasing ? 'Leasing' : 'Standard'} geändert.`,
                actor: actorOverride || (activeEmployee ? { id: activeEmployee.id, name: activeEmployee.name } : (user ? { id: user.id, name: user.email || 'User' } : undefined))
            }, user).catch(console.error)

            toastSuccess('Aktualisiert', `Auftrag wurde auf ${isLeasing ? 'Leasing' : 'Standard'} umgestellt.`)
        }
        setSaving(false)
        setShowOrderTypeConfirm(false)
        setPendingOrderTypeUpdate(null)
    }

    const handleUpdateTemplates = async (confirmedRemovalIds: string[] = []) => {
        if (!order) return

        setSaving(true)

        // Get currently active template IDs
        const currentTemplateIds = Array.from(new Set((order.checklist || [])
            .filter(i => i.template_id)
            .map(i => i.template_id as string)))

        // Templates to add (selected in modal but not in current checklist)
        const templateIdsToAdd = selectedDetailTemplateIds.filter(id => !currentTemplateIds.includes(id))

        // Templates to remove (in current checklist but not selected in modal)
        // Unless it's a confirmed removal from the warning dialog
        const templateIdsToRemove = confirmedRemovalIds.length > 0
            ? confirmedRemovalIds
            : currentTemplateIds.filter(id => !selectedDetailTemplateIds.includes(id))

        // Check if any templates to remove have completed items (and not already confirmed)
        if (confirmedRemovalIds.length === 0) {
            const riskyRemovals = templateIdsToRemove.filter(id => {
                return (order.checklist || []).some(item => item.template_id === id && item.completed)
            }).map(id => ({
                id,
                name: templates.find(t => t.id === id)?.name || 'Unbekannte Vorlage'
            }))

            if (riskyRemovals.length > 0) {
                setTemplatesToRemove(riskyRemovals)
                setShowRemovalWarning(true)
                setSaving(false)
                return
            }
        }

        // Perform the update
        let newChecklist = (order.checklist || []).filter(item => !templateIdsToRemove.includes(item.template_id || ''))

        templateIdsToAdd.forEach(templateId => {
            const template = templates.find(t => t.id === templateId)
            if (template?.items && Array.isArray(template.items)) {
                const templateItems = template.items.map((item: any) => ({
                    text: item.text,
                    completed: false,
                    type: 'service',
                    template_id: template.id,
                    template_name: template.name
                }))
                newChecklist = [...newChecklist, ...templateItems]
            }
        })

        const { error } = await supabase
            .from('orders')
            .update({ checklist: newChecklist as any })
            .eq('id', order.id)

        if (error) {
            toastError('Fehler', 'Die Checkliste konnte nicht aktualisiert werden.')
        } else {
            setOrder({ ...order, checklist: newChecklist })
            setIsTemplateModalOpen(false)
            setSelectedDetailTemplateIds([])
            toastSuccess('Aktualisiert', 'Die Checkliste wurde aktualisiert.')
        }
        setSaving(false)
    }

    const handleAddCustomItem = async () => {
        if (!order || !customItemText.trim()) return

        setSaving(true)

        const newItem: ChecklistItem = {
            text: customItemText.trim(),
            completed: false,
            type: 'service',
            template_id: null,
            template_name: 'Manuell hinzugefügt'
        }

        const newChecklist = [...(order.checklist || []), newItem]

        const { error } = await supabase
            .from('orders')
            .update({ checklist: newChecklist as any })
            .eq('id', order.id)

        if (error) {
            toastError('Fehler', 'Punkt konnte nicht hinzugefügt werden.')
        } else {
            setOrder({ ...order, checklist: newChecklist })
            setIsCustomItemModalOpen(false)
            setCustomItemText("")
            toastSuccess('Hinzugefügt', 'Manueller Punkt hinzugefügt.')
        }
        setSaving(false)
    }

    const handleRemoveChecklistItem = async (index: number) => {
        if (!order) return

        const newChecklist = (order.checklist || []).filter((_, i) => i !== index)

        const { error } = await supabase
            .from('orders')
            .update({ checklist: newChecklist as any })
            .eq('id', order.id)

        if (error) {
            toastError('Fehler', 'Punkt konnte nicht entfernt werden.')
        } else {
            setOrder({ ...order, checklist: newChecklist })
            toastSuccess('Entfernt', 'Punkt wurde entfernt.')
        }
    }

    const handleToggleChecklist = async (index: number, checked: boolean, actorOverride?: { id: string, name: string }) => {
        if (!order || !order.checklist) return

        if (isSharedMode && !actorOverride) {
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
                actor: actorOverride || (activeEmployee ? { id: activeEmployee.id, name: activeEmployee.name } : undefined)
            }, user).catch(console.error)
        }
    }



    // Handler for Shared Mode selection
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

    const handleToggleTag = async (tagId: string) => {
        if (!order || isReadOnly) return
        const currentTags = order.tags || []
        const newTags = currentTags.includes(tagId) ? currentTags.filter(id => id !== tagId) : [...currentTags, tagId]

        setOrder({ ...order, tags: newTags })
        const { error } = await supabase.from('orders').update({ tags: newTags }).eq('id', order.id)
        if (error) {
            toastError("Fehler", "Tag konnte nicht gespeichert werden.")
            setOrder({ ...order, tags: currentTags })
        }
    }

    const handleRemoveTag = async (tagId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!order || isReadOnly) return
        const currentTags = order.tags || []
        const newTags = currentTags.filter(id => id !== tagId)

        setOrder({ ...order, tags: newTags })
        await supabase.from('orders').update({ tags: newTags }).eq('id', order.id)
    }

    const handleCreateAndAddTag = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!order || isReadOnly || !workshopId || !tagInput.trim()) return

        // Check if tag already exists in workshopTags
        const normalizedInput = tagInput.trim().toLowerCase()
        let targetTag = workshopTags.find(t => t.name.toLowerCase() === normalizedInput)

        setSaving(true)
        try {
            if (!targetTag) {
                // Create new tag
                const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b']
                const randomColor = colors[Math.floor(Math.random() * colors.length)]

                const { data, error } = await supabase
                    .from('workshop_tags')
                    .insert({
                        workshop_id: workshopId,
                        name: tagInput.trim(),
                        color: randomColor
                    })
                    .select()
                    .single()

                if (error) throw error
                targetTag = data
                setWorkshopTags(prev => [...prev, data])
            }

            // Add to order if not already there
            const currentTags = order.tags || []
            if (!currentTags.includes(targetTag.id)) {
                const newTags = [...currentTags, targetTag.id]
                setOrder({ ...order, tags: newTags })
                const { error } = await supabase.from('orders').update({ tags: newTags }).eq('id', order.id)
                if (error) throw error
            }

            setTagInput("")
        } catch (error: any) {
            toastError("Fehler", "Tag konnte nicht verarbeitet werden.")
            console.error(error)
        } finally {
            setSaving(false)
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
                    <Button onClick={() => navigate(returnPath)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Zurück zur Übersicht
                    </Button>
                </div>

                {/* Abholbereit Confirmation Dialog */}
                <AlertDialog open={showAbholbereitConfirm} onOpenChange={setShowAbholbereitConfirm}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Status auf "Abholbereit" setzen?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Wenn Sie den Status auf "Abholbereit" setzen, wird der Kunde automatisch per E-Mail darüber informiert, dass sein Fahrrad abholbereit ist.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setPendingStatusUpdate(null)}>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => {
                                    if (pendingStatusUpdate) {
                                        handleStatusChange(pendingStatusUpdate.status, pendingStatusUpdate.actor)
                                        setPendingStatusUpdate(null)
                                    }
                                    setShowAbholbereitConfirm(false)
                                }}
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                Bestätigen & E-Mail senden
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DashboardLayout>
        )
    }

    return (
        <PageTransition>
            <DashboardLayout>
                <div className="space-y-6 pb-8">

                    {/* ── Hero Header ─────────────────────────────────────────── */}
                    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card">
                        {/* Ambient background glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/4 via-transparent to-primary/2 pointer-events-none" />
                        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/6 blur-3xl pointer-events-none" />

                        <div className="relative px-6 py-5">
                            {/* ── Row 1: Navigation ── */}
                            <div className="mb-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1.5 text-muted-foreground hover:text-foreground -ml-1 h-8"
                                    onClick={() => navigate(returnPath)}
                                >
                                    <ArrowLeft className="h-3.5 w-3.5" />
                                    Zurück
                                </Button>
                            </div>

                            {/* ── Row 2: Identity + Due Date ── */}
                            <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-3">
                                {/* Left: order number, type badge, tags */}
                                <div className="flex-1 min-w-0">
                                    {/* Order number + copy + type badge */}
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                                            {order.order_number}
                                        </h1>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            className="text-muted-foreground hover:text-foreground hover:ring-1 hover:ring-border transition-all duration-200"
                                            onClick={() => {
                                                navigator.clipboard.writeText(order.order_number)
                                                toastSuccess('Kopiert', 'Auftragsnummer wurde kopiert.')
                                            }}
                                            title="Auftragsnummer kopieren"
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button
                                                    disabled={isReadOnly}
                                                    className={cn(
                                                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-transparent transition-all duration-200 focus:outline-none",
                                                        isReadOnly ? "cursor-default text-muted-foreground bg-muted/50" : "cursor-pointer hover:bg-muted/10 hover:ring-1 hover:ring-border/50",
                                                        order.is_leasing
                                                            ? "bg-primary/10 text-primary border-primary/20 hover:border-primary/40"
                                                            : "bg-muted text-muted-foreground border-border/50 hover:border-border"
                                                    )}
                                                >
                                                    {order.is_leasing ? "Leasing" : "Standard"}
                                                    {!isReadOnly && <span className="opacity-50">▾</span>}
                                                </button>
                                            </PopoverTrigger>
                                            {!isReadOnly && (
                                                <PopoverContent className="w-64 p-2" align="start" sideOffset={6}>
                                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-2">Auftragstyp</p>
                                                    <button
                                                        onClick={() => {
                                                            if (!order.is_leasing) return
                                                            setPendingOrderTypeUpdate(false)
                                                            setShowOrderTypeConfirm(true)
                                                        }}
                                                        className={cn(
                                                            "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors mb-1",
                                                            !order.is_leasing
                                                                ? "bg-foreground/5 ring-1 ring-border cursor-default"
                                                                : "hover:bg-muted/60 cursor-pointer"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                                            !order.is_leasing ? "border-primary" : "border-border"
                                                        )}>
                                                            {!order.is_leasing && <div className="h-2 w-2 rounded-full bg-primary" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium leading-tight">Standard</p>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5">Normale Reparatur ohne Leasing</p>
                                                        </div>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (order.is_leasing) return
                                                            handleOrderTypeUpdate(true)
                                                        }}
                                                        className={cn(
                                                            "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                                                            order.is_leasing
                                                                ? "bg-foreground/5 ring-1 ring-border cursor-default"
                                                                : "hover:bg-muted/60 cursor-pointer"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                                            order.is_leasing ? "border-primary" : "border-border"
                                                        )}>
                                                            {order.is_leasing && <div className="h-2 w-2 rounded-full bg-primary" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium leading-tight">Leasing</p>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5">Auftrag über einen Leasing-Anbieter</p>
                                                        </div>
                                                    </button>
                                                </PopoverContent>
                                            )}
                                        </Popover>
                                    </div>

                                    {/* Tags */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {order.tags && order.tags.map(tagId => {
                                            const tagInfo = workshopTags.find(t => t.id === tagId)
                                            if (!tagInfo) return null
                                            return (
                                                <Badge
                                                    key={tagId}
                                                    className="px-2 py-0.5 text-xs font-medium text-white shadow-sm border-0 flex items-center gap-1"
                                                    style={{ backgroundColor: tagInfo.color }}
                                                >
                                                    {tagInfo.name}
                                                    {!isReadOnly && (
                                                        <button onClick={(e) => handleRemoveTag(tagId, e)} className="hover:bg-black/20 rounded-full p-0.5 ml-0.5">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </Badge>
                                            )
                                        })}

                                        {!isReadOnly && workshopTags.length > 0 && (
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-6 gap-1 px-2 text-[10px] sm:text-xs border-dashed text-muted-foreground hover:text-foreground">
                                                        <Plus className="w-3 h-3" /> Tag
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-56 p-2" align="start">
                                                    <form onSubmit={handleCreateAndAddTag} className="flex gap-2 mb-2 p-1">
                                                        <Input
                                                            placeholder="Neuer Tag..."
                                                            className="h-7 text-xs"
                                                            value={tagInput}
                                                            onChange={(e) => setTagInput(e.target.value)}
                                                            autoFocus
                                                        />
                                                        <Button type="submit" size="sm" className="h-7 px-2">
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </form>
                                                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                                        <p className="text-[10px] font-semibold text-muted-foreground px-2 pb-1 uppercase tracking-wider">Vorhandene Tags</p>
                                                        {workshopTags.length === 0 && (
                                                            <p className="text-[10px] text-muted-foreground px-2 italic">Keine Tags vorhanden</p>
                                                        )}
                                                        {workshopTags.map(tag => {
                                                            const isAssigned = order.tags?.includes(tag.id)
                                                            return (
                                                                <button
                                                                    key={tag.id}
                                                                    onClick={() => handleToggleTag(tag.id)}
                                                                    className={cn(
                                                                        "w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-md transition-colors",
                                                                        isAssigned ? "bg-primary/5 text-primary" : "hover:bg-muted/50"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                                                                        {tag.name}
                                                                    </div>
                                                                    {isAssigned && <Check className="w-3.5 h-3.5" />}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Due Date */}
                                <div className="shrink-0">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={cn(
                                                    "h-8 gap-2 text-xs font-normal",
                                                    !order.due_date && "text-muted-foreground border-dashed",
                                                    order.due_date && new Date(order.due_date) < new Date() && order.status !== 'abgeholt' && order.status !== 'abgeschlossen' && "text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700 dark:bg-red-950/20 dark:border-red-900/40"
                                                )}
                                            >
                                                <CalendarIcon className="h-3.5 w-3.5" />
                                                {order.due_date ? format(new Date(order.due_date), "PPP", { locale: de }) : "Termin setzen"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="end">
                                            <Calendar
                                                mode="single"
                                                selected={order.due_date ? new Date(order.due_date) : undefined}
                                                onSelect={handleSaveDueDate}
                                                initialFocus
                                                locale={de}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            {/* ── Row 3: Metadata ── */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-5">
                                <span className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" />
                                    Erstellt {new Date(order.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </span>
                                <span className="text-border">·</span>
                                <span className="flex items-center gap-1.5">
                                    <Bike className="h-3.5 w-3.5" />
                                    {order.bike_model || 'Fahrrad'}
                                    {order.bike_type && <span className="text-xs">({BIKE_TYPE_LABELS[order.bike_type] || order.bike_type})</span>}
                                </span>
                                <span className="text-border">·</span>
                                <span className="flex items-center gap-1.5">
                                    <User className="h-3.5 w-3.5" />
                                    {order.customer_name}
                                </span>
                            </div>

                            {/* ── Row 4: Action Bar ── */}
                            {!isReadOnly && (
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-5">
                                    {/* Primary Actions */}
                                    <div className="flex flex-1 gap-2">
                                        <Button
                                            size="lg"
                                            onClick={() => navigate(`/dashboard/orders/${order.id}/work`)}
                                            className="flex-1 h-10 gap-2 text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 rounded-xl transition-all active:scale-[0.98]"
                                        >
                                            <Wrench className="h-4 w-4" />
                                            {order.checklist && order.checklist.some((item: any) => item.completed || item.notes)
                                                ? "Weiterarbeiten"
                                                : "Arbeitsmodus"}
                                        </Button>
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            onClick={() => navigate(`/dashboard/orders/${order.id}/control`)}
                                            className="flex-1 h-10 gap-2 text-sm font-semibold bg-green-500/8 text-green-600 border-green-200/60 hover:bg-green-500/15 hover:border-green-300 dark:bg-green-500/10 dark:hover:bg-green-500/20 dark:border-green-500/30 rounded-xl transition-all active:scale-[0.98]"
                                        >
                                            <ShieldCheck className="h-4 w-4" />
                                            Kontrolle
                                        </Button>
                                    </div>
                                    {/* Secondary Actions */}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-10 gap-1.5 text-xs rounded-xl sm:shrink-0"
                                        onClick={() => {
                                            const url = `${window.location.origin}/status/${order.id}`
                                            navigator.clipboard.writeText(url)
                                            toastSuccess('Link kopiert', 'Der Status-Link wurde in die Zwischenablage kopiert.')
                                        }}
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                        <span>Status-Link</span>
                                    </Button>
                                </div>
                            )}

                            {/* ── Row 5: Status Progress Timeline ── */}
                            <div className="pt-5 border-t border-border/40">
                                <div className="flex items-center gap-0">
                                    {STATUS_FLOW.map((step, idx) => {
                                        const stepIdx = STATUS_FLOW.findIndex(s => s.value === order.status)
                                        const isDone = idx < stepIdx
                                        const isActive = step.value === order.status
                                        const isLast = idx === STATUS_FLOW.length - 1
                                        const Icon = step.icon
                                        return (
                                            <div key={step.value} className="flex items-center flex-1 min-w-0">
                                                <button
                                                    onClick={() => !saving && !isReadOnly && handleStatusChange(step.value)}
                                                    disabled={saving || isReadOnly || isActive}
                                                    className={cn(
                                                        "flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all duration-200 cursor-pointer select-none group",
                                                        "disabled:cursor-default",
                                                        isActive && "cursor-default"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "relative h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 shrink-0",
                                                        isDone && "bg-primary/15 border border-primary/30",
                                                        isActive && cn(STATUS_SOLID_COLORS[step.value], "text-primary-foreground shadow-sm scale-110 border-transparent"),
                                                        !isDone && !isActive && "bg-muted/60 border border-border/50 text-muted-foreground group-hover:border-primary/30 group-hover:bg-primary/5"
                                                    )}>
                                                        {isDone
                                                            ? <Check className="h-4 w-4 text-primary" />
                                                            : <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                                                        }
                                                    </div>
                                                    <span className={cn(
                                                        "text-[10px] font-medium leading-tight text-center hidden sm:block w-full min-h-[2.5em] flex items-center justify-center px-1",
                                                        isActive && "text-primary font-semibold",
                                                        isDone && "text-primary/70",
                                                        !isDone && !isActive && "text-muted-foreground"
                                                    )}>
                                                        {step.label}
                                                    </span>
                                                </button>
                                                {!isLast && (
                                                    <div className={cn(
                                                        "flex-1 h-px mx-0.5 transition-all duration-300",
                                                        idx < stepIdx ? "bg-primary/40" : "bg-border/60"
                                                    )} />
                                                )}
                                            </div>
                                        )
                                    })}

                                    {/* Separator */}
                                    <div className="w-3 h-px bg-border/40 mx-1 shrink-0" />

                                    {/* Leasing / Abgeholt */}
                                    {order.is_leasing && (
                                        <>
                                            <button
                                                onClick={() => !saving && !isReadOnly && handleStatusChange(LEASING_STATUS.value)}
                                                disabled={saving || isReadOnly || order.status === LEASING_STATUS.value || order.status === COMPLETED_STATUS.value}
                                                className="flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all duration-200 cursor-pointer select-none group disabled:cursor-default"
                                            >
                                                <div className={cn(
                                                    "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 shrink-0",
                                                    order.status === LEASING_STATUS.value && cn(STATUS_SOLID_COLORS.abgeholt, "text-white shadow-sm scale-110"),
                                                    order.status !== LEASING_STATUS.value && "bg-muted/60 border border-border/50 text-muted-foreground group-hover:border-emerald-300 group-hover:bg-emerald-500/5"
                                                )}>
                                                    <LEASING_STATUS.icon className={cn("h-4 w-4", order.status === LEASING_STATUS.value ? "text-white" : "text-muted-foreground")} />
                                                </div>
                                                <span className={cn("text-[10px] font-medium leading-tight text-center hidden sm:block w-full min-h-[2.5em] flex items-center justify-center px-1", order.status === LEASING_STATUS.value ? "text-emerald-600 font-semibold" : "text-muted-foreground")}>
                                                    {LEASING_STATUS.label}
                                                </span>
                                            </button>
                                            <div className="w-4 h-px bg-border/40 mx-1 shrink-0" />
                                        </>
                                    )}

                                    {/* Abgeschlossen */}
                                    <button
                                        onClick={() => !saving && !isReadOnly && handleStatusChange(COMPLETED_STATUS.value)}
                                        disabled={saving || isReadOnly || order.status === COMPLETED_STATUS.value}
                                        className="flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all duration-200 cursor-pointer select-none group disabled:cursor-default"
                                    >
                                        <div className={cn(
                                            "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 shrink-0",
                                            order.status === COMPLETED_STATUS.value && cn(STATUS_SOLID_COLORS.abgeschlossen, "text-white shadow-sm scale-110"),
                                            order.status !== COMPLETED_STATUS.value && "bg-muted/60 border border-border/50 text-muted-foreground group-hover:border-slate-300 group-hover:bg-slate-500/5"
                                        )}>
                                            <COMPLETED_STATUS.icon className={cn("h-4 w-4", order.status === COMPLETED_STATUS.value ? "text-white" : "text-muted-foreground")} />
                                        </div>
                                        <span className={cn("text-[10px] font-medium leading-tight text-center hidden sm:block w-full min-h-[2.5em] flex items-center justify-center px-1", order.status === COMPLETED_STATUS.value ? "text-slate-600 font-semibold" : "text-muted-foreground")}>
                                            {COMPLETED_STATUS.label}
                                        </span>
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>


                    {/* ── 2 Column Grid ──────────────────────────────────────── */}
                    <div className="grid gap-5 grid-cols-1 lg:grid-cols-5">

                        {/* ━━ LEFT COLUMN (Main Work) ━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                        <div className="lg:col-span-3 space-y-5">

                            {/* Kundenwunsch */}
                            <Collapsible
                                open={isKundenwunschOpen}
                                onOpenChange={setIsKundenwunschOpen}
                                className="rounded-xl border border-border/60 bg-card overflow-hidden"
                            >
                                <CollapsibleTrigger asChild>
                                    <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border/40 cursor-pointer hover:bg-muted/30 transition-colors group">
                                        <div className="h-7 w-7 rounded-lg bg-violet-500/12 flex items-center justify-center">
                                            <AlertCircle className="h-3.5 w-3.5 text-violet-500" />
                                        </div>
                                        <span className="text-sm font-semibold">Kundenwunsch</span>
                                        <ChevronDown className={cn(
                                            "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                            isKundenwunschOpen ? "transform rotate-180" : ""
                                        )} />
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="px-5 py-3.5">
                                        <div
                                            className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90 cursor-default"
                                            onClick={() => toastError("Nicht bearbeitbar", "Der Kundenwunsch kann im Nachhinein nicht mehr bearbeitet werden.")}
                                        >
                                            {customerNote || <span className="text-muted-foreground italic">Keine Beschreibung vorhanden.</span>}
                                        </div>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>

                            {/* Internal Notes */}
                            <Collapsible
                                open={isInternalNotesOpen}
                                onOpenChange={setIsInternalNotesOpen}
                                className="rounded-xl border border-border/60 bg-card overflow-hidden flex flex-col"
                            >
                                <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                                    <CollapsibleTrigger asChild>
                                        <div className="flex items-center gap-2 cursor-pointer flex-1">
                                            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <StickyNote className="h-3.5 w-3.5 text-primary" />
                                            </div>
                                            <span className="text-sm font-semibold">Interne Notizen</span>
                                            {saving && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                                            <ChevronDown className={cn(
                                                "h-4 w-4 text-muted-foreground transition-transform duration-200 ml-1",
                                                isInternalNotesOpen ? "transform rotate-180" : ""
                                            )} />
                                        </div>
                                    </CollapsibleTrigger>
                                    {!isReadOnly && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-lg bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setEditInternalNote(order?.internal_note || "")
                                                setIsInternalNoteEditDialogOpen(true)
                                            }}
                                        >
                                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                        </Button>
                                    )}
                                </div>
                                <CollapsibleContent className="flex-1 flex flex-col">
                                    <div className="p-0 flex-1 flex flex-col">
                                        <div
                                            className={cn(
                                                "px-4 py-3.5 text-sm whitespace-pre-wrap leading-relaxed min-h-[80px]",
                                                !isReadOnly && "cursor-pointer hover:bg-muted/20 transition-colors"
                                            )}
                                            onClick={() => {
                                                if (!isReadOnly) {
                                                    setEditInternalNote(order?.internal_note || "")
                                                    setIsInternalNoteEditDialogOpen(true)
                                                }
                                            }}
                                        >
                                            {internalNote || <span className="text-muted-foreground italic">Keine internen Notizen.</span>}
                                        </div>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>

                            {/* Checklist Card */}
                            <Collapsible
                                open={isChecklistOpen}
                                onOpenChange={setIsChecklistOpen}
                                className="rounded-xl border border-border/60 bg-card overflow-hidden"
                            >
                                <div className="px-4 py-3.5 border-b border-border/40">
                                    <div className="flex items-center justify-between mb-3">
                                        <CollapsibleTrigger asChild>
                                            <div className="flex items-center gap-2.5 cursor-pointer flex-1">
                                                <div className="h-7 w-7 rounded-lg bg-violet-500/12 flex items-center justify-center">
                                                    <PackageCheck className="h-3.5 w-3.5 text-violet-500" />
                                                </div>
                                                <span className="text-sm font-semibold">Checkliste</span>
                                                <ChevronDown className={cn(
                                                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                                    isChecklistOpen ? "transform rotate-180" : ""
                                                )} />
                                            </div>
                                        </CollapsibleTrigger>
                                        <span className="text-xs text-muted-foreground font-medium tabular-nums">
                                            {order.checklist?.filter(i => i.completed).length || 0} / {order.checklist?.length || 0}
                                        </span>
                                    </div>

                                    {/* Progress Bar */}
                                    {order.checklist && order.checklist.length > 0 && (
                                        <div className="w-full h-1.5 bg-muted/60 rounded-full overflow-hidden mb-3">
                                            <div
                                                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                                                style={{ width: `${Math.round((order.checklist.filter(i => i.completed).length / order.checklist.length) * 100)}%` }}
                                            />
                                        </div>
                                    )}

                                    {/* Template Selector */}
                                    {/* Template Selection Modal */}
                                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                                        <Dialog open={isTemplateModalOpen} onOpenChange={(open) => {
                                            if (open && order) {
                                                // Initialize with current templates
                                                const currentIds = Array.from(new Set((order.checklist || [])
                                                    .filter(i => i.template_id)
                                                    .map(i => i.template_id as string)))
                                                setSelectedDetailTemplateIds(currentIds)
                                            }
                                            setIsTemplateModalOpen(open)
                                        }}>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-[11px] bg-muted/40 border-border/50 flex-none gap-2 px-2.5"
                                                    disabled={isReadOnly}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                    Vorlagen auswählen
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl">
                                                <DialogHeader>
                                                    <DialogTitle>Checkliste(n) verwalten</DialogTitle>
                                                    <DialogDescription>
                                                        Wählen Sie Vorlagen aus oder entfernen Sie diese. Beim Entfernen einer Vorlage gehen die zugehörigen Punkte verloren.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="max-h-[60vh] overflow-y-auto px-1">
                                                    <ChecklistTemplateSelector
                                                        templates={templates}
                                                        selectedTemplateIds={selectedDetailTemplateIds}
                                                        alreadySelectedIds={Array.from(new Set((order.checklist || [])
                                                            .filter(i => i.template_id)
                                                            .map(i => i.template_id as string)))}
                                                        onToggleTemplate={(id) => {
                                                            setSelectedDetailTemplateIds(prev =>
                                                                prev.includes(id)
                                                                    ? prev.filter(tid => tid !== id)
                                                                    : [...prev, id]
                                                            )
                                                        }}
                                                        onClearAll={() => setSelectedDetailTemplateIds([])}
                                                    />
                                                </div>
                                                <DialogFooter>
                                                    <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>
                                                        Abbrechen
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleUpdateTemplates()}
                                                        disabled={saving}
                                                    >
                                                        {saving ? "Wird aktualisiert..." : "Speichern"}
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>

                                        {/* Custom Item Modal */}
                                        <Dialog open={isCustomItemModalOpen} onOpenChange={setIsCustomItemModalOpen}>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-[11px] bg-muted/40 border-border/50 flex-none gap-2 px-2.5 whitespace-nowrap"
                                                    disabled={isReadOnly}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                    Punkt hinzufügen
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-md">
                                                <DialogHeader>
                                                    <DialogTitle>Manueller Punkt</DialogTitle>
                                                    <DialogDescription>
                                                        Fügen Sie einen individuellen Punkt zur Checkliste hinzu.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="py-2">
                                                    <Label htmlFor="custom-item-text" className="text-xs text-muted-foreground mb-1.5 block">Beschreibung</Label>
                                                    <Input
                                                        id="custom-item-text"
                                                        value={customItemText}
                                                        onChange={(e) => setCustomItemText(e.target.value)}
                                                        placeholder="z.B. Sattelstütze fetten"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleAddCustomItem()
                                                        }}
                                                        autoFocus
                                                    />
                                                </div>
                                                <DialogFooter>
                                                    <Button variant="outline" onClick={() => setIsCustomItemModalOpen(false)}>
                                                        Abbrechen
                                                    </Button>
                                                    <Button
                                                        onClick={handleAddCustomItem}
                                                        disabled={!customItemText.trim() || saving}
                                                    >
                                                        {saving ? "Wird hinzugefügt..." : "Hinzufügen"}
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>

                                        {/* Removal Warning Dialog */}
                                        <AlertDialog open={showRemovalWarning} onOpenChange={setShowRemovalWarning}>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Fortschritt löschen?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Sie entfernen die folgenden Checklisten, bei denen bereits Punkte abgehakt wurden:
                                                        <span className="font-semibold block mt-1">
                                                            {templatesToRemove.map(t => t.name).join(', ')}
                                                        </span>
                                                        Der Fortschritt in diesen Listen geht unwiderruflich verloren. Möchten Sie wirklich fortfahren?
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        onClick={() => {
                                                            const toRemove = Array.from(new Set((order?.checklist || [])
                                                                .filter(i => i.template_id)
                                                                .map(i => i.template_id as string)))
                                                                .filter(id => !selectedDetailTemplateIds.includes(id))
                                                            handleUpdateTemplates(toRemove)
                                                        }}
                                                    >
                                                        Ja, entfernen
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>

                                <CollapsibleContent>
                                    <div className="px-4 py-3">
                                        {order.checklist && order.checklist.length > 0 ? (
                                            <div className="space-y-6">
                                                {/* Grouped Rendering */}
                                                {Object.entries((order.checklist || []).reduce((groups: any, item, index) => {
                                                    const groupName = item.template_name || 'Allgemein'
                                                    if (!groups[groupName]) groups[groupName] = []
                                                    groups[groupName].push({ ...item, originalIndex: index })
                                                    return groups
                                                }, {})).map(([groupName, items]: [string, any]) => (
                                                    <Collapsible key={groupName} defaultOpen className="space-y-2">
                                                        <CollapsibleTrigger className="flex items-center gap-2 w-full px-1 hover:bg-muted/30 rounded py-0.5 group">
                                                            <ChevronDown className="h-3 w-3 text-muted-foreground/40 group-data-[state=closed]:-rotate-90 transition-transform" />
                                                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                                                                {groupName}
                                                            </h4>
                                                            <div className="h-[1px] flex-1 bg-border/40" />
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent>
                                                            <div className="space-y-1.5 pt-1">
                                                                {items.map((item: any) => (
                                                                    <div
                                                                        key={item.originalIndex}
                                                                        className={cn(
                                                                            "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-200 group",
                                                                            item.completed
                                                                                ? "bg-primary/5 border-primary/15"
                                                                                : "bg-transparent border-border/40 hover:border-border hover:bg-muted/30"
                                                                        )}
                                                                    >
                                                                        <Checkbox
                                                                            id={`item-${item.originalIndex}`}
                                                                            checked={item.completed}
                                                                            onCheckedChange={(checked) => handleToggleChecklist(item.originalIndex, checked as boolean)}
                                                                            disabled={isReadOnly}
                                                                            className={cn(
                                                                                "shrink-0 transition-all duration-200",
                                                                                item.completed ? "data-[state=checked]:bg-primary data-[state=checked]:border-primary" : "border-muted-foreground/30"
                                                                            )}
                                                                        />
                                                                        <div className="flex-1 min-w-0 flex items-center gap-2">
                                                                            <label
                                                                                htmlFor={`item-${item.originalIndex}`}
                                                                                className={cn(
                                                                                    "text-sm cursor-pointer leading-snug transition-colors duration-200 flex-1",
                                                                                    item.completed ? "text-muted-foreground/60 line-through" : "text-foreground"
                                                                                )}
                                                                            >
                                                                                {typeof item === 'string' ? item : item.text}
                                                                            </label>
                                                                            {item.type === 'acceptance' && (
                                                                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal text-muted-foreground bg-background/50 border-border/50 shrink-0">
                                                                                    Annahme
                                                                                </Badge>
                                                                            )}
                                                                            {!item.template_id && !isReadOnly && (
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 transition-colors"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation()
                                                                                        handleRemoveChecklistItem(item.originalIndex)
                                                                                    }}
                                                                                >
                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </CollapsibleContent>
                                                    </Collapsible>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-xl border-muted/40 bg-muted/5">
                                                <PackageCheck className="h-9 w-9 mb-3 opacity-20" />
                                                <p className="text-sm font-medium mb-0.5">Keine Checkliste</p>
                                                <p className="text-xs max-w-[180px]">Wähle oben eine Vorlage aus, um zu starten.</p>
                                            </div>
                                        )}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>


                        </div>

                        {/* ━━ RIGHT COLUMN (Details) ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                        <div className="lg:col-span-2 space-y-5">

                            {/* Customer Card */}
                            <Collapsible
                                open={isCustomerDataOpen}
                                onOpenChange={setIsCustomerDataOpen}
                                className="rounded-xl border border-border/60 bg-card overflow-hidden"
                            >
                                <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
                                    <CollapsibleTrigger asChild>
                                        <div className="flex items-center gap-2.5 cursor-pointer flex-1">
                                            <div className="h-7 w-7 rounded-lg bg-blue-500/12 flex items-center justify-center">
                                                <User className="h-3.5 w-3.5 text-blue-500" />
                                            </div>
                                            <span className="text-sm font-semibold">Kundendaten</span>
                                            <ChevronDown className={cn(
                                                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                                isCustomerDataOpen ? "transform rotate-180" : ""
                                            )} />
                                        </div>
                                    </CollapsibleTrigger>
                                    {!isReadOnly && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-lg bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setEditCustomerName(order.customer_name)
                                                setEditCustomerEmail(order.customer_email || "")
                                                setEditCustomerPhone(order.customer_phone || "")
                                                setIsCustomerEditDialogOpen(true)
                                            }}
                                        >
                                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                        </Button>
                                    )}
                                </div>
                                <CollapsibleContent>
                                    <div
                                        className={cn(
                                            "px-4 py-3 space-y-2.5",
                                            !isReadOnly && "cursor-pointer hover:bg-muted/20 transition-colors"
                                        )}
                                        onClick={() => {
                                            if (!isReadOnly) {
                                                setEditCustomerName(order.customer_name)
                                                setEditCustomerEmail(order.customer_email || "")
                                                setEditCustomerPhone(order.customer_phone || "")
                                                setIsCustomerEditDialogOpen(true)
                                            }
                                        }}
                                    >
                                        <div>
                                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Name</p>
                                            <p className="text-sm font-medium">{order.customer_name}</p>
                                        </div>
                                        {order.customer_email && (
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                                                <p className="text-sm truncate">{order.customer_email}</p>
                                            </div>
                                        )}
                                        {order.customer_phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                                                <p className="text-sm">{order.customer_phone}</p>
                                            </div>
                                        )}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>

                            {/* Bike Card */}
                            <Collapsible
                                open={isBikeDataOpen}
                                onOpenChange={setIsBikeDataOpen}
                                className="rounded-xl border border-border/60 bg-card overflow-hidden"
                            >
                                <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
                                    <CollapsibleTrigger asChild>
                                        <div className="flex items-center gap-2.5 cursor-pointer flex-1">
                                            <div className="h-7 w-7 rounded-lg bg-orange-500/12 flex items-center justify-center">
                                                <Bike className="h-3.5 w-3.5 text-orange-500" />
                                            </div>
                                            <span className="text-sm font-semibold">Fahrrad</span>
                                            <ChevronDown className={cn(
                                                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                                isBikeDataOpen ? "transform rotate-180" : ""
                                            )} />
                                        </div>
                                    </CollapsibleTrigger>
                                    {!isReadOnly && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-lg bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setEditBikeBrand(order.bike_brand || "")
                                                setEditBikeModel(order.bike_model || "")
                                                setEditBikeType(order.bike_type || "")
                                                setEditBikeColor(order.bike_color || "")
                                                setIsBikeEditDialogOpen(true)
                                            }}
                                        >
                                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                        </Button>
                                    )}
                                </div>
                                <CollapsibleContent>
                                    <div
                                        className={cn(
                                            "px-4 py-3 grid grid-cols-2 gap-y-3 gap-x-3",
                                            !isReadOnly && "cursor-pointer hover:bg-muted/20 transition-colors"
                                        )}
                                        onClick={() => {
                                            if (!isReadOnly) {
                                                setEditBikeBrand(order.bike_brand || "")
                                                setEditBikeModel(order.bike_model || "")
                                                setEditBikeType(order.bike_type || "")
                                                setEditBikeColor(order.bike_color || "")
                                                setIsBikeEditDialogOpen(true)
                                            }
                                        }}
                                    >
                                        <div>
                                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Marke</p>
                                            <p className="text-sm font-medium">{order.bike_brand || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Modell</p>
                                            <p className="text-sm font-medium">{order.bike_model || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Farbe</p>
                                            <p className="text-sm font-medium">{order.bike_color || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Typ</p>
                                            <p className="text-sm font-medium">
                                                {order.bike_type ? BIKE_TYPE_LABELS[order.bike_type] || order.bike_type : '—'}
                                            </p>
                                        </div>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>

                            {/* Price Card */}
                            <Collapsible
                                open={isPriceOpen}
                                onOpenChange={setIsPriceOpen}
                                className="rounded-xl border border-border/60 bg-card overflow-hidden"
                            >
                                <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
                                    <CollapsibleTrigger asChild>
                                        <div className="flex items-center gap-2.5 cursor-pointer flex-1">
                                            <div className="h-7 w-7 rounded-lg bg-emerald-500/12 flex items-center justify-center">
                                                <Euro className="h-3.5 w-3.5 text-emerald-500" />
                                            </div>
                                            <span className="text-sm font-semibold">Preisübersicht</span>
                                            <ChevronDown className={cn(
                                                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                                isPriceOpen ? "transform rotate-180" : ""
                                            )} />
                                        </div>
                                    </CollapsibleTrigger>
                                    {!isReadOnly && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-lg bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setEditEstimatedPrice(order.estimated_price?.toString() || "")
                                                setEditFinalPrice(order.final_price?.toString() || "")
                                                setIsPriceEditDialogOpen(true)
                                            }}
                                        >
                                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                        </Button>
                                    )}
                                </div>
                                <CollapsibleContent>
                                    <div
                                        className={cn(
                                            "px-4 py-3",
                                            !isReadOnly && "cursor-pointer hover:bg-muted/20 transition-colors"
                                        )}
                                        onClick={() => {
                                            if (!isReadOnly) {
                                                setEditEstimatedPrice(order.estimated_price?.toString() || "")
                                                setEditFinalPrice(order.final_price?.toString() || "")
                                                setIsPriceEditDialogOpen(true)
                                            }
                                        }}
                                    >
                                        <div className="flex items-baseline justify-between gap-4">
                                            <div className="flex-1">
                                                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Geschätzt</p>
                                                <p className="text-xl font-bold tracking-tight text-primary">
                                                    {order.estimated_price !== null
                                                        ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(order.estimated_price)
                                                        : '—'
                                                    }
                                                </p>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Tatsächlich</p>
                                                <p className="text-xl font-semibold">
                                                    {order.final_price !== null
                                                        ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(order.final_price)
                                                        : <span className="text-muted-foreground italic text-sm font-normal">Offen</span>
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>

                            {/* Leasing Card (conditional) */}
                            {order.is_leasing && (
                                <Collapsible
                                    open={isLeasingOpen}
                                    onOpenChange={setIsLeasingOpen}
                                    className="rounded-xl border border-primary/20 bg-primary/3 overflow-hidden"
                                >
                                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-primary/15">
                                        <CollapsibleTrigger asChild>
                                            <div className="flex items-center gap-2.5 cursor-pointer flex-1">
                                                <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
                                                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                                                </div>
                                                <span className="text-sm font-semibold">Leasing</span>
                                                <ChevronDown className={cn(
                                                    "h-4 w-4 text-primary/70 transition-transform duration-200",
                                                    isLeasingOpen ? "transform rotate-180" : ""
                                                )} />
                                            </div>
                                        </CollapsibleTrigger>
                                        {!isReadOnly && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-primary/10"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setEditLeasingProvider(order.leasing_provider || "")
                                                    setEditLeasingPortalEmail(order.leasing_portal_email || "")
                                                    setEditContractId(order.contract_id || "")
                                                    setEditServicePackage(order.service_package || "")
                                                    setEditInspectionCode(order.inspection_code || "")
                                                    setEditPickupCode(order.pickup_code || "")
                                                    setIsLeasingEditDialogOpen(true)
                                                }}
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                    <CollapsibleContent>
                                        <div className="px-4 py-3 space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Anbieter</p>
                                                    <p className="text-sm font-medium">{order.leasing_provider || '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Vertrags-Nr.</p>
                                                    <p className="text-sm font-medium truncate" title={order.contract_id || ""}>{order.contract_id || '—'}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Portal E-Mail</p>
                                                <p className="text-sm truncate">{order.leasing_portal_email || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Service Paket</p>
                                                <p className="text-sm">{order.service_package || '—'}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-primary/10">
                                                <div>
                                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Leasing Code</p>
                                                    <p className="font-mono text-sm">{order.leasing_code || '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Insp.-Code</p>
                                                    <p className="font-mono text-sm">{order.inspection_code || '—'}</p>
                                                </div>
                                            </div>
                                            {order.pickup_code && (
                                                <div>
                                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Abhol Code</p>
                                                    <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1.5">
                                                        <span className="font-mono text-sm font-medium text-primary">{order.pickup_code}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {order.is_leasing && (
                                                <div className="flex items-center gap-2 p-2.5 bg-yellow-500/8 border border-yellow-500/15 rounded-lg">
                                                    <AlertCircle className="h-3.5 w-3.5 text-yellow-600 shrink-0" />
                                                    <p className="text-xs text-yellow-700 dark:text-yellow-500">Code wird bei Abholung erfasst</p>
                                                </div>
                                            )}
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            )}

                            {/* Assignments Card */}
                            <Collapsible
                                open={isAssignmentsOpen}
                                onOpenChange={setIsAssignmentsOpen}
                                className="rounded-xl border border-border/60 bg-card overflow-hidden"
                            >
                                <div className="px-4 py-3.5 border-b border-border/40">
                                    <CollapsibleTrigger asChild>
                                        <div className="flex items-center gap-2.5 cursor-pointer">
                                            <div className="h-7 w-7 rounded-lg bg-muted/80 flex items-center justify-center">
                                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                            </div>
                                            <span className="text-sm font-semibold">Zuständigkeiten</span>
                                            <ChevronDown className={cn(
                                                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                                isAssignmentsOpen ? "transform rotate-180" : ""
                                            )} />
                                        </div>
                                    </CollapsibleTrigger>
                                </div>
                                <CollapsibleContent>
                                    <div className="px-4 py-3 space-y-4">
                                        {/* Mechanics */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mechaniker</p>
                                                {!isReadOnly && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-xs text-primary hover:text-primary/80 px-2 gap-1"
                                                        onClick={() => {
                                                            setAssignmentType('add_mechanic')
                                                            setIsAssignmentModalOpen(true)
                                                        }}
                                                    >
                                                        + Hinzufügen
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                {order.mechanic_ids && order.mechanic_ids.length > 0 ? (
                                                    order.mechanic_ids.map((mechId) => (
                                                        <div key={mechId} className="flex items-center justify-between group/mech bg-muted/30 px-3 py-2 rounded-lg">
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center">
                                                                    <Wrench className="h-3 w-3 text-primary" />
                                                                </div>
                                                                <span className="text-sm font-medium">{getEmployeeName(mechId)}</span>
                                                            </div>
                                                            {!isReadOnly && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-5 w-5 text-muted-foreground hover:text-destructive opacity-0 group-hover/mech:opacity-100 transition-opacity"
                                                                    onClick={() => handleRemoveMechanic(mechId)}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-muted-foreground italic pl-1">Keine Mechaniker zugewiesen</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="h-px bg-border/50" />

                                        {/* QC */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Qualitätskontrolle</p>
                                                {!isReadOnly && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-xs text-primary hover:text-primary/80 px-2"
                                                        onClick={() => {
                                                            setAssignmentType('qc')
                                                            setIsAssignmentModalOpen(true)
                                                        }}
                                                    >
                                                        {order.qc_mechanic_id ? 'Ändern' : 'Zuweisen'}
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 bg-muted/30 px-3 py-2 rounded-lg">
                                                <div className="h-5 w-5 rounded-full bg-green-500/15 flex items-center justify-center">
                                                    <ShieldCheck className="h-3 w-3 text-green-600" />
                                                </div>
                                                <span className="text-sm font-medium">
                                                    {order.qc_mechanic_id
                                                        ? getEmployeeName(order.qc_mechanic_id)
                                                        : <span className="text-muted-foreground italic font-normal">Ausstehend</span>
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>

                            {/* History Tile (Matching Design) */}
                            <div className="mt-4">
                                <div
                                    onClick={() => setIsHistoryModalOpen(true)}
                                    className="rounded-xl border border-border/60 bg-card overflow-hidden cursor-pointer hover:bg-muted/30 transition-colors"
                                >
                                    <div className="px-5 py-3.5 flex items-center justify-between group">
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-7 w-7 rounded-lg bg-muted/80 flex items-center justify-center">
                                                <History className="h-3.5 w-3.5 text-muted-foreground" />
                                            </div>
                                            <span className="text-sm font-semibold">Auftrags-Verlauf</span>
                                        </div>
                                        <ChevronDown className="-rotate-90 h-4 w-4 text-muted-foreground transition-transform duration-200" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>



                    {/* ── Danger Zone ───────────────────────────────────────── */}
                    {(userRole === 'admin' || userRole === 'owner') && (
                        <div className="mt-4 pt-6 border-t border-dashed border-muted-foreground/15">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <p className="text-xs text-muted-foreground/60 uppercase tracking-wider font-medium">Gefahrenzone</p>
                                    <p className="text-sm text-muted-foreground">Auftrag in den Papierkorb verschieben</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5 gap-2"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Löschen
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
                <Dialog open={isCustomerEditDialogOpen} onOpenChange={setIsCustomerEditDialogOpen}>
                    <DialogContent aria-describedby={undefined}>
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
                    <DialogContent aria-describedby={undefined}>
                        <DialogHeader>
                            <DialogTitle>Fahrraddaten bearbeiten</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Marke</Label>
                                    <Input
                                        value={editBikeBrand}
                                        onChange={e => setEditBikeBrand(e.target.value)}
                                        placeholder="Marke eingeben"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Modell</Label>
                                    <Input
                                        value={editBikeModel}
                                        onChange={e => setEditBikeModel(e.target.value)}
                                        placeholder="Modell eingeben"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Farbe</Label>
                                    <Input
                                        value={editBikeColor}
                                        onChange={e => setEditBikeColor(e.target.value)}
                                        placeholder="Farbe eingeben"
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




                <Dialog open={isPriceEditDialogOpen} onOpenChange={setIsPriceEditDialogOpen}>
                    <DialogContent aria-describedby={undefined}>
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
                                    placeholder="0,00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tatsächlicher Preis (€)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={editFinalPrice}
                                    onChange={e => setEditFinalPrice(e.target.value)}
                                    placeholder="0,00"
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

                <Dialog open={isInternalNoteEditDialogOpen} onOpenChange={(open) => {
                    if (!open) setEditInternalNote(order?.internal_note || "")
                    setIsInternalNoteEditDialogOpen(open)
                }}>
                    <DialogContent aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
                        <DialogHeader>
                            <div className="flex items-center justify-between">
                                <DialogTitle>Interne Notiz bearbeiten</DialogTitle>
                                {editInternalNote !== (order?.internal_note || "") && (
                                    <span className="text-[10px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full mr-6">
                                        Ungespeicherte Änderungen
                                    </span>
                                )}
                            </div>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="internal-note" className="mb-2 block">Notiz</Label>
                            <Textarea
                                id="internal-note"
                                ref={textareaRef}
                                value={editInternalNote}
                                onChange={(e) => setEditInternalNote(e.target.value)}
                                className="min-h-[150px]"
                                placeholder="Interne Notizen hier eingeben..."
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => {
                                setEditInternalNote(order?.internal_note || "")
                                setIsInternalNoteEditDialogOpen(false)
                            }}>Abbrechen</Button>
                            <Button
                                onClick={() => handleSaveInternalNotesData()}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>


                {/* Dialog for Leasing Pickup Code (Abholcode) */}
                <Dialog open={isLeasingDialogOpen} onOpenChange={setIsLeasingDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Abholcode bestätigen</DialogTitle>
                            <DialogDescription>
                                Bitte überprüfen Sie den Abholcode für dieses Leasing-Rad ({order?.leasing_provider}).
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {order?.inspection_code && (
                                <div className="p-3 bg-muted/50 rounded-md border border-border/50">
                                    <span className="text-xs text-muted-foreground block mb-1">Inspektions-Code (UVV)</span>
                                    <span className="font-mono font-medium">{order.inspection_code}</span>
                                </div>
                            )}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="leasing-code-dialog-pickup">Abholcode</Label>
                                    <Input
                                        id="leasing-code-dialog-pickup"
                                        value={leasingCodeInput}
                                        onChange={(e) => setLeasingCodeInput(e.target.value)}
                                        placeholder="Abholcode eingeben"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="leasing-code-dialog-leasing">Leasing Code</Label>
                                    <Input
                                        id="leasing-code-dialog-leasing"
                                        value={dialogLeasingCode}
                                        onChange={(e) => setDialogLeasingCode(e.target.value)}
                                        placeholder="Leasing Code eingeben"
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsLeasingDialogOpen(false)}>
                                Abbrechen
                            </Button>
                            <Button
                                onClick={() => handleSaveLeasingCode()}
                                disabled={(!leasingCodeInput.trim() && !dialogLeasingCode.trim()) || saving}
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

                {/* Dialog for Editing Leasing Data */}
                <Dialog open={isLeasingEditDialogOpen} onOpenChange={setIsLeasingEditDialogOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Leasing-Daten bearbeiten</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-provider">Anbieter</Label>
                                {/* Assuming text input for now as provider list might be large or dynamic, 
                                but ideally should use Select from existing providers if possible. 
                                Keeping it simple text for edit flexibility as per request. */}
                                <Input
                                    id="edit-provider"
                                    value={editLeasingProvider}
                                    onChange={e => setEditLeasingProvider(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-contract">Vertrags-Nr.</Label>
                                <Input
                                    id="edit-contract"
                                    value={editContractId}
                                    onChange={e => setEditContractId(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-portal-email">Portal E-Mail</Label>
                                <Input
                                    id="edit-portal-email"
                                    value={editLeasingPortalEmail}
                                    onChange={e => setEditLeasingPortalEmail(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-service-package">Service Paket</Label>
                                    <Input
                                        id="edit-service-package"
                                        value={editServicePackage}
                                        onChange={e => setEditServicePackage(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-inspection-code">Insp.-Code</Label>
                                    <Input
                                        id="edit-inspection-code"
                                        value={editInspectionCode}
                                        onChange={e => setEditInspectionCode(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-pickup-code">Abholcode</Label>
                                <Input
                                    id="edit-pickup-code"
                                    value={editPickupCode}
                                    onChange={e => setEditPickupCode(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsLeasingEditDialogOpen(false)}>
                                Abbrechen
                            </Button>
                            <Button
                                onClick={() => handleSaveLeasingData()}
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Speichern
                                    </>
                                ) : (
                                    'Speichern'
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
                    triggerAction={assignmentType === 'add_mechanic' ? "Mechaniker zuweisen" : "QC Mitarbeiter zuweisen"}
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


            </DashboardLayout>
            <AlertDialog open={showAbholbereitConfirm} onOpenChange={setShowAbholbereitConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Status auf "Abholbereit" setzen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Wenn Sie den Status auf "Abholbereit" setzen, wird der Kunde automatisch per E-Mail darüber informiert, dass sein Fahrrad abholbereit ist.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingStatusUpdate(null)}>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingStatusUpdate) {
                                    handleStatusChange(pendingStatusUpdate.status, pendingStatusUpdate.actor)
                                    setPendingStatusUpdate(null)
                                }
                                setShowAbholbereitConfirm(false)
                            }}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            Bestätigen & E-Mail senden
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showRevertConfirm} onOpenChange={setShowRevertConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Status wirklich zurücksetzen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Der Kunde wurde bereits darüber informiert, dass sein Fahrrad abholbereit ist. Wenn Sie den Status zurücksetzen, wird keine automatische E-Mail versendet, aber der Kunde geht bereits davon aus, sein Rad abholen zu können.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingStatusUpdate(null)}>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingStatusUpdate) {
                                    handleStatusChange(pendingStatusUpdate.status, pendingStatusUpdate.actor)
                                    setPendingStatusUpdate(null)
                                }
                                setShowRevertConfirm(false)
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Trotzdem zurücksetzen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showOrderTypeConfirm} onOpenChange={setShowOrderTypeConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Zu Standard wechseln?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Achtung: Alle eingetragenen Leasing-Daten dieses Auftrags (Anbieter, Vertrags-ID, Codes etc.) werden dabei unwiderruflich gelöscht.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setShowOrderTypeConfirm(false)
                            setPendingOrderTypeUpdate(null)
                        }}>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingOrderTypeUpdate !== null) {
                                    handleOrderTypeUpdate(pendingOrderTypeUpdate)
                                }
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Leasing-Daten löschen & wechseln
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="px-6 py-4 border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <History className="h-5 w-5 text-primary" />
                            Auftrags-Verlauf
                        </DialogTitle>
                        <DialogDescription>
                            Detaillierte Historie aller Änderungen und Ereignisse für diesen Auftrag.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-1 px-6 py-4 overflow-y-auto">
                        <div className="pr-4">
                            <OrderHistory history={order?.history || []} />
                        </div>
                    </ScrollArea>
                    <div className="px-6 py-4 border-t bg-muted/30 flex justify-end">
                        <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>
                            Schließen
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </PageTransition >
    )
}