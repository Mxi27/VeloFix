import type { OrderHistoryEvent } from "@/lib/history"
import type { GroupedHistoryEvent, HistoryItemEntry } from "@/types/index"
import { format, isToday, isYesterday, isSameDay } from "date-fns"
import { de } from "date-fns/locale"

import {
    CheckCircle2,
    Circle,
    ChevronDown,
    Star,
} from "lucide-react"
import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface OrderHistoryProps {
    history: OrderHistoryEvent[]
}

// ── Grouping logic (unchanged, just cleaned up) ─────────────────────────────

function groupEvents(events: OrderHistoryEvent[]) {
    const sorted = [...events].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    const grouped: Array<GroupedHistoryEvent | OrderHistoryEvent> = []
    let currentGroup: GroupedHistoryEvent | null = null

    sorted.forEach(event => {
        const isServiceStep = event.type === 'service_step'
        const isControlStep = event.type === 'control_step'
        const isControlCompletion = event.type === 'control'
        const isStatusChange = event.type === 'status_change'
        const isChecklistEvent = event.type === 'checklist_update' || event.type === 'info'

        if (isServiceStep || isControlStep || isControlCompletion || isStatusChange || isChecklistEvent) {
            const groupType = isServiceStep ? 'service'
                : isStatusChange ? 'status'
                : isChecklistEvent ? 'checklist'
                : 'control'

            // For checklist events, check time proximity (within 5 min)
            const canJoinGroup = currentGroup && currentGroup.type === groupType && (
                !isChecklistEvent || Math.abs(
                    new Date(currentGroup.timestamp).getTime() - new Date(event.timestamp).getTime()
                ) < 5 * 60 * 1000
            )

            if (canJoinGroup && currentGroup) {
                if (event.actor && currentGroup.actor && event.actor.id !== currentGroup.actor.id) {
                    currentGroup.hasMixedActors = true
                }
                if (isControlCompletion) {
                    if (event.metadata?.rating) currentGroup.metadata.rating = event.metadata.rating
                    if (event.metadata?.feedback) currentGroup.metadata.feedback = event.metadata.feedback
                } else {
                    currentGroup.metadata.items.push({
                        text: (isStatusChange ? event.description : (event.description || event.title)) ?? event.title,
                        actor: event.actor,
                        timestamp: event.timestamp
                    })
                }
            } else {
                const groupTitle = isServiceStep ? 'Service-Arbeiten'
                    : isStatusChange ? 'Status-Verlauf'
                    : isChecklistEvent ? 'Checklisten-Aktivität'
                    : 'Endkontrolle'

                currentGroup = {
                    id: `group-${event.id}`,
                    type: groupType,
                    title: groupTitle,
                    timestamp: event.timestamp,
                    actor: event.actor,
                    hasMixedActors: false,
                    metadata: { items: [], checklist_count: 0 }
                }
                if (isControlCompletion) {
                    if (event.metadata?.rating) currentGroup.metadata.rating = event.metadata.rating
                    if (event.metadata?.feedback) currentGroup.metadata.feedback = event.metadata.feedback
                    currentGroup.description = event.description
                } else {
                    currentGroup.metadata.items.push({
                        text: (isStatusChange ? event.description : (event.description || event.title)) ?? event.title,
                        actor: event.actor,
                        timestamp: event.timestamp
                    })
                }
                grouped.push(currentGroup)
            }
            if (currentGroup) {
                currentGroup.metadata.checklist_count = currentGroup.metadata.items.length
            }
        } else {
            currentGroup = null
            grouped.push(event)
        }
    })

    grouped.forEach(g => {
        if (g.metadata?.items) {
            g.metadata.items.sort((a: HistoryItemEntry, b: HistoryItemEntry) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            )
        }
    })

    return grouped
}

// ── Date section grouping ────────────────────────────────────────────────────

function getDateLabel(date: Date): string {
    if (isToday(date)) return 'Heute'
    if (isYesterday(date)) return 'Gestern'
    return format(date, "EEEE, d. MMMM yyyy", { locale: de })
}

interface DateSection {
    label: string
    date: Date
    events: Array<GroupedHistoryEvent | OrderHistoryEvent>
}

function groupByDate(events: Array<GroupedHistoryEvent | OrderHistoryEvent>): DateSection[] {
    const sections: DateSection[] = []

    events.forEach(event => {
        const date = new Date(event.timestamp)
        const existing = sections.find(s => isSameDay(s.date, date))
        if (existing) {
            existing.events.push(event)
        } else {
            sections.push({
                label: getDateLabel(date),
                date,
                events: [event]
            })
        }
    })

    return sections
}

// ── Icon + color helpers ─────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, string> = {
    creation:      'bg-blue-400',
    status_change: 'bg-indigo-400',
    status:        'bg-indigo-400',
    assignment:    'bg-violet-400',
    service:       'bg-orange-400',
    control:       'bg-emerald-400',
    info:          'bg-muted-foreground',
    checklist:     'bg-sky-400',
    checklist_update: 'bg-sky-400',
}

// ── Main component ───────────────────────────────────────────────────────────

export function OrderHistory({ history }: OrderHistoryProps) {
    if (!history?.length) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Circle className="h-8 w-8 mb-3 opacity-30" />
                <p className="text-sm">Noch keine Einträge</p>
            </div>
        )
    }

    const groupedHistory = useMemo(() => groupEvents(history), [history])
    const dateSections = useMemo(() => groupByDate(groupedHistory), [groupedHistory])

    return (
        <div className="space-y-6">
            {dateSections.map((section) => (
                <div key={section.label}>
                    {/* Date header */}
                    <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                            {section.label}
                        </h3>
                        <div className="flex-1 h-px bg-border/40" />
                    </div>

                    {/* Events for this date */}
                    <div className="space-y-1">
                        {section.events.map((event) => (
                            <HistoryItem key={event.id} event={event} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

// ── Single history item ──────────────────────────────────────────────────────

function HistoryItem({ event }: { event: (OrderHistoryEvent | GroupedHistoryEvent) & { hasMixedActors?: boolean } }) {
    const [isExpanded, setIsExpanded] = useState(false)

    const dotColor = EVENT_COLORS[event.type] || EVENT_COLORS.info

    const hasDetails = (event.type === 'service' || event.type === 'control' || event.type === 'status' || event.type === 'checklist') &&
        ((event.metadata?.checklist_count ?? 0) > 0 || !!event.metadata?.rating)

    const actorName = event.hasMixedActors
        ? 'Diverse'
        : event.actor?.name

    return (
        <div
            className={cn(
                "group rounded-lg px-3 py-2.5 transition-colors",
                hasDetails ? "cursor-pointer hover:bg-muted/40" : "hover:bg-muted/20"
            )}
            onClick={hasDetails ? () => setIsExpanded(!isExpanded) : undefined}
        >
            <div className="flex items-start gap-3">
                {/* Dot indicator */}
                <div className="mt-1.5 shrink-0">
                    <div className={cn("h-2 w-2 rounded-full", dotColor)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span className="text-sm font-medium text-foreground/90 leading-tight">
                                {event.title}
                            </span>
                            {hasDetails && event.metadata?.checklist_count && event.metadata.checklist_count > 0 && (
                                <span className={cn(
                                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                                    event.type === 'service' && "bg-orange-500/10 text-orange-400",
                                    event.type === 'control' && "bg-emerald-500/10 text-emerald-400",
                                    event.type === 'status' && "bg-indigo-500/10 text-indigo-400",
                                    event.type === 'checklist' && "bg-sky-500/10 text-sky-400",
                                )}>
                                    {event.metadata.checklist_count} {event.type === 'control'
                                        ? 'geprüft'
                                        : event.type === 'status'
                                            ? (event.metadata.checklist_count === 1 ? 'Änderung' : 'Änderungen')
                                            : (event.metadata.checklist_count === 1 ? 'Aktion' : 'Aktionen')}
                                </span>
                            )}
                            {event.metadata?.rating && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                                    <Star className="h-2.5 w-2.5 fill-amber-400" />
                                    {event.metadata.rating}/5
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <time className="text-[11px] text-muted-foreground/60 font-mono whitespace-nowrap">
                                {format(new Date(event.timestamp), "HH:mm")}
                            </time>
                            {hasDetails && (
                                <ChevronDown className={cn(
                                    "h-3.5 w-3.5 text-muted-foreground/40 transition-transform duration-200",
                                    isExpanded && "rotate-180"
                                )} />
                            )}
                        </div>
                    </div>

                    {/* Subtitle: actor + description */}
                    <div className="flex items-center gap-2 mt-0.5">
                        {actorName && (
                            <span className="text-[11px] text-muted-foreground/50">
                                {actorName}
                            </span>
                        )}
                        {!hasDetails && event.description && (
                            <>
                                {actorName && <span className="text-muted-foreground/30">·</span>}
                                <span className="text-[11px] text-muted-foreground/50 truncate">
                                    {event.description}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Expandable details */}
            <AnimatePresence>
                {isExpanded && hasDetails && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="ml-5 mt-2 pl-3 border-l-2 border-border/30 space-y-0">
                            {/* Rating */}
                            {event.metadata?.rating && (
                                <div className="pb-2 mb-1">
                                    <div className="flex items-center gap-1.5 text-xs">
                                        <span className="text-amber-400">
                                            {Array.from({ length: event.metadata.rating }).map((_, i) => (
                                                <Star key={i} className="h-3 w-3 fill-amber-400 inline" />
                                            ))}
                                        </span>
                                        <span className="text-muted-foreground">{event.metadata.rating}/5</span>
                                    </div>
                                    {event.metadata.feedback && (
                                        <p className="text-xs text-muted-foreground/70 italic mt-1">
                                            &ldquo;{event.metadata.feedback}&rdquo;
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Items list */}
                            {event.metadata?.items && Array.isArray(event.metadata.items) && (
                                event.metadata.items.map((item: HistoryItemEntry, idx: number) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-2.5 py-1.5 group/item"
                                    >
                                        <CheckCircle2 className={cn(
                                            "h-3.5 w-3.5 mt-0.5 shrink-0",
                                            event.type === 'service' && "text-orange-400/60",
                                            event.type === 'control' && "text-emerald-400/60",
                                            event.type === 'status' && "text-indigo-400/60",
                                            event.type === 'checklist' && "text-sky-400/60",
                                        )} />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-xs text-foreground/80 leading-tight">
                                                {typeof item === 'string' ? item : item.text}
                                            </span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {item.actor && (
                                                    <span className="text-[10px] text-muted-foreground/40">
                                                        {item.actor.name}
                                                    </span>
                                                )}
                                                {item.timestamp && (
                                                    <span className="text-[10px] text-muted-foreground/30 font-mono">
                                                        {format(new Date(item.timestamp), "HH:mm")}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
