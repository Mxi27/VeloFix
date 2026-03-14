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
    ExternalLink,
    AlertCircle,
    TrendingDown,
    MessageSquarePlus,
    Heart,
    Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface OrderFeedbackProps {
    orderId: string
    workshopId: string
    customerPostalCode?: string
    googleReviewUrl?: string
}

// ── Options ──────────────────────────────────────────────────────────────────

const PRICE_OPTIONS = [
    { label: "Sehr fair & angemessen", value: "sehr_fair", icon: ThumbsUp },
    { label: "Preis-Leistung stimmt", value: "preis_leistung", icon: CheckCircle2 },
    { label: "Etwas teuer, aber okay", value: "etwas_teuer", icon: Clock },
    { label: "Definitiv zu teuer", value: "zu_teuer", icon: TrendingDown },
]

const POSITIVE_ASPECTS = [
    { label: "Qualität & Sicherheit", value: "qualitaet", icon: ShieldCheck },
    { label: "Schnelligkeit", value: "schnelligkeit", icon: Zap },
    { label: "Beratung & Transparenz", value: "beratung", icon: ThumbsUp },
    { label: "Super Preis-Leistung", value: "preis", icon: Wallet },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns steps depending on rating bucket */
function getTotalSteps(rating: number) {
    return rating >= 4 ? 3 : 3 // both paths have 3 steps (Rating → Q2 → Comment/Confirm)
}

const STAR_LABELS = ["", "Nicht so toll", "Ausbaufähig", "In Ordnung", "War gut!", "Perfekt! 🎉"]

// ── Component ─────────────────────────────────────────────────────────────────

export function OrderFeedback({ orderId, workshopId, customerPostalCode, googleReviewUrl }: OrderFeedbackProps) {
    const [step, setStep] = useState(1)
    const [rating, setRating] = useState(0)
    const [hoverRating, setHoverRating] = useState(0)
    const [pricePerception, setPricePerception] = useState("")
    const [positiveAspect, setPositiveAspect] = useState("")
    const [comment, setComment] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [alreadySubmitted, setAlreadySubmitted] = useState(false)
    const [checking, setChecking] = useState(true)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const isHappy = rating >= 4

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
        setErrorMsg(null)
        setIsSubmitting(true)

        try {
            const { error } = await supabase
                .from('order_feedback')
                .insert({
                    order_id: orderId,
                    workshop_id: workshopId,
                    rating,
                    price_perception: isHappy ? null : pricePerception,
                    main_value: isHappy ? positiveAspect : null,
                    comment,
                    customer_postal_code: customerPostalCode,
                })

            if (error) {
                if (error.code === '23505') {
                    setAlreadySubmitted(true)
                    return
                }
                throw error
            }
            setIsSubmitted(true)
        } catch (err: any) {
            console.error("Error submitting feedback:", err)
            setErrorMsg(err.message || "Fehler beim Senden. Bitte versuche es später erneut.")
        } finally {
            setIsSubmitting(false)
        }
    }

    // ── Loading ──────────────────────────────────────────────────────────────
    if (checking) {
        return (
            <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary opacity-60" />
            </div>
        )
    }

    // ── Already submitted ────────────────────────────────────────────────────
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
                <h3 className="text-lg font-bold mb-2">Feedback bereits abgegeben</h3>
                <p className="text-sm text-muted-foreground">
                    Vielen Dank! Deine Meinung wurde bereits erfasst.
                </p>
            </motion.div>
        )
    }

    // ── Success ──────────────────────────────────────────────────────────────
    if (isSubmitted) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="rounded-2xl p-8 text-center bg-card border border-border/50 shadow-sm space-y-5"
            >
                <div className="flex justify-center">
                    <div className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center border-2",
                        isHappy
                            ? "bg-emerald-500/10 border-emerald-500/25"
                            : "bg-primary/10 border-primary/20"
                    )}>
                        {isHappy
                            ? <Sparkles className="h-7 w-7 text-emerald-500" />
                            : <Heart className="h-7 w-7 text-primary" />
                        }
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-bold mb-2">
                        {isHappy ? "Danke – du machst uns happy! 🎉" : "Danke für deine Ehrlichkeit"}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {isHappy
                            ? "Schön, dass du zufrieden warst! Wenn du magst, hinterlasse uns eine kurze Google-Bewertung – das hilft uns enorm."
                            : "Wir nehmen dein Feedback ernst und arbeiten stets daran, besser zu werden."
                        }
                    </p>
                </div>

                {isHappy && googleReviewUrl && (
                    <a
                        href={googleReviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full rounded-xl h-12 bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Google-Bewertung schreiben
                    </a>
                )}
            </motion.div>
        )
    }

    // ── Main Form ────────────────────────────────────────────────────────────

    const totalSteps = getTotalSteps(rating)
    const displayRating = hoverRating || rating

    // For the comment step: min chars required if unhappy
    const MIN_COMMENT_CHARS = 20
    const commentValid = isHappy || comment.trim().length >= MIN_COMMENT_CHARS

    // Step 2 answer chosen?
    const step2Valid = isHappy ? !!positiveAspect : !!pricePerception

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="rounded-2xl overflow-hidden bg-card border border-border/50 shadow-sm"
        >
            {/* ── Header / Progress ── */}
            <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-border/40">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                    Deine Erfahrung
                </span>
                {/* Show progress only after step 1 is done */}
                <div className="flex gap-1.5">
                    {Array.from({ length: totalSteps }).map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1 rounded-full transition-all duration-500",
                                i < step
                                    ? "w-6 bg-primary"
                                    : "w-4 bg-muted"
                            )}
                        />
                    ))}
                </div>
            </div>

            <div className="p-6">
                <AnimatePresence mode="wait">

                    {/* ── Step 1: Star Rating ── */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            className="space-y-6"
                        >
                            <div className="text-center space-y-5">
                                <div>
                                    <h3 className="text-xl font-bold mb-1">Wie war dein Erlebnis?</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Tippe auf einen Stern – das genügt schon.
                                    </p>
                                </div>

                                {/* Stars */}
                                <div className="flex justify-center gap-3">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <button
                                            key={s}
                                            onMouseEnter={() => setHoverRating(s)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            onClick={() => {
                                                setRating(s)
                                                setTimeout(() => setStep(2), 380)
                                            }}
                                            className="focus:outline-none transition-transform active:scale-90 hover:scale-115"
                                        >
                                            <Star
                                                className={cn(
                                                    "h-11 w-11 transition-all duration-200",
                                                    displayRating >= s
                                                        ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                                                        : "text-muted-foreground/20 hover:text-amber-300/60"
                                                )}
                                            />
                                        </button>
                                    ))}
                                </div>

                                {/* Dynamic label */}
                                <div className="h-5 flex items-center justify-center">
                                    <AnimatePresence mode="wait">
                                        {displayRating > 0 && (
                                            <motion.p
                                                key={displayRating}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                className={cn(
                                                    "text-sm font-semibold",
                                                    displayRating >= 4 ? "text-emerald-500" : displayRating === 3 ? "text-amber-500" : "text-destructive"
                                                )}
                                            >
                                                {STAR_LABELS[displayRating]}
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Step 2: Happy → "Was war top?" / Unhappy → "Preis?" ── */}
                    {step === 2 && rating > 0 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            className="space-y-4"
                        >
                            <h3 className="text-xl font-bold text-center mb-4">
                                {isHappy
                                    ? "Was hat dir besonders gefallen?"
                                    : "Wie war der Preis für dich?"
                                }
                            </h3>

                            <div className="grid grid-cols-1 gap-2">
                                {(isHappy ? POSITIVE_ASPECTS : PRICE_OPTIONS).map((opt) => {
                                    const selected = isHappy ? positiveAspect === opt.value : pricePerception === opt.value
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => {
                                                if (isHappy) {
                                                    setPositiveAspect(opt.value)
                                                } else {
                                                    setPricePerception(opt.value)
                                                }
                                            }}
                                            className={cn(
                                                "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                                                selected
                                                    ? "bg-primary/10 border-primary/40 text-foreground"
                                                    : "bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                                            )}
                                        >
                                            <opt.icon className={cn(
                                                "h-5 w-5 shrink-0",
                                                selected ? "text-primary" : "text-muted-foreground/50"
                                            )} />
                                            <span className="font-medium text-sm">{opt.label}</span>
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => setStep(1)}
                                    className="flex-1 rounded-xl"
                                >
                                    Zurück
                                </Button>
                                <Button
                                    disabled={!step2Valid}
                                    onClick={() => setStep(3)}
                                    className="flex-[2] font-bold rounded-xl h-11"
                                >
                                    Weiter
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Step 3: Comment ── */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            className="space-y-4"
                        >
                            <div className="text-center">
                                <h3 className="text-xl font-bold mb-1">
                                    {isHappy
                                        ? "Noch etwas auf dem Herzen?"
                                        : "Was können wir besser machen?"
                                    }
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    {isHappy
                                        ? "Optional – wir freuen uns über jede Nachricht."
                                        : "Bitte schildere uns kurz, was nicht gepasst hat."
                                    }
                                </p>
                            </div>

                            <div className="relative">
                                <Textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder={
                                        isHappy
                                            ? "War alles super, nichts zu meckern..."
                                            : "Z. B.: Die Wartezeit war sehr lang und ich wurde nicht informiert..."
                                    }
                                    className="min-h-[120px] rounded-xl resize-none pr-16"
                                />
                                {!isHappy && (
                                    <span className={cn(
                                        "absolute bottom-3 right-3 text-[10px] font-mono tabular-nums transition-colors",
                                        comment.trim().length >= MIN_COMMENT_CHARS
                                            ? "text-emerald-500"
                                            : "text-muted-foreground/50"
                                    )}>
                                        {comment.trim().length}/{MIN_COMMENT_CHARS}
                                    </span>
                                )}
                            </div>

                            {/* Pflichtfeld-Hinweis bei schlechter Bewertung */}
                            {!isHappy && !commentValid && comment.length > 0 && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <MessageSquarePlus className="h-3.5 w-3.5 shrink-0" />
                                    Noch {MIN_COMMENT_CHARS - comment.trim().length} Zeichen – damit wir wirklich helfen können.
                                </p>
                            )}

                            {/* Inline Error Banner */}
                            {errorMsg && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-start gap-3 rounded-xl p-4 bg-destructive/10 border border-destructive/25"
                                >
                                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                    <p className="text-sm text-destructive leading-snug">{errorMsg}</p>
                                </motion.div>
                            )}

                            <div className="flex gap-2 pt-1">
                                <Button
                                    variant="ghost"
                                    onClick={() => setStep(2)}
                                    className="flex-1 rounded-xl"
                                >
                                    Zurück
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !commentValid}
                                    className="flex-[2] font-bold rounded-xl h-11"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Wird gesendet…</>
                                    ) : (
                                        <><Send className="mr-2 h-4 w-4" /> Absenden</>
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
