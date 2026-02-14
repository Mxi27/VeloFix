import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { supabase } from "@/lib/supabase"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { PageTransition } from "@/components/PageTransition"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    CheckCircle2,
    Target,
    ListTodo,
    ArrowRight,
    Clock
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { format, isToday, isPast } from "date-fns"
import { de } from "date-fns/locale"

interface DashboardItem {
    id: string
    type: 'order' | 'qc' | 'task'
    title: string
    subtitle?: string
    status: string
    due_date: string | null
    priority?: 'low' | 'medium' | 'high'
}

export default function CockpitPage() {
    const { user, workshopId } = useAuth()
    const { activeEmployee } = useEmployee()
    const navigate = useNavigate()
    const [items, setItems] = useState<DashboardItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchCockpitData = async () => {
            if (!workshopId || !user) return
            setLoading(true)

            // 1. Resolve Employee ID
            let employeeId = activeEmployee?.id
            if (!employeeId) {
                const { data: empData } = await supabase
                    .from('employees')
                    .select('id')
                    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
                    .eq('workshop_id', workshopId)
                    .maybeSingle()
                if (empData) employeeId = empData.id
            }

            if (!employeeId) {
                setLoading(false)
                return
            }

            const todayStart = new Date()
            todayStart.setHours(0, 0, 0, 0)
            const todayEnd = new Date()
            todayEnd.setHours(23, 59, 59, 999)

            // Fetch My Due Orders (Today or Overdue)
            const { data: orders } = await supabase
                .from('orders')
                .select('id, order_number, customer_name, bike_model, status, due_date, mechanic_ids')
                .eq('workshop_id', workshopId)
                .neq('status', 'abgeschlossen')
                .neq('status', 'abgeholt')
                .contains('mechanic_ids', [employeeId])
                .lte('due_date', todayEnd.toISOString())

            // Fetch My Due QC (Today or Overdue)
            const { data: qcs } = await supabase
                .from('orders')
                .select('id, order_number, customer_name, bike_model, status, due_date, qc_mechanic_id')
                .eq('workshop_id', workshopId)
                .neq('status', 'abgeschlossen')
                .neq('status', 'abgeholt')
                .eq('qc_mechanic_id', employeeId)
                .lte('due_date', todayEnd.toISOString())

            // Fetch My Shop Tasks (Today or Overdue)
            const { data: tasks } = await supabase
                .from('shop_tasks')
                .select('id, title, description, status, due_date, priority')
                .eq('workshop_id', workshopId)
                .neq('status', 'done')
                .neq('status', 'archived')
                .eq('assigned_to', employeeId)
            //.lte('due_date', todayEnd.toISOString()) // For tasks, maybe show all assigned? Or just due? Let's show due + high priority

            const combinedItems: DashboardItem[] = []

            orders?.forEach(o => {
                combinedItems.push({
                    id: o.id,
                    type: 'order',
                    title: `${o.order_number} - ${o.bike_model}`,
                    subtitle: o.customer_name,
                    status: o.status,
                    due_date: o.due_date,
                })
            })

            qcs?.forEach(q => {
                combinedItems.push({
                    id: q.id,
                    type: 'qc',
                    title: `QC: ${q.order_number}`,
                    subtitle: q.bike_model,
                    status: q.status,
                    due_date: q.due_date,
                })
            })

            tasks?.forEach(t => {
                // Filter tasks here to allow logical OR (Due Today OR High Priority)
                const isDue = t.due_date && new Date(t.due_date) <= todayEnd
                const isHighPriority = t.priority === 'high'

                if (isDue || isHighPriority) {
                    combinedItems.push({
                        id: t.id,
                        type: 'task',
                        title: t.title,
                        subtitle: t.description || undefined,
                        status: t.status,
                        due_date: t.due_date,
                        priority: t.priority as any
                    })
                }
            })

            // Sort by priority/urgency
            // Overdue first, then High Priority, then today
            combinedItems.sort((a, b) => {
                const now = new Date().getTime()
                const dateA = a.due_date ? new Date(a.due_date).getTime() : 9999999999999
                const dateB = b.due_date ? new Date(b.due_date).getTime() : 9999999999999

                // If one is overdue and other isn't
                const overdueA = dateA < now
                const overdueB = dateB < now
                if (overdueA && !overdueB) return -1
                if (!overdueA && overdueB) return 1

                // If both same overdue state, check priority
                if (a.priority === 'high' && b.priority !== 'high') return -1
                if (a.priority !== 'high' && b.priority === 'high') return 1

                // Date asc
                return dateA - dateB
            })

            setItems(combinedItems)
            setLoading(false)
        }

        fetchCockpitData()
    }, [workshopId, user, activeEmployee])

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return "Guten Morgen"
        if (hour < 18) return "Guten Tag"
        return "Guten Abend"
    }

    const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Du'

    return (
        <PageTransition>
            <DashboardLayout>
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">
                        {getGreeting()}, <span className="text-primary">{firstName}</span>
                    </h1>
                    <p className="text-muted-foreground">
                        Hier ist dein Fokus für heute, {format(new Date(), "EEEE, d. MMMM", { locale: de })}.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Main Focus Column */}
                    <Card className="col-span-2 border-primary/20 shadow-md bg-gradient-to-br from-card to-primary/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-primary" />
                                Dein Fokus heute
                                <Badge variant="secondary" className="ml-auto">
                                    {items.length} Aufgaben
                                </Badge>
                            </CardTitle>
                            <CardDescription>
                                Aufträge, QCs und wichtige Aufgaben die heute anstehen.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-16 w-full bg-muted/20 animate-pulse rounded-lg" />
                                    ))}
                                </div>
                            ) : items.length > 0 ? (
                                <div className="space-y-3">
                                    {items.map(item => {
                                        const isOverdue = item.due_date && isPast(new Date(item.due_date)) && !isToday(new Date(item.due_date))

                                        return (
                                            <div
                                                key={item.id + item.type}
                                                onClick={() => {
                                                    if (item.type === 'order') navigate(`/dashboard/orders/${item.id}/work`)
                                                    if (item.type === 'qc') navigate(`/dashboard/orders/${item.id}/control`)
                                                    if (item.type === 'task') navigate(`/dashboard/tasks`) // Or open detail
                                                }}
                                                className="group flex items-center justify-between p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-background hover:shadow-sm hover:border-primary/20 transition-all cursor-pointer"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-full ${item.type === 'order' ? 'bg-blue-100 text-blue-600' :
                                                        item.type === 'qc' ? 'bg-purple-100 text-purple-600' :
                                                            'bg-orange-100 text-orange-600'
                                                        }`}>
                                                        {item.type === 'order' && <CheckCircle2 className="h-5 w-5" />}
                                                        {item.type === 'qc' && <Target className="h-5 w-5" />}
                                                        {item.type === 'task' && <ListTodo className="h-5 w-5" />}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-sm flex items-center gap-2">
                                                            {item.title}
                                                            {isOverdue && (
                                                                <Badge variant="destructive" className="h-5 text-[10px] px-1.5">Überfällig</Badge>
                                                            )}
                                                            {item.priority === 'high' && (
                                                                <Badge variant="outline" className="h-5 text-[10px] px-1.5 border-red-200 text-red-600 bg-red-50">Wichtig</Badge>
                                                            )}
                                                        </h4>
                                                        {item.subtitle && (
                                                            <p className="text-xs text-muted-foreground line-clamp-1">{item.subtitle}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {item.due_date && (
                                                        <div className="text-right hidden sm:block">
                                                            <div className={`text-xs font-medium flex items-center justify-end gap-1 ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                                                                <Clock className="h-3 w-3" />
                                                                {format(new Date(item.due_date), "HH:mm")}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground/60">
                                                                {isToday(new Date(item.due_date)) ? 'Heute' : format(new Date(item.due_date), "dd. MMM")}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ArrowRight className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="h-16 w-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle2 className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-emerald-900">Alles erledigt!</h3>
                                    <p className="text-muted-foreground max-w-xs">
                                        Du hast für heute keine offenen Aufgaben oder Aufträge. Großartige Arbeit!
                                    </p>
                                    <Button className="mt-6" variant="outline" onClick={() => navigate('/dashboard')}>
                                        Zum Dashboard
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Stats / Info Column */}
                    <div className="space-y-6">
                        <Card className="bg-blue-50/50 border-blue-100">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-blue-900">Zeit bis Feierabend</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-700">
                                    {/* Placeholder logic for now */}
                                    --:--
                                </div>
                                <p className="text-xs text-blue-600/80 mt-1">
                                    Basierend auf Werkstatt-Öffnungszeiten
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">Schnellzugriff</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-2">
                                <Button variant="outline" className="h-20 flex-col gap-2 hover:border-primary/50 hover:bg-primary/5" onClick={() => navigate('/dashboard?new=true')}>
                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                    <span className="text-xs">Neuer Auftrag</span>
                                </Button>
                                <Button variant="outline" className="h-20 flex-col gap-2 hover:border-primary/50 hover:bg-primary/5" onClick={() => navigate('/dashboard/tasks')}>
                                    <ListTodo className="h-5 w-5 text-orange-500" />
                                    <span className="text-xs">Aufgabe erstellen</span>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}
