import { useState, useEffect } from 'react'
import { Plus, Trash2, ClipboardList, Save, Pencil, X, Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function AcceptanceSettings() {
    const { workshopId } = useAuth()
    const [items, setItems] = useState<string[]>([])
    const [newItem, setNewItem] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Editing state
    const [editingItem, setEditingItem] = useState<string | null>(null)
    const [editValue, setEditValue] = useState('')
    const [itemToDelete, setItemToDelete] = useState<string | null>(null)

    useEffect(() => {
        if (workshopId) {
            fetchChecklist()
        }
    }, [workshopId])

    const fetchChecklist = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('workshops')
            .select('acceptance_checklist')
            .eq('id', workshopId)
            .single()

        if (error) {
            console.error('Error fetching acceptance checklist:', error)
        } else {
            const fetchedItems = data?.acceptance_checklist
            if (Array.isArray(fetchedItems)) {
                setItems(fetchedItems)
            } else {
                setItems([])
            }
        }
        setLoading(false)
    }

    const handleAddItem = () => {
        if (!newItem.trim()) return
        if (items.includes(newItem.trim())) return

        const updatedItems = [...items, newItem.trim()]
        setItems(updatedItems)
        setNewItem('')
        saveChecklist(updatedItems)
    }

    const startEditing = (item: string) => {
        setEditingItem(item)
        setEditValue(item)
    }

    const cancelEditing = () => {
        setEditingItem(null)
        setEditValue('')
    }

    const saveEditing = () => {
        if (!editValue.trim() || !editingItem) return

        // Prevent duplicates (excluding self)
        if (items.some(i => i === editValue.trim() && i !== editingItem)) {
            alert("Dieser Punkt existiert bereits.")
            return
        }

        const updatedItems = items.map(i =>
            i === editingItem ? editValue.trim() : i
        )

        setItems(updatedItems)
        setEditingItem(null)
        setEditValue('')
        saveChecklist(updatedItems)
    }

    const confirmDelete = (item: string) => {
        setItemToDelete(item)
    }

    const executeDelete = () => {
        if (!itemToDelete) return

        const updatedItems = items.filter(i => i !== itemToDelete)
        setItems(updatedItems)
        saveChecklist(updatedItems)
        setItemToDelete(null)
    }

    const saveChecklist = async (updatedItems: string[]) => {
        if (!workshopId) return

        setSaving(true)
        const { error } = await supabase
            .from('workshops')
            .update({ acceptance_checklist: updatedItems })
            .eq('id', workshopId)

        if (error) {
            console.error('Error saving checklist:', error)
            alert("Fehler beim Speichern der Checkliste")
        }
        setSaving(false)
    }

    if (loading) {
        return <div className="p-4 text-center text-muted-foreground">Lade Checkliste...</div>
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <ClipboardList className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Annahme-Prozess</CardTitle>
                            <CardDescription>
                                Definieren Sie die Punkte, die bei der Annahme eines Auftrags abgehakt werden müssen.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex gap-2 items-end">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="new-item">Neuer Punkt</Label>
                            <Input
                                id="new-item"
                                placeholder="z.B. Probefahrt durchgeführt"
                                value={newItem}
                                onChange={(e) => setNewItem(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddItem()
                                }}
                            />
                        </div>
                        <Button onClick={handleAddItem} disabled={saving || !newItem.trim()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Hinzufügen
                        </Button>
                    </div>

                    <div className="bg-muted/30 rounded-lg border border-border/50 overflow-hidden">
                        {items.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                Keine Punkte definiert
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {items.map((item) => (
                                    <div key={item} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors h-14">
                                        {editingItem === item ? (
                                            <div className="flex items-center gap-2 flex-1 mr-2">
                                                <Input
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="h-8"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveEditing()
                                                        if (e.key === 'Escape') cancelEditing()
                                                    }}
                                                />
                                                <Button size="sm" variant="ghost" onClick={saveEditing} className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30">
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={cancelEditing} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30">
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="font-medium px-2">{item}</span>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                                        onClick={() => startEditing(item)}
                                                        disabled={saving}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                        onClick={() => confirmDelete(item)}
                                                        disabled={saving}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {saving && (
                        <div className="flex items-center justify-end text-xs text-muted-foreground animate-pulse">
                            <Save className="h-3 w-3 mr-1" />
                            Speichert...
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Punkt löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Möchten Sie "{itemToDelete}" wirklich aus der Liste entfernen?
                            Dies hat keine Auswirkungen auf bestehende Aufträge.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Löschen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
