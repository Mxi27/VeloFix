import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface WorkshopSettingsProps {
    workshopId: string
    onSaveSuccess?: () => void
}

export function WorkshopSettings({ workshopId, onSaveSuccess }: WorkshopSettingsProps) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postal_code: '',
        website: '',
        opening_hours: '',
        bank_name: '',
        iban: '',
        bic: '',
        tax_id: '',
        ust_id: '',
        footer_text: '',
        terms_text: ''
    })

    useEffect(() => {
        if (workshopId) {
            fetchWorkshop()
        }
    }, [workshopId])

    const fetchWorkshop = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('workshops')
            .select('*')
            .eq('id', workshopId)
            .single()

        if (error) {
            console.error('Error fetching workshop:', error)
            toast.error('Fehler beim Laden der Werkstatt-Daten')
        } else if (data) {
            setForm({
                name: data.name || '',
                email: data.email || '',
                phone: data.phone || '',
                address: data.address || '',
                city: data.city || '',
                postal_code: data.postal_code || '',
                website: (data as any).website || '',
                opening_hours: (data as any).opening_hours || '',
                bank_name: data.bank_name || '',
                iban: data.iban || '',
                bic: data.bic || '',
                tax_id: data.tax_id || '',
                ust_id: data.ust_id || '',
                footer_text: data.footer_text || '',
                terms_text: data.terms_text || ''
            })
        }
        setLoading(false)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const { error } = await supabase
            .from('workshops')
            .update({
                name: form.name,
                email: form.email,
                phone: form.phone,
                address: form.address,
                city: form.city,
                postal_code: form.postal_code,
                bank_name: form.bank_name,
                iban: form.iban,
                bic: form.bic,
                tax_id: form.tax_id,
                ust_id: form.ust_id,
                footer_text: form.footer_text,
                terms_text: form.terms_text,
                updated_at: new Date().toISOString()
            })
            .eq('id', workshopId)

        if (error) {
            console.error('Error updating workshop:', error)
            toast.error('Fehler beim Speichern', { description: error.message })
        } else {
            toast.success('Werkstatt-Daten gespeichert')
            if (onSaveSuccess) onSaveSuccess()
        }
        setSaving(false)
    }

    if (loading) {
        return <div className="space-y-4 animate-pulse">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
        </div>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Werkstatt-Details</CardTitle>
                <CardDescription>
                    Verwalten Sie Ihre Werkstatt-Informationen
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="workshop-name">Werkstatt-Name</Label>
                        <Input
                            id="workshop-name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="workshop-email">E-Mail</Label>
                            <Input
                                id="workshop-email"
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="workshop-phone">Telefon</Label>
                            <Input
                                id="workshop-phone"
                                type="tel"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="workshop-address">Adresse</Label>
                        <Input
                            id="workshop-address"
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="workshop-city">Stadt</Label>
                            <Input
                                id="workshop-city"
                                value={form.city}
                                onChange={(e) => setForm({ ...form, city: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="workshop-postal">PLZ</Label>
                            <Input
                                id="workshop-postal"
                                value={form.postal_code}
                                onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="border-t pt-6 mt-6">
                        <h3 className="text-lg font-medium mb-4">Bankverbindung & Rechtliches</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-2">
                                <Label htmlFor="workshop-bank">Bankname</Label>
                                <Input
                                    id="workshop-bank"
                                    value={form.bank_name}
                                    onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                                    placeholder="z.B. Sparkasse"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="workshop-iban">IBAN</Label>
                                <Input
                                    id="workshop-iban"
                                    value={form.iban}
                                    onChange={(e) => setForm({ ...form, iban: e.target.value })}
                                    placeholder="DE..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="workshop-bic">BIC</Label>
                                <Input
                                    id="workshop-bic"
                                    value={form.bic}
                                    onChange={(e) => setForm({ ...form, bic: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="workshop-tax">Steuernummer</Label>
                                <Input
                                    id="workshop-tax"
                                    value={form.tax_id}
                                    onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="workshop-ust">USt-IdNr.</Label>
                                <Input
                                    id="workshop-ust"
                                    value={form.ust_id}
                                    onChange={(e) => setForm({ ...form, ust_id: e.target.value })}
                                    placeholder="DE..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-6 mt-6">
                        <h3 className="text-lg font-medium mb-4">Öffnungszeiten</h3>
                        <div className="space-y-2">
                            <Label htmlFor="workshop-hours">Öffnungszeiten</Label>
                            <Textarea
                                id="workshop-hours"
                                value={form.opening_hours}
                                onChange={(e) => setForm({ ...form, opening_hours: e.target.value })}
                                placeholder={"Mo–Fr: 09:00 – 18:00\nSa: 09:00 – 13:00\nSo: Geschlossen"}
                                className="min-h-[100px]"
                            />
                            <p className="text-xs text-muted-foreground">Wird auf Dokumenten und im Selbst-Check-In angezeigt.</p>
                        </div>
                    </div>

                    <div className="border-t pt-6 mt-6">
                        <h3 className="text-lg font-medium mb-4">Dokumente</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="workshop-footer">Fußzeile (für Rechnungen/Aufträge)</Label>
                                <Input
                                    id="workshop-footer"
                                    value={form.footer_text}
                                    onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
                                    placeholder="z.B. Geschäftsführer: Max Mustermann • Amtsgericht Musterstadt"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="workshop-terms">Zahlungsbedingungen / AGB Kurztext</Label>
                                <Textarea
                                    id="workshop-terms"
                                    value={form.terms_text}
                                    onChange={(e) => setForm({ ...form, terms_text: e.target.value })}
                                    placeholder="z.B. Zahlbar sofort ohne Abzug. Es gelten unsere allgemeinen Geschäftsbedingungen."
                                    className="min-h-[80px]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Speichert...' : 'Änderungen speichern'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
