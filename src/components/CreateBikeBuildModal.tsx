import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { mutate } from "swr"

import { useEmployee } from "@/contexts/EmployeeContext"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CreateBikeBuildModalProps {
    children?: React.ReactNode
}

export function CreateBikeBuildModal({ children }: CreateBikeBuildModalProps) {
    const { workshopId, user } = useAuth()
    const { employees } = useEmployee()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        brand: "",
        model: "",
        color: "",
        frame_size: "",
        internal_number: "",
        battery_serial: "",
        notes: "",
        mechanicId: "",
    })

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
                battery_serial: formData.battery_serial || null,
                notes: formData.notes || null,
                mechanic_name: user?.user_metadata?.full_name || "Unbekannt", // Legacy fallback
                assigned_employee_id: formData.mechanicId && formData.mechanicId !== 'none' ? formData.mechanicId : null
            })

            if (error) throw error

            toast.success("Neuradaufbau erfolgreich angelegt")
            setOpen(false)
            setFormData({
                brand: "",
                model: "",
                color: "",
                frame_size: "",
                internal_number: "",
                battery_serial: "",
                notes: "",
                mechanicId: "",
            })
            // Trigger refresh of the table
            mutate(['bike_builds', workshopId])
        } catch (error) {
            console.error(error)
            toast.error("Fehler beim Anlegen")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all duration-300 hover:shadow-[0_0_25px_rgba(6,182,212,0.6)]">
                        <Plus className="mr-2 h-4 w-4" />
                        Neuer Eintrag
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] border-border/50 bg-background/95 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle>Neuradaufbau erfassen</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="internal_number">Interne Nr. *</Label>
                            <Input
                                id="internal_number"
                                value={formData.internal_number}
                                onChange={(e) => setFormData({ ...formData, internal_number: e.target.value })}
                                required
                                placeholder="z.B. N-2024-001"
                                className="bg-muted/50"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="brand">Marke *</Label>
                            <Input
                                id="brand"
                                value={formData.brand}
                                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                required
                                placeholder="z.B. Cube"
                                className="bg-muted/50"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="model">Modell *</Label>
                        <Input
                            id="model"
                            value={formData.model}
                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                            required
                            placeholder="z.B. Kathmandu Hybrid"
                            className="bg-muted/50"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="color">Farbe *</Label>
                            <Input
                                id="color"
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                required
                                placeholder="z.B. Black 'n' Blue"
                                className="bg-muted/50"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="frame_size">Rahmenhöhe *</Label>
                            <Input
                                id="frame_size"
                                value={formData.frame_size}
                                onChange={(e) => setFormData({ ...formData, frame_size: e.target.value })}
                                required
                                placeholder="z.B. 54cm / L"
                                className="bg-muted/50"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="battery_serial">Akku Nummer</Label>
                        <Input
                            id="battery_serial"
                            value={formData.battery_serial}
                            onChange={(e) => setFormData({ ...formData, battery_serial: e.target.value })}
                            placeholder="Optional"
                            className="bg-muted/50"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="notes">Notizen</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Optionale Anmerkungen..."
                            className="bg-muted/50 resize-none h-20"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="mechanic">Mechaniker (Aufbau)</Label>
                        <Select
                            value={formData.mechanicId}
                            onValueChange={(val) => setFormData({ ...formData, mechanicId: val })}
                        >
                            <SelectTrigger className="bg-muted/50">
                                <SelectValue placeholder="Mitarbeiter auswählen" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Keine Zuweisung</SelectItem>
                                {employees.map((emp) => (
                                    <SelectItem key={emp.id} value={emp.id}>
                                        {emp.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Speichern
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
