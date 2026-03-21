import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Calendar, ArrowRight } from "lucide-react"
import { format, isToday, isPast } from "date-fns"
import { de } from "date-fns/locale"
import { cn } from "@/lib/utils"

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface OrderItem {
    id: string
    order_number: string
    customer_name: string
    bike_model: string
    status: string
    due_date: string | null
    created_at: string
    mechanic_ids: string[] | null
    qc_mechanic_id?: string | null
    checklist?: {
        text: string
        completed: boolean
        completed_by?: string | null
        completed_at?: string | null
    }[] | null
}

export const STATUS_LABELS: Record<string, string> = {
    eingegangen: "Eingegangen",
    in_bearbeitung: "In Bearbeitung",
    kontrolle_offen: "Kontrolle offen",
    warten_auf_teile: "Warten auf Teile",
    abholbereit: "Abholbereit",
    abgeschlossen: "Abgeschlossen",
    abgeholt: "Abgeholt",
    todo: "Offen",
    in_progress: "In Arbeit",
    done: "Erledigt",
}

export const STATUS_COLORS: Record<string, string> = {
    eingegangen:      "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    warten_auf_teile: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    in_bearbeitung:   "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    kontrolle_offen:  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    abholbereit:      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    abgeholt:         "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    abgeschlossen:    "bg-neutral-500/10 text-neutral-500 dark:text-neutral-400",
    todo:             "bg-neutral-500/10 text-neutral-500 dark:text-neutral-400",
    in_progress:      "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    done:             "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
}

// ─── Components ───────────────────────────────────────────────────────────────

export const DueDateBadge = ({ date }: { date: string | null }) => {
    if (!date) return <span className="text-xs text-muted-foreground/50">Kein Datum</span>
    const d = new Date(date)
    const overdue = isPast(d) && !isToday(d)
    const dueToday = isToday(d)

    return (
        <div className={cn(
            "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-colors",
            overdue
                ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                : (dueToday
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    : "text-muted-foreground bg-muted/30 dark:bg-muted/20")
        )}>
            {overdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
            <span>
                {overdue && "Überfällig · "}
                {dueToday && "Heute · "}
                {format(d, "dd. MMM", { locale: de })}
            </span>
        </div>
    )
}

interface OrderCardProps {
    order: OrderItem
    onClick: () => void
    showMechanics?: boolean
    employees?: { id: string, name: string }[]
}

export const OrderCard = ({ order, onClick, showMechanics = false, employees = [] }: OrderCardProps) => {
    const isOverdue = order.due_date && isPast(new Date(order.due_date)) && !isToday(new Date(order.due_date))
    const isUnassigned = !order.mechanic_ids || order.mechanic_ids.length === 0

    const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || "—"

    return (
        <div
            onClick={onClick}
            className={cn(
                "group relative flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer",
                "hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30",
                isOverdue
                    ? "border-red-500/30 bg-red-500/8 hover:bg-red-500/12 dark:border-red-500/25 dark:bg-red-500/10 dark:hover:bg-red-500/15"
                    : "border-border/50 bg-card/80 hover:bg-card",
            )}
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Urgency indicator */}
                <div className={cn(
                    "w-1 self-stretch rounded-full shrink-0",
                    isOverdue ? "bg-red-500" : (order.due_date && isToday(new Date(order.due_date)) ? "bg-amber-500" : "bg-border/60")
                )} />

                <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-muted-foreground">{order.order_number}</span>
                        <Badge variant="secondary" className={cn("text-[10px] h-5 px-1.5 font-normal border", STATUS_COLORS[order.status] || "bg-muted")}>
                            {STATUS_LABELS[order.status] || order.status}
                        </Badge>
                        {isUnassigned && (
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-dashed border-amber-500/40 text-amber-700 bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/35 dark:bg-amber-500/12">
                                Frei
                            </Badge>
                        )}
                    </div>

                    <div className="min-w-0">
                        <p className="font-semibold text-sm truncate text-foreground">{order.bike_model}</p>
                        <p className="text-xs text-muted-foreground truncate">{order.customer_name}</p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                        <DueDateBadge date={order.due_date} />

                        {showMechanics && !isUnassigned && order.mechanic_ids && (
                            <div className="flex -space-x-1.5">
                                {order.mechanic_ids.map(mid => (
                                    <div key={mid} className="h-5 w-5 rounded-full bg-background border border-border flex items-center justify-center text-[8px] font-medium text-muted-foreground" title={getEmployeeName(mid)}>
                                        {getEmployeeName(mid).charAt(0)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary shrink-0 transition-colors ml-2" />
        </div>
    )
}
