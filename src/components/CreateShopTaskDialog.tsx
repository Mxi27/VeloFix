import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2 } from "lucide-react"

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

const formSchema = z.object({
    title: z.string().min(1, "Titel ist erforderlich"),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]),
    due_date: z.date().optional(),
    assigned_to: z.string().optional(),
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
            assigned_to: "none" // Special value for "unassigned" because Select doesn't like null
        },
    })

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
                    created_by: user.id
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
                {children || <Button>Neue Aufgabe</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Neue Aufgabe erstellen</DialogTitle>
                    <DialogDescription>
                        Erstelle eine neue Aufgabe für die Werkstatt.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Titel</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Titel der Aufgabe" {...field} />
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
                                        <Textarea placeholder="Details zur Aufgabe..." {...field} />
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

                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Erstellen
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
