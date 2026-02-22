import { useState, useEffect, useRef } from "react"
// import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft, CheckCircle2, X, Check, SkipForward } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"

import { EmployeeSelectionModal } from "@/components/EmployeeSelectionModal"
import { BikeDataCompletionDialog } from "@/components/BikeDataCompletionDialog"
import { cn } from "@/lib/utils"

interface Step {
    id: string
    title: string
    description: string
    required: boolean
}

interface ComponentProps {
    build: any
    onBack: () => void
    onComplete?: () => void
}

export function BikeBuildWizard({ build, onBack, onComplete }: ComponentProps) {
    const { workshopId, user } = useAuth()
    const { activeEmployee, isKioskMode, selectEmployee } = useEmployee()
    // const navigate = useNavigate() // Unused

    // State
    const [steps, setSteps] = useState<Step[]>([])
    const [loading, setLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [currentStepIndex, setCurrentStepIndex] = useState(0)

    // Progress Tracking
    const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
    const [skippedSteps, setSkippedSteps] = useState<Set<string>>(new Set())
    const [stepNotes, setStepNotes] = useState<Record<string, string>>({})

    // UI State
    const [isFinished, setIsFinished] = useState(false)
    const [completionDialogOpen, setCompletionDialogOpen] = useState(false)
    const [showEmployeeSelect, setShowEmployeeSelect] = useState(false)
    const selectionMade = useRef(false)

    // Kiosk Mode Enforcer
    useEffect(() => {
        if (isKioskMode && !activeEmployee) {
            setShowEmployeeSelect(true)
            selectionMade.current = false
        }
    }, [isKioskMode, activeEmployee])

    // Fetch Steps
    useEffect(() => {
        const fetchSteps = async () => {
            if (!workshopId || !build) return
            setLoading(true)
            try {
                // Initialize state from build
                if (build.assembly_progress) {
                    if (build.assembly_progress.completed_steps) {
                        setCompletedSteps(new Set(build.assembly_progress.completed_steps))
                    }
                    if (build.assembly_progress.skipped_steps) {
                        setSkippedSteps(new Set(build.assembly_progress.skipped_steps))
                    }
                    if (build.assembly_progress.step_notes) {
                        setStepNotes(build.assembly_progress.step_notes)
                    }
                }

                // Fetch Steps
                let query = supabase
                    .from('neurad_steps')
                    .select('*')
                    .eq('workshop_id', workshopId)
                    .eq('is_active', true)

                if (build.checklist_template) {
                    query = query.eq('template_name', build.checklist_template)
                }

                const { data: stepsData, error: stepsError } = await query.order('order_index', { ascending: true })

                if (stepsError && stepsError.code !== 'PGRST116') {
                    console.error(stepsError)
                }

                if (stepsData && stepsData.length > 0) {
                    setSteps(stepsData)
                    // Find first unfinished step
                    const firstUnfinished = stepsData.findIndex((s: Step) =>
                        !build.assembly_progress?.completed_steps?.includes(s.id) &&
                        !build.assembly_progress?.skipped_steps?.includes(s.id)
                    )
                    if (firstUnfinished >= 0) setCurrentStepIndex(firstUnfinished)
                } else {
                    // Fallback
                    const fallbackSteps = [
                        { id: '1', title: 'Lenker montieren', description: 'Lenker gerade ausrichten und mit Drehmoment anziehen.', required: true },
                        { id: '2', title: 'Vorderrad einbauen', description: 'Laufrichtung beachten.', required: true },
                        { id: '3', title: 'Pedale montieren', description: 'Fett verwenden!', required: true },
                        { id: '4', title: 'Schaltung einstellen', description: 'Alle Gänge durchschalten.', required: true },
                        { id: '5', title: 'Bremsen prüfen', description: 'Druckpunkt und Beläge prüfen.', required: true },
                        { id: '6', title: 'Lichtanlage prüfen', description: 'Funktionstest durchführen.', required: true },
                        { id: '7', title: 'Endkontrolle & Probefahrt', description: 'Alles fest? Nichts klappert?', required: true },
                    ]
                    setSteps(fallbackSteps)
                }
            } catch (error) {
                console.error(error)
                toast.error("Fehler beim Laden der Schritte")
            } finally {
                setLoading(false)
            }
        }

        fetchSteps()
    }, [workshopId, build])

    // Helper to save progress
    const saveProgress = async (
        newCompleted: Set<string>,
        newSkipped: Set<string>,
        newNotes: Record<string, string>
    ) => {
        if (!build) return
        setIsSaving(true)

        try {
            await supabase
                .from('bike_builds')
                .update({
                    assembly_progress: {
                        completed_steps: Array.from(newCompleted),
                        skipped_steps: Array.from(newSkipped),
                        step_notes: newNotes,
                        last_updated: new Date().toISOString(),
                        last_actor: activeEmployee ? { id: activeEmployee.id, name: activeEmployee.name } : { id: user?.id, name: 'User' }
                    }
                })
                .eq('id', build.id)
        } catch (e) {
            console.error("Failed to save progress", e)
        } finally {
            setIsSaving(false)
        }
    }

    const currentStep = steps[currentStepIndex]
    const isStepCompleted = currentStep && completedSteps.has(currentStep.id)
    const isStepSkipped = currentStep && skippedSteps.has(currentStep.id)

    const handleCompleteStep = async () => {
        if (!currentStep) return

        const newCompleted = new Set(completedSteps)
        newCompleted.add(currentStep.id)
        const newSkipped = new Set(skippedSteps)
        newSkipped.delete(currentStep.id)

        setCompletedSteps(newCompleted)
        setSkippedSteps(newSkipped)
        await saveProgress(newCompleted, newSkipped, stepNotes)

        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1)
        } else {
            setIsFinished(true)
            toast.success("Alle Schritte erledigt!")
        }
    }

    const handleSkipStep = async () => {
        if (!currentStep) return

        const newSkipped = new Set(skippedSteps)
        newSkipped.add(currentStep.id)
        const newCompleted = new Set(completedSteps)
        newCompleted.delete(currentStep.id)

        setSkippedSteps(newSkipped)
        setCompletedSteps(newCompleted)
        await saveProgress(newCompleted, newSkipped, stepNotes)

        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1)
        } else {
            setIsFinished(true)
        }
    }

    const handleRevertStep = async () => {
        if (!currentStep) return

        const newCompleted = new Set(completedSteps)
        newCompleted.delete(currentStep.id)
        const newSkipped = new Set(skippedSteps)
        newSkipped.delete(currentStep.id)

        setCompletedSteps(newCompleted)
        setSkippedSteps(newSkipped)
        await saveProgress(newCompleted, newSkipped, stepNotes)
        toast.success("Status zurückgesetzt")
    }

    const handleNoteChange = (text: string) => {
        if (!currentStep) return
        const newNotes = { ...stepNotes, [currentStep.id]: text }
        setStepNotes(newNotes)
        // Debounce save ideally, but for now simple state update and save on step change
    }

    const jumpToStep = (index: number) => {
        setCurrentStepIndex(index)
        setIsFinished(false)
    }


if (loading) return (
    <div className="flex h-[100dvh] items-center justify-center bg-background">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
)

const progressPercentage = steps.length > 0 ? Math.round(((completedSteps.size + skippedSteps.size) / steps.length) * 100) : 0
const completedCount = completedSteps.size + skippedSteps.size

// ── Finished Screen ──
if (isFinished) {
    return (
        <div className="flex flex-col h-[100dvh] bg-background">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/4 via-transparent to-transparent pointer-events-none -z-10" />
            <header className="flex-none border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 py-3">
                <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
                    <button onClick={onBack} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-4 w-4" /><span className="text-sm">Beenden</span>
                    </button>
                    <div className="flex-1 text-center">
                        <p className="text-sm font-semibold">{build.brand} {build.model}</p>
                        <p className="text-[11px] text-muted-foreground">#{build.internal_number}</p>
                    </div>
                    <div className="w-16" />
                </div>
            </header>
            <div className="flex-1 flex items-center justify-center px-6 pb-16">
                <motion.div initial={{ opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-sm flex flex-col items-center text-center gap-6">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-green-500/20 blur-2xl scale-150" />
                        <div className="relative h-24 w-24 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                            <CheckCircle2 className="h-12 w-12 text-green-500" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight">Montage abgeschlossen!</h2>
                        <p className="text-muted-foreground">Alle {steps.length} Schritte durchlaufen.</p>
                    </div>
                    <div className="w-full flex flex-col gap-3 pt-2">
                        <button onClick={() => setCompletionDialogOpen(true)}
                            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all">
                            <CheckCircle2 className="h-5 w-5" /> Montage finalisieren
                        </button>
                        <button onClick={onBack} className="w-full h-11 rounded-2xl text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Zurück zur Übersicht
                        </button>
                    </div>
                </motion.div>
            </div>
            <BikeDataCompletionDialog open={completionDialogOpen} onOpenChange={setCompletionDialogOpen} buildId={build.id}
                onSuccess={() => { if (onComplete) onComplete(); else onBack() }} />
        </div>
    )
}

// ── Active Wizard ──
return (
    <div className="flex flex-col h-[100dvh] bg-background">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/4 via-transparent to-transparent pointer-events-none -z-10" />
        <header className="flex-none border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 py-3">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
                <button onClick={onBack} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-4 w-4" /><span className="text-sm">Beenden</span>
                </button>
                <div className="flex-1 text-center min-w-0">
                    <p className="text-sm font-semibold truncate">{build.brand} {build.model}</p>
                    <p className="text-[11px] text-muted-foreground">#{build.internal_number} · Montage</p>
                </div>
                <div className="w-16" />
            </div>
        </header>
        <div className="flex-none px-4 pt-4 pb-2 w-full max-w-2xl mx-auto space-y-3">
            <div className="space-y-1.5">
                <div className="flex justify-between"><span className="text-[11px] text-muted-foreground/60">Fortschritt</span><span className="text-[11px] font-medium text-muted-foreground">{progressPercentage}% · {completedCount}/{steps.length}</span></div>
                <div className="h-0.5 w-full bg-border/60 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} transition={{ duration: 0.4 }} />
                </div>
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
                {steps.map((step, idx) => (
                    <button key={step.id} onClick={() => jumpToStep(idx)}
                        className={cn("flex-none h-8 min-w-[32px] px-2 rounded-xl text-xs font-semibold border transition-all",
                            idx === currentStepIndex ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/30" :
                                completedSteps.has(step.id) ? "bg-green-500/10 text-green-600 border-green-500/20" :
                                    skippedSteps.has(step.id) ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                                        "bg-muted/40 text-muted-foreground border-border/40 hover:border-border")}>
                        {completedSteps.has(step.id) ? <Check className="h-3.5 w-3.5" /> : skippedSteps.has(step.id) ? <SkipForward className="h-3 w-3" /> : idx + 1}
                    </button>
                ))}
            </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6 w-full max-w-2xl mx-auto">
            <AnimatePresence mode="wait">
                <motion.div key={currentStepIndex} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col gap-4">
                    <div className={cn("flex flex-col rounded-3xl border bg-card/60 backdrop-blur-xl overflow-hidden",
                        isStepCompleted ? "border-green-500/20" : "border-border/40")}>
                        <div className="px-6 pt-6 pb-4 space-y-3">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Schritt {currentStepIndex + 1} von {steps.length}</p>
                            <h2 className="text-3xl font-bold tracking-tight leading-tight">{currentStep?.title || '—'}</h2>
                            {currentStep?.description && <p className="text-base text-muted-foreground leading-relaxed">{currentStep.description}</p>}
                            {isStepCompleted && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
                                    <Check className="h-3 w-3" /> Erledigt
                                </span>
                            )}
                        </div>
                        <div className="h-px bg-border/30 mx-6" />
                        <div className="px-6 py-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 mb-2">Notiz</p>
                            <textarea value={currentStep ? (stepNotes[currentStep.id] || '') : ''} onChange={(e) => handleNoteChange(e.target.value)}
                                placeholder="Bemerkungen zur Montage…"
                                className="w-full bg-transparent text-sm leading-relaxed resize-none outline-none placeholder:text-muted-foreground/30 min-h-[70px]" rows={3} />
                        </div>
                        <div className="px-4 pb-5 flex flex-col gap-2">
                            <div className="flex items-center justify-between px-2">
                                <button onClick={() => jumpToStep(currentStepIndex - 1)} disabled={currentStepIndex === 0}
                                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                                    <ArrowLeft className="h-3.5 w-3.5" /> Zurück
                                </button>
                                {isStepCompleted || isStepSkipped ? (
                                    <button onClick={handleRevertStep} disabled={isSaving} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Als unerledigt</button>
                                ) : (
                                    <button onClick={handleSkipStep} disabled={isSaving} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Überspringen →</button>
                                )}
                            </div>
                            <button onClick={handleCompleteStep} disabled={isSaving}
                                className={cn("w-full h-14 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]",
                                    isStepCompleted ? "bg-green-600 text-white shadow-green-600/20 hover:bg-green-700" : "bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90",
                                    isSaving && "opacity-50 cursor-not-allowed")}>
                                {isSaving ? <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> :
                                    <><Check className="h-5 w-5" />{isStepCompleted ? 'Aktualisieren' : 'Abschließen'}</>}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
        <EmployeeSelectionModal open={showEmployeeSelect}
            onOpenChange={(open) => { if (!open && !selectionMade.current) { onBack() } setShowEmployeeSelect(open) }}
            triggerAction="Montage durchführen"
            onEmployeeSelected={(id) => { selectionMade.current = true; selectEmployee(id); setShowEmployeeSelect(false) }}
        />
    </div>
)
}
