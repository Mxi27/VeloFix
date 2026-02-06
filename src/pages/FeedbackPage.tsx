import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Star, MessageSquare, Wrench, Bike, Calendar, Loader2, Users, Check, ChevronsUpDown } from "lucide-react"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "../components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function FeedbackPage() {
    const { workshopId } = useAuth()
    const { activeEmployee, employees } = useEmployee()
    const navigate = useNavigate()

    // View state: 'all' or specific employee ID
    // Default to active employee if set, otherwise 'all'
    const [viewEmployeeId, setViewEmployeeId] = useState<string | 'all'>(activeEmployee?.id || 'all')
    const [openCombobox, setOpenCombobox] = useState(false)

    const [loading, setLoading] = useState(false)
    const [repairFeedback, setRepairFeedback] = useState<any[]>([])
    const [buildFeedback, setBuildFeedback] = useState<any[]>([])

    // Sync view with activeEmployee if it changes (debated behavior, but consistent for Kiosk)
    useEffect(() => {
        if (activeEmployee) {
            setViewEmployeeId(activeEmployee.id)
        }
    }, [activeEmployee])

    const currentViewEmployee = employees.find(e => e.id === viewEmployeeId)

    useEffect(() => {
        const fetchData = async () => {
            if (!workshopId) return

            setLoading(true)
            try {
                // Prepare base query for Orders (Repairs)
                let ordersQuery = supabase
                    .from('orders')
                    .select('*')
                    .eq('workshop_id', workshopId)
                    .not('end_control', 'is', null)
                    .order('created_at', { ascending: false })

                // Apply filter if not 'all'
                if (viewEmployeeId !== 'all') {
                    ordersQuery = ordersQuery.eq('assigned_employee_id', viewEmployeeId)
                }

                const { data: orders, error: ordersError } = await ordersQuery
                if (ordersError) throw ordersError

                const validRepairs = orders.filter((o: any) =>
                    o.end_control?.rating && o.end_control?.completed
                ).map((o: any) => ({
                    id: o.id,
                    title: o.order_number,
                    subtitle: o.bike_model,
                    date: o.end_control.last_updated || o.updated_at,
                    rating: o.end_control.rating,
                    feedback: o.end_control.feedback,
                    type: 'repair',
                    assigned_employee_id: o.assigned_employee_id
                }))
                setRepairFeedback(validRepairs)


                // Prepare base query for Build Feedback (Neurad)
                const { data: builds, error: buildsError } = await supabase
                    .from('bike_builds')
                    .select('*')
                    .eq('workshop_id', workshopId)
                    .not('control_data', 'is', null)
                    .order('created_at', { ascending: false })

                if (buildsError) throw buildsError

                const validBuilds = builds.filter((b: any) => {
                    const hasRating = b.control_data?.rating && b.control_data?.completed

                    if (viewEmployeeId === 'all') return hasRating

                    // Filter by builder
                    const isBuilder = b.assembly_progress?.last_actor?.id === viewEmployeeId
                    return isBuilder && hasRating
                }).map((b: any) => ({
                    id: b.id,
                    title: `${b.brand} ${b.model}`,
                    subtitle: b.internal_number || 'Ohne Nummer',
                    date: b.control_data.last_updated || b.updated_at,
                    rating: b.control_data.rating,
                    feedback: b.control_data.feedback,
                    inspector: b.control_data.inspector?.name,
                    type: 'build',
                    // Try to guess builder name for 'all' view
                    last_actor_name: b.assembly_progress?.last_actor?.name
                }))
                setBuildFeedback(validBuilds)

            } catch (error) {
                console.error("Error fetching feedback:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [workshopId, viewEmployeeId])

    const allFeedback = [...repairFeedback, ...buildFeedback].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    const avgRating = allFeedback.length > 0
        ? (allFeedback.reduce((acc, curr) => acc + curr.rating, 0) / allFeedback.length).toFixed(1)
        : "0.0"

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto space-y-8 pb-10">

                {/* Header & Smart Selector */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight">Feedback Center</h2>
                        <p className="text-muted-foreground">
                            Bewertungen und Qualitäts-Checks
                        </p>
                    </div>

                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openCombobox}
                                className="w-[250px] justify-between h-10 shadow-sm border-input/60 hover:bg-muted/50"
                            >
                                {viewEmployeeId === 'all' ? (
                                    <span className="flex items-center gap-2">
                                        <div className="bg-primary/10 p-1 rounded-sm">
                                            <Users className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                        <span>Alle Mitarbeiter</span>
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <Avatar className="h-5 w-5 border border-border/50">
                                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                                {currentViewEmployee?.initials || currentViewEmployee?.name.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span>{currentViewEmployee?.name}</span>
                                    </span>
                                )}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[250px] p-0" align="end">
                            <Command>
                                <CommandInput placeholder="Mitarbeiter suchen..." />
                                <CommandList>
                                    <CommandEmpty>Kein Mitarbeiter gefunden.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem
                                            value="all"
                                            onSelect={() => {
                                                setViewEmployeeId('all')
                                                setOpenCombobox(false)
                                            }}
                                            className="cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2 flex-1">
                                                <div className="flex bg-primary/10 items-center justify-center h-6 w-6 rounded-md">
                                                    <Users className="h-3.5 w-3.5 text-primary" />
                                                </div>
                                                <span>Alle Mitarbeiter</span>
                                            </div>
                                            {viewEmployeeId === 'all' && <Check className="ml-auto h-4 w-4 text-primary" />}
                                        </CommandItem>
                                    </CommandGroup>
                                    <CommandSeparator />
                                    <CommandGroup heading="Mitarbeiter">
                                        {employees.map((employee) => (
                                            <CommandItem
                                                key={employee.id}
                                                value={employee.name}
                                                onSelect={() => {
                                                    setViewEmployeeId(employee.id)
                                                    setOpenCombobox(false)
                                                }}
                                                className="cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2 flex-1">
                                                    <Avatar className="h-6 w-6 border border-border/50">
                                                        <AvatarFallback
                                                            className="text-[10px]"
                                                            style={{ backgroundColor: `${employee.color}20`, color: employee.color || 'inherit' }}
                                                        >
                                                            {employee.initials || employee.name.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span>{employee.name}</span>
                                                </div>
                                                {viewEmployeeId === employee.id && <Check className="ml-auto h-4 w-4 text-primary" />}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Metrics */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border-indigo-200/20 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Ø Bewertung</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold tracking-tight">{avgRating}</span>
                                <span className="text-muted-foreground text-sm">/ 5.0</span>
                            </div>
                            <div className="flex gap-0.5 mt-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={cn(
                                            "h-4 w-4 transition-all",
                                            star <= Math.round(parseFloat(avgRating))
                                                ? "fill-yellow-400 text-yellow-400 scale-110"
                                                : "text-muted-foreground/20"
                                        )}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Reparaturen</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tracking-tight">{repairFeedback.length}</div>
                            <p className="text-xs text-muted-foreground mt-1">Bewertete Aufträge</p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Neuradaufbau</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tracking-tight">{buildFeedback.length}</div>
                            <p className="text-xs text-muted-foreground mt-1">Kontrollierte Aufbauten</p>
                        </CardContent>
                    </Card>
                </div>


                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Tabs defaultValue="all" className="w-full">
                        <TabsList className="bg-muted/50 w-full sm:w-auto p-1 h-auto grid grid-cols-3 sm:inline-flex">
                            <TabsTrigger value="all" className="py-2">Alle ({allFeedback.length})</TabsTrigger>
                            <TabsTrigger value="repairs" className="py-2">Reparaturen ({repairFeedback.length})</TabsTrigger>
                            <TabsTrigger value="builds" className="py-2">Neurad ({buildFeedback.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="all" className="mt-6 space-y-4">
                            {allFeedback.length === 0 ? <EmptyFeedbackState /> : allFeedback.map((item) => <FeedbackCard key={`${item.type}-${item.id}`} item={item} navigate={navigate} />)}
                        </TabsContent>

                        <TabsContent value="repairs" className="mt-6 space-y-4">
                            {repairFeedback.length === 0 ? <EmptyFeedbackState /> : repairFeedback.map((item) => <FeedbackCard key={`repair-${item.id}`} item={item} navigate={navigate} />)}
                        </TabsContent>

                        <TabsContent value="builds" className="mt-6 space-y-4">
                            {buildFeedback.length === 0 ? <EmptyFeedbackState /> : buildFeedback.map((item) => <FeedbackCard key={`build-${item.id}`} item={item} navigate={navigate} />)}
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </DashboardLayout>
    )
}

function FeedbackCard({ item, navigate }: { item: any, navigate: any }) {
    const { employees } = useEmployee()

    // Resolve employee name if viewing 'all'
    const employeeName = employees.find(e => e.id === item.assigned_employee_id)?.name || item.last_actor_name

    const handleClick = () => {
        if (item.type === 'repair') {
            navigate(`/dashboard/orders/${item.id}`)
        } else {
            navigate(`/dashboard/bike-builds/${item.id}`)
        }
    }

    return (
        <Card
            className="overflow-hidden transition-all hover:shadow-md cursor-pointer group border-l-4 hover:border-l-[6px]"
            style={{
                borderLeftColor: item.rating >= 4 ? '#22c55e' : (item.rating >= 3 ? '#eab308' : '#ef4444')
            }}
            onClick={handleClick}
        >
            <div className="flex flex-col sm:flex-row">
                <div className="flex-1 p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn(
                                    "text-[10px] px-2 py-0.5 h-5",
                                    item.type === 'repair' ? "bg-blue-500/10 text-blue-600 border-blue-200" : "bg-purple-500/10 text-purple-600 border-purple-200"
                                )}>
                                    {item.type === 'repair' ? <Wrench className="w-3 h-3 mr-1" /> : <Bike className="w-3 h-3 mr-1" />}
                                    {item.type === 'repair' ? 'Reparatur' : 'Neurad'}
                                </Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {item.date ? format(new Date(item.date), "d. MMM yyyy", { locale: de }) : 'Datum unbekannt'}
                                </span>
                            </div>
                            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors flex items-center gap-2 flex-wrap">
                                {item.title}
                                {employeeName && (
                                    <Badge variant="secondary" className="font-normal text-muted-foreground text-xs">
                                        {employeeName}
                                    </Badge>
                                )}
                            </h3>
                            <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                        </div>

                        <div className="flex items-center gap-1 bg-muted/50 px-3 py-1.5 rounded-full self-start">
                            <span className="font-bold text-lg">{item.rating}</span>
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        </div>
                    </div>

                    {item.feedback ? (
                        <div className="bg-muted/30 p-3 sm:p-4 rounded-lg border border-border/40 relative">
                            <MessageSquare className="w-4 h-4 text-muted-foreground absolute top-3 left-3 sm:top-4 sm:left-4" />
                            <p className="text-sm pl-6 sm:pl-7 text-foreground/90 italic leading-relaxed">"{item.feedback}"</p>
                            {item.inspector && (
                                <p className="text-xs text-muted-foreground text-right mt-2 font-medium">— {item.inspector}</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground italic px-1">Kein Text-Feedback hinterlassen.</p>
                    )}
                </div>
            </div>
        </Card>
    )
}

function EmptyFeedbackState() {
    return (
        <div className="text-center py-12 bg-muted/5 rounded-lg border-2 border-dashed border-muted-foreground/10">
            <div className="bg-muted/20 p-4 rounded-full w-fit mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold">Kein Feedback gefunden</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mt-1">
                Für den ausgewählten Zeitraum oder Mitarbeiter liegen keine Bewertungen vor.
            </p>
        </div>
    )
}
