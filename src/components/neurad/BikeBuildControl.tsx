import { useState, useEffect, useRef } from "react"
// import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
// import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ShieldCheck, Check, Star, X, ArrowLeft, CheckCircle2 } from "lucide-react"
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
                    qc_mechanic_id: activeEmployee?.id || null,
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
        const newData = { ...controlData, control_notes: newNotes }
        setControlData(newData)
    }

    const handleCompleteControl = async () => {
        setIsSaving(true)
        try {
            const finalData = {
                ...controlData,
                completed: true,
                completed_at: new Date().toISOString()
            }
            await saveControlData(finalData)
            toast.success("Kontrolle abgeschlossen")
            if (onComplete) onComplete()
            else onBack()
        } catch (error) {
            console.error(error)
            toast.error("Fehler beim Abschließen")
        } finally {
            setIsSaving(false)
        }
    }

    if (loading) return (
        <div className="flex h-[100dvh] items-center justify-center bg-background">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
    )

    const progressPercentage = steps.length > 0 ? Math.round((controlData.verified_steps.length / steps.length) * 100) : 0

    // ── Finished Screen ──
    if (isFinished) {
        return (
            <div className="flex flex-col h-[100dvh] bg-background">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/4 via-transparent to-transparent pointer-events-none -z-10" />
                <header className="flex-none border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 py-3">
                    <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
                        <button onClick={onBack} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                            <X className="h-4 w-4" /><span className="text-sm">Beenden</span>
                        </button>
                        <div className="flex-1 text-center">
                            <p className="text-sm font-semibold">{build.brand} {build.model}</p>
                            <p className="text-[11px] text-muted-foreground">Endkontrolle</p>
                        </div>
                        <div className="w-16" />
                    </div>
                </header>
                <div className="flex-1 flex items-center justify-center px-6 pb-16">
                    <motion.div initial={{ opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full max-w-sm flex flex-col items-center text-center gap-6">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-2xl scale-150" />
                            <div className="relative h-24 w-24 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                <ShieldCheck className="h-12 w-12 text-amber-500" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold tracking-tight">Kontrolle abgeschlossen!</h2>
                            <p className="text-muted-foreground">Bewertung abgeben.</p>
                        </div>
                        <div className="w-full rounded-2xl border border-border/40 bg-card/50 p-4 space-y-3">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Bewertung</p>
                            <div className="flex justify-center gap-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button key={star} onClick={() => setControlData({ ...controlData, rating: star })}
                                        className={cn("h-12 w-12 rounded-full border-2 flex items-center justify-center transition-all",
                                            star <= controlData.rating ? "border-yellow-400 bg-yellow-400/15" : "border-border/40 hover:border-yellow-400/50")}>
                                        <Star className={cn("h-5 w-5", star <= controlData.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20")} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="w-full rounded-2xl border border-border/40 bg-card/50 p-4 space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Feedback</p>
                            <textarea value={controlData.feedback} onChange={(e) => setControlData({ ...controlData, feedback: e.target.value })}
                                placeholder="Gesamtfeedback…"
                                className="w-full bg-transparent text-sm leading-relaxed resize-none outline-none placeholder:text-muted-foreground/30 min-h-[60px]" rows={3} />
                        </div>
                        <div className="w-full flex flex-col gap-3">
                            <button onClick={handleCompleteControl} disabled={isSaving}
                                className={cn("w-full h-14 rounded-2xl bg-amber-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 hover:bg-amber-700 active:scale-[0.98] transition-all",
                                    isSaving && "opacity-50 cursor-not-allowed")}>
                                {isSaving ? <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <><ShieldCheck className="h-5 w-5" /> Kontrolle abschließen</>}
                            </button>
                            <button onClick={() => setIsFinished(false)} className="w-full h-11 rounded-2xl text-sm text-muted-foreground hover:text-foreground transition-colors">Zurück zur Liste</button>
                        </div>
                    </motion.div>
                </div>
            </div>
        )
    }

    // ── Active Control ──
    return (
        <div className="flex flex-col h-[100dvh] bg-background">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/4 via-transparent to-transparent pointer-events-none -z-10" />
            <header className="flex-none border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 py-3">
                <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
                    <button onClick={onBack} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-4 w-4" /><span className="text-sm">Beenden</span>
                    </button>
                    <div className="flex-1 text-center min-w-0">
                        <p className="text-sm font-semibold truncate">{build.brand} {build.model}</p>
                        <p className="text-[11px] text-muted-foreground">Endkontrolle</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full shrink-0">
                        <ShieldCheck className="h-3 w-3" /> QC
                    </span>
                </div>
            </header>
            <div className="flex-none px-4 pt-4 pb-2 w-full max-w-2xl mx-auto space-y-3">
                <div className="space-y-1.5">
                    <div className="flex justify-between"><span className="text-[11px] text-muted-foreground/60">Fortschritt</span><span className="text-[11px] font-medium text-muted-foreground">{progressPercentage}% · {controlData.verified_steps.length}/{steps.length}</span></div>
                    <div className="h-0.5 w-full bg-border/60 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-amber-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} transition={{ duration: 0.4 }} />
                    </div>
                </div>
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
                    {steps.map((step, idx) => {
                        const verified = controlData.verified_steps.includes(step.id)
                        return (
                            <button key={step.id} onClick={() => jumpToStep(idx)}
                                className={cn("flex-none h-8 min-w-[32px] px-2 rounded-xl text-xs font-semibold border transition-all",
                                    idx === currentStepIndex ? "bg-amber-500 text-white border-amber-500 ring-2 ring-amber-500/30" :
                                        verified ? "bg-green-500/10 text-green-600 border-green-500/20" :
                                            "bg-muted/40 text-muted-foreground border-border/40 hover:border-border")}>
                                {verified ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                            </button>
                        )
                    })}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-6 w-full max-w-2xl mx-auto">
                <AnimatePresence mode="wait">
                    <motion.div key={currentStepIndex} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
                        <div className={cn("flex flex-col rounded-3xl border bg-card/60 backdrop-blur-xl overflow-hidden",
                            isStepVerified ? "border-green-500/20" : "border-border/40")}>
                            <div className="px-6 pt-6 pb-4 space-y-3">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Schritt {currentStepIndex + 1} von {steps.length}</p>
                                <h2 className="text-3xl font-bold tracking-tight leading-tight">{currentStep?.title}</h2>
                                {currentStep?.description && <p className="text-base text-muted-foreground leading-relaxed">{currentStep.description}</p>}
                                {isStepVerified && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
                                        <Check className="h-3 w-3" /> Verifiziert
                                    </span>
                                )}
                            </div>
                            <div className="h-px bg-border/30 mx-6" />
                            <div className="px-6 py-4">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 mb-2">Kontroll-Anmerkung</p>
                                <textarea value={currentNote} onChange={(e) => handleNoteChange(e.target.value)}
                                    placeholder="Alles in Ordnung?"
                                    className="w-full bg-transparent text-sm leading-relaxed resize-none outline-none placeholder:text-muted-foreground/30 min-h-[70px]" rows={3} />
                            </div>
                            <div className="px-4 pb-5 flex flex-col gap-2">
                                <div className="flex items-center justify-between px-2">
                                    <button onClick={() => jumpToStep(currentStepIndex - 1)} disabled={currentStepIndex === 0}
                                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                                        <ArrowLeft className="h-3.5 w-3.5" /> Zurück
                                    </button>
                                    <button onClick={handleSkipStep} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Überspringen →</button>
                                </div>
                                <button onClick={handleVerifyStep}
                                    className={cn("w-full h-14 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]",
                                        isStepVerified ? "bg-green-600 text-white shadow-green-600/20 hover:bg-green-700" : "bg-amber-600 text-white shadow-amber-600/20 hover:bg-amber-700")}>
                                    {isStepVerified ? <><CheckCircle2 className="h-5 w-5" /> Bestätigt</> : <><ShieldCheck className="h-5 w-5" /> Bestätigen</>}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
            <EmployeeSelectionModal open={showEmployeeSelect}
                onOpenChange={(open) => { if (!open && !selectionMade.current) { onBack() } setShowEmployeeSelect(open) }}
                triggerAction="Endkontrolle durchführen"
                onEmployeeSelected={(id) => { selectionMade.current = true; selectEmployee(id); setShowEmployeeSelect(false) }}
            />
        </div>
    )
}
