import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import {
    Star,
    Send,
    CheckCircle2,
    Zap,
    ThumbsUp,
    ThumbsDown,
    Clock,
    ShieldCheck,
    Loader2,
    ExternalLink,
    AlertCircle,
    MessageSquarePlus,
    MessageCircle,
    Sparkles,
    Heart,
    ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"

interface OrderFeedbackProps {
    orderId: string
    workshopId: string
    googleReviewUrl?: string
}

// ── Options ──────────────────────────────────────────────────────────────────

const PRICE_STAR_VALUES = ["", "zu_teuer", "etwas_teuer", "fair", "sehr_fair", "schnäppchen"]
const PRICE_STAR_LABELS = ["", "Viel zu teuer", "Eher teuer", "Fair & Angemessen", "Sehr günstig", "Absolutes Schnäppchen! 🎉"]

const POSITIVE_ASPECTS = [
    { label: "Qualität der Arbeit", value: "qualitaet", icon: ShieldCheck },
    { label: "Schnelligkeit", value: "schnelligkeit", icon: Zap },
    { label: "Beratung & Transparenz", value: "beratung", icon: MessageCircle },
    { label: "Freundlicher Service", value: "service", icon: ThumbsUp },
]

const NEGATIVE_ASPECTS = [
    { label: "Qualität der Arbeit", value: "qualitaet_neg", icon: AlertCircle },
    { label: "Wartezeit / Dauer", value: "dauer", icon: Clock },
    { label: "Mangelhafte Beratung", value: "beratung_neg", icon: MessageSquarePlus },
    { label: "Unfreundlicher Service", value: "service_neg", icon: ThumbsDown },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4
const STAR_LABELS = ["", "Nicht so toll", "Ausbaufähig", "In Ordnung", "War gut!", "Perfekt! 🎉"]
const STAR_EMOJIS = ["", "😔", "😕", "😐", "😊", "🤩"]

// ── Sub-components ─────────────────────────────────────────────────────────────

function StarRow({
    count = 5,
    value,
    hover,
    onHover,
    onLeave,
    onSelect,
    color = "amber",
}: {
    count?: number
    value: number
    hover: number
    onHover: (v: number) => void
    onLeave: () => void
    onSelect: (v: number) => void
    color?: "amber" | "emerald"
}) {
    const display = hover || value
    const glowColor = color === "amber"
        ? "drop-shadow-[0_0_12px_rgba(251,191,36,0.75)]"
        : "drop-shadow-[0_0_12px_rgba(52,211,153,0.75)]"
    const fillClass = color === "amber" ? "fill-amber-400 text-amber-400" : "fill-emerald-400 text-emerald-400"
    const hoverClass = color === "amber" ? "text-amber-300/50" : "text-emerald-300/50"

    return (
        <div className="flex justify-center gap-2.5">
            {Array.from({ length: count }, (_, i) => i + 1).map((s) => (
                <button
                    key={s}
                    onMouseEnter={() => onHover(s)}
                    onMouseLeave={onLeave}
                    onClick={() => onSelect(s)}
                    className="focus:outline-none transition-transform duration-150 active:scale-90 hover:scale-110"
                    aria-label={`${s} Stern${s !== 1 ? "e" : ""}`}
                >
                    <Star
                        className={cn(
                            "h-12 w-12 transition-all duration-200",
                            display >= s
                                ? cn(fillClass, glowColor, "scale-110")
                                : cn("text-muted-foreground/20 hover:scale-105", hover >= s && hoverClass)
                        )}
                    />
                </button>
            ))}
        </div>
    )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OrderFeedback({ orderId, workshopId, googleReviewUrl }: OrderFeedbackProps) {
    const [step, setStep] = useState(1)
    const [rating, setRating] = useState(0)
    const [hoverRating, setHoverRating] = useState(0)
    const [priceRating, setPriceRating] = useState(0)
    const [hoverPriceRating, setHoverPriceRating] = useState(0)
    const [selectedAspects, setSelectedAspects] = useState<string[]>([])
    const [comment, setComment] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [alreadySubmitted, setAlreadySubmitted] = useState(false)
    const [checking, setChecking] = useState(true)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const isHappy = rating >= 4

    useEffect(() => {
        const checkExisting = async () => {
            if (!orderId) { setChecking(false); return }
            try {
                const { data, error } = await supabase
                    .from('order_feedback')
                    .select('id')
                    .eq('order_id', orderId)
                    .maybeSingle()
                if (!error && data) setAlreadySubmitted(true)
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
                    price_perception: priceRating > 0 ? PRICE_STAR_VALUES[priceRating] : null,
                    main_value: selectedAspects.length > 0 ? selectedAspects.join(',') : null,
                    comment,
                })
            if (error) {
                if (error.code === '23505') { setAlreadySubmitted(true); return }
                throw error
            }
            setIsSubmitted(true)
        } catch (err: unknown) {
            console.error("Error submitting feedback:", err)
            setErrorMsg(err instanceof Error ? err.message : "Fehler beim Senden. Bitte versuche es später erneut.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const displayRating = hoverRating || rating
    const step2Valid = priceRating > 0
    const step3Valid = selectedAspects.length > 0
    const progressPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100

    // ── Loading ──────────────────────────────────────────────────────────────
    if (checking) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary opacity-50" />
            </div>
        )
    }

    // ── Already submitted ────────────────────────────────────────────────────
    if (alreadySubmitted) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl overflow-hidden bg-card border border-border/60 shadow-lg text-center"
            >
                <div className="h-1 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
                <div className="p-10 space-y-4">
                    <div className="flex justify-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                            <CheckCircle2 className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold">Feedback bereits abgegeben</h3>
                    <p className="text-sm text-muted-foreground">Vielen Dank! Deine Meinung wurde bereits erfasst.</p>
                </div>
            </motion.div>
        )
    }

    // ── Success ──────────────────────────────────────────────────────────────
    if (isSubmitted) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="rounded-3xl overflow-hidden shadow-xl"
            >
                {/* Premium gradient header */}
                <div className={cn(
                    "px-8 pt-10 pb-8 text-center space-y-5",
                    isHappy
                        ? "bg-gradient-to-b from-emerald-500/10 to-background"
                        : "bg-gradient-to-b from-primary/10 to-background"
                )}>
                    <motion.div
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.15, type: "spring", stiffness: 240, damping: 18 }}
                        className="flex justify-center"
                    >
                        <div className={cn(
                            "w-20 h-20 rounded-full flex items-center justify-center border-2 shadow-lg",
                            isHappy
                                ? "bg-emerald-500/15 border-emerald-500/30 shadow-emerald-500/20"
                                : "bg-primary/15 border-primary/30 shadow-primary/20"
                        )}>
                            {isHappy
                                ? <Sparkles className="h-9 w-9 text-emerald-500" />
                                : <Heart className="h-9 w-9 text-primary" />
                            }
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-2"
                    >
                        <h3 className="text-2xl font-extrabold tracking-tight">
                            {isHappy ? "Du machst uns glücklich! 🎉" : "Danke für deine Ehrlichkeit"}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                            {isHappy
                                ? "Schön, dass du zufrieden warst! Hinterlasse uns gerne eine Google-Bewertung – das hilft uns enorm."
                                : "Wir nehmen dein Feedback ernst und arbeiten stets daran, besser zu werden."
                            }
                        </p>
                    </motion.div>
                </div>

                {isHappy && googleReviewUrl && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        className="px-8 pb-8 bg-card border-t border-border/40"
                    >
                        <a
                            href={googleReviewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-6 flex items-center justify-center gap-2.5 w-full rounded-2xl h-13 py-3.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-sm hover:opacity-90 active:scale-98 transition-all shadow-lg shadow-primary/25"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Google-Bewertung schreiben
                        </a>
                    </motion.div>
                )}
            </motion.div>
        )
    }

    // ── Main Form ────────────────────────────────────────────────────────────
    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="rounded-3xl overflow-hidden bg-card border border-border/60 shadow-xl"
        >
            {/* ── Progress bar ── */}
            <div className="h-1 bg-muted/40 relative">
                <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/70 to-primary rounded-full"
                    initial={false}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                />
            </div>

            {/* ── Step label ── */}
            <div className="px-7 pt-5 pb-0 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/80">
                    Deine Erfahrung
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
                    {step} / {TOTAL_STEPS}
                </span>
            </div>

            <div className="px-7 pb-8 pt-5">
                <AnimatePresence mode="wait">

                    {/* ── Step 1: Star Rating ── */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.28 }}
                            className="space-y-7"
                        >
                            <div className="text-center space-y-1.5">
                                <h3 className="text-2xl font-extrabold tracking-tight">Wie war dein Erlebnis?</h3>
                                <p className="text-sm text-muted-foreground">
                                    Tippe auf einen Stern – das genügt schon.
                                </p>
                            </div>

                            <div className="flex flex-col items-center gap-5">
                                <StarRow
                                    value={rating}
                                    hover={hoverRating}
                                    onHover={setHoverRating}
                                    onLeave={() => setHoverRating(0)}
                                    onSelect={(s) => { setRating(s); setTimeout(() => setStep(2), 350) }}
                                    color="amber"
                                />

                                {/* Emoji + label */}
                                <div className="h-10 flex flex-col items-center justify-center">
                                    <AnimatePresence mode="wait">
                                        {displayRating > 0 && (
                                            <motion.div
                                                key={displayRating}
                                                initial={{ opacity: 0, scale: 0.7, y: 6 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.8, y: -4 }}
                                                transition={{ duration: 0.2 }}
                                                className="flex items-center gap-2"
                                            >
                                                <span className="text-2xl leading-none">{STAR_EMOJIS[displayRating]}</span>
                                                <span className={cn(
                                                    "text-sm font-bold",
                                                    displayRating >= 4 ? "text-emerald-500"
                                                        : displayRating === 3 ? "text-amber-500"
                                                        : "text-destructive"
                                                )}>
                                                    {STAR_LABELS[displayRating]}
                                                </span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Step 2: Price Perception ── */}
                    {step === 2 && rating > 0 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.28 }}
                            className="space-y-7"
                        >
                            <div className="text-center space-y-1.5">
                                <h3 className="text-2xl font-extrabold tracking-tight">War unser Preis fair?</h3>
                                <p className="text-sm text-muted-foreground">
                                    Wie bewertest du das Preis-Leistungs-Verhältnis?
                                </p>
                            </div>

                            <div className="flex flex-col items-center gap-5">
                                <StarRow
                                    value={priceRating}
                                    hover={hoverPriceRating}
                                    onHover={setHoverPriceRating}
                                    onLeave={() => setHoverPriceRating(0)}
                                    onSelect={(s) => { setPriceRating(s); setTimeout(() => setStep(3), 350) }}
                                    color="emerald"
                                />

                                <div className="h-10 flex flex-col items-center justify-center">
                                    <AnimatePresence mode="wait">
                                        {(hoverPriceRating || priceRating) > 0 && (
                                            <motion.p
                                                key={hoverPriceRating || priceRating}
                                                initial={{ opacity: 0, scale: 0.8, y: 6 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                transition={{ duration: 0.2 }}
                                                className={cn(
                                                    "text-sm font-bold",
                                                    (hoverPriceRating || priceRating) >= 4 ? "text-emerald-500"
                                                        : (hoverPriceRating || priceRating) === 3 ? "text-amber-500"
                                                        : "text-destructive"
                                                )}
                                            >
                                                {PRICE_STAR_LABELS[hoverPriceRating || priceRating]}
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Zurück
                                </button>
                                <button
                                    disabled={!step2Valid}
                                    onClick={() => setStep(3)}
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-sm shadow-md shadow-primary/20 hover:opacity-90 active:scale-98 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    Weiter
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Step 3: Main Value ── */}
                    {step === 3 && rating > 0 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.28 }}
                            className="space-y-6"
                        >
                            <div className="text-center space-y-1.5">
                                <h3 className="text-2xl font-extrabold tracking-tight">
                                    {isHappy ? "Was hat überzeugt?" : "Was hat nicht gepasst?"}
                                </h3>
                                <p className="text-sm text-muted-foreground">Mehrere Antworten möglich</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                                {(isHappy ? POSITIVE_ASPECTS : NEGATIVE_ASPECTS).map((opt) => {
                                    const selected = selectedAspects.includes(opt.value)
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => setSelectedAspects(prev =>
                                                prev.includes(opt.value) ? prev.filter(v => v !== opt.value) : [...prev, opt.value]
                                            )}
                                            className={cn(
                                                "relative flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all duration-200 text-center group",
                                                selected
                                                    ? "bg-primary/8 border-primary/50 shadow-md shadow-primary/10"
                                                    : "bg-muted/20 border-border/40 hover:bg-muted/40 hover:border-border/70"
                                            )}
                                        >
                                            {/* Selection indicator */}
                                            {selected && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                                                >
                                                    <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                                                </motion.div>
                                            )}
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                                selected ? "bg-primary/15" : "bg-muted/50 group-hover:bg-muted/80"
                                            )}>
                                                <opt.icon className={cn(
                                                    "h-5 w-5 transition-colors",
                                                    selected ? "text-primary" : "text-muted-foreground/60"
                                                )} />
                                            </div>
                                            <span className={cn(
                                                "text-xs font-semibold leading-tight transition-colors",
                                                selected ? "text-foreground" : "text-muted-foreground"
                                            )}>
                                                {opt.label}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Zurück
                                </button>
                                <button
                                    disabled={!step3Valid}
                                    onClick={() => setStep(4)}
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-sm shadow-md shadow-primary/20 hover:opacity-90 active:scale-98 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    Weiter
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Step 4: Comment ── */}
                    {step === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.28 }}
                            className="space-y-5"
                        >
                            <div className="text-center space-y-1.5">
                                <h3 className="text-2xl font-extrabold tracking-tight">
                                    {isHappy ? "Noch etwas auf dem Herzen?" : "Was können wir besser machen?"}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {isHappy
                                        ? "Optional – wir freuen uns über jede Nachricht."
                                        : "Bitte schildere uns kurz, was nicht gepasst hat."
                                    }
                                </p>
                            </div>

                            <Textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder={
                                    isHappy
                                        ? "War alles super, nichts zu meckern..."
                                        : "Z. B.: Die Wartezeit war sehr lang..."
                                }
                                className="min-h-[120px] rounded-2xl resize-none border-border/60 bg-muted/20 focus-visible:bg-background transition-colors text-sm"
                            />

                            {errorMsg && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-start gap-3 rounded-2xl p-4 bg-destructive/8 border border-destructive/25"
                                >
                                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                    <p className="text-sm text-destructive leading-snug">{errorMsg}</p>
                                </motion.div>
                            )}

                            <div className="flex gap-3 pt-1">
                                <button
                                    onClick={() => setStep(3)}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Zurück
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-sm shadow-md shadow-primary/20 hover:opacity-90 active:scale-98 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Wird gesendet…</>
                                    ) : (
                                        <><Send className="h-4 w-4" /> Absenden</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </motion.div>
    )
}
