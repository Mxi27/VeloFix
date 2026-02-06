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

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-muted-foreground">Lade Montage-Modus...</p>
                </div>
            </div>
        )
    }

    const progressPercentage = steps.length > 0 ? Math.round(((completedSteps.size + skippedSteps.size) / steps.length) * 100) : 0

    // Render Finished Screen
    if (isFinished) {
        return (
            <div className="flex flex-col h-screen bg-background overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 -z-10" />

                {/* Header */}
                <header className="flex-none bg-glass-bg backdrop-blur-md border-b border-glass-border px-4 py-3 sm:px-6">
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                Montage-Modus
                            </Badge>
                            <div>
                                <h1 className="text-sm font-semibold sm:text-base">{build.brand} {build.model}</h1>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={onBack}>
                            <X className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Beenden</span>
                        </Button>
                    </div>
                </header>

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

                            <h2 className="text-3xl font-bold mb-2">Montage abgeschlossen!</h2>
                            <p className="text-muted-foreground mb-8">
                                Alle {steps.length} Schritte wurden durchlaufen.
                            </p>

                            <div className="w-full space-y-3">
                                <Button
                                    className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                                    onClick={() => setCompletionDialogOpen(true)}
                                >
                                    <CheckCircle2 className="mr-2 h-5 w-5" />
                                    Montage finalisieren (Daten eingeben)
                                </Button>

                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={onBack}
                                >
                                    Zurück zur Übersicht
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                </main>

                <BikeDataCompletionDialog
                    open={completionDialogOpen}
                    onOpenChange={setCompletionDialogOpen}
                    buildId={build.id}
                    onSuccess={() => {
                        if (onComplete) onComplete()
                        else onBack()
                    }}
                />
            </div>
        )
    }

    // Render Active Wizard
    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden relative">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 -z-10" />

            {/* Header */}
            <header className="flex-none bg-glass-bg backdrop-blur-md border-b border-glass-border px-4 py-3 sm:px-6">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            Montage-Modus
                        </Badge>
                        <div>
                            <h1 className="text-sm font-semibold sm:text-base">{build.brand} {build.model}</h1>
                            <p className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-xs">{build.internal_number}</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={onBack}>
                        <X className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Beenden</span>
                    </Button>
                </div>
            </header>

            {/* Progress Area */}
            <div className="flex-none px-4 py-6 sm:px-6 max-w-5xl mx-auto w-full space-y-6">
                <Card className="p-4 sm:p-6 bg-card/60 backdrop-blur-sm border-border/50">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Fortschritt</span>
                        <span className="text-sm font-bold">{currentStepIndex + 1} / {steps.length} Schritte</span>
                    </div>
                    <div className="h-3 w-full bg-secondary/50 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercentage}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </Card>

                {/* Step Bubbles */}
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start items-center">
                    {steps.map((step, idx) => {
                        let statusColor = "bg-muted text-muted-foreground border-border"
                        if (idx === currentStepIndex) statusColor = "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                        else if (completedSteps.has(step.id)) statusColor = "bg-green-500/20 text-green-600 border-green-500/30"
                        else if (skippedSteps.has(step.id)) statusColor = "bg-yellow-500/20 text-yellow-600 border-yellow-500/30"

                        return (
                            <button
                                key={step.id}
                                onClick={() => jumpToStep(idx)}
                                className={cn(
                                    "h-10 w-10 flex items-center justify-center rounded-lg border text-sm font-medium transition-all hover:scale-105 active:scale-95",
                                    statusColor
                                )}
                            >
                                {completedSteps.has(step.id) ? <Check className="h-5 w-5" /> : (
                                    skippedSteps.has(step.id) ? <SkipForward className="h-4 w-4" /> : (idx + 1)
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Main Content */}
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
                                {/* Step Header */}
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <Badge variant="secondary" className="mb-2">Schritt {currentStepIndex + 1}</Badge>
                                        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                                            {currentStep ? currentStep.title : 'Unbekannt'}
                                        </h2>
                                        {currentStep?.description && (
                                            <p className="text-lg text-muted-foreground">{currentStep.description}</p>
                                        )}
                                    </div>
                                    {isStepCompleted && (
                                        <div className="bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5">
                                            <CheckCircle2 className="h-4 w-4" />
                                            Erledigt
                                        </div>
                                    )}
                                </div>

                                {/* Notes */}
                                <div className="space-y-3">
                                    <Label>Notizen (Optional)</Label>
                                    <Textarea
                                        value={currentStep ? (stepNotes[currentStep.id] || '') : ''}
                                        onChange={(e) => handleNoteChange(e.target.value)}
                                        placeholder="Bemerkungen zur Montage..."
                                        className="bg-muted/30 resize-none min-h-[100px]"
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
                                    {isStepCompleted || isStepSkipped ? (
                                        <Button
                                            variant="ghost"
                                            onClick={handleRevertStep}
                                            disabled={isSaving}
                                            className="flex-1 sm:flex-none text-muted-foreground hover:text-foreground"
                                        >
                                            Als unerledigt markieren
                                        </Button>
                                    ) : (
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
                                            isStepCompleted ? "bg-green-600 hover:bg-green-700" : ""
                                        )}
                                    >
                                        {isSaving ? "Speichere..." : (isStepCompleted ? (
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

            <EmployeeSelectionModal
                open={showEmployeeSelect}
                onOpenChange={(open) => {
                    // Only allow closing if selection was made or if we decide to exit
                    if (!open && !selectionMade.current) {
                        onBack()
                    }
                    setShowEmployeeSelect(open)
                }}
                triggerAction="Montage durchführen"
                onEmployeeSelected={(id) => {
                    selectionMade.current = true
                    selectEmployee(id)
                    setShowEmployeeSelect(false)
                }}
            />
        </div>
    )
}
