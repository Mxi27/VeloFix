import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import {
    AlertCircle,
    Archive,
    ArrowLeft,
    Bike,
    CalendarIcon,
    CheckCircle2,
    ChevronRight,
    Clock,
    Copy,
    CreditCard,
    Euro,
    Loader2,
    Mail,
    NotebookPen,
    PackageCheck,
    Pause,
    Pencil,
    Phone,
    Play,
    Plus,
    ShieldCheck,
    Trash2,
    User,
    Wrench,
    X,
    type LucideIcon,
} from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"

import { DashboardLayout } from "@/layouts/DashboardLayout"
import { LoadingScreen } from "@/components/LoadingScreen"
import { PageTransition } from "@/components/PageTransition"
import { OrderHistory } from "@/components/OrderHistory"
import { EmployeeSelectionModal } from "@/components/EmployeeSelectionModal"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { supabase } from "@/lib/supabase"
import { logOrderEvent, type OrderHistoryEvent } from "@/lib/history"
import { BIKE_TYPE_LABELS, STATUS_COLORS } from "@/lib/constants"
import { toastError, toastSuccess } from "@/lib/toast-utils"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

interface ChecklistItem {
    text: string
    completed: boolean
    type?: "acceptance" | "service"
    completed_by?: string | null
    completed_at?: string | null
}

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
    frame_number?: string | null
    frame_size?: string | null
    is_leasing: boolean
    status: string
    created_at: string
    created_date?: string | null
    estimated_price: number | null
    final_price: number | null
    checklist: ChecklistItem[] | null
    internal_note: string | null
    customer_note: string | null
    contract_id: string | null
    service_package: string | null
    inspection_code: string | null
    pickup_code: string | null
    leasing_provider: string | null
    leasing_portal_email: string | null
    leasing_code: string | null
    history: OrderHistoryEvent[] | null
    tags: string[] | null
    mechanic_ids: string[] | null
    qc_mechanic_id: string | null
    due_date: string | null
}

interface ChecklistTemplate {
    id: string
    name: string
    items: unknown[] | null
}

interface WorkshopTag {
    id: string
    name: string
    color: string
}

interface Actor {
    id: string
    name: string
}

type PendingAction =
    | { type: "status"; status: string }
    | { type: "toggle_checklist"; index: number; checked: boolean }
    | { type: "save_customer" }
    | { type: "save_bike" }
    | { type: "save_customer_note" }
    | { type: "save_internal_note" }
    | { type: "save_pricing" }
    | { type: "save_leasing_pickup" }
    | { type: "save_leasing_info" }

type AssignmentMode = "add_mechanic" | "qc"

interface StatusStep {
    value: string
    label: string
    icon: LucideIcon
    color: string
    helper: string
}

const STATUS_FLOW: StatusStep[] = [
    { value: "eingegangen", label: "Eingegangen", icon: Clock, color: STATUS_COLORS.eingegangen, helper: "Neu angelegt" },
    { value: "warten_auf_teile", label: "Warten auf Teile", icon: Pause, color: STATUS_COLORS.warten_auf_teile, helper: "Material fehlt" },
    { value: "in_bearbeitung", label: "In Bearbeitung", icon: Play, color: STATUS_COLORS.in_bearbeitung, helper: "Aktive Reparatur" },
    { value: "kontrolle_offen", label: "Kontrolle offen", icon: ShieldCheck, color: STATUS_COLORS.kontrolle_offen, helper: "QC noetig" },
    { value: "abholbereit", label: "Abholbereit", icon: PackageCheck, color: STATUS_COLORS.abholbereit, helper: "Kunde kann kommen" },
]

const LEASING_STATUS: StatusStep = {
    value: "abgeholt",
    label: "Abgeholt",
    icon: CheckCircle2,
    color: STATUS_COLORS.abgeholt,
    helper: "Leasing Rueckgabe",
}

const COMPLETED_STATUS: StatusStep = {
    value: "abgeschlossen",
    label: "Abgeschlossen",
    icon: Archive,
    color: STATUS_COLORS.abgeschlossen,
    helper: "Archiviert",
}

const TAG_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#64748b"]

function normalizeChecklist(raw: unknown): ChecklistItem[] {
    if (!Array.isArray(raw)) return []

    const normalized: Array<ChecklistItem | null> = raw.map((item) => {
            if (typeof item === "string") {
                return { text: item, completed: false, type: "service" as const }
            }

            if (!item || typeof item !== "object") return null
            const value = item as Partial<ChecklistItem> & { text?: unknown; completed?: unknown }

            return {
                text: typeof value.text === "string" ? value.text : "",
                completed: Boolean(value.completed),
                type: value.type === "acceptance" ? "acceptance" : "service",
                completed_by: typeof value.completed_by === "string" ? value.completed_by : null,
                completed_at: typeof value.completed_at === "string" ? value.completed_at : null,
            }
        })

    return normalized.filter((item): item is ChecklistItem => Boolean(item?.text))
}

function normalizeHistory(raw: unknown): OrderHistoryEvent[] {
    if (!Array.isArray(raw)) return []
    return raw.filter((item): item is OrderHistoryEvent => Boolean(item && typeof item === "object" && "id" in item && "timestamp" in item))
}

function normalizeOrder(raw: Record<string, unknown>): Order {
    return {
        ...raw,
        id: String(raw.id ?? ""),
        order_number: String(raw.order_number ?? ""),
        customer_name: String(raw.customer_name ?? ""),
        customer_email: typeof raw.customer_email === "string" ? raw.customer_email : null,
        customer_phone: typeof raw.customer_phone === "string" ? raw.customer_phone : null,
        bike_brand: typeof raw.bike_brand === "string" ? raw.bike_brand : null,
        bike_model: typeof raw.bike_model === "string" ? raw.bike_model : null,
        bike_color: typeof raw.bike_color === "string" ? raw.bike_color : null,
        bike_type: typeof raw.bike_type === "string" ? raw.bike_type : null,
        frame_number: typeof raw.frame_number === "string" ? raw.frame_number : null,
        frame_size: typeof raw.frame_size === "string" ? raw.frame_size : null,
        is_leasing: Boolean(raw.is_leasing),
        status: String(raw.status ?? "eingegangen"),
        created_at: typeof raw.created_at === "string" ? raw.created_at : typeof raw.created_date === "string" ? raw.created_date : new Date().toISOString(),
        created_date: typeof raw.created_date === "string" ? raw.created_date : null,
        estimated_price: typeof raw.estimated_price === "number" ? raw.estimated_price : null,
        final_price: typeof raw.final_price === "number" ? raw.final_price : null,
        checklist: normalizeChecklist(raw.checklist),
        internal_note: typeof raw.internal_note === "string" ? raw.internal_note : null,
        customer_note: typeof raw.customer_note === "string" ? raw.customer_note : null,
        contract_id: typeof raw.contract_id === "string" ? raw.contract_id : null,
        service_package: typeof raw.service_package === "string" ? raw.service_package : null,
        inspection_code: typeof raw.inspection_code === "string" ? raw.inspection_code : null,
        pickup_code: typeof raw.pickup_code === "string" ? raw.pickup_code : null,
        leasing_provider: typeof raw.leasing_provider === "string" ? raw.leasing_provider : null,
        leasing_portal_email: typeof raw.leasing_portal_email === "string" ? raw.leasing_portal_email : null,
        leasing_code: typeof raw.leasing_code === "string" ? raw.leasing_code : null,
        history: normalizeHistory(raw.history),
        tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === "string") : [],
        mechanic_ids: Array.isArray(raw.mechanic_ids) ? raw.mechanic_ids.filter((tag): tag is string => typeof tag === "string") : [],
        qc_mechanic_id: typeof raw.qc_mechanic_id === "string" ? raw.qc_mechanic_id : null,
        due_date: typeof raw.due_date === "string" ? raw.due_date : null,
    }
}

function formatCurrency(value: number | null) {
    if (value == null) return "Offen"
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value)
}

function formatDateLabel(value: string | null) {
    if (!value) return "Kein Termin"
    return format(new Date(value), "dd. MMM yyyy", { locale: de })
}

function SurfaceCard({ children, className }: { children: ReactNode; className?: string }) {
    return <section className={cn("rounded-[28px] border border-border/50 bg-card/90 shadow-[0_18px_60px_-38px_rgba(0,0,0,0.85)] backdrop-blur-xl", className)}>{children}</section>
}

function SectionHeader({ icon: Icon, title, subtitle, action }: { icon: LucideIcon; title: string; subtitle?: string; action?: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 px-5 py-5">
            <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10">
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
                    {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
                </div>
            </div>
            {action}
        </div>
    )
}

function DetailRow({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
    return (
        <div className="rounded-2xl border border-border/40 bg-background/50 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
            <div className={cn("mt-1 text-sm text-foreground", mono && "font-mono text-[13px]")}>{value}</div>
        </div>
    )
}

export default function OrderDetailPage() {
    const { orderId } = useParams<{ orderId: string }>()
    const navigate = useNavigate()
    const location = useLocation()
    const { workshopId, user, userRole } = useAuth()
    const { activeEmployee, employees, isSharedMode } = useEmployee()

    const returnPath = (location.state as { from?: string } | null)?.from || "/dashboard"
    const isReadOnly = userRole === "read"

    const [order, setOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
    const [workshopTags, setWorkshopTags] = useState<WorkshopTag[]>([])
    const [selectedTemplateId, setSelectedTemplateId] = useState("")
    const [tagInput, setTagInput] = useState("")

    const [showEmployeeSelect, setShowEmployeeSelect] = useState(false)
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false)
    const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>("add_mechanic")

    const [showTemplateConfirm, setShowTemplateConfirm] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showAbholbereitConfirm, setShowAbholbereitConfirm] = useState(false)
    const [showRevertConfirm, setShowRevertConfirm] = useState(false)
    const [showOrderTypeConfirm, setShowOrderTypeConfirm] = useState(false)
    const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{ status: string; actor?: Actor } | null>(null)
    const [pendingOrderTypeUpdate, setPendingOrderTypeUpdate] = useState<boolean | null>(null)

    const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
    const [isBikeDialogOpen, setIsBikeDialogOpen] = useState(false)
    const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false)
    const [isLeasingDialogOpen, setIsLeasingDialogOpen] = useState(false)
    const [isLeasingPickupDialogOpen, setIsLeasingPickupDialogOpen] = useState(false)

    const [editCustomerName, setEditCustomerName] = useState("")
    const [editCustomerEmail, setEditCustomerEmail] = useState("")
    const [editCustomerPhone, setEditCustomerPhone] = useState("")
    const [editBikeBrand, setEditBikeBrand] = useState("")
    const [editBikeModel, setEditBikeModel] = useState("")
    const [editBikeType, setEditBikeType] = useState("")
    const [editBikeColor, setEditBikeColor] = useState("")
    const [editFrameNumber, setEditFrameNumber] = useState("")
    const [editFrameSize, setEditFrameSize] = useState("")
    const [editCustomerNote, setEditCustomerNote] = useState("")
    const [editInternalNote, setEditInternalNote] = useState("")
    const [editEstimatedPrice, setEditEstimatedPrice] = useState("")
    const [editFinalPrice, setEditFinalPrice] = useState("")
    const [editLeasingProvider, setEditLeasingProvider] = useState("")
    const [editLeasingPortalEmail, setEditLeasingPortalEmail] = useState("")
    const [editContractId, setEditContractId] = useState("")
    const [editServicePackage, setEditServicePackage] = useState("")
    const [editInspectionCode, setEditInspectionCode] = useState("")
    const [editPickupCode, setEditPickupCode] = useState("")
    const [editLeasingCode, setEditLeasingCode] = useState("")

    const syncDraftsFromOrder = (nextOrder: Order) => {
        setEditCustomerName(nextOrder.customer_name)
        setEditCustomerEmail(nextOrder.customer_email || "")
        setEditCustomerPhone(nextOrder.customer_phone || "")
        setEditBikeBrand(nextOrder.bike_brand || "")
        setEditBikeModel(nextOrder.bike_model || "")
        setEditBikeType(nextOrder.bike_type || "")
        setEditBikeColor(nextOrder.bike_color || "")
        setEditFrameNumber(nextOrder.frame_number || "")
        setEditFrameSize(nextOrder.frame_size || "")
        setEditCustomerNote(nextOrder.customer_note || "")
        setEditInternalNote(nextOrder.internal_note || "")
        setEditEstimatedPrice(nextOrder.estimated_price != null ? String(nextOrder.estimated_price) : "")
        setEditFinalPrice(nextOrder.final_price != null ? String(nextOrder.final_price) : "")
        setEditLeasingProvider(nextOrder.leasing_provider || "")
        setEditLeasingPortalEmail(nextOrder.leasing_portal_email || "")
        setEditContractId(nextOrder.contract_id || "")
        setEditServicePackage(nextOrder.service_package || "")
        setEditInspectionCode(nextOrder.inspection_code || "")
        setEditPickupCode(nextOrder.pickup_code || "")
        setEditLeasingCode(nextOrder.leasing_code || "")
    }

    useEffect(() => {
        if (!workshopId || !orderId) {
            setLoading(false)
            return
        }

        let active = true

        const fetchOrder = async () => {
            setLoading(true)
            const [orderResult, templatesResult, tagsResult] = await Promise.all([
                supabase.from("orders").select("*").eq("id", orderId).eq("workshop_id", workshopId).single(),
                supabase.from("checklist_templates").select("*").eq("workshop_id", workshopId).order("name"),
                supabase.from("workshop_tags").select("*").eq("workshop_id", workshopId).order("name"),
            ])

            if (!active) return

            if (orderResult.error) {
                console.error(orderResult.error)
                setOrder(null)
            } else {
                const nextOrder = normalizeOrder(orderResult.data as Record<string, unknown>)
                setOrder(nextOrder)
                syncDraftsFromOrder(nextOrder)
            }

            setTemplates((templatesResult.data || []) as ChecklistTemplate[])
            setWorkshopTags((tagsResult.data || []) as WorkshopTag[])
            setLoading(false)
        }

        fetchOrder()

        const channel = supabase
            .channel(`order_detail_${orderId}`)
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, (payload) => {
                const nextOrder = normalizeOrder(payload.new as Record<string, unknown>)
                setOrder((current) => (current ? { ...current, ...nextOrder } : nextOrder))
            })
            .subscribe()

        return () => {
            active = false
            supabase.removeChannel(channel)
        }
    }, [orderId, workshopId])

    const actorFromContext = useMemo<Actor | undefined>(() => {
        if (activeEmployee) return { id: activeEmployee.id, name: activeEmployee.name }
        if (user) return { id: user.id, name: user.user_metadata?.full_name || user.email || "User" }
        return undefined
    }, [activeEmployee, user])

    const statusSteps = useMemo(() => (order?.is_leasing ? [...STATUS_FLOW, LEASING_STATUS, COMPLETED_STATUS] : [...STATUS_FLOW, COMPLETED_STATUS]), [order])

    const selectedTags = useMemo(() => {
        if (!order?.tags?.length) return []
        return workshopTags.filter((tag) => order.tags?.includes(tag.id))
    }, [order, workshopTags])

    const checklistItems = order?.checklist || []
    const completedChecklistCount = checklistItems.filter((item) => item.completed).length
    const checklistProgress = checklistItems.length ? Math.round((completedChecklistCount / checklistItems.length) * 100) : 0
    const nextChecklistItem = checklistItems.find((item) => !item.completed)
    const activeStatus = statusSteps.find((step) => step.value === order?.status) || statusSteps[0]
    const assignedMechanics = (order?.mechanic_ids || []).map((id) => employees.find((employee) => employee.id === id)).filter(Boolean)
    const qcEmployee = employees.find((employee) => employee.id === order?.qc_mechanic_id)
    const customerNoteDirty = editCustomerNote !== (order?.customer_note || "")
    const internalNoteDirty = editInternalNote !== (order?.internal_note || "")

    const queueSharedAction = (action: PendingAction) => {
        if (!isSharedMode) return false
        setPendingAction(action)
        setShowEmployeeSelect(true)
        return true
    }

    const pushHistoryEvent = async (event: Omit<OrderHistoryEvent, "id" | "timestamp">) => {
        if (!order) return
        try {
            const savedEvent = await logOrderEvent(order.id, event, user)
            setOrder((current) => (current ? { ...current, history: [savedEvent, ...(current.history || [])] } : current))
        } catch (error) {
            console.error(error)
        }
    }

    const handleSaveDueDate = async (date: Date | undefined) => {
        if (!order) return

        const previousDate = order.due_date
        const nextDate = date ? date.toISOString() : null
        setOrder({ ...order, due_date: nextDate })

        const { error } = await supabase.from("orders").update({ due_date: nextDate }).eq("id", order.id)
        if (error) {
            setOrder({ ...order, due_date: previousDate })
            toastError("Fehler", "Der Termin konnte nicht gespeichert werden.")
            return
        }

        toastSuccess("Termin aktualisiert", date ? `Fertigstellung geplant fuer ${format(date, "dd.MM.yyyy", { locale: de })}` : "Termin entfernt")
        await pushHistoryEvent({
            type: "info",
            title: "Termin aktualisiert",
            description: nextDate ? `Faelligkeit gesetzt auf ${format(date!, "dd.MM.yyyy", { locale: de })}` : "Faelligkeit entfernt",
            actor: actorFromContext,
        })
    }

    const handleSaveCustomerData = async (actorOverride?: Actor) => {
        if (!order) return
        if (!actorOverride && queueSharedAction({ type: "save_customer" })) return

        setSaving(true)
        const updates = {
            customer_name: editCustomerName,
            customer_email: editCustomerEmail || null,
            customer_phone: editCustomerPhone || null,
        }
        const { error } = await supabase.from("orders").update(updates).eq("id", order.id)
        setSaving(false)

        if (error) {
            toastError("Fehler", "Kundendaten konnten nicht gespeichert werden.")
            return
        }

        setOrder({ ...order, ...updates })
        setIsCustomerDialogOpen(false)
        toastSuccess("Gespeichert", "Kundendaten aktualisiert.")
        await pushHistoryEvent({
            type: "info",
            title: "Kundendaten aktualisiert",
            description: "Kundendaten wurden bearbeitet.",
            actor: actorOverride || actorFromContext,
        })
    }

    const handleSaveBikeData = async (actorOverride?: Actor) => {
        if (!order) return
        if (!actorOverride && queueSharedAction({ type: "save_bike" })) return

        setSaving(true)
        const updates = {
            bike_brand: editBikeBrand || null,
            bike_model: editBikeModel || null,
            bike_type: editBikeType || null,
            bike_color: editBikeColor || null,
            frame_number: editFrameNumber || null,
            frame_size: editFrameSize || null,
        }
        const { error } = await supabase.from("orders").update(updates).eq("id", order.id)
        setSaving(false)

        if (error) {
            toastError("Fehler", "Fahrraddaten konnten nicht gespeichert werden.")
            return
        }

        setOrder({ ...order, ...updates })
        setIsBikeDialogOpen(false)
        toastSuccess("Gespeichert", "Fahrraddaten aktualisiert.")
        await pushHistoryEvent({
            type: "info",
            title: "Fahrraddaten aktualisiert",
            description: "Fahrraddaten wurden bearbeitet.",
            actor: actorOverride || actorFromContext,
        })
    }

    const handleSaveCustomerNote = async (actorOverride?: Actor) => {
        if (!order) return
        if (!actorOverride && queueSharedAction({ type: "save_customer_note" })) return

        setSaving(true)
        const updates = { customer_note: editCustomerNote || null }
        const { error } = await supabase.from("orders").update(updates).eq("id", order.id)
        setSaving(false)

        if (error) {
            toastError("Fehler", "Kundenwunsch konnte nicht gespeichert werden.")
            return
        }

        setOrder({ ...order, ...updates })
        toastSuccess("Gespeichert", "Kundenwunsch aktualisiert.")
        await pushHistoryEvent({
            type: "info",
            title: "Kundenwunsch aktualisiert",
            description: "Der sichtbare Reparaturauftrag wurde angepasst.",
            actor: actorOverride || actorFromContext,
        })
    }

    const handleSaveInternalNote = async (actorOverride?: Actor) => {
        if (!order) return
        if (!actorOverride && queueSharedAction({ type: "save_internal_note" })) return

        setSaving(true)
        const updates = { internal_note: editInternalNote || null }
        const { error } = await supabase.from("orders").update(updates).eq("id", order.id)
        setSaving(false)

        if (error) {
            toastError("Fehler", "Interne Notiz konnte nicht gespeichert werden.")
            return
        }

        setOrder({ ...order, ...updates })
        toastSuccess("Gespeichert", "Interne Notiz aktualisiert.")
        await pushHistoryEvent({
            type: "info",
            title: "Werkstattnotiz aktualisiert",
            description: "Die interne Reparaturnotiz wurde angepasst.",
            actor: actorOverride || actorFromContext,
        })
    }

    const handleSavePricing = async (actorOverride?: Actor) => {
        if (!order) return
        if (!actorOverride && queueSharedAction({ type: "save_pricing" })) return

        const estimated = editEstimatedPrice === "" ? null : Number(editEstimatedPrice)
        const final = editFinalPrice === "" ? null : Number(editFinalPrice)
        if ((estimated !== null && Number.isNaN(estimated)) || (final !== null && Number.isNaN(final))) {
            toastError("Ungueltiger Wert", "Bitte nur gueltige Zahlen eingeben.")
            return
        }

        setSaving(true)
        const updates = { estimated_price: estimated, final_price: final }
        const { error } = await supabase.from("orders").update(updates).eq("id", order.id)
        setSaving(false)

        if (error) {
            toastError("Fehler", "Preise konnten nicht gespeichert werden.")
            return
        }

        setOrder({ ...order, ...updates })
        setIsPricingDialogOpen(false)
        toastSuccess("Gespeichert", "Preise aktualisiert.")
        await pushHistoryEvent({
            type: "info",
            title: "Preise aktualisiert",
            description: "Kostenschaetzung oder Endpreis wurden geaendert.",
            actor: actorOverride || actorFromContext,
        })
    }

    const handleSaveLeasingInfo = async (actorOverride?: Actor) => {
        if (!order) return
        if (!actorOverride && queueSharedAction({ type: "save_leasing_info" })) return

        setSaving(true)
        const updates = {
            leasing_provider: editLeasingProvider || null,
            leasing_portal_email: editLeasingPortalEmail || null,
            contract_id: editContractId || null,
            service_package: editServicePackage || null,
            inspection_code: editInspectionCode || null,
            pickup_code: editPickupCode || null,
            leasing_code: editLeasingCode || null,
        }
        const { error } = await supabase.from("orders").update(updates).eq("id", order.id)
        setSaving(false)

        if (error) {
            toastError("Fehler", "Leasingdaten konnten nicht gespeichert werden.")
            return
        }

        setOrder({ ...order, ...updates })
        setIsLeasingDialogOpen(false)
        toastSuccess("Gespeichert", "Leasingdaten aktualisiert.")
        await pushHistoryEvent({
            type: "info",
            title: "Leasingdaten aktualisiert",
            description: "Anbieterdaten oder Codes wurden bearbeitet.",
            actor: actorOverride || actorFromContext,
        })
    }

    const handleSaveLeasingPickup = async (actorOverride?: Actor) => {
        if (!order) return
        if (!actorOverride && queueSharedAction({ type: "save_leasing_pickup" })) return

        setSaving(true)
        const updates = {
            pickup_code: editPickupCode || null,
            leasing_code: editLeasingCode || null,
            status: LEASING_STATUS.value,
        }
        const { error } = await supabase.from("orders").update(updates).eq("id", order.id)
        setSaving(false)

        if (error) {
            toastError("Fehler", "Leasing-Abholung konnte nicht gespeichert werden.")
            return
        }

        setOrder({ ...order, ...updates })
        setIsLeasingPickupDialogOpen(false)
        toastSuccess("Status aktualisiert", "Auftrag als abgeholt markiert.")
        await pushHistoryEvent({
            type: "status_change",
            title: "Status geaendert",
            description: `Status zu "${LEASING_STATUS.label}" geaendert`,
            metadata: { old_status: order.status, new_status: LEASING_STATUS.value, pickup_code: editPickupCode || null },
            actor: actorOverride || actorFromContext,
        })
    }

    const handleStatusChange = async (
        nextStatus: string,
        actorOverride?: Actor,
        options?: { skipReadyConfirm?: boolean; skipRevertConfirm?: boolean }
    ) => {
        if (!order || saving || nextStatus === order.status) return
        if (!actorOverride && queueSharedAction({ type: "status", status: nextStatus })) return

        if (order.is_leasing && nextStatus === LEASING_STATUS.value) {
            setEditPickupCode(order.pickup_code || "")
            setEditLeasingCode(order.leasing_code || "")
            setIsLeasingPickupDialogOpen(true)
            return
        }

        if (nextStatus === "abholbereit" && !options?.skipReadyConfirm) {
            setPendingStatusUpdate({ status: nextStatus, actor: actorOverride })
            setShowAbholbereitConfirm(true)
            return
        }

        const revertFromFinal = (order.status === "abholbereit" || order.status === "abgeschlossen") &&
            nextStatus !== "abholbereit" &&
            nextStatus !== "abgeschlossen"

        if (revertFromFinal && !options?.skipRevertConfirm) {
            setPendingStatusUpdate({ status: nextStatus, actor: actorOverride })
            setShowRevertConfirm(true)
            return
        }

        setSaving(true)
        const updates: Partial<Order> & { status: string } = { status: nextStatus }

        if (nextStatus === "kontrolle_offen") {
            const actingEmployeeId = actorOverride?.id || actorFromContext?.id
            if (actingEmployeeId) {
                updates.qc_mechanic_id = actingEmployeeId
                const currentMechanics = order.mechanic_ids || []
                if (!currentMechanics.includes(actingEmployeeId)) {
                    updates.mechanic_ids = [...currentMechanics, actingEmployeeId]
                }
            }
        }

        const { error } = await supabase.from("orders").update(updates).eq("id", order.id)
        setSaving(false)

        if (error) {
            toastError("Fehler", "Status konnte nicht aktualisiert werden.")
            return
        }

        setOrder({ ...order, ...updates })
        const statusLabel = statusSteps.find((step) => step.value === nextStatus)?.label || nextStatus
        await pushHistoryEvent({
            type: "status_change",
            title: "Status geaendert",
            description: `Status zu "${statusLabel}" geaendert`,
            metadata: { old_status: order.status, new_status: nextStatus },
            actor: actorOverride || actorFromContext,
        })
    }

    const handleApplyTemplate = async () => {
        if (!order || !selectedTemplateId) return
        const template = templates.find((entry) => entry.id === selectedTemplateId)
        if (!template) return

        const nextChecklist = normalizeChecklist(template.items)
        setSaving(true)
        const { error } = await supabase.from("orders").update({ checklist: nextChecklist }).eq("id", order.id)
        setSaving(false)

        if (error) {
            toastError("Fehler", "Vorlage konnte nicht angewendet werden.")
            return
        }

        setOrder({ ...order, checklist: nextChecklist })
        setSelectedTemplateId("")
        setShowTemplateConfirm(false)
        toastSuccess("Checkliste ersetzt", `${template.name} wurde uebernommen.`)
        await pushHistoryEvent({
            type: "info",
            title: "Checkliste ersetzt",
            description: `Vorlage "${template.name}" wurde angewendet.`,
            actor: actorFromContext,
        })
    }

    const handleToggleChecklist = async (index: number, checked: boolean, actorOverride?: Actor) => {
        if (!order?.checklist) return
        if (!actorOverride && queueSharedAction({ type: "toggle_checklist", index, checked })) return

        const nextChecklist = [...order.checklist]
        nextChecklist[index] = { ...nextChecklist[index], completed: checked }
        setOrder({ ...order, checklist: nextChecklist })

        const { error } = await supabase.from("orders").update({ checklist: nextChecklist }).eq("id", order.id)
        if (error) {
            setOrder(order)
            toastError("Fehler", "Checkliste konnte nicht gespeichert werden.")
            return
        }

        await pushHistoryEvent({
            type: "checklist_update",
            title: checked ? "Checklistenpunkt erledigt" : "Checklistenpunkt geoeffnet",
            description: `${order.checklist[index].text} wurde ${checked ? "abgehakt" : "zurueckgesetzt"}.`,
            metadata: { item_index: index, checked },
            actor: actorOverride || actorFromContext,
        })
    }

    const handleAssignment = async (employeeId: string) => {
        if (!order) return

        let updates: Partial<Order> = {}
        let eventTitle = ""
        let eventDescription = ""

        if (assignmentMode === "add_mechanic") {
            const currentMechanics = order.mechanic_ids || []
            if (currentMechanics.includes(employeeId)) {
                setIsAssignmentModalOpen(false)
                return
            }
            const employee = employees.find((entry) => entry.id === employeeId)
            updates = { mechanic_ids: [...currentMechanics, employeeId] }
            eventTitle = "Mechaniker zugewiesen"
            eventDescription = `${employee?.name || "Mitarbeiter"} wurde dem Auftrag zugewiesen.`
        } else {
            const employee = employees.find((entry) => entry.id === employeeId)
            updates = { qc_mechanic_id: employeeId }
            eventTitle = "Qualitaetskontrolle gesetzt"
            eventDescription = `${employee?.name || "Mitarbeiter"} uebernimmt die Kontrolle.`
        }

        const { error } = await supabase.from("orders").update(updates).eq("id", order.id)
        if (error) {
            toastError("Fehler", "Zuweisung konnte nicht gespeichert werden.")
            return
        }

        setOrder({ ...order, ...updates })
        setIsAssignmentModalOpen(false)
        toastSuccess("Aktualisiert", "Zuweisung gespeichert.")
        await pushHistoryEvent({
            type: "assignment",
            title: eventTitle,
            description: eventDescription,
            actor: actorFromContext,
        })
    }

    const handleRemoveMechanic = async (employeeId: string) => {
        if (!order) return

        const nextMechanics = (order.mechanic_ids || []).filter((id) => id !== employeeId)
        const { error } = await supabase.from("orders").update({ mechanic_ids: nextMechanics }).eq("id", order.id)
        if (error) {
            toastError("Fehler", "Mechaniker konnte nicht entfernt werden.")
            return
        }

        const employee = employees.find((entry) => entry.id === employeeId)
        setOrder({ ...order, mechanic_ids: nextMechanics })
        await pushHistoryEvent({
            type: "assignment",
            title: "Mechaniker entfernt",
            description: `${employee?.name || "Mitarbeiter"} wurde entfernt.`,
            actor: actorFromContext,
        })
    }

    const handleClearQc = async () => {
        if (!order?.qc_mechanic_id) return

        const currentQc = employees.find((entry) => entry.id === order.qc_mechanic_id)
        const { error } = await supabase.from("orders").update({ qc_mechanic_id: null }).eq("id", order.id)
        if (error) {
            toastError("Fehler", "Qualitaetskontrolle konnte nicht entfernt werden.")
            return
        }

        setOrder({ ...order, qc_mechanic_id: null })
        await pushHistoryEvent({
            type: "assignment",
            title: "QC entfernt",
            description: `${currentQc?.name || "Mitarbeiter"} wurde als Kontrolle entfernt.`,
            actor: actorFromContext,
        })
    }

    const handleOrderTypeUpdate = async (isLeasing: boolean) => {
        if (!order) return

        setSaving(true)
        const updates: Record<string, unknown> = { is_leasing: isLeasing }
        if (!isLeasing) {
            updates.leasing_provider = null
            updates.leasing_portal_email = null
            updates.contract_id = null
            updates.service_package = null
            updates.inspection_code = null
            updates.pickup_code = null
            updates.leasing_code = null
        }

        const { error } = await supabase.from("orders").update(updates).eq("id", order.id)
        setSaving(false)

        if (error) {
            toastError("Fehler", "Auftragstyp konnte nicht aktualisiert werden.")
            return
        }

        const nextOrder = normalizeOrder({ ...order, ...updates })
        setOrder(nextOrder)
        syncDraftsFromOrder(nextOrder)
        setShowOrderTypeConfirm(false)
        setPendingOrderTypeUpdate(null)
        toastSuccess("Aktualisiert", `Auftrag ist jetzt ${isLeasing ? "Leasing" : "Standard"}.`)
        await pushHistoryEvent({
            type: "info",
            title: "Auftragstyp geaendert",
            description: `Auftragstyp auf ${isLeasing ? "Leasing" : "Standard"} gesetzt.`,
            actor: actorFromContext,
        })
    }

    const handleToggleTag = async (tagId: string) => {
        if (!order || isReadOnly) return

        const currentTags = order.tags || []
        const nextTags = currentTags.includes(tagId) ? currentTags.filter((id) => id !== tagId) : [...currentTags, tagId]
        setOrder({ ...order, tags: nextTags })

        const { error } = await supabase.from("orders").update({ tags: nextTags }).eq("id", order.id)
        if (error) {
            setOrder({ ...order, tags: currentTags })
            toastError("Fehler", "Tag konnte nicht gespeichert werden.")
        }
    }

    const handleCreateAndAddTag = async () => {
        if (!order || !workshopId || !tagInput.trim() || isReadOnly) return

        const normalizedInput = tagInput.trim().toLowerCase()
        let targetTag = workshopTags.find((tag) => tag.name.toLowerCase() === normalizedInput)

        setSaving(true)
        try {
            if (!targetTag) {
                const randomColor = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
                const { data, error } = await supabase
                    .from("workshop_tags")
                    .insert({ workshop_id: workshopId, name: tagInput.trim(), color: randomColor })
                    .select()
                    .single()

                if (error) throw error
                targetTag = data as WorkshopTag
                setWorkshopTags((current) => [...current, targetTag!])
            }

            const currentTags = order.tags || []
            if (!currentTags.includes(targetTag.id)) {
                const nextTags = [...currentTags, targetTag.id]
                const { error } = await supabase.from("orders").update({ tags: nextTags }).eq("id", order.id)
                if (error) throw error
                setOrder({ ...order, tags: nextTags })
            }

            setTagInput("")
        } catch (error) {
            console.error(error)
            toastError("Fehler", "Tag konnte nicht verarbeitet werden.")
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteOrder = async () => {
        if (!order) return

        setSaving(true)
        const { error } = await supabase.from("orders").update({ status: "trash", trash_date: new Date().toISOString() }).eq("id", order.id)
        setSaving(false)

        if (error) {
            toastError("Fehler", "Auftrag konnte nicht in den Papierkorb verschoben werden.")
            return
        }

        toastSuccess("Verschoben", "Auftrag liegt jetzt im Papierkorb.")
        navigate(returnPath)
    }

    const handleEmployeeSelected = (employeeId: string) => {
        const selectedEmployee = employees.find((employee) => employee.id === employeeId)
        if (!selectedEmployee || !pendingAction) {
            setShowEmployeeSelect(false)
            setPendingAction(null)
            return
        }

        const actor = { id: selectedEmployee.id, name: selectedEmployee.name }

        switch (pendingAction.type) {
            case "status":
                handleStatusChange(pendingAction.status, actor)
                break
            case "toggle_checklist":
                handleToggleChecklist(pendingAction.index, pendingAction.checked, actor)
                break
            case "save_customer":
                handleSaveCustomerData(actor)
                break
            case "save_bike":
                handleSaveBikeData(actor)
                break
            case "save_customer_note":
                handleSaveCustomerNote(actor)
                break
            case "save_internal_note":
                handleSaveInternalNote(actor)
                break
            case "save_pricing":
                handleSavePricing(actor)
                break
            case "save_leasing_pickup":
                handleSaveLeasingPickup(actor)
                break
            case "save_leasing_info":
                handleSaveLeasingInfo(actor)
                break
        }

        setShowEmployeeSelect(false)
        setPendingAction(null)
    }

    if (loading) {
        return <LoadingScreen />
    }

    if (!order) {
        return (
            <DashboardLayout>
                <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
                    <h1 className="text-2xl font-semibold tracking-tight">Auftrag nicht gefunden</h1>
                    <Button onClick={() => navigate(returnPath)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Zurueck zur Uebersicht
                    </Button>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <PageTransition>
            <DashboardLayout>
                <div className="mx-auto max-w-[1560px] space-y-6 pb-10">
                    <SurfaceCard className="relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-background/80" />
                        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
                        <div className="absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-background/30 to-transparent" />

                        <div className="relative px-5 py-5 sm:px-7 sm:py-7">
                            <div className="flex flex-col gap-4 border-b border-border/40 pb-5 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button variant="ghost" size="sm" className="-ml-2 h-9 rounded-full px-3 text-muted-foreground" onClick={() => navigate(returnPath)}>
                                            <ArrowLeft className="h-4 w-4" />
                                            Zurueck
                                        </Button>
                                        <Badge className={cn("rounded-full border px-3 py-1 text-xs font-medium", activeStatus.color)}>
                                            {activeStatus.label}
                                        </Badge>
                                        <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                                            {order.is_leasing ? "Leasing" : "Standard"}
                                        </Badge>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">{order.order_number}</h1>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="rounded-full text-muted-foreground"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(order.order_number)
                                                    toastSuccess("Kopiert", "Auftragsnummer in Zwischenablage.")
                                                }}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                {order.customer_name}
                                            </span>
                                            <span className="flex items-center gap-2">
                                                <Bike className="h-4 w-4" />
                                                {[order.bike_brand, order.bike_model].filter(Boolean).join(" ") || "Fahrrad"}
                                            </span>
                                            {order.bike_type ? (
                                                <span className="rounded-full bg-background/70 px-3 py-1 text-xs text-foreground/80 ring-1 ring-border/40">
                                                    {BIKE_TYPE_LABELS[order.bike_type] || order.bike_type}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full bg-background/75"
                                        onClick={() => {
                                            const url = `${window.location.origin}/status/${order.id}`
                                            navigator.clipboard.writeText(url)
                                            toastSuccess("Link kopiert", "Status-Link wurde kopiert.")
                                        }}
                                    >
                                        <Copy className="h-4 w-4" />
                                        Status-Link
                                    </Button>
                                    {!isReadOnly ? (
                                        <Button variant="destructive" size="sm" className="rounded-full" onClick={() => setShowDeleteConfirm(true)}>
                                            <Trash2 className="h-4 w-4" />
                                            Entfernen
                                        </Button>
                                    ) : null}
                                </div>
                            </div>

                            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-[24px] border border-border/40 bg-background/70 px-4 py-4">
                                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Naechster Schritt</p>
                                    <div className="mt-2 flex items-start gap-3">
                                        <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                                            <ChevronRight className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{nextChecklistItem?.text || "Alles vorbereitet"}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">{checklistItems.length ? `${completedChecklistCount} von ${checklistItems.length} Punkten erledigt` : "Keine Checkliste hinterlegt"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-[24px] border border-border/40 bg-background/70 px-4 py-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Faelligkeit</p>
                                            <p className="mt-2 text-sm font-medium text-foreground">{formatDateLabel(order.due_date)}</p>
                                        </div>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" size="icon-sm" className="rounded-full" disabled={isReadOnly}>
                                                    <CalendarIcon className="h-4 w-4" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="end">
                                                <Calendar mode="single" selected={order.due_date ? new Date(order.due_date) : undefined} onSelect={handleSaveDueDate} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                <div className="rounded-[24px] border border-border/40 bg-background/70 px-4 py-4">
                                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Team</p>
                                    <p className="mt-2 text-sm font-medium text-foreground">
                                        {assignedMechanics.length ? assignedMechanics.map((employee) => employee?.name).join(", ") : "Noch niemand zugewiesen"}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">QC: {qcEmployee?.name || "Offen"}</p>
                                </div>

                                <div className="rounded-[24px] border border-border/40 bg-background/70 px-4 py-4">
                                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Preis</p>
                                    <p className="mt-2 text-sm font-medium text-foreground">{formatCurrency(order.final_price ?? order.estimated_price)}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Schaetzung: {formatCurrency(order.estimated_price)}</p>
                                </div>
                            </div>

                            <div className="mt-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">Statusfluss</p>
                                        <p className="text-xs text-muted-foreground">Jeder Schritt ist direkt klickbar und fuer Touch optimiert.</p>
                                    </div>
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
                                </div>

                                <div className="flex gap-3 overflow-x-auto pb-1">
                                    {statusSteps.map((step) => {
                                        const Icon = step.icon
                                        const isActive = order.status === step.value
                                        return (
                                            <button
                                                key={step.value}
                                                type="button"
                                                disabled={saving || isReadOnly}
                                                onClick={() => handleStatusChange(step.value)}
                                                className={cn(
                                                    "group min-w-[168px] shrink-0 rounded-[22px] border px-4 py-4 text-left transition-all",
                                                    isActive ? "border-primary/30 bg-primary/10 shadow-[0_12px_30px_-24px_var(--velofix-primary)]" : "border-border/50 bg-background/75 hover:border-border hover:bg-background",
                                                    (saving || isReadOnly) && "cursor-not-allowed opacity-70"
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className={cn("rounded-2xl p-2.5", isActive ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70")}>
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                    {isActive ? <CheckCircle2 className="mt-1 h-4 w-4 text-primary" /> : null}
                                                </div>
                                                <p className="mt-4 text-sm font-semibold text-foreground">{step.label}</p>
                                                <p className="mt-1 text-xs text-muted-foreground">{step.helper}</p>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </SurfaceCard>

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
                        <div className="space-y-6">
                            <SurfaceCard>
                                <SectionHeader icon={Wrench} title="Arbeitsfokus" subtitle="Die naechsten Aktionen sind bewusst gross, klar und direkt erreichbar." />
                                <div className="px-5 pb-5">
                                    <div className="rounded-[24px] border border-border/40 bg-background/60 p-5">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                            <div className="max-w-2xl">
                                                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Gerade relevant</p>
                                                <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{nextChecklistItem?.text || "Reparatur ist fuer den naechsten Schritt bereit."}</h3>
                                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                                    {nextChecklistItem ? "Wenn ihr direkt loslegen wollt, startet den Arbeitsmodus oder hakt den Punkt hier direkt ab." : "Alle Checklistenschritte sind erledigt. Ihr koennt direkt in die Kontrolle oder den Abschluss wechseln."}
                                                </p>
                                            </div>

                                            <div className="flex flex-col gap-2 sm:flex-row">
                                                {!isReadOnly ? (
                                                    <Button size="lg" className="h-12 rounded-2xl px-5 text-sm font-semibold shadow-[0_12px_28px_-18px_var(--velofix-primary)]" onClick={() => navigate(`/dashboard/orders/${order.id}/work`)}>
                                                        <Wrench className="h-4 w-4" />
                                                        {completedChecklistCount > 0 ? "Weiterarbeiten" : "Arbeitsmodus starten"}
                                                    </Button>
                                                ) : null}
                                                <Button size="lg" variant="outline" className="h-12 rounded-2xl px-5 text-sm font-semibold" onClick={() => navigate(`/dashboard/orders/${order.id}/control`)}>
                                                    <ShieldCheck className="h-4 w-4" />
                                                    Kontrolle
                                                </Button>
                                            </div>
                                        </div>

                                        {checklistItems.length ? (
                                            <div className="mt-5">
                                                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                                                    <span>Fortschritt</span>
                                                    <span>{checklistProgress}%</span>
                                                </div>
                                                <div className="h-2 overflow-hidden rounded-full bg-muted/70">
                                                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${checklistProgress}%` }} />
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </SurfaceCard>

                            <SurfaceCard>
                                <SectionHeader
                                    icon={AlertCircle}
                                    title="Kundenauftrag"
                                    subtitle="Das hier ist die sichtbare Aufgabenbeschreibung fuer die Reparatur."
                                    action={customerNoteDirty && !isReadOnly ? (
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setEditCustomerNote(order.customer_note || "")}>Zuruecksetzen</Button>
                                            <Button size="sm" className="rounded-full" onClick={() => handleSaveCustomerNote()} disabled={saving}>Speichern</Button>
                                        </div>
                                    ) : null}
                                />
                                <div className="px-5 pb-5">
                                    {isReadOnly ? (
                                        <div className="rounded-[24px] border border-border/40 bg-background/55 px-5 py-5 text-sm leading-7 text-foreground/90">
                                            {order.customer_note || <span className="italic text-muted-foreground">Kein Kundenwunsch hinterlegt.</span>}
                                        </div>
                                    ) : (
                                        <Textarea value={editCustomerNote} onChange={(event) => setEditCustomerNote(event.target.value)} placeholder="Was soll am Rad gemacht werden, was ist beobachtet worden, welche Hinweise sind fuer den Service wichtig?" className="min-h-[160px] rounded-[24px] border-border/50 bg-background/55 px-5 py-4 text-sm leading-7" />
                                    )}
                                </div>
                            </SurfaceCard>

                            <SurfaceCard>
                                <SectionHeader icon={PackageCheck} title="Checkliste" subtitle="Grosse Touch-Ziele, klare Reihenfolge und eine Vorlage nur einen Tap entfernt." action={<Badge variant="outline" className="rounded-full px-3 py-1 text-xs">{completedChecklistCount} / {checklistItems.length || 0}</Badge>} />
                                <div className="space-y-4 px-5 pb-5">
                                    <div className="flex flex-col gap-3 lg:flex-row">
                                        <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId} disabled={isReadOnly}>
                                            <SelectTrigger className="h-11 rounded-2xl border-border/50 bg-background/60">
                                                <SelectValue placeholder="Checklisten-Vorlage waehlen" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {templates.map((template) => (
                                                    <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button variant="outline" className="h-11 rounded-2xl px-5" disabled={!selectedTemplateId || isReadOnly} onClick={() => setShowTemplateConfirm(true)}>
                                            Vorlage anwenden
                                        </Button>
                                    </div>

                                    {checklistItems.length ? (
                                        <div className="space-y-3">
                                            {checklistItems.map((item, index) => (
                                                <label key={`${item.text}-${index}`} className={cn("flex cursor-pointer items-start gap-4 rounded-[24px] border px-4 py-4 transition-all", item.completed ? "border-primary/20 bg-primary/6" : "border-border/45 bg-background/55 hover:border-border hover:bg-background/70")}>
                                                    <Checkbox checked={item.completed} onCheckedChange={(checked) => handleToggleChecklist(index, checked === true)} disabled={isReadOnly} className="mt-1 h-5 w-5 rounded-md" />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className={cn("text-sm font-medium leading-6", item.completed && "text-muted-foreground line-through")}>{item.text}</p>
                                                            {item.type === "acceptance" ? <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.14em]">Annahme</Badge> : null}
                                                        </div>
                                                        {item.completed_at ? <p className="mt-1 text-xs text-muted-foreground">Erledigt am {format(new Date(item.completed_at), "dd.MM.yyyy HH:mm", { locale: de })}</p> : null}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="rounded-[24px] border border-dashed border-border/60 bg-background/40 px-6 py-10 text-center">
                                            <PackageCheck className="mx-auto h-9 w-9 text-muted-foreground/35" />
                                            <p className="mt-4 text-sm font-medium text-foreground">Noch keine Checkliste</p>
                                            <p className="mt-1 text-sm text-muted-foreground">Waehlt oben eine Vorlage aus, damit die Reparatur strukturiert gestartet werden kann.</p>
                                        </div>
                                    )}
                                </div>
                            </SurfaceCard>

                            <SurfaceCard>
                                <SectionHeader
                                    icon={NotebookPen}
                                    title="Interne Werkstattnotiz"
                                    subtitle="Nur fuer das Team sichtbar. Ideal fuer Diagnosen, Rueckfragen und To-dos."
                                    action={internalNoteDirty && !isReadOnly ? (
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setEditInternalNote(order.internal_note || "")}>Zuruecksetzen</Button>
                                            <Button size="sm" className="rounded-full" onClick={() => handleSaveInternalNote()} disabled={saving}>Speichern</Button>
                                        </div>
                                    ) : null}
                                />
                                <div className="px-5 pb-5">
                                    {isReadOnly ? (
                                        <div className="rounded-[24px] border border-border/40 bg-background/55 px-5 py-5 text-sm leading-7 text-foreground/90">
                                            {order.internal_note || <span className="italic text-muted-foreground">Keine interne Notiz hinterlegt.</span>}
                                        </div>
                                    ) : (
                                        <Textarea value={editInternalNote} onChange={(event) => setEditInternalNote(event.target.value)} placeholder="Interne Hinweise fuer das Team, z. B. Diagnose, Teilebedarf oder Rueckfragen." className="min-h-[180px] rounded-[24px] border-border/50 bg-background/55 px-5 py-4 text-sm leading-7" />
                                    )}
                                </div>
                            </SurfaceCard>
                        </div>
                        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
                            <SurfaceCard>
                                <SectionHeader
                                    icon={User}
                                    title="Kunde und Fahrrad"
                                    subtitle="Alles Wichtige kompakt, ohne Sucherei."
                                    action={!isReadOnly ? (
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => setIsCustomerDialogOpen(true)}><Pencil className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => setIsBikeDialogOpen(true)}><Bike className="h-4 w-4" /></Button>
                                        </div>
                                    ) : null}
                                />
                                <div className="space-y-3 px-5 pb-5">
                                    <DetailRow label="Kunde" value={order.customer_name} />
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <DetailRow label="E-Mail" value={order.customer_email ? <a href={`mailto:${order.customer_email}`} className="inline-flex items-center gap-2 hover:text-primary"><Mail className="h-4 w-4 text-muted-foreground" />{order.customer_email}</a> : <span className="text-muted-foreground">Nicht hinterlegt</span>} />
                                        <DetailRow label="Telefon" value={order.customer_phone ? <a href={`tel:${order.customer_phone}`} className="inline-flex items-center gap-2 hover:text-primary"><Phone className="h-4 w-4 text-muted-foreground" />{order.customer_phone}</a> : <span className="text-muted-foreground">Nicht hinterlegt</span>} />
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <DetailRow label="Marke" value={order.bike_brand || "Nicht hinterlegt"} />
                                        <DetailRow label="Modell" value={order.bike_model || "Nicht hinterlegt"} />
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <DetailRow label="Typ" value={order.bike_type ? BIKE_TYPE_LABELS[order.bike_type] || order.bike_type : "Nicht hinterlegt"} />
                                        <DetailRow label="Farbe" value={order.bike_color || "Nicht hinterlegt"} />
                                    </div>
                                    {(order.frame_number || order.frame_size) ? (
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <DetailRow label="Rahmennummer" value={order.frame_number || "Nicht hinterlegt"} mono />
                                            <DetailRow label="Rahmengroesse" value={order.frame_size || "Nicht hinterlegt"} />
                                        </div>
                                    ) : null}
                                </div>
                            </SurfaceCard>

                            <SurfaceCard>
                                <SectionHeader
                                    icon={Wrench}
                                    title="Team und Planung"
                                    subtitle="Zuweisung und Timing in einem Block."
                                    action={!isReadOnly ? (
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setAssignmentMode("add_mechanic"); setIsAssignmentModalOpen(true) }}>
                                                <Plus className="h-4 w-4" />
                                                Mechaniker
                                            </Button>
                                            <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setAssignmentMode("qc"); setIsAssignmentModalOpen(true) }}>
                                                <ShieldCheck className="h-4 w-4" />
                                                QC
                                            </Button>
                                        </div>
                                    ) : null}
                                />
                                <div className="space-y-4 px-5 pb-5">
                                    <div>
                                        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Mechaniker</p>
                                        {assignedMechanics.length ? (
                                            <div className="flex flex-wrap gap-2">
                                                {assignedMechanics.map((employee) => (
                                                    <div key={employee!.id} className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/60 px-3 py-2 text-sm">
                                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: employee?.color || "var(--velofix-primary)" }} />
                                                        {employee?.name}
                                                        {!isReadOnly ? <button type="button" className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => handleRemoveMechanic(employee!.id)}><X className="h-3 w-3" /></button> : null}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 px-4 py-4 text-sm text-muted-foreground">Noch kein Mechaniker zugewiesen.</div>}
                                    </div>

                                    <div>
                                        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Qualitaetskontrolle</p>
                                        {qcEmployee ? (
                                            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/60 px-3 py-2 text-sm">
                                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: qcEmployee.color || "var(--velofix-primary)" }} />
                                                {qcEmployee.name}
                                                {!isReadOnly ? <button type="button" className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={handleClearQc}><X className="h-3 w-3" /></button> : null}
                                            </div>
                                        ) : <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 px-4 py-4 text-sm text-muted-foreground">QC noch offen.</div>}
                                    </div>

                                    <DetailRow label="Erstellt" value={format(new Date(order.created_at), "dd. MMMM yyyy", { locale: de })} />
                                    <DetailRow label="Faelligkeit" value={formatDateLabel(order.due_date)} />
                                </div>
                            </SurfaceCard>

                            <SurfaceCard>
                                <SectionHeader
                                    icon={Euro}
                                    title="Preis und Abrechnung"
                                    subtitle="Schaetzung, Endpreis und Auftragstyp an einem Ort."
                                    action={!isReadOnly ? (
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => setIsPricingDialogOpen(true)}><Pencil className="h-4 w-4" /></Button>
                                            {order.is_leasing ? <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => setIsLeasingDialogOpen(true)}><CreditCard className="h-4 w-4" /></Button> : null}
                                        </div>
                                    ) : null}
                                />
                                <div className="space-y-3 px-5 pb-5">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <DetailRow label="Schaetzung" value={formatCurrency(order.estimated_price)} />
                                        <DetailRow label="Endpreis" value={formatCurrency(order.final_price)} />
                                    </div>

                                    <div className="rounded-[24px] border border-border/40 bg-background/50 p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Auftragstyp</p>
                                                <p className="mt-1 text-sm font-medium text-foreground">{order.is_leasing ? "Leasing" : "Standard"}</p>
                                            </div>
                                            {!isReadOnly ? (
                                                <div className="inline-flex rounded-full border border-border/50 bg-background/80 p-1">
                                                    <button type="button" onClick={() => { if (!order.is_leasing) return; setPendingOrderTypeUpdate(false); setShowOrderTypeConfirm(true) }} className={cn("rounded-full px-4 py-2 text-sm transition-colors", !order.is_leasing ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>Standard</button>
                                                    <button type="button" onClick={() => { if (order.is_leasing) return; handleOrderTypeUpdate(true) }} className={cn("rounded-full px-4 py-2 text-sm transition-colors", order.is_leasing ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>Leasing</button>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    {order.is_leasing ? (
                                        <div className="grid gap-3">
                                            <DetailRow label="Anbieter" value={order.leasing_provider || "Nicht hinterlegt"} />
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <DetailRow label="Vertragsnummer" value={order.contract_id || "Nicht hinterlegt"} mono />
                                                <DetailRow label="Leasing-Code" value={order.leasing_code || "Nicht hinterlegt"} mono />
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <DetailRow label="Pruefcode" value={order.inspection_code || "Nicht hinterlegt"} mono />
                                                <DetailRow label="Abholcode" value={order.pickup_code || "Nicht hinterlegt"} mono />
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </SurfaceCard>

                            <SurfaceCard>
                                <SectionHeader icon={PackageCheck} title="Tags und Verlauf" subtitle="Schnelles Filtern im Alltag und ein sauberer Audit-Path." />
                                <div className="space-y-5 px-5 pb-5">
                                    <div>
                                        <div className="mb-3 flex flex-wrap items-center gap-2">
                                            {selectedTags.length ? selectedTags.map((tag) => (
                                                <button key={tag.id} type="button" className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-white" style={{ backgroundColor: tag.color }} onClick={() => handleToggleTag(tag.id)} disabled={isReadOnly}>
                                                    {tag.name}
                                                    {!isReadOnly ? <X className="h-3 w-3" /> : null}
                                                </button>
                                            )) : <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 px-4 py-3 text-sm text-muted-foreground">Noch keine Tags gesetzt.</div>}
                                        </div>

                                        {!isReadOnly ? (
                                            <div className="space-y-3">
                                                <div className="flex gap-2">
                                                    <Input value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="Neuen Tag anlegen oder suchen" className="h-11 rounded-2xl border-border/50 bg-background/60" />
                                                    <Button variant="outline" className="h-11 rounded-2xl px-4" onClick={handleCreateAndAddTag} disabled={!tagInput.trim() || saving}>
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {workshopTags.map((tag) => {
                                                        const active = order.tags?.includes(tag.id)
                                                        return (
                                                            <button key={tag.id} type="button" onClick={() => handleToggleTag(tag.id)} className={cn("rounded-full border px-3 py-1.5 text-xs transition-all", active ? "border-transparent text-white" : "border-border/50 bg-background/60 text-muted-foreground hover:text-foreground")} style={active ? { backgroundColor: tag.color } : undefined}>
                                                                {tag.name}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="rounded-[24px] border border-border/40 bg-background/45 px-4 py-4">
                                        <OrderHistory history={order.history || []} />
                                    </div>
                                </div>
                            </SurfaceCard>
                        </div>
                    </div>
                </div>

                <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Kundendaten bearbeiten</DialogTitle>
                            <DialogDescription>Nur die Kontaktinformationen, die im Alltag wirklich gebraucht werden.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2">
                            <div className="grid gap-2">
                                <Label htmlFor="customer-name">Name</Label>
                                <Input id="customer-name" value={editCustomerName} onChange={(event) => setEditCustomerName(event.target.value)} />
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="customer-email">E-Mail</Label>
                                    <Input id="customer-email" type="email" value={editCustomerEmail} onChange={(event) => setEditCustomerEmail(event.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="customer-phone">Telefon</Label>
                                    <Input id="customer-phone" value={editCustomerPhone} onChange={(event) => setEditCustomerPhone(event.target.value)} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCustomerDialogOpen(false)}>Abbrechen</Button>
                            <Button onClick={() => handleSaveCustomerData()} disabled={saving}>Speichern</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isBikeDialogOpen} onOpenChange={setIsBikeDialogOpen}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Fahrraddaten bearbeiten</DialogTitle>
                            <DialogDescription>Nur die Infos, die fuer Werkstatt und Rueckfrage relevant sind.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="bike-brand">Marke</Label>
                                    <Input id="bike-brand" value={editBikeBrand} onChange={(event) => setEditBikeBrand(event.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="bike-model">Modell</Label>
                                    <Input id="bike-model" value={editBikeModel} onChange={(event) => setEditBikeModel(event.target.value)} />
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="grid gap-2">
                                    <Label>Typ</Label>
                                    <Select value={editBikeType || "none"} onValueChange={(value) => setEditBikeType(value === "none" ? "" : value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Nicht hinterlegt</SelectItem>
                                            {Object.entries(BIKE_TYPE_LABELS).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>{label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="bike-color">Farbe</Label>
                                    <Input id="bike-color" value={editBikeColor} onChange={(event) => setEditBikeColor(event.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="frame-size">Rahmengroesse</Label>
                                    <Input id="frame-size" value={editFrameSize} onChange={(event) => setEditFrameSize(event.target.value)} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="frame-number">Rahmennummer</Label>
                                <Input id="frame-number" value={editFrameNumber} onChange={(event) => setEditFrameNumber(event.target.value)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsBikeDialogOpen(false)}>Abbrechen</Button>
                            <Button onClick={() => handleSaveBikeData()} disabled={saving}>Speichern</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isPricingDialogOpen} onOpenChange={setIsPricingDialogOpen}>
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Preise bearbeiten</DialogTitle>
                            <DialogDescription>Schaetzung und Endpreis sind bewusst minimal gehalten.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="estimated-price">Schaetzung</Label>
                                <Input id="estimated-price" type="number" inputMode="decimal" value={editEstimatedPrice} onChange={(event) => setEditEstimatedPrice(event.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="final-price">Endpreis</Label>
                                <Input id="final-price" type="number" inputMode="decimal" value={editFinalPrice} onChange={(event) => setEditFinalPrice(event.target.value)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsPricingDialogOpen(false)}>Abbrechen</Button>
                            <Button onClick={() => handleSavePricing()} disabled={saving}>Speichern</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isLeasingDialogOpen} onOpenChange={setIsLeasingDialogOpen}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Leasingdaten bearbeiten</DialogTitle>
                            <DialogDescription>Alles fuer Anbieter, Portal und Rueckgabe an einem Ort.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="leasing-provider">Anbieter</Label>
                                    <Input id="leasing-provider" value={editLeasingProvider} onChange={(event) => setEditLeasingProvider(event.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="leasing-portal-email">Portal E-Mail</Label>
                                    <Input id="leasing-portal-email" value={editLeasingPortalEmail} onChange={(event) => setEditLeasingPortalEmail(event.target.value)} />
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="contract-id">Vertragsnummer</Label>
                                    <Input id="contract-id" value={editContractId} onChange={(event) => setEditContractId(event.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="service-package">Servicepaket</Label>
                                    <Input id="service-package" value={editServicePackage} onChange={(event) => setEditServicePackage(event.target.value)} />
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="inspection-code">Pruefcode</Label>
                                    <Input id="inspection-code" value={editInspectionCode} onChange={(event) => setEditInspectionCode(event.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="pickup-code">Abholcode</Label>
                                    <Input id="pickup-code" value={editPickupCode} onChange={(event) => setEditPickupCode(event.target.value)} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="leasing-code">Leasing-Code</Label>
                                <Input id="leasing-code" value={editLeasingCode} onChange={(event) => setEditLeasingCode(event.target.value)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsLeasingDialogOpen(false)}>Abbrechen</Button>
                            <Button onClick={() => handleSaveLeasingInfo()} disabled={saving}>Speichern</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isLeasingPickupDialogOpen} onOpenChange={setIsLeasingPickupDialogOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Leasing-Abholung abschliessen</DialogTitle>
                            <DialogDescription>Vor dem Statuswechsel bitte beide Codes bestaetigen.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2">
                            <div className="grid gap-2">
                                <Label htmlFor="pickup-code-confirm">Abholcode</Label>
                                <Input id="pickup-code-confirm" value={editPickupCode} onChange={(event) => setEditPickupCode(event.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="leasing-code-confirm">Leasing-Code</Label>
                                <Input id="leasing-code-confirm" value={editLeasingCode} onChange={(event) => setEditLeasingCode(event.target.value)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsLeasingPickupDialogOpen(false)}>Abbrechen</Button>
                            <Button onClick={() => handleSaveLeasingPickup()} disabled={saving}>Status setzen</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <EmployeeSelectionModal open={showEmployeeSelect} onOpenChange={setShowEmployeeSelect} triggerAction="Aenderung speichern" onEmployeeSelected={handleEmployeeSelected} />
                <EmployeeSelectionModal open={isAssignmentModalOpen} onOpenChange={setIsAssignmentModalOpen} triggerAction={assignmentMode === "add_mechanic" ? "Mechaniker zuweisen" : "Qualitaetskontrolle zuweisen"} onEmployeeSelected={handleAssignment} />

                <AlertDialog open={showTemplateConfirm} onOpenChange={setShowTemplateConfirm}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Checkliste ersetzen?</AlertDialogTitle>
                            <AlertDialogDescription>Die aktuelle Checkliste wird komplett durch die ausgewaehlte Vorlage ersetzt.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction onClick={handleApplyTemplate}>Ersetzen</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Auftrag in den Papierkorb verschieben?</AlertDialogTitle>
                            <AlertDialogDescription>Der Auftrag verschwindet aus der aktiven Uebersicht und liegt danach im Papierkorb.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteOrder}>Verschieben</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={showAbholbereitConfirm} onOpenChange={setShowAbholbereitConfirm}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Status auf "Abholbereit" setzen?</AlertDialogTitle>
                            <AlertDialogDescription>Der Kunde wird automatisch benachrichtigt, sobald der Auftrag abholbereit markiert wird.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setPendingStatusUpdate(null)}>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction onClick={() => {
                                if (pendingStatusUpdate) {
                                    handleStatusChange(pendingStatusUpdate.status, pendingStatusUpdate.actor, { skipReadyConfirm: true })
                                    setPendingStatusUpdate(null)
                                }
                                setShowAbholbereitConfirm(false)
                            }}>
                                Bestaetigen
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={showRevertConfirm} onOpenChange={setShowRevertConfirm}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Status wirklich zuruecksetzen?</AlertDialogTitle>
                            <AlertDialogDescription>Der Auftrag verlaesst damit einen finalen Zustand und taucht wieder in der aktiven Werkstattsteuerung auf.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setPendingStatusUpdate(null)}>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction onClick={() => {
                                if (pendingStatusUpdate) {
                                    handleStatusChange(pendingStatusUpdate.status, pendingStatusUpdate.actor, { skipRevertConfirm: true })
                                    setPendingStatusUpdate(null)
                                }
                                setShowRevertConfirm(false)
                            }}>
                                Status zuruecksetzen
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={showOrderTypeConfirm} onOpenChange={setShowOrderTypeConfirm}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Leasingdaten verwerfen?</AlertDialogTitle>
                            <AlertDialogDescription>Beim Wechsel auf Standard werden alle Leasingfelder entfernt. Dieser Schritt laesst sich spaeter nur manuell neu pflegen.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setPendingOrderTypeUpdate(null)}>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction onClick={() => {
                                if (pendingOrderTypeUpdate !== null) {
                                    handleOrderTypeUpdate(pendingOrderTypeUpdate)
                                }
                            }}>
                                Wechsel bestaetigen
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DashboardLayout>
        </PageTransition>
    )
}
