import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label" 
// It was on line 5. I will just remove line 5 in the previous step... oh I can do it here.
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { Loader2, Plus, Trash2 } from "lucide-react"

interface NeuradStep {
    id: string
    title: string
    description: string
    template_name: string
    order_index: number
    is_active: boolean
}

export function NeuradChecklistManager() {
    const { workshopId } = useAuth()
    const [loading, setLoading] = useState(true)
    const [steps, setSteps] = useState<NeuradStep[]>([])
    const [templates, setTemplates] = useState<string[]>(['Standard'])
    const [activeTemplate, setActiveTemplate] = useState('Standard')
    const [newTemplateName, setNewTemplateName] = useState('')

    useEffect(() => {
        if (!workshopId) return
        fetchSteps()
    }, [workshopId])

    const fetchSteps = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('neurad_steps')
                .select('*')
                .eq('workshop_id', workshopId)
                .order('order_index')

            if (error) throw error

            if (data) {
                setSteps(data)
                // Extract unique templates
                const uniqueTemplates = Array.from(new Set(data.map(s => s.template_name || 'Standard')))
                if (!uniqueTemplates.includes('Standard')) uniqueTemplates.push('Standard')
                setTemplates(uniqueTemplates)
            }
        } catch (error) {
            console.error("Error fetching steps:", error)
            toast.error("Fehler beim Laden der Checklisten")
        } finally {
            setLoading(false)
        }
    }

    const handleAddStep = async () => {
        const currentTemplateSteps = steps.filter(s => s.template_name === activeTemplate)
        const newOrderIndex = currentTemplateSteps.length > 0
            ? Math.max(...currentTemplateSteps.map(s => s.order_index)) + 1
            : 0

        try {
            const { data, error } = await supabase
                .from('neurad_steps')
                .insert({
                    workshop_id: workshopId,
                    title: 'Neuer Schritt',
                    description: '',
                    template_name: activeTemplate,
                    order_index: newOrderIndex,
                    is_active: true
                })
                .select()
                .single()

            if (error) throw error
            setSteps([...steps, data])
            toast.success("Schritt hinzugefügt")
        } catch (error) {
            toast.error("Fehler beim Hinzufügen")
        }
    }

    const handleUpdateStep = async (id: string, updates: Partial<NeuradStep>) => {
        // Optimistic update
        setSteps(steps.map(s => s.id === id ? { ...s, ...updates } : s))

        try {
            const { error } = await supabase
                .from('neurad_steps')
                .update(updates)
                .eq('id', id)

            if (error) throw error
        } catch (error) {
            toast.error("Fehler beim Speichern")
            fetchSteps() // Revert on error
        }
    }

    const handleDeleteStep = async (id: string) => {
        if (!confirm("Schritt wirklich löschen?")) return

        try {
            const { error } = await supabase
                .from('neurad_steps')
                .delete()
                .eq('id', id)

            if (error) throw error
            setSteps(steps.filter(s => s.id !== id))
            toast.success("Schritt gelöscht")
        } catch (error) {
            toast.error("Fehler beim Löschen")
        }
    }

    const handleCreateTemplate = () => {
        if (!newTemplateName.trim()) return
        if (templates.includes(newTemplateName)) {
            toast.error("Vorlage existiert bereits")
            return
        }
        setTemplates([...templates, newTemplateName])
        setActiveTemplate(newTemplateName)
        setNewTemplateName('')
        toast.success(`Vorlage "${newTemplateName}" erstellt`)
    }

    const filteredSteps = steps.filter(s => (s.template_name || 'Standard') === activeTemplate)

    return (
        <Card className="bg-glass-bg border-glass-border">
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <CardTitle>Neurad Checklisten</CardTitle>
                        <CardDescription>
                            Verwalten Sie die Montageschritte für verschiedene Fahrrad-Typen.
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        <Select value={activeTemplate} onValueChange={setActiveTemplate}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Vorlage wählen" />
                            </SelectTrigger>
                            <SelectContent>
                                {templates.map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2 border-l pl-2 ml-2">
                            <Input
                                placeholder="Neue Vorlage..."
                                className="w-[150px]"
                                value={newTemplateName}
                                onChange={e => setNewTemplateName(e.target.value)}
                            />
                            <Button size="icon" variant="ghost" onClick={handleCreateTemplate}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="py-8 flex justify-center"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">#</TableHead>
                                        <TableHead>Titel</TableHead>
                                        <TableHead>Beschreibung</TableHead>
                                        <TableHead className="w-[100px]">Aktionen</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSteps.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                                Noch keine Schritte für "{activeTemplate}".
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredSteps.map((step, index) => (
                                            <TableRow key={step.id}>
                                                <TableCell className="font-medium">{index + 1}</TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={step.title}
                                                        onChange={(e) => handleUpdateStep(step.id, { title: e.target.value })}
                                                        className="h-8 border-transparent hover:border-input focus:border-input bg-transparent"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={step.description || ''}
                                                        onChange={(e) => handleUpdateStep(step.id, { description: e.target.value })}
                                                        className="h-8 border-transparent hover:border-input focus:border-input bg-transparent text-muted-foreground"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDeleteStep(step.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <Button onClick={handleAddStep} className="w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" />
                            Schritt hinzufügen
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
