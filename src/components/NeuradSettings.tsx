import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
import { NeuradChecklistManager } from "./NeuradChecklistManager"

const FIELD_LABELS: Record<string, string> = {
    brand: "Marke",
    model: "Modell",
    color: "Farbe",
    frame_size: "Rahmengröße",
    internal_number: "Interne Nummer",
    serial_number: "Rahmennummer",
    battery_serial: "Akku-Nr.",
    notes: "Notizen",
    mechanic_name: "Mechaniker Name (Auto)"
}

/*
const COLUMN_LABELS: Record<string, string> = {
    internal_number: "Interne Nr.",
    brand_model: "Marke & Modell",
    customer_name: "Kunde",
    assigned_employee_id: "Mechaniker",
    status: "Status",
    created_at: "Erstelldatum"
}
*/

export function NeuradSettings() {
    const { workshopId } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Data Fields
    const [fields, setFields] = useState<string[]>([
        'brand', 'model', 'color', 'frame_size', 'internal_number'
    ])

    // Table Columns
    const [columns, setColumns] = useState<any[]>([
        { key: "internal_number", label: "Int. Nr.", visible: true },
        { key: "brand_model", label: "Modell", visible: true },
        { key: "customer_name", label: "Kunde", visible: true },
        { key: "assigned_employee_id", label: "Mechaniker", visible: true },
        { key: "status", label: "Status", visible: true },
        { key: "created_at", label: "Datum", visible: true },
        { key: "actions", label: "Aktion", visible: true }
    ])

    useEffect(() => {
        if (!workshopId) return
        fetchConfig()
    }, [workshopId])

    const fetchConfig = async () => {
        try {
            setLoading(true)

            // Fetch Fields
            const { data: fieldsData } = await supabase
                .from('neurad_configs')
                .select('config_value')
                .eq('workshop_id', workshopId)
                .eq('config_key', 'neurad_data_fields')
                .maybeSingle()

            if (fieldsData?.config_value) {
                setFields(fieldsData.config_value)
            }

            // Fetch Columns
            const { data: columnsData } = await supabase
                .from('neurad_configs')
                .select('config_value')
                .eq('workshop_id', workshopId)
                .eq('config_key', 'neurad_table_columns')
                .maybeSingle()

            if (columnsData?.config_value) {
                setColumns(columnsData.config_value)
            }
        } catch (error) {
            console.error("Error loading neurad settings:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            setSaving(true)

            // Save Fields
            await upsertConfig('neurad_data_fields', fields)

            // Save Columns
            await upsertConfig('neurad_table_columns', columns)

            toast.success("Einstellungen gespeichert")
        } catch (error) {
            toast.error("Fehler beim Speichern")
        } finally {
            setSaving(false)
        }
    }

    const upsertConfig = async (key: string, value: any) => {
        const { data: existing } = await supabase
            .from('neurad_configs')
            .select('id')
            .eq('workshop_id', workshopId)
            .eq('config_key', key)
            .maybeSingle()

        if (existing) {
            await supabase.from('neurad_configs').update({ config_value: value }).eq('id', existing.id)
        } else {
            await supabase.from('neurad_configs').insert({ workshop_id: workshopId, config_key: key, config_value: value })
        }
    }

    const toggleField = (key: string) => {
        setFields(prev => prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key])
    }

    const toggleColumn = (key: string) => {
        setColumns(prev => prev.map(col =>
            col.key === key ? { ...col, visible: !col.visible } : col
        ))
    }

    if (loading) return <div className="p-4"><Loader2 className="animate-spin" /></div>

    return (
        <div className="space-y-8">
            <NeuradChecklistManager />

            <Card className="bg-glass-bg border-glass-border">
                <CardHeader>
                    <CardTitle>Tabellen-Spalten</CardTitle>
                    <CardDescription>
                        Konfigurieren Sie, welche Spalten in der Neurad-Übersicht angezeigt werden.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        {columns.filter(c => c.key !== 'actions').map((col) => (
                            <div key={col.key} className="flex items-center space-x-2 border p-3 rounded-lg bg-card/50">
                                <Switch
                                    id={`col-${col.key}`}
                                    checked={col.visible}
                                    onCheckedChange={() => toggleColumn(col.key)}
                                />
                                <Label htmlFor={`col-${col.key}`} className="flex-1 cursor-pointer">{col.label}</Label>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Speichern
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-glass-bg border-glass-border">
                <CardHeader>
                    <CardTitle>Abschluss-Datenfelder</CardTitle>
                    <CardDescription>
                        Wählen Sie aus, welche Daten bei Abschluss eines Neurad-Aufbaus erfasst werden müssen.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        {Object.entries(FIELD_LABELS).map(([key, label]) => (
                            <div key={key} className="flex items-center space-x-2 border p-3 rounded-lg bg-card/50">
                                <Switch
                                    id={key}
                                    checked={fields.includes(key)}
                                    onCheckedChange={() => toggleField(key)}
                                />
                                <Label htmlFor={key} className="flex-1 cursor-pointer">{label}</Label>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Speichern
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
