import type { ReactNode } from "react";
import { Store } from "lucide-react";

interface OnboardingLayoutProps {
    children: ReactNode;
    title?: string;
    description?: string;
    step?: number;
    totalSteps?: number;
    onBack?: () => void;
}

export function OnboardingLayout({
    children,
    title,
    description,
    step,
    totalSteps,
    onBack,
}: OnboardingLayoutProps) {
    return (
        <div className="min-h-screen w-full flex bg-background">
            {/* Left Side - Visual/Branding */}
            <div className="hidden lg:flex w-1/2 bg-zinc-900 relative overflow-hidden flex-col justify-between p-12 text-white">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558981806-ec527fa84c3d?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-zinc-900/50" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-xl font-bold tracking-tight">
                        <Store className="w-6 h-6" />
                        VeloFix
                    </div>
                </div>

                <div className="relative z-10 max-w-lg">
                    <blockquote className="space-y-2">
                        <p className="text-lg font-medium leading-relaxed">
                            &ldquo;Die beste Entscheidung für unsere Werkstatt. Die Verwaltung ist so viel einfacher geworden.&rdquo;
                        </p>
                        <footer className="text-sm text-zinc-400">Markus Weber, Radsport Weber</footer>
                    </blockquote>
                </div>
            </div>

            {/* Right Side - Content */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-12 relative">
                <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {step && totalSteps && (
                        <div className="absolute top-8 right-8 lg:top-12 lg:right-12">
                            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Schritt {step} von {totalSteps}
                            </span>
                        </div>
                    )}

                    <div className="space-y-2 text-center lg:text-left">
                        {title && <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>}
                        {description && <p className="text-muted-foreground">{description}</p>}
                    </div>

                    <div className="mt-8">
                        {children}
                    </div>

                    {onBack && (
                        <button
                            onClick={onBack}
                            className="absolute top-8 left-8 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            ← Zurück
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
