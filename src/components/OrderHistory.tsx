import type { OrderHistoryEvent } from "@/lib/history"
import { format } from "date-fns"

import {
    CheckCircle2,
    Circle,
    FileText,
    User,
    Wrench,
    ChevronDown,
    ChevronUp
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface OrderHistoryProps {
    history: OrderHistoryEvent[]
}

// Helper to group consecutive granular events
function groupEvents(events: OrderHistoryEvent[]) {
    // 1. Sort Newest First (Desceding)
    const sortedDetails = [...events].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    const grouped: any[] = []
    let currentGroup: any = null

    // Iterate
    sortedDetails.forEach(event => {
        const isServiceStep = event.type === 'service_step'
        const isControlStep = event.type === 'control_step'
        const isControlCompletion = event.type === 'control'
        const isStatusChange = event.type === 'status_change'

        if (isServiceStep || isControlStep || isControlCompletion || isStatusChange) {
            const groupType = isServiceStep ? 'service' : (isStatusChange ? 'status' : 'control')

            // Check if we can add to current group
            if (currentGroup && currentGroup.type === groupType) {
                // Check if actor matches, otherwise mark mixed
                if (event.actor && currentGroup.actor && event.actor.id !== currentGroup.actor.id) {
                    currentGroup.hasMixedActors = true
                }

                if (isControlCompletion) {
                    if (event.metadata?.rating) currentGroup.metadata.rating = event.metadata.rating
                    if (event.metadata?.feedback) currentGroup.metadata.feedback = event.metadata.feedback
                    // Control completion usually happens LAST in time, so it appears first in this sorted loop?
                    // If Newest First: Control completion (Time 10:05) -> Step 5 (Time 10:04)...
                    // So we met completion first.
                    // If we meet completion first, `currentGroup` might have been started by completion?
                    // wait. 
                } else {
                    currentGroup.metadata.items.push({
                        text: event.title,
                        actor: event.actor,
                        timestamp: event.timestamp
                    })
                }
            } else {
                // Start a new group
                currentGroup = {
                    id: `group-${event.id}`,
                    type: groupType,
                    title: isServiceStep ? 'Service-Arbeiten' : (isStatusChange ? 'Status-Verlauf' : 'Endkontrolle'),
                    timestamp: event.timestamp,
                    actor: event.actor,
                    hasMixedActors: false,
                    metadata: {
                        items: [],
                        checklist_count: 0
                    }
                }

                if (isControlCompletion) {
                    if (event.metadata?.rating) currentGroup.metadata.rating = event.metadata.rating
                    if (event.metadata?.feedback) currentGroup.metadata.feedback = event.metadata.feedback
                    currentGroup.description = event.description
                } else {
                    currentGroup.metadata.items.push({
                        text: isStatusChange ? event.description : event.title,
                        actor: event.actor,
                        timestamp: event.timestamp
                    })
                }

                grouped.push(currentGroup)
            }

            // Update count
            if (currentGroup) {
                currentGroup.metadata.checklist_count = currentGroup.metadata.items.length
            }
        } else {
            // Standard event, reset grouping
            currentGroup = null
            grouped.push(event)
        }
    })

    // Reverse items in groups to show chronological order inside the group (Oldest -> Newest inside the box)
    grouped.forEach(g => {
        if (g.metadata?.items) {
            // Since we iterated Newest->Oldest, the items were pushed Newest->Oldest?
            // Item 5 (pushed 1st), Item 4 (pushed 2nd)...
            // We want Item 1, Item 2, Item 3.
            // So yes, reverse needed to get Oldest->Newest visual flow inside the expanded card.
            g.metadata.items.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        }
    })

    return grouped
}

export function OrderHistory({ history }: OrderHistoryProps) {
    if (!history?.length) {
        return <div className="text-sm text-muted-foreground pt-4 text-center">Noch keine Einträge</div>
    }

    const groupedHistory = groupEvents(history)

    return (
        <div className="relative space-y-0 pb-4">
            {/* Timeline Line */}
            <div className="absolute left-4 top-2 bottom-0 w-px bg-white/10" />

            {groupedHistory.map((event) => (
                <HistoryItem key={event.id} event={event} />
            ))}
        </div>
    )
}

function HistoryItem({ event }: { event: OrderHistoryEvent & { hasMixedActors?: boolean } }) {
    const [isExpanded, setIsExpanded] = useState(false)

    const getIcon = () => {
        switch (event.type) {
            case 'creation': return FileText
            case 'assignment': return User
            case 'service': return Wrench
            case 'status_change': return CheckCircle2
            case 'status': return CheckCircle2
            case 'control': return CheckCircle2
            default: return Circle
        }
    }

    const Icon = getIcon()

    // Determine if this item has expandable content
    const hasDetails = (event.type === 'service' || event.type === 'control' || event.type === 'status') &&
        ((event.metadata?.checklist_count ?? 0) > 0 || !!event.metadata?.rating)

    return (
        <div className="relative group">
            <div className="flex gap-4">
                {/* Icon Container */}
                <div className={cn(
                    "relative z-10 w-8 h-8 rounded-full flex items-center justify-center border ring-4 ring-background",
                    event.type === 'creation' && "bg-blue-500/20 border-blue-500/50 text-blue-500",
                    (event.type === 'status_change' || event.type === 'status') && "bg-indigo-500/20 border-indigo-500/50 text-indigo-500",
                    event.type === 'service' && "bg-orange-500/20 border-orange-500/50 text-orange-500",
                    event.type === 'assignment' && "bg-purple-500/20 border-purple-500/50 text-purple-500",
                    event.type === 'info' && "bg-gray-500/20 border-gray-500/50 text-gray-500",
                    // Control type styles
                    event.type === 'control' && "bg-green-500/20 border-green-500/50 text-green-500",
                )}>
                    <Icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex-1 pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                        <div className="space-y-1">
                            <h4 className="text-base font-medium leading-none text-foreground/90">
                                {event.title}
                            </h4>

                            {/* Metadata Row */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
                                {event.hasMixedActors ? (
                                    <div className="flex items-center gap-1.5">
                                        <User className="w-3 h-3 opacity-70" />
                                        <span>Diverse Mitarbeiter</span>
                                    </div>
                                ) : event.actor ? (
                                    <div className="flex items-center gap-1.5">
                                        <User className="w-3 h-3 opacity-70" />
                                        <span>{event.actor.name}</span>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <time className="text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-md whitespace-nowrap font-mono">
                            {format(new Date(event.timestamp), "dd.MM.yy HH:mm")}
                        </time>
                    </div>

                    {/* Description or Expandable Content */}
                    <div className="mt-2">
                        {hasDetails ? (
                            <div className="bg-card/40 border border-white/5 rounded-lg overflow-hidden transition-all duration-300">
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors group/btn"
                                >
                                    <div className="flex items-center gap-3">
                                        {event.metadata?.checklist_count && event.metadata.checklist_count > 0 && (
                                            <div className={cn(
                                                "bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium border border-primary/20",
                                                event.type === 'control' && "bg-green-500/10 text-green-500 border-green-500/20",
                                                event.type === 'status' && "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                                            )}>
                                                {event.metadata.checklist_count} {event.type === 'control' ? 'geprüft' : (event.type === 'status' ? 'Änderungen' : 'Punkte')}
                                            </div>
                                        )}
                                        {event.metadata?.rating && (
                                            <div className="flex items-center gap-1 text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                                                <span>★</span>
                                                <span>{event.metadata.rating}/5</span>
                                            </div>
                                        )}
                                    </div>
                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground group-hover/btn:text-foreground transition-colors" />}
                                </button>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="border-t border-white/5 bg-black/20"
                                        >
                                            <div className="px-4 py-3 space-y-3">
                                                {/* Show Rating Details/Description if expanded */}
                                                {event.metadata?.rating && (
                                                    <div className="pb-2 mb-2 border-b border-white/5 text-sm">
                                                        <span className="text-muted-foreground">Bewertung: </span>
                                                        <span className="text-foreground font-medium">{event.metadata.rating} Sterne</span>
                                                        {event.metadata.feedback && (
                                                            <p className="mt-1 text-muted-foreground italic">"{event.metadata.feedback}"</p>
                                                        )}
                                                    </div>
                                                )}

                                                {event.metadata?.items && Array.isArray(event.metadata.items) ? (
                                                    event.metadata.items.map((item: any, idx: number) => (
                                                        <div key={idx} className="flex items-start gap-3 text-sm group/item">
                                                            <div className="mt-0.5 text-green-500">
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex justify-between items-start gap-2">
                                                                    <p className="text-foreground/90 leading-tight">{typeof item === 'string' ? item : item.text}</p>
                                                                    {item.timestamp && (
                                                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono pt-0.5">
                                                                            {format(new Date(item.timestamp), "dd.MM.yy HH:mm")}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    {item.actor && (
                                                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                            <User className="w-3 h-3 opacity-50" />
                                                                            <span>{item.actor.name}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    !event.metadata?.rating && <p className="text-sm text-muted-foreground">Details verfügbar.</p>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            event.description && (
                                <p className="text-sm text-muted-foreground leading-relaxed bg-card/20 p-2 rounded-md border border-white/5 inline-block">
                                    {event.description}
                                </p>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
