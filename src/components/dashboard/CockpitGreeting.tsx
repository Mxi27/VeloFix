import { Bike, ListTodo, ShieldCheck, Wrench, ChevronDown, Check, Keyboard } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"

interface Employee {
    id: string
    name: string
    color_code?: string
}

interface CockpitGreetingProps {
    userName: string
    myBikesCount: number
    qcCount: number
    tasksCount: number
    employees?: Employee[]
    currentEmployeeId?: string
    onSelectEmployee?: (id: string) => void
}

export const CockpitGreeting = ({
    userName,
    myBikesCount,
    qcCount,
    tasksCount,
    employees,
    currentEmployeeId,
    onSelectEmployee
}: CockpitGreetingProps) => {
    const navigate = useNavigate()

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return "Guten Morgen"
        if (hour < 18) return "Guten Tag"
        return "Guten Abend"
    }

    const firstName = userName.split(' ')[0] || 'Du'
    const today = format(new Date(), "EEEE, d. MMMM", { locale: de })

    // Calculate total workload
    const totalWork = myBikesCount + qcCount + tasksCount

    const isInteractive = employees && employees.length > 0 && onSelectEmployee

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/8 via-background to-primary/4 border border-primary/12 p-6">
            <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="relative">
                {/* Header with Quick Actions */}
                <div className="flex items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-4 flex-1">
                    <div className="hidden sm:flex p-3 rounded-xl bg-primary/10 border border-primary/20">
                        <Wrench className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-2 text-2xl font-bold tracking-tight">
                            <span>{getGreeting()},</span>

                            {isInteractive ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger className="outline-none focus:ring-2 focus:ring-primary/20 rounded-md">
                                        <span className="text-gradient flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity decoration-primary/30 underline-offset-4 hover:underline">
                                            {firstName}
                                            <ChevronDown className="h-5 w-5 opacity-50" />
                                        </span>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-[240px]">
                                        {employees.map((emp) => (
                                            <DropdownMenuItem
                                                key={emp.id}
                                                onClick={() => onSelectEmployee(emp.id)}
                                                className="gap-2 cursor-pointer"
                                            >
                                                <div
                                                    className="h-2 w-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: emp.color_code || '#ccc' }}
                                                />
                                                <span className="flex-1 truncate">{emp.name}</span>
                                                {currentEmployeeId === emp.id && (
                                                    <Check className="h-4 w-4 ml-auto opacity-50" />
                                                )}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <span className="text-gradient">{firstName}</span>
                            )}
                        </div>

                        <p className="text-muted-foreground text-sm mt-0.5">
                            {today} — {totalWork === 0
                                ? "Keine offenen Aufgaben"
                                : `${totalWork} ${totalWork === 1 ? 'Aufgabe' : 'Aufgaben'} warten auf dich`}
                        </p>
                    </div>
                    </div>

                    {/* Quick Actions Button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/dashboard/shortcuts')}
                        className="shrink-0 gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <Keyboard className="h-4 w-4" />
                        <span className="hidden sm:inline text-xs">⌘?</span>
                    </Button>
                </div>

                {/* Stat Pills - Compact & Scannable */}
                <div className="flex flex-wrap gap-3">
                    <div className={cn(
                        "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all",
                        myBikesCount > 0
                            ? "bg-blue-500/10 border-blue-200/60 text-blue-700"
                            : "bg-muted/30 border-border/40 text-muted-foreground"
                    )}>
                        <Bike className="h-4 w-4" />
                        <div className="flex flex-col">
                            <span className="text-sm font-bold leading-tight">{myBikesCount}</span>
                            <span className="text-[10px] opacity-70 leading-tight">Meine Räder</span>
                        </div>
                    </div>

                    <div className={cn(
                        "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all",
                        qcCount > 0
                            ? "bg-purple-500/10 border-purple-200/60 text-purple-700"
                            : "bg-muted/30 border-border/40 text-muted-foreground"
                    )}>
                        <ShieldCheck className="h-4 w-4" />
                        <div className="flex flex-col">
                            <span className="text-sm font-bold leading-tight">{qcCount}</span>
                            <span className="text-[10px] opacity-70 leading-tight">Kontrolle</span>
                        </div>
                    </div>

                    <div className={cn(
                        "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all",
                        tasksCount > 0
                            ? "bg-orange-500/10 border-orange-200/60 text-orange-700"
                            : "bg-muted/30 border-border/40 text-muted-foreground"
                    )}>
                        <ListTodo className="h-4 w-4" />
                        <div className="flex flex-col">
                            <span className="text-sm font-bold leading-tight">{tasksCount}</span>
                            <span className="text-[10px] opacity-70 leading-tight">Aufgaben</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
