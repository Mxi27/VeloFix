import { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { PageTransition } from '@/components/PageTransition'
import { PageHeader } from '@/components/PageHeader'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { AppointmentCard } from '@/components/AppointmentCard'
import { cn } from '@/lib/utils'
import { format, startOfWeek, endOfWeek, startOfDay, parseISO, isToday, isTomorrow } from 'date-fns'
import { de } from 'date-fns/locale'
import {
    CalendarClock, Search, Loader2, CalendarDays, Inbox,
    Clock, CalendarCheck, AlertTriangle, CheckCircle2,
    LayoutGrid, Calendar as CalendarIcon
} from 'lucide-react'
import { CalendarView } from '@/components/CalendarView'
import type { Appointment } from '@/types'

type FilterKey = 'all' | 'pending' | 'confirmed' | 'today' | 'week'

const FILTERS: { key: FilterKey; label: string; icon: React.ElementType }[] = [
    { key: 'all', label: 'Alle', icon: Inbox },
    { key: 'pending', label: 'Offen', icon: Clock },
    { key: 'confirmed', label: 'Bestätigt', icon: CalendarCheck },
    { key: 'today', label: 'Heute', icon: CalendarDays },
    { key: 'week', label: 'Diese Woche', icon: CalendarClock },
]

export default function AppointmentsPage() {
    const { workshopId } = useAuth()
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<FilterKey>('pending')
    const [searchQuery, setSearchQuery] = useState('')
    const [view, setView] = useState<'list' | 'calendar'>('list')

    const fetchAppointments = async () => {
        if (!workshopId) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .eq('workshop_id', workshopId)
                .order('requested_date', { ascending: true })
                .order('requested_time', { ascending: true })

            if (error) throw error
            setAppointments((data || []) as Appointment[])
        } catch (err) {
            console.error('Failed to fetch appointments:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAppointments()
    }, [workshopId])

    // Subscribe to realtime changes
    useEffect(() => {
        if (!workshopId) return
        const channel = supabase
            .channel(`appointments-${workshopId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'appointments',
                filter: `workshop_id=eq.${workshopId}`,
            }, () => {
                fetchAppointments()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [workshopId])

    // Filtered & sorted appointments
    const filteredAppointments = useMemo(() => {
        const today = format(startOfDay(new Date()), 'yyyy-MM-dd')
        const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
        const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

        let filtered = appointments

        switch (filter) {
            case 'pending':
                filtered = filtered.filter(a => a.status === 'pending')
                break
            case 'confirmed':
                filtered = filtered.filter(a => a.status === 'confirmed')
                break
            case 'today':
                filtered = filtered.filter(a => a.requested_date === today && a.status !== 'cancelled')
                break
            case 'week':
                filtered = filtered.filter(a => a.requested_date >= weekStart && a.requested_date <= weekEnd && a.status !== 'cancelled')
                break
        }

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            filtered = filtered.filter(a =>
                a.customer_name.toLowerCase().includes(q) ||
                a.customer_email?.toLowerCase().includes(q) ||
                a.customer_phone?.includes(q) ||
                a.bike_brand?.toLowerCase().includes(q)
            )
        }

        return filtered
    }, [appointments, filter, searchQuery])

    // Stats
    const stats = useMemo(() => {
        const today = format(startOfDay(new Date()), 'yyyy-MM-dd')
        return {
            pending: appointments.filter(a => a.status === 'pending').length,
            todayCount: appointments.filter(a => a.requested_date === today && a.status !== 'cancelled').length,
            confirmedUpcoming: appointments.filter(a => a.status === 'confirmed' && a.requested_date >= today).length,
            noShowTotal: appointments.filter(a => a.status === 'no_show').length,
        }
    }, [appointments])

    // Group appointments by date
    const groupedByDate = useMemo(() => {
        const groups: { label: string; date: string; items: Appointment[] }[] = []
        const dateMap = new Map<string, Appointment[]>()

        filteredAppointments.forEach(a => {
            const existing = dateMap.get(a.requested_date)
            if (existing) existing.push(a)
            else dateMap.set(a.requested_date, [a])
        })

        dateMap.forEach((items, dateStr) => {
            let label: string
            try {
                const d = parseISO(dateStr)
                if (isToday(d)) label = 'Heute'
                else if (isTomorrow(d)) label = 'Morgen'
                else label = format(d, 'EEEE, d. MMMM', { locale: de })
            } catch {
                label = dateStr
            }
            groups.push({ label, date: dateStr, items })
        })

        groups.sort((a, b) => a.date.localeCompare(b.date))
        return groups
    }, [filteredAppointments])

    return (
        <PageTransition>
            <DashboardLayout>
                <PageHeader
                    icon={CalendarClock}
                    title="Termine"
                    description="Terminanfragen verwalten und bestätigen"
                >
                    <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1 ml-auto">
                        <button
                            onClick={() => setView('list')}
                            className={cn(
                                "p-1.5 rounded-md transition-colors",
                                view === 'list' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setView('calendar')}
                            className={cn(
                                "p-1.5 rounded-md transition-colors",
                                view === 'calendar' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <CalendarIcon className="h-4 w-4" />
                        </button>
                    </div>
                </PageHeader>

                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {[
                        { label: 'Offene Anfragen', value: stats.pending, icon: Clock, color: 'text-amber-500' },
                        { label: 'Heute', value: stats.todayCount, icon: CalendarDays, color: 'text-primary' },
                        { label: 'Bestätigt', value: stats.confirmedUpcoming, icon: CheckCircle2, color: 'text-emerald-500' },
                        { label: 'No-Shows', value: stats.noShowTotal, icon: AlertTriangle, color: 'text-red-500' },
                    ].map(s => (
                        <div key={s.label} className="bg-card border border-border rounded-xl px-4 py-3">
                            <div className="flex items-center gap-2 mb-1">
                                <s.icon className={cn("h-3.5 w-3.5", s.color)} />
                                <span className="text-xs text-muted-foreground">{s.label}</span>
                            </div>
                            <p className="text-xl font-bold tabular-nums">{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Filter + Search */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                    <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
                        {FILTERS.map(f => (
                            <button key={f.key} onClick={() => setFilter(f.key)}
                                className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                                    filter === f.key
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <f.icon className="h-3 w-3" />
                                {f.label}
                                {f.key === 'pending' && stats.pending > 0 && (
                                    <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-1 rounded">
                                        {stats.pending}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input value={searchQuery} placeholder="Suchen..."
                            className="pl-8 h-8 text-xs"
                            onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : view === 'calendar' ? (
                    <CalendarView
                        appointments={appointments}
                        onUpdate={fetchAppointments}
                    />
                ) : filteredAppointments.length === 0 ? (
                    <div className="text-center py-16 space-y-2">
                        <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                        <p className="text-sm text-muted-foreground">
                            {filter === 'pending' ? 'Keine offenen Terminanfragen.' :
                             filter === 'today' ? 'Keine Termine für heute.' :
                             'Keine Termine gefunden.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {groupedByDate.map(group => (
                            <div key={group.date}>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                                    {group.label}
                                </h3>
                                <div className="space-y-2">
                                    {group.items.map(apt => (
                                        <AppointmentCard
                                            key={apt.id}
                                            appointment={apt}
                                            onUpdate={fetchAppointments}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </DashboardLayout>
        </PageTransition>
    )
}
