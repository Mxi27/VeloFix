
import { useState, useEffect, useRef } from "react"
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
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { EmployeeSelectionModal } from "@/components/EmployeeSelectionModal"
import { logOrderEvent } from "@/lib/history"

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
    const { user, userRole } = useAuth()
    const { activeEmployee, isKioskMode, selectEmployee, clearSelectedEmployee } = useEmployee()
    const isReadOnly = userRole === 'read'

    const [showEmployeeSelect, setShowEmployeeSelect] = useState(false)

    // State
    const [loading, setLoading] = useState(true)
    const [order, setOrder] = useState<any>(null)
    const [items, setItems] = useState<ChecklistItem[]>([])
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [isSaving, setIsSaving] = useState(false)
    const [isFinished, setIsFinished] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    // Credited Mechanics State (for Feedback)
    const [creditedMechanics, setCreditedMechanics] = useState<string[]>([])
    const [isAddingMechanic, setIsAddingMechanic] = useState(false)

    // Dialog State
    const [showExitDialog, setShowExitDialog] = useState(false)
    const [showSelfControlWarning, setShowSelfControlWarning] = useState(false)
    const warningShownRef = useRef(false)

    // Self-Control Safety Check
    useEffect(() => {
        if (!order || !activeEmployee || showEmployeeSelect || isReadOnly || warningShownRef.current) return

        if (order.history && Array.isArray(order.history)) {
            // Check if current employee appears in history as a worker
            const hasWorkedOnOrder = order.history.some((h: any) =>
                h.actor?.id === activeEmployee.id &&
                (h.type === 'service_step' || h.type === 'checklist_update' || h.type === 'service')
            )

            if (hasWorkedOnOrder) {
                setShowSelfControlWarning(true)
                warningShownRef.current = true
            }
        }
    }, [order, activeEmployee, showEmployeeSelect, isReadOnly])

    // Final Feedback State
    const [rating, setRating] = useState(0)
    const [feedback, setFeedback] = useState("")

    const selectionMade = useRef(false)

    // Kiosk Enforcement
    // Force re-selection on entry (Mount)
    useEffect(() => {
        if (isKioskMode) {
            clearSelectedEmployee()
            setShowEmployeeSelect(true)
            selectionMade.current = false
        }
    }, [isKioskMode])

    // REMOVED continuous useEffect

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

                // Initialize credited mechanics from order or existing control data
                let initialMechanics = controlData.mechanic_ids || data.mechanic_ids || []

                // Auto-detect contributors from history if not already explicitly set in end_control
                if (!controlData.mechanic_ids && data.history && Array.isArray(data.history)) {
                    const historyContributors = data.history
                        .filter((h: any) => h.actor && h.actor.id && (h.type === 'service_step' || h.type === 'checklist_update'))
                        .map((h: any) => h.actor.id)

                    // Merge and unique
                    initialMechanics = Array.from(new Set([...initialMechanics, ...historyContributors]))
                }

                setCreditedMechanics(initialMechanics)

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
            mechanic_ids: creditedMechanics, // Use the edited list
            last_updated: new Date().toISOString()
        }

        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    end_control: controlStorage
                })
                .eq('id', orderId)

            if (error) throw error
            return true
        } catch (err: any) {
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
        setShowExitDialog(false)
        navigate(`/dashboard/orders/${orderId}`)
    }

    const handleConfirmSaveAndExit = async () => {
        const success = await saveProgress(items, false)
        if (success) {
            toast.success("Fortschritt gespeichert")
            setShowExitDialog(false)
            navigate(`/dashboard/orders/${orderId}`)
        }
    }



    const saveFinalFeedback = async () => {
        if (!orderId) return

        // Save as FINAL
        const success = await saveProgress(items, true)

        if (success) {
            const actorOverride = activeEmployee
                ? { id: activeEmployee.id, name: activeEmployee.name }
                : (user ? { id: user.id, name: user.user_metadata?.full_name || user.email || 'Unbekannt' } : undefined)

            // Log completion event with rating
            logOrderEvent(orderId, {
                type: 'control', // Generic control type for the generic summary event (or could use info)
                title: 'Endkontrolle abgeschlossen',
                description: `Bewertung: ${rating} Sterne`,
                metadata: {
                    rating: rating,
                    feedback: feedback
                },
                actor: actorOverride
            }, user).catch(console.error)

            toast.success("Kontrolle abgeschlossen und gespeichert")
            navigate(`/dashboard/orders/${orderId}`)
        }
    }

    // Actions
    const handleVerifyStep = async () => {
        // if (isSaving) return // No async save anymore
        const currentItemText = items[currentStepIndex].text

        const newItems = [...items]
        newItems[currentStepIndex] = {
            ...newItems[currentStepIndex],
            control_completed: true
        }
        setItems(newItems)
        // await saveChecklist(newItems) // Removed autosave

        // Log Step immediately (fire and forget)
        if (orderId) {
            const actorOverride = activeEmployee
                ? { id: activeEmployee.id, name: activeEmployee.name }
                : (user ? { id: user.id, name: user.user_metadata?.full_name || user.email || 'Unbekannt' } : undefined)

            logOrderEvent(orderId, {
                type: 'control_step',
                title: currentItemText,
                description: `Kontrolle "${currentItemText}" bestätigt`,
                actor: actorOverride
            }, user).catch(console.error)
        }

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
    <div className="flex h-[100dvh] items-center justify-center bg-background">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
)

if (!order) return <div className="p-8 text-center text-muted-foreground">Auftrag nicht gefunden</div>

const currentItem = items[currentStepIndex]
const completedCount = items.filter(i => i.control_completed).length
const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0

// ── Completion / Rating Screen ──
if (isFinished) {
    return (
        <div className="flex flex-col h-[100dvh] bg-background">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/4 via-transparent to-transparent pointer-events-none -z-10" />
            <header className="flex-none border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 py-3">
                <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
                    <button onClick={handleExitClick} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-4 w-4" /><span className="text-sm">Beenden</span>
                    </button>
                    <div className="flex-1 text-center">
                        <p className="text-sm font-semibold">{order?.bike_model || '—'}</p>
                        <p className="text-[11px] text-muted-foreground">{order?.customer_name} · {order?.order_number}</p>
                    </div>
                    <div className="w-16" />
                </div>
            </header>
            <div className="flex-1 overflow-y-auto px-4 py-8">
                <div className="max-w-sm mx-auto space-y-5">
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-2xl scale-150" />
                            <div className="relative h-20 w-20 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                                <ShieldCheck className="h-10 w-10 text-violet-500" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Kontrolle abgeschlossen</h2>
                            <p className="text-sm text-muted-foreground mt-1">Alle Schritte geprüft. Abschlussbewertung eingeben.</p>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-border/40 bg-card/50 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Beteiligte Mechaniker</p>
                            {!isReadOnly && <button onClick={() => setIsAddingMechanic(true)} className="text-xs text-primary">+ Hinzufügen</button>}
                        </div>
                        {creditedMechanics.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {creditedMechanics.map(id => <MechanicBadge key={id} id={id} onRemove={() => { if (!isReadOnly) setCreditedMechanics(prev => prev.filter(m => m !== id)) }} readOnly={isReadOnly} />)}
                            </div>
                        ) : <p className="text-xs text-muted-foreground italic">Keine Mechaniker zugewiesen.</p>}
                    </div>
                    <div className="rounded-2xl border border-border/40 bg-card/50 p-4 space-y-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Bewertung Arbeit</p>
                        <div className="flex justify-center gap-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} onClick={() => !isReadOnly && setRating(star)} disabled={isReadOnly}
                                    className={cn("h-12 w-12 rounded-full border-2 flex items-center justify-center transition-all",
                                        star <= rating ? "border-yellow-400 bg-yellow-400/15" : "border-border/40 hover:border-yellow-400/50")}>
                                    <Star className={cn("h-5 w-5", star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20")} />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-border/40 bg-card/50 p-4 space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Feedback</p>
                        <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)}
                            placeholder={isReadOnly ? "—" : "Kommentar zur Qualität der Arbeit…"}
                            disabled={isReadOnly}
                            className="w-full bg-transparent text-sm leading-relaxed resize-none outline-none placeholder:text-muted-foreground/30 min-h-[70px]" rows={3} />
                    </div>
                    <div className="flex flex-col gap-2 pb-6">
                        <button onClick={saveFinalFeedback} disabled={isSaving || isReadOnly}
                            className={cn("w-full h-14 rounded-2xl bg-violet-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20 hover:bg-violet-700 active:scale-[0.98] transition-all",
                                (isSaving || isReadOnly) && "opacity-50 cursor-not-allowed")}>
                            {isSaving ? <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <><ShieldCheck className="h-5 w-5" /> Abschließen & Speichern</>}
                        </button>
                        <button onClick={() => setIsFinished(false)} className="w-full h-11 rounded-2xl text-sm text-muted-foreground hover:text-foreground transition-colors">Zurück zur Liste</button>
                    </div>
                </div>
            </div>
            <EmployeeSelectionModal open={isAddingMechanic} onOpenChange={setIsAddingMechanic} triggerAction="Mechaniker hinzufügen"
                onEmployeeSelected={(id) => { if (!creditedMechanics.includes(id)) { setCreditedMechanics(prev => [...prev, id]) } setIsAddingMechanic(false) }} />
            <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Verlassen?</AlertDialogTitle><AlertDialogDescription>Ungespeicherte Änderungen.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel onClick={() => setSaveError(null)}>Abbrechen</AlertDialogCancel><Button variant="destructive" onClick={handleConfirmExitWithoutSave}>Nicht speichern</Button><Button onClick={handleConfirmSaveAndExit} className="bg-green-600 hover:bg-green-700 text-white">Speichern & Beenden</Button></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={showSelfControlWarning} onOpenChange={setShowSelfControlWarning}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2 text-amber-600"><AlertTriangle className="h-5 w-5" />Selbstkontrolle erkannt</AlertDialogTitle><AlertDialogDescription>Du hast diesen Auftrag bereits bearbeitet ({activeEmployee?.name}). Vier-Augen-Prinzip empfohlen.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel onClick={() => navigate(-1)}>Abbrechen</AlertDialogCancel><Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowSelfControlWarning(false)}>Trotzdem kontrollieren</Button></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

// ── Active Step View ──
return (
    <div className="flex flex-col h-[100dvh] bg-background">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/4 via-transparent to-transparent pointer-events-none -z-10" />
        <header className="flex-none border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 py-3">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
                <button onClick={handleExitClick} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-4 w-4" /><span className="text-sm">Beenden</span>
                </button>
                <div className="flex-1 text-center min-w-0">
                    <p className="text-sm font-semibold truncate">{order?.bike_model || '—'}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{order?.customer_name} · {order?.order_number}</p>
                </div>
                <span className="flex items-center gap-1 text-xs font-medium text-violet-600 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-full shrink-0">
                    <ShieldCheck className="h-3 w-3" /> Kontrolle
                </span>
            </div>
        </header>
        <div className="flex-none px-4 pt-4 pb-2 w-full max-w-2xl mx-auto space-y-3">
            <div className="space-y-1.5">
                <div className="flex justify-between"><span className="text-[11px] text-muted-foreground/60">Fortschritt</span><span className="text-[11px] font-medium text-muted-foreground">{progressPercent}% · {completedCount}/{items.length}</span></div>
                <div className="h-0.5 w-full bg-border/60 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-violet-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.4 }} />
                </div>
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
                {items.map((item, idx) => (
                    <button key={idx} onClick={() => jumpToStep(idx)}
                        className={cn("flex-none h-8 min-w-[32px] px-2 rounded-xl text-xs font-semibold border transition-all",
                            idx === currentStepIndex ? "bg-violet-500 text-white border-violet-500 ring-2 ring-violet-500/30" :
                                item.control_completed ? "bg-green-500/10 text-green-600 border-green-500/20" :
                                    "bg-muted/40 text-muted-foreground border-border/40 hover:border-border")}>
                        {item.control_completed ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                    </button>
                ))}
            </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6 w-full max-w-2xl mx-auto">
            <AnimatePresence mode="wait">
                <motion.div key={currentStepIndex} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
                    <div className={cn("flex flex-col rounded-3xl border bg-card/60 backdrop-blur-xl overflow-hidden", currentItem?.control_completed ? "border-green-500/20" : "border-border/40")}>
                        <div className="px-6 pt-6 pb-4 space-y-3">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Schritt {currentStepIndex + 1} von {items.length}</p>
                            <h2 className="text-3xl font-bold tracking-tight leading-tight">{currentItem?.text}</h2>
                            <div className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border",
                                currentItem?.completed ? "text-green-600 bg-green-500/10 border-green-500/20" : "text-amber-600 bg-amber-500/10 border-amber-500/20")}>
                                {currentItem?.completed ? <><Check className="h-3 w-3" /> Vom Mechaniker erledigt</> : <><AlertTriangle className="h-3 w-3" /> Noch offen</>}
                            </div>
                        </div>
                        {currentItem?.notes && (
                            <><div className="h-px bg-border/20 mx-6" />
                                <div className="px-6 py-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 mb-2">Notiz Mechaniker</p>
                                    <p className="text-sm italic text-muted-foreground">„{currentItem.notes}"</p>
                                </div></>
                        )}
                        <div className="h-px bg-border/30 mx-6" />
                        <div className="px-6 py-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 mb-2">Kontroll-Anmerkung</p>
                            <textarea value={currentItem?.control_notes || ''} onChange={(e) => handleControlNoteChange(e.target.value)}
                                placeholder={isReadOnly ? "—" : "Alles geprüft? Auffälligkeiten?"}
                                disabled={isReadOnly}
                                className="w-full bg-transparent text-sm leading-relaxed resize-none outline-none placeholder:text-muted-foreground/30 min-h-[70px]" rows={3} />
                        </div>
                        <div className="px-4 pb-5 flex flex-col gap-2">
                            <div className="flex items-center justify-between px-2">
                                <button onClick={() => jumpToStep(currentStepIndex - 1)} disabled={currentStepIndex === 0}
                                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                                    <ArrowLeft className="h-3.5 w-3.5" /> Zurück
                                </button>
                                {!isReadOnly && <button onClick={handleSkipStep} disabled={isSaving} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Überspringen →</button>}
                            </div>
                            <button onClick={handleVerifyStep} disabled={isSaving || isReadOnly}
                                className={cn("w-full h-14 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]",
                                    currentItem?.control_completed ? "bg-green-600 text-white shadow-green-600/20 hover:bg-green-700" : "bg-violet-600 text-white shadow-violet-600/20 hover:bg-violet-700",
                                    (isSaving || isReadOnly) && "opacity-50 cursor-not-allowed")}>
                                {isSaving ? <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> :
                                    currentItem?.control_completed ? <><CheckCircle2 className="h-5 w-5" /> Bestätigt</> : <><ShieldCheck className="h-5 w-5" /> Bestätigen</>}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
        <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Verlassen?</AlertDialogTitle><AlertDialogDescription>Fortschritt speichern?</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel onClick={() => setSaveError(null)}>Abbrechen</AlertDialogCancel><Button variant="destructive" onClick={handleConfirmExitWithoutSave}>Nicht speichern</Button><Button onClick={handleConfirmSaveAndExit} className="bg-green-600 hover:bg-green-700 text-white">Speichern & Beenden</Button></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={showSelfControlWarning} onOpenChange={setShowSelfControlWarning}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2 text-amber-600"><AlertTriangle className="h-5 w-5" />Selbstkontrolle erkannt</AlertDialogTitle><AlertDialogDescription>Du ({activeEmployee?.name}) hast diesen Auftrag bereits bearbeitet. Vier-Augen-Prinzip empfohlen.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel onClick={() => navigate(-1)}>Abbrechen</AlertDialogCancel><Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowSelfControlWarning(false)}>Trotzdem kontrollieren</Button></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <EmployeeSelectionModal open={showEmployeeSelect}
            onOpenChange={(open) => { if (!open && !selectionMade.current) { navigate(-1) } setShowEmployeeSelect(open) }}
            triggerAction="Endkontrolle durchführen"
            onEmployeeSelected={(id) => { selectionMade.current = true; selectEmployee(id); setShowEmployeeSelect(false) }}
        />
    </div>
)
}

// Helper Component for Badges
function MechanicBadge({ id, onRemove, readOnly }: { id: string, onRemove: () => void, readOnly: boolean }) {
    const { employees } = useEmployee()
    const employee = employees.find(e => e.id === id)
    if (!employee) return null
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-muted/60 border border-border/40 px-2.5 py-1 rounded-full">
            {employee.name}
            {!readOnly && (
                <button onClick={onRemove} className="hover:text-red-500 transition-colors">
                    <X className="h-3 w-3" />
                </button>
            )}
        </span>
    )
}
