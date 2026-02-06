import { useState, useCallback } from "react"
import { motion, AnimatePresence, type PanInfo } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
    Check,
    ChevronLeft,
    ChevronRight,
    SkipForward,
    AlertTriangle,
    CheckCircle2,
    X,
    MessageSquare,
} from "lucide-react"

// Types
export interface StepInput {
    type: "text" | "number" | "torque" | "checkbox" | "note"
    label: string
    required?: boolean
    placeholder?: string
    unit?: string
}

export interface DecisionOption {
    label: string
    value: string
    addsSteps?: StepFlowStep[]  // Steps to add if this option is selected
}

export interface StepFlowStep {
    id: string
    title: string
    description?: string
    type: "action" | "decision" | "input"
    required?: boolean
    inputs?: StepInput[]
    options?: DecisionOption[]  // For decision type
    warning?: boolean
}

export interface StepFlowProps {
    steps: StepFlowStep[]
    title: string
    subtitle?: string
    onComplete: (results: StepFlowResult) => void
    onExit: () => void
    initialProgress?: StepFlowProgress
}

export interface StepFlowProgress {
    completedSteps: string[]
    skippedSteps: string[]
    answers: Record<string, any>
    notes: Record<string, string>
}

export interface StepFlowResult extends StepFlowProgress {
    allStepsCompleted: boolean
    dynamicStepsAdded: StepFlowStep[]
}

const SWIPE_THRESHOLD = 100

export function StepFlow({
    steps: initialSteps,
    title,
    subtitle,
    onComplete,
    onExit,
    initialProgress,
}: StepFlowProps) {
    // State
    const [steps, setSteps] = useState<StepFlowStep[]>(initialSteps)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [completedSteps, setCompletedSteps] = useState<Set<string>>(
        new Set(initialProgress?.completedSteps || [])
    )
    const [skippedSteps, setSkippedSteps] = useState<Set<string>>(
        new Set(initialProgress?.skippedSteps || [])
    )
    const [answers, setAnswers] = useState<Record<string, any>>(
        initialProgress?.answers || {}
    )
    const [notes, setNotes] = useState<Record<string, string>>(
        initialProgress?.notes || {}
    )
    const [dynamicStepsAdded, setDynamicStepsAdded] = useState<StepFlowStep[]>([])
    const [isFinished, setIsFinished] = useState(false)
    const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward

    const currentStep = steps[currentIndex]
    const progress = steps.length > 0
        ? Math.round(((completedSteps.size + skippedSteps.size) / steps.length) * 100)
        : 0

    // Navigation
    const goToNext = useCallback(() => {
        if (currentIndex < steps.length - 1) {
            setDirection(1)
            setCurrentIndex(prev => prev + 1)
        } else {
            setIsFinished(true)
        }
    }, [currentIndex, steps.length])

    const goToPrevious = useCallback(() => {
        if (currentIndex > 0) {
            setDirection(-1)
            setCurrentIndex(prev => prev - 1)
        }
    }, [currentIndex])

    // Actions
    const handleComplete = useCallback(() => {
        if (!currentStep) return

        const newCompleted = new Set(completedSteps)
        newCompleted.add(currentStep.id)
        const newSkipped = new Set(skippedSteps)
        newSkipped.delete(currentStep.id)

        setCompletedSteps(newCompleted)
        setSkippedSteps(newSkipped)

        setTimeout(() => goToNext(), 150)
    }, [currentStep, completedSteps, skippedSteps, goToNext])

    const handleSkip = useCallback(() => {
        if (!currentStep) return

        const newSkipped = new Set(skippedSteps)
        newSkipped.add(currentStep.id)
        const newCompleted = new Set(completedSteps)
        newCompleted.delete(currentStep.id)

        setSkippedSteps(newSkipped)
        setCompletedSteps(newCompleted)

        setTimeout(() => goToNext(), 150)
    }, [currentStep, skippedSteps, completedSteps, goToNext])

    const handleDecision = useCallback((option: DecisionOption) => {
        if (!currentStep) return

        // Store answer
        setAnswers(prev => ({ ...prev, [currentStep.id]: option.value }))

        // Add dynamic steps if any
        if (option.addsSteps && option.addsSteps.length > 0) {
            const newSteps = [...steps]
            // Insert after current step
            newSteps.splice(currentIndex + 1, 0, ...option.addsSteps)
            setSteps(newSteps)
            setDynamicStepsAdded(prev => [...prev, ...option.addsSteps!])
        }

        // Mark as complete and move on
        const newCompleted = new Set(completedSteps)
        newCompleted.add(currentStep.id)
        setCompletedSteps(newCompleted)

        setTimeout(() => goToNext(), 150)
    }, [currentStep, steps, currentIndex, completedSteps, goToNext])

    const handleNoteChange = useCallback((text: string) => {
        if (!currentStep) return
        setNotes(prev => ({ ...prev, [currentStep.id]: text }))
    }, [currentStep])

    const handleFinish = useCallback(() => {
        onComplete({
            completedSteps: Array.from(completedSteps),
            skippedSteps: Array.from(skippedSteps),
            answers,
            notes,
            allStepsCompleted: completedSteps.size === steps.length,
            dynamicStepsAdded,
        })
    }, [completedSteps, skippedSteps, answers, notes, steps.length, dynamicStepsAdded, onComplete])

    // Swipe handling
    const handleDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const { offset, velocity } = info

        if (Math.abs(offset.x) > SWIPE_THRESHOLD || Math.abs(velocity.x) > 500) {
            if (offset.x > 0 && currentIndex > 0) {
                goToPrevious()
            } else if (offset.x < 0 && currentIndex < steps.length - 1) {
                handleComplete()
            }
        }
    }, [currentIndex, steps.length, goToPrevious, handleComplete])

    // Animation variants
    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 100 : -100,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            x: direction > 0 ? -100 : 100,
            opacity: 0,
        }),
    }

    // Finished Screen
    if (isFinished) {
        return (
            <div className="flex flex-col h-full bg-zen">
                {/* Header */}
                <header className="flex-none bg-glass-bg backdrop-blur-md border-b border-glass-border px-4 py-3 sm:px-6">
                    <div className="flex items-center justify-between">
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                            Fertig
                        </Badge>
                        <motion.div whileTap={{ scale: 0.95 }}>
                            <Button variant="ghost" size="sm" onClick={onExit}>
                                <X className="h-4 w-4" />
                            </Button>
                        </motion.div>
                    </div>
                </header>

                <main className="flex-1 flex items-center justify-center p-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className="w-full max-w-lg"
                    >
                        <Card className="p-10 flex flex-col items-center text-center bg-card/80 backdrop-blur-md border-green-500/20 shadow-success-glow">
                            <motion.div
                                className="h-28 w-28 rounded-full bg-green-500/15 flex items-center justify-center mb-8"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                            >
                                <CheckCircle2 className="h-14 w-14 text-green-500" />
                            </motion.div>

                            <motion.h2
                                className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                Durchgang abgeschlossen!
                            </motion.h2>

                            <motion.p
                                className="text-muted-foreground text-lg mb-10"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                            >
                                {completedSteps.size} von {steps.length} Schritten erledigt.
                            </motion.p>

                            <motion.div
                                className="w-full space-y-4"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <motion.div whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }}>
                                    <Button
                                        className="w-full h-14 text-base font-semibold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/25"
                                        onClick={handleFinish}
                                    >
                                        <CheckCircle2 className="mr-2 h-5 w-5" />
                                        Abschließen
                                    </Button>
                                </motion.div>
                            </motion.div>
                        </Card>
                    </motion.div>
                </main>
            </div>
        )
    }

    // Active Step View
    return (
        <div className="flex flex-col h-full bg-zen overflow-hidden">
            {/* Ambient Glow */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full bg-primary/5 blur-[100px]" />
            </div>

            {/* Header */}
            <header className="flex-none bg-glass-bg backdrop-blur-md border-b border-glass-border px-4 py-3 sm:px-6 relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            {title}
                        </Badge>
                        {subtitle && (
                            <span className="text-sm text-muted-foreground hidden sm:inline">{subtitle}</span>
                        )}
                    </div>
                    <motion.div whileTap={{ scale: 0.95 }}>
                        <Button variant="ghost" size="sm" onClick={onExit}>
                            <X className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Beenden</span>
                        </Button>
                    </motion.div>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-4">
                    <Progress value={progress} className="flex-1 h-2" />
                    <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                        {currentIndex + 1} / {steps.length}
                    </span>
                </div>
            </header>

            {/* Step Content */}
            <main className="flex-1 relative overflow-hidden">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentStep?.id}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={handleDragEnd}
                        className="absolute inset-0 flex flex-col p-4 sm:p-6 lg:p-10"
                    >
                        <Card className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-card to-card/95 border-border/60 shadow-neon-glow">
                            <div className="p-6 sm:p-10 flex-1 flex flex-col gap-6">
                                {/* Step Header */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-sm px-3 py-1">
                                            Schritt {currentIndex + 1}
                                        </Badge>
                                        {currentStep?.warning && (
                                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                                                <AlertTriangle className="h-3 w-3 mr-1" />
                                                Achtung
                                            </Badge>
                                        )}
                                        {completedSteps.has(currentStep?.id || "") && (
                                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                                                <Check className="h-3 w-3 mr-1" />
                                                Erledigt
                                            </Badge>
                                        )}
                                    </div>

                                    <motion.h2
                                        className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                    >
                                        {currentStep?.title}
                                    </motion.h2>

                                    {currentStep?.description && (
                                        <motion.p
                                            className="text-lg text-muted-foreground max-w-2xl"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.2 }}
                                        >
                                            {currentStep.description}
                                        </motion.p>
                                    )}
                                </div>

                                {/* Decision Options */}
                                {currentStep?.type === "decision" && currentStep.options && (
                                    <motion.div
                                        className="grid gap-3 sm:grid-cols-2 max-w-xl"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.25 }}
                                    >
                                        {currentStep.options.map((option) => (
                                            <motion.div key={option.value} whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }}>
                                                <Button
                                                    variant={answers[currentStep.id] === option.value ? "default" : "outline"}
                                                    className="w-full h-14 text-lg"
                                                    onClick={() => handleDecision(option)}
                                                >
                                                    {option.label}
                                                </Button>
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                )}

                                {/* Notes */}
                                <motion.div
                                    className="mt-auto"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                                        <MessageSquare className="h-4 w-4" />
                                        <span>Notizen (Optional)</span>
                                    </div>
                                    <Textarea
                                        value={notes[currentStep?.id || ""] || ""}
                                        onChange={(e) => handleNoteChange(e.target.value)}
                                        placeholder="Bemerkungen..."
                                        className="bg-muted/30 resize-none min-h-[80px]"
                                    />
                                </motion.div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-4 sm:p-6 bg-muted/10 border-t border-border/50 flex flex-col sm:flex-row gap-3 sm:justify-between items-center">
                                <motion.div whileTap={{ scale: 0.97 }}>
                                    <Button
                                        variant="ghost"
                                        onClick={goToPrevious}
                                        disabled={currentIndex === 0}
                                        className="text-muted-foreground"
                                    >
                                        <ChevronLeft className="mr-1 h-4 w-4" />
                                        Zurück
                                    </Button>
                                </motion.div>

                                <div className="flex gap-3">
                                    {currentStep?.type !== "decision" && (
                                        <>
                                            <motion.div whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }}>
                                                <Button
                                                    variant="outline"
                                                    onClick={handleSkip}
                                                    disabled={currentStep?.required}
                                                    className="border-border/50"
                                                >
                                                    <SkipForward className="mr-2 h-4 w-4" />
                                                    Überspringen
                                                </Button>
                                            </motion.div>

                                            <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.03 }}>
                                                <Button
                                                    onClick={handleComplete}
                                                    className={cn(
                                                        "min-w-[140px] shadow-lg transition-shadow",
                                                        completedSteps.has(currentStep?.id || "")
                                                            ? "bg-green-600 hover:bg-green-700 shadow-green-600/20"
                                                            : "shadow-primary/20"
                                                    )}
                                                >
                                                    <Check className="mr-2 h-4 w-4" />
                                                    {completedSteps.has(currentStep?.id || "") ? "Aktualisieren" : "Erledigt"}
                                                </Button>
                                            </motion.div>
                                        </>
                                    )}

                                    {currentStep?.type === "decision" && (
                                        <Button variant="ghost" onClick={goToNext} disabled={!answers[currentStep?.id || ""]}>
                                            Weiter
                                            <ChevronRight className="ml-1 h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Swipe Hint - Mobile Only */}
            <div className="sm:hidden fixed bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/60 flex items-center gap-1">
                <ChevronLeft className="h-3 w-3" />
                Wischen zum Navigieren
                <ChevronRight className="h-3 w-3" />
            </div>
        </div>
    )
}

export default StepFlow
