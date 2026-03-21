import { toastSuccess } from '@/lib/toast-utils'
import { OrderHistory } from "@/components/OrderHistory"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { useOrderDetail, STATUS_FLOW, LEASING_STATUS, COMPLETED_STATUS } from "@/hooks/useOrderDetail"
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
import { cn } from "@/lib/utils"
import {
    ArrowLeft,
    User,
    Bike,
    CreditCard,
    Mail,
    Phone,
    Euro,
    PackageCheck,
    Check,
    AlertCircle,
    Loader2,
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
import { BIKE_TYPE_LABELS } from "@/lib/constants"
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

const STATUS_DOT_COLORS: Record<string, string> = {
    eingegangen:      "bg-blue-500",
    warten_auf_teile: "bg-orange-500",
    in_bearbeitung:   "bg-violet-500",
    kontrolle_offen:  "bg-amber-500",
    abholbereit:      "bg-emerald-500",
    abgeholt:         "bg-teal-500",
    abgeschlossen:    "bg-neutral-400",
}

import { ChecklistTemplateSelector } from "@/components/ChecklistTemplateSelector"
import type { ChecklistItem } from "@/types/checklist"


export default function OrderDetailPage() {
    const {
        order,
        loading,
        saving,
        templates,
        workshopTags,
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
        tagInput,
        setTagInput,
        isLeasingDialogOpen,
        setIsLeasingDialogOpen,
        leasingCodeInput,
        setLeasingCodeInput,
        dialogLeasingCode,
        setDialogLeasingCode,
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
        isAssignmentModalOpen,
        setIsAssignmentModalOpen,
        assignmentType,
        setAssignmentType,

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
        internalNote,
        customerNote,
        showEmployeeSelect,
        setShowEmployeeSelect,
        pendingAction,
        setPendingAction,
        showExitDialog,
        setShowExitDialog,
        showDeleteConfirm,
        setShowDeleteConfirm,
        isCustomerEditDialogOpen,
        setIsCustomerEditDialogOpen,
        editCustomerName,
        setEditCustomerName,
        editCustomerEmail,
        setEditCustomerEmail,
        editCustomerPhone,
        setEditCustomerPhone,
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
        isInternalNoteEditDialogOpen,
        setIsInternalNoteEditDialogOpen,
        textareaRef,
        editInternalNote,
        setEditInternalNote,
        isPriceEditDialogOpen,
        setIsPriceEditDialogOpen,
        editEstimatedPrice,
        setEditEstimatedPrice,
        editFinalPrice,
        setEditFinalPrice,
        getEmployeeName,
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
        userRole,
        isReadOnly,
        returnPath,
        navigate,
    } = useOrderDetail()

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
                <div className="space-y-4 pb-8">

                    {/* ── Hero Header ─────────────────────────────────────────── */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-primary/3 border border-primary/10 p-5">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />

                        <div className="relative">
                            {/* ── Row 1: Navigation ── */}
                            <Button
                                variant="ghost"
                                className="pl-0 gap-2 text-muted-foreground hover:text-foreground mb-3 h-8 text-sm"
                                onClick={() => navigate(returnPath)}
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Zurück
                            </Button>

                            {/* ── Row 2: Identity + Actions ── */}
                            <div className="flex items-start justify-between gap-2">
                                {/* Left: order number + bike + type */}
                                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                    <h1 className="text-lg font-bold tracking-tight text-foreground whitespace-nowrap">
                                        {order.order_number}
                                    </h1>
                                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted/60 border border-border/50 text-muted-foreground">
                                        {order.bike_model || order.bike_brand || 'Fahrrad'}
                                    </span>
                                </div>

                                {/* Action Buttons */}
                                {!isReadOnly && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Button
                                            size="sm"
                                            onClick={() => navigate(`/dashboard/orders/${order.id}/work`)}
                                            className="bg-primary text-primary-foreground shadow-sm hover:shadow-primary/20 h-8 text-xs"
                                        >
                                            <Wrench className="mr-1 h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">{order.checklist && order.checklist.some((item: any) => item.completed || item.notes)
                                                ? "Weiterarbeiten"
                                                : "Arbeitsmodus"}</span>
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => navigate(`/dashboard/orders/${order.id}/control`)}
                                            variant="outline"
                                            className="border-green-500/30 text-green-600 hover:bg-green-500/10 h-8 text-xs"
                                        >
                                            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">Kontrolle</span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            onClick={() => {
                                                const url = `${window.location.origin}/status/${order.id}`
                                                navigator.clipboard.writeText(url)
                                                toastSuccess('Link kopiert', 'Der Status-Link wurde in die Zwischenablage kopiert.')
                                            }}
                                            title="Status-Link kopieren"
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* ── Metadata line ── */}
                            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            disabled={isReadOnly}
                                            className={cn(
                                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all duration-200 focus:outline-none",
                                                isReadOnly ? "cursor-default" : "cursor-pointer hover:ring-1 hover:ring-border/50",
                                                order.is_leasing
                                                    ? "bg-primary/10 text-primary border-primary/20"
                                                    : "bg-muted/50 text-muted-foreground border-border/40"
                                            )}
                                        >
                                            {order.is_leasing ? "Leasing" : "Standard"}
                                            {!isReadOnly && <span className="opacity-40 text-[9px]">▾</span>}
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
                                <Badge
                                    variant="secondary"
                                    className={cn("border text-xs font-normal", (() => {
                                        const statusColors: Record<string, string> = {
                                            eingegangen: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                                            warten_auf_teile: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
                                            in_bearbeitung: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
                                            kontrolle_offen: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                                            abholbereit: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                                            abgeholt: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
                                            abgeschlossen: 'bg-neutral-400/10 text-neutral-500 border-neutral-400/20',
                                        }
                                        return statusColors[order.status] || 'bg-muted text-muted-foreground border-border/60'
                                    })())}
                                >
                                    <div className={cn("h-1.5 w-1.5 rounded-full mr-1.5", STATUS_DOT_COLORS[order.status] || 'bg-muted-foreground')} />
                                    {STATUS_FLOW.find(s => s.value === order.status)?.label
                                        || (order.status === 'abgeholt' ? 'Abgeholt' : order.status === 'abgeschlossen' ? 'Abgeschlossen' : order.status)}
                                </Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <User className="h-3 w-3" />
                                    {order.customer_name}
                                </span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            className={cn(
                                                "text-xs text-muted-foreground flex items-center gap-1.5 hover:text-foreground transition-colors",
                                                order.due_date && new Date(order.due_date) < new Date() && order.status !== 'abgeholt' && order.status !== 'abgeschlossen' && "text-red-500"
                                            )}
                                        >
                                            <CalendarIcon className="h-3 w-3" />
                                            {order.due_date ? format(new Date(order.due_date), "PPP", { locale: de }) : "Termin setzen"}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={order.due_date ? new Date(order.due_date) : undefined}
                                            onSelect={handleSaveDueDate}
                                            initialFocus
                                            locale={de}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <span className="text-xs text-muted-foreground">
                                    Erstellt am {new Date(order.created_at).toLocaleDateString('de-DE')}
                                </span>

                                {/* Tags inline */}
                                {order.tags && order.tags.length > 0 && (
                                    <div className="w-px h-3 bg-border/40 mx-0.5" />
                                )}
                                {order.tags && order.tags.map(tagId => {
                                    const tagInfo = workshopTags.find(t => t.id === tagId)
                                    if (!tagInfo) return null
                                    return (
                                        <Badge
                                            key={tagId}
                                            className="px-1.5 py-0 text-[10px] font-medium text-white border-0 flex items-center gap-0.5 h-5"
                                            style={{ backgroundColor: tagInfo.color }}
                                        >
                                            {tagInfo.name}
                                            {!isReadOnly && (
                                                <button onClick={(e) => handleRemoveTag(tagId, e)} className="hover:bg-black/20 rounded-full p-0.5">
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                            )}
                                        </Badge>
                                    )
                                })}
                                {!isReadOnly && workshopTags.length > 0 && (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-5 gap-0.5 px-1.5 text-[10px] border-dashed text-muted-foreground hover:text-foreground">
                                                <Plus className="w-2.5 h-2.5" /> Tag
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

                            {/* ── Status Flow (Todoist-style stepper) ── */}
                            {(() => {
                                const stepIdx = STATUS_FLOW.findIndex(s => s.value === order.status)
                                const allSteps = [
                                    ...STATUS_FLOW.map(s => ({ ...s, type: 'main' as const })),
                                    ...(order.is_leasing ? [{ ...LEASING_STATUS, type: 'extra' as const }] : []),
                                    { ...COMPLETED_STATUS, type: 'extra' as const },
                                ]
                                return (
                                    <div className="flex flex-wrap items-center gap-1 mt-3 pt-3 border-t border-primary/10">
                                        {allSteps.map((step, idx) => {
                                            const isMainStep = step.type === 'main'
                                            const isDone = isMainStep ? idx < stepIdx : false
                                            const isActive = step.value === order.status

                                            return (
                                                <div key={step.value} className="flex items-center">
                                                    {/* Separator before extra steps */}
                                                    {!isMainStep && idx > 0 && allSteps[idx - 1]?.type === 'main' && (
                                                        <div className="w-px h-4 bg-border/30 mr-1" />
                                                    )}
                                                    <button
                                                        onClick={() => !saving && !isReadOnly && handleStatusChange(step.value)}
                                                        disabled={saving || isReadOnly || isActive}
                                                        className={cn(
                                                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-all duration-200 select-none whitespace-nowrap",
                                                            isActive && "bg-foreground text-background shadow-sm",
                                                            isDone && "bg-primary/10 text-primary",
                                                            !isDone && !isActive && "text-muted-foreground/60 hover:bg-muted/50 hover:text-foreground"
                                                        )}
                                                    >
                                                        {isDone ? (
                                                            <div className="h-3.5 w-3.5 rounded-full bg-primary/20 flex items-center justify-center">
                                                                <Check className="h-2.5 w-2.5 text-primary" />
                                                            </div>
                                                        ) : isActive ? (
                                                            <div className="relative h-3.5 w-3.5 flex items-center justify-center">
                                                                <div className={cn("h-2 w-2 rounded-full", STATUS_DOT_COLORS[step.value])} />
                                                                <div className={cn("absolute inset-0 rounded-full animate-ping opacity-20", STATUS_DOT_COLORS[step.value])} />
                                                            </div>
                                                        ) : (
                                                            <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/25" />
                                                        )}
                                                        {step.label}
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            })()}

                        </div>
                    </div>


                    {/* ── Briefing ────────────────────────────────────────── */}
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                        {/* Kundenwunsch - always visible */}
                        <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 rounded-lg bg-amber-500/10">
                                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                </div>
                                <span className="text-sm font-semibold">Kundenwunsch</span>
                            </div>
                            <div
                                className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90 max-h-[120px] overflow-y-auto"
                            >
                                {customerNote || <span className="text-muted-foreground italic">Keine Beschreibung vorhanden.</span>}
                            </div>
                        </div>

                        {/* Interne Notizen - always visible, editable */}
                        <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-primary/10">
                                        <StickyNote className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    <span className="text-sm font-semibold">Interne Notizen</span>
                                    {saving && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                                </div>
                                {!isReadOnly && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 rounded-lg bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors"
                                        onClick={() => {
                                            setEditInternalNote(order?.internal_note || "")
                                            setIsInternalNoteEditDialogOpen(true)
                                        }}
                                    >
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                )}
                            </div>
                            <div
                                className={cn(
                                    "text-sm whitespace-pre-wrap leading-relaxed max-h-[120px] overflow-y-auto",
                                    !isReadOnly && "cursor-pointer hover:bg-muted/10 rounded-lg -m-1 p-1 transition-colors"
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
                    </div>

                    {/* ── Checkliste (always open, full width) ─────────────── */}
                    <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
                        <div className="px-4 py-3.5 border-b border-border/40">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg bg-primary/10">
                                        <PackageCheck className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    <span className="text-sm font-semibold">Checkliste</span>
                                </div>
                                <span className="text-xs font-mono text-muted-foreground">
                                    {order.checklist?.filter(i => i.completed).length || 0}/{order.checklist?.length || 0} erledigt
                                </span>
                            </div>

                            {/* Progress Bar */}
                            {order.checklist && order.checklist.length > 0 && (
                                <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden mb-3">
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

                        <div className="px-4 py-3">
                                        {order.checklist && order.checklist.length > 0 ? (
                                            <div className="space-y-6">
                                                {/* Grouped Rendering */}
                                                {Object.entries((order.checklist || []).reduce<Record<string, Array<ChecklistItem & { originalIndex: number }>>>((groups, item, index) => {
                                                    const groupName = item.template_name || 'Allgemein'
                                                    if (!groups[groupName]) groups[groupName] = []
                                                    groups[groupName].push({ ...item, originalIndex: index })
                                                    return groups
                                                }, {})).map(([groupName, items]) => (
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
                                                                {items.map((item) => (
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
                                            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg border-muted/40 bg-muted/5">
                                                <PackageCheck className="h-9 w-9 mb-3 opacity-20" />
                                                <p className="text-sm font-medium mb-0.5">Keine Checkliste</p>
                                                <p className="text-xs max-w-[180px]">Wähle oben eine Vorlage aus, um zu starten.</p>
                                            </div>
                                        )}
                        </div>
                    </div>

                    {/* ── Details Grid ─────────────────────────────────────── */}
                    <div className="grid gap-5 grid-cols-1 md:grid-cols-2">

                        {/* ━━ Details Column 1 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                        <div className="space-y-5">

                            {/* Customer Card */}
                            <Collapsible
                                open={isCustomerDataOpen}
                                onOpenChange={setIsCustomerDataOpen}
                                className="rounded-lg border border-border bg-card overflow-hidden"
                            >
                                <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
                                    <CollapsibleTrigger asChild>
                                        <div className="flex items-center gap-2.5 cursor-pointer flex-1">
                                            <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                                                <User className="h-3.5 w-3.5 text-muted-foreground" />
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
                                className="rounded-lg border border-border bg-card overflow-hidden"
                            >
                                <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
                                    <CollapsibleTrigger asChild>
                                        <div className="flex items-center gap-2.5 cursor-pointer flex-1">
                                            <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                                                <Bike className="h-3.5 w-3.5 text-muted-foreground" />
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
                                className="rounded-lg border border-border bg-card overflow-hidden"
                            >
                                <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
                                    <CollapsibleTrigger asChild>
                                        <div className="flex items-center gap-2.5 cursor-pointer flex-1">
                                            <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                                                <Euro className="h-3.5 w-3.5 text-muted-foreground" />
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

                        </div>

                        {/* ━━ Details Column 2 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                        <div className="space-y-5">

                            {/* Leasing Card (conditional) */}
                            {order.is_leasing && (
                                <Collapsible
                                    open={isLeasingOpen}
                                    onOpenChange={setIsLeasingOpen}
                                    className="rounded-lg border border-primary/20 bg-primary/3 overflow-hidden"
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
                                className="rounded-lg border border-border bg-card overflow-hidden"
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
                                                <div className="h-5 w-5 rounded-full bg-[#4ab06c]/15 flex items-center justify-center">
                                                    <ShieldCheck className="h-3 w-3 text-[#4ab06c]" />
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
                                    className="rounded-lg border border-border bg-card overflow-hidden cursor-pointer hover:bg-muted/30 transition-colors"
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
                    <DialogHeader className="px-5 py-4 border-b border-border/40">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <History className="h-4 w-4 text-muted-foreground" />
                            Verlauf
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Alle Änderungen und Ereignisse
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="px-3 py-4">
                            <OrderHistory history={order?.history || []} />
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </PageTransition >
    )
}