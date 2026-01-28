import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, CheckCircle2 } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface WorkModeWizardProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    items: { text: string; completed: boolean }[]
    onToggleItem: (index: number, checked: boolean) => void
    onComplete: () => void
}

export function WorkModeWizard({ open, onOpenChange, items, onToggleItem, onComplete }: WorkModeWizardProps) {
    // Find the first uncompleted item index to start there
    const initialIndex = items.findIndex(i => !i.completed)
    const [currentIndex, setCurrentIndex] = useState(initialIndex >= 0 ? initialIndex : 0)
    const [showSuccess, setShowSuccess] = useState(false)

    // Reset when opening
    // Reset when opening
    useEffect(() => {
        if (open) {
            const firstUnfinished = items.findIndex(i => !i.completed)
            // Use setTimeout to avoid synchronous state updates during render
            const timer = setTimeout(() => {
                setCurrentIndex(firstUnfinished >= 0 ? firstUnfinished : 0)
                setShowSuccess(false)
            }, 0)
            return () => clearTimeout(timer)
        }
    }, [open, items]) // items in dependency array is correct if items change meaningfully

    const currentItem = items[currentIndex]
    const progress = Math.round((items.filter(i => i.completed).length / items.length) * 100) || 0

    const handleMarkDone = () => {
        onToggleItem(currentIndex, true)

        // Delay move to next item for visual feedback
        setTimeout(() => {
            if (currentIndex < items.length - 1) {
                setCurrentIndex(currentIndex + 1)
            } else {
                setShowSuccess(true)
            }
        }, 300)
    }

    const handleSkip = () => {
        if (currentIndex < items.length - 1) {
            setCurrentIndex(currentIndex + 1)
        } else {
            // Last item reached
            setShowSuccess(items.every(i => i.completed)) // Only show success if ALL done? Or just show finish screen?
            // For now, if skipped last item, just go to success/summary view
            setShowSuccess(true)
        }
    }

    const handleBack = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass max-w-3xl h-[80vh] flex flex-col p-0 gap-0 sm:rounded-2xl overflow-hidden">

                {/* Header with Progress */}
                <div className="p-6 border-b border-glass-border bg-glass-bg z-10 backdrop-blur-md">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold tracking-tight">Arbeitsmodus</h2>
                        <span className="text-sm font-medium text-muted-foreground">{progress}% abgeschlossen</span>
                    </div>
                    <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, ease: "circOut" }}
                        />
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 relative bg-muted/10 p-6 md:p-12 flex flex-col items-center justify-center text-center overflow-hidden">
                    <AnimatePresence mode="wait">
                        {!showSuccess ? (
                            <motion.div
                                key={currentIndex}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="w-full max-w-2xl space-y-8"
                            >
                                <div className="space-y-4">
                                    <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                                        Schritt {currentIndex + 1} von {items.length}
                                    </span>
                                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
                                        {currentItem?.text}
                                    </h1>
                                </div>

                                {/* Large Action Buttons */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto pt-8">
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        onClick={handleSkip}
                                        className="h-16 text-lg border-2 hover:bg-muted"
                                    >
                                        Überspringen
                                    </Button>
                                    <Button
                                        size="lg"
                                        onClick={handleMarkDone}
                                        className={cn(
                                            "h-16 text-lg shadow-lg shadow-primary/20 transition-all",
                                            currentItem?.completed ? "bg-green-600 hover:bg-green-700" : ""
                                        )}
                                    >
                                        {currentItem?.completed ? (
                                            <>
                                                <Check className="mr-2 h-6 w-6" />
                                                Erledigt
                                            </>
                                        ) : (
                                            <>
                                                <CheckClick className="mr-2 h-6 w-6" />
                                                Erledigen
                                            </>
                                        )}
                                    </Button>

                                    {currentIndex > 0 && (
                                        <Button
                                            variant="ghost"
                                            onClick={handleBack}
                                            className="sm:col-span-2 text-muted-foreground"
                                        >
                                            Zurück zum vorherigen Schritt
                                        </Button>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-6 max-w-md"
                            >
                                <div className="h-24 w-24 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 className="h-12 w-12" />
                                </div>
                                <h2 className="text-3xl font-bold">Checkliste bearbeitet!</h2>
                                <p className="text-muted-foreground text-lg">
                                    Sie haben alle Schritte durchgearbeitet. Möchten Sie den Arbeitsmodus beenden?
                                </p>
                                <div className="pt-6">
                                    <Button size="lg" className="w-full h-14 text-lg" onClick={onComplete}>
                                        Arbeitsmodus beenden
                                    </Button>
                                    {items.every(i => i.completed) && (
                                        <p className="mt-4 text-sm text-muted-foreground">
                                            Tipp: Setzen Sie den Status anschließend auf "Abholbereit".
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function CheckClick(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    )
}
