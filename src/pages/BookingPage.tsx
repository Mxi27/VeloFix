import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { publicSupabase as supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, addDays, isBefore, isAfter, startOfDay } from 'date-fns'
import { de } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import {
    CalendarClock, CheckCircle2, Loader2, AlertCircle,
    Wrench, Search, Package, MessageSquare, Clock, ArrowLeft, ArrowRight,
    Bike, Info,
} from 'lucide-react'
import type { AppointmentConfig, ServiceTypeDef } from '@/types'
import { DEFAULT_APPOINTMENT_CONFIG } from '@/types'

const SERVICE_ICONS: Record<string, React.ElementType> = {
    repair: Wrench,
    inspection: Search,
    pickup: Package,
    consultation: MessageSquare,
}

const BIKE_TYPES = [
    { value: 'road', label: 'Rennrad' },
    { value: 'mtb', label: 'Mountainbike' },
    { value: 'city', label: 'City / Trekking' },
    { value: 'ebike', label: 'E-Bike / Pedelec' },
    { value: 'gravel', label: 'Gravel' },
    { value: 'kids', label: 'Kinderrad' },
    { value: 'cargo', label: 'Lastenrad' },
    { value: 'other', label: 'Sonstiges' },
]

type Step = 'service' | 'datetime' | 'details' | 'success'

export default function BookingPage() {
    const { workshopId } = useParams<{ workshopId: string }>()
    const [workshopName, setWorkshopName] = useState('')
    const [config, setConfig] = useState<AppointmentConfig>(DEFAULT_APPOINTMENT_CONFIG)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [step, setStep] = useState<Step>('service')

    // Form state
    const [selectedService, setSelectedService] = useState<ServiceTypeDef | null>(null)
    const [selectedDate, setSelectedDate] = useState<Date | undefined>()
    const [selectedTime, setSelectedTime] = useState<string | null>(null)
    const [bookedSlots, setBookedSlots] = useState<Record<string, number>>({})
    const [form, setForm] = useState({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        bike_brand: '',
        bike_model: '',
        bike_type: '',
        bike_color: '',
        description: '',
    })

    // Load workshop info + config
    useEffect(() => {
        if (!workshopId) return
        const load = async () => {
            try {
                const { data, error } = await supabase
                    .from('workshops')
                    .select('name, appointment_config')
                    .eq('id', workshopId)
                    .single()
                if (error) throw error
                setWorkshopName(data.name)
                if (data.appointment_config && typeof data.appointment_config === 'object') {
                    setConfig({ ...DEFAULT_APPOINTMENT_CONFIG, ...(data.appointment_config as Partial<AppointmentConfig>) })
                }
            } catch {
                setError('Werkstatt nicht gefunden.')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [workshopId])

    // Load booked slots for selected date
    useEffect(() => {
        if (!selectedDate || !workshopId) return
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const loadSlots = async () => {
            const { data } = await supabase
                .from('appointments')
                .select('requested_time, confirmed_time')
                .eq('workshop_id', workshopId)
                .eq('requested_date', dateStr)
                .in('status', ['pending', 'confirmed'])
            if (data) {
                const counts: Record<string, number> = {}
                data.forEach(row => {
                    const time = row.confirmed_time || row.requested_time
                    counts[time] = (counts[time] || 0) + 1
                })
                setBookedSlots(counts)
            }
        }
        loadSlots()
    }, [selectedDate, workshopId])

    // Generate available time slots
    const timeSlots = useMemo(() => {
        if (!selectedDate) return []
        const dayKeys: (keyof AppointmentConfig['business_hours'])[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
        const dayKey = dayKeys[selectedDate.getDay()]
        const hours = config.business_hours[dayKey]
        if (!hours) return []

        const slots: string[] = []
        const [openH, openM] = hours.open.split(':').map(Number)
        const [closeH, closeM] = hours.close.split(':').map(Number)
        const startMin = openH * 60 + openM
        const endMin = closeH * 60 + closeM
        const duration = selectedService?.duration || config.slot_duration_minutes

        for (let m = startMin; m + duration <= endMin; m += config.slot_duration_minutes) {
            const hh = String(Math.floor(m / 60)).padStart(2, '0')
            const mm = String(m % 60).padStart(2, '0')
            slots.push(`${hh}:${mm}`)
        }
        return slots
    }, [selectedDate, config, selectedService])

    const availableSlots = useMemo(() => {
        return timeSlots.filter(slot => (bookedSlots[slot] || 0) < config.max_per_slot)
    }, [timeSlots, bookedSlots, config.max_per_slot])

    const isDateDisabled = (date: Date) => {
        const today = startOfDay(new Date())
        const minDate = addDays(today, config.min_lead_days)
        const maxDate = addDays(today, config.max_lead_days)
        if (isBefore(date, minDate) || isAfter(date, maxDate)) return true
        const dayKeys: (keyof AppointmentConfig['business_hours'])[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
        const dayKey = dayKeys[date.getDay()]
        return config.business_hours[dayKey] === null
    }

    const handleSubmit = async () => {
        if (!workshopId || !selectedService || !selectedDate || !selectedTime) return
        if (!form.customer_name.trim()) {
            setError('Bitte geben Sie Ihren Namen ein.')
            return
        }
        setSubmitting(true)
        setError(null)
        try {
            const { error } = await supabase.from('appointments').insert({
                workshop_id: workshopId,
                customer_name: form.customer_name,
                customer_email: form.customer_email || null,
                customer_phone: form.customer_phone || null,
                requested_date: format(selectedDate, 'yyyy-MM-dd'),
                requested_time: selectedTime,
                duration_minutes: selectedService.duration,
                service_type: selectedService.id,
                bike_brand: form.bike_brand || null,
                bike_model: form.bike_model || null,
                bike_type: form.bike_type || null,
                bike_color: form.bike_color || null,
                description: form.description || null,
                status: config.auto_confirm ? 'confirmed' : 'pending',
            })
            if (error) throw error
            setStep('success')
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Fehler beim Senden der Anfrage.')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error && step !== 'details') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
                        <p className="text-sm text-destructive">{error}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background flex items-start justify-center p-4 pt-8 md:pt-16">
            <div className="w-full max-w-lg space-y-4">
                {/* Header */}
                <div className="text-center space-y-1">
                    <div className="flex items-center justify-center gap-2 text-primary">
                        <Bike className="h-5 w-5" />
                        <span className="text-sm font-semibold tracking-wide">{workshopName}</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Termin vereinbaren</h1>
                    <p className="text-sm text-muted-foreground">
                        {step === 'success' ? 'Fertig!' : 'Buchen Sie einen Termin zur Rad-Abgabe.'}
                    </p>
                </div>

                {/* Progress */}
                {step !== 'success' && (
                    <div className="flex items-center justify-center gap-1.5">
                        {(['service', 'datetime', 'details'] as Step[]).map((s, i) => (
                            <div key={s} className={cn(
                                "h-1.5 rounded-full transition-all",
                                s === step ? "w-8 bg-primary" : "w-4",
                                (['service', 'datetime', 'details'] as Step[]).indexOf(step) > i ? "bg-primary/60" : "bg-muted"
                            )} />
                        ))}
                    </div>
                )}

                {/* Step 1: Service Selection */}
                {step === 'service' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Worum geht es?</CardTitle>
                            <CardDescription>Wählen Sie den passenden Service aus.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {config.service_types.map(st => {
                                const Icon = SERVICE_ICONS[st.id] || CalendarClock
                                const isSelected = selectedService?.id === st.id
                                return (
                                    <button key={st.id} onClick={() => setSelectedService(st)}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left cursor-pointer",
                                            isSelected
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-primary/40 hover:bg-accent/30"
                                        )}
                                    >
                                        <Icon className={cn("h-5 w-5 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium">{st.label}</p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> Abgabe-Zeitfenster: ca. {st.duration} Min.
                                            </p>
                                        </div>
                                    </button>
                                )
                            })}

                            {/* Info hint */}
                            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 mt-3">
                                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <span>
                                    Sie bringen Ihr Rad zum gewählten Zeitpunkt vorbei. Die Reparatur kann je nach Aufwand einige Tage in Anspruch nehmen.
                                </span>
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button disabled={!selectedService} onClick={() => setStep('datetime')}>
                                    Weiter <ArrowRight className="ml-1 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Date & Time */}
                {step === 'datetime' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Wann möchten Sie Ihr Rad abgeben?</CardTitle>
                            <CardDescription>
                                {selectedService?.label} – Abgabe-Zeitfenster ca. {selectedService?.duration} Min.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-center">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={(d) => { setSelectedDate(d); setSelectedTime(null) }}
                                    locale={de}
                                    disabled={isDateDisabled}
                                    className="rounded-md border"
                                />
                            </div>

                            {selectedDate && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">
                                        Verfügbare Zeiten – {format(selectedDate, 'EEEE, d. MMMM', { locale: de })}
                                    </p>
                                    {availableSlots.length === 0 ? (
                                        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                                            Keine freien Zeiten an diesem Tag. Bitte wählen Sie einen anderen Tag.
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {availableSlots.map(slot => (
                                                <button key={slot} onClick={() => setSelectedTime(slot)}
                                                    className={cn(
                                                        "text-sm py-1.5 rounded-md border transition-colors cursor-pointer",
                                                        selectedTime === slot
                                                            ? "border-primary bg-primary text-primary-foreground font-medium"
                                                            : "border-border hover:border-primary/50 hover:bg-accent/30"
                                                    )}
                                                >
                                                    {slot}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-between pt-2">
                                <Button variant="ghost" onClick={() => setStep('service')}>
                                    <ArrowLeft className="mr-1 h-4 w-4" /> Zurück
                                </Button>
                                <Button disabled={!selectedTime} onClick={() => setStep('details')}>
                                    Weiter <ArrowRight className="ml-1 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Contact + Bike Details */}
                {step === 'details' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Ihre Daten & Fahrrad</CardTitle>
                            <CardDescription>
                                Abgabe: {selectedDate ? format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: de }) : ''} um {selectedTime} Uhr
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Contact */}
                            <div className="space-y-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kontaktdaten</p>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Name *</Label>
                                    <Input value={form.customer_name} placeholder="Max Mustermann"
                                        onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">E-Mail</Label>
                                        <Input type="email" value={form.customer_email} placeholder="mail@example.de"
                                            onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Telefon</Label>
                                        <Input type="tel" value={form.customer_phone} placeholder="0171 1234567"
                                            onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
                                    </div>
                                </div>
                            </div>

                            {/* Bike */}
                            <div className="space-y-3 pt-2 border-t border-border/50">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fahrrad-Informationen</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Fahrradtyp</Label>
                                        <Select value={form.bike_type} onValueChange={v => setForm(f => ({ ...f, bike_type: v }))}>
                                            <SelectTrigger className="text-sm">
                                                <SelectValue placeholder="Typ wählen" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BIKE_TYPES.map(t => (
                                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Farbe</Label>
                                        <Input value={form.bike_color} placeholder="z.B. Schwarz"
                                            onChange={e => setForm(f => ({ ...f, bike_color: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Marke</Label>
                                        <Input value={form.bike_brand} placeholder="z.B. Canyon"
                                            onChange={e => setForm(f => ({ ...f, bike_brand: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Modell</Label>
                                        <Input value={form.bike_model} placeholder="z.B. Neuron CF"
                                            onChange={e => setForm(f => ({ ...f, bike_model: e.target.value }))} />
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5 pt-2 border-t border-border/50">
                                <Label className="text-xs">Was soll gemacht werden?</Label>
                                <Textarea value={form.description} rows={3}
                                    placeholder="Beschreiben Sie kurz das Problem oder den gewünschten Service..."
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="flex justify-between pt-2">
                                <Button variant="ghost" onClick={() => { setStep('datetime'); setError(null) }}>
                                    <ArrowLeft className="mr-1 h-4 w-4" /> Zurück
                                </Button>
                                <Button onClick={handleSubmit} disabled={submitting || !form.customer_name.trim()}>
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                                    {config.auto_confirm ? 'Termin buchen' : 'Anfrage senden'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step: Success */}
                {step === 'success' && (
                    <Card>
                        <CardContent className="pt-8 pb-8 text-center space-y-4">
                            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-lg font-bold">
                                    {config.auto_confirm ? 'Termin bestätigt!' : 'Anfrage gesendet!'}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {config.auto_confirm
                                        ? 'Bringen Sie Ihr Rad zum vereinbarten Termin vorbei.'
                                        : 'Ihre Terminanfrage wurde gesendet. Die Werkstatt wird sich bei Ihnen melden.'
                                    }
                                </p>
                            </div>
                            <div className="bg-muted/40 rounded-lg px-4 py-3 text-left text-sm space-y-1.5">
                                <p><span className="text-muted-foreground">Service:</span> {selectedService?.label}</p>
                                <p><span className="text-muted-foreground">Abgabe:</span> {selectedDate ? format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: de }) : ''}, {selectedTime} Uhr</p>
                                <p><span className="text-muted-foreground">Name:</span> {form.customer_name}</p>
                                {(form.bike_brand || form.bike_model) && (
                                    <p><span className="text-muted-foreground">Fahrrad:</span> {[form.bike_brand, form.bike_model].filter(Boolean).join(' ')}</p>
                                )}
                            </div>
                            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 text-left">
                                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <span>Die Reparatur kann je nach Aufwand einige Tage dauern. Die Werkstatt informiert Sie, sobald Ihr Rad abholbereit ist.</span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <p className="text-center text-[11px] text-muted-foreground/50">
                    Powered by VeloFix
                </p>
            </div>
        </div>
    )
}
