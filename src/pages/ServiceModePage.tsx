import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Plus, Check, ArrowLeft,
    X, Download, AlertTriangle,
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
import { cn, isUuid } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { EmployeeSelectionModal } from "@/components/EmployeeSelectionModal"
import { logOrderEvent } from "@/lib/history"
import type { WorkshopOrder } from "@/types/index"
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
    { value: 'eingegangen', label: 'Eingegangen', icon: Clock, color: 'text-blue-600 bg-blue-500/10 border-blue-500/20' },
    { value: 'warten_auf_teile', label: 'Warten auf Teile', icon: Pause, color: 'text-orange-600 bg-orange-500/10 border-orange-500/20' },
    { value: 'in_bearbeitung', label: 'In Bearbeitung', icon: Play, color: 'text-violet-600 bg-violet-500/10 border-violet-500/20' },
    { value: 'abholbereit', label: 'Abholbereit', icon: PackageCheck, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
    { value: 'abgeschlossen', label: 'Abgeschlossen', icon: Archive, color: 'text-neutral-500 bg-neutral-500/10 border-neutral-500/20' }
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
    const { activeEmployee, isSharedMode, selectEmployee, clearSelectedEmployee } = useEmployee()
    const isReadOnly = userRole === 'read'

    // Shared Mode Selection State
    const [showEmployeeSelect, setShowEmployeeSelect] = useState(false)

    // State
    const [loading, setLoading] = useState(true)
    const [order, setOrder] = useState<WorkshopOrder | null>(null)
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



    // Shared Mode Pending Action State


    // Shared Mode Enforcer
    const selectionMade = useRef(false) // Track if selection happened
    const activeItemRef = useRef<HTMLDivElement>(null)
    // Force re-selection on entry (Mount)
    useEffect(() => {
        if (isSharedMode) {
            clearSelectedEmployee()
            setShowEmployeeSelect(true)
            selectionMade.current = false
        }
    }, [isSharedMode])

    // REMOVED continuous useEffect to avoid double-open loop

    // Initial fetch
    useEffect(() => {
        if (!orderId) return

        const fetchOrder = async () => {
            try {
                const isIdUuid = isUuid(orderId)
                const { data, error } = await supabase
                    .from('orders')
                    .select('*')
                    .or(isIdUuid ? `id.eq.${orderId},order_number.eq.${orderId}` : `order_number.eq.${orderId}`)
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

            } catch (err: unknown) {
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

    // Toggle completion for any item (Todoist-style circle click)
    const handleToggleItemComplete = async (idx: number) => {
        if (isSaving || isReadOnly) return
        const newItems = [...items]
        const wasCompleted = newItems[idx].completed
        newItems[idx] = {
            ...newItems[idx],
            completed: !wasCompleted,
            skipped: false
        }
        setItems(newItems)
        await saveChecklist(newItems)

        if (!wasCompleted) {
            // Auto-advance to next uncompleted step
            const nextIdx = newItems.findIndex((item, i) => i > idx && !item.completed && !item.skipped)
            if (nextIdx >= 0) {
                setCurrentStepIndex(nextIdx)
            } else {
                // Nothing after — try from the beginning
                const firstOpen = newItems.findIndex(item => !item.completed && !item.skipped)
                if (firstOpen >= 0) setCurrentStepIndex(firstOpen)
            }

            if (orderId) {
                const actor = activeEmployee ? { id: activeEmployee.id, name: activeEmployee.name } : undefined
                logOrderEvent(orderId, {
                    type: 'service_step',
                    title: newItems[idx].text,
                    description: `Schritt "${newItems[idx].text}" erledigt`,
                    actor
                }, user).catch(console.error)
            }
            if (newItems.every(i => i.completed || i.skipped)) {
                setIsFinished(true)
                toast.success("Fertig!", "Alle Schritte abgeschlossen.")
            }
        }
    }

    // Auto-scroll active item into view
    useEffect(() => {
        if (activeItemRef.current) {
            activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
    }, [currentStepIndex])

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

            const metaParts = []

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

    // Render
    const completedCount = items.filter(i => i.completed || i.skipped).length
    const currentStatus = STATUS_FLOW.find(s => s.value === order?.status)
    const allDone = items.length > 0 && items.every(i => i.completed || i.skipped)

    // ── Completion (mobile fullscreen / desktop right panel) ──
    const renderCompletionContent = () => (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm mx-auto flex flex-col items-center text-center gap-6 py-12 px-6"
        >
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-500" strokeWidth={2} />
            </div>
            <div className="space-y-1.5">
                <h2 className="text-xl font-semibold tracking-tight">Alle Schritte erledigt</h2>
                <p className="text-sm text-muted-foreground/60">
                    {items.filter(i => i.completed).length} erledigt
                    {items.filter(i => i.skipped).length > 0 && ` · ${items.filter(i => i.skipped).length} übersprungen`}
                </p>
            </div>
            <div className="w-full flex flex-col gap-2 pt-2">
                <button
                    onClick={generatePDF}
                    className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all"
                >
                    <Download className="h-4 w-4" />
                    Protokoll herunterladen
                </button>
                <button
                    onClick={() => navigate(-1)}
                    className="w-full h-10 text-sm text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                    Zurück zur Übersicht
                </button>
            </div>
        </motion.div>
    )

    // ── Step list (left panel on desktop, full on mobile) ──
    const renderStepList = () => (
        <div className="flex flex-col w-full px-4 pt-4 pb-8">
            {/* All-done banner */}
            {allDone && !isFinished && (
                <div className="flex items-center justify-between py-3 mb-1">
                    <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-green-500/10 flex items-center justify-center">
                            <Check className="h-3.5 w-3.5 text-green-500" strokeWidth={2.5} />
                        </div>
                        <span className="text-sm font-medium text-green-600">Alle erledigt</span>
                    </div>
                    <button
                        onClick={generatePDF}
                        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                        <Download className="h-3.5 w-3.5" />
                        PDF
                    </button>
                </div>
            )}

            {/* Step list */}
            <div className="flex flex-col">
                {items.map((item, idx) => {
                    const isActive = idx === currentStepIndex && !isFinished
                    const isDone = item.completed
                    const isSkip = item.skipped

                    return (
                        <div key={idx} ref={isActive ? activeItemRef : undefined}>
                            {/* Divider */}
                            {idx > 0 && <div className={cn("h-px ml-[34px]", isActive || (idx > 0 && items[idx - 1] && idx - 1 === currentStepIndex) ? "bg-transparent" : "bg-border/30")} />}

                            <div className={cn(
                                "rounded-xl transition-all duration-200",
                                isActive && "bg-muted/40 -mx-2 px-2"
                            )}>
                                {/* Row: checkbox + title */}
                                <div
                                    className="flex items-start gap-3 py-3 cursor-pointer group"
                                    onClick={() => {
                                        if (!isActive) {
                                            jumpToStep(idx)
                                            setIsFinished(false)
                                        }
                                    }}
                                >
                                    {/* Circle checkbox */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleToggleItemComplete(idx)
                                        }}
                                        disabled={isReadOnly || isSaving}
                                        className={cn(
                                            "flex-none mt-[2px] h-[22px] w-[22px] rounded-full border-[1.5px] flex items-center justify-center transition-all duration-200",
                                            isDone
                                                ? "bg-primary border-primary text-primary-foreground"
                                                : isSkip
                                                    ? "border-amber-400/60"
                                                    : item.warning
                                                        ? "border-red-400/60 hover:border-red-500 hover:bg-red-500/10"
                                                        : isActive
                                                            ? "border-primary/60 hover:bg-primary hover:border-primary hover:text-primary-foreground"
                                                            : "border-muted-foreground/35 group-hover:border-muted-foreground/40"
                                        )}
                                    >
                                        {isDone && <Check className="h-3 w-3" strokeWidth={3} />}
                                        {isSkip && !isDone && (
                                            <div className="h-[6px] w-[6px] rounded-full bg-amber-400/60" />
                                        )}
                                    </button>

                                    {/* Title + meta */}
                                    <div className="flex-1 min-w-0">
                                        <span className={cn(
                                            "text-[15px] leading-snug transition-colors",
                                            isDone
                                                ? "line-through text-muted-foreground/60 decoration-muted-foreground/40"
                                                : isSkip
                                                    ? "text-muted-foreground/60"
                                                    : isActive
                                                        ? "text-foreground font-medium"
                                                        : "text-foreground/80"
                                        )}>
                                            {item.text}
                                        </span>
                                        {/* Preview meta for collapsed items */}
                                        {!isActive && item.notes && (
                                            <p className="text-[12px] text-muted-foreground/50 truncate mt-0.5 lg:hidden">
                                                {item.notes}
                                            </p>
                                        )}
                                    </div>

                                    {/* Right indicators */}
                                    <div className="flex items-center gap-1.5 shrink-0 mt-[3px]">
                                        {item.warning && (
                                            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                                        )}
                                    </div>
                                </div>

                                {/* Expanded detail — MOBILE ONLY (lg+ uses right panel) */}
                                <AnimatePresence>
                                    {isActive && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                            className="overflow-hidden lg:hidden"
                                        >
                                            <div className="pl-[34px] pb-4 flex flex-col gap-3">
                                                {item.description && (
                                                    <p className="text-[13px] text-muted-foreground/60 leading-relaxed -mt-1">
                                                        {item.description}
                                                    </p>
                                                )}

                                                <textarea
                                                    value={item.notes || ''}
                                                    onChange={(e) => handleNoteChange(e.target.value)}
                                                    onBlur={() => saveChecklist(items)}
                                                    placeholder="Notiz hinzufügen…"
                                                    disabled={isReadOnly}
                                                    className={cn(
                                                        "w-full bg-transparent text-[13px] leading-relaxed resize-none outline-none",
                                                        "text-muted-foreground placeholder:text-muted-foreground/60",
                                                        "border-l-2 border-border/40 pl-3 focus:border-primary/30 transition-colors",
                                                        "min-h-[44px] disabled:cursor-not-allowed"
                                                    )}
                                                    rows={2}
                                                />

                                                <div className="flex items-center gap-3 flex-wrap">
                                                    {!isDone && !isSkip && !isReadOnly && (
                                                        <button
                                                            onClick={handleCompleteStep}
                                                            disabled={isSaving}
                                                            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:text-primary/80 transition-colors"
                                                        >
                                                            <Check className="h-3.5 w-3.5" />
                                                            Erledigt
                                                        </button>
                                                    )}
                                                    {!isDone && !isSkip && !isReadOnly && (
                                                        <button
                                                            onClick={handleSkipStep}
                                                            disabled={isSaving}
                                                            className="text-[13px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                                                        >
                                                            Überspringen
                                                        </button>
                                                    )}
                                                    {(isDone || isSkip) && !isReadOnly && (
                                                        <button
                                                            onClick={handleRevertStep}
                                                            disabled={isSaving}
                                                            className="text-[13px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                                                        >
                                                            Zurücksetzen
                                                        </button>
                                                    )}

                                                    <div className="flex-1" />

                                                    {!isReadOnly && (
                                                        <>
                                                            <button
                                                                onClick={handleToggleWarning}
                                                                title="Warnung"
                                                                className={cn(
                                                                    "p-1 rounded transition-colors",
                                                                    item.warning
                                                                        ? "text-red-400"
                                                                        : "text-muted-foreground/45 hover:text-red-400"
                                                                )}
                                                            >
                                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={handleDeleteClick}
                                                                title="Löschen"
                                                                className="p-1 rounded text-muted-foreground/45 hover:text-red-400 transition-colors"
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Add step */}
            {!isReadOnly && (
                <button
                    onClick={() => setIsAddStepOpen(true)}
                    className="flex items-center gap-3 py-3 mt-1 text-muted-foreground/50 hover:text-primary transition-colors group"
                >
                    <div className="h-[22px] w-[22px] rounded-full border-[1.5px] border-dashed border-current flex items-center justify-center transition-colors">
                        <Plus className="h-3 w-3" />
                    </div>
                    <span className="text-[15px] group-hover:text-primary transition-colors">Schritt hinzufügen</span>
                </button>
            )}
        </div>
    )

    // ── Detail panel (desktop right panel only) ──
    const renderStepDetail = () => {
        if (isFinished) return renderCompletionContent()
        if (!currentItem) return null

        const isDone = currentItem.completed
        const isSkip = currentItem.skipped

        return (
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStepIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col gap-8 p-8 max-w-xl"
                >
                    {/* Step header */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground/60 font-medium">
                                Schritt {currentStepIndex + 1} von {items.length}
                            </span>
                            {isDone && (
                                <span className="text-xs font-medium text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">
                                    Erledigt
                                </span>
                            )}
                            {isSkip && (
                                <span className="text-xs font-medium text-amber-500 bg-amber-400/10 px-2 py-0.5 rounded-full">
                                    Übersprungen
                                </span>
                            )}
                            {currentItem.warning && (
                                <span className="text-xs font-medium text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" /> Warnung
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl font-semibold tracking-tight leading-snug">
                            {currentItem.text}
                        </h2>
                        {currentItem.description && (
                            <p className="text-[15px] text-muted-foreground/60 leading-relaxed">
                                {currentItem.description}
                            </p>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-border/30" />

                    {/* Notes */}
                    <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Notiz</p>
                        <textarea
                            value={currentItem.notes || ''}
                            onChange={(e) => handleNoteChange(e.target.value)}
                            onBlur={() => saveChecklist(items)}
                            placeholder="Befunde, verwendete Teile, Auffälligkeiten…"
                            disabled={isReadOnly}
                            className={cn(
                                "w-full bg-transparent text-[15px] leading-relaxed resize-none outline-none",
                                "text-foreground/80 placeholder:text-muted-foreground/60",
                                "border-l-2 border-border/40 pl-4 focus:border-primary/30 transition-colors",
                                "min-h-[120px] disabled:cursor-not-allowed"
                            )}
                            rows={5}
                        />
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-border/30" />

                    {/* Actions */}
                    <div className="flex items-center gap-4 flex-wrap">
                        {!isDone && !isSkip && !isReadOnly && (
                            <button
                                onClick={handleCompleteStep}
                                disabled={isSaving}
                                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                            >
                                <Check className="h-4 w-4" />
                                Erledigt
                            </button>
                        )}
                        {!isDone && !isSkip && !isReadOnly && (
                            <button
                                onClick={handleSkipStep}
                                disabled={isSaving}
                                className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                            >
                                Überspringen
                            </button>
                        )}
                        {(isDone || isSkip) && !isReadOnly && (
                            <button
                                onClick={handleRevertStep}
                                disabled={isSaving}
                                className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                            >
                                Zurücksetzen
                            </button>
                        )}

                        <div className="flex-1" />

                        {!isReadOnly && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleToggleWarning}
                                    title="Warnung"
                                    className={cn(
                                        "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                                        currentItem.warning
                                            ? "text-red-400 bg-red-500/10"
                                            : "text-muted-foreground/45 hover:text-red-400 hover:bg-red-500/5"
                                    )}
                                >
                                    <AlertTriangle className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={handleDeleteClick}
                                    title="Löschen"
                                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground/45 hover:text-red-400 hover:bg-red-500/5 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
        )
    }

    return (
        <div className="flex flex-col h-[100dvh] bg-background">
            {/* ── Header ── */}
            <header className="flex-none px-4 lg:px-6 py-3.5">
                <div className="max-w-lg lg:max-w-6xl mx-auto flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>

                    <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold truncate">{order?.bike_model || '—'}</p>
                        <p className="text-[12px] text-muted-foreground/50 truncate">
                            {order?.customer_name} · #{order?.order_number}
                        </p>
                    </div>

                    {currentStatus && (
                        <Select
                            value={order?.status}
                            onValueChange={handleStatusChange}
                            disabled={isReadOnly || isSaving}
                        >
                            <SelectTrigger className={cn(
                                "h-7 text-xs font-medium border rounded-full px-3 w-auto gap-1.5 shadow-none shrink-0",
                                currentStatus.color
                            )}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_FLOW.map(s => (
                                    <SelectItem key={s.value} value={s.value}>
                                        <div className="flex items-center gap-2">
                                            <s.icon className="h-3.5 w-3.5" />
                                            {s.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </header>

            {/* ── Divider ── */}
            <div className="h-px bg-border/30 max-w-lg lg:max-w-6xl mx-auto w-full" />

            {/* ── Progress (mobile only — on desktop the list IS the progress) ── */}
            {!isFinished && items.length > 1 && (
                <div className="flex-none px-4 pt-3 pb-1 max-w-lg mx-auto w-full lg:hidden">
                    <div className="flex gap-[2px]">
                        {items.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => { jumpToStep(idx); setIsFinished(false) }}
                                title={item.text}
                                className={cn(
                                    "flex-1 h-[3px] rounded-full transition-all duration-300",
                                    idx === currentStepIndex
                                        ? "bg-primary"
                                        : item.completed
                                            ? "bg-green-500/70"
                                            : item.skipped
                                                ? "bg-amber-400/50"
                                                : "bg-border/30"
                                )}
                            />
                        ))}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[11px] text-muted-foreground/60">
                            {completedCount}/{items.length}
                        </span>
                    </div>
                </div>
            )}

            {/* ── Main content ── */}
            {/* Mobile: single column | Desktop: two-panel layout */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row lg:max-w-6xl lg:mx-auto lg:w-full">
                {/* Left panel: step list (scrollable) */}
                <div className="flex-1 lg:flex-none lg:w-[400px] lg:border-r lg:border-border/20 overflow-y-auto">
                    {isFinished && !allDone ? (
                        <div className="lg:hidden">{renderCompletionContent()}</div>
                    ) : isFinished ? (
                        <>
                            <div className="lg:hidden">{renderCompletionContent()}</div>
                            <div className="hidden lg:block">{renderStepList()}</div>
                        </>
                    ) : (
                        renderStepList()
                    )}
                </div>

                {/* Right panel: detail (desktop only) */}
                <div className="hidden lg:flex lg:flex-1 overflow-y-auto">
                    {renderStepDetail()}
                </div>
            </div>

            {/* ── Dialogs ── */}

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
