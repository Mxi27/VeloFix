import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2, Plus, Zap } from "lucide-react"
import { toast } from "sonner"
import { mutate } from "swr"
import { useEmployee } from "@/contexts/EmployeeContext"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface CreateBikeBuildModalProps {
    children?: React.ReactNode
}

const EBIKE_SYSTEMS = ["Bosch", "Shimano EP8", "Shimano STEPS", "Yamaha", "Fazua", "Specialized SL", "Brose", "TQ", "Sonstiges"]

export function CreateBikeBuildModal({ children }: CreateBikeBuildModalProps) {
    const { workshopId, user } = useAuth()
    const { employees } = useEmployee()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [isEbike, setIsEbike] = useState(false)

    const [formData, setFormData] = useState({
        brand: "",
        model: "",
        color: "",
        frame_size: "",
        internal_number: "",
        battery_serial: "",
        ebike_system: "",
        key_number: "",
        notes: "",
        mechanicId: "",
    })

    const set = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }))

    const resetForm = () => {
        setFormData({
            brand: "",
            model: "",
            color: "",
            frame_size: "",
            internal_number: "",
            battery_serial: "",
            ebike_system: "",
            key_number: "",
            notes: "",
            mechanicId: "",
        })
        setIsEbike(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!workshopId) return
        setLoading(true)
        try {
            const { error } = await supabase.from("bike_builds").insert({
                workshop_id: workshopId,
                brand: formData.brand,
                model: formData.model,
                color: formData.color,
                frame_size: formData.frame_size,
                internal_number: formData.internal_number,
                is_ebike: isEbike,
                battery_serial: isEbike ? (formData.battery_serial || null) : null,
                ebike_system: isEbike ? (formData.ebike_system || null) : null,
                key_number: formData.key_number || null,
                notes: formData.notes || null,
                mechanic_name: user?.user_metadata?.full_name || "Unbekannt",
                assigned_employee_id: formData.mechanicId && formData.mechanicId !== 'none' ? formData.mechanicId : null,
            })
            if (error) throw error
            toast.success("Neuradaufbau erfolgreich angelegt")
            setOpen(false)
            resetForm()
            mutate(['bike_builds', workshopId])
        } catch (error) {
            console.error(error)
            toast.error("Fehler beim Anlegen")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
            <DialogTrigger asChild>
                {children || (
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Plus className="mr-2 h-4 w-4" />
                        Neuer Eintrag
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[460px] border-border/50 bg-background/95 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle>Neuradaufbau erfassen</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">

                    {/* Identifikation */}
                    <div className="grid grid-cols-2 gap-3">
                        <fieldset className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Interne Nr. *</Label>
                            <Input value={formData.internal_number} onChange={e => set('internal_number', e.target.value)} required placeholder="N-2024-001" className="bg-muted/40" />
                        </fieldset>
                        <fieldset className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Schlüssel-Nr.</Label>
                            <Input value={formData.key_number} onChange={e => set('key_number', e.target.value)} placeholder="z.B. 42A" className="bg-muted/40" />
                        </fieldset>
                    </div>

                    {/* Marke & Modell */}
                    <div className="grid grid-cols-2 gap-3">
                        <fieldset className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Marke *</Label>
                            <Input value={formData.brand} onChange={e => set('brand', e.target.value)} required placeholder="Cube" className="bg-muted/40" />
                        </fieldset>
                        <fieldset className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Modell *</Label>
                            <Input value={formData.model} onChange={e => set('model', e.target.value)} required placeholder="Kathmandu Hybrid" className="bg-muted/40" />
                        </fieldset>
                    </div>

                    {/* Farbe & Größe */}
                    <div className="grid grid-cols-2 gap-3">
                        <fieldset className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Farbe *</Label>
                            <Input value={formData.color} onChange={e => set('color', e.target.value)} required placeholder="Black 'n' Blue" className="bg-muted/40" />
                        </fieldset>
                        <fieldset className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Rahmengröße *</Label>
                            <Input value={formData.frame_size} onChange={e => set('frame_size', e.target.value)} required placeholder="54cm / L" className="bg-muted/40" />
                        </fieldset>
                    </div>

                    {/* E-Bike Section */}
                    <div className={cn(
                        "rounded-lg border p-3 space-y-3 transition-colors",
                        isEbike ? "border-amber-500/30 bg-amber-500/5" : "border-border/40 bg-muted/20"
                    )}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Zap className={cn("h-4 w-4 transition-colors", isEbike ? "text-amber-500" : "text-muted-foreground/40")} />
                                <Label className="text-sm font-medium cursor-pointer" onClick={() => setIsEbike(!isEbike)}>
                                    E-Bike
                                </Label>
                            </div>
                            <Switch checked={isEbike} onCheckedChange={setIsEbike} />
                        </div>
                        {isEbike && (
                            <div className="grid grid-cols-2 gap-3">
                                <fieldset className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Antriebssystem</Label>
                                    <Select value={formData.ebike_system} onValueChange={v => set('ebike_system', v)}>
                                        <SelectTrigger className="bg-background/60">
                                            <SelectValue placeholder="System wählen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EBIKE_SYSTEMS.map(s => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </fieldset>
                                <fieldset className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Akku-Nummer</Label>
                                    <Input value={formData.battery_serial} onChange={e => set('battery_serial', e.target.value)} placeholder="Seriennummer" className="bg-background/60" />
                                </fieldset>
                            </div>
                        )}
                    </div>

                    {/* Notizen */}
                    <fieldset className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Notizen</Label>
                        <Textarea value={formData.notes} onChange={e => set('notes', e.target.value)} placeholder="Besondere Hinweise, Anmerkungen..." className="bg-muted/40 resize-none h-20" />
                    </fieldset>

                    {/* Mechaniker */}
                    <fieldset className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Mechaniker (Aufbau)</Label>
                        <Select value={formData.mechanicId} onValueChange={v => set('mechanicId', v)}>
                            <SelectTrigger className="bg-muted/40">
                                <SelectValue placeholder="Mitarbeiter auswählen" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Keine Zuweisung</SelectItem>
                                {employees.map(emp => (
                                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </fieldset>

                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Neurad anlegen
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
