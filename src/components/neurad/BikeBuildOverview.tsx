import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    ArrowLeft, Wrench, User, Bike, ShieldCheck, Trash2, Pencil,
    Zap, Key, StickyNote, TrendingUp, ZapOff
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { NEURAD_STATUS_MAP, NEURAD_STATUSES } from "@/lib/constants"
import useSWR from "swr"

interface BikeBuildOverviewProps {
    build: any
    returnPath?: string
    onStartWorkshop: () => void
    onStartControl: () => void
    onDelete: () => void
    onUpdate?: () => void
}

export function BikeBuildOverview({ build, returnPath = '/dashboard/bike-builds', onStartWorkshop, onStartControl, onDelete, onUpdate }: BikeBuildOverviewProps) {
    const navigate = useNavigate()
    const { userRole, workshopId } = useAuth()
    const { employees } = useEmployee()
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    // Fetch real step count for accurate progress
    const { data: stepCount = 0 } = useSWR(
        workshopId ? ['neurad_step_count', workshopId, build.checklist_template] : null,
        async () => {
            let q = supabase.from('neurad_steps').select('id', { count: 'exact', head: true })
                .eq('workshop_id', workshopId).eq('is_active', true)
            if (build.checklist_template) q = q.eq('template_name', build.checklist_template)
            const { count } = await q
            return count || 0
        },
        { revalidateOnFocus: false }
    )

    // Assignment Logic
    const [showSelectionModal, setShowSelectionModal] = useState(false)
    const [assignmentType, setAssignmentType] = useState<'mechanic' | 'qc'>('mechanic')
    const [isSaving, setIsSaving] = useState(false)

    // Edit dialogs state
    const [isEditBikeOpen, setIsEditBikeOpen] = useState(false)
    const [isEditNotesOpen, setIsEditNotesOpen] = useState(false)
    const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false)

    // Bike edit fields
    const [editBrand, setEditBrand] = useState("")
    const [editModel, setEditModel] = useState("")
    const [editColor, setEditColor] = useState("")
    const [editFrameSize, setEditFrameSize] = useState("")
    const [editInternalNumber, setEditInternalNumber] = useState("")
    const [editIsEbike, setEditIsEbike] = useState(false)
    const [editEbikeSystem, setEditEbikeSystem] = useState("")
    const [editBatterySerial, setEditBatterySerial] = useState("")
    const [editKeyNumber, setEditKeyNumber] = useState("")

    // Notes edit
    const [editNotes, setEditNotes] = useState("")

    // Customer edit
    const [editCustomerName, setEditCustomerName] = useState("")
    const [editCustomerEmail, setEditCustomerEmail] = useState("")

    const getEmployeeName = (id: string) =>
        employees?.find(e => e.id === id)?.name || "Unbekannt"

    const openSelectionModal = (type: 'mechanic' | 'qc') => {
        setAssignmentType(type)
        setShowSelectionModal(true)
    }

    const handleAssignment = async (employeeId: string) => {
        const updateData = assignmentType === 'mechanic'
            ? { assigned_employee_id: employeeId }
            : { qc_mechanic_id: employeeId }
        const { error } = await supabase.from('bike_builds').update(updateData).eq('id', build.id)
        if (error) toast.error("Fehler bei der Zuweisung")
        else {
            toast.success("Zuweisung aktualisiert")
            setShowSelectionModal(false)
            onUpdate?.()
        }
    }

    const handleStatusChange = async (newStatus: string) => {
        setIsSaving(true)
        try {
            const { error } = await supabase.from('bike_builds').update({ status: newStatus }).eq('id', build.id)
            if (error) throw error
            toast.success("Status aktualisiert")
            onUpdate?.()
        } catch { toast.error("Fehler beim Status") } finally { setIsSaving(false) }
    }

    const openEditBike = () => {
        setEditBrand(build.brand || "")
        setEditModel(build.model || "")
        setEditColor(build.color || "")
        setEditFrameSize(build.frame_size || "")
        setEditInternalNumber(build.internal_number || "")
        setEditIsEbike(build.is_ebike || false)
        setEditEbikeSystem(build.ebike_system || "")
        setEditBatterySerial(build.battery_serial || "")
        setEditKeyNumber(build.key_number || "")
        setIsEditBikeOpen(true)
    }

    const openEditNotes = () => {
        setEditNotes(build.notes || "")
        setIsEditNotesOpen(true)
    }

    const openEditCustomer = () => {
        setEditCustomerName(build.customer_name || "")
        setEditCustomerEmail(build.customer_email || "")
        setIsEditCustomerOpen(true)
    }

    const handleSaveBike = async () => {
        setIsSaving(true)
        try {
            const { error } = await supabase.from('bike_builds').update({
                brand: editBrand,
                model: editModel,
                color: editColor,
                frame_size: editFrameSize,
                internal_number: editInternalNumber,
                is_ebike: editIsEbike,
                ebike_system: editIsEbike ? editEbikeSystem || null : null,
                battery_serial: editIsEbike ? editBatterySerial || null : null,
                key_number: editKeyNumber || null,
            }).eq('id', build.id)
            if (error) throw error
            toast.success("Fahrraddaten gespeichert")
            setIsEditBikeOpen(false)
            onUpdate?.()
        } catch { toast.error("Fehler beim Speichern") } finally { setIsSaving(false) }
    }

    const handleSaveNotes = async () => {
        setIsSaving(true)
        try {
            const { error } = await supabase.from('bike_builds').update({ notes: editNotes || null }).eq('id', build.id)
            if (error) throw error
            toast.success("Notizen gespeichert")
            setIsEditNotesOpen(false)
            onUpdate?.()
        } catch { toast.error("Fehler beim Speichern") } finally { setIsSaving(false) }
    }

    const handleSaveCustomer = async () => {
        setIsSaving(true)
        try {
            const { error } = await supabase.from('bike_builds').update({
                customer_name: editCustomerName,
                customer_email: editCustomerEmail || null,
            }).eq('id', build.id)
            if (error) throw error
            toast.success("Kundendaten gespeichert")
            setIsEditCustomerOpen(false)
            onUpdate?.()
        } catch { toast.error("Fehler beim Speichern") } finally { setIsSaving(false) }
    }

    // Progress stats
    const assemblyProg = build.assembly_progress
    const completedSteps = assemblyProg?.completed_steps?.length || 0
    const skippedSteps = assemblyProg?.skipped_steps?.length || 0
    const totalSteps = stepCount || (completedSteps + skippedSteps) || 0
    const assemblyPct = totalSteps > 0 ? Math.round(((completedSteps + skippedSteps) / totalSteps) * 100) : (completedSteps > 0 ? 100 : 0)

    const controlProg = build.control_data
    const controlVerified = controlProg?.verified_steps?.length || 0
    const controlPct = controlProg?.completed ? 100 : (totalSteps > 0 ? Math.round((controlVerified / totalSteps) * 100) : (controlVerified > 0 ? 80 : 0))

    const currentStatus = NEURAD_STATUS_MAP[build.status] || { label: build.status, color: 'bg-muted text-muted-foreground border-border/60', dotColor: 'bg-muted-foreground' }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">

            {/* ── Header ── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-primary/3 border border-primary/10 p-5">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />

                <div className="relative">
                    <Button
                        variant="ghost"
                        className="pl-0 gap-2 text-muted-foreground hover:text-foreground mb-3 h-8 text-sm"
                        onClick={() => navigate(returnPath)}
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Zurück
                    </Button>

                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl font-bold tracking-tight">
                                    {build.brand} {build.model}
                                </h1>
                                <span className="font-mono text-sm px-2.5 py-1 rounded-lg bg-muted/60 border border-border/50 text-muted-foreground">
                                    {build.internal_number}
                                </span>
                                {build.is_ebike && (
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                                        <Zap className="h-3 w-3" />
                                        E-Bike
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                <Badge
                                    variant="secondary"
                                    className={cn("border text-xs font-normal", currentStatus.color)}
                                >
                                    <div className={cn("h-1.5 w-1.5 rounded-full mr-1.5", currentStatus.dotColor)} />
                                    {currentStatus.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                    Erstellt am {new Date(build.created_at).toLocaleDateString('de-DE')}
                                </span>
                            </div>
                            {/* Status Switcher */}
                            {userRole !== 'read' && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {NEURAD_STATUSES.map(s => (
                                        <button
                                            key={s.value}
                                            disabled={isSaving}
                                            onClick={() => handleStatusChange(s.value)}
                                            className={cn(
                                                "text-xs px-3 py-1 rounded-full border transition-all",
                                                build.status === s.value
                                                    ? cn(s.color, "font-medium")
                                                    : "text-muted-foreground border-border/40 hover:border-border hover:text-foreground bg-background/50"
                                            )}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                onClick={onStartWorkshop}
                                className="bg-primary text-primary-foreground shadow-sm hover:shadow-primary/20"
                            >
                                <Wrench className="mr-2 h-4 w-4" />
                                Montage
                            </Button>
                            <Button
                                onClick={onStartControl}
                                variant="outline"
                                className="border-green-500/30 text-green-600 hover:bg-green-500/10"
                            >
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                Kontrolle
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Progress Cards ── */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                {/* Montage Progress */}
                <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-primary/10">
                                <Wrench className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="text-sm font-medium">Montage-Fortschritt</span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">
                            {completedSteps}{skippedSteps > 0 ? `+${skippedSteps}` : ''}/{totalSteps || '?'} Schritte
                        </span>
                    </div>
                    <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all",
                                assemblyPct === 100 ? "bg-green-500" : "bg-primary"
                            )}
                            style={{ width: `${assemblyPct}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1.5">
                        <span className="text-xs text-muted-foreground">
                            {assemblyProg?.last_actor?.name && `Zuletzt: ${assemblyProg.last_actor.name}`}
                        </span>
                        <span className="text-xs font-semibold">{assemblyPct}%</span>
                    </div>
                </div>

                {/* Kontroll Progress */}
                <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-green-500/10">
                                <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                            </div>
                            <span className="text-sm font-medium">Kontroll-Fortschritt</span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">
                            {controlVerified}/{totalSteps || '?'} geprüft
                        </span>
                    </div>
                    <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all",
                                controlPct === 100 ? "bg-green-500" : "bg-indigo-500"
                            )}
                            style={{ width: `${controlPct}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1.5">
                        <span className="text-xs text-muted-foreground">
                            {controlProg?.inspector?.name && `Prüfer: ${controlProg.inspector.name}`}
                        </span>
                        <span className="text-xs font-semibold">{controlProg?.completed ? '✓ Abgeschlossen' : `${controlPct}%`}</span>
                    </div>
                </div>
            </div>

            {/* ── Main Content Grid ── */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                {/* Fahrrad-Daten */}
                <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20">
                        <div className="flex items-center gap-2">
                            <Bike className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold">Fahrrad</h3>
                        </div>
                        {userRole !== 'read' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={openEditBike}>
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                        )}
                    </div>
                    <div className="p-4 space-y-3">
                        <InfoRow label="Interne Nr." value={build.internal_number} mono />
                        <InfoRow label="Marke" value={build.brand} />
                        <InfoRow label="Modell" value={build.model} />
                        <InfoRow label="Farbe" value={build.color} />
                        <InfoRow label="Rahmengröße" value={build.frame_size} />

                        {/* E-Bike Section */}
                        <div className="pt-2 border-t border-border/30">
                            <div className="flex items-center gap-2 mb-2">
                                {build.is_ebike ? (
                                    <Zap className="h-4 w-4 text-amber-500" />
                                ) : (
                                    <ZapOff className="h-4 w-4 text-muted-foreground/40" />
                                )}
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    {build.is_ebike ? 'E-Bike' : 'Kein E-Bike'}
                                </span>
                            </div>
                            {build.is_ebike && (
                                <div className="space-y-2 pl-1">
                                    <InfoRow label="System" value={build.ebike_system} />
                                    <InfoRow label="Akku-Nr." value={build.battery_serial} mono />
                                </div>
                            )}
                        </div>

                        {/* Key Number */}
                        {build.key_number && (
                            <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                                <Key className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Schlüssel</span>
                                <span className="font-mono text-sm ml-auto">{build.key_number}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Kunde */}
                <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold">Kunde</h3>
                        </div>
                        {userRole !== 'read' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={openEditCustomer}>
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                        )}
                    </div>
                    <div className="p-4 space-y-3">
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Name</p>
                            <p className="text-sm font-medium">{build.customer_name || <span className="text-muted-foreground italic text-xs">Lagerbestand</span>}</p>
                        </div>
                        {build.customer_email && (
                            <div>
                                <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                                <p className="text-sm">{build.customer_email}</p>
                            </div>
                        )}

                        {/* Team Assignment */}
                        <div className="pt-3 border-t border-border/30 space-y-3">
                            <AssignmentRow
                                label="Monteur"
                                icon={<Wrench className="h-3.5 w-3.5 text-muted-foreground" />}
                                employeeId={build.assigned_employee_id}
                                getEmployeeName={getEmployeeName}
                                canEdit={userRole !== 'read'}
                                onAssign={() => openSelectionModal('mechanic')}
                            />
                            <AssignmentRow
                                label="QC Prüfer"
                                icon={<ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />}
                                employeeId={build.qc_mechanic_id}
                                getEmployeeName={getEmployeeName}
                                canEdit={userRole !== 'read'}
                                onAssign={() => openSelectionModal('qc')}
                            />
                        </div>
                    </div>
                </div>

                {/* Notizen */}
                <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20">
                        <div className="flex items-center gap-2">
                            <StickyNote className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold">Notizen</h3>
                        </div>
                        {userRole !== 'read' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={openEditNotes}>
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                        )}
                    </div>
                    <div className="p-4">
                        {build.notes ? (
                            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{build.notes}</p>
                        ) : (
                            <div
                                className="flex flex-col items-center gap-2 py-6 text-center cursor-pointer group"
                                onClick={userRole !== 'read' ? openEditNotes : undefined}
                            >
                                <div className="p-2 rounded-lg bg-muted/40 group-hover:bg-muted/70 transition-colors">
                                    <StickyNote className="h-5 w-5 text-muted-foreground/40" />
                                </div>
                                <p className="text-xs text-muted-foreground/60">
                                    {userRole !== 'read' ? 'Klicken um Notiz hinzuzufügen' : 'Keine Notizen'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Checklist Vorlage ── */}
            {build.checklist_template && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/40 text-sm">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Checklisten-Vorlage:</span>
                    <Badge variant="outline" className="bg-background/60">{build.checklist_template}</Badge>
                </div>
            )}

            {/* ── Modals & Dialogs ── */}

            <EmployeeSelectionModal
                open={showSelectionModal}
                onOpenChange={setShowSelectionModal}
                triggerAction={assignmentType === 'mechanic' ? "Monteur zuweisen" : "QC Prüfer zuweisen"}
                onEmployeeSelected={handleAssignment}
            />

            {/* Edit Bike Dialog */}
            <Dialog open={isEditBikeOpen} onOpenChange={setIsEditBikeOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Fahrraddaten bearbeiten</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Interne Nr.</Label>
                                <Input value={editInternalNumber} onChange={e => setEditInternalNumber(e.target.value)} placeholder="N-2024-001" className="bg-muted/30" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Schlüssel-Nr.</Label>
                                <Input value={editKeyNumber} onChange={e => setEditKeyNumber(e.target.value)} placeholder="z.B. 42A" className="bg-muted/30" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Marke</Label>
                                <Input value={editBrand} onChange={e => setEditBrand(e.target.value)} placeholder="Cube" className="bg-muted/30" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Modell</Label>
                                <Input value={editModel} onChange={e => setEditModel(e.target.value)} placeholder="Modell" className="bg-muted/30" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Farbe</Label>
                                <Input value={editColor} onChange={e => setEditColor(e.target.value)} placeholder="Farbe" className="bg-muted/30" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Rahmengröße</Label>
                                <Input value={editFrameSize} onChange={e => setEditFrameSize(e.target.value)} placeholder="z.B. 54cm / L" className="bg-muted/30" />
                            </div>
                        </div>

                        {/* E-Bike Toggle */}
                        <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Zap className={cn("h-4 w-4", editIsEbike ? "text-amber-500" : "text-muted-foreground/40")} />
                                    <Label className="text-sm font-medium">E-Bike</Label>
                                </div>
                                <Switch checked={editIsEbike} onCheckedChange={setEditIsEbike} />
                            </div>
                            {editIsEbike && (
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Antriebssystem</Label>
                                        <Input value={editEbikeSystem} onChange={e => setEditEbikeSystem(e.target.value)} placeholder="Bosch / Shimano..." className="bg-muted/30" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Akku-Nummer</Label>
                                        <Input value={editBatterySerial} onChange={e => setEditBatterySerial(e.target.value)} placeholder="Seriennummer" className="bg-muted/30" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditBikeOpen(false)}>Abbrechen</Button>
                        <Button onClick={handleSaveBike} disabled={isSaving}>
                            {isSaving ? "Speichere..." : "Speichern"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Customer Dialog */}
            <Dialog open={isEditCustomerOpen} onOpenChange={setIsEditCustomerOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Kundendaten bearbeiten</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Name</Label>
                            <Input value={editCustomerName} onChange={e => setEditCustomerName(e.target.value)} placeholder="Kundenname" className="bg-muted/30" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Email</Label>
                            <Input value={editCustomerEmail} onChange={e => setEditCustomerEmail(e.target.value)} placeholder="Email (optional)" type="email" className="bg-muted/30" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditCustomerOpen(false)}>Abbrechen</Button>
                        <Button onClick={handleSaveCustomer} disabled={isSaving}>
                            {isSaving ? "Speichere..." : "Speichern"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Notes Dialog */}
            <Dialog open={isEditNotesOpen} onOpenChange={setIsEditNotesOpen}>
                <DialogContent className="sm:max-w-[460px]">
                    <DialogHeader>
                        <DialogTitle>Notizen bearbeiten</DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                        <Textarea
                            value={editNotes}
                            onChange={e => setEditNotes(e.target.value)}
                            placeholder="Anmerkungen zur Montage, besondere Hinweise..."
                            className="bg-muted/30 min-h-[160px] resize-none"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditNotesOpen(false)}>Abbrechen</Button>
                        <Button onClick={handleSaveNotes} disabled={isSaving}>
                            {isSaving ? "Speichere..." : "Speichern"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Danger Zone */}
            {(userRole === 'admin' || userRole === 'owner') && (
                <div className="mt-4 pt-6 border-t border-dashed border-muted-foreground/20">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Gefahrenzone</p>
                            <p className="text-xs text-muted-foreground/60">Diesen Eintrag unwiderruflich löschen</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                        >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Löschen
                        </Button>
                    </div>
                </div>
            )}

            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Montage löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Diese Neurad-Montage wird unwiderruflich gelöscht. Alle Fortschritte gehen verloren.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            Löschen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

// ── Helper Sub-Components ─────────────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-2">
            <span className="text-xs text-muted-foreground shrink-0">{label}</span>
            <span className={cn(
                "text-sm text-right break-all",
                mono ? "font-mono" : "font-medium",
                !value && "text-muted-foreground/40 italic font-normal text-xs"
            )}>
                {value || '—'}
            </span>
        </div>
    )
}

interface AssignmentRowProps {
    label: string
    icon: React.ReactNode
    employeeId?: string | null
    getEmployeeName: (id: string) => string
    canEdit: boolean
    onAssign: () => void
}

function AssignmentRow({ label, icon, employeeId, getEmployeeName, canEdit, onAssign }: AssignmentRowProps) {
    return (
        <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
                {icon}
                <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                {employeeId ? (
                    <span className="text-xs font-medium">{getEmployeeName(employeeId)}</span>
                ) : (
                    <span className="text-xs text-muted-foreground/50 italic">Nicht zugewiesen</span>
                )}
                {canEdit && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[10px] text-primary hover:text-primary/80"
                        onClick={onAssign}
                    >
                        {employeeId ? 'Ändern' : 'Zuweisen'}
                    </Button>
                )}
            </div>
        </div>
    )
}
