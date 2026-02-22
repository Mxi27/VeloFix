import useSWR from "swr"
import { toastSuccess, toastError } from '@/lib/toast-utils'
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { STATUS_COLORS } from "@/lib/constants"
import type { DateRange } from "react-day-picker"
import { DateRangePicker } from "@/components/DateRangePicker"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Eye, UserPlus, Users, X, Check, SlidersHorizontal, RotateCcw as Restore } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface Order {
    id: string
    order_number: string
    customer_name: string
    customer_email: string | null
    bike_model: string | null
    is_leasing: boolean
    status: string
    created_at: string
    estimated_price: number | null
    mechanic_ids: string[] | null
    due_date: string | null
}


type TableMode = 'active' | 'archived' | 'leasing_billing' | 'trash'

interface OrdersTableProps {
    mode?: TableMode
    showArchived?: boolean
}

export function OrdersTable({ mode = 'active', showArchived }: OrdersTableProps) {
    const { workshopId } = useAuth()
    const { employees } = useEmployee()
    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState("")
    const [dateRange, setDateRange] = useState<DateRange | undefined>()
    const [dateFilterType, setDateFilterType] = useState<"created" | "due">("created")
    const [filterStatus, setFilterStatus] = useState("all")
    const [filterEmployee, setFilterEmployee] = useState<string>("all")
    const [orderToDelete, setOrderToDelete] = useState<string | null>(null)
    const [showFilters, setShowFilters] = useState(false)

    const handleDeleteOrder = async () => {
        if (!orderToDelete) return

        try {
            if (effectiveMode === 'trash') {
                const { error } = await supabase
                    .from('orders')
                    .delete()
                    .eq('id', orderToDelete)

                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('orders')
                    .update({ status: 'trash', trash_date: new Date().toISOString() })
                    .eq('id', orderToDelete)

                if (error) throw error
            }

            mutate()
            toastSuccess('Auftrag gelöscht', 'Der Auftrag wurde erfolgreich gelöscht.')
        } catch (error) {
            toastError('Fehler beim Löschen', 'Der Auftrag konnte nicht gelöscht werden.')
        } finally {
            setOrderToDelete(null)
        }
    }

    const handleRestoreOrder = async (orderId: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'eingegangen' }) // Defaulting to 'eingegangen' on restore
                .eq('id', orderId)

            if (error) throw error
            mutate()
            toastSuccess('Auftrag wiederhergestellt', 'Der Auftrag wurde aus dem Papierkorb wiederhergestellt.')
        } catch (error) {
            toastError('Fehler', 'Auftrag konnte nicht wiederhergestellt werden.')
        }
    }

    const handleAssignEmployee = async (orderId: string, employeeId: string | null) => {
        const order = orders.find(o => o.id === orderId)
        if (!order) return

        let newMechanicIds: string[] = []
        if (employeeId) {
            newMechanicIds = [employeeId]
        } else {
            newMechanicIds = []
        }

        const updatedOrders = orders.map(o => o.id === orderId ? { ...o, mechanic_ids: newMechanicIds } : o)
        mutate(updatedOrders, false)

        try {
            const { error } = await supabase
                .from('orders')
                .update({ mechanic_ids: newMechanicIds })
                .eq('id', orderId)

            if (error) throw error
            toastSuccess('Zuweisung aktualisiert', employeeId ? 'Mitarbeiter zugewiesen.' : 'Zuweisung aufgehoben.')
            mutate()
        } catch (error) {
            toastError('Fehler', 'Mitarbeiter konnte nicht zugewiesen werden.')
            mutate()
        }
    }

    const effectiveMode: TableMode = showArchived ? 'archived' : mode

    const fetchOrders = async () => {
        if (!workshopId) return []

        let query = supabase
            .from('orders')
            .select('*')
            .eq('workshop_id', workshopId)
            .order('created_at', { ascending: false })

        if (effectiveMode === 'archived') {
            query = query.eq('status', 'abgeschlossen')
        } else if (effectiveMode === 'leasing_billing') {
            query = query.eq('is_leasing', true).eq('status', 'abgeholt')
        } else if (effectiveMode === 'trash') {
            query = query.eq('status', 'trash')
        } else {
            query = query.neq('status', 'abgeschlossen').neq('status', 'abgeholt').neq('status', 'trash')
        }

        const { data, error } = await query

        if (error) throw error
        return data as Order[]
    }

    const { data: orders = [], isLoading, mutate } = useSWR(
        workshopId ? ['orders', workshopId, effectiveMode] : null,
        fetchOrders,
        {
            refreshInterval: 30000,
            revalidateOnFocus: true
        }
    )

    const loading = isLoading

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.order_number.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus =
            effectiveMode === 'active'
                ? (filterStatus === 'all' ? true : order.status === filterStatus)
                : true

        const matchesEmployee =
            filterEmployee === 'all'
                ? true
                : filterEmployee === 'unassigned'
                    ? (order.mechanic_ids === null || order.mechanic_ids.length === 0)
                    : (order.mechanic_ids && order.mechanic_ids.includes(filterEmployee))

        let matchesDate = true
        if (dateRange?.from) {
            const dateToCompare = dateFilterType === 'created' ? order.created_at : order.due_date

            if (!dateToCompare && dateFilterType === 'due') {
                matchesDate = false
            } else if (dateToCompare) {
                const orderDate = new Date(dateToCompare)
                const from = new Date(dateRange.from)
                from.setHours(0, 0, 0, 0)

                const to = dateRange.to ? new Date(dateRange.to) : new Date(from)
                to.setHours(23, 59, 59, 999)

                matchesDate = orderDate >= from && orderDate <= to
            }
        }

        return matchesSearch && matchesStatus && matchesEmployee && matchesDate
    })

    const handleViewOrder = (orderId: string) => {
        let returnPath = '/dashboard'
        if (effectiveMode === 'archived') returnPath = '/dashboard/archive'
        if (effectiveMode === 'leasing_billing') returnPath = '/dashboard/leasing-billing'

        navigate(`/dashboard/orders/${orderId}`, { state: { from: returnPath } })
    }

    const getEmployeeName = (id: string | null) => {
        if (!id) return null
        return employees.find(e => e.id === id)?.name || "Unbekannt"
    }

    const activeFilterCount = [
        filterStatus !== 'all',
        filterEmployee !== 'all',
        dateRange?.from
    ].filter(Boolean).length

    const renderTable = (ordersToRender: Order[]) => (
        <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-border/60 bg-background shadow-sm">
            <Table className="w-full min-w-[600px] md:min-w-full table-fixed">
                <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/40">
                        <TableHead className="w-[110px] pl-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Nr.</TableHead>
                        <TableHead className="hidden md:table-cell font-semibold text-xs uppercase tracking-wider text-muted-foreground lg:max-w-[150px]">Kunde</TableHead>
                        <TableHead className="hidden lg:table-cell font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fahrrad</TableHead>
                        <TableHead className="hidden xl:table-cell font-semibold text-xs uppercase tracking-wider text-muted-foreground">Mitarbeiter</TableHead>
                        <TableHead className="hidden lg:table-cell font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fertig bis</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                        <TableHead className="hidden xl:table-cell font-semibold text-xs uppercase tracking-wider text-muted-foreground">Erstellt</TableHead>
                        <TableHead className="text-right pr-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Aktion</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ordersToRender.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <Search className="h-8 w-8 opacity-20" />
                                    <p>Keine Aufträge gefunden</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        ordersToRender.map((order) => (
                            <TableRow
                                key={order.id}
                                className="hover:bg-muted/40 cursor-pointer transition-colors border-b border-border/40 last:border-0"
                                onClick={() => handleViewOrder(order.id)}
                            >
                                <TableCell className="w-[110px] pl-4 py-4 font-mono text-sm font-medium text-primary">
                                    {order.order_number}
                                </TableCell>
                                <TableCell className="hidden md:table-cell py-4">
                                    <div className="flex flex-col max-w-[140px] md:max-w-[200px]">
                                        <span className="font-medium text-sm text-foreground truncate">{order.customer_name}</span>
                                        <span className="text-xs text-muted-foreground/80 truncate">
                                            {order.customer_email || '—'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="hidden lg:table-cell py-4 text-sm text-muted-foreground">
                                    <div className="max-w-[120px] truncate">
                                        {order.bike_model || '—'}
                                    </div>
                                </TableCell>
                                <TableCell className="hidden xl:table-cell py-4" onClick={(e) => e.stopPropagation()}>
                                    {order.mechanic_ids && order.mechanic_ids.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {order.mechanic_ids.map(mid => (
                                                <Badge key={mid} variant="outline" className="bg-background">
                                                    {getEmployeeName(mid)}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">—</span>
                                    )}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell py-4 text-xs font-medium">
                                    {order.due_date ? (
                                        <span className={new Date(order.due_date) < new Date() && order.status !== 'abgeholt' && order.status !== 'abgeschlossen' ? "text-red-500 font-bold" : "text-foreground"}>
                                            {new Date(order.due_date).toLocaleDateString('de-DE')}
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground/50">—</span>
                                    )}
                                </TableCell>
                                <TableCell className="py-4">
                                    <Badge
                                        variant="secondary"
                                        className={`capitalize font-normal border ${STATUS_COLORS[order.status] || "bg-muted text-foreground border-border/60"}`}
                                    >
                                        {order.status.replace(/_/g, ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell className="hidden xl:table-cell py-4 text-xs text-muted-foreground font-mono">
                                    {new Date(order.created_at).toLocaleDateString('de-DE')}
                                </TableCell>
                                <TableCell className="text-right pr-4 py-4">
                                    <div className="flex justify-end gap-2">
                                        {effectiveMode === 'trash' ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-primary hover:bg-primary/10 rounded-full"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleRestoreOrder(order.id)
                                                }}
                                                title="Wiederherstellen"
                                            >
                                                <Restore className="h-4 w-4" />
                                            </Button>
                                        ) : (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary rounded-full"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <UserPlus className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Mitarbeiter zuweisen</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleAssignEmployee(order.id, null)
                                                    }}>
                                                        <X className="mr-2 h-4 w-4 text-muted-foreground" />
                                                        <span>Keine Zuweisung</span>
                                                    </DropdownMenuItem>
                                                    {employees.map(emp => (
                                                        <DropdownMenuItem
                                                            key={emp.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleAssignEmployee(order.id, emp.id)
                                                            }}
                                                        >
                                                            <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                                                            <span>{emp.name}</span>
                                                            {order.mechanic_ids && order.mechanic_ids.includes(emp.id) && <Check className="ml-auto h-4 w-4" />}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleViewOrder(order.id)
                                            }}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )

    const getTitle = () => {
        switch (effectiveMode) {
            case 'archived': return "Archivierte Aufträge"
            case 'leasing_billing': return "Leasing Abrechnung (Abgeholt)"
            case 'trash': return "Papierkorb"
            default: return "Aktive Aufträge"
        }
    }

    return (
        <>
            <Card className="border-none shadow-sm bg-card/50">
                <CardHeader className="pb-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <CardTitle className="text-xl font-bold tracking-tight">
                                {getTitle()}
                            </CardTitle>

                            {/* Filter Toggle Button */}
                            <Popover open={showFilters} onOpenChange={setShowFilters}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 bg-background"
                                    >
                                        <SlidersHorizontal className="h-4 w-4" />
                                        Filter
                                        {activeFilterCount > 0 && (
                                            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                                {activeFilterCount}
                                            </Badge>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80" align="end">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold">Filter & Optionen</p>
                                            {(filterStatus !== 'all' || filterEmployee !== 'all' || dateRange) && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => {
                                                        setFilterStatus('all')
                                                        setFilterEmployee('all')
                                                        setDateRange(undefined)
                                                    }}
                                                >
                                                    Alle zurücksetzen
                                                </Button>
                                            )}
                                        </div>

                                        {/* Employee Filter */}
                                        <div className="space-y-2">
                                            <label className="text-xs text-muted-foreground">Mitarbeiter</label>
                                            <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder="Alle Mitarbeiter" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Alle Mitarbeiter</SelectItem>
                                                    <SelectItem value="unassigned">Nicht zugewiesen</SelectItem>
                                                    {employees.map(emp => (
                                                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Date Range Filter */}
                                        <div className="space-y-2">
                                            <label className="text-xs text-muted-foreground">Zeitraum</label>
                                            <div className="flex items-center gap-2">
                                                <Select value={dateFilterType} onValueChange={(v: "created" | "due") => setDateFilterType(v)}>
                                                    <SelectTrigger className="h-9 flex-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="created">Eingang</SelectItem>
                                                        <SelectItem value="due">Fällig</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <DateRangePicker
                                                    date={dateRange}
                                                    setDate={setDateRange}
                                                    className="flex-1"
                                                />
                                            </div>
                                        </div>

                                        {/* Refresh Button */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => mutate()}
                                            disabled={loading}
                                            className="w-full justify-start"
                                        >
                                            <Filter className="mr-2 h-4 w-4" />
                                            {loading ? "Lädt..." : "Aktualisieren"}
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Suche nach Kunde, Auftragsnummer oder Modell..."
                                className="pl-10 bg-background"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {effectiveMode === 'active' ? (
                        <Tabs defaultValue="all" className="space-y-6" onValueChange={setFilterStatus}>
                            <TabsList variant="line" className="w-full overflow-x-auto flex-nowrap justify-start no-scrollbar pb-1">
                                <TabsTrigger value="all" className="whitespace-nowrap">Alle</TabsTrigger>
                                <TabsTrigger value="eingegangen" className="whitespace-nowrap">Eingegangen</TabsTrigger>
                                <TabsTrigger value="warten_auf_teile" className="whitespace-nowrap">Warten auf Teile</TabsTrigger>
                                <TabsTrigger value="in_bearbeitung" className="whitespace-nowrap">In Bearbeitung</TabsTrigger>
                                <TabsTrigger value="kontrolle_offen" className="whitespace-nowrap">Kontrolle offen</TabsTrigger>
                                <TabsTrigger value="abholbereit" className="whitespace-nowrap">Abholbereit</TabsTrigger>
                            </TabsList>

                            <TabsContent value="all" className="mt-0">
                                {renderTable(filteredOrders)}
                            </TabsContent>
                            <TabsContent value="eingegangen" className="mt-0">
                                {renderTable(filteredOrders)}
                            </TabsContent>
                            <TabsContent value="warten_auf_teile" className="mt-0">
                                {renderTable(filteredOrders)}
                            </TabsContent>
                            <TabsContent value="in_bearbeitung" className="mt-0">
                                {renderTable(filteredOrders)}
                            </TabsContent>
                            <TabsContent value="kontrolle_offen" className="mt-0">
                                {renderTable(filteredOrders)}
                            </TabsContent>
                            <TabsContent value="abholbereit" className="mt-0">
                                {renderTable(filteredOrders)}
                            </TabsContent>
                        </Tabs>
                    ) : (
                        <div className="space-y-6">
                            {renderTable(filteredOrders)}
                        </div>
                    )}
                </CardContent>

                <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Auftrag wirklich löschen?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {effectiveMode === 'trash'
                                    ? "Diese Aktion kann nicht rückgängig gemacht werden. Der Auftrag wird dauerhaft aus der Datenbank entfernt."
                                    : "Der Auftrag wird in den Papierkorb verschoben und nach 30 Tagen automatisch endgültig gelöscht."}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteOrder}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            >
                                {effectiveMode === 'trash' ? "Endgültig löschen" : "Verschieben"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </Card>
        </>
    )
}
