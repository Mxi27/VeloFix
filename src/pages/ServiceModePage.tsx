import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Plus, Check, ArrowLeft,
    X, CheckCircle2, Download, SkipForward, AlertTriangle,
    Pencil, User, Bike, Clock, Pause, Play, PackageCheck, Archive
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

    // ... (rest of render code)

    // Render Helpers
    const renderCompletionScreen = () => (
        <main className="flex-1 px-4 pb-12 w-full max-w-5xl mx-auto flex items-center justify-center min-h-[50vh]">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md"
            >
                <Card className="p-8 flex flex-col items-center text-center bg-card/60 backdrop-blur-md border-primary/20 shadow-neon">
                    <div className="h-24 w-24 rounded-full bg-green-500/10 flex items-center justify-center mb-6 shadow-[0_0_30px_-5px_rgba(34,197,94,0.3)]">
                        <CheckCircle2 className="h-12 w-12 text-green-500" />
                    </div>

                    <h2 className="text-3xl font-bold mb-2">Service abgeschlossen!</h2>
                    <p className="text-muted-foreground mb-8">
                        Alle {items.length} Arbeitsschritte wurden erfolgreich dokumentiert.
                    </p>

                    <div className="w-full space-y-3">
                        <Button
                            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                            onClick={generatePDF}
                        >
                            <Download className="mr-2 h-5 w-5" />
                            Protokoll herunterladen (PDF)
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => navigate(-1)}
                        >
                            Zurück zur Übersicht
                        </Button>
                    </div>

                    <div className="mt-8 pt-6 border-t border-border/50 w-full">
                        <p className="text-xs text-muted-foreground">
                            Sie können jederzeit zurückkehren, um Notizen zu bearbeiten.
                        </p>
                    </div>
                </Card>
            </motion.div>
        </main>
    )

    const renderActiveStep = () => (
        <main className="flex-1 px-4 pb-32 w-full max-w-5xl mx-auto flex flex-col">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStepIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 flex flex-col"
                >
                    <Card className="flex-1 flex flex-col bg-gradient-to-b from-card to-card/95 border-border/60 shadow-elevated-lg">
                        <div className="p-6 sm:p-8 flex-1 flex flex-col gap-8">

                            {/* Header */}
                            <div className="flex justify-between items-start">
                                <div className="space-y-4 max-w-[80%]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="secondary">Schritt {currentStepIndex + 1} von {items.length}</Badge>
                                        {!isReadOnly && (
                                            <button
                                                onClick={handleDeleteClick}
                                                className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                                title="Schritt löschen"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                    <h2 className="text-2xl sm:text-4xl font-bold tracking-tight leading-tight">
                                        {currentItem?.text}
                                    </h2>
                                    {currentItem?.description && (
                                        <div className="text-lg text-muted-foreground leading-relaxed bg-muted/20 p-4 rounded-lg border border-border/40">
                                            {currentItem.description}
                                        </div>
                                    )}
                                </div>
                                {currentItem?.completed && (
                                    <div className="bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 whitespace-nowrap">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Erledigt
                                    </div>
                                )}
                            </div>

                            {/* Notes Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-muted-foreground">Notiz für diesen Schritt (optional)</h3>
                                    <Button
                                        variant={currentItem?.warning ? "destructive" : "outline"}
                                        size="sm"
                                        onClick={handleToggleWarning}
                                        disabled={isSaving || isReadOnly}
                                        className={cn(
                                            "gap-1.5 h-8",
                                            currentItem?.warning
                                                ? "bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/20"
                                                : "text-muted-foreground border-border/50 hover:text-red-600 hover:border-red-200"
                                        )}
                                    >
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        {currentItem?.warning ? "Warnung aktiv" : "Als Warnung"}
                                    </Button>
                                </div>
                                <Textarea
                                    value={currentItem?.notes}
                                    onChange={(e) => handleNoteChange(e.target.value)}
                                    placeholder={isReadOnly ? "Keine Notizen" : "z.B. Bremsbeläge erneuert, Kette geölt..."}
                                    className="bg-muted/30 resize-none min-h-[150px] border-border/50 focus:bg-background transition-all text-base"
                                    disabled={isReadOnly}
                                />
                            </div>
                        </div>


                        {/* Footer Actions */}
                        <div className="p-4 sm:p-6 bg-muted/10 border-t border-border/50 flex flex-col sm:flex-row gap-3 sm:justify-between items-center">
                            <Button
                                variant="ghost"
                                onClick={() => jumpToStep(currentStepIndex - 1)}
                                disabled={currentStepIndex === 0}
                                className="w-full sm:w-auto text-muted-foreground"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Zurück
                            </Button>

                            <div className="flex gap-3 w-full sm:w-auto">
                                {currentItem?.completed && (
                                    <Button
                                        variant="ghost"
                                        onClick={handleRevertStep}
                                        disabled={isSaving || isReadOnly}
                                        className="flex-1 sm:flex-none text-muted-foreground hover:text-foreground"
                                    >
                                        Als unerledigt markieren
                                    </Button>
                                )}

                                {!currentItem?.completed && (
                                    <Button
                                        variant="outline"
                                        onClick={handleSkipStep}
                                        disabled={isSaving || isReadOnly}
                                        className="flex-1 sm:flex-none border-border/50"
                                    >
                                        Überspringen
                                    </Button>
                                )}

                                <Button
                                    onClick={handleCompleteStep}
                                    disabled={isSaving || isReadOnly}
                                    className={cn(
                                        "flex-1 sm:flex-none min-w-[140px]",
                                        currentItem?.completed ? "bg-green-600 hover:bg-green-700" : ""
                                    )}
                                >
                                    {isSaving ? "Speichere..." : (currentItem?.completed ? (
                                        <>
                                            <Check className="mr-2 h-4 w-4" />
                                            Aktualisieren
                                        </>
                                    ) : (
                                        <>
                                            <Check className="mr-2 h-4 w-4" />
                                            Abschließen
                                        </>
                                    ))}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </AnimatePresence>
        </main>
    )


    return (
        <div className="flex flex-col min-h-[100dvh] bg-background relative">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 -z-10" />

            {/* Header */}
            <header className="flex-none bg-glass-bg backdrop-blur-md border-b border-glass-border px-4 py-3 sm:px-6">
                <div className="max-w-6xl mx-auto flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="mr-2">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Zurück
                            </Button>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 h-7">
                                Service-Modus
                            </Badge>
                            {isReadOnly && (
                                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                                    Nur Lesen
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Status Selector */}
                            <Select
                                value={order.status}
                                onValueChange={handleStatusChange}
                                disabled={isReadOnly || isSaving}
                            >
                                <SelectTrigger className="w-[180px] h-9 bg-background/50 border-input shadow-sm">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_FLOW.map((status) => (
                                        <SelectItem key={status.value} value={status.value}>
                                            <div className="flex items-center gap-2">
                                                <status.icon className={`h-4 w-4 ${status.color.split(' ')[0]}`} />
                                                <span>{status.label}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Customer & Bike Info Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-card/40 p-4 rounded-lg border border-border/40">
                        {/* Customer */}
                        <div className="flex items-start justify-between group">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5">
                                    <User className="h-3 w-3" />
                                    Kunde
                                </p>
                                <div className="font-semibold text-sm sm:text-base">
                                    {order.customer_name}
                                </div>
                                <div className="text-xs text-muted-foreground flex flex-col">
                                    {order.customer_email && <span>{order.customer_email}</span>}
                                    {order.customer_phone && <span>{order.customer_phone}</span>}
                                </div>
                            </div>
                            {!isReadOnly && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => setIsEditCustomerOpen(true)}
                                >
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                            )}
                        </div>

                        {/* Bike */}
                        <div className="flex items-start justify-between group border-t sm:border-t-0 sm:border-l border-border/40 pt-4 sm:pt-0 sm:pl-4">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5">
                                    <Bike className="h-3 w-3" />
                                    Fahrrad
                                </p>
                                <div className="font-semibold text-sm sm:text-base">
                                    {order.bike_model} <span className="text-muted-foreground font-normal">({order.bike_type || 'Typ n.a.'})</span>
                                </div>
                                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                                    {order.frame_number && (
                                        <span title="Rahmennummer"># {order.frame_number}</span>
                                    )}
                                    {order.frame_size && (
                                        <span title="Rahmengröße">Größe: {order.frame_size}</span>
                                    )}
                                    {order.bike_color && (
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full border border-border" style={{ backgroundColor: order.bike_color }}></span>
                                            {order.bike_color}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {!isReadOnly && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => setIsEditBikeOpen(true)}
                                >
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Progress Bar Area - Show only if NOT finished */}
            {!isFinished ? (
                <div className="flex-none px-4 py-6 sm:px-6 max-w-5xl mx-auto w-full space-y-6">
                    <Card className="p-4 sm:p-6 bg-card/60 backdrop-blur-sm border-border/50">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-medium text-muted-foreground">Fortschritt</span>
                            <span className="text-sm font-bold">{currentStepIndex + 1} / {items.length} Schritte</span>
                        </div>
                        <div className="h-3 w-full bg-secondary/50 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-primary"
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                    </Card>

                    {/* Step Navigation Bubbles */}
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start items-center">
                        {items.map((item, idx) => {
                            let statusColor = "bg-muted text-muted-foreground border-border"
                            if (idx === currentStepIndex) statusColor = "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                            else if (item.completed) statusColor = "bg-green-500/20 text-green-600 border-green-500/30"
                            else if (item.skipped) statusColor = "bg-yellow-500/20 text-yellow-600 border-yellow-500/30"

                            return (
                                <button
                                    key={idx}
                                    onClick={() => jumpToStep(idx)}
                                    className={cn(
                                        "h-10 w-10 flex items-center justify-center rounded-lg border text-sm font-medium transition-all hover:scale-105 active:scale-95",
                                        statusColor
                                    )}
                                >
                                    {item.completed ? <Check className="h-5 w-5" /> : (
                                        item.skipped ? <SkipForward className="h-4 w-4" /> : (idx + 1)
                                    )}
                                </button>
                            )
                        })}

                        {/* Add Step Button */}
                        {!isReadOnly && (
                            <button
                                onClick={() => setIsAddStepOpen(true)}
                                className="h-10 w-10 flex items-center justify-center rounded-lg border border-dashed border-primary/50 text-primary hover:bg-primary/5 transition-all"
                                title="Schritt hinzufügen"
                            >
                                <Plus className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>
            ) : null}


            {/* Main Content Area */}
            {isFinished ? renderCompletionScreen() : renderActiveStep()}


            {/* Add Step Dialog */}
            <Dialog open={isAddStepOpen} onOpenChange={setIsAddStepOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Extra Schritt hinzufügen</DialogTitle>
                        <DialogDescription>
                            Fügen Sie einen neuen Arbeitsschritt am Ende der Liste hinzu.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="step-name">Bezeichnung</Label>
                            <Input
                                id="step-name"
                                value={newStepText}
                                onChange={(e) => setNewStepText(e.target.value)}
                                placeholder="z.B. Probefahrt durchführen"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="step-desc">Beschreibung (Optional)</Label>
                            <Textarea
                                id="step-desc"
                                value={newStepDescription}
                                onChange={(e) => setNewStepDescription(e.target.value)}
                                placeholder="Zusätzliche Anweisungen oder Details..."
                                className="resize-none h-24"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddStepOpen(false)}>
                            Abbrechen
                        </Button>
                        <Button onClick={handleAddStep} disabled={!newStepText.trim() || isSaving}>
                            Hinzufügen
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Schritt löschen</AlertDialogTitle>
                        <AlertDialogDescription>
                            Möchten Sie den Schritt "{currentItem?.text}" wirklich löschen? Dies kann nicht rückgängig gemacht werden.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSaving}>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                confirmDeleteStep()
                            }}
                            disabled={isSaving}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Löschen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Customer Dialog */}
            <Dialog open={isEditCustomerOpen} onOpenChange={setIsEditCustomerOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Kundendaten bearbeiten</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="c-name">Name</Label>
                            <Input id="c-name" value={editCustomerName} onChange={e => setEditCustomerName(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="c-email">E-Mail</Label>
                            <Input id="c-email" value={editCustomerEmail} onChange={e => setEditCustomerEmail(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="c-phone">Telefon</Label>
                            <Input id="c-phone" value={editCustomerPhone} onChange={e => setEditCustomerPhone(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditCustomerOpen(false)}>Abbrechen</Button>
                        <Button onClick={handleSaveCustomer} disabled={isSaving}>Speichern</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Bike Dialog */}
            <Dialog open={isEditBikeOpen} onOpenChange={setIsEditBikeOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Fahrraddaten bearbeiten</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="b-model">Modell</Label>
                                <Input id="b-model" value={editBikeModel} onChange={e => setEditBikeModel(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="b-type">Typ</Label>
                                <Input id="b-type" value={editBikeType} onChange={e => setEditBikeType(e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="b-frame">Rahmennummer</Label>
                                <Input id="b-frame" value={editFrameNumber} onChange={e => setEditFrameNumber(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="b-size">Rahmengröße</Label>
                                <Input id="b-size" value={editFrameSize} onChange={e => setEditFrameSize(e.target.value)} />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="b-color">Farbe</Label>
                            <Input id="b-color" value={editColor} onChange={e => setEditColor(e.target.value)} />
                        </div>
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
                    // Only allow closing if selection was made or if we decide to exit
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
