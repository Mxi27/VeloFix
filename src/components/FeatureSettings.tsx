import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useFeatures } from '@/contexts/FeaturesContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { FeatureKey, FeaturesConfig, WorkshopPlan } from '@/types'
import { PLAN_FEATURES } from '@/types'
import {
    LayoutDashboard,
    CheckSquare,
    BookOpen,
    Wrench,
    ShieldCheck,
    Star,
    ClipboardList,
    Bike,
    CreditCard,
    Package,
    Check,
    CalendarClock,
} from 'lucide-react'

interface FeatureDef {
    key: FeatureKey
    label: string
    description: string
    icon: React.ElementType
    category: 'standard' | 'pro'
}

const FEATURE_DEFS: FeatureDef[] = [
    {
        key: 'cockpit',
        label: 'Mein Cockpit',
        description: 'Übersichts-Dashboard mit Auslastung, Dringlichkeit und Statistiken.',
        icon: LayoutDashboard,
        category: 'standard',
    },
    {
        key: 'tasks',
        label: 'Aufgaben',
        description: 'Werkstattweites Task-Management mit Prioritäten und Fälligkeiten.',
        icon: CheckSquare,
        category: 'standard',
    },
    {
        key: 'notebook',
        label: 'Notizbuch',
        description: 'Internes Wiki und Notiz-System mit Ordnerstruktur und Rich-Text.',
        icon: BookOpen,
        category: 'standard',
    },
    {
        key: 'service_mode',
        label: 'Service-Modus',
        description: 'Interaktiver Arbeits-Modus für Mechaniker – Checklisten, Preise, Notizen.',
        icon: Wrench,
        category: 'standard',
    },
    {
        key: 'control_mode',
        label: 'Kontroll-Modus',
        description: 'Qualitätskontroll-Workflow nach Reparatur mit Self-Control-Schutz.',
        icon: ShieldCheck,
        category: 'standard',
    },
    {
        key: 'feedback',
        label: 'Kundenfeedback',
        description: 'Feedback-Portal für Kunden und Analyse-Dashboard mit Bewertungstrends.',
        icon: Star,
        category: 'standard',
    },
    {
        key: 'intake_portal',
        label: 'Intake-Portal',
        description: 'Öffentliches Aufnahme-Formular per QR-Code für Kunden.',
        icon: ClipboardList,
        category: 'standard',
    },
    {
        key: 'appointments',
        label: 'Terminbuchung',
        description: 'Online-Terminbuchung für Kunden mit Anfrage-Inbox und Kalenderansicht.',
        icon: CalendarClock,
        category: 'standard',
    },
    {
        key: 'customer_orders',
        label: 'Kundenbestellungen',
        description: 'Verwaltung von Ersatzteilen und Bestellungen für Kunden inkl. Benachrichtigung.',
        icon: Package,
        category: 'standard',
    },
    {
        key: 'bike_builds',
        label: 'Neuradaufbau',
        description: 'E-Bike Montage-Management mit Assembly-Tracking und Qualitätskontrolle.',
        icon: Bike,
        category: 'pro',
    },
    {
        key: 'leasing',
        label: 'Leasing-Modul',
        description: 'Leasing-Aufträge, Abrechnung und Provider-Integration.',
        icon: CreditCard,
        category: 'pro',
    },
]

const PLANS: { id: WorkshopPlan; label: string; description: string; color: string }[] = [
    {
        id: 'starter',
        label: 'Starter',
        description: 'Grundfunktionen für kleine Werkstätten.',
        color: 'text-muted-foreground',
    },
    {
        id: 'standard',
        label: 'Standard',
        description: 'Alle wichtigen Features für etablierte Betriebe.',
        color: 'text-primary',
    },
    {
        id: 'pro',
        label: 'Pro',
        description: 'Vollausstattung inkl. Neurad & Leasing.',
        color: 'text-amber-500',
    },
]

export function FeatureSettings() {
    const { workshopId } = useAuth()
    const { featuresConfig, reload } = useFeatures()
    const [localConfig, setLocalConfig] = useState<FeaturesConfig>({ ...featuresConfig })
    const [saving, setSaving] = useState(false)

    const isFeatureEnabled = (key: FeatureKey): boolean => {
        const val = localConfig[key]
        return val === undefined ? true : val
    }

    const handleToggle = (key: FeatureKey, enabled: boolean) => {
        setLocalConfig(prev => ({ ...prev, [key]: enabled }))
    }

    const applyPlan = (plan: WorkshopPlan) => {
        setLocalConfig({ ...PLAN_FEATURES[plan] })
        toast.info(`Paket "${PLANS.find(p => p.id === plan)?.label}" ausgewählt – bitte speichern.`)
    }

    const handleSave = async () => {
        if (!workshopId) return
        setSaving(true)
        try {
            const { error } = await supabase
                .from('workshops')
                .update({ features_config: localConfig })
                .eq('id', workshopId)

            if (error) throw error

            await reload()
            toast.success('Features gespeichert')
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
            toast.error('Fehler beim Speichern', { description: message })
        } finally {
            setSaving(false)
        }
    }

    const standardFeatures = FEATURE_DEFS.filter(f => f.category === 'standard')
    const proFeatures = FEATURE_DEFS.filter(f => f.category === 'pro')

    return (
        <div className="space-y-6">
            {/* Plan Quick-Select */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Paket-Vorauswahl
                    </CardTitle>
                    <CardDescription>
                        Wähle ein Paket, um Features automatisch vorzubelegen. Danach kannst du einzelne Features noch manuell anpassen.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid sm:grid-cols-3 gap-3">
                        {PLANS.map(plan => (
                            <button
                                key={plan.id}
                                onClick={() => applyPlan(plan.id)}
                                className={cn(
                                    "text-left p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/40 transition-colors cursor-pointer",
                                )}
                            >
                                <p className={cn("text-sm font-semibold mb-1", plan.color)}>{plan.label}</p>
                                <p className="text-xs text-muted-foreground">{plan.description}</p>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Standard Features */}
            <Card>
                <CardHeader>
                    <CardTitle>Standard-Features</CardTitle>
                    <CardDescription>
                        Diese Features können für jede Werkstatt individuell aktiviert oder deaktiviert werden.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                    {standardFeatures.map(feature => {
                        const Icon = feature.icon
                        const enabled = isFeatureEnabled(feature.key)
                        return (
                            <div
                                key={feature.key}
                                className={cn(
                                    "flex items-start gap-3 px-3 py-3 rounded-lg transition-colors",
                                    enabled ? "bg-accent/30" : "opacity-60"
                                )}
                            >
                                <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-tight">{feature.label}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
                                </div>
                                <Switch
                                    checked={enabled}
                                    onCheckedChange={(val) => handleToggle(feature.key, val)}
                                />
                            </div>
                        )
                    })}
                </CardContent>
            </Card>

            {/* Pro Features */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span>Pro-Features</span>
                        <span className="text-xs font-normal text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Pro</span>
                    </CardTitle>
                    <CardDescription>
                        Spezialisierte Features für Fahrradhändler und größere Betriebe.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                    {proFeatures.map(feature => {
                        const Icon = feature.icon
                        const enabled = isFeatureEnabled(feature.key)
                        return (
                            <div
                                key={feature.key}
                                className={cn(
                                    "flex items-start gap-3 px-3 py-3 rounded-lg transition-colors",
                                    enabled ? "bg-accent/30" : "opacity-60"
                                )}
                            >
                                <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-tight">{feature.label}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
                                </div>
                                <Switch
                                    checked={enabled}
                                    onCheckedChange={(val) => handleToggle(feature.key, val)}
                                />
                            </div>
                        )
                    })}
                </CardContent>
            </Card>

            {/* Info note */}
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5">
                <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                <span>
                    Deaktivieren versteckt das Feature nur in der Oberfläche – bestehende Daten bleiben erhalten und können jederzeit wieder aktiviert werden.
                </span>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Speichert...' : 'Änderungen speichern'}
                </Button>
            </div>
        </div>
    )
}
