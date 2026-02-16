import { toastSuccess, toastError } from '@/lib/toast-utils'
import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Eye, GripVertical, Check, X, MoreHorizontal } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Database } from '@/types/supabase'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'

type ChecklistTemplate = Database['public']['Tables']['checklist_templates']['Row']

interface ChecklistItem {
    id: string
    text: string
    description?: string // Added description
    order: number
}

interface SortableItemProps {
    item: ChecklistItem
    isEditing: boolean
    draftValue: string
    draftDescription: string // Added draftDescription
    onDraftChange: (value: string) => void
    onDraftDescriptionChange: (value: string) => void // Added handler
    onSave: () => void
    onRemove: (id: string) => void
    onStartEdit: (id: string, text: string, description?: string) => void
    onCancelEdit: () => void
    onEnter: () => void
}

function SortableItem({
    item,
    isEditing,
    draftValue,
    draftDescription,
    onDraftChange,
    onDraftDescriptionChange,
    onSave,
    onRemove,
    onStartEdit,
    onCancelEdit,
    onEnter
}: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex flex-col gap-2 p-3 bg-muted/50 rounded-lg border",
                isDragging && "border-primary"
            )}
        >
            <div className="flex items-start gap-2">
                <button
                    type="button"
                    className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-background rounded mt-1.5"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                </button>

                {isEditing ? (
                    <div className="flex-1 space-y-2">
                        <Input
                            value={draftValue}
                            onChange={(e) => onDraftChange(e.target.value)}
                            className="flex-1"
                            placeholder="Checklistenpunkt eingeben..."
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) { // Allow shift+enter for description? No, description is separate
                                    e.preventDefault()
                                    onEnter()
                                }
                                if (e.key === 'Escape') {
                                    e.preventDefault()
                                    onCancelEdit()
                                }
                            }}
                        />
                        <Textarea
                            value={draftDescription}
                            onChange={(e) => onDraftDescriptionChange(e.target.value)}
                            placeholder="Beschreibung / Anleitung (optional)"
                            className="h-20 resize-none text-sm"
                        />
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={onCancelEdit}
                            >
                                <X className="h-4 w-4 text-destructive mr-2" />
                                Abbrechen
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={onSave}
                            >
                                <Check className="h-4 w-4 text-green-600 mr-2" />
                                Speichern
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 py-1">
                            <span className={cn(
                                "block text-sm font-medium",
                                !item.text && "text-muted-foreground italic"
                            )}>
                                {item.text || "Leerer Punkt - Zum Bearbeiten klicken"}
                            </span>
                            {item.description && (
                                <span className="block text-xs text-muted-foreground mt-1">
                                    {item.description}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onStartEdit(item.id, item.text, item.description)}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onRemove(item.id)}
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export function ChecklistTemplateManager() {
    const { workshopId } = useAuth()
    const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [previewOpen, setPreviewOpen] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null)
    const [previewTemplate, setPreviewTemplate] = useState<ChecklistTemplate | null>(null)

    // State for managing inline editing
    const [editingItemId, setEditingItemId] = useState<string | null>(null)
    const [draftValue, setDraftValue] = useState("")
    const [draftDescription, setDraftDescription] = useState("") // Added draftDescription state

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        items: [] as ChecklistItem[]
    })

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    useEffect(() => {
        if (workshopId) {
            fetchTemplates()
        }
    }, [workshopId])

    const fetchTemplates = async () => {
        if (!workshopId) return

        setLoading(true)
        const { data, error } = await supabase
            .from('checklist_templates')
            .select('*')
            .eq('workshop_id', workshopId)
            .order('created_at', { ascending: false })

        if (error) {
            toastError('Fehler beim Laden der Vorlagen', error.message)
        } else {
            setTemplates(data || [])
        }
        setLoading(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!workshopId) {
            toastError('Fehler', 'Keine Workshop-ID gefunden. Bitte melden Sie sich erneut an.')
            return
        }

        // Apply any pending edits before submitting
        let currentItems = [...formData.items]
        if (editingItemId) {
            currentItems = currentItems.map(item =>
                item.id === editingItemId ? { ...item, text: draftValue, description: draftDescription } : item
            )
        }

        const itemsJson = currentItems.map((item, index) => ({
            id: item.id,
            text: item.text,
            description: item.description, // Save description
            order: index,
            completed: false
        }))

        // Filter out empty items if desired, or keep them. 
        // User didn't ask to filter, but usually good practice.
        // For now we keep them as empty items might be placeholders.

        try {
            if (editingTemplate) {
                const { error } = await supabase
                    .from('checklist_templates')
                    .update({
                        name: formData.name,
                        description: formData.description,
                        items: itemsJson as any,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingTemplate.id)
                    .select()

                if (error) {
                    toastError('Fehler beim Aktualisieren', error.message)
                    return
                }
                toastSuccess('Vorlage aktualisiert', 'Die Vorlage wurde erfolgreich aktualisiert.')
            } else {
                const { error } = await supabase
                    .from('checklist_templates')
                    .insert({
                        workshop_id: workshopId,
                        name: formData.name,
                        description: formData.description,
                        items: itemsJson as any
                    })
                    .select()

                if (error) {
                    toastError('Fehler beim Erstellen', error.message)
                    return
                }
                toastSuccess('Vorlage erstellt', 'Die Checklisten-Vorlage wurde erfolgreich erstellt.')
            }

            setDialogOpen(false)
            resetForm()
            fetchTemplates()
        } catch (err: any) {
            toastError('Fehler', err.message || 'Ein unerwarteter Fehler ist aufgetreten.')
        }
    }

    // ... (rest of methods until updateItem)

    // Handlers
    const startEditing = (id: string, text: string, description?: string) => {
        setEditingItemId(id)
        setDraftValue(text)
        setDraftDescription(description || "")
    }

    const cancelEditing = () => {
        setEditingItemId(null)
        setDraftValue("")
        setDraftDescription("")
    }

    const saveEditing = () => {
        if (editingItemId) {
            setFormData({
                ...formData,
                items: formData.items.map(item =>
                    item.id === editingItemId ? { ...item, text: draftValue, description: draftDescription } : item
                )
            })
            setEditingItemId(null)
            setDraftValue("")
            setDraftDescription("")
        }
    }

    const handleEnterKey = () => {
        if (editingItemId) {
            // 1. Save current item
            const savedText = draftValue
            const savedDesc = draftDescription
            const currentId = editingItemId

            // 2. Create new item
            const newItem: ChecklistItem = {
                id: `item-${Date.now()}-${Math.random()}`,
                text: '',
                description: '',
                order: 0 // Order re-calc happens on save/render usually, but let's just insert
            }

            setFormData(prev => {
                const index = prev.items.findIndex(i => i.id === currentId)
                const newItems = [...prev.items]
                // Update current item
                newItems[index] = { ...newItems[index], text: savedText, description: savedDesc }
                // Insert new item after
                newItems.splice(index + 1, 0, newItem)
                return { ...prev, items: newItems }
            })

            // 3. Switch edit mode to new item
            setEditingItemId(newItem.id)
            setDraftValue("")
            setDraftDescription("")
        }
    }

    // Helper stubs for replace_file_content context matching
    const deleteTemplate = async (templateId: string) => {
        if (!confirm('Möchten Sie diese Vorlage wirklich löschen?')) return

        const { error } = await supabase
            .from('checklist_templates')
            .delete()
            .eq('id', templateId)

        if (error) {
            toastError('Fehler', 'Die Vorlage konnte nicht gelöscht werden.')
            return
        }

        toastSuccess('Vorlage gelöscht', 'Die Vorlage wurde erfolgreich gelöscht.')

        fetchTemplates()
    }

    const openEditDialog = (template: ChecklistTemplate) => {
        setEditingTemplate(template)
        const items = Array.isArray(template.items) ? template.items as any[] : []
        setFormData({
            name: template.name,
            description: template.description || '',
            items: items.map((item: any) => ({
                id: item.id || `item-${Date.now()}-${Math.random()}`,
                text: item.text || '',
                description: item.description || '', // Load description
                order: item.order || 0
            })).sort((a, b) => a.order - b.order)
        })
        setDialogOpen(true)
    }

    const openPreview = (template: ChecklistTemplate) => {
        setPreviewTemplate(template)
        setPreviewOpen(true)
    }

    const resetForm = () => {
        setEditingTemplate(null)
        setFormData({ name: '', description: '', items: [] })
        setEditingItemId(null)
    }

    const addItem = () => {
        const newItem: ChecklistItem = {
            id: `item-${Date.now()}-${Math.random()}`,
            text: '',
            description: '',
            order: formData.items.length
        }
        setFormData({ ...formData, items: [...formData.items, newItem] })
        setEditingItemId(newItem.id)
    }

    const removeItem = (id: string) => {
        setFormData({
            ...formData,
            items: formData.items.filter(item => item.id !== id)
        })
    }



    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            setFormData((prev) => {
                const oldIndex = prev.items.findIndex((item) => item.id === active.id)
                const newIndex = prev.items.findIndex((item) => item.id === over.id)
                return {
                    ...prev,
                    items: arrayMove(prev.items, oldIndex, newIndex)
                }
            })
        }
    }

    const getItemsArray = (template: ChecklistTemplate): any[] => {
        return Array.isArray(template.items) ? template.items as any[] : []
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Checklisten-Vorlagen</CardTitle>
                        <CardDescription>
                            Erstellen und verwalten Sie wiederverwendbare Checklisten für Aufträge
                        </CardDescription>
                    </div>
                    <Dialog open={dialogOpen} onOpenChange={(open) => {
                        setDialogOpen(open)
                        if (!open) resetForm()
                    }}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Vorlage erstellen
                            </Button>
                        </DialogTrigger>
                        <DialogContent
                            className="max-w-2xl max-h-[80vh] overflow-y-auto"
                            onInteractOutside={(e) => {
                                // Prevent closing when clicking inside the dialog
                                e.preventDefault()
                            }}
                        >
                            <DialogHeader>
                                <DialogTitle>
                                    {editingTemplate ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
                                </DialogTitle>
                                <DialogDescription>
                                    {editingTemplate
                                        ? 'Bearbeiten Sie die Checklisten-Vorlage. Ziehen Sie Punkte, um die Reihenfolge zu ändern.'
                                        : 'Erstellen Sie eine neue Checklisten-Vorlage'}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit}>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name der Vorlage</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="z.B. Grundinspektion"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Beschreibung</Label>
                                        <Textarea
                                            id="description"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Beschreiben Sie diese Checkliste..."
                                            rows={2}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Checklisten-Punkte</Label>
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <SortableContext
                                                items={formData.items.map(item => item.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                <div className="space-y-2">
                                                    {formData.items.map((item) => (
                                                        <SortableItem
                                                            key={item.id}
                                                            item={item}
                                                            isEditing={editingItemId === item.id}
                                                            draftValue={draftValue}
                                                            draftDescription={draftDescription} // Pass description
                                                            onDraftChange={setDraftValue}
                                                            onDraftDescriptionChange={setDraftDescription} // Pass handler
                                                            onSave={saveEditing}
                                                            onRemove={removeItem}
                                                            onStartEdit={startEditing}
                                                            onCancelEdit={cancelEditing}
                                                            onEnter={handleEnterKey}
                                                        />
                                                    ))}
                                                </div>
                                            </SortableContext>
                                        </DndContext>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addItem}
                                            className="w-full"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Punkt hinzufügen
                                        </Button>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                        Abbrechen
                                    </Button>
                                    <Button type="submit">
                                        {editingTemplate ? 'Speichern' : 'Erstellen'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p className="text-center text-muted-foreground py-8">Lade Vorlagen...</p>
                ) : templates.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                        Noch keine Vorlagen erstellt
                    </p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Beschreibung</TableHead>
                                <TableHead>Punkte</TableHead>
                                <TableHead className="text-right">Aktionen</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {templates.map((template) => (
                                <TableRow key={template.id}>
                                    <TableCell className="font-medium">{template.name}</TableCell>
                                    <TableCell className="text-muted-foreground truncate max-w-[200px]">
                                        {template.description || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {getItemsArray(template).length}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Menü öffnen</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => openPreview(template)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Vorschau
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openEditDialog(template)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Bearbeiten
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => deleteTemplate(template.id)}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Löschen
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                {/* Preview Dialog */}
                <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{previewTemplate?.name}</DialogTitle>
                            <DialogDescription>
                                {previewTemplate?.description}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 py-4">
                            {getItemsArray(previewTemplate || {} as ChecklistTemplate)
                                .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                                .map((item: any, index: number) => (
                                    <div key={item.id || index} className="flex items-center gap-3">
                                        <Checkbox disabled />
                                        <span className="text-sm">{item.text}</span>
                                    </div>
                                ))}
                        </div>
                        <DialogFooter>
                            <Button onClick={() => setPreviewOpen(false)}>
                                Schließen
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    )
}
