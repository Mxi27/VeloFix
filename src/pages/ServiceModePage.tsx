import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Plus, Check, ArrowLeft,
    X, CheckCircle2, Download, SkipForward, AlertTriangle,
    Clock, Pause, Play, PackageCheck, Archive
} from 'lucide-react'

import { Button } from '@/components/ui/button'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
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
import { Textarea } from '@/components/ui/textarea'
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { EmployeeSelectionModal } from "@/components/EmployeeSelectionModal"
import { logOrderEvent } from "@/lib/history"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import jsPDF from "jspdf"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const STATUS_FLOW = [
    { value: 'eingegangen', label: 'Eingegangen', icon: Clock, color: 'text-gray-500 bg-gray-500/10 border-gray-500/20' },
    { value: 'warten_auf_teile', label: 'Warten auf Teile', icon: Pause, color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
    { value: 'in_bearbeitung', label: 'In Bearbeitung', icon: Play, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
    { value: 'abholbereit', label: 'Abholbereit', icon: PackageCheck, color: 'text-green-500 bg-green-500/10 border-green-500/20' },
    { value: 'abgeschlossen', label: 'Abgeschlossen', icon: Archive, color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' }
]

interface ChecklistItem {
    text: string
    description?: string // Added description
    completed: boolean
    notes?: string
    skipped?: boolean
    warning?: boolean // Warning flag for items that need customer attention
}

export default function ServiceModePage() {
    const { orderId } = useParams()
    const navigate = useNavigate()
    const { user, userRole } = useAuth() // Fallback
    const { activeEmployee, isKioskMode, selectEmployee, clearSelectedEmployee } = useEmployee()
    const isReadOnly = userRole === 'read'

    // Kiosk Selection State
    const [showEmployeeSelect, setShowEmployeeSelect] = useState(false)

    // State
    const [loading, setLoading] = useState(true)
    const [order, setOrder] = useState<any>(null)
    const [items, setItems] = useState<ChecklistItem[]>([])
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [isSaving, setIsSaving] = useState(false)
    const [isFinished, setIsFinished] = useState(false) // New state for completion screen

    // Add Step Dialog
    const [isAddStepOpen, setIsAddStepOpen] = useState(false)
    const [newStepText, setNewStepText] = useState("")
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)

    // Edit Headers State
    const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false)
    const [editCustomerName, setEditCustomerName] = useState("")
    const [editCustomerEmail, setEditCustomerEmail] = useState("")
    const [editCustomerPhone, setEditCustomerPhone] = useState("")

    const [isEditBikeOpen, setIsEditBikeOpen] = useState(false)
    const [editBikeModel, setEditBikeModel] = useState("")
    const [editBikeType, setEditBikeType] = useState("")
    const [editFrameNumber, setEditFrameNumber] = useState("")
    const [editFrameSize, setEditFrameSize] = useState("")
    const [editColor, setEditColor] = useState("")



    // Kiosk Pending Action State


    // Kiosk Mode Enforcer
    // Force re-selection on entry (Mount)
    const selectionMade = useRef(false) // Track if selection happened

    // Kiosk Mode Enforcer
    // Force re-selection on entry (Mount)
    useEffect(() => {
        if (isKioskMode) {
            clearSelectedEmployee()
            setShowEmployeeSelect(true)
            selectionMade.current = false
        }
    }, [isKioskMode])

    // REMOVED continuous useEffect to avoid double-open loop

    // Initial fetch
    useEffect(() => {
        if (!orderId) return

        const fetchOrder = async () => {
            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('id', orderId)
                    .single()

                if (error) throw error

                setOrder(data)

                // Initialize edit states
                setEditCustomerName(data.customer_name || "")
                setEditCustomerEmail(data.customer_email || "")
                setEditCustomerPhone(data.customer_phone || "")

                setEditBikeModel(data.bike_model || "")
                setEditBikeType(data.bike_type || "")
                setEditFrameNumber(data.frame_number || "")
                setEditFrameSize(data.frame_size || "")
                setEditColor(data.bike_color || "")



                // Parse checklist
                let parsedItems: ChecklistItem[] = []
                if (Array.isArray(data.checklist)) {
                    parsedItems = data.checklist.map((item: any) => ({
                        ...item,
                        text: typeof item === 'string' ? item : item.text,
                        description: typeof item === 'string' ? '' : (item.description || ''), // Parse description
                        completed: typeof item === 'string' ? false : (item.completed || false),
                        notes: typeof item === 'string' ? '' : (item.notes || ''),
                        skipped: typeof item === 'string' ? false : (item.skipped || false),
                    }))
                }
                setItems(parsedItems)

                // Find first uncompleted step (that isn't skipped)
                const firstTodo = parsedItems.findIndex(i => !i.completed && !i.skipped)
                if (firstTodo >= 0) setCurrentStepIndex(firstTodo)

            } catch (err: any) {
                console.error("Error loading order:", err)
                toast.error("Fehler", "Auftrag konnte nicht geladen werden.")
            } finally {
                setLoading(false)
            }
        }

        fetchOrder()
    }, [orderId])

    // Check if finished whenever items or index changes
    useEffect(() => {
        if (items.length > 0 && items.every(i => i.completed || i.skipped)) {
            // Only auto-switch to finished if we are literally past the last item or explicitly triggered
        }
    }, [items])


    // Save helper
    const saveChecklist = async (updatedItems: ChecklistItem[]) => {
        if (!orderId) return
        setIsSaving(true)
        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    checklist: updatedItems,
                })
                .eq('id', orderId)

            if (error) throw error
        } catch (err) {
            console.error("Error saving checklist:", err)
            toast.error("Speichern fehlgeschlagen", "Bitte versuchen Sie es erneut.")
        } finally {
            setIsSaving(false)
        }
    }

    // Actions
    const handleCompleteStep = async () => {
        if (isSaving) return
        const currentItemText = items[currentStepIndex].text // Capture text before index change

        const newItems = [...items]
        newItems[currentStepIndex] = {
            ...newItems[currentStepIndex],
            completed: true,
            skipped: false
        }
        setItems(newItems)
        await saveChecklist(newItems)

        // Log History Event Immediately
        if (orderId) {
            const actor = activeEmployee ? { id: activeEmployee.id, name: activeEmployee.name } : undefined

            logOrderEvent(orderId, {
                type: 'service_step',
                title: currentItemText, // Use the step text as title
                description: `Schritt "${currentItemText}" erledigt`,
                actor: actor
            }, user).catch(console.error)
        }

        // Auto-advance or Finish
        if (currentStepIndex < items.length - 1) {
            setCurrentStepIndex(prev => prev + 1)
        } else {
            setIsFinished(true) // Show completion screen
            toast.success("Fertig!", "Alle Schritte abgeschlossen.")
        }
    }

    const handleSkipStep = async () => {
        if (isSaving) return
        const newItems = [...items]
        newItems[currentStepIndex] = {
            ...newItems[currentStepIndex],
            completed: false, // Skipped is effectively "done" for navigation but marked skipped
            skipped: true
        }
        setItems(newItems)
        await saveChecklist(newItems)

        if (currentStepIndex < items.length - 1) {
            setCurrentStepIndex(prev => prev + 1)
        } else {
            setIsFinished(true)
        }
    }

    const handleRevertStep = async () => {
        if (isSaving) return
        const newItems = [...items]
        newItems[currentStepIndex] = {
            ...newItems[currentStepIndex],
            completed: false,
            skipped: false
        }
        setItems(newItems)
        await saveChecklist(newItems)
        toast.success("Status zurückgesetzt")
    }

    const handleNoteChange = (text: string) => {
        const newItems = [...items]
        newItems[currentStepIndex].notes = text
        setItems(newItems)
    }

    const [newStepDescription, setNewStepDescription] = useState("") // Added state

    /* ... */

    const handleAddStep = async () => {
        if (!newStepText.trim()) return

        const newStep: ChecklistItem = {
            text: newStepText,
            description: newStepDescription, // Save description
            completed: false,
            notes: ''
        }

        /* ... */

        const newItems = [...items, newStep]
        setItems(newItems)
        setNewStepText("")
        setNewStepDescription("") // Reset
        setIsAddStepOpen(false)

        await saveChecklist(newItems)
        toast.success("Schritt hinzugefügt")
        setCurrentStepIndex(newItems.length - 1)
    }

    const handleDeleteClick = () => {
        if (items.length <= 1) {
            toast.error("Nicht möglich", "Der letzte verbleibende Schritt kann nicht gelöscht werden.")
            return
        }
        setDeleteModalOpen(true)
    }

    const confirmDeleteStep = async () => {
        const newItems = items.filter((_, idx) => idx !== currentStepIndex)
        setItems(newItems)

        let newIndex = currentStepIndex
        if (newIndex >= newItems.length) {
            newIndex = newItems.length - 1
        }
        setCurrentStepIndex(newIndex)
        setDeleteModalOpen(false)

        await saveChecklist(newItems)
        toast.success("Schritt gelöscht")
    }

    // Toggle Warning
    const handleToggleWarning = async () => {
        if (isSaving) return
        const newItems = [...items]
        newItems[currentStepIndex] = {
            ...newItems[currentStepIndex],
            warning: !newItems[currentStepIndex].warning
        }
        setItems(newItems)
        await saveChecklist(newItems)
        toast.success(newItems[currentStepIndex].warning ? "Warnung aktiviert" : "Warnung entfernt")
    }



    // --- Data Save Handlers ---

    const handleSaveCustomer = async () => {
        if (!order) return
        setIsSaving(true)
        try {
            const updates = {
                customer_name: editCustomerName,
                customer_email: editCustomerEmail || null,
                customer_phone: editCustomerPhone || null
            }

            const { error } = await supabase
                .from('orders')
                .update(updates)
                .eq('id', order.id)

            if (error) throw error

            setOrder({ ...order, ...updates })
            setIsEditCustomerOpen(false)
            toast.success("Kundendaten gespeichert")

            logOrderEvent(order.id, {
                type: 'info',
                title: 'Kundendaten geändert',
                description: `Kundendaten im Service-Modus bearbeitet`,
                actor: activeEmployee ? { id: activeEmployee.id, name: activeEmployee.name } : undefined,
                metadata: updates
            }, user)

        } catch (e: any) {
            toast.error("Fehler", e.message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleSaveBike = async () => {
        if (!order) return
        setIsSaving(true)
        try {
            const updates = {
                bike_model: editBikeModel,
                bike_type: editBikeType || null,
                bike_color: editColor || null,
                frame_number: editFrameNumber || null,
                frame_size: editFrameSize || null
            }

            const { error } = await supabase
                .from('orders')
                .update(updates)
                .eq('id', order.id)

            if (error) throw error

            setOrder({ ...order, ...updates })
            setIsEditBikeOpen(false)
            toast.success("Fahrraddaten gespeichert")

            logOrderEvent(order.id, {
                type: 'info',
                title: 'Fahrraddaten geändert',
                description: `Fahrraddaten im Service-Modus bearbeitet`,
                actor: activeEmployee ? { id: activeEmployee.id, name: activeEmployee.name } : undefined,
                metadata: updates
            }, user)

        } catch (e: any) {
            toast.error("Fehler", e.message)
        } finally {
            setIsSaving(false)
        }
    }



    const handleStatusChange = async (newStatus: string) => {
        if (!order) return

        // Prevent accidental completion if items not done? Optional.
        // User asked for "more like orders detail page", which allows status change anytime.

        setIsSaving(true)
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', order.id)

            if (error) throw error

            // Refresh local state
            setOrder({ ...order, status: newStatus })

            const statusLabel = STATUS_FLOW.find(s => s.value === newStatus)?.label || newStatus
            toast.success(`Status geändert: ${statusLabel}`)

            logOrderEvent(order.id, {
                type: 'status_change',
                title: 'Status geändert',
                description: `Status zu "${statusLabel}" geändert (Service-Modus)`,
                actor: activeEmployee ? { id: activeEmployee.id, name: activeEmployee.name } : undefined,
                metadata: { old_status: order.status, new_status: newStatus }
            }, user)

        } catch (e: any) {
            toast.error("Fehler", e.message)
        } finally {
            setIsSaving(false)
        }
    }

    // Navigation
    const jumpToStep = (index: number) => {
        saveChecklist(items)
        setCurrentStepIndex(index)
        setIsFinished(false) // If jumping back, exit finished mode
    }

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-muted-foreground">Lade Service-Modus...</p>
            </div>
        </div>
    )

    if (!order) return <div className="p-8 text-center">Auftrag nicht gefunden</div>

    const currentItem = items[currentStepIndex]
    const progressPercent = Math.round((items.filter(i => i.completed || i.skipped).length / items.length) * 100)

    // PDF Generation
    const generatePDF = () => {
        if (!order) return

        const doc = new jsPDF()

        // Colors
        const primaryColor = [0, 0, 0] // Black
        const accentColor = [34, 197, 94] // VeloFix Green
        const mutedColor = [100, 100, 100] // Gray
        const lineColor = [230, 230, 230] // Light Gray

        // Helper: Draw Check Icon
        const drawCheckIcon = (x: number, y: number) => {
            doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
            doc.roundedRect(x, y, 6, 6, 1.5, 1.5, 'F')

            // White Tick
            doc.setDrawColor(255, 255, 255)
            doc.setLineWidth(1)
            doc.lines([[1.5, 1.5], [3, -3]], x + 1.5, y + 3.5)
        }

        const drawSkipIcon = (x: number, y: number) => {
            doc.setFillColor(234, 179, 8) // Yellow
            doc.roundedRect(x, y, 6, 6, 1.5, 1.5, 'F')
            doc.setDrawColor(255, 255, 255)
            doc.setLineWidth(1)
            doc.line(x + 2, y + 3, x + 4, y + 3) // Dash
        }

        // Warning Icon (Red with exclamation)
        const drawWarningIcon = (x: number, y: number) => {
            doc.setFillColor(239, 68, 68) // Red
            doc.roundedRect(x, y, 6, 6, 1.5, 1.5, 'F')
            // White exclamation mark
            doc.setDrawColor(255, 255, 255)
            doc.setLineWidth(0.8)
            doc.line(x + 3, y + 1.5, x + 3, y + 3.5) // Line
            doc.circle(x + 3, y + 4.8, 0.4, 'F') // Dot
            doc.setFillColor(255, 255, 255)
            doc.circle(x + 3, y + 4.8, 0.4, 'F')
        }

        // --- HEADER ---
        doc.setFont("helvetica", "bold")
        doc.setFontSize(28)
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.text("VeloFix", 14, 25)

        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)
        doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
        doc.text("SERVICE- UND INSPEKTIONSBERICHT", 14, 35)

        // Divider
        doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2])
        doc.setLineWidth(0.5)
        doc.line(14, 42, 196, 42)

        // --- INFO GRID ---
        const startY = 55
        const col2X = 110 // Second column starts here
        const rowHeight = 15

        const drawLabel = (label: string, value: string, x: number, y: number) => {
            doc.setFontSize(8)
            doc.setFont("helvetica", "bold")
            doc.setTextColor(150, 150, 150)
            doc.text(label.toUpperCase(), x, y)

            doc.setFontSize(11)
            doc.setFont("helvetica", "bold")
            doc.setTextColor(0, 0, 0)
            doc.text(value, x, y + 6)
        }

        // Row 1
        drawLabel("AUFTRAGSNUMMER", order.order_number, 14, startY)
        drawLabel("DATUM", new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' }), col2X, startY)

        // Row 2
        drawLabel("KUNDE", order.customer_name, 14, startY + rowHeight)
        drawLabel("FAHRRAD", `${order.bike_model} ${order.bike_type ? `(${order.bike_type})` : ''}`, col2X, startY + rowHeight)

        // Divider
        doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2])
        doc.line(14, startY + rowHeight + 15, 196, startY + rowHeight + 15)


        // --- CHECKLIST CONTENT ---
        let contentY = startY + rowHeight + 30

        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(0, 0, 0)
        doc.text("Durchgeführte Arbeiten", 14, contentY)

        contentY += 12 // Spacing after header

        items.forEach((item) => {
            // Page Break Check
            if (contentY > 270) {
                doc.addPage()
                contentY = 20
            }

            // 1. Icon
            if (item.warning) {
                drawWarningIcon(14, contentY - 4)
            } else if (item.completed) {
                drawCheckIcon(14, contentY - 4)
            } else if (item.skipped) {
                drawSkipIcon(14, contentY - 4)
            } else {
                // Open square
                doc.setDrawColor(220)
                doc.roundedRect(14, contentY - 4, 6, 6, 1.5, 1.5, 'D')
            }

            // 2. Title
            doc.setFontSize(10)
            doc.setFont("helvetica", "bold")
            doc.setTextColor(0, 0, 0)
            doc.text(item.text, 26, contentY)

            // 3. Metadata (Date • Mechanic • Note)
            contentY += 5
            doc.setFontSize(8)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(130, 130, 130)

            let metaParts = []

            // If completed, show timestamp
            if (item.completed) {
                metaParts.push(`${new Date().toLocaleDateString('de-DE')} • VeloFix Team`)
            } else if (item.skipped) {
                metaParts.push("Übersprungen")
            }

            if (item.notes) {
                metaParts.push(item.notes)
            }

            const metaText = metaParts.join(" • ")
            if (metaText) {
                doc.text(metaText, 26, contentY)
            }

            contentY += 12 // Spacing to next item
        })

        // Footer
        const pageHeight = doc.internal.pageSize.height
        doc.setFontSize(8)
        doc.setTextColor(200)
        doc.text("Generiert mit VeloFix Software", 14, pageHeight - 10)

        doc.save(`VeloFix_Bericht_${order.order_number}.pdf`)
        toast.success("PDF erstellt", "Neues Design angewendet.")
    }

    // Render section — Jony Ive redesign
    const completedCount = items.filter(i => i.completed || i.skipped).length
    const currentStatus = STATUS_FLOW.find(s => s.value === order?.status)

    const renderCompletionScreen = () => (
        <div className="flex-1 flex items-center justify-center px-6 pb-16">
            <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-sm flex flex-col items-center text-center gap-6"
            >
                <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-green-500/20 blur-2xl scale-150" />
                    <div className="relative h-24 w-24 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="h-12 w-12 text-green-500" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Fertig!</h2>
                    <p className="text-muted-foreground">
                        Alle {items.length} Arbeitsschritte dokumentiert.
                    </p>
                </div>
                <div className="w-full flex flex-col gap-3 pt-2">
                    <button
                        onClick={generatePDF}
                        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-base font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all"
                    >
                        <Download className="h-5 w-5" />
                        Protokoll herunterladen
                    </button>
                    <button
                        onClick={() => navigate(-1)}
                        className="w-full h-11 rounded-2xl text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Zurück zur Übersicht
                    </button>
                </div>
            </motion.div>
        </div>
    )

    const renderActiveStep = () => (
        <div className="flex-1 flex flex-col px-4 pb-6 w-full max-w-2xl mx-auto">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStepIndex}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col gap-4 flex-1"
                >
                    {/* Step Card */}
                    <div className={cn(
                        "flex-1 flex flex-col rounded-3xl border bg-card/60 backdrop-blur-xl overflow-hidden",
                        currentItem?.warning ? "border-red-500/30" : "border-border/40"
                    )}>
                        {/* Card header */}
                        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0 space-y-3">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                                    Schritt {currentStepIndex + 1} von {items.length}
                                </p>
                                <h2 className="text-3xl font-bold tracking-tight leading-tight">
                                    {currentItem?.text}
                                </h2>
                                {currentItem?.description && (
                                    <p className="text-base text-muted-foreground leading-relaxed">
                                        {currentItem.description}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0 pt-1">
                                {currentItem?.completed && (
                                    <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
                                        <Check className="h-3 w-3" /> Erledigt
                                    </span>
                                )}
                                {!isReadOnly && (
                                    <button
                                        onClick={() => handleToggleWarning()}
                                        title="Warnung setzen"
                                        className={cn(
                                            "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                                            currentItem?.warning
                                                ? "bg-red-500/15 text-red-500"
                                                : "text-muted-foreground/40 hover:text-muted-foreground"
                                        )}
                                    >
                                        <AlertTriangle className="h-4 w-4" />
                                    </button>
                                )}
                                {!isReadOnly && (
                                    <button
                                        onClick={handleDeleteClick}
                                        className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-red-500 transition-colors"
                                        title="Schritt löschen"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-border/30 mx-6" />

                        {/* Note area — borderless, integrated */}
                        <div className="flex-1 px-6 py-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 mb-2">
                                Notiz
                            </p>
                            <textarea
                                value={currentItem?.notes || ''}
                                onChange={(e) => handleNoteChange(e.target.value)}
                                placeholder={isReadOnly ? "—" : "Befunde, verwendete Teile, Auffälligkeiten…"}
                                disabled={isReadOnly}
                                className={cn(
                                    "w-full bg-transparent text-sm leading-relaxed resize-none outline-none text-foreground placeholder:text-muted-foreground/30 min-h-[80px]",
                                    "disabled:cursor-not-allowed"
                                )}
                                rows={4}
                            />
                        </div>

                        {/* Actions footer */}
                        <div className="px-4 pb-5 flex flex-col gap-2">
                            {/* Secondary row */}
                            <div className="flex items-center justify-between px-2">
                                <button
                                    onClick={() => jumpToStep(currentStepIndex - 1)}
                                    disabled={currentStepIndex === 0}
                                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                                >
                                    <ArrowLeft className="h-3.5 w-3.5" />
                                    Zurück
                                </button>
                                {!currentItem?.completed && !isReadOnly && (
                                    <button
                                        onClick={handleSkipStep}
                                        disabled={isSaving}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Überspringen →
                                    </button>
                                )}
                                {currentItem?.completed && !isReadOnly && (
                                    <button
                                        onClick={handleRevertStep}
                                        disabled={isSaving}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Als unerledigt
                                    </button>
                                )}
                            </div>

                            {/* Primary CTA */}
                            <button
                                onClick={handleCompleteStep}
                                disabled={isSaving || isReadOnly}
                                className={cn(
                                    "w-full h-14 rounded-2xl text-base font-semibold transition-all active:scale-[0.98]",
                                    "flex items-center justify-center gap-2 shadow-lg",
                                    currentItem?.completed
                                        ? "bg-green-600 text-white shadow-green-600/20 hover:bg-green-700"
                                        : "bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90",
                                    (isSaving || isReadOnly) && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {isSaving ? (
                                    <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                ) : (
                                    <>
                                        <Check className="h-5 w-5" />
                                        {currentItem?.completed ? 'Aktualisieren' : 'Abschließen'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    )

    return (
        <div className="flex flex-col h-[100dvh] bg-background">
            {/* Ambient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-transparent pointer-events-none -z-10" />

            {/* ── Sticky Header ── */}
            <header className="flex-none border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 py-3">
                <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="text-sm">Zurück</span>
                    </button>

                    <div className="flex-1 text-center min-w-0">
                        <p className="text-sm font-semibold truncate">
                            {order?.bike_model || '—'}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                            {order?.customer_name} · {order?.order_number}
                        </p>
                    </div>

                    {/* Status pill */}
                    {currentStatus && (
                        <Select
                            value={order?.status}
                            onValueChange={handleStatusChange}
                            disabled={isReadOnly || isSaving}
                        >
                            <SelectTrigger className={cn(
                                "h-7 text-xs font-medium border rounded-full px-3 w-auto gap-1.5 shadow-none",
                                currentStatus.color
                            )}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_FLOW.map(s => (
                                    <SelectItem key={s.value} value={s.value}>
                                        <div className="flex items-center gap-2">
                                            <s.icon className={cn("h-3.5 w-3.5", s.color.split(' ')[0])} />
                                            {s.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </header>

            {/* ── Progress section ── */}
            {!isFinished && (
                <div className="flex-none px-4 pt-4 pb-2 w-full max-w-2xl mx-auto space-y-3">
                    {/* Hairline progress */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <span className="text-[11px] text-muted-foreground/60">Fortschritt</span>
                            <span className="text-[11px] font-medium text-muted-foreground">{progressPercent}% · {completedCount}/{items.length}</span>
                        </div>
                        <div className="h-0.5 w-full bg-border/60 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-primary rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 0.4 }}
                            />
                        </div>
                    </div>

                    {/* Step pills — horizontal scroll */}
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
                        {items.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => jumpToStep(idx)}
                                className={cn(
                                    "flex-none h-8 min-w-[32px] px-2 rounded-xl text-xs font-semibold border transition-all",
                                    idx === currentStepIndex
                                        ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/30"
                                        : item.completed
                                            ? "bg-green-500/10 text-green-600 border-green-500/20"
                                            : item.skipped
                                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                : "bg-muted/40 text-muted-foreground border-border/40 hover:border-border"
                                )}
                            >
                                {item.completed ? <Check className="h-3.5 w-3.5" /> :
                                    item.skipped ? <SkipForward className="h-3 w-3" /> : idx + 1}
                            </button>
                        ))}
                        {!isReadOnly && (
                            <button
                                onClick={() => setIsAddStepOpen(true)}
                                className="flex-none h-8 w-8 rounded-xl border border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-colors flex items-center justify-center"
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── Main content ── */}
            <div className="flex-1 overflow-y-auto">
                {isFinished ? renderCompletionScreen() : renderActiveStep()}
            </div>

            {/* ── Dialogs (unchanged logic) ── */}

            {/* Add Step */}
            <Dialog open={isAddStepOpen} onOpenChange={setIsAddStepOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Schritt hinzufügen</DialogTitle>
                        <DialogDescription>Neuer Schritt am Ende der Liste</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>Bezeichnung</Label>
                            <Input
                                value={newStepText}
                                onChange={(e) => setNewStepText(e.target.value)}
                                placeholder="z.B. Probefahrt durchführen"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Beschreibung (optional)</Label>
                            <Textarea
                                value={newStepDescription}
                                onChange={(e) => setNewStepDescription(e.target.value)}
                                placeholder="Zusätzliche Anweisungen…"
                                className="resize-none h-20"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddStepOpen(false)}>Abbrechen</Button>
                        <Button onClick={handleAddStep} disabled={!newStepText.trim() || isSaving}>Hinzufügen</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Schritt löschen?</AlertDialogTitle>
                        <AlertDialogDescription>„{currentItem?.text}" wird unwiderruflich entfernt.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSaving}>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); confirmDeleteStep() }}
                            disabled={isSaving}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Löschen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Customer */}
            <Dialog open={isEditCustomerOpen} onOpenChange={setIsEditCustomerOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Kundendaten bearbeiten</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2"><Label>Name</Label><Input value={editCustomerName} onChange={e => setEditCustomerName(e.target.value)} /></div>
                        <div className="grid gap-2"><Label>E-Mail</Label><Input value={editCustomerEmail} onChange={e => setEditCustomerEmail(e.target.value)} /></div>
                        <div className="grid gap-2"><Label>Telefon</Label><Input value={editCustomerPhone} onChange={e => setEditCustomerPhone(e.target.value)} /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditCustomerOpen(false)}>Abbrechen</Button>
                        <Button onClick={handleSaveCustomer} disabled={isSaving}>Speichern</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Bike */}
            <Dialog open={isEditBikeOpen} onOpenChange={setIsEditBikeOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Fahrraddaten bearbeiten</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>Modell</Label><Input value={editBikeModel} onChange={e => setEditBikeModel(e.target.value)} /></div>
                            <div className="grid gap-2"><Label>Typ</Label><Input value={editBikeType} onChange={e => setEditBikeType(e.target.value)} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>Rahmennummer</Label><Input value={editFrameNumber} onChange={e => setEditFrameNumber(e.target.value)} /></div>
                            <div className="grid gap-2"><Label>Rahmengröße</Label><Input value={editFrameSize} onChange={e => setEditFrameSize(e.target.value)} /></div>
                        </div>
                        <div className="grid gap-2"><Label>Farbe</Label><Input value={editColor} onChange={e => setEditColor(e.target.value)} /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditBikeOpen(false)}>Abbrechen</Button>
                        <Button onClick={handleSaveBike} disabled={isSaving}>Speichern</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Kiosk Employee Selection */}
            <EmployeeSelectionModal
                open={showEmployeeSelect}
                onOpenChange={(open) => {
                    if (!open && !selectionMade.current) {
                        navigate('/dashboard/orders')
                    } else {
                        setShowEmployeeSelect(open)
                    }
                }}
                onEmployeeSelected={(id) => {
                    selectionMade.current = true
                    selectEmployee(id)
                    setShowEmployeeSelect(false)
                }}
            />
        </div>
    )
}
