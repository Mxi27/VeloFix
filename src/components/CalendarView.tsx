import { useState, useMemo } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { AppointmentCard } from '@/components/AppointmentCard'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { CalendarDays, Clock } from 'lucide-react'
import type { Appointment } from '@/types'

interface CalendarViewProps {
    appointments: Appointment[]
    onUpdate: () => void
}

export function CalendarView({ appointments, onUpdate }: CalendarViewProps) {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

    // Group appointments by date for quick lookup
    const appointmentsByDate = useMemo(() => {
        const map = new Map<string, Appointment[]>()
        appointments.forEach(a => {
            const date = a.requested_date
            if (!map.has(date)) map.set(date, [])
            map.get(date)?.push(a)
        })
        return map
    }, [appointments])

    // Modifiers for the calendar
    const modifiers = useMemo(() => {
        const hasAppointments: Date[] = []
        const hasPending: Date[] = []

        appointmentsByDate.forEach((items, dateStr) => {
            const date = parseISO(dateStr)
            hasAppointments.push(date)
            if (items.some(a => a.status === 'pending')) {
                hasPending.push(date)
            }
        })

        return {
            hasAppointments,
            hasPending,
        }
    }, [appointmentsByDate])

    // Selected day appointments
    const selectedDayAppointments = useMemo(() => {
        if (!selectedDate) return []
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        return appointmentsByDate.get(dateStr) || []
    }, [selectedDate, appointmentsByDate])

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Calendar Column */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
                <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        locale={de}
                        className="w-full"
                        classNames={{
                            months: "flex flex-col w-full",
                            month: "space-y-4 w-full",
                            table: "w-full border-collapse space-y-1",
                            head_row: "flex w-full",
                            head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
                            row: "flex w-full mt-2",
                            cell: "text-center text-sm p-0 relative w-full h-9 focus-within:relative focus-within:z-20",
                            day: cn(
                                "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent rounded-lg transition-colors mx-auto flex items-center justify-center relative"
                            ),
                        }}
                        modifiers={modifiers}
                        modifiersClassNames={{
                            hasPending: "after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-amber-500",
                            hasAppointments: !modifiers.hasPending ? "after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-primary" : "",
                        }}
                    />
                </div>

                {/* Quick Legend */}
                <div className="bg-card/50 border border-border/50 rounded-xl p-3 flex flex-wrap gap-4 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>Offen</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span>Bestätigt / Andere</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-lg bg-accent border border-border" />
                        <span>Heute</span>
                    </div>
                </div>
            </div>

            {/* List Column */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <CalendarDays className="h-4 w-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold">
                                {selectedDate ? format(selectedDate, 'EEEE, d. MMMM', { locale: de }) : 'Datum wählen'}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {selectedDayAppointments.length} {selectedDayAppointments.length === 1 ? 'Termin' : 'Termine'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 min-h-[400px]">
                    {selectedDayAppointments.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-muted/20 border border-dashed border-border rounded-2xl">
                            <Clock className="h-10 w-10 text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground font-medium">Keine Termine geplant</p>
                            <p className="text-xs text-muted-foreground/70">Wähle einen anderen Tag im Kalender aus.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {selectedDayAppointments
                                .sort((a, b) => a.requested_time.localeCompare(b.requested_time))
                                .map(apt => (
                                    <AppointmentCard
                                        key={apt.id}
                                        appointment={apt}
                                        onUpdate={onUpdate}
                                    />
                                ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
