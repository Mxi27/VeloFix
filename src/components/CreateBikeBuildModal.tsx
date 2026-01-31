import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
// import {
//     Select,
//     SelectContent,
//     SelectItem,
//     SelectTrigger,
//     SelectValue,
// } from "@/components/ui/select"
import { Bike, ChevronRight, ChevronLeft, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"

interface CreateBikeBuildModalProps {
    children?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onBuildCreated?: () => void
}

export function CreateBikeBuildModal({ children, open, onOpenChange, onBuildCreated }: CreateBikeBuildModalProps) {
    const { user, workshopId } = useAuth()
    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form States
    const [customerName, setCustomerName] = useState("")
    const [customerEmail, setCustomerEmail] = useState("")
    const [customerPhone, setCustomerPhone] = useState("")
    const [buildType, setBuildType] = useState<"custom" | "production" | null>(null)
    const [frameBrand, setFrameBrand] = useState("")
    const [frameModel, setFrameModel] = useState("")
    const [frameSize, setFrameSize] = useState("")
    const [totalBudget, setTotalBudget] = useState("")
    const [estimatedCompletion, setEstimatedCompletion] = useState("")
    const [notes, setNotes] = useState("")

    // Reset state when modal closes
    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setStep(1)
            setBuildType(null)
            setCustomerName("")
            setCustomerEmail("")
            setCustomerPhone("")
            setFrameBrand("")
            setFrameModel("")
            setFrameSize("")
            setTotalBudget("")
            setEstimatedCompletion("")
            setNotes("")
        }
        onOpenChange?.(newOpen)
    }

    const handleNext = () => {
        if (step < 4) {
            setStep(step + 1)
        }
    }

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1)
        }
    }

    const handleSubmit = async () => {
        if (!user || !workshopId) return

        setIsSubmitting(true)
        try {
            const buildNumber = `BB-${Math.floor(Math.random() * 10000)}`

            const { error } = await supabase
                .from('bike_builds')
                .insert({
                    workshop_id: workshopId,
                    build_number: buildNumber,
                    customer_name: customerName,
                    customer_email: customerEmail || null,
                    customer_phone: customerPhone || null,
                    build_type: buildType,
                    frame_brand: frameBrand || null,
                    frame_model: frameModel || null,
                    frame_size: frameSize || null,
                    total_budget: parseFloat(totalBudget) || null,
                    estimated_completion: estimatedCompletion || null,
                    status: 'planning',
                    notes: notes ? [notes] : [],
                    parts: [],
                    progress: {}
                })

            if (error) throw error

            handleOpenChange(false)
            onBuildCreated?.()
        } catch (error: any) {
            console.error('Error creating bike build:', error)
            alert(`Fehler: ${error.message}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    const getStepTitle = () => {
        switch (step) {
            case 1: return "Neuer Bike Build"
            case 2: return "Build-Typ wählen"
            case 3: return "Kunden- & Rahmendaten"
            case 4: return "Details & Abschluss"
            default: return "Neuer Bike Build"
        }
    }

    const isStepValid = () => {
        switch (step) {
            case 1:
                return !!buildType
            case 2:
                return !!(
                    customerName &&
                    customerEmail &&
                    customerPhone
                )
            case 3:
                return !!(
                    frameBrand &&
                    frameModel
                )
            default:
                return true
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {children && <DialogTrigger asChild>{children}</DialogTrigger>}
            <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden glass gap-0">
                <div className="p-6 pb-4 border-b border-glass-border">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">{getStepTitle()}</DialogTitle>
                    </DialogHeader>

                    {/* Progress Bar */}
                    <div className="flex gap-2 mt-6">
                        {[1, 2, 3, 4].map((s) => (
                            <div
                                key={s}
                                className={cn(
                                    "h-1 flex-1 rounded-full transition-all duration-300",
                                    s <= step ? "bg-primary" : "bg-primary/20"
                                )}
                            />
                        ))}
                    </div>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {/* Step 1: Build Type */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-medium">Build-Typ wählen</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                    onClick={() => setBuildType("custom")}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-8 rounded-xl border-2 transition-all gap-4 text-center hover:bg-accent/50",
                                        buildType === "custom"
                                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                                            : "border-border bg-card"
                                    )}
                                >
                                    <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                                        <Bike className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="font-semibold">Custom Build</div>
                                        <div className="text-xs text-muted-foreground">Individueller Aufbau</div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setBuildType("production")}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-8 rounded-xl border-2 transition-all gap-4 text-center hover:bg-accent/50",
                                        buildType === "production"
                                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                                            : "border-border bg-card"
                                    )}
                                >
                                    <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                                        <Bike className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="font-semibold">Produktion</div>
                                        <div className="text-xs text-muted-foreground">Serienmäßiger Aufbau</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Customer Data */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-medium">Kundendaten</h3>
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name *</Label>
                                    <Input
                                        id="name"
                                        placeholder="Max Mustermann"
                                        className="bg-muted/50"
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">E-Mail *</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="max@beispiel.de"
                                            className="bg-muted/50"
                                            value={customerEmail}
                                            onChange={e => setCustomerEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Telefon *</Label>
                                        <Input
                                            id="phone"
                                            placeholder="+49 123..."
                                            className="bg-muted/50"
                                            value={customerPhone}
                                            onChange={e => setCustomerPhone(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Frame Data */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-medium">Rahmendaten</h3>
                            <div className="grid gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="brand">Rahmenmarke *</Label>
                                        <Input
                                            id="brand"
                                            placeholder="z.B. Specialized"
                                            className="bg-muted/50"
                                            value={frameBrand}
                                            onChange={e => setFrameBrand(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="model">Modell *</Label>
                                        <Input
                                            id="model"
                                            placeholder="z.B. S-Works Tarmac"
                                            className="bg-muted/50"
                                            value={frameModel}
                                            onChange={e => setFrameModel(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="size">Rahmengröße (optional)</Label>
                                    <Input
                                        id="size"
                                        placeholder="z.B. 56cm / Medium"
                                        className="bg-muted/50"
                                        value={frameSize}
                                        onChange={e => setFrameSize(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Details & Summary */}
                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-medium">Details & Abschluss</h3>
                            <div className="grid gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="budget">Gesamtbudget (optional)</Label>
                                        <div className="relative">
                                            <Input
                                                id="budget"
                                                placeholder="0.00"
                                                type="number"
                                                className="pl-3 pr-8 bg-muted/50"
                                                value={totalBudget}
                                                onChange={e => setTotalBudget(e.target.value)}
                                            />
                                            <span className="absolute right-3 top-2.5 text-muted-foreground">€</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="completion">Vorauss. Fertigstellung (optional)</Label>
                                        <Input
                                            id="completion"
                                            type="date"
                                            className="bg-muted/50"
                                            value={estimatedCompletion}
                                            onChange={e => setEstimatedCompletion(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-border/50 my-2" />

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Anmerkungen (optional)</Label>
                                    <Textarea
                                        className="bg-muted/20 min-h-[80px]"
                                        placeholder="Besondere Wünsche, Farbgebung, Komponenten..."
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="bg-muted/30 p-4 rounded-lg space-y-3 mt-4">
                                <h4 className="font-semibold mb-2">Zusammenfassung</h4>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                    <li><strong>Typ:</strong> {buildType === "custom" ? "Custom Build" : "Produktion"}</li>
                                    <li><strong>Kunde:</strong> {customerName}</li>
                                    <li><strong>Rahmen:</strong> {frameBrand} {frameModel}</li>
                                    {frameSize && <li><strong>Größe:</strong> {frameSize}</li>}
                                    {totalBudget && <li><strong>Budget:</strong> {totalBudget} €</li>}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 pt-2 border-t border-glass-border bg-background/20 flex justify-between items-center backdrop-blur-sm">
                    {step > 1 ? (
                        <Button variant="outline" onClick={handleBack} className="px-6 border-border/50">
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Zurück
                        </Button>
                    ) : (
                        <div />
                    )}

                    {step < 4 ? (
                        <Button
                            onClick={handleNext}
                            disabled={!isStepValid()}
                            className="px-8"
                        >
                            Weiter
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-8"
                        >
                            {isSubmitting ? "Wird erstellt..." : "Build erstellen"}
                            {!isSubmitting && <Check className="ml-2 h-4 w-4" />}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
