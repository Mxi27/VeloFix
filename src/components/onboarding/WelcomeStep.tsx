import { Store, Users, ArrowRight } from "lucide-react"

interface WelcomeStepProps {
    onSelectCreate: () => void;
    onSelectJoin: () => void;
}

export function WelcomeStep({ onSelectCreate, onSelectJoin }: WelcomeStepProps) {
    return (
        <div className="grid gap-6">
            <div
                onClick={onSelectCreate}
                className="group relative flex items-center gap-4 rounded-xl border p-6 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Store className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                    <h3 className="font-semibold leading-none tracking-tight">Neue Werkstatt erstellen</h3>
                    <p className="text-sm text-muted-foreground">
                        Sie sind Inhaber und möchten Ihre Werkstatt in VeloFix verwalten.
                    </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
            </div>

            <div
                onClick={onSelectJoin}
                className="group relative flex items-center gap-4 rounded-xl border p-6 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer transition-all hover:border-blue-500/50 hover:shadow-md"
            >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                    <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1 space-y-1">
                    <h3 className="font-semibold leading-none tracking-tight">Bestehender Werkstatt beitreten</h3>
                    <p className="text-sm text-muted-foreground">
                        Sie haben einen Einladungs-Code von Ihrem Arbeitgeber erhalten.
                    </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100" />
            </div>
        </div>
    )
}
