import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import {
    Star,
    Send,
    CheckCircle2,
    Zap,
    ThumbsUp,
    Clock,
    ShieldCheck,
    Wallet,
    Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface OrderFeedbackProps {
    orderId: string
    workshopId: string
    customerPostalCode?: string
}

const PRICE_OPTIONS = [
    { label: "Sehr fair & angemessen", value: "sehr_fair", icon: ThumbsUp },
    { label: "Preis-Leistung stimmt", value: "preis_leistung", icon: CheckCircle2 },
    { label: "Etwas teuer, aber gerecht", value: "etwas_teuer", icon: Clock },
    { label: "Definitiv zu teuer", value: "zu_teuer", icon: ShieldCheck },
]

const VALUE_DRIVERS = [
    { label: "Qualität & Sicherheit", value: "qualitaet", icon: ShieldCheck },
    { label: "Schnelligkeit", value: "schnelligkeit", icon: Zap },
    { label: "Transparenz & Beratung", value: "beratung", icon: ThumbsUp },
    { label: "Günstiger Preis", value: "preis", icon: Wallet },
]

export function OrderFeedback({ orderId, workshopId, customerPostalCode }: OrderFeedbackProps) {
    const [step, setStep] = useState(1)
    const [rating, setRating] = useState(0)
    const [hoverRating, setHoverRating] = useState(0)
    const [pricePerception, setPricePerception] = useState("")
    const [mainValue, setMainValue] = useState("")
    const [comment, setComment] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [alreadySubmitted, setAlreadySubmitted] = useState(false)
    const [checking, setChecking] = useState(true)

    // Check on mount if feedback was already submitted for this order
    useEffect(() => {
        const checkExisting = async () => {
            if (!orderId) {
                setChecking(false)
                return
            }
            try {
                const { data, error } = await supabase
                    .from('order_feedback')
                    .select('id')
                    .eq('order_id', orderId)
                    .maybeSingle()

                if (!error && data) {
                    setAlreadySubmitted(true)
                }
            } catch (err) {
                console.warn("Could not check existing feedback:", err)
            } finally {
                setChecking(false)
            }
        }
        checkExisting()
    }, [orderId])

    const handleSubmit = async () => {
        if (!workshopId || !orderId) return

        setIsSubmitting(true)
        try {
            const { error } = await supabase
                .from('order_feedback')
                .insert({
                    order_id: orderId,
                    workshop_id: workshopId,
                    rating,
                    price_perception: pricePerception,
                    main_value: mainValue,
                    comment,
                    customer_postal_code: customerPostalCode,
                })

            if (error) {
                if (error.code === '42P01') {
                    throw new Error("Tabelle 'order_feedback' existiert noch nicht.")
                }
                if (error.code === '23505') {
                    setAlreadySubmitted(true)
                    return
                }
                throw error
            }
            setIsSubmitted(true)
        } catch (err: any) {
            console.error("Error submitting feedback:", err)
            alert(err.message || "Fehler beim Senden. Bitte versuche es später erneut.")
        } finally {
            setIsSubmitting(false)
        }
    }

    // Loading state
    if (checking) {
        return (
            <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary opacity-60" />
            </div>
        )
    }

    // Already submitted
    if (alreadySubmitted) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-8 text-center bg-card border border-border/50 shadow-sm"
            >
                <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                        <CheckCircle2 className="h-7 w-7 text-primary" />
                    </div>
                </div>
                <h3 className="text-lg font-bold mb-2">Du hast bereits Feedback abgegeben</h3>
                <p className="text-sm text-muted-foreground">
                    Danke! Deine Meinung wurde bereits erfasst. Pro Auftrag ist nur eine Bewertung möglich.
                </p>
            </motion.div>
        )
    }

    // Success state
    if (isSubmitted) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-8 text-center bg-card border border-border/50 shadow-sm"
            >
                <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/25">
                        <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                    </div>
                </div>
                <h3 className="text-xl font-bold mb-2">Vielen Dank für dein Feedback!</h3>
                <p className="text-sm text-muted-foreground">Deine Meinung hilft uns, noch besser zu werden.</p>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="rounded-2xl overflow-hidden bg-card border border-border/50 shadow-sm"
        >
            {/* Header / Progress */}
            <div className="px-6 pt-5 pb-2 flex items-center justify-between border-b border-border/40">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                    Dein Feedback zählt
                </span>
                <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1 w-6 rounded-full transition-all duration-300",
                                i <= step ? "bg-primary" : "bg-muted"
                            )}
                        />
                    ))}
                </div>
            </div>

            <div className="p-6">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            className="space-y-6"
                        >
                            <div className="text-center">
                                <h3 className="text-xl font-bold mb-2">Wie zufrieden bist du mit dem Ergebnis?</h3>
                                <div className="flex justify-center gap-2 mt-5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <button
                                            key={s}
                                            onMouseEnter={() => setHoverRating(s)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            onClick={() => {
                                                setRating(s)
                                                setTimeout(() => setStep(2), 350)
                                            }}
                                            className="focus:outline-none transition-transform active:scale-95 hover:scale-110"
                                        >
                                            <Star
                                                className={cn(
                                                    "h-10 w-10 transition-all duration-200",
                                                    (hoverRating || rating) >= s
                                                        ? "fill-amber-400 text-amber-400"
                                                        : "text-muted-foreground/25"
                                                )}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            className="space-y-4"
                        >
                            <h3 className="text-xl font-bold text-center mb-4">
                                Wie bewertest du den Preis für diese Reparatur?
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                {PRICE_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setPricePerception(opt.value)}
                                        className={cn(
                                            "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                                            pricePerception === opt.value
                                                ? "bg-primary/10 border-primary/40 text-foreground"
                                                : "bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                                        )}
                                    >
                                        <opt.icon className={cn(
                                            "h-5 w-5 shrink-0",
                                            pricePerception === opt.value ? "text-primary" : "text-muted-foreground/60"
                                        )} />
                                        <span className="font-medium text-sm">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">Zurück</Button>
                                <Button
                                    disabled={!pricePerception}
                                    onClick={() => setStep(3)}
                                    className="flex-[2] font-bold rounded-xl h-11"
                                >
                                    Weiter
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            className="space-y-4"
                        >
                            <h3 className="text-xl font-bold text-center mb-4">
                                Was war für dich heute am wichtigsten?
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                {VALUE_DRIVERS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setMainValue(opt.value)}
                                        className={cn(
                                            "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                                            mainValue === opt.value
                                                ? "bg-primary/10 border-primary/40 text-foreground"
                                                : "bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                                        )}
                                    >
                                        <opt.icon className={cn(
                                            "h-5 w-5 shrink-0",
                                            mainValue === opt.value ? "text-primary" : "text-muted-foreground/60"
                                        )} />
                                        <span className="font-medium text-sm">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button variant="ghost" onClick={() => setStep(2)} className="flex-1">Zurück</Button>
                                <Button
                                    disabled={!mainValue}
                                    onClick={() => setStep(4)}
                                    className="flex-[2] font-bold rounded-xl h-11"
                                >
                                    Weiter
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            className="space-y-4"
                        >
                            <div className="text-center">
                                <h3 className="text-xl font-bold mb-1">Hast du noch Feedback für uns?</h3>
                                <p className="text-xs text-muted-foreground mb-4">Optional – Wir lesen jede Nachricht!</p>
                            </div>

                            <Textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Schreib uns hier..."
                                className="min-h-[120px] rounded-xl"
                            />

                            <div className="flex gap-2 pt-2">
                                <Button variant="ghost" onClick={() => setStep(3)} className="flex-1">Zurück</Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="flex-[2] font-bold rounded-xl h-11"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Wird gesendet…</>
                                    ) : (
                                        <>Feedback absenden <Send className="ml-2 h-4 w-4" /></>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}
