import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import {
    Check, X, Clock, Phone, Mail, Wrench, Search,
    Package, MessageSquare, User, Bike, CalendarClock,
    ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react'
import type { Appointment, AppointmentStatus } from '@/types'

const SERVICE_LABELS: Record<string, string> = {
    repair: 'Reparatur',
    inspection: 'Inspektion',
    pickup: 'Abholung',
    consultation: 'Beratung',
    other: 'Sonstiges',
}

const SERVICE_ICONS: Record<string, React.ElementType> = {
    repair: Wrench,
    inspection: Search,
    pickup: Package,
    consultation: MessageSquare,
}

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string }> = {
    pending: { label: 'Offen', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
    confirmed: { label: 'Bestätigt', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
    completed: { label: 'Erledigt', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
    no_show: { label: 'Nicht erschienen', color: 'bg-red-500/15 text-red-600 dark:text-red-400' },
    cancelled: { label: 'Storniert', color: 'bg-muted text-muted-foreground' },
}

interface AppointmentCardProps {
    appointment: Appointment
    onUpdate: () => void
}

export function AppointmentCard({ appointment, onUpdate }: AppointmentCardProps) {
    const [expanded, setExpanded] = useState(false)
    const [internalNote, setInternalNote] = useState(appointment.internal_note || '')
    const [updatingStatus, setUpdatingStatus] = useState<AppointmentStatus | null>(null)

    const status = (appointment.status as AppointmentStatus) || 'pending'
    const statusConf = STATUS_CONFIG[status]
    const ServiceIcon = SERVICE_ICONS[appointment.service_type] || CalendarClock

    const updateStatus = async (newStatus: AppointmentStatus) => {
        setUpdatingStatus(newStatus)
        try {
            const update: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() }
            if (newStatus === 'confirmed') {
                update.confirmed_date = appointment.requested_date
                update.confirmed_time = appointment.requested_time
            }
            const { error } = await supabase
                .from('appointments')
                .update(update)
                .eq('id', appointment.id)
            if (error) throw error
            toast.success(
                newStatus === 'confirmed' ? 'Termin bestätigt' :
                newStatus === 'cancelled' ? 'Termin storniert' :
                newStatus === 'no_show' ? 'Als nicht erschienen markiert' :
                newStatus === 'completed' ? 'Termin abgeschlossen' : 'Status aktualisiert'
            )
            onUpdate()
        } catch (err: unknown) {
            toast.error('Fehler', { description: err instanceof Error ? err.message : '' })
        } finally {
            setUpdatingStatus(null)
        }
    }

    const saveNote = async () => {
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ internal_note: internalNote || null })
                .eq('id', appointment.id)
            if (error) throw error
            toast.success('Notiz gespeichert')
        } catch {
            toast.error('Fehler beim Speichern')
        }
    }

    const dateStr = (() => {
        try {
            return format(parseISO(appointment.requested_date), 'EEE, d. MMM yyyy', { locale: de })
        } catch {
            return appointment.requested_date
        }
    })()

    return (
        <div className={cn(
            "border rounded-xl p-4 transition-colors",
            status === 'pending' ? "border-amber-500/30 bg-amber-500/[0.03]" :
            status === 'confirmed' ? "border-border" :
            "border-border/50 opacity-75"
        )}>
            {/* Header row */}
            <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                <div className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                    status === 'pending' ? "bg-amber-500/10" : "bg-accent"
                )}>
                    <ServiceIcon className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{appointment.customer_name}</p>
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-md", statusConf.color)}>
                            {statusConf.label}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            {dateStr}, {appointment.requested_time} Uhr
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {appointment.duration_minutes} Min.
                        </span>
                        <span>{SERVICE_LABELS[appointment.service_type] || appointment.service_type}</span>
                    </div>
                </div>

                {/* Quick actions for pending */}
                {status === 'pending' && (
                    <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
                        <Button size="sm" variant="default" className="h-7 text-[10px] px-2"
                            disabled={updatingStatus !== null}
                            onClick={() => updateStatus('confirmed')}>
                            <Check className="h-3 w-3 mr-1 shrink-0" />
                            <span className="hidden min-[450px]:inline">Bestätigen</span>
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 text-destructive hover:text-destructive"
                            disabled={updatingStatus !== null}
                            onClick={() => updateStatus('cancelled')}>
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                )}

                {/* Actions for confirmed */}
                {status === 'confirmed' && (
                    <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
                        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2"
                            disabled={updatingStatus !== null}
                            onClick={() => updateStatus('completed')}>
                            <Check className="h-3 w-3 mr-1 shrink-0" />
                            <span className="hidden min-[450px]:inline">Erledigt</span>
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 text-amber-600 hover:text-amber-700"
                            disabled={updatingStatus !== null}
                            onClick={() => updateStatus('no_show')}>
                            <AlertTriangle className="h-3 w-3 mr-1 shrink-0" />
                            <span className="hidden min-[450px]:inline">No-Show</span>
                        </Button>
                    </div>
                )}

                <button onClick={() => setExpanded(!expanded)}
                    className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent shrink-0 cursor-pointer">
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
            </div>

            {/* Expanded details */}
            {expanded && (
                <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                    {/* Contact info */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        {appointment.customer_email && (
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Mail className="h-3 w-3" /> {appointment.customer_email}
                            </span>
                        )}
                        {appointment.customer_phone && (
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Phone className="h-3 w-3" /> {appointment.customer_phone}
                            </span>
                        )}
                        {(appointment.bike_brand || appointment.bike_model) && (
                            <span className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                                <Bike className="h-3 w-3" />
                                {[appointment.bike_brand, appointment.bike_model].filter(Boolean).join(' ')}
                            </span>
                        )}
                    </div>

                    {/* Customer description */}
                    {appointment.description && (
                        <div className="bg-muted/30 rounded-lg px-3 py-2">
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                <User className="h-3 w-3" /> Kundenbeschreibung
                            </p>
                            <p className="text-sm">{appointment.description}</p>
                        </div>
                    )}

                    {/* Internal note */}
                    <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground font-medium">Interne Notiz</p>
                        <Textarea value={internalNote} rows={2} placeholder="Notiz hinzufügen..."
                            className="text-xs"
                            onChange={e => setInternalNote(e.target.value)} />
                        <div className="flex justify-end">
                            <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={saveNote}>
                                Notiz speichern
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
