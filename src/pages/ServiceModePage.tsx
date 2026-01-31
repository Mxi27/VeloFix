import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
    Check,
    X,
    SkipForward,
    CheckCircle2,
    ArrowLeft,
    Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import jsPDF from "jspdf"

import { Download } from "lucide-react"

interface ChecklistItem {
    text: string
    completed: boolean
    notes?: string
    skipped?: boolean
}

export default function ServiceModePage() {
    const { orderId } = useParams()
    const navigate = useNavigate()

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

                // Parse checklist
                let parsedItems: ChecklistItem[] = []
                if (Array.isArray(data.checklist)) {
                    parsedItems = data.checklist.map((item: any) => ({
                        ...item,
                        text: typeof item === 'string' ? item : item.text,
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
            // But user might want to review. Let's make it so if you complete the LAST step, it sets finished.
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
        const newItems = [...items]
        newItems[currentStepIndex] = {
            ...newItems[currentStepIndex],
            completed: true,
            skipped: false
        }
        setItems(newItems)
        await saveChecklist(newItems)

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

    const handleAddStep = async () => {
        if (!newStepText.trim()) return

        const newStep: ChecklistItem = {
            text: newStepText,
            completed: false,
            notes: ''
        }

        const newItems = [...items, newStep]
        setItems(newItems)
        setNewStepText("")
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
            if (item.completed) {
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
        <main className="flex-1 px-4 pb-6 overflow-y-auto w-full max-w-5xl mx-auto flex items-center justify-center">
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
        <main className="flex-1 px-4 pb-6 overflow-y-auto w-full max-w-5xl mx-auto">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStepIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full flex flex-col"
                >
                    <Card className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-card to-card/95 border-border/60 shadow-elevated-lg">
                        <div className="p-6 sm:p-8 flex-1 flex flex-col gap-8">

                            {/* Header */}
                            <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="secondary">Schritt {currentStepIndex + 1} von {items.length}</Badge>
                                        <button
                                            onClick={handleDeleteClick}
                                            className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                            title="Schritt löschen"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                                        {currentItem?.text}
                                    </h2>
                                </div>
                                {currentItem?.completed && (
                                    <div className="bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Erledigt
                                    </div>
                                )}
                            </div>

                            {/* Notes Section ONLY - No Photos */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-muted-foreground">Notiz für diesen Schritt (optional)</h3>
                                <Textarea
                                    value={currentItem?.notes}
                                    onChange={(e) => handleNoteChange(e.target.value)}
                                    placeholder="z.B. Bremsbeläge erneuert, Kette geölt..."
                                    className="bg-muted/30 resize-none min-h-[150px] border-border/50 focus:bg-background transition-all text-base"
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
                                        disabled={isSaving}
                                        className="flex-1 sm:flex-none text-muted-foreground hover:text-foreground"
                                    >
                                        Als unerledigt markieren
                                    </Button>
                                )}

                                {!currentItem?.completed && (
                                    <Button
                                        variant="outline"
                                        onClick={handleSkipStep}
                                        disabled={isSaving}
                                        className="flex-1 sm:flex-none border-border/50"
                                    >
                                        Überspringen
                                    </Button>
                                )}

                                <Button
                                    onClick={handleCompleteStep}
                                    disabled={isSaving}
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
        <div className="flex flex-col h-screen bg-background overflow-hidden relative">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 -z-10" />

            {/* Header */}
            <header className="flex-none bg-glass-bg backdrop-blur-md border-b border-glass-border px-4 py-3 sm:px-6">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            Service-Modus
                        </Badge>
                        <div>
                            <h1 className="text-sm font-semibold sm:text-base">{order.order_number}</h1>
                            <p className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-xs">{order.bike_model}</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                        <X className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Beenden</span>
                    </Button>
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
                        <button
                            onClick={() => setIsAddStepOpen(true)}
                            className="h-10 w-10 flex items-center justify-center rounded-lg border border-dashed border-primary/50 text-primary hover:bg-primary/5 transition-all"
                            title="Schritt hinzufügen"
                        >
                            <Plus className="h-5 w-5" />
                        </button>
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
                    <div className="py-4">
                        <Label htmlFor="step-name" className="mb-2 block">Beschreibung</Label>
                        <Input
                            id="step-name"
                            value={newStepText}
                            onChange={(e) => setNewStepText(e.target.value)}
                            placeholder="z.B. Probefahrt durchführen"
                            autoFocus
                        />
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
            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Schritt löschen</DialogTitle>
                        <DialogDescription>
                            Möchten Sie den Schritt "{currentItem?.text}" wirklich löschen? Dies kann nicht rückgängig gemacht werden.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
                            Abbrechen
                        </Button>
                        <Button variant="destructive" onClick={confirmDeleteStep} disabled={isSaving}>
                            Löschen
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
