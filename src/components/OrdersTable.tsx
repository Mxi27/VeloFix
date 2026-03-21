import useSWR from "swr"
import { toastSuccess, toastError } from '@/lib/toast-utils'
import { useState, useMemo } from "react"
import { useColumnVisibility } from "@/hooks/useColumnVisibility"
import { useNavigate } from "react-router-dom"
import { STATUS_COLORS, STATUS_LABELS, STATUS_DOT_COLORS_MAP } from "@/lib/constants"
import type { DateRange } from "react-day-picker"
import { DateRangePicker } from "@/components/DateRangePicker"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

import { Button } from "@/components/ui/button"
import { 
    Search, Users, X, Check, SlidersHorizontal, RotateCcw as Restore, 
    Settings2, MoreHorizontal, 
    Trash2, ExternalLink
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { OrdersTableSkeleton } from "@/components/skeletons/OrdersTableSkeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem,
    DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface Order {
    id: string
    order_number: string
    customer_name: string
    customer_email: string | null
    bike_brand: string | null
    bike_model: string | null
    bike_color: string | null
    is_leasing: boolean
    status: string
    created_at: string
    estimated_price: number | null
    mechanic_ids: string[] | null
    due_date: string | null
    tags: string[] | null
}

const COLUMN_STORAGE_KEY = 'velofix-orders-table-columns-v1'

const AVAILABLE_COLUMNS = [
    { id: 'order_number', label: 'Nr.', defaultVisible: true },
    { id: 'customer', label: 'Kunde', defaultVisible: true },
    { id: 'bike', label: 'Fahrrad', defaultVisible: true },
    { id: 'mechanic', label: 'Mitarbeiter', defaultVisible: true },
    { id: 'due_date', label: 'Fällig', defaultVisible: true },
    { id: 'status', label: 'Status', defaultVisible: true },
    { id: 'created_at', label: 'Erstellt', defaultVisible: true },
    { id: 'actions', label: 'Aktionen', defaultVisible: true },
] as const

type ColumnId = typeof AVAILABLE_COLUMNS[number]['id']
type TableMode = 'active' | 'archived' | 'leasing_billing' | 'trash'

interface OrdersTableProps {
    mode?: TableMode
    showArchived?: boolean
}

const STATUS_TABS = [
    { value: 'all',             label: 'Alle' },
    { value: 'eingegangen',     label: 'Eingegangen' },
    { value: 'warten_auf_teile',label: 'Teile' },
    { value: 'in_bearbeitung',  label: 'In Arbeit' },
    { value: 'kontrolle_offen', label: 'Kontrolle' },
    { value: 'abholbereit',     label: 'Abholbereit' },
]

const STATUS_DOT = STATUS_DOT_COLORS_MAP

function getOrderStatusInfo(status: string) {
    const label = STATUS_LABELS[status] || status.replace(/_/g, ' ')
    const color = STATUS_COLORS[status] || "bg-neutral-500/10 text-neutral-500"
    const dotColor = STATUS_DOT[status] || "bg-neutral-400"
    return { label, color, dotColor }
}

export function OrdersTable({ mode = 'active', showArchived }: OrdersTableProps) {
    const { workshopId } = useAuth()
    const { employees } = useEmployee()
    const navigate = useNavigate()

    const [searchTerm, setSearchTerm] = useState("")
    const [showFilters, setShowFilters] = useState(false)
    const [dateRange, setDateRange] = useState<DateRange | undefined>()
    const [dateFilterType, setDateFilterType] = useState<"created" | "due">("created")
    const [filterStatus, setFilterStatus] = useState("all")
    const [filterEmployee, setFilterEmployee] = useState<string>("all")
    const [filterTags, setFilterTags] = useState<string[]>([])
    const [orderToDelete, setOrderToDelete] = useState<string | null>(null)
    const [sortField, setSortField] = useState<"created_at" | "due_date" | "customer_name" | "status" | "none">("none")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

    const { visibleColumns, toggleColumn } = useColumnVisibility<ColumnId>(COLUMN_STORAGE_KEY, AVAILABLE_COLUMNS)

    const fetchTags = async () => {
        if (!workshopId) return []
        const { data, error } = await supabase.from('workshop_tags').select('*').eq('workshop_id', workshopId)
        if (error) throw error
        return data || []
    }
    const { data: workshopTags = [] } = useSWR(
        workshopId ? ['workshop_tags', workshopId] : null,
        fetchTags
    )

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
        { refreshInterval: 30000, revalidateOnFocus: true }
    )

    const statusCounts = useMemo(() => ({
        all: orders.length,
        eingegangen:      orders.filter(o => o.status === 'eingegangen').length,
        warten_auf_teile: orders.filter(o => o.status === 'warten_auf_teile').length,
        in_bearbeitung:   orders.filter(o => o.status === 'in_bearbeitung').length,
        kontrolle_offen:  orders.filter(o => o.status === 'kontrolle_offen').length,
        abholbereit:      orders.filter(o => o.status === 'abholbereit').length,
    }), [orders])

    const handleDeleteOrder = async () => {
        if (!orderToDelete) return
        try {
            if (effectiveMode === 'trash') {
                const { error } = await supabase.from('orders').delete().eq('id', orderToDelete)
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
        } catch {
            toastError('Fehler beim Löschen', 'Der Auftrag konnte nicht gelöscht werden.')
        } finally {
            setOrderToDelete(null)
        }
    }

    const handleRestoreOrder = async (orderId: string) => {
        try {
            const { error } = await supabase.from('orders').update({ status: 'eingegangen' }).eq('id', orderId)
            if (error) throw error
            mutate()
            toastSuccess('Wiederhergestellt', 'Auftrag aus dem Papierkorb wiederhergestellt.')
        } catch {
            toastError('Fehler', 'Auftrag konnte nicht wiederhergestellt werden.')
        }
    }

    const handleAssignEmployee = async (orderId: string, employeeId: string | null) => {
        const order = orders.find(o => o.id === orderId)
        if (!order) return
        const newMechanicIds = employeeId ? [employeeId] : []
        const updatedOrders = orders.map(o => o.id === orderId ? { ...o, mechanic_ids: newMechanicIds } : o)
        mutate(updatedOrders, false)
        try {
            const { error } = await supabase.from('orders').update({ mechanic_ids: newMechanicIds }).eq('id', orderId)
            if (error) throw error
            toastSuccess('Zuweisung aktualisiert', employeeId ? 'Mitarbeiter zugewiesen.' : 'Zuweisung aufgehoben.')
            mutate()
        } catch {
            toastError('Fehler', 'Mitarbeiter konnte nicht zugewiesen werden.')
            mutate()
        }
    }

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
        filterEmployee !== 'all',
        dateRange?.from,
        filterTags.length > 0,
        sortField !== 'none',
        filterStatus !== 'all' && effectiveMode === 'active',
    ].filter(Boolean).length

    const hasActiveFilters = searchTerm || activeFilterCount > 0

    const filteredOrders = orders.filter(order => {
        const searchKeywords = searchTerm.toLowerCase().split(/\s+/).filter(Boolean)
        const matchesSearch = searchKeywords.length === 0 || searchKeywords.every(keyword => {
            return (
                order.customer_name.toLowerCase().includes(keyword) ||
                order.order_number.toLowerCase().includes(keyword) ||
                order.bike_brand?.toLowerCase().includes(keyword) ||
                order.bike_model?.toLowerCase().includes(keyword) ||
                order.bike_color?.toLowerCase().includes(keyword) ||
                order.tags?.some(tagId => {
                    const tag = workshopTags.find((t: any) => t.id === tagId)
                    return tag?.name.toLowerCase().includes(keyword)
                })
            )
        })

        const matchesStatus = effectiveMode === 'active'
            ? (filterStatus === 'all' ? true : order.status === filterStatus)
            : true

        const matchesEmployee = filterEmployee === 'all'
            ? true
            : filterEmployee === 'unassigned'
                ? (!order.mechanic_ids || order.mechanic_ids.length === 0)
                : (order.mechanic_ids?.includes(filterEmployee) ?? false)

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

        const matchesTags = filterTags.length === 0 ||
            (order.tags && filterTags.some(tagId => order.tags!.includes(tagId)))

        return matchesSearch && matchesStatus && matchesEmployee && matchesDate && matchesTags
    }).sort((a, b) => {
        if (sortField === "none") return 0
        if (sortField === "customer_name") {
            return sortDir === "asc"
                ? a.customer_name.localeCompare(b.customer_name)
                : b.customer_name.localeCompare(a.customer_name)
        }
        if (sortField === "status") {
            return sortDir === "asc"
                ? a.status.localeCompare(b.status)
                : b.status.localeCompare(a.status)
        }
        const aVal = a[sortField]
        const bVal = b[sortField]
        if (aVal === bVal) return 0
        if (aVal === null) return 1
        if (bVal === null) return -1
        const diff = new Date(aVal).getTime() - new Date(bVal).getTime()
        return sortDir === "asc" ? diff : -diff
    })


    // Dynamic responsive logic matching BikeAssemblyTable
    const enabledCount = Object.values(visibleColumns).filter(Boolean).length
    const getResponsiveClass = (colId: ColumnId) => {
        if (colId === 'order_number' || colId === 'status' || colId === 'actions') return ""

        if (enabledCount <= 4) {
            if (colId === 'customer') return "sm:table-cell"
            if (colId === 'due_date') return "md:table-cell"
            return "lg:table-cell"
        }

        switch (colId) {
            case 'customer': return "sm:table-cell"
            case 'bike': return "lg:table-cell"
            case 'mechanic': return "xl:table-cell"
            case 'due_date': return "md:table-cell"
            case 'created_at': return "xl:table-cell"
            default: return ""
        }
    }

    if (isLoading) return <OrdersTableSkeleton />

    const renderTable = (ordersToRender: Order[]) => (
        <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-border/40 bg-background">
            <Table className="w-full table-fixed">
                <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/30">
                        {visibleColumns.order_number && (
                            <TableHead className="w-[90px] md:w-[130px] pl-4 md:pl-5 text-[10px] uppercase tracking-wider text-muted-foreground/40 font-semibold">
                                Nr.
                            </TableHead>
                        )}
                        {visibleColumns.customer && (
                            <TableHead className={cn("hidden px-3 md:px-4 text-[10px] uppercase tracking-wider text-muted-foreground/40 font-semibold min-w-[140px] max-w-[25vw]", getResponsiveClass('customer'))}>
                                Kunde
                            </TableHead>
                        )}
                        {visibleColumns.bike && (
                            <TableHead className={cn("hidden px-3 md:px-4 text-[10px] uppercase tracking-wider text-muted-foreground/40 font-semibold min-w-[140px]", getResponsiveClass('bike'))}>
                                Fahrrad
                            </TableHead>
                        )}
                        {visibleColumns.mechanic && (
                            <TableHead className={cn("hidden px-3 md:px-4 text-[10px] uppercase tracking-wider text-muted-foreground/40 font-semibold min-w-[120px]", getResponsiveClass('mechanic'))}>
                                Mitarbeiter
                            </TableHead>
                        )}
                        {visibleColumns.due_date && (
                            <TableHead className={cn("hidden px-3 md:px-4 text-[10px] uppercase tracking-wider text-muted-foreground/40 font-semibold w-[100px]", getResponsiveClass('due_date'))}>
                                Fällig
                            </TableHead>
                        )}
                        {visibleColumns.status && (
                            <TableHead className="px-3 text-[10px] uppercase tracking-wider text-muted-foreground/40 font-semibold w-[130px] md:w-[140px] min-w-[130px]">
                                Status
                            </TableHead>
                        )}
                        {visibleColumns.created_at && (
                            <TableHead className={cn("hidden px-3 md:px-4 text-[10px] uppercase tracking-wider text-muted-foreground/40 font-semibold w-[90px]", getResponsiveClass('created_at'))}>
                                Erstellt
                            </TableHead>
                        )}
                        {visibleColumns.actions && (
                            <TableHead className="w-[52px] min-w-[52px]" />
                        )}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ordersToRender.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="h-36 text-center text-muted-foreground">
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <Search className="h-8 w-8 opacity-20" />
                                    <p className="text-sm">Keine Aufträge gefunden</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        ordersToRender.map(order => {
                            const statusInfo = getOrderStatusInfo(order.status)
                            const isOverdue = order.due_date &&
                                new Date(order.due_date) < new Date() &&
                                !['abgeholt', 'abgeschlossen'].includes(order.status)
                            return (
                                <TableRow
                                    key={order.id}
                                    className="group hover:bg-accent/40 cursor-pointer transition-colors duration-100 border-b border-border/20 last:border-0"
                                    onClick={() => handleViewOrder(order.id)}
                                >
                                    {/* Nr. */}
                                    {visibleColumns.order_number && (
                                        <TableCell className="w-[90px] md:w-[130px] pl-4 md:pl-5 py-3">
                                            <span className="font-mono text-[11px] font-semibold text-muted-foreground/70 tracking-tight">
                                                {order.order_number}
                                            </span>
                                        </TableCell>
                                    )}

                                    {/* Kunde */}
                                    {visibleColumns.customer && (
                                        <TableCell className={cn("hidden py-3 px-3 md:px-4 min-w-[140px] max-w-[25vw]", getResponsiveClass('customer'))}>
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-foreground truncate">{order.customer_name}</span>
                                                    {order.is_leasing && (
                                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary shrink-0 uppercase tracking-wider">
                                                            Leasing
                                                        </span>
                                                    )}
                                                </div>
                                                {order.tags && order.tags.length > 0 && (
                                                    <div className="flex gap-1">
                                                        {order.tags.slice(0, 2).map(tagId => {
                                                            const tagInfo = workshopTags.find((t: any) => t.id === tagId)
                                                            if (!tagInfo) return null
                                                            return (
                                                                <span
                                                                    key={tagId}
                                                                    className="inline-flex rounded-sm px-1.5 py-px text-[9px] font-bold text-white uppercase tracking-wider"
                                                                    style={{ backgroundColor: tagInfo.color }}
                                                                >
                                                                    {tagInfo.name}
                                                                </span>
                                                            )
                                                        })}
                                                        {order.tags.length > 2 && (
                                                            <span className="text-[9px] text-muted-foreground font-medium">+{order.tags.length - 2}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                    )}

                                    {/* Fahrrad */}
                                    {visibleColumns.bike && (
                                        <TableCell className={cn("hidden py-3 px-3 md:px-4", getResponsiveClass('bike'))}>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm text-foreground/80 font-medium truncate max-w-[180px]">
                                                    {[order.bike_brand, order.bike_model].filter(Boolean).join(' ') || <span className="text-muted-foreground/30">—</span>}
                                                </span>
                                                {order.bike_color && (
                                                    <span className="text-[11px] text-muted-foreground/60 leading-tight truncate max-w-[180px]">
                                                        {order.bike_color}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                    )}

                                    {/* Mitarbeiter */}
                                    {visibleColumns.mechanic && (
                                        <TableCell className={cn("hidden py-3 px-3 md:px-4", getResponsiveClass('mechanic'))} onClick={e => e.stopPropagation()}>
                                            {order.mechanic_ids && order.mechanic_ids.length > 0 ? (
                                                <div className="flex items-center gap-1">
                                                    {order.mechanic_ids.slice(0, 3).map(mid => {
                                                        const name = getEmployeeName(mid)
                                                        const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'
                                                        return (
                                                            <span
                                                                key={mid}
                                                                title={name || undefined}
                                                                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground border border-border/50 shrink-0"
                                                            >
                                                                {initials}
                                                            </span>
                                                        )
                                                    })}
                                                    {order.mechanic_ids.length > 3 && (
                                                        <span className="text-[10px] text-muted-foreground font-medium ml-0.5">+{order.mechanic_ids.length - 3}</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[12px] text-muted-foreground/25">—</span>
                                            )}
                                        </TableCell>
                                    )}

                                    {/* Fällig */}
                                    {visibleColumns.due_date && (
                                        <TableCell className={cn("hidden py-3 px-3 md:px-4", getResponsiveClass('due_date'))}>
                                            {order.due_date ? (
                                                <span className={cn(
                                                    "inline-flex items-center text-[11px] font-mono font-medium px-1.5 py-0.5 rounded-md",
                                                    isOverdue
                                                        ? "text-red-500 bg-red-500/8 border border-red-500/20"
                                                        : "text-muted-foreground"
                                                )}>
                                                    {isOverdue && <span className="mr-1 h-1 w-1 rounded-full bg-red-500 inline-block" />}
                                                    {new Date(order.due_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground/20 text-[12px]">—</span>
                                            )}
                                        </TableCell>
                                    )}

                                    {/* Status */}
                                    {visibleColumns.status && (
                                        <TableCell className="py-3 px-3 w-[130px] md:w-[140px]">
                                            <span
                                                className={cn(
                                                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap",
                                                    statusInfo.color
                                                )}
                                            >
                                                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusInfo.dotColor)} />
                                                {statusInfo.label}
                                            </span>
                                        </TableCell>
                                    )}

                                    {/* Erstellt */}
                                    {visibleColumns.created_at && (
                                        <TableCell className={cn("hidden py-3 px-3 md:px-4", getResponsiveClass('created_at'))}>
                                            <span className="text-[11px] text-muted-foreground/60 font-mono">
                                                {new Date(order.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                            </span>
                                        </TableCell>
                                    )}

                                    {/* Aktionen — nur ⋯ Menü, sichtbar on hover */}
                                    {visibleColumns.actions && (
                                        <TableCell className="text-right pr-3 py-3 w-[52px]">
                                            {effectiveMode === 'trash' ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary rounded-full transition-opacity"
                                                    onClick={(e) => { e.stopPropagation(); handleRestoreOrder(order.id) }}
                                                    title="Wiederherstellen"
                                                >
                                                    <Restore className="h-3.5 w-3.5" />
                                                </Button>
                                            ) : (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground rounded-md transition-all"
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-52">
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewOrder(order.id) }}>
                                                            <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
                                                            Öffnen
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuLabel>Zuweisen an</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={e => { e.stopPropagation(); handleAssignEmployee(order.id, null) }}>
                                                            <X className="mr-2 h-4 w-4 text-muted-foreground" />
                                                            <span>Keine Zuweisung</span>
                                                        </DropdownMenuItem>
                                                        {employees.map(emp => (
                                                            <DropdownMenuItem
                                                                key={emp.id}
                                                                onClick={e => { e.stopPropagation(); handleAssignEmployee(order.id, emp.id) }}
                                                            >
                                                                <Users className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                                                                <span className="truncate flex-1">{emp.name}</span>
                                                                {order.mechanic_ids?.includes(emp.id) && <Check className="ml-auto h-4 w-4 shrink-0" />}
                                                            </DropdownMenuItem>
                                                        ))}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={(e) => { e.stopPropagation(); setOrderToDelete(order.id) }}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4 shrink-0" />
                                                            Löschen
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            )
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    )

    return (
        <div className="space-y-3">
            {/* ── Toolbar ── */}
            <div className="flex items-center gap-2">
                {/* Search */}
                <div className="flex flex-1 items-center gap-2 min-w-0 rounded-lg border border-border/40 bg-muted/20 px-3 py-1.5 focus-within:border-border/80 focus-within:bg-background transition-all">
                    <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                    <input
                        placeholder="Suche nach Kunde, Nr., Modell..."
                        className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Toolbar actions */}
                <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border/30 bg-muted/10 px-1 py-0.5">
                                {/* Filter Toggle */}
                                <Popover open={showFilters} onOpenChange={setShowFilters}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 relative text-muted-foreground hover:text-foreground rounded"
                                            title="Filter & Sortierung"
                                        >
                                            <SlidersHorizontal className="h-3.5 w-3.5" />
                                            {activeFilterCount > 0 && (
                                                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                                                    {activeFilterCount}
                                                </span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80" align="end">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold">Filter & Optionen</p>
                                                {activeFilterCount > 0 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs"
                                                        onClick={() => {
                                                            setFilterEmployee('all')
                                                            setDateRange(undefined)
                                                            setFilterTags([])
                                                            setSortField('none')
                                                            setSortDir('desc')
                                                            if (effectiveMode === 'active') setFilterStatus('all')
                                                        }}
                                                    >
                                                        Alle zurücksetzen
                                                    </Button>
                                                )}
                                            </div>

                                            {/* Sortierung */}
                                            <div className="space-y-2">
                                                <label className="text-xs text-muted-foreground">Sortierung</label>
                                                <div className="flex items-center gap-2">
                                                    <Select value={sortField} onValueChange={(v: any) => setSortField(v)}>
                                                        <SelectTrigger className="h-9 flex-1">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">Standard</SelectItem>
                                                            <SelectItem value="customer_name">Kunde (A-Z)</SelectItem>
                                                            <SelectItem value="created_at">Erstellt am</SelectItem>
                                                            <SelectItem value="due_date">Fällig am</SelectItem>
                                                            <SelectItem value="status">Status</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Select value={sortDir} onValueChange={(v: "asc" | "desc") => setSortDir(v)} disabled={sortField === "none"}>
                                                        <SelectTrigger className="h-9 w-[110px]">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="desc">Absteigend</SelectItem>
                                                            <SelectItem value="asc">Aufsteigend</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
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
                                                <div className="flex gap-2">
                                                    <Select value={dateFilterType} onValueChange={(v: "created" | "due") => setDateFilterType(v)}>
                                                        <SelectTrigger className="h-9 flex-1">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="created">Eingang</SelectItem>
                                                            <SelectItem value="due">Fällig</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <DateRangePicker date={dateRange} setDate={setDateRange} className="flex-1" />
                                                </div>
                                            </div>

                                            {/* Tags Filter */}
                                            {workshopTags.length > 0 && (
                                                <div className="space-y-2">
                                                    <label className="text-xs text-muted-foreground">Tags</label>
                                                    <div className="flex flex-wrap gap-1.5 p-1">
                                                        {workshopTags.map((tag: any) => {
                                                            const isSelected = filterTags.includes(tag.id)
                                                            return (
                                                                <button
                                                                    key={tag.id}
                                                                    onClick={(e) => {
                                                                        e.preventDefault()
                                                                        setFilterTags(prev =>
                                                                            prev.includes(tag.id)
                                                                                ? prev.filter(id => id !== tag.id)
                                                                                : [...prev, tag.id]
                                                                        )
                                                                    }}
                                                                    className={cn(
                                                                        "inline-flex items-center rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all",
                                                                        isSelected ? "shadow-sm ring-1 ring-offset-1 ring-offset-background" : "opacity-50 hover:opacity-100"
                                                                    )}
                                                                    style={{ 
                                                                        backgroundColor: tag.color, 
                                                                        color: '#fff',
                                                                        borderColor: tag.color 
                                                                    }}
                                                                >
                                                                    {tag.name}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Refresh Button */}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => { mutate(); setShowFilters(false); }}
                                                disabled={isLoading}
                                                className="w-full justify-start mt-2"
                                            >
                                                <Search className="mr-2 h-4 w-4" />
                                                {isLoading ? "Lädt..." : "Aktualisieren"}
                                            </Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {/* Column Visibility Toggle */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded"
                                            title="Spalten einblenden/ausblenden"
                                        >
                                            <Settings2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52">
                                        <DropdownMenuLabel>Sichtbare Spalten</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {AVAILABLE_COLUMNS.map(col => (
                                            <DropdownMenuCheckboxItem
                                                key={col.id}
                                                checked={visibleColumns[col.id]}
                                                onCheckedChange={() => toggleColumn(col.id)}
                                                onSelect={(e) => e.preventDefault()}
                                            >
                                                {col.label}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {hasActiveFilters && (
                                    <>
                                        <div className="w-px h-4 bg-border/40 mx-0.5" />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-muted-foreground hover:text-foreground transition-colors rounded gap-1 text-xs"
                                            title="Filter zurücksetzen"
                                            onClick={() => {
                                                setSearchTerm("")
                                                setFilterEmployee("all")
                                                setDateRange(undefined)
                                                setFilterTags([])
                                                setSortField("none")
                                                setSortDir("desc")
                                                if (effectiveMode === 'active') setFilterStatus('all')
                                            }}
                                        >
                                            <X className="h-3 w-3" />
                                            <span className="hidden sm:inline">Zurücksetzen</span>
                                        </Button>
                                    </>
                                )}
                            </div>
            </div>
                    {/* Status Tabs */}
                    {effectiveMode === 'active' ? (
                        <Tabs defaultValue="all" value={filterStatus} onValueChange={setFilterStatus} className="space-y-3">
                            <TabsList variant="line" className="w-full overflow-x-auto flex-nowrap justify-start no-scrollbar pb-0 border-b-0 gap-3">
                                {STATUS_TABS.map(tab => {
                                    const count = statusCounts[tab.value as keyof typeof statusCounts] ?? 0
                                    const isAll = tab.value === 'all'

                                    let badgeClass = "bg-muted/60 text-muted-foreground/60"
                                    if (count > 0) {
                                        if (isAll) badgeClass = "bg-foreground/8 text-foreground/60"
                                        else if (tab.value === 'eingegangen') badgeClass = "bg-blue-500/12 text-blue-500"
                                        else if (tab.value === 'warten_auf_teile') badgeClass = "bg-rose-500/12 text-rose-500"
                                        else if (tab.value === 'in_bearbeitung') badgeClass = "bg-purple-500/12 text-purple-500"
                                        else if (tab.value === 'kontrolle_offen') badgeClass = "bg-amber-500/12 text-amber-500"
                                        else if (tab.value === 'abholbereit') badgeClass = "bg-emerald-500/12 text-emerald-500"
                                    }

                                    return (
                                        <TabsTrigger key={tab.value} value={tab.value} className="whitespace-nowrap items-center gap-2 pb-2.5 text-sm">
                                            {tab.label}
                                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center tabular-nums leading-none", badgeClass)}>
                                                {count}
                                            </span>
                                        </TabsTrigger>
                                    )
                                })}
                            </TabsList>

                            <TabsContent value={filterStatus} className="mt-0">
                                {renderTable(filteredOrders)}
                            </TabsContent>
                        </Tabs>
                    ) : (
                        renderTable(filteredOrders)
                    )}

            <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Auftrag wirklich löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {effectiveMode === 'trash'
                                ? "Diese Aktion kann nicht rückgängig gemacht werden."
                                : "Der Auftrag wird in den Papierkorb verschoben."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteOrder}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                            {effectiveMode === 'trash' ? "Endgültig löschen" : "In Papierkorb"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
