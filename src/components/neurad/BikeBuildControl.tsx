import { useState, useEffect, useRef } from "react"
// import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
// import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Loader2, ShieldCheck, Check, Star } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { EmployeeSelectionModal } from "@/components/EmployeeSelectionModal"
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

export function BikeBuildControl({ build, onBack, onComplete }: ComponentProps) {
    const { workshopId, user } = useAuth()
    const { activeEmployee, isKioskMode, selectEmployee } = useEmployee()

    // State
    const [steps, setSteps] = useState<Step[]>([])
    const [loading, setLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [currentStepIndex, setCurrentStepIndex] = useState(0)

    // Data State
    const [controlData, setControlData] = useState<any>({
        verified_steps: [],
        control_notes: {},
        rating: 0,
        feedback: ''
    })

    const [isFinished, setIsFinished] = useState(false)
    const [showEmployeeSelect, setShowEmployeeSelect] = useState(false)
    const selectionMade = useRef(false)

    // Kiosk Mode
    useEffect(() => {
        if (isKioskMode && !activeEmployee) {
            setShowEmployeeSelect(true)
            selectionMade.current = false
        }
    }, [isKioskMode, activeEmployee])

    // Load Data
    useEffect(() => {
        const fetchData = async () => {
            if (!workshopId || !build) return
            setLoading(true)
            try {
                // Fetch Steps
                let query = supabase
                    .from('neurad_steps')
                    .select('*')
                    .eq('workshop_id', workshopId)
                    .eq('is_active', true)

                if (build.checklist_template) {
                    query = query.eq('template_name', build.checklist_template)
                }

                const { data: stepsData } = await query.order('order_index', { ascending: true })
                if (stepsData) setSteps(stepsData)

                // Initialize control data
                if (build.control_data) {
                    setControlData({
                        verified_steps: build.control_data.verified_steps || [],
                        control_notes: build.control_data.control_notes || {},
                        rating: build.control_data.rating || 0,
                        feedback: build.control_data.feedback || ''
                    })
                }

            } catch (error) {
                console.error(error)
                toast.error("Fehler beim Laden")
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [workshopId, build])

    const saveControlData = async (newData: any) => {
        if (!build) return
        setIsSaving(true)
        try {
            await supabase
                .from('bike_builds')
                .update({
                    control_data: {
                        ...newData,
                        last_updated: new Date().toISOString(),
                        inspector: activeEmployee ? { id: activeEmployee.id, name: activeEmployee.name } : { id: user?.id, name: 'User' }
                    }
                })
                .eq('id', build.id)
        } catch (e) {
            console.error(e)
        } finally {
            setIsSaving(false)
        }
    }

    const currentStep = steps[currentStepIndex]
    const isStepVerified = controlData.verified_steps.includes(currentStep?.id)
    const currentNote = controlData.control_notes[currentStep?.id] || ''

    const handleVerifyStep = async () => {
        if (!currentStep) return

        const newVerified = [...controlData.verified_steps, currentStep.id]
        const newData = { ...controlData, verified_steps: newVerified }

        setControlData(newData)
        await saveControlData(newData)

        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1)
        } else {
            setIsFinished(true)
        }
    }

    const handleSkipStep = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1)
        } else {
            setIsFinished(true)
        }
    }

    const jumpToStep = (index: number) => {
        setCurrentStepIndex(index)
        setIsFinished(false)
    }

    const handleNoteChange = (text: string) => {
        if (!currentStep) return
        const newNotes = { ...controlData.control_notes, [currentStep.id]: text }
        setControlData({ ...controlData, control_notes: newNotes })
    }

    const handleCompleteControl = async () => {
        const finalData = { ...controlData, completed: true }
        await saveControlData(finalData)

        // Also update status to 'ready' or 'controlled'?
        // For now just save data.

        if (onComplete) onComplete()
    }

    if (loading) return <div className="p-8"><Loader2 className="animate-spin" /></div>

    const progressPercentage = steps.length > 0 ? Math.round((controlData.verified_steps.length / steps.length) * 100) : 0

    // Finished View
    if (isFinished) {
        return (
            <div className="flex flex-col h-screen bg-background overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-background to-purple-500/5 -z-10" />

                <header className="flex-none bg-glass-bg backdrop-blur-md border-b border-glass-border px-4 py-3 sm:px-6">
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                                <ShieldCheck className="mr-1 h-3 w-3" />
                                Endkontrolle
                            </Badge>
                            <h1 className="text-sm font-semibold">{build.brand} {build.model}</h1>
                        </div>
                    </div>
                </header>

                <main className="flex-1 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md p-6 sm:p-8 space-y-6">
                        <div className="text-center space-y-2">
                            <ShieldCheck className="h-12 w-12 mx-auto text-green-500 mb-2" />
                            <h2 className="text-2xl font-bold">Kontrolle Abschluss</h2>
                            <p className="text-muted-foreground">Bewertung abgeben.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2 text-center">
                                <label className="text-sm font-medium">Bewertung</label>
                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setControlData({ ...controlData, rating: star })}
                                            className="focus:outline-none transition-transform hover:scale-110"
                                        >
                                            <Star className={cn("h-8 w-8", star <= controlData.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Textarea
                                placeholder="Gesamtfeedback..."
                                value={controlData.feedback}
                                onChange={(e) => setControlData({ ...controlData, feedback: e.target.value })}
                            />
                        </div>

                        <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={handleCompleteControl}
                            disabled={isSaving}
                        >
                            {isSaving ? "Speichere..." : "Kontrolle abschließen"}
                        </Button>
                        <Button variant="ghost" className="w-full" onClick={() => setIsFinished(false)}>Zurück</Button>
                    </Card>
                </main>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-background to-purple-500/5 -z-10" />

            <header className="flex-none bg-glass-bg backdrop-blur-md border-b border-glass-border px-4 py-3 sm:px-6">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            Endkontrolle
                        </Badge>
                        <h1 className="text-sm font-semibold">{build.brand} {build.model}</h1>
                    </div>
                    <Button variant="outline" size="sm" onClick={onBack}>Beenden</Button>
                </div>
            </header>

            <div className="flex-none px-4 py-6 sm:px-6 max-w-5xl mx-auto w-full space-y-6">
                <Card className="p-4 sm:p-6 bg-card/60 backdrop-blur-sm border-border/50">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Fortschritt</span>
                        <span className="text-sm font-bold">{currentStepIndex + 1} / {steps.length}</span>
                    </div>
                    <div className="h-3 w-full bg-secondary/50 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-indigo-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </Card>

                <div className="flex flex-wrap gap-2 justify-center sm:justify-start items-center">
                    {steps.map((step, idx) => {
                        const verified = controlData.verified_steps.includes(step.id)
                        let statusColor = "bg-muted text-muted-foreground border-border"
                        if (idx === currentStepIndex) statusColor = "bg-indigo-500 text-white"
                        else if (verified) statusColor = "bg-green-500/20 text-green-600 border-green-500/30"

                        return (
                            <button
                                key={step.id}
                                onClick={() => jumpToStep(idx)}
                                className={cn("h-10 w-10 flex items-center justify-center rounded-lg border text-sm font-medium", statusColor)}
                            >
                                {verified ? <Check className="h-5 w-5" /> : (idx + 1)}
                            </button>
                        )
                    })}
                </div>
            </div>

            <main className="flex-1 px-4 pb-6 overflow-y-auto w-full max-w-5xl mx-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStepIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="h-full flex flex-col"
                    >
                        <Card className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-card to-card/95 border-border/60 shadow-elevated-lg">
                            <div className="p-6 sm:p-8 flex-1 flex flex-col gap-8">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <Badge variant="secondary" className="mb-2">Schritt {currentStepIndex + 1}</Badge>
                                        <h2 className="text-2xl sm:text-4xl font-bold">{currentStep?.title}</h2>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium text-muted-foreground">Kontroll-Anmerkung</h3>
                                    <Textarea
                                        value={currentNote}
                                        onChange={(e) => handleNoteChange(e.target.value)}
                                        placeholder="Alles in Ordnung?"
                                        className="bg-indigo-500/5 resize-none min-h-[100px]"
                                    />
                                </div>
                            </div>

                            <div className="p-4 sm:p-6 bg-muted/10 border-t border-border/50 flex flex-col sm:flex-row gap-3 sm:justify-between items-center">
                                <Button variant="ghost" onClick={() => jumpToStep(currentStepIndex - 1)} disabled={currentStepIndex === 0}>Zurück</Button>
                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={handleSkipStep}>Überspringen</Button>
                                    <Button
                                        onClick={handleVerifyStep}
                                        className={cn("bg-indigo-600 hover:bg-indigo-700 text-white", isStepVerified ? "bg-green-600" : "")}
                                    >
                                        {isStepVerified ? "Verifiziert" : "Bestätigen"}
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
                    if (!open && !selectionMade.current) {
                        onBack()
                    }
                    setShowEmployeeSelect(open)
                }}
                triggerAction="Endkontrolle durchführen"
                onEmployeeSelected={(id) => {
                    selectionMade.current = true
                    selectEmployee(id)
                    setShowEmployeeSelect(false)
                }}
            />
        </div>
    )
}
