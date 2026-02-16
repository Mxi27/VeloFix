import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2, RefreshCw, Tag } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
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
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { EmployeeSelector } from "@/components/EmployeeSelector"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

const CATEGORY_PRESETS = ['Reinigung', 'Wartung', 'Verwaltung', 'Einkauf', 'Sonstiges']

const formSchema = z.object({
    title: z.string().min(1, "Titel ist erforderlich"),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]),
    due_date: z.date().optional(),
    assigned_to: z.string().optional(),
    is_recurring: z.boolean().optional(),
    recurrence_type: z.string().optional(),
    category: z.string().optional(),
})

interface CreateShopTaskDialogProps {
    children?: React.ReactNode
    onTaskCreated?: () => void
}

export function CreateShopTaskDialog({ children, onTaskCreated }: CreateShopTaskDialogProps) {
    const { workshopId, user } = useAuth()
    const [open, setOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            priority: "medium",
            assigned_to: "none",
            is_recurring: false,
            recurrence_type: "",
            category: "",
        },
    })

    const isRecurring = form.watch('is_recurring')

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!workshopId || !user) return

        setIsSubmitting(true)

        try {
            const { error } = await supabase
                .from('shop_tasks')
                .insert({
                    workshop_id: workshopId,
                    title: values.title,
                    description: values.description || null,
                    priority: values.priority,
                    due_date: values.due_date ? values.due_date.toISOString() : null,
                    assigned_to: values.assigned_to === "none" ? null : values.assigned_to,
                    created_by: user.id,
                    is_recurring: values.is_recurring || false,
                    recurrence_rule: values.is_recurring && values.recurrence_type ? { type: values.recurrence_type } : null,
                    category: values.category || null,
                })

            if (error) throw error

            toast.success("Aufgabe erstellt")
            setOpen(false)
            form.reset()
            onTaskCreated?.()
        } catch (error) {
            console.error('Error creating task:', error)
            toast.error("Fehler beim Erstellen der Aufgabe")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button className="rounded-xl shadow-sm gap-2">
                        <span>+ Neue Aufgabe</span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Neue Aufgabe erstellen</DialogTitle>
                    <DialogDescription>
                        Erstelle eine einmalige oder wiederkehrende Aufgabe für die Werkstatt.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
                        <div className="space-y-5 overflow-y-auto flex-1 pr-1 pb-2">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Titel</FormLabel>
                                        <FormControl>
                                            <Input placeholder="z.B. Werkstatt aufräumen, Müll rausbringen" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Beschreibung</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Details zur Aufgabe..." className="min-h-[80px] resize-none" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="priority"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Priorität</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Wähle Priorität" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="low">Niedrig</SelectItem>
                                                    <SelectItem value="medium">Mittel</SelectItem>
                                                    <SelectItem value="high">Hoch</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="due_date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fälligkeit</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? (
                                                                format(field.value, "dd.MM.yyyy")
                                                            ) : (
                                                                <span>Datum wählen</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        disabled={(date) =>
                                                            date < new Date("1900-01-01")
                                                        }
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="assigned_to"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Zuweisung</FormLabel>
                                        <FormControl>
                                            <EmployeeSelector
                                                selectedEmployeeId={field.value === "none" ? undefined : field.value}
                                                onSelect={(id) => field.onChange(id || "none")}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Recurring & Category Section */}
                            <div className="space-y-4 pt-4 border-t border-border/50">
                                {/* Recurring Toggle */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className={cn(
                                                "p-1.5 rounded-md transition-colors",
                                                isRecurring ? "bg-violet-100 text-violet-600" : "bg-muted text-muted-foreground"
                                            )}>
                                                <RefreshCw className="h-3.5 w-3.5" />
                                            </div>
                                            <Label htmlFor="recurring-toggle" className="text-sm font-medium cursor-pointer">
                                                Wiederkehrende Aufgabe
                                            </Label>
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="is_recurring"
                                            render={({ field }) => (
                                                <Switch
                                                    id="recurring-toggle"
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            )}
                                        />
                                    </div>

                                    {isRecurring && (
                                        <FormField
                                            control={form.control}
                                            name="recurrence_type"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                                        <FormControl>
                                                            <SelectTrigger className="bg-violet-50/50 border-violet-200/50">
                                                                <SelectValue placeholder="Wiederholung wählen..." />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="daily">Täglich</SelectItem>
                                                            <SelectItem value="weekly">Wöchentlich</SelectItem>
                                                            <SelectItem value="biweekly">Alle 2 Wochen</SelectItem>
                                                            <SelectItem value="monthly">Monatlich</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>

                                {/* Category */}
                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                                                Kategorie
                                            </FormLabel>
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {CATEGORY_PRESETS.map(cat => (
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
                                                <FormControl>
                                                    <Input
                                                        placeholder="Oder eigene Kategorie eingeben..."
                                                        className="h-8 text-sm"
                                                        value={field.value || ''}
                                                        onChange={(e) => field.onChange(e.target.value)}
                                                    />
                                                </FormControl>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                        </div>

                        <DialogFooter className="pt-4 border-t border-border/30 mt-2">
                            <Button type="submit" disabled={isSubmitting} className="rounded-xl">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Aufgabe erstellen
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
