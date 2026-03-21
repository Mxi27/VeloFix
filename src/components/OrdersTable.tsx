import useSWR from "swr"
import { toastSuccess, toastError } from '@/lib/toast-utils'
import { useState, useMemo } from "react"
import { useColumnVisibility } from "@/hooks/useColumnVisibility"
import { useNavigate } from "react-router-dom"
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants"
import type { DateRange } from "react-day-picker"
import { DateRangePicker } from "@/components/DateRangePicker"
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
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Search, Users, X, Check,
    SlidersHorizontal, RotateCcw as Restore, Settings2, Filter,
    ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Trash2, ExternalLink,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
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

const STATUS_DOT = {
    eingegangen: "bg-[#6c8fff]",
    warten_auf_teile: "bg-[#de4c4a]",
    in_bearbeitung: "bg-[#c77dff]",
    kontrolle_offen: "bg-[#f0b429]",
    abholbereit: "bg-[#4ab06c]",
    abgeholt: "bg-[#e07098]",
    abgeschlossen: "bg-[#888888]",
} as Record<string, string>

export function OrdersTable({ mode = 'active', showArchived }: OrdersTableProps) {
    const { workshopId } = useAuth()
    const { employees } = useEmployee()
    const navigate = useNavigate()

    const [searchTerm, setSearchTerm] = useState("")
    const [showSearch, setShowSearch] = useState(false)
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
    ].filter(Boolean).length

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

    const handleSort = (field: typeof sortField) => {
        if (sortField === field) {
            if (sortDir === "desc") setSortDir("asc")
            else { setSortField("none"); setSortDir("desc") }
        } else {
            setSortField(field)
            setSortDir("desc")
        }
    }

    const SortIcon = ({ field }: { field: typeof sortField }) => {
        if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-0 group-hover/th:opacity-40 transition-opacity" />
        return sortDir === "desc"
            ? <ArrowDown className="h-3 w-3 text-primary" />
            : <ArrowUp className="h-3 w-3 text-primary" />
    }

    return (
        <>
            <div className="space-y-0">

                {/* ── Toolbar ── */}
                <div className="flex items-center justify-between gap-4 mb-1">
                    {/* Status tabs */}
                    {effectiveMode === 'active' && (
                        <div className="flex items-center gap-0 overflow-x-auto -mb-px">
                            {STATUS_TABS.map(tab => {
                                const count = statusCounts[tab.value as keyof typeof statusCounts] ?? 0
                                const isActive = filterStatus === tab.value
                                return (
                                    <button
                                        key={tab.value}
                                        onClick={() => setFilterStatus(tab.value)}
                                        className={cn(
                                            "relative flex items-center gap-1.5 px-3 py-2 text-[13px] whitespace-nowrap transition-colors",
                                            "border-b-2",
                                            isActive
                                                ? "border-primary text-foreground font-medium"
                                                : "border-transparent text-muted-foreground hover:text-foreground/80"
                                        )}
                                    >
                                        {tab.label}
                                        {count > 0 && (
                                            <span className={cn(
                                                "text-[10px] font-semibold tabular-nums px-1.5 py-px rounded-full",
                                                isActive
                                                    ? "bg-primary/15 text-primary"
                                                    : "bg-accent text-muted-foreground"
                                            )}>
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {/* Right: Controls */}
                    <div className="flex items-center gap-1 ml-auto shrink-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-7 gap-1.5 text-xs px-2 rounded-lg text-muted-foreground hover:text-foreground",
                                showSearch && "text-foreground bg-accent"
                            )}
                            onClick={() => setShowSearch(s => !s)}
                        >
                            <Search className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Suche</span>
                        </Button>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "h-7 gap-1.5 text-xs px-2 rounded-lg text-muted-foreground hover:text-foreground",
                                        activeFilterCount > 0 && "text-foreground bg-accent"
                                    )}
                                >
                                    <SlidersHorizontal className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Filter</span>
                                    {activeFilterCount > 0 && (
                                        <span className="bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-px rounded-full">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-76 p-4" align="end">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium">Filter & Sortierung</p>
                                        {activeFilterCount > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-xs px-2"
                                                onClick={() => {
                                                    setFilterEmployee('all')
                                                    setDateRange(undefined)
                                                    setFilterTags([])
                                                    setSortField('none')
                                                    setSortDir('desc')
                                                }}
                                            >
                                                Zurücksetzen
                                            </Button>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-medium text-muted-foreground">Mitarbeiter</label>
                                        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Alle" />
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

                                    {workshopTags.length > 0 && (
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-medium text-muted-foreground">Tags</label>
                                            <div className="flex flex-wrap gap-1">
                                                {workshopTags.map((tag: any) => {
                                                    const isSelected = filterTags.includes(tag.id)
                                                    return (
                                                        <button
                                                            key={tag.id}
                                                            onClick={() => setFilterTags(prev =>
                                                                prev.includes(tag.id)
                                                                    ? prev.filter(id => id !== tag.id)
                                                                    : [...prev, tag.id]
                                                            )}
                                                            className={cn(
                                                                "inline-flex items-center rounded-md px-2 py-px text-xs font-medium transition-opacity",
                                                                !isSelected && "opacity-40"
                                                            )}
                                                            style={{ backgroundColor: tag.color, color: '#fff' }}
                                                        >
                                                            {tag.name}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-medium text-muted-foreground">Zeitraum</label>
                                        <div className="flex gap-2">
                                            <Select value={dateFilterType} onValueChange={(v: "created" | "due") => setDateFilterType(v)}>
                                                <SelectTrigger className="h-8 flex-1 text-xs">
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

                                    <Button variant="ghost" size="sm" className="w-full h-8 text-xs justify-start gap-2" onClick={() => mutate()}>
                                        <Filter className="h-3.5 w-3.5" />
                                        {isLoading ? "Lädt…" : "Aktualisieren"}
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs px-2 rounded-lg text-muted-foreground hover:text-foreground">
                                    <Settings2 className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Ansicht</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel className="text-xs">Sichtbare Spalten</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {AVAILABLE_COLUMNS.map(col => (
                                    <DropdownMenuCheckboxItem
                                        key={col.id}
                                        checked={visibleColumns[col.id]}
                                        onCheckedChange={() => toggleColumn(col.id)}
                                        onSelect={(e) => e.preventDefault()}
                                        className="text-xs"
                                    >
                                        {col.label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Search bar */}
                {showSearch && (
                    <div className="relative mb-2">
                        <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                        <Input
                            autoFocus
                            placeholder="Suche nach Kunde, Nr. oder Modell…"
                            className="pl-6 border-0 border-b border-border/40 rounded-none shadow-none bg-transparent text-sm h-9 focus-visible:ring-0 focus-visible:border-primary/40 px-0"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}

                {/* ── Table ── */}
                <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-[13px]">
                        {/* Header */}
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                {/* Status dot column — always visible */}
                                <th className="w-10 px-3 py-2.5" />

                                {visibleColumns.order_number && (
                                    <th
                                        className="text-left px-3 py-2.5 font-medium text-muted-foreground text-[11px] uppercase tracking-wider cursor-pointer group/th select-none"
                                        onClick={() => handleSort("created_at")}
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            Nr.
                                            <SortIcon field="created_at" />
                                        </span>
                                    </th>
                                )}

                                {visibleColumns.customer && (
                                    <th
                                        className="text-left px-3 py-2.5 font-medium text-muted-foreground text-[11px] uppercase tracking-wider cursor-pointer group/th select-none"
                                        onClick={() => handleSort("customer_name")}
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            Kunde
                                            <SortIcon field="customer_name" />
                                        </span>
                                    </th>
                                )}

                                {visibleColumns.bike && (
                                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-[11px] uppercase tracking-wider hidden md:table-cell">
                                        Fahrrad
                                    </th>
                                )}

                                {visibleColumns.mechanic && (
                                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-[11px] uppercase tracking-wider hidden lg:table-cell">
                                        Mechaniker
                                    </th>
                                )}

                                {visibleColumns.due_date && (
                                    <th
                                        className="text-left px-3 py-2.5 font-medium text-muted-foreground text-[11px] uppercase tracking-wider cursor-pointer group/th select-none hidden sm:table-cell"
                                        onClick={() => handleSort("due_date")}
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            Fällig
                                            <SortIcon field="due_date" />
                                        </span>
                                    </th>
                                )}

                                {visibleColumns.status && (
                                    <th
                                        className="text-left px-3 py-2.5 font-medium text-muted-foreground text-[11px] uppercase tracking-wider cursor-pointer group/th select-none"
                                        onClick={() => handleSort("status")}
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            Status
                                            <SortIcon field="status" />
                                        </span>
                                    </th>
                                )}

                                {visibleColumns.created_at && (
                                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-[11px] uppercase tracking-wider hidden xl:table-cell">
                                        Erstellt
                                    </th>
                                )}

                                {visibleColumns.actions && (
                                    <th className="w-12 px-3 py-2.5" />
                                )}
                            </tr>
                        </thead>

                        {/* Body */}
                        <tbody>
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-16 text-center text-muted-foreground text-sm">
                                        {isLoading ? "Lädt…" : "Keine Aufträge gefunden"}
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map(order => (
                                    <tr
                                        key={order.id}
                                        className="group border-b border-border/40 last:border-0 hover:bg-accent/40 transition-colors duration-75 cursor-pointer"
                                        onClick={() => handleViewOrder(order.id)}
                                    >
                                        {/* Status dot */}
                                        <td className="px-3 py-2.5">
                                            <div className={cn(
                                                "h-2.5 w-2.5 rounded-full mx-auto",
                                                STATUS_DOT[order.status] || "bg-muted-foreground/40"
                                            )} />
                                        </td>

                                        {/* Order number */}
                                        {visibleColumns.order_number && (
                                            <td className="px-3 py-2.5">
                                                <span className="font-mono text-muted-foreground text-[12px]">
                                                    {order.order_number}
                                                </span>
                                            </td>
                                        )}

                                        {/* Customer */}
                                        {visibleColumns.customer && (
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="font-medium text-foreground truncate">
                                                        {order.customer_name}
                                                    </span>
                                                    {order.is_leasing && (
                                                        <span className="text-[10px] font-medium px-1.5 py-px rounded bg-primary/10 text-primary shrink-0">
                                                            Leasing
                                                        </span>
                                                    )}
                                                    {order.tags && order.tags.length > 0 && (
                                                        <div className="flex gap-1 shrink-0">
                                                            {order.tags.slice(0, 2).map(tagId => {
                                                                const tagInfo = workshopTags.find((t: any) => t.id === tagId)
                                                                if (!tagInfo) return null
                                                                return (
                                                                    <span
                                                                        key={tagId}
                                                                        className="inline-flex rounded px-1.5 py-px text-[10px] font-medium text-white"
                                                                        style={{ backgroundColor: tagInfo.color }}
                                                                    >
                                                                        {tagInfo.name}
                                                                    </span>
                                                                )
                                                            })}
                                                            {order.tags.length > 2 && (
                                                                <span className="text-[10px] text-muted-foreground">+{order.tags.length - 2}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        )}

                                        {/* Bike */}
                                        {visibleColumns.bike && (
                                            <td className="px-3 py-2.5 hidden md:table-cell">
                                                <span className="text-muted-foreground truncate block max-w-[180px]">
                                                    {[order.bike_brand, order.bike_model].filter(Boolean).join(' ') || '—'}
                                                </span>
                                            </td>
                                        )}

                                        {/* Mechanic */}
                                        {visibleColumns.mechanic && (
                                            <td className="px-3 py-2.5 hidden lg:table-cell">
                                                {order.mechanic_ids && order.mechanic_ids.length > 0 ? (
                                                    <div className="flex items-center gap-1">
                                                        {order.mechanic_ids.slice(0, 2).map(mid => (
                                                            <span key={mid} className="inline-flex items-center rounded-md bg-accent px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                                                {getEmployeeName(mid)}
                                                            </span>
                                                        ))}
                                                        {order.mechanic_ids.length > 2 && (
                                                            <span className="text-[10px] text-muted-foreground">+{order.mechanic_ids.length - 2}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground/40">—</span>
                                                )}
                                            </td>
                                        )}

                                        {/* Due date */}
                                        {visibleColumns.due_date && (
                                            <td className="px-3 py-2.5 hidden sm:table-cell">
                                                {order.due_date ? (
                                                    <span className={cn(
                                                        "text-[12px] tabular-nums",
                                                        new Date(order.due_date) < new Date() &&
                                                        !['abgeholt', 'abgeschlossen'].includes(order.status)
                                                            ? "text-[#de4c4a] font-medium"
                                                            : "text-muted-foreground"
                                                    )}>
                                                        {new Date(order.due_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground/40">—</span>
                                                )}
                                            </td>
                                        )}

                                        {/* Status badge */}
                                        {visibleColumns.status && (
                                            <td className="px-3 py-2.5">
                                                <span className={cn(
                                                    "inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium",
                                                    STATUS_COLORS[order.status] || "bg-accent text-muted-foreground"
                                                )}>
                                                    {STATUS_LABELS[order.status] || order.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                        )}

                                        {/* Created at */}
                                        {visibleColumns.created_at && (
                                            <td className="px-3 py-2.5 hidden xl:table-cell">
                                                <span className="text-[12px] text-muted-foreground tabular-nums">
                                                    {new Date(order.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                </span>
                                            </td>
                                        )}

                                        {/* Actions */}
                                        {visibleColumns.actions && (
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {effectiveMode === 'trash' ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
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
                                                                    size="icon"
                                                                    className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-52">
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewOrder(order.id) }}>
                                                                    <ExternalLink className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                                                    Öffnen
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Zuweisen an</DropdownMenuLabel>
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAssignEmployee(order.id, null) }}>
                                                                    <X className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                                                    Keine Zuweisung
                                                                </DropdownMenuItem>
                                                                {employees.map(emp => (
                                                                    <DropdownMenuItem
                                                                        key={emp.id}
                                                                        onClick={(e) => { e.stopPropagation(); handleAssignEmployee(order.id, emp.id) }}
                                                                    >
                                                                        <Users className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                                        <span className="truncate flex-1">{emp.name}</span>
                                                                        {order.mechanic_ids?.includes(emp.id) && <Check className="ml-auto h-3.5 w-3.5 shrink-0" />}
                                                                    </DropdownMenuItem>
                                                                ))}
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    onClick={(e) => { e.stopPropagation(); setOrderToDelete(order.id) }}
                                                                    className="text-destructive focus:text-destructive"
                                                                >
                                                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                                    Löschen
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Footer */}
                    {filteredOrders.length > 0 && (
                        <div className="border-t border-border bg-muted/20 px-4 py-2 flex items-center justify-between">
                            <span className="text-[12px] text-muted-foreground">
                                {filteredOrders.length} {filteredOrders.length === 1 ? 'Auftrag' : 'Aufträge'}
                                {filteredOrders.length !== orders.length && (
                                    <span> von {orders.length}</span>
                                )}
                            </span>
                            <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2 text-muted-foreground" onClick={() => mutate()}>
                                {isLoading ? "Lädt…" : "Aktualisieren"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

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
        </>
    )
}
