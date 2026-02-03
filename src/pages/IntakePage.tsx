import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { publicSupabase as supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CheckCircle2, AlertCircle, Wrench, CreditCard, Bike, MountainSnow, Component } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function IntakePage() {
    const { workshopId } = useParams()
    const [workshopName, setWorkshopName] = useState<string>('')
    const [availableProviders, setAvailableProviders] = useState<string[]>([])

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form selection
    const [portalType, setPortalType] = useState<'standard' | 'leasing' | null>(null)

    // Form Data
    const [form, setForm] = useState({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        customer_address: '',
        description: '',
        // Bike Data
        bike_model: '',
        bike_type: '' as 'road' | 'mtb' | 'city' | 'ebike' | '',
        // Leasing specific
        leasing_provider: '',
        contract_id: '',
        service_package: '',
        inspection_code: '',
        pickup_code: '',
        private_email: ''
    })

    useEffect(() => {
        if (workshopId) {
            fetchWorkshopInfo()
        }
    }, [workshopId])

    const fetchWorkshopInfo = async () => {
        const { data, error } = await supabase
            .from('workshops')
            .select('name, leasing_providers')
            .eq('id', workshopId)
            .single()

        if (error) {
            console.error('Error fetching workshop:', error)
            setError('Werkstatt nicht gefunden.')
        } else {
            setWorkshopName(data.name)
            if (data.leasing_providers && Array.isArray(data.leasing_providers)) {
                setAvailableProviders(data.leasing_providers)
            }
        }
        setLoading(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!workshopId || !portalType) return

        // Validation based on type
        // Base Requirement: Name, Phone, Description, Bike Data
        if (!form.customer_name || !form.customer_phone || !form.description || !form.bike_model || !form.bike_type) {
            setError('Bitte füllen Sie alle Pflichtfelder aus (Name, Telefon, Fahrraddaten, Beschreibung).')
            return
        }

        if (portalType === 'leasing') {
            if (!form.customer_address || !form.customer_email || !form.leasing_provider || !form.contract_id) {
                setError('Bitte füllen Sie alle Pflichtfelder für das Leasing aus.')
                return
            }
        }

        setSubmitting(true)
        setError(null)

        const payload = {
            workshop_id: workshopId,
            intake_type: portalType,
            customer_name: form.customer_name,
            customer_phone: form.customer_phone,
            customer_address: form.customer_address || null,
            description: form.description,
            status: 'pending',
            bike_model: form.bike_model,
            bike_type: form.bike_type,
            // Conditional fields
            customer_email: portalType === 'leasing' ? form.customer_email : (form.customer_email || null), // Leasing email is portal email
            private_email: portalType === 'leasing' ? (form.private_email || null) : null,
            leasing_provider: portalType === 'leasing' ? form.leasing_provider : null,
            contract_id: portalType === 'leasing' ? form.contract_id : null,
            service_package: portalType === 'leasing' ? (form.service_package || null) : null,
            inspection_code: portalType === 'leasing' ? (form.inspection_code || null) : null,
            pickup_code: portalType === 'leasing' ? (form.pickup_code || null) : null,
        }

        const { error: submitError } = await supabase
            .from('intake_requests')
            .insert(payload)

        if (submitError) {
            console.error('Error submitting request:', submitError)
            setError('Fehler beim Senden der Anfrage. Bitte versuchen Sie es erneut.')
        } else {
            setSubmitted(true)
        }
        setSubmitting(false)
    }

    const BikeTypeCard = ({ type, label, icon: Icon }: { type: string, label: string, icon: any }) => (
        <div
            onClick={() => setForm({ ...form, bike_type: type as any })}
            className={cn(
                "cursor-pointer rounded-lg border-2 p-4 flex flex-col items-center gap-2 transition-all hover:bg-muted/50",
                form.bike_type === type ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
            )}
        >
            <Icon className={cn("h-8 w-8", form.bike_type === type ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("text-xs font-medium", form.bike_type === type ? "text-primary" : "text-muted-foreground")}>{label}</span>
        </div>
    )

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Lade...</div>
    }

    if (!workshopName && !loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
                <Card className="w-full max-w-md border-destructive/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            Fehler
                        </CardTitle>
                        <CardDescription>
                            Die angeforderte Werkstatt konnte nicht gefunden werden.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
                <Card className="w-full max-w-md border-green-500/50 bg-gradient-to-br from-green-500/5 to-transparent">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-green-500/10 p-3 rounded-full w-fit mb-4">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                        <CardTitle className="text-2xl">Vielen Dank!</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Ihre Anfrage wurde erfolgreich an <strong>{workshopName}</strong> übermittelt.
                            Wir werden uns umgehend um Ihr Anliegen kümmern.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center pb-8">
                        <Button variant="outline" onClick={() => window.location.reload()}>
                            Neue Anfrage stellen
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground py-8 px-4">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold">{workshopName}</h1>
                    <p className="text-muted-foreground">Service-Annahme</p>
                </div>

                {!portalType ? (
                    <Card className="border-border shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-center">Bitte wählen Sie:</CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-4">
                            <button
                                onClick={() => setPortalType("standard")}
                                className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all gap-4 text-center group"
                            >
                                <div className="h-16 w-16 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                                    <Wrench className="h-8 w-8 text-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <div>
                                    <div className="font-bold text-lg">Standard Reparatur</div>
                                    <div className="text-sm text-muted-foreground">Eigene Kosten, Inspektion</div>
                                </div>
                            </button>

                            <button
                                onClick={() => setPortalType("leasing")}
                                className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all gap-4 text-center group"
                            >
                                <div className="h-16 w-16 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                                    <CreditCard className="h-8 w-8 text-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <div>
                                    <div className="font-bold text-lg">Leasing Service</div>
                                    <div className="text-sm text-muted-foreground">JobRad, BusinessBike, etc.</div>
                                </div>
                            </button>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border-border shadow-lg">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>{portalType === 'standard' ? 'Standard Reparatur' : 'Leasing Service'}</CardTitle>
                                <Button variant="ghost" size="sm" onClick={() => setPortalType(null)}>Zurück</Button>
                            </div>
                            <CardDescription>
                                {portalType === 'standard'
                                    ? 'Bitte geben Sie Ihre Kontaktdaten ein.'
                                    : 'Bitte halten Sie Ihre Leasing-Vertragsdaten bereit.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-8">

                                {/* 1. Contact Section */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold border-b pb-2">Kontaktdaten</h3>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Vor- und Nachname *</Label>
                                            <Input
                                                id="name"
                                                required
                                                value={form.customer_name}
                                                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                                                placeholder="Max Mustermann"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Telefon-Nr. *</Label>
                                            <Input
                                                id="phone"
                                                required
                                                type="tel"
                                                value={form.customer_phone}
                                                onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                                                placeholder="+49 123 456789"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="address">Adresse {portalType === 'leasing' ? '*' : '(optional)'}</Label>
                                            <Input
                                                id="address"
                                                required={portalType === 'leasing'}
                                                value={form.customer_address}
                                                onChange={(e) => setForm({ ...form, customer_address: e.target.value })}
                                                placeholder="Straße, PLZ, Ort"
                                            />
                                        </div>

                                        {portalType === 'standard' && (
                                            <div className="space-y-2">
                                                <Label htmlFor="std_email">E-Mail (optional)</Label>
                                                <Input
                                                    id="std_email"
                                                    type="email"
                                                    value={form.customer_email}
                                                    onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                                                    placeholder="max@beispiel.de"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 2. Bike Data Section (New!) */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold border-b pb-2">Fahrraddaten</h3>

                                    <div className="space-y-3">
                                        <Label>Fahrrad-Typ *</Label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <BikeTypeCard type="ebike" label="E-Bike" icon={Component} />
                                            <BikeTypeCard type="road" label="Rennrad" icon={Bike} />
                                            <BikeTypeCard type="mtb" label="MTB" icon={MountainSnow} />
                                            <BikeTypeCard type="city" label="City/Trekking" icon={Bike} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="bike_model">Modell / Marke *</Label>
                                        <Input
                                            id="bike_model"
                                            required
                                            value={form.bike_model}
                                            onChange={(e) => setForm({ ...form, bike_model: e.target.value })}
                                            placeholder="z.B. Cube Stereo Hybrid"
                                        />
                                    </div>
                                </div>

                                {/* 3. Leasing Specifics */}
                                {portalType === 'leasing' && (
                                    <div className="space-y-4">
                                        <h3 className="font-semibold border-b pb-2">Leasing Details</h3>

                                        <div className="space-y-2">
                                            <Label htmlFor="provider">Leasing Anbieter *</Label>
                                            <Select
                                                value={form.leasing_provider}
                                                onValueChange={(val) => setForm({ ...form, leasing_provider: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Bitte wählen" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableProviders.map(p => (
                                                        <SelectItem key={p} value={p}>{p}</SelectItem>
                                                    ))}
                                                    <SelectItem value="other">Anderer</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email">E-Mail (im Leasing-Portal) *</Label>
                                            <Input
                                                id="email"
                                                required
                                                type="email"
                                                value={form.customer_email}
                                                onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                                                placeholder="max@firma.de"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="contract_id">Vertrags-Nummer / User-ID *</Label>
                                            <Input
                                                id="contract_id"
                                                required
                                                value={form.contract_id}
                                                onChange={(e) => setForm({ ...form, contract_id: e.target.value })}
                                                placeholder="z.B. V-123456"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="service_package">Gebuchtes Service/Verschleiß-Paket</Label>
                                            <Input
                                                id="service_package"
                                                value={form.service_package}
                                                onChange={(e) => setForm({ ...form, service_package: e.target.value })}
                                                placeholder="z.B. Premium Service"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="inspection_code">Inspektions-Code</Label>
                                                <Input
                                                    id="inspection_code"
                                                    value={form.inspection_code}
                                                    onChange={(e) => setForm({ ...form, inspection_code: e.target.value })}
                                                    placeholder="Optional"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="pickup_code">Abhol-Code</Label>
                                                <Input
                                                    id="pickup_code"
                                                    value={form.pickup_code}
                                                    onChange={(e) => setForm({ ...form, pickup_code: e.target.value })}
                                                    placeholder="Optional"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="private_email">Private E-Mail (für Rückfragen)</Label>
                                            <Input
                                                id="private_email"
                                                type="email"
                                                value={form.private_email}
                                                onChange={(e) => setForm({ ...form, private_email: e.target.value })}
                                                placeholder="Optional"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 4. Description */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold border-b pb-2">Auftrag</h3>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Beschreibung / Reparaturwunsch *</Label>
                                        <Textarea
                                            id="description"
                                            required
                                            className="min-h-[100px]"
                                            value={form.description}
                                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                                            placeholder="Was soll gemacht werden? (z.B. Reifen platt, Schaltung einstellen...)"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        {error}
                                    </div>
                                )}

                                <Button type="submit" className="w-full h-12 text-lg" disabled={submitting}>
                                    {submitting ? 'Wird gesendet...' : 'Kostenpflichtig beauftragen'}
                                </Button>
                                <p className="text-xs text-center text-muted-foreground">
                                    Mit dem Absenden stimmen Sie zu, dass wir Ihre Daten zur Bearbeitung Ihres Auftrags speichern.
                                </p>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
