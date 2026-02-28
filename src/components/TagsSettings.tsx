import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toastSuccess, toastError } from "@/lib/toast-utils"
import { Trash2, Edit2, Check } from "lucide-react"

interface WorkshopTag {
    id: string
    name: string
    color: string
}

const PRESET_COLORS = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#64748b'  // Slate
]

export function TagsSettings() {
    const { workshopId } = useAuth()
    const [tags, setTags] = useState<WorkshopTag[]>([])
    const [loading, setLoading] = useState(true)

    // Create / Edit state
    const [isEditing, setIsEditing] = useState<string | null>(null)
    const [tagName, setTagName] = useState("")
    const [tagColor, setTagColor] = useState(PRESET_COLORS[0])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (workshopId) fetchTags()
    }, [workshopId])

    const fetchTags = async () => {
        if (!workshopId) return
        setLoading(true)
        const { data, error } = await supabase
            .from('workshop_tags')
            .select('*')
            .eq('workshop_id', workshopId)
            .order('name')

        if (!error && data) {
            setTags(data)
        }
        setLoading(false)
    }

    const resetForm = () => {
        setIsEditing(null)
        setTagName("")
        setTagColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)])
    }

    const handleEdit = (tag: WorkshopTag) => {
        setIsEditing(tag.id)
        setTagName(tag.name)
        setTagColor(tag.color)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!workshopId || !tagName.trim()) return

        setSaving(true)
        try {
            if (isEditing) {
                const { error } = await supabase
                    .from('workshop_tags')
                    .update({ name: tagName.trim(), color: tagColor })
                    .eq('id', isEditing)
                    .eq('workshop_id', workshopId)

                if (error) throw error
                toastSuccess("Tag aktualisiert", "Der Tag wurde erfolgreich gespeichert.")
            } else {
                const { error } = await supabase
                    .from('workshop_tags')
                    .insert({
                        workshop_id: workshopId,
                        name: tagName.trim(),
                        color: tagColor
                    })

                if (error) throw error
                toastSuccess("Tag erstellt", "Der neue Tag wurde hinzugefügt.")
            }

            fetchTags()
            resetForm()
        } catch (error: any) {
            toastError("Fehler", error.message || "Tag konnte nicht gespeichert werden.")
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Möchten Sie diesen Tag wirklich löschen?")) return

        try {
            const { error } = await supabase
                .from('workshop_tags')
                .delete()
                .eq('id', id)

            if (error) throw error
            toastSuccess("Tag gelöscht", "Der Tag wurde erfolgreich entfernt.")
            fetchTags()
        } catch (error: any) {
            toastError("Fehler", "Tag konnte nicht gelöscht werden.")
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Auftrags-Tags</CardTitle>
                    <CardDescription>
                        Erstellen Sie benutzerdefinierte farbige Tags, um Aufträge besser zu kategorisieren (z.B. "Eilt", "Wartet auf Kunde", "Kulant").
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* Form for new/edit */}
                    <form onSubmit={handleSave} className="p-4 border rounded-xl bg-card/50 space-y-4">
                        <h4 className="font-medium">{isEditing ? "Tag bearbeiten" : "Neuen Tag erstellen"}</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="tag-name">Name</Label>
                                <Input
                                    id="tag-name"
                                    value={tagName}
                                    onChange={(e) => setTagName(e.target.value)}
                                    placeholder="z.B. Eilt"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Farbe</Label>
                                <div className="flex flex-wrap gap-2">
                                    {PRESET_COLORS.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setTagColor(color)}
                                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${tagColor === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'}`}
                                            style={{ backgroundColor: color }}
                                        >
                                            {tagColor === color && <Check className="w-4 h-4 text-white" />}
                                        </button>
                                    ))}
                                    <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-transparent">
                                        <input
                                            type="color"
                                            value={tagColor}
                                            onChange={(e) => setTagColor(e.target.value)}
                                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            {isEditing && (
                                <Button type="button" variant="outline" onClick={resetForm}>
                                    Abbrechen
                                </Button>
                            )}
                            <Button type="submit" disabled={saving || !tagName.trim()}>
                                {saving ? "Speichert..." : (isEditing ? "Speichern" : "Hinzufügen")}
                            </Button>
                        </div>
                    </form>

                    {/* List of Tags */}
                    <div className="space-y-4">
                        <h4 className="font-medium">Vorhandene Tags ({tags.length})</h4>

                        {loading ? (
                            <p className="text-sm text-muted-foreground">Lädt...</p>
                        ) : tags.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">Noch keine Tags erstellt.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {tags.map(tag => (
                                    <div key={tag.id} className="flex items-center justify-between p-3 border rounded-lg bg-background shadow-sm">
                                        <Badge
                                            className="px-2 py-1 text-xs font-medium text-white shadow-sm border-0"
                                            style={{ backgroundColor: tag.color }}
                                        >
                                            {tag.name}
                                        </Badge>

                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                                onClick={() => handleEdit(tag)}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDelete(tag.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </CardContent>
            </Card>
        </div>
    )
}
