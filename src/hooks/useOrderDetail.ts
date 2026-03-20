import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useEmployee } from '@/contexts/EmployeeContext'
import { logOrderEvent } from '@/lib/history'
import { toastSuccess, toastError } from '@/lib/toast-utils'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { isUuid } from '@/lib/utils'
import type { WorkshopOrder, WorkshopTag } from '@/types/index'
import type { ChecklistTemplate, ChecklistItem } from '@/types/checklist'
import { STATUS_COLORS } from '@/lib/constants'
import { Clock, Pause, Play, ShieldCheck, PackageCheck, Check, Archive } from 'lucide-react'

// Re-export these for JSX usage in the page if needed, but primarily used here
export const STATUS_FLOW = [
    { value: 'eingegangen', label: 'Eingegangen', icon: Clock, color: STATUS_COLORS.eingegangen },
    { value: 'warten_auf_teile', label: 'Warten auf Teile', icon: Pause, color: STATUS_COLORS.warten_auf_teile },
    { value: 'in_bearbeitung', label: 'In Bearbeitung', icon: Play, color: STATUS_COLORS.in_bearbeitung },
    { value: 'kontrolle_offen', label: 'Kontrolle offen', icon: ShieldCheck, color: STATUS_COLORS.kontrolle_offen },
    { value: 'abholbereit', label: 'Abholbereit', icon: PackageCheck, color: STATUS_COLORS.abholbereit },
]

export const LEASING_STATUS = { value: 'abgeholt', label: 'Abgeholt', icon: Check, color: STATUS_COLORS.abgeholt }
export const COMPLETED_STATUS = { value: 'abgeschlossen', label: 'Abgeschlossen', icon: Archive, color: STATUS_COLORS.abgeschlossen }

// Use WorkshopOrder as the Order type throughout this hook
type Order = WorkshopOrder

// Discriminated union for pending shared-mode actions
type PendingAction =
    | { type: 'status'; payload: string }
    | { type: 'toggle_checklist'; payload: { index: number; checked: boolean } }
    | { type: 'save_notes_data' | 'save_leasing' | 'save_price_data' | 'save_customer' | 'save_bike' | 'save_customer_note'; payload?: undefined }

export function useOrderDetail() {
    const { orderId } = useParams<{ orderId: string }>()
    const navigate = useNavigate()
    const { workshopId, user, userRole } = useAuth()
    const location = useLocation()
    const returnPath = location.state?.from || '/dashboard'

    const [order, setOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
    const [workshopTags, setWorkshopTags] = useState<WorkshopTag[]>([])
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

    // Shared Mode Interception
    const { isSharedMode, employees, activeEmployee } = useEmployee()
    const [showEmployeeSelect, setShowEmployeeSelect] = useState(false)
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

    const [showExitDialog, setShowExitDialog] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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

    // Internal Note Edit State
    const [isInternalNoteEditDialogOpen, setIsInternalNoteEditDialogOpen] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const [editInternalNote, setEditInternalNote] = useState("")

    const [isPriceEditDialogOpen, setIsPriceEditDialogOpen] = useState(false)
    const [editEstimatedPrice, setEditEstimatedPrice] = useState("")
    const [editFinalPrice, setEditFinalPrice] = useState("")

    // ── useEffect: textarea focus ────────────────────────────────────────────
    useEffect(() => {
        if (isInternalNoteEditDialogOpen) {
            const timer = setTimeout(() => {
                const el = textareaRef.current
                if (el) {
                    el.focus()
                    const val = el.value
                    el.value = ''
                    el.value = val
                    el.setSelectionRange(val.length, val.length)
                }
            }, 150)
            return () => clearTimeout(timer)
        }
    }, [isInternalNoteEditDialogOpen])

    // ── useEffect: fetch order + realtime subscription ───────────────────────
    useEffect(() => {
        const fetchOrder = async () => {
            if (!workshopId || !orderId) return

            setLoading(true)

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

                setEditFinalPrice(orderResult.data.final_price?.toString() || "")
                setEditEstimatedPrice(orderResult.data.estimated_price?.toString() || "")
                setLeasingCodeInput(orderResult.data.leasing_code || "")

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
                        if (!currentOrder) return null
                        return {
                            ...currentOrder,
                            status: newOrder.status,
                            checklist: newOrder.checklist,
                            notes: newOrder.notes,
                            leasing_code: newOrder.leasing_code,
                            final_price: newOrder.final_price,
                            tags: newOrder.tags
                        } as Order
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [workshopId, orderId])

    // ── Helper ───────────────────────────────────────────────────────────────
    const getEmployeeName = (id: string) => {
        if (!employees) return "Lade..."
        return employees.find(e => e.id === id)?.name || "Unbekannt"
    }

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleAssignment = async (employeeId: string) => {
        if (!order) return

        let updateData: Partial<Pick<Order, 'mechanic_ids' | 'qc_mechanic_id'>> = {}

        if (assignmentType === 'add_mechanic') {
            const currentIds = order.mechanic_ids || []
            if (!currentIds.includes(employeeId)) {
                updateData = { mechanic_ids: [...currentIds, employeeId] }
            } else {
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
            setOrder(prev => prev ? ({ ...prev, ...updateData }) : null)
            setIsAssignmentModalOpen(false)
            toastSuccess("Zuweisung aktualisiert", `Mitarbeiter wurde erfolgreich zugewiesen.`)

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

    const handleDeleteOrder = async () => {
        if (!order) return

        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'trash', trash_date: new Date().toISOString() })
                .eq('id', order.id)

            if (error) throw error

            if (document.startViewTransition) {
                document.startViewTransition(() => {
                    navigate(returnPath)
                })
            } else {
                navigate(returnPath)
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Der Auftrag konnte nicht gelöscht werden.'
            toastError('Fehler beim Löschen', message)
        }
    }

    const handleSaveDueDate = async (date: Date | undefined) => {
        if (!order) return

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

        if (isSharedMode && !actorOverride) {
            setPendingAction({ type: 'status', payload: newStatus })
            setShowEmployeeSelect(true)
            return
        }

        if (order.is_leasing && newStatus === LEASING_STATUS.value) {
            setLeasingCodeInput(order.pickup_code || "")
            setDialogLeasingCode(order.leasing_code || "")
            setIsLeasingDialogOpen(true)
            return
        }

        if (newStatus === 'abholbereit' && !showAbholbereitConfirm) {
            setPendingStatusUpdate({ status: newStatus, actor: actorOverride })
            setShowAbholbereitConfirm(true)
            return
        }

        const isReversionFromFinalStatus = (order.status === 'abholbereit' || order.status === 'abgeschlossen') &&
            newStatus !== 'abholbereit' && newStatus !== 'abgeschlossen'

        if (isReversionFromFinalStatus && !showRevertConfirm) {
            setPendingStatusUpdate({ status: newStatus, actor: actorOverride })
            setShowRevertConfirm(true)
            return
        }

        setSaving(true)

        try {
            const updates: Partial<Pick<Order, 'status' | 'qc_mechanic_id' | 'mechanic_ids'>> = { status: newStatus }

            if (newStatus === 'kontrolle_offen') {
                const actingEmployeeId = actorOverride?.id || activeEmployee?.id
                if (actingEmployeeId) {
                    updates.qc_mechanic_id = actingEmployeeId

                    const currentMechanics = order.mechanic_ids || []
                    if (!currentMechanics.includes(actingEmployeeId)) {
                        updates.mechanic_ids = [...currentMechanics, actingEmployeeId]
                    }
                }
            }

            const { error } = await supabase
                .from('orders')
                .update(updates)
                .eq('id', order.id)

            if (error) throw error

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

            setOrder(prev => prev ? ({
                ...prev,
                ...updates,
                history: [event, ...(prev.history || [])]
            }) : null)

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Der Status konnte nicht aktualisiert werden.'
            toastError('Fehler beim Status-Update', message)
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

        const leasingUpdates: Partial<Pick<Order, 'pickup_code' | 'leasing_code' | 'status'>> = {
            pickup_code: leasingCodeInput,
            leasing_code: dialogLeasingCode
        }

        if (isLeasingDialogOpen) {
            leasingUpdates.status = LEASING_STATUS.value
        }

        const { error } = await supabase
            .from('orders')
            .update(leasingUpdates)
            .eq('id', order.id)

        if (error) {
            toastError('Fehler beim Speichern', error.message || 'Der Abhol-Code konnte nicht gespeichert werden.')
        } else {
            const updatedOrder = {
                ...order,
                ...leasingUpdates,
            }

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
            setPendingAction({ type: 'save_notes_data' })
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

        const itemsToUpdate: Partial<Pick<Order, 'estimated_price' | 'final_price'>> = {}
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

        const updates: Partial<Pick<Order, 'is_leasing' | 'leasing_provider' | 'leasing_portal_email' | 'contract_id' | 'service_package' | 'inspection_code' | 'pickup_code' | 'leasing_code'>> = { is_leasing: isLeasing }

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

        const currentTemplateIds = Array.from(new Set((order.checklist || [])
            .filter(i => i.template_id)
            .map(i => i.template_id as string)))

        const templateIdsToAdd = selectedDetailTemplateIds.filter(id => !currentTemplateIds.includes(id))

        const templateIdsToRemove = confirmedRemovalIds.length > 0
            ? confirmedRemovalIds
            : currentTemplateIds.filter(id => !selectedDetailTemplateIds.includes(id))

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

        let newChecklist = (order.checklist || []).filter(item => !templateIdsToRemove.includes(item.template_id || ''))

        templateIdsToAdd.forEach(templateId => {
            const template = templates.find(t => t.id === templateId)
            if (template?.items && Array.isArray(template.items)) {
                const templateItems = template.items.map((item) => ({
                    text: item.text,
                    completed: false,
                    type: 'service' as const,
                    template_id: template.id,
                    template_name: template.name
                }))
                newChecklist = [...newChecklist, ...templateItems]
            }
        })

        const { error } = await supabase
            .from('orders')
            .update({ checklist: newChecklist as ChecklistItem[] })
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
            .update({ checklist: newChecklist as ChecklistItem[] })
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
            .update({ checklist: newChecklist as ChecklistItem[] })
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
            .update({ checklist: newChecklist as ChecklistItem[] })
            .eq('id', order.id)

        if (error) {
            setOrder({ ...order, checklist: order.checklist })
            toastError('Fehler', 'Die Checkliste konnte nicht gespeichert werden.')
        } else {
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

        switch (pendingAction.type) {
            case 'status':
                handleStatusChange(pendingAction.payload, actor)
                break
            case 'save_leasing':
                handleSaveLeasingCode(actor)
                break
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

        const normalizedInput = tagInput.trim().toLowerCase()
        let targetTag = workshopTags.find(t => t.name.toLowerCase() === normalizedInput)

        setSaving(true)
        try {
            if (!targetTag) {
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

            const currentTags = order.tags || []
            if (targetTag && !currentTags.includes(targetTag.id)) {
                const newTags = [...currentTags, targetTag.id]
                setOrder({ ...order, tags: newTags })
                const { error } = await supabase.from('orders').update({ tags: newTags }).eq('id', order.id)
                if (error) throw error
            }

            setTagInput("")
        } catch (error: unknown) {
            toastError("Fehler", "Tag konnte nicht verarbeitet werden.")
            console.error(error)
        } finally {
            setSaving(false)
        }
    }

    return {
        // Core state
        order,
        loading,
        saving,
        templates,
        workshopTags,

        // Checklist / template state
        selectedDetailTemplateIds,
        setSelectedDetailTemplateIds,
        isTemplateModalOpen,
        setIsTemplateModalOpen,
        templatesToRemove,
        showRemovalWarning,
        setShowRemovalWarning,
        isCustomItemModalOpen,
        setIsCustomItemModalOpen,
        customItemText,
        setCustomItemText,

        // Tags
        tagInput,
        setTagInput,

        // Leasing dialog state
        isLeasingDialogOpen,
        setIsLeasingDialogOpen,
        leasingCodeInput,
        setLeasingCodeInput,
        dialogLeasingCode,
        setDialogLeasingCode,

        // Leasing edit fields
        isLeasingEditDialogOpen,
        setIsLeasingEditDialogOpen,
        editLeasingProvider,
        setEditLeasingProvider,
        editLeasingPortalEmail,
        setEditLeasingPortalEmail,
        editContractId,
        setEditContractId,
        editServicePackage,
        setEditServicePackage,
        editInspectionCode,
        setEditInspectionCode,
        editPickupCode,
        setEditPickupCode,

        // Assignment state
        isAssignmentModalOpen,
        setIsAssignmentModalOpen,
        assignmentType,
        setAssignmentType,

        // Checkout / confirm dialogs
        showAbholbereitConfirm,
        setShowAbholbereitConfirm,
        showRevertConfirm,
        setShowRevertConfirm,
        showOrderTypeConfirm,
        setShowOrderTypeConfirm,
        pendingStatusUpdate,
        setPendingStatusUpdate,
        pendingOrderTypeUpdate,
        setPendingOrderTypeUpdate,

        // Collapsible states
        isKundenwunschOpen,
        setIsKundenwunschOpen,
        isChecklistOpen,
        setIsChecklistOpen,
        isInternalNotesOpen,
        setIsInternalNotesOpen,
        isCustomerDataOpen,
        setIsCustomerDataOpen,
        isBikeDataOpen,
        setIsBikeDataOpen,
        isPriceOpen,
        setIsPriceOpen,
        isLeasingOpen,
        setIsLeasingOpen,
        isAssignmentsOpen,
        setIsAssignmentsOpen,
        isHistoryModalOpen,
        setIsHistoryModalOpen,

        // Notes
        internalNote,
        setInternalNote,
        customerNote,
        setCustomerNote,

        // Shared mode / employee selection
        showEmployeeSelect,
        setShowEmployeeSelect,
        pendingAction,
        setPendingAction,

        // Other dialogs
        showExitDialog,
        setShowExitDialog,
        showDeleteConfirm,
        setShowDeleteConfirm,

        // Customer edit
        isCustomerEditDialogOpen,
        setIsCustomerEditDialogOpen,
        editCustomerName,
        setEditCustomerName,
        editCustomerEmail,
        setEditCustomerEmail,
        editCustomerPhone,
        setEditCustomerPhone,

        // Bike edit
        isBikeEditDialogOpen,
        setIsBikeEditDialogOpen,
        editBikeBrand,
        setEditBikeBrand,
        editBikeModel,
        setEditBikeModel,
        editBikeType,
        setEditBikeType,
        editBikeColor,
        setEditBikeColor,

        // Internal note edit
        isInternalNoteEditDialogOpen,
        setIsInternalNoteEditDialogOpen,
        textareaRef,
        editInternalNote,
        setEditInternalNote,

        // Price edit
        isPriceEditDialogOpen,
        setIsPriceEditDialogOpen,
        editEstimatedPrice,
        setEditEstimatedPrice,
        editFinalPrice,
        setEditFinalPrice,

        // Helper
        getEmployeeName,

        // Handlers
        handleAssignment,
        handleRemoveMechanic,
        handleDeleteOrder,
        handleSaveDueDate,
        handleSaveCustomerData,
        handleSaveBikeData,
        handleStatusChange,
        handleSaveLeasingCode,
        handleSaveLeasingData,
        handleSaveInternalNotesData,
        handleSavePriceData,
        handleOrderTypeUpdate,
        handleUpdateTemplates,
        handleAddCustomItem,
        handleRemoveChecklistItem,
        handleToggleChecklist,
        handleEmployeeSelected,
        handleToggleTag,
        handleRemoveTag,
        handleCreateAndAddTag,

        // Context values passed through
        user,
        userRole,
        workshopId,
        isReadOnly,
        isSharedMode,
        employees,
        activeEmployee,
        returnPath,
        navigate,
    }
}
