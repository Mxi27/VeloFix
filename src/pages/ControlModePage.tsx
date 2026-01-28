
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
    Check,
    X,
    CheckCircle2,
    ArrowLeft,
    ShieldCheck,
    Star,
    AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"

interface ChecklistItem {
    text: string
    completed: boolean
    notes?: string
    skipped?: boolean
    control_completed?: boolean
    control_notes?: string
}

export default function ControlModePage() {
    const { orderId } = useParams()
    const navigate = useNavigate()

    // State
    const [loading, setLoading] = useState(true)
    const [order, setOrder] = useState<any>(null)
    const [items, setItems] = useState<ChecklistItem[]>([])
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [isSaving, setIsSaving] = useState(false)
    const [isFinished, setIsFinished] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    // Dialog State
    const [showExitDialog, setShowExitDialog] = useState(false)

    // Final Feedback State
    const [rating, setRating] = useState(0)
    const [feedback, setFeedback] = useState("")

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

                const controlData = data.end_control || {}
                const storedSteps = controlData.steps || []

                // Parse checklist and merge with control data
                let parsedItems: ChecklistItem[] = []
                if (Array.isArray(data.checklist)) {
                    parsedItems = data.checklist.map((item: any, index: number) => {
                        // Try to find stored control data for this step (by index)
                        const storedStep = storedSteps[index]

                        return {
                            text: typeof item === 'string' ? item : item.text,
                            completed: typeof item === 'string' ? false : (item.completed || false),
                            notes: typeof item === 'string' ? '' : (item.notes || ''),
                            skipped: typeof item === 'string' ? false : (item.skipped || false),
                            // Load control data
                            control_completed: storedStep ? storedStep.control_completed : (item.control_completed || false),
                            control_notes: storedStep ? storedStep.control_notes : (item.control_notes || '')
                        }
                    })
                }
                setItems(parsedItems)

                // Load Global Control Data
                if (controlData.rating) setRating(controlData.rating)
                if (controlData.feedback) setFeedback(controlData.feedback)
                if (controlData.completed) setIsFinished(true)

            } catch (err: any) {
                console.error("Error loading order:", err)
                toast.error("Fehler", "Auftrag konnte nicht geladen werden.")
            } finally {
                setLoading(false)
            }
        }

        fetchOrder()
    }, [orderId])

    // Save helper - Uses 'end_control' JSON column
    const saveProgress = async (currentItems: ChecklistItem[], isFinal: boolean = false): Promise<boolean> => {
        if (!orderId) {
            console.error("No orderId found for saving")
            return false
        }
        setIsSaving(true)
        setSaveError(null)

        // Prepare storage object
        const controlStorage = {
            steps: currentItems.map(i => ({
                text: i.text,
                control_completed: i.control_completed,
                control_notes: i.control_notes
            })),
            rating: rating,
            feedback: feedback,
            completed: isFinal,
            last_updated: new Date().toISOString()
        }

        try {
            console.log("Saving control data:", controlStorage)

            const { data, error } = await supabase
                .from('orders')
                .update({
                    end_control: controlStorage
                })
                .eq('id', orderId)
                .select() // Request back the data to confirm write

            if (error) throw error

            console.log("Save successful, response:", data)
            return true
        } catch (err: any) {
            console.error("Error saving checklist:", err, err.message, err.details)
            const errorMessage = err.message || 'Unbekanntes Problem'
            setSaveError(errorMessage)
            toast.error("Speichern fehlgeschlagen", `Fehler: ${errorMessage}`)
            return false
        } finally {
            setIsSaving(false)
        }
    }

    const handleExitClick = () => {
        setShowExitDialog(true)
    }

    const handleConfirmExitWithoutSave = () => {
        console.log("Exiting without save, navigating to:", `/dashboard/orders/${orderId}`)
        setShowExitDialog(false)
        navigate(`/dashboard/orders/${orderId}`)
    }

    const handleConfirmSaveAndExit = async () => {
        console.log("Save and Exit requested")
        // Save as NOT final (progress only)
        const success = await saveProgress(items, false)
        if (success) {
            toast.success("Fortschritt gespeichert")
            setShowExitDialog(false)
            console.log("Navigating to:", `/dashboard/orders/${orderId}`)
            navigate(`/dashboard/orders/${orderId}`)
        } else {
            console.error("Save failed, not exiting")
            // Error is already set in saveProgress
        }
    }

    const saveFinalFeedback = async () => {
        if (!orderId) return

        // Save as FINAL
        const success = await saveProgress(items, true)

        if (success) {
            toast.success("Kontrolle abgeschlossen und gespeichert")
            navigate(`/dashboard/orders/${orderId}`)
        }
    }

    // Actions
    const handleVerifyStep = async () => {
        // if (isSaving) return // No async save anymore
        const newItems = [...items]
        newItems[currentStepIndex] = {
            ...newItems[currentStepIndex],
            control_completed: true
        }
        setItems(newItems)
        // await saveChecklist(newItems) // Removed autosave

        // Auto-advance
        if (currentStepIndex < items.length - 1) {
            setCurrentStepIndex(prev => prev + 1)
        } else {
            setIsFinished(true)
        }
    }

    const handleSkipStep = async () => {
        if (currentStepIndex < items.length - 1) {
            setCurrentStepIndex(prev => prev + 1)
        } else {
            setIsFinished(true)
        }
    }

    const handleControlNoteChange = (text: string) => {
        const newItems = [...items]
        newItems[currentStepIndex].control_notes = text
        setItems(newItems)
    }

    // Navigation
    const jumpToStep = (index: number) => {
        // saveChecklist(items) // Removed autosave
        setIsFinished(false)
        setCurrentStepIndex(index)
    }

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-muted-foreground">Lade Kontroll-Modus...</p>
            </div>
        </div>
    )

    if (!order) return <div className="p-8 text-center">Auftrag nicht gefunden</div>

    // Check if we are in "Finished" state (Rating view)
    if (isFinished) {
        return (
            <div className="flex flex-col h-screen bg-background overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-background to-purple-500/5 -z-10" />

                {/* Header */}
                <header className="flex-none bg-glass-bg backdrop-blur-md border-b border-glass-border px-4 py-3 sm:px-6">
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                                <ShieldCheck className="mr-1 h-3 w-3" />
                                Kontrolle
                            </Badge>
                            <div>
                                <h1 className="text-sm font-semibold sm:text-base">{order.order_number}</h1>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleExitClick}>
                            <X className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Abbrechen</span>
                        </Button>
                    </div>
                </header>

                <main className="flex-1 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md p-6 sm:p-8 space-y-6">
                        <div className="text-center space-y-2">
                            <ShieldCheck className="h-12 w-12 mx-auto text-green-500 mb-2" />
                            <h2 className="text-2xl font-bold">Kontrolle Abschluss</h2>
                            <p className="text-muted-foreground">
                                Alle Schritte wurden durchgesehen. Bitte geben Sie eine abschließende Bewertung ab.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2 text-center">
                                <label className="text-sm font-medium">Bewertung Mechaniker/Arbeit</label>
                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setRating(star)}
                                            className="focus:outline-none transition-transform hover:scale-110"
                                        >
                                            <Star
                                                className={cn(
                                                    "h-8 w-8",
                                                    star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                                                )}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Feedback / Anmerkungen</label>
                                <Textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Kommentar zur Qualität der Arbeit..."
                                    className="min-h-[100px]"
                                />
                            </div>
                        </div>

                        <Button
                            onClick={saveFinalFeedback}
                            disabled={isSaving}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isSaving ? "Speichere..." : "Kontrolle abschließen & speichern"}
                        </Button>

                        <Button
                            variant="ghost"
                            onClick={() => setIsFinished(false)}
                            className="w-full text-muted-foreground"
                        >
                            Zurück zur Liste
                        </Button>
                    </Card>
                </main>
            </div>
        )
    }

    const currentItem = items[currentStepIndex]
    const progressPercent = Math.round((items.filter(i => i.control_completed).length / items.length) * 100)

    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden relative">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-background to-purple-500/5 -z-10" />

            {/* Header */}
            <header className="flex-none bg-glass-bg backdrop-blur-md border-b border-glass-border px-4 py-3 sm:px-6">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            Kontrolle
                        </Badge>
                        <div>
                            <h1 className="text-sm font-semibold sm:text-base">{order.order_number}</h1>
                            <p className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-xs">{order.bike_model}</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExitClick}>
                        <X className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Beenden</span>
                    </Button>
                </div>
            </header>

            {/* Progress Bar Area */}
            <div className="flex-none px-4 py-6 sm:px-6 max-w-5xl mx-auto w-full space-y-6">
                <Card className="p-4 sm:p-6 bg-card/60 backdrop-blur-sm border-border/50">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Fortschritt</span>
                        <span className="text-sm font-bold">{currentStepIndex + 1} / {items.length} Schritte</span>
                    </div>
                    <div className="h-3 w-full bg-secondary/50 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-indigo-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}% ` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </Card>

                {/* Step Navigation Bubbles */}
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start items-center">
                    {items.map((item, idx) => {
                        let statusColor = "bg-muted text-muted-foreground border-border"
                        if (idx === currentStepIndex) statusColor = "bg-indigo-500 text-white ring-2 ring-indigo-500 ring-offset-2 ring-offset-background"
                        else if (item.control_completed) statusColor = "bg-green-500/20 text-green-600 border-green-500/30"

                        return (
                            <button
                                key={idx}
                                onClick={() => jumpToStep(idx)}
                                className={cn(
                                    "h-10 w-10 flex items-center justify-center rounded-lg border text-sm font-medium transition-all hover:scale-105 active:scale-95",
                                    statusColor
                                )}
                            >
                                {item.control_completed ? <Check className="h-5 w-5" /> : (idx + 1)}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Active Step Card */}
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
                                        <Badge variant="secondary" className="mb-2">Schritt {currentStepIndex + 1} von {items.length}</Badge>
                                        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                                            {currentItem?.text}
                                        </h2>
                                    </div>
                                    {currentItem?.completed ? (
                                        <div className="bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5">
                                            <CheckCircle2 className="h-4 w-4" />
                                            Vom Mechaniker erledigt
                                        </div>
                                    ) : (
                                        <div className="bg-yellow-500/10 text-yellow-600 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5">
                                            <AlertTriangle className="h-4 w-4" />
                                            Noch offen
                                        </div>
                                    )}
                                </div>

                                {/* Mechanics Note (Read Only) */}
                                {currentItem.notes && (
                                    <div className="p-4 bg-muted/40 rounded-lg border border-border/50">
                                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Notiz von Mechaniker</p>
                                        <p className="text-sm italic text-foreground/80">"{currentItem.notes}"</p>
                                    </div>
                                )}

                                {/* Control Notes Section */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium text-muted-foreground">Kontroll-Anmerkung</h3>
                                    <Textarea
                                        value={currentItem?.control_notes}
                                        onChange={(e) => handleControlNoteChange(e.target.value)}
                                        placeholder="Alles okay? Probleme gefunden?"
                                        className="bg-indigo-500/5 resize-none min-h-[100px] border-indigo-200/20 focus:bg-background transition-all text-base focus:border-indigo-500"
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
                                    <Button
                                        variant="outline"
                                        onClick={handleSkipStep}
                                        disabled={isSaving}
                                        className="flex-1 sm:flex-none border-border/50"
                                    >
                                        Überspringen
                                    </Button>
                                    <Button
                                        onClick={handleVerifyStep}
                                        disabled={isSaving}
                                        className={cn(
                                            "flex-1 sm:flex-none min-w-[140px] bg-indigo-600 hover:bg-indigo-700 text-white",
                                            currentItem?.control_completed ? "bg-green-600 hover:bg-green-700" : ""
                                        )}
                                    >
                                        {isSaving ? "Speichere..." : (currentItem?.control_completed ? (
                                            <>
                                                <Check className="mr-2 h-4 w-4" />
                                                Verifiziert
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheck className="mr-2 h-4 w-4" />
                                                Bestätigen
                                            </>
                                        ))}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Exit Confirmation Dialog */}
            <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Verlassen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Sie haben ungespeicherte Änderungen. Möchten Sie den Fortschritt speichern bevor Sie gehen?
                        </AlertDialogDescription>
                        {saveError && (
                            <div className="mt-2 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
                                <p className="font-bold">Speicher-Fehler:</p>
                                <p>{saveError}</p>
                                <p className="text-xs text-muted-foreground mt-1">Bitte prüfen Sie, ob das SQL-Skript ausgeführt wurde (Spalte 'end_control' fehlt?).</p>
                            </div>
                        )}
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="mt-0" onClick={() => setSaveError(null)}>Abbrechen</AlertDialogCancel>
                        <Button variant="destructive" onClick={handleConfirmExitWithoutSave} className="bg-red-500 hover:bg-red-600 text-white">
                            Nicht speichern
                        </Button>
                        <Button onClick={handleConfirmSaveAndExit} className="bg-green-600 hover:bg-green-700 text-white">
                            Speichern & Beenden
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
