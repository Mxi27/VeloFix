import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { PageTransition } from "@/components/PageTransition"
import { CreateShopTaskDialog } from "@/components/CreateShopTaskDialog"
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    CheckCircle2,
    Calendar as CalendarIcon,
    Search,
    MoreHorizontal,
    User,
    ArrowUpCircle,
    ArrowDownCircle,
    MinusCircle,
    Trash2
} from "lucide-react"
import { format, isPast, isToday } from "date-fns"
import { de } from "date-fns/locale"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface ShopTask {
    id: string
    title: string
    description: string | null
    status: 'open' | 'in_progress' | 'done' | 'archived'
    priority: 'low' | 'medium' | 'high'
    due_date: string | null
    assigned_to: string | null
    created_at: string
    assigned_employee?: {
        name: string
        color?: string
    }
}

export default function TasksPage() {
    const { workshopId } = useAuth()
    const [tasks, setTasks] = useState<ShopTask[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("open") // open, done, all
    const [priorityFilter, setPriorityFilter] = useState<string>("all")

    const fetchTasks = async () => {
        if (!workshopId) return
        setLoading(true)

        // Strategy: Try full fetch with join first. If it fails, try simple fetch.
        // This helps isolate RLS vs Join/Relationship issues.

        try {
            let query = supabase
                .from('shop_tasks')
                .select(`
                    *,
                    assigned_employee:employees!shop_tasks_assigned_to_fkey(name, color)
                `)
                .eq('workshop_id', workshopId)
                .order('due_date', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: false })

            if (statusFilter !== 'all') {
                if (statusFilter === 'open') {
                    query = query.in('status', ['open', 'in_progress'])
                } else {
                    query = query.eq('status', statusFilter)
                }
            } else {
                query = query.neq('status', 'archived')
            }

            if (priorityFilter !== 'all') {
                query = query.eq('priority', priorityFilter)
            }

            const { data, error } = await query

            if (error) throw error
            setTasks(data || [])

        } catch (joinError: any) {
            console.error('Error fetching tasks (with join):', joinError)

            // Fallback: Fetch without join
            console.log('Attempting fallback fetch without join...')
            let fallbackQuery = supabase
                .from('shop_tasks')
                .select('*')
                .eq('workshop_id', workshopId)
                .order('due_date', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: false })

            // Apply filters to fallback too
            if (statusFilter !== 'all') {
                if (statusFilter === 'open') {
                    fallbackQuery = fallbackQuery.in('status', ['open', 'in_progress'])
                } else {
                    fallbackQuery = fallbackQuery.eq('status', statusFilter)
                }
            } else {
                fallbackQuery = fallbackQuery.neq('status', 'archived')
            }

            if (priorityFilter !== 'all') {
                fallbackQuery = fallbackQuery.eq('priority', priorityFilter)
            }

            const { data: fallbackData, error: fallbackError } = await fallbackQuery

            if (fallbackError) {
                console.error('Fallback fetch also failed:', fallbackError)
                toast.error(`Kritischer Fehler: ${fallbackError.message} (Code: ${fallbackError.code})`)
            } else {
                console.log('Fallback success!')
                setTasks(fallbackData || [])
                toast.warning(`Aufgaben geladen, aber Mitarbeiter-Details fehlen. Fehler: ${joinError.message}`)
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTasks()
    }, [workshopId, statusFilter, priorityFilter]) // Re-fetch when filters change (server-side filtering)

    const handleStatusChange = async (taskId: string, newStatus: string) => {
        // Optimistic update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t))

        const { error } = await supabase
            .from('shop_tasks')
            .update({ status: newStatus })
            .eq('id', taskId)

        if (error) {
            toast.error("Fehler beim Aktualisieren")
            fetchTasks() // Revert
        } else {
            toast.success("Status aktualisiert")
        }
    }

    const deleteTask = async (taskId: string) => {
        if (!confirm("Bist du sicher, dass du diese Aufgabe löschen möchtest?")) return

        const { error } = await supabase
            .from('shop_tasks')
            .delete()
            .eq('id', taskId)

        if (error) {
            toast.error("Fehler beim Löschen")
        } else {
            toast.success("Aufgabe gelöscht")
            setTasks(prev => prev.filter(t => t.id !== taskId))
        }
    }

    // Client-side search
    const filteredTasks = tasks.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'high': return <ArrowUpCircle className="h-4 w-4 text-red-500" />
            case 'medium': return <MinusCircle className="h-4 w-4 text-orange-500" />
            case 'low': return <ArrowDownCircle className="h-4 w-4 text-blue-500" />
            default: return null
        }
    }

    return (
        <PageTransition>
            <DashboardLayout>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Aufgaben</h1>
                        <p className="text-muted-foreground">Verwalte allgemeine Aufgaben für die Werkstatt.</p>
                    </div>
                    <CreateShopTaskDialog onTaskCreated={fetchTasks} />
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Suchen..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="open">Offen & In Arbeit</SelectItem>
                                <SelectItem value="done">Erledigt</SelectItem>
                                <SelectItem value="all">Alle (außer Archiv)</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Priorität" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle Prioritäten</SelectItem>
                                <SelectItem value="high">Hoch</SelectItem>
                                <SelectItem value="medium">Mittel</SelectItem>
                                <SelectItem value="low">Niedrig</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Task List */}
                {loading ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-[200px] w-full bg-muted/20 animate-pulse rounded-xl" />
                        ))}
                    </div>
                ) : filteredTasks.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredTasks.map(task => {
                            const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'done'
                            const isDueToday = task.due_date && isToday(new Date(task.due_date)) && task.status !== 'done'

                            return (
                                <Card key={task.id} className={`flex flex-col h-full hover:shadow-md transition-shadow ${task.status === 'done' ? 'opacity-75' : ''}`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex gap-2 items-start">
                                                {task.status === 'done' ? (
                                                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                                ) : (
                                                    getPriorityIcon(task.priority)
                                                )}
                                                <div>
                                                    <CardTitle className={`text-base leading-tight ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                                                        {task.title}
                                                    </CardTitle>
                                                </div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'in_progress')}>
                                                        In Arbeit markieren
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'done')}>
                                                        Erledigt markieren
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'open')}>
                                                        Als Offen markieren
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => deleteTask(task.id)} className="text-red-600">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Löschen
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pb-3 flex-1">
                                        {task.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                                                {task.description}
                                            </p>
                                        )}

                                        <div className="flex flex-wrap gap-2 mt-auto">
                                            {task.due_date && (
                                                <Badge variant="outline" className={`${isOverdue ? 'border-red-500 text-red-600 bg-red-50' : (isDueToday ? 'border-orange-500 text-orange-600 bg-orange-50' : 'text-muted-foreground')}`}>
                                                    <CalendarIcon className="mr-1 h-3 w-3" />
                                                    {format(new Date(task.due_date), "dd. MMM", { locale: de })}
                                                </Badge>
                                            )}
                                            {task.assigned_employee ? (
                                                <Badge variant="secondary" className="pl-1 pr-2 gap-1" style={{
                                                    backgroundColor: task.assigned_employee.color ? `${task.assigned_employee.color}20` : undefined,
                                                    color: task.assigned_employee.color
                                                }}>
                                                    <Avatar className="h-4 w-4">
                                                        <AvatarFallback className="text-[9px]" style={{ backgroundColor: task.assigned_employee.color, color: 'white' }}>
                                                            {task.assigned_employee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    {task.assigned_employee.name}
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-muted-foreground">
                                                    <User className="mr-1 h-3 w-3" />
                                                    Offen
                                                </Badge>
                                            )}
                                        </div>
                                    </CardContent>
                                    {task.status !== 'done' && (
                                        <CardFooter className="pt-0">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => handleStatusChange(task.id, 'done')}
                                            >
                                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                                Erledigen
                                            </Button>
                                        </CardFooter>
                                    )}
                                </Card>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl">
                        <CheckCircle2 className="h-12 w-12 text-muted-foreground/20 mb-4" />
                        <h3 className="text-lg font-semibold">Keine Aufgaben gefunden</h3>
                        <p className="text-muted-foreground mb-4">
                            {searchTerm || statusFilter !== 'open' ? "Versuche die Filter anzupassen." : "Erstelle deine erste Aufgabe für die Werkstatt."}
                        </p>
                        <CreateShopTaskDialog onTaskCreated={fetchTasks} />
                    </div>
                )}
            </DashboardLayout>
        </PageTransition>
    )
}
