import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"

interface StartAssemblyDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function StartAssemblyDialog({ open, onOpenChange, onSuccess }: StartAssemblyDialogProps) {
    const { workshopId } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [templates, setTemplates] = useState<string[]>([])
    const [selectedTemplate, setSelectedTemplate] = useState<string>("Standard")
    const [internalNumber, setInternalNumber] = useState("")

    useEffect(() => {
        if (open && workshopId) {
            fetchTemplates()
        }
    }, [open, workshopId])

    const fetchTemplates = async () => {
        try {
            // Get unique template names
            const { data, error } = await supabase
                .from('neurad_steps')
                .select('template_name')
                .eq('workshop_id', workshopId)

            if (error) throw error

            // Extract unique names
            const unique = Array.from(new Set(data.map(d => d.template_name || 'Standard')))
            setTemplates(unique)
            if (unique.length > 0) setSelectedTemplate(unique[0])

        } catch (error) {
            console.error("Error fetching templates:", error)
            setTemplates(['Standard'])
        }
    }

    const handleStart = async () => {
        if (!internalNumber.trim()) {
            toast.error("Bitte interne Nummer eingeben")
            return
        }

        try {
            setLoading(true)

            const { data, error } = await supabase
                .from('bike_builds')
                .insert({
                    workshop_id: workshopId,
                    internal_number: internalNumber,
                    checklist_template: selectedTemplate,
                    status: 'active',
                    // Initial empty data
                    brand: 'Neu',
                    model: 'Aufbau',
                    color: '—',
                    frame_size: '—',
                    assembly_progress: {
                        completed_steps: [],
                        start_time: new Date().toISOString()
                    }
                })
                .select()
                .single()

            if (error) throw error

            toast.success("Aufbau gestartet")
            onOpenChange(false)
            onSuccess?.()

            // Navigate to detail
            navigate(`/dashboard/bike-builds/${data.id}`)

        } catch (error: any) {
            console.error("Error creating build:", error)
            toast.error("Fehler beim Starten", { description: error.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-glass-bg border-glass-border backdrop-blur-md">
                <DialogHeader>
                    <DialogTitle>Neuen Aufbau starten</DialogTitle>
                    <DialogDescription>
                        Wählen Sie eine Checkliste und starten Sie den Assistenten.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="internal-number">Interne Nummer / ID</Label>
                        <Input
                            id="internal-number"
                            placeholder="z.B. N-2024-001"
                            value={internalNumber}
                            onChange={(e) => setInternalNumber(e.target.value)}
                            className="bg-background/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Checklisten-Vorlage</Label>
                        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                            <SelectTrigger className="bg-background/50">
                                <SelectValue placeholder="Vorlage wählen" />
                            </SelectTrigger>
                            <SelectContent>
                                {templates.map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
                    <Button onClick={handleStart} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Starten
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
