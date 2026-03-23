
import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
    Check,
    X,
    ShieldCheck,
    Star,
    AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn, isUuid } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { EmployeeSelectionModal } from "@/components/EmployeeSelectionModal"
import { logOrderEvent } from "@/lib/history"
import type { WorkshopOrder } from "@/types/index"

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
    const { activeEmployee, isSharedMode, selectEmployee, clearSelectedEmployee } = useEmployee()
    const isReadOnly = userRole === 'read'

    const [showEmployeeSelect, setShowEmployeeSelect] = useState(false)

    // State
    const [loading, setLoading] = useState(true)
    const [order, setOrder] = useState<WorkshopOrder | null>(null)
    const [items, setItems] = useState<ChecklistItem[]>([])
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [isSaving, setIsSaving] = useState(false)
    const [isFinished, setIsFinished] = useState(false)

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
    const activeItemRef = useRef<HTMLDivElement>(null)

    // Kiosk Enforcement
    // Force re-selection on entry (Mount)
    useEffect(() => {
        if (isSharedMode) {
            clearSelectedEmployee()
            setShowEmployeeSelect(true)
            selectionMade.current = false
        }
    }, [isSharedMode])

    // REMOVED continuous useEffect

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

            } catch (err: unknown) {
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
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unbekanntes Problem'
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

    // Toggle control completion for any item (Todoist-style circle click)
    const handleToggleControlComplete = (idx: number) => {
        if (isSaving || isReadOnly) return
        const newItems = [...items]
        const wasControlled = newItems[idx].control_completed
        newItems[idx] = { ...newItems[idx], control_completed: !wasControlled }
        setItems(newItems)

        if (!wasControlled) {
            // Auto-advance to next uncontrolled step
            const nextIdx = newItems.findIndex((item, i) => i > idx && !item.control_completed)
            if (nextIdx >= 0) {
                setCurrentStepIndex(nextIdx)
            } else {
                const firstOpen = newItems.findIndex(item => !item.control_completed)
                if (firstOpen >= 0) setCurrentStepIndex(firstOpen)
            }

            if (orderId) {
                const actorOverride = activeEmployee
                    ? { id: activeEmployee.id, name: activeEmployee.name }
                    : (user ? { id: user.id, name: user.user_metadata?.full_name || user.email || 'Unbekannt' } : undefined)
                logOrderEvent(orderId, {
                    type: 'control_step',
                    title: newItems[idx].text,
                    description: `Kontrolle "${newItems[idx].text}" bestätigt`,
                    actor: actorOverride
                }, user).catch(console.error)
            }
            if (newItems.every(i => i.control_completed)) {
                setIsFinished(true)
            }
        }
    }

    // Auto-scroll active item into view
    useEffect(() => {
        if (activeItemRef.current) {
            activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
    }, [currentStepIndex])

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
    const allControlled = items.length > 0 && items.every(i => i.control_completed)

    // ── Completion / Rating content ──
    const renderCompletionContent = () => (
        <div className="max-w-sm mx-auto py-8 px-4 lg:px-6 flex flex-col gap-6">
            <div className="flex flex-col items-center text-center gap-3">
                <div className="h-14 w-14 rounded-full bg-violet-500/10 flex items-center justify-center">
                    <ShieldCheck className="h-7 w-7 text-violet-500" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">Kontrolle abgeschlossen</h2>
                    <p className="text-sm text-muted-foreground/60 mt-1">{completedCount} Schritte geprüft</p>
                </div>
            </div>

            <div className="h-px bg-border/30" />

            {/* Mechanics */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Beteiligte Mechaniker</p>
                    {!isReadOnly && <button onClick={() => setIsAddingMechanic(true)} className="text-xs text-violet-500 hover:text-violet-400 transition-colors">+ Hinzufügen</button>}
                </div>
                {creditedMechanics.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {creditedMechanics.map(id => <MechanicBadge key={id} id={id} onRemove={() => { if (!isReadOnly) setCreditedMechanics(prev => prev.filter(m => m !== id)) }} readOnly={isReadOnly} />)}
                    </div>
                ) : <p className="text-xs text-muted-foreground/50 italic">Keine zugewiesen</p>}
            </div>

            <div className="h-px bg-border/30" />

            {/* Rating */}
            <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Bewertung</p>
                <div className="flex justify-center gap-2.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} onClick={() => !isReadOnly && setRating(star)} disabled={isReadOnly}
                            className={cn("h-10 w-10 rounded-full border-[1.5px] flex items-center justify-center transition-all",
                                star <= rating ? "border-yellow-400 bg-yellow-400/15" : "border-muted-foreground/25 hover:border-yellow-400/50")}>
                            <Star className={cn("h-4 w-4", star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/35")} />
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-px bg-border/30" />

            {/* Feedback */}
            <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Feedback</p>
                <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)}
                    placeholder={isReadOnly ? "—" : "Kommentar zur Qualität der Arbeit…"}
                    disabled={isReadOnly}
                    className="w-full bg-transparent text-sm leading-relaxed resize-none outline-none placeholder:text-muted-foreground/40 border-l-2 border-border/40 pl-4 focus:border-violet-500/30 transition-colors min-h-[70px]" rows={3} />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
                <button onClick={saveFinalFeedback} disabled={isSaving || isReadOnly}
                    className={cn("w-full h-12 rounded-xl bg-violet-600 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-violet-700 active:scale-[0.98] transition-all",
                        (isSaving || isReadOnly) && "opacity-50 cursor-not-allowed")}>
                    {isSaving ? <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <><ShieldCheck className="h-4 w-4" /> Abschließen & Speichern</>}
                </button>
                <button onClick={() => setIsFinished(false)} className="w-full h-10 text-sm text-muted-foreground/60 hover:text-foreground transition-colors">Zurück zur Liste</button>
            </div>
        </div>
    )

    // ── Step list (left panel on desktop, full on mobile) ──
    const renderStepList = () => (
        <div className="flex flex-col w-full px-4 pt-4 pb-8">
            {/* All-done banner */}
            {allControlled && !isFinished && (
                <div className="flex items-center gap-2.5 py-3 mb-1">
                    <div className="h-7 w-7 rounded-full bg-violet-500/10 flex items-center justify-center">
                        <ShieldCheck className="h-3.5 w-3.5 text-violet-500" />
                    </div>
                    <span className="text-sm font-medium text-violet-500">Alle geprüft</span>
                </div>
            )}

            <div className="flex flex-col">
                {items.map((item, idx) => {
                    const isActive = idx === currentStepIndex && !isFinished
                    const isControlled = item.control_completed

                    return (
                        <div key={idx} ref={isActive ? activeItemRef : undefined}>
                            {idx > 0 && <div className={cn("h-px ml-[34px]", isActive || (idx > 0 && idx - 1 === currentStepIndex) ? "bg-transparent" : "bg-border/30")} />}

                            <div className={cn(
                                "rounded-xl transition-all duration-200",
                                isActive && "bg-muted/40 -mx-2 px-2"
                            )}>
                                {/* Row */}
                                <div
                                    className="flex items-start gap-3 py-3 cursor-pointer group"
                                    onClick={() => { if (!isActive) jumpToStep(idx) }}
                                >
                                    {/* Violet circle checkbox */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleToggleControlComplete(idx) }}
                                        disabled={isReadOnly || isSaving}
                                        className={cn(
                                            "flex-none mt-[2px] h-[22px] w-[22px] rounded-full border-[1.5px] flex items-center justify-center transition-all duration-200",
                                            isControlled
                                                ? "bg-violet-500 border-violet-500 text-white"
                                                : isActive
                                                    ? "border-violet-400/60 hover:bg-violet-500 hover:border-violet-500 hover:text-white"
                                                    : "border-muted-foreground/35 group-hover:border-muted-foreground/50"
                                        )}
                                    >
                                        {isControlled && <Check className="h-3 w-3" strokeWidth={3} />}
                                    </button>

                                    {/* Title + mechanic status */}
                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                        <span className={cn(
                                            "text-[15px] leading-snug transition-colors",
                                            isControlled
                                                ? "line-through text-muted-foreground/50 decoration-muted-foreground/40"
                                                : isActive
                                                    ? "text-foreground font-medium"
                                                    : "text-foreground/80"
                                        )}>
                                            {item.text}
                                        </span>
                                        <span className={cn(
                                            "inline-flex items-center gap-1 text-[11px] w-fit",
                                            item.completed ? "text-green-600/70" : "text-amber-500/70"
                                        )}>
                                            {item.completed ? <><Check className="h-2.5 w-2.5" /> Erledigt</> : <><AlertTriangle className="h-2.5 w-2.5" /> Offen</>}
                                        </span>
                                    </div>
                                </div>

                                {/* Expanded — mobile only */}
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
                                                {/* Mechanic notes (read-only context) */}
                                                {item.notes && (
                                                    <div className="text-[13px] text-muted-foreground/60 italic border-l-2 border-border/40 pl-3">
                                                        „{item.notes}"
                                                    </div>
                                                )}

                                                {/* Control notes */}
                                                <textarea
                                                    value={item.control_notes || ''}
                                                    onChange={(e) => handleControlNoteChange(e.target.value)}
                                                    placeholder="Kontroll-Anmerkung…"
                                                    disabled={isReadOnly}
                                                    className={cn(
                                                        "w-full bg-transparent text-[13px] leading-relaxed resize-none outline-none",
                                                        "text-muted-foreground placeholder:text-muted-foreground/40",
                                                        "border-l-2 border-violet-500/30 pl-3 focus:border-violet-500/50 transition-colors",
                                                        "min-h-[44px] disabled:cursor-not-allowed"
                                                    )}
                                                    rows={2}
                                                />

                                                {/* Actions */}
                                                <div className="flex items-center gap-3">
                                                    {!isControlled && !isReadOnly && (
                                                        <button onClick={handleVerifyStep} disabled={isSaving}
                                                            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-violet-500 hover:text-violet-400 transition-colors">
                                                            <ShieldCheck className="h-3.5 w-3.5" /> Bestätigen
                                                        </button>
                                                    )}
                                                    {!isControlled && !isReadOnly && (
                                                        <button onClick={handleSkipStep} disabled={isSaving}
                                                            className="text-[13px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                                                            Überspringen
                                                        </button>
                                                    )}
                                                    {isControlled && !isReadOnly && (
                                                        <button onClick={() => { const ni = [...items]; ni[currentStepIndex] = { ...ni[currentStepIndex], control_completed: false }; setItems(ni) }}
                                                            disabled={isSaving}
                                                            className="text-[13px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                                                            Zurücksetzen
                                                        </button>
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
        </div>
    )

    // ── Detail panel (desktop right panel) ──
    const renderStepDetail = () => {
        if (isFinished) return renderCompletionContent()
        if (!currentItem) return null

        const isControlled = currentItem.control_completed

        return (
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStepIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col gap-6 p-8 max-w-xl"
                >
                    {/* Step header */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground/60 font-medium">
                                Schritt {currentStepIndex + 1} von {items.length}
                            </span>
                            {isControlled && (
                                <span className="text-xs font-medium text-violet-500 bg-violet-500/10 px-2 py-0.5 rounded-full">
                                    Bestätigt
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl font-semibold tracking-tight leading-snug">
                            {currentItem.text}
                        </h2>
                        {/* Mechanic status badge */}
                        <div className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border w-fit",
                            currentItem.completed ? "text-green-600 bg-green-500/10 border-green-500/20" : "text-amber-600 bg-amber-500/10 border-amber-500/20"
                        )}>
                            {currentItem.completed ? <><Check className="h-3 w-3" /> Vom Mechaniker erledigt</> : <><AlertTriangle className="h-3 w-3" /> Vom Mechaniker offen gelassen</>}
                        </div>
                    </div>

                    {/* Mechanic notes */}
                    {currentItem.notes && (
                        <>
                            <div className="h-px bg-border/30" />
                            <div className="flex flex-col gap-2">
                                <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Notiz Mechaniker</p>
                                <div className="text-[15px] text-muted-foreground/70 italic border-l-2 border-border/40 pl-4">
                                    „{currentItem.notes}"
                                </div>
                            </div>
                        </>
                    )}

                    <div className="h-px bg-border/30" />

                    {/* Control notes */}
                    <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Kontroll-Anmerkung</p>
                        <textarea
                            value={currentItem.control_notes || ''}
                            onChange={(e) => handleControlNoteChange(e.target.value)}
                            placeholder="Alles geprüft? Auffälligkeiten?"
                            disabled={isReadOnly}
                            className={cn(
                                "w-full bg-transparent text-[15px] leading-relaxed resize-none outline-none",
                                "text-foreground/80 placeholder:text-muted-foreground/40",
                                "border-l-2 border-violet-500/30 pl-4 focus:border-violet-500/50 transition-colors",
                                "min-h-[100px] disabled:cursor-not-allowed"
                            )}
                            rows={4}
                        />
                    </div>

                    <div className="h-px bg-border/30" />

                    {/* Actions */}
                    <div className="flex items-center gap-4">
                        {!isControlled && !isReadOnly && (
                            <button onClick={handleVerifyStep} disabled={isSaving}
                                className="inline-flex items-center gap-2 text-sm font-medium text-violet-500 hover:text-violet-400 transition-colors">
                                <ShieldCheck className="h-4 w-4" /> Bestätigen
                            </button>
                        )}
                        {!isControlled && !isReadOnly && (
                            <button onClick={handleSkipStep} disabled={isSaving}
                                className="text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                                Überspringen
                            </button>
                        )}
                        {isControlled && !isReadOnly && (
                            <button onClick={() => { const ni = [...items]; ni[currentStepIndex] = { ...ni[currentStepIndex], control_completed: false }; setItems(ni) }}
                                disabled={isSaving}
                                className="text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                                Zurücksetzen
                            </button>
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
                    <button onClick={handleExitClick}
                        className="text-muted-foreground/60 hover:text-foreground transition-colors shrink-0">
                        <X className="h-5 w-5" />
                    </button>

                    <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold truncate">{order?.bike_model || '—'}</p>
                        <p className="text-[12px] text-muted-foreground/60 truncate">
                            {order?.customer_name} · #{order?.order_number}
                        </p>
                    </div>

                    <span className="flex items-center gap-1.5 text-xs font-medium text-violet-500 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-full shrink-0">
                        <ShieldCheck className="h-3 w-3" /> Kontrolle
                    </span>
                </div>
            </header>

            {/* Divider */}
            <div className="h-px bg-border/30 max-w-lg lg:max-w-6xl mx-auto w-full" />

            {/* ── Progress (mobile only) ── */}
            {!isFinished && items.length > 1 && (
                <div className="flex-none px-4 pt-3 pb-1 max-w-lg mx-auto w-full lg:hidden">
                    <div className="flex gap-[2px]">
                        {items.map((item, idx) => (
                            <button key={idx} onClick={() => jumpToStep(idx)} title={item.text}
                                className={cn(
                                    "flex-1 h-[3px] rounded-full transition-all duration-300",
                                    idx === currentStepIndex
                                        ? "bg-violet-500"
                                        : item.control_completed
                                            ? "bg-green-500/70"
                                            : "bg-border/30"
                                )} />
                        ))}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[11px] text-muted-foreground/60">{completedCount}/{items.length}</span>
                    </div>
                </div>
            )}

            {/* ── Main content ── */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row lg:max-w-6xl lg:mx-auto lg:w-full">
                {/* Left: step list */}
                <div className="flex-1 lg:flex-none lg:w-[400px] lg:border-r lg:border-border/20 overflow-y-auto">
                    {isFinished ? (
                        <>
                            <div className="lg:hidden">{renderCompletionContent()}</div>
                            <div className="hidden lg:block">{renderStepList()}</div>
                        </>
                    ) : renderStepList()}
                </div>

                {/* Right: detail panel (desktop only) */}
                <div className="hidden lg:flex lg:flex-1 overflow-y-auto">
                    {renderStepDetail()}
                </div>
            </div>

            {/* ── Dialogs ── */}
            <EmployeeSelectionModal open={isAddingMechanic} onOpenChange={setIsAddingMechanic} triggerAction="Mechaniker hinzufügen"
                onEmployeeSelected={(id) => { if (!creditedMechanics.includes(id)) { setCreditedMechanics(prev => [...prev, id]) } setIsAddingMechanic(false) }} />
            <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Verlassen?</AlertDialogTitle><AlertDialogDescription>Fortschritt speichern?</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel onClick={() => { }}>Abbrechen</AlertDialogCancel><Button variant="destructive" onClick={handleConfirmExitWithoutSave}>Nicht speichern</Button><Button onClick={handleConfirmSaveAndExit} className="bg-green-600 hover:bg-green-700 text-white">Speichern & Beenden</Button></AlertDialogFooter>
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
