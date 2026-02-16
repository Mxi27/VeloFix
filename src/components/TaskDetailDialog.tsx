import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2, Trash2, X, User, RefreshCw, Tag } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogClose,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { EmployeeSelector } from "@/components/EmployeeSelector"


// Reusing shop task interface
export interface RecurrenceRule {
    type: 'daily' | 'weekly' | 'biweekly' | 'monthly'
    interval?: number
    days?: string[]
}

export interface ShopTask {
    id: string
    title: string
    description: string | null
    status: 'open' | 'in_progress' | 'done' | 'archived'
    priority: 'low' | 'medium' | 'high'
    due_date: string | null
    assigned_to: string | null
    created_at: string
    is_recurring: boolean
    recurrence_rule: RecurrenceRule | null
    recurrence_next_due: string | null
    category: string | null
    assigned_employee?: {
        name: string
        color?: string
    }
}


const formSchema = z.object({
    title: z.string().min(1, "Titel ist erforderlich"),
    description: z.string().optional(),
    status: z.enum(["open", "in_progress", "done", "archived"]),
    priority: z.enum(["low", "medium", "high"]),
    due_date: z.date().optional().nullable(),
    assigned_to: z.string().optional().nullable(),
    is_recurring: z.boolean().optional(),
    recurrence_type: z.string().optional(),
    category: z.string().optional().nullable(),
})

interface TaskDetailDialogProps {
    task: ShopTask | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onUpdate: () => void
}

export function TaskDetailDialog({ task, open, onOpenChange, onUpdate }: TaskDetailDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            status: "open",
            priority: "medium",
            due_date: undefined,
            assigned_to: "none",
            is_recurring: false,
            recurrence_type: "",
            category: "",
        },
    })

    useEffect(() => {
        if (task) {
            form.reset({
                title: task.title,
                description: task.description || "",
                status: task.status,
                priority: task.priority,
                due_date: task.due_date ? new Date(task.due_date) : undefined,
                assigned_to: task.assigned_to || "none",
                is_recurring: task.is_recurring || false,
                recurrence_type: task.recurrence_rule?.type || "",
                category: task.category || "",
            })
        }
    }, [task, form, open])

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!task) return

        setIsSubmitting(true)
        try {
            const { error } = await supabase
                .from('shop_tasks')
                .update({
                    title: values.title,
                    description: values.description || null,
                    status: values.status,
                    priority: values.priority,
                    due_date: values.due_date ? values.due_date.toISOString() : null,
                    assigned_to: values.assigned_to === "none" ? null : values.assigned_to,
                    is_recurring: values.is_recurring || false,
                    recurrence_rule: values.is_recurring && values.recurrence_type ? { type: values.recurrence_type } : null,
                    category: values.category || null,
                })
                .eq('id', task.id)

            if (error) throw error

            toast.success("Gespeichert")
            onUpdate()
            onOpenChange(false)
        } catch (error) {
            console.error('Error updating task:', error)
            toast.error("Fehler beim Speichern")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!task || !confirm("Möchtest du diese Aufgabe wirklich löschen?")) return

        try {
            const { error } = await supabase
                .from('shop_tasks')
                .delete()
                .eq('id', task.id)

            if (error) throw error

            toast.success("Aufgabe gelöscht")
            onUpdate()
            onOpenChange(false)
        } catch (error) {
            console.error('Error deleting task:', error)
            toast.error("Fehler beim Löschen")
        }
    }

    if (!task) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden gap-0 bg-card border-none shadow-2xl rounded-2xl">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                        {/* Header Actions - Floating/Cleaner */}
                        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                            <Button type="submit" size="sm" disabled={isSubmitting} className="h-8 rounded-full px-4 shadow-sm">
                                {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                                Speichern
                            </Button>
                            <DialogClose asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-70 hover:opacity-100">
                                    <X className="h-4 w-4" />
                                </Button>
                            </DialogClose>
                        </div>
                        <div className="absolute top-4 left-4 z-10">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleDelete}
                                className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-600 hover:bg-red-50"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="p-10 space-y-8 mt-4">
                            {/* Title */}
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input
                                                className="text-3xl font-bold tracking-tight border-none shadow-none px-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent"
                                                placeholder="Aufgabentitel"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Meta Bar */}
                            <div className="flex flex-wrap items-center gap-4">
                                {/* Status */}
                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem className="space-y-0">
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-9 px-4 text-xs font-medium w-auto gap-2 border-0 bg-secondary/50 hover:bg-secondary/80 focus:ring-0 rounded-full transition-colors">
                                                        <span className="text-muted-foreground">Status:</span>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="open">Offen</SelectItem>
                                                    <SelectItem value="in_progress">In Arbeit</SelectItem>
                                                    <SelectItem value="done">Erledigt</SelectItem>
                                                    <SelectItem value="archived">Archiviert</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />

                                {/* Priority */}
                                <FormField
                                    control={form.control}
                                    name="priority"
                                    render={({ field }) => (
                                        <FormItem className="space-y-0">
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-9 px-4 text-xs font-medium w-auto gap-2 border-0 bg-secondary/50 hover:bg-secondary/80 focus:ring-0 rounded-full transition-colors">
                                                        <span className="text-muted-foreground">Priorität:</span>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="low">Niedrig</SelectItem>
                                                    <SelectItem value="medium">Mittel</SelectItem>
                                                    <SelectItem value="high">Hoch</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />

                                {/* Due Date */}
                                <FormField
                                    control={form.control}
                                    name="due_date"
                                    render={({ field }) => (
                                        <FormItem className="space-y-0">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={cn(
                                                                "h-9 px-4 text-xs font-medium w-auto gap-2 border-0 bg-secondary/50 hover:bg-secondary/80 focus:ring-0 rounded-full transition-colors",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <span className="text-muted-foreground">Fällig:</span>
                                                            {field.value ? (
                                                                format(field.value, "dd.MM.yyyy")
                                                            ) : (
                                                                <span className="text-muted-foreground/50">Kein Datum</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-3.5 w-3.5 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value || undefined}
                                                        onSelect={field.onChange}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </FormItem>
                                    )}
                                />

                                {/* Assignee */}
                                <FormField
                                    control={form.control}
                                    name="assigned_to"
                                    render={({ field }) => (
                                        <FormItem className="space-y-0">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={cn(
                                                                "h-9 px-4 text-xs font-medium w-auto gap-2 border-0 bg-secondary/50 hover:bg-secondary/80 focus:ring-0 rounded-full transition-colors",
                                                                !field.value || field.value === 'none' && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <User className="h-3.5 w-3.5 mr-1 opacity-70" />
                                                            <span className="text-muted-foreground">Zugewiesen:</span>
                                                            {field.value && field.value !== "none" ? (
                                                                <span className="text-foreground">Bearbeiten...</span>
                                                            ) : (
                                                                <span className="text-muted-foreground/50">Niemand</span>
                                                            )}
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[400px] p-0" align="start">
                                                    <div className="p-4">
                                                        <EmployeeSelector
                                                            selectedEmployeeId={field.value === "none" || !field.value ? undefined : field.value}
                                                            onSelect={(id) => field.onChange(id || "none")}
                                                        />
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Recurrence & Category Meta */}
                            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/30">
                                {/* Recurring Toggle */}
                                <FormField
                                    control={form.control}
                                    name="is_recurring"
                                    render={({ field }) => (
                                        <FormItem className="space-y-0">
                                            <FormControl>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => field.onChange(!field.value)}
                                                    className={cn(
                                                        "h-9 px-4 text-xs font-medium gap-2 border-0 rounded-full transition-colors",
                                                        field.value
                                                            ? "bg-violet-100 text-violet-700 hover:bg-violet-200"
                                                            : "bg-secondary/50 hover:bg-secondary/80 text-muted-foreground"
                                                    )}
                                                >
                                                    <RefreshCw className="h-3.5 w-3.5" />
                                                    {field.value ? 'Wiederkehrend' : 'Einmalig'}
                                                </Button>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                {form.watch('is_recurring') && (
                                    <FormField
                                        control={form.control}
                                        name="recurrence_type"
                                        render={({ field }) => (
                                            <FormItem className="space-y-0">
                                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-9 px-4 text-xs font-medium w-auto gap-2 border-0 bg-secondary/50 hover:bg-secondary/80 focus:ring-0 rounded-full transition-colors">
                                                            <span className="text-muted-foreground">Intervall:</span>
                                                            <SelectValue placeholder="Wählen" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="daily">Täglich</SelectItem>
                                                        <SelectItem value="weekly">Wöchentlich</SelectItem>
                                                        <SelectItem value="biweekly">Alle 2 Wochen</SelectItem>
                                                        <SelectItem value="monthly">Monatlich</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {/* Category */}
                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem className="space-y-0">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={cn(
                                                                "h-9 px-4 text-xs font-medium w-auto gap-2 border-0 bg-secondary/50 hover:bg-secondary/80 focus:ring-0 rounded-full transition-colors",
                                                            )}
                                                        >
                                                            <Tag className="h-3.5 w-3.5 opacity-70" />
                                                            <span className="text-muted-foreground">Kategorie:</span>
                                                            {field.value ? (
                                                                <span className="text-foreground">{field.value}</span>
                                                            ) : (
                                                                <span className="text-muted-foreground/50">Keine</span>
                                                            )}
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[240px] p-3" align="start">
                                                    <div className="space-y-2">
                                                        <Input
                                                            placeholder="Kategorie eingeben..."
                                                            value={field.value || ''}
                                                            onChange={(e) => field.onChange(e.target.value)}
                                                            className="h-8 text-sm"
                                                        />
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {['Reinigung', 'Wartung', 'Verwaltung', 'Einkauf', 'Sonstiges'].map(cat => (
                                                                <Button
                                                                    key={cat}
                                                                    type="button"
                                                                    variant={field.value === cat ? 'default' : 'outline'}
                                                                    size="sm"
                                                                    className="h-7 text-xs rounded-full"
                                                                    onClick={() => field.onChange(field.value === cat ? '' : cat)}
                                                                >
                                                                    {cat}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Description */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                            <Textarea
                                                className="min-h-[400px] resize-none border-none shadow-none focus-visible:ring-0 p-0 text-lg leading-relaxed placeholder:text-muted-foreground/30 bg-transparent"
                                                placeholder="Beschreibung, Notizen oder Details hier hinzufügen..."
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

