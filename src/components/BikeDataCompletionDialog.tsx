import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Save } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"

interface BikeDataCompletionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    buildId: string
    onSuccess?: () => void
}

const FIELD_LABELS: Record<string, string> = {
    brand: "Marke",
    model: "Modell",
    color: "Farbe",
    frame_size: "Rahmengröße",
    internal_number: "Interne Nummer",
    serial_number: "Rahmennummer",
    battery_serial: "Akku-Nr.",
    notes: "Notizen",
    mechanic_name: "Mechaniker Name hinzufügen"
}

export function BikeDataCompletionDialog({ open, onOpenChange, buildId, onSuccess }: BikeDataCompletionDialogProps) {
    const { workshopId, user } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [configFields, setConfigFields] = useState<string[]>([])

    // Form State
    const [formData, setFormData] = useState<Record<string, any>>({})

    useEffect(() => {
        if (open && workshopId) {
            fetchConfigAndBuild()
        }
    }, [open, workshopId, buildId])

    const fetchConfigAndBuild = async () => {
        try {
            setLoading(true)

            // 1. Fetch Config
            const { data: config } = await supabase
                .from('neurad_configs')
                .select('config_value')
                .eq('workshop_id', workshopId)
                .eq('config_key', 'neurad_data_fields')
                .maybeSingle()

            const fields = config?.config_value || ['brand', 'model', 'serial_number']
            setConfigFields(fields)

            // 2. Fetch current build data
            const { data: build } = await supabase
                .from('bike_builds')
                .select('*')
                .eq('id', buildId)
                .single()

            if (build) {
                setFormData({
                    brand: build.brand === 'Neu' ? '' : build.brand,
                    model: build.model === 'Aufbau' ? '' : build.model,
                    color: build.color || '',
                    frame_size: build.frame_size || '',
                    internal_number: build.internal_number || '',
                    serial_number: build.serial_number || '',
                    battery_serial: build.battery_serial || '',
                    notes: build.notes || ''
                })
            }
        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }))
    }

    const handleComplete = async () => {
        // Validate required basic fields (brand/model) if they are in config
        if (configFields.includes('brand') && !formData.brand) {
            toast.error("Bitte Marke eingeben")
            return
        }
        if (configFields.includes('model') && !formData.model) {
            toast.error("Bitte Modell eingeben")
            return
        }

        try {
            setSaving(true)

            // Prepare update object
            const updates: any = {
                status: 'fertig',
                ...formData
            }

            // Auto-add mechanic name if configured
            if (configFields.includes('mechanic_name') && user?.user_metadata?.full_name) {
                // We might interpret this as appending to notes or a specific field?
                // For now let's assume we ensure assigned_employee_id is set, or append to notes
                // Actually simplicity: We usually track ID. 
                // Let's just append to notes: "Abgeschlossen von [Name]"
                const name = user.user_metadata.full_name
                const date = new Date().toLocaleDateString('de-DE')
                updates.notes = (updates.notes ? updates.notes + '\n' : '') + `Abgeschlossen durch: ${name} am ${date}`
            }

            const { error } = await supabase
                .from('bike_builds')
                .update(updates)
                .eq('id', buildId)

            if (error) throw error

            toast.success("Montage erfolgreich abgeschlossen!")
            onOpenChange(false)
            onSuccess?.()
            navigate("/dashboard/bike-builds")

        } catch (error: any) {
            console.error("Error completing build:", error)
            toast.error("Fehler beim Abschließen", { description: error.message })
        } finally {
            setSaving(false)
        }
    }

    const renderField = (key: string) => {
        if (key === 'mechanic_name') return null // Handled automatically

        const label = FIELD_LABELS[key] || key

        if (key === 'notes') {
            return (
                <div key={key} className="space-y-2 col-span-2">
                    <Label htmlFor={key}>{label}</Label>
                    <Textarea
                        id={key}
                        value={formData[key] || ''}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="bg-background/50"
                    />
                </div>
            )
        }

        return (
            <div key={key} className="space-y-2">
                <Label htmlFor={key}>{label}</Label>
                <Input
                    id={key}
                    value={formData[key] || ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="bg-background/50"
                />
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-glass-bg border-glass-border backdrop-blur-md">
                <DialogHeader>
                    <DialogTitle>Abschluss & Datenerfassung</DialogTitle>
                    <DialogDescription>
                        Die Montage ist beendet. Bitte erfassen Sie nun die finalen Daten des Rades.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="py-12 flex justify-center"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 py-4">
                        {configFields.map(field => renderField(field))}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
                    <Button onClick={handleComplete} disabled={saving || loading}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Speichern & Abschließen
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
