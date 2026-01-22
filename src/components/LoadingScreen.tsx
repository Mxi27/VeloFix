import { Bike } from "lucide-react"

export function LoadingScreen() {
    return (
        <div className="flex min-h-svh w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-6">
                {/* Animated Icon */}
                <div className="relative">
                    <div className="absolute inset-0 animate-ping opacity-20">
                        <div className="h-16 w-16 rounded-full bg-primary" />
                    </div>
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary">
                        <Bike className="h-8 w-8 text-primary-foreground animate-pulse" />
                    </div>
                </div>

                {/* Loading Text */}
                <div className="flex flex-col items-center gap-2">
                    <h2 className="text-xl font-semibold text-foreground">VeloFix</h2>
                    <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                        <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                        <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                    </div>
                </div>
            </div>
        </div>
    )
}
