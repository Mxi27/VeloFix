import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Loader2, Plus, Trash2, Copy, ExternalLink } from 'lucide-react'
import type { AppointmentConfig, BusinessHoursDay, ServiceTypeDef } from '@/types'
import { DEFAULT_APPOINTMENT_CONFIG } from '@/types'

const DAY_LABELS: { key: keyof AppointmentConfig['business_hours']; label: string }[] = [
    { key: 'mon', label: 'Montag' },
    { key: 'tue', label: 'Dienstag' },
    { key: 'wed', label: 'Mittwoch' },
    { key: 'thu', label: 'Donnerstag' },
    { key: 'fri', label: 'Freitag' },
    { key: 'sat', label: 'Samstag' },
    { key: 'sun', label: 'Sonntag' },
]

export function AppointmentSettings() {
    const { workshopId } = useAuth()
    const [config, setConfig] = useState<AppointmentConfig>(DEFAULT_APPOINTMENT_CONFIG)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!workshopId) return
        loadConfig()
    }, [workshopId])

    const loadConfig = async () => {
        try {
            const { data, error } = await supabase
                .from('workshops')
                .select('appointment_config')
                .eq('id', workshopId!)
                .single()
            if (error) throw error
            if (data?.appointment_config && typeof data.appointment_config === 'object') {
                setConfig({ ...DEFAULT_APPOINTMENT_CONFIG, ...(data.appointment_config as Partial<AppointmentConfig>) })
            }
        } catch (err) {
            console.error('Failed to load appointment config:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!workshopId) return
        setSaving(true)
        try {
            const { error } = await supabase
                .from('workshops')
                .update({ appointment_config: config as unknown as Record<string, unknown> })
                .eq('id', workshopId)
            if (error) throw error
            toast.success('Termineinstellungen gespeichert')
        } catch (err: unknown) {
            toast.error('Fehler beim Speichern', { description: err instanceof Error ? err.message : '' })
        } finally {
            setSaving(false)
        }
    }

    const updateDay = (day: keyof AppointmentConfig['business_hours'], field: keyof BusinessHoursDay, value: string) => {
        setConfig(prev => ({
            ...prev,
            business_hours: {
                ...prev.business_hours,
                [day]: { ...(prev.business_hours[day] || { open: '08:00', close: '17:00' }), [field]: value },
            },
        }))
    }

    const toggleDay = (day: keyof AppointmentConfig['business_hours'], enabled: boolean) => {
        setConfig(prev => ({
            ...prev,
            business_hours: {
                ...prev.business_hours,
                [day]: enabled ? { open: '08:00', close: '17:00' } : null,
            },
        }))
    }

    const addServiceType = () => {
        setConfig(prev => ({
            ...prev,
            service_types: [...prev.service_types, { id: `custom_${Date.now()}`, label: '', duration: 30 }],
        }))
    }

    const removeServiceType = (index: number) => {
        setConfig(prev => ({
            ...prev,
            service_types: prev.service_types.filter((_, i) => i !== index),
        }))
    }

    const updateServiceType = (index: number, field: keyof ServiceTypeDef, value: string | number) => {
        setConfig(prev => ({
            ...prev,
            service_types: prev.service_types.map((st, i) => i === index ? { ...st, [field]: value } : st),
        }))
    }

    const bookingUrl = workshopId ? `${window.location.origin}/booking/${workshopId}` : ''

    const copyLink = () => {
        navigator.clipboard.writeText(bookingUrl)
        toast.success('Link kopiert')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Booking Link */}
            <Card>
                <CardHeader>
                    <CardTitle>Buchungslink</CardTitle>
                    <CardDescription>
                        Teile diesen Link mit Kunden, damit sie online Termine anfragen können.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2">
                        <Input value={bookingUrl} readOnly className="text-xs font-mono bg-muted" />
                        <Button variant="outline" size="icon" onClick={copyLink} title="Link kopieren">
                            <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" asChild title="Öffnen">
                            <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* General Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>Allgemein</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Automatisch bestätigen</p>
                            <p className="text-xs text-muted-foreground">Termine werden ohne manuelle Prüfung sofort bestätigt.</p>
                        </div>
                        <Switch checked={config.auto_confirm} onCheckedChange={v => setConfig(p => ({ ...p, auto_confirm: v }))} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Slot-Dauer (Minuten)</Label>
                            <Input type="number" min={10} max={180} value={config.slot_duration_minutes}
                                onChange={e => setConfig(p => ({ ...p, slot_duration_minutes: +e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Max. Termine / Tag</Label>
                            <Input type="number" min={1} max={50} value={config.max_per_day}
                                onChange={e => setConfig(p => ({ ...p, max_per_day: +e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Min. Vorlaufzeit (Tage)</Label>
                            <Input type="number" min={0} max={14} value={config.min_lead_days}
                                onChange={e => setConfig(p => ({ ...p, min_lead_days: +e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Max. Vorlaufzeit (Tage)</Label>
                            <Input type="number" min={1} max={90} value={config.max_lead_days}
                                onChange={e => setConfig(p => ({ ...p, max_lead_days: +e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Max. pro Zeitslot</Label>
                            <Input type="number" min={1} max={10} value={config.max_per_slot}
                                onChange={e => setConfig(p => ({ ...p, max_per_slot: +e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Stornierungsfrist (Stunden)</Label>
                            <Input type="number" min={0} max={72} value={config.cancellation_hours}
                                onChange={e => setConfig(p => ({ ...p, cancellation_hours: +e.target.value }))} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Business Hours */}
            <Card>
                <CardHeader>
                    <CardTitle>Öffnungszeiten</CardTitle>
                    <CardDescription>Definiere, an welchen Tagen und zu welchen Zeiten Termine verfügbar sind.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {DAY_LABELS.map(({ key, label }) => {
                        const hours = config.business_hours[key]
                        const enabled = hours !== null
                        return (
                            <div key={key} className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                                enabled ? "bg-accent/30" : "opacity-50"
                            )}>
                                <Switch checked={enabled} onCheckedChange={v => toggleDay(key, v)} />
                                <span className="text-sm font-medium w-24">{label}</span>
                                {enabled ? (
                                    <div className="flex items-center gap-2">
                                        <Input type="time" value={hours!.open} className="w-28 text-xs"
                                            onChange={e => updateDay(key, 'open', e.target.value)} />
                                        <span className="text-xs text-muted-foreground">bis</span>
                                        <Input type="time" value={hours!.close} className="w-28 text-xs"
                                            onChange={e => updateDay(key, 'close', e.target.value)} />
                                    </div>
                                ) : (
                                    <span className="text-xs text-muted-foreground">Geschlossen</span>
                                )}
                            </div>
                        )
                    })}
                </CardContent>
            </Card>

            {/* Service Types */}
            <Card>
                <CardHeader>
                    <CardTitle>Service-Typen</CardTitle>
                    <CardDescription>Kunden wählen beim Buchen einen Service-Typ aus.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {config.service_types.map((st, i) => (
                        <div key={st.id} className="flex items-center gap-2 bg-accent/20 rounded-lg px-3 py-2">
                            <Input value={st.label} placeholder="Bezeichnung"
                                className="flex-1 text-sm"
                                onChange={e => updateServiceType(i, 'label', e.target.value)} />
                            <div className="flex items-center gap-1">
                                <Input type="number" min={5} max={240} value={st.duration}
                                    className="w-20 text-xs text-center"
                                    onChange={e => updateServiceType(i, 'duration', +e.target.value)} />
                                <span className="text-xs text-muted-foreground">Min</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => removeServiceType(i)}>
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addServiceType} className="w-full mt-2">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Service-Typ hinzufügen
                    </Button>
                </CardContent>
            </Card>

            {/* Save */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Speichert...' : 'Einstellungen speichern'}
                </Button>
            </div>
        </div>
    )
}
