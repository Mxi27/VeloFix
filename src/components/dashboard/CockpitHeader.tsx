import { Bike, Sparkles, ListTodo, ShieldCheck } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"

interface CockpitHeaderProps {
    userName: string
    assignedCount: number
    taskCount: number
    qcCount: number
}

export const CockpitHeader = ({ userName, assignedCount, taskCount, qcCount }: CockpitHeaderProps) => {
    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return "Guten Morgen"
        if (hour < 18) return "Guten Tag"
        return "Guten Abend"
    }

    const firstName = userName.split(' ')[0] || 'Du'
    const today = format(new Date(), "EEEE, d. MMMM", { locale: de })

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-primary/3 border border-primary/10 p-6 mb-6">
            <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="relative flex items-center gap-4">
                <div className="hidden sm:flex p-3 rounded-xl bg-primary/10 border border-primary/20">
                    <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight">
                        {getGreeting()}, <span className="text-gradient">{firstName}</span>
                    </h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        {today} — Dein persönliches Cockpit
                    </p>
                </div>
            </div>

            {/* Stat Pills */}
            <div className="relative flex flex-wrap gap-3 mt-5">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-500/8 border border-blue-200/50 text-blue-700">
                    <Bike className="h-4 w-4" />
                    <span className="text-sm font-semibold">{assignedCount}</span>
                    <span className="text-xs text-blue-600/80">Zugeteilte Räder</span>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-500/8 border border-orange-200/50 text-orange-700">
                    <ListTodo className="h-4 w-4" />
                    <span className="text-sm font-semibold">{taskCount}</span>
                    <span className="text-xs text-orange-600/80">Offene Aufgaben</span>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-500/8 border border-purple-200/50 text-purple-700">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-sm font-semibold">{qcCount}</span>
                    <span className="text-xs text-purple-600/80">QC Prüfungen</span>
                </div>
            </div>
        </div>
    )
}
