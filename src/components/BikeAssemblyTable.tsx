import useSWR from "swr"
import { toastSuccess, toastError } from '@/lib/toast-utils'
import { useState, useMemo } from "react"
import { useColumnVisibility } from "@/hooks/useColumnVisibility"
import type { AssemblyProgress, ControlData } from "@/types/index"
import { useNavigate } from "react-router-dom"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Search, Eye, Users, X, Check, Zap, SlidersHorizontal, Settings2, MoreHorizontal } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { OrdersTableSkeleton } from "@/components/skeletons/OrdersTableSkeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { motion } from "framer-motion"

interface BikeBuild {
    id: string
    internal_number: string
    brand: string
    model: string
    color: string
    frame_size: string
    customer_name: string | null
    customer_email: string | null
    status: string
    created_at: string
    assigned_employee_id: string | null
    assembly_progress: AssemblyProgress | null
    control_data: ControlData | null
    is_ebike?: boolean
    checklist_template?: string | null
}

function getAssemblyProgress(build: BikeBuild, fallbackTotal?: number): { pct: number; done: number; total: number } {
    const prog = build.assembly_progress
    if (!prog) return { pct: 0, done: 0, total: 0 }
    const done = (prog.completed_steps?.length || 0)
    const skipped = (prog.skipped_steps?.length || 0)
    const total = prog.total_steps || fallbackTotal || (done + skipped + (prog.remaining_steps?.length || 0))
    if (total === 0) return { pct: 0, done: 0, total: 0 }
    return { pct: Math.round(((done + skipped) / total) * 100), done, total }
}

const COLUMN_STORAGE_KEY = 'velofix-bike-builds-columns-v1'

const AVAILABLE_COLUMNS = [
    { id: 'internal_number', label: 'Nr. / Modell', defaultVisible: true },
    { id: 'color_size', label: 'Farbe / Größe', defaultVisible: true },
    { id: 'customer', label: 'Kunde', defaultVisible: true },
    { id: 'mechanic', label: 'Monteur', defaultVisible: true },
    { id: 'progress', label: 'Fortschritt', defaultVisible: true },
    { id: 'status', label: 'Status', defaultVisible: true },
    { id: 'actions', label: 'Aktionen', defaultVisible: true },
] as const

type ColumnId = typeof AVAILABLE_COLUMNS[number]['id']

export function BikeAssemblyTable() {
    const { workshopId } = useAuth()
    const { employees } = useEmployee()
    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState("")
    const [filterEmployee, setFilterEmployee] = useState<string>("all")
    const [filterStatus, setFilterStatus] = useState<string>("all")
    const [showFilters, setShowFilters] = useState(false)
    const [sortField, setSortField] = useState<"created_at" | "none">("none")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

    const { visibleColumns, toggleColumn } = useColumnVisibility<ColumnId>(COLUMN_STORAGE_KEY, AVAILABLE_COLUMNS)

    const fetchBuilds = async () => {
        if (!workshopId) return []
        const { data, error } = await supabase
            .from('bike_builds')
            .select('*')
            .eq('workshop_id', workshopId)
            .neq('status', 'trash')
            .order('created_at', { ascending: false })
        if (error) throw error
        return data as BikeBuild[]
    }

    const { data: builds = [], isLoading, mutate } = useSWR(
        workshopId ? ['bike_builds', workshopId] : null,
        fetchBuilds,
        { refreshInterval: 30000, revalidateOnFocus: true }
    )

    const { data: templateCounts = {} } = useSWR(
        workshopId ? ['neurad_template_counts', workshopId] : null,
        async () => {
            const { data, error } = await supabase
                .from('neurad_steps')
                .select('template_name')
                .eq('workshop_id', workshopId)
                .eq('is_active', true)

            if (error) throw error

            const counts: Record<string, number> = {}
            data.forEach(step => {
                const name = step.template_name || 'default'
                counts[name] = (counts[name] || 0) + 1
            })
            return counts
        }
    )

    const handleAssignEmployee = async (buildId: string, employeeId: string | null) => {
        const updatedBuilds = builds.map(b => b.id === buildId ? { ...b, assigned_employee_id: employeeId } : b)
        mutate(updatedBuilds, false)
        try {
            const { error } = await supabase
                .from('bike_builds')
                .update({ assigned_employee_id: employeeId })
                .eq('id', buildId)
            if (error) throw error
            toastSuccess('Zuweisung aktualisiert', employeeId ? 'Mechaniker zugewiesen.' : 'Zuweisung aufgehoben.')
            mutate()
        } catch {
            toastError('Fehler', 'Mechaniker konnte nicht zugewiesen werden.')
            mutate()
        }
    }

    const statusCounts = useMemo(() => {
        return {
            all: builds.length,
            offen: builds.filter(b => b.status === 'offen').length,
            in_progress: builds.filter(b => b.status === 'in_progress').length,
            fertig: builds.filter(b => b.status === 'fertig').length,
            abgeschlossen: builds.filter(b => b.status === 'abgeschlossen').length,
        }
    }, [builds])

    const filteredBuilds = builds.filter(build => {
        const matchesSearch =
            (build.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (build.internal_number?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (build.model?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (build.brand?.toLowerCase().includes(searchTerm.toLowerCase()))

        const matchesEmployee =
            filterEmployee === 'all' ? true :
                filterEmployee === 'unassigned' ? build.assigned_employee_id === null :
                    build.assigned_employee_id === filterEmployee

        const matchesStatus = filterStatus === 'all' ? true : build.status === filterStatus

        return matchesSearch && matchesEmployee && matchesStatus
    }).sort((a, b) => {
        if (sortField === "none") return 0
        const aVal = a[sortField]
        const bVal = b[sortField]
        if (aVal === bVal) return 0
        if (!aVal) return 1
        if (!bVal) return -1
        const timeA = new Date(aVal).getTime()
        const timeB = new Date(bVal).getTime()
        return sortDir === "asc" ? timeA - timeB : timeB - timeA
    })

    const handleViewBuild = (buildId: string) => {
        navigate(`/dashboard/bike-builds/${buildId}`, { state: { from: '/dashboard/bike-builds' } })
    }

    const getEmployeeName = (id: string | null) => {
        if (!id) return null
        return employees.find(e => e.id === id)?.name || "Unbekannt"
    }

    const activeFilterCount = [
        filterStatus !== 'all',
        filterEmployee !== 'all',
        sortField !== 'none'
    ].filter(Boolean).length

    const hasActiveFilters = searchTerm || activeFilterCount > 0

    // Dynamic responsive logic matching OrdersTable
    const enabledCount = Object.values(visibleColumns).filter(Boolean).length
    const getResponsiveClass = (colId: ColumnId) => {
        if (colId === 'internal_number' || colId === 'status' || colId === 'actions') return ""

        if (enabledCount <= 4) {
            if (colId === 'color_size') return "table-cell"
            if (colId === 'customer') return "sm:table-cell"
            if (colId === 'progress') return "md:table-cell"
            return "lg:table-cell"
        }

        switch (colId) {
            case 'color_size': return "sm:table-cell"
            case 'customer': return "lg:table-cell"
            case 'mechanic': return "xl:table-cell"
            case 'progress': return "md:table-cell"
            default: return ""
        }
    }

    if (isLoading) return <OrdersTableSkeleton />

    const renderTable = (buildsToRender: BikeBuild[]) => (
        <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-border/40 bg-background">
            <Table className="w-full table-fixed">
                <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/30">
                        {visibleColumns.internal_number && (
                            <TableHead className="w-[80px] md:w-[120px] pl-4 md:pl-5 text-[10px] uppercase tracking-wider text-muted-foreground/40 font-semibold">
                                Nr. / Modell
                            </TableHead>
                        )}
                        {visibleColumns.color_size && (
                            <TableHead className={cn("hidden px-3 md:px-4 text-[10px] uppercase tracking-wider text-muted-foreground/40 font-semibold min-w-[120px]", getResponsiveClass('color_size'))}>
                                Farbe / Größe
                            </TableHead>
                        )}
                        {visibleColumns.customer && (
                            <TableHead className={cn("hidden px-3 md:px-4 text-[10px] uppercase tracking-wider text-muted-foreground/40 font-semibold min-w-[220px]", getResponsiveClass('customer'))}>
                                Kunde
                            </TableHead>
                        )}
                        {visibleColumns.mechanic && (
                            <TableHead className={cn("hidden px-3 md:px-4 text-[10px] uppercase tracking-wider text-muted-foreground/40 font-semibold w-[110px]", getResponsiveClass('mechanic'))}>
                                Monteur
                            </TableHead>
                        )}
                        {visibleColumns.progress && (
                            <TableHead className={cn("hidden px-3 md:px-4 text-[10px] uppercase tracking-wider text-muted-foreground/40 font-semibold min-w-[100px]", getResponsiveClass('progress'))}>
                                Fortschritt
                            </TableHead>
                        )}
                        {visibleColumns.status && (
                            <TableHead className="px-3 text-[10px] uppercase tracking-wider text-muted-foreground/40 font-semibold w-[135px] min-w-[135px]">
                                Status
                            </TableHead>
                        )}
                        {visibleColumns.actions && (
                            <TableHead className="w-[52px] min-w-[52px]" />
                        )}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {buildsToRender.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <Search className="h-8 w-8 opacity-20" />
                                    <p>Keine Neuräder gefunden</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        buildsToRender.map(build => {
                            const fallbackTotal = templateCounts[build.checklist_template || 'default']
                            const progress = getAssemblyProgress(build, fallbackTotal)

                            return (
                                <TableRow
                                    key={build.id}
                                    className="group hover:bg-accent/40 cursor-pointer transition-colors duration-100 border-b border-border/20 last:border-0"
                                    onClick={() => handleViewBuild(build.id)}
                                >
                                    {/* Nr / Modell */}
                                    {visibleColumns.internal_number && (
                                        <TableCell className="w-[80px] md:w-[120px] pl-4 md:pl-5 py-3">
                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-1.5 overflow-hidden">
                                                    <span className="font-mono text-[10px] font-bold text-primary/80 bg-primary/8 px-1 py-0.5 rounded truncate">
                                                        {build.internal_number || '—'}
                                                    </span>
                                                    {build.is_ebike && (
                                                        <Zap className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                                                    )}
                                                </div>
                                                <span className="text-xs font-semibold text-foreground/90 truncate mt-0.5">
                                                    {build.brand} <span className="text-muted-foreground font-medium">{build.model}</span>
                                                </span>
                                            </div>
                                        </TableCell>
                                    )}

                                    {/* Farbe/Größe */}
                                    {visibleColumns.color_size && (
                                        <TableCell className={cn("hidden py-3 px-3 md:px-4", getResponsiveClass('color_size'))}>
                                            <div className="flex flex-col text-sm">
                                                <span className="text-foreground/80 font-medium">{build.color || '—'}</span>
                                                <span className="text-[11px] text-muted-foreground leading-tight tracking-tight uppercase font-medium">{build.frame_size || ''}</span>
                                            </div>
                                        </TableCell>
                                    )}

                                    {/* Kunde */}
                                    {visibleColumns.customer && (
                                        <TableCell className={cn("hidden py-3 px-3 md:px-4 min-w-[220px]", getResponsiveClass('customer'))}>
                                            <div className="flex flex-col text-sm">
                                                <span className="font-semibold text-foreground/80">{build.customer_name || <span className="text-muted-foreground/60 italic font-medium text-xs">Lager</span>}</span>
                                                <span className="text-[11px] text-muted-foreground/60 truncate max-w-[220px] font-medium leading-none mt-0.5">{build.customer_email}</span>
                                            </div>
                                        </TableCell>
                                    )}

                                    {/* Monteur */}
                                    {visibleColumns.mechanic && (
                                        <TableCell className={cn("hidden py-3 px-3 md:px-4 w-[110px]", getResponsiveClass('mechanic'))} onClick={e => e.stopPropagation()}>
                                            {build.assigned_employee_id ? (() => {
                                                const name = getEmployeeName(build.assigned_employee_id)
                                                const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'
                                                return (
                                                    <span
                                                        title={name || undefined}
                                                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground border border-border/50 shrink-0"
                                                    >
                                                        {initials}
                                                    </span>
                                                )
                                            })() : (
                                                <span className="text-[12px] text-muted-foreground/25">—</span>
                                            )}
                                        </TableCell>
                                    )}

                                    {/* Fortschritt */}
                                    {visibleColumns.progress && (
                                        <TableCell className={cn("hidden py-3 px-3 md:px-4", getResponsiveClass('progress'))}>
                                            {progress.total > 0 ? (
                                                <div className="flex items-center gap-2.5 min-w-[90px]">
                                                    <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden border border-border/5">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${progress.pct}%` }}
                                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                                            className={cn(
                                                                "h-full rounded-full",
                                                                progress.pct === 100 ? "bg-emerald-500" : "bg-primary"
                                                            )}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground font-bold font-mono whitespace-nowrap bg-muted/40 px-1 py-0.5 rounded border border-border/20 leading-none">
                                                        {progress.pct}%
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground/20 italic">—</span>
                                            )}
                                        </TableCell>
                                    )}

                                    {/* Status */}
                                    {visibleColumns.status && (
                                        <TableCell className="py-3 px-3 w-[135px]">
                                            <StatusBadge status={build.status} variant="neurad" />
                                        </TableCell>
                                    )}

                                    {/* Aktionen */}
                                    {visibleColumns.actions && (
                                        <TableCell className="text-right pr-3 py-3 w-[52px]">
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
                                                <DropdownMenuContent align="end" className="w-56">
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewBuild(build.id) }}>
                                                        <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                                                        Öffnen
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuLabel>Zuweisen an</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={e => { e.stopPropagation(); handleAssignEmployee(build.id, null) }}>
                                                        <X className="mr-2 h-4 w-4 text-muted-foreground" />
                                                        <span>Keine Zuweisung</span>
                                                    </DropdownMenuItem>
                                                    {employees.map(emp => (
                                                        <DropdownMenuItem
                                                            key={emp.id}
                                                            onClick={e => { e.stopPropagation(); handleAssignEmployee(build.id, emp.id) }}
                                                        >
                                                            <Users className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                                                            <span className="truncate flex-1">{emp.name}</span>
                                                            {build.assigned_employee_id === emp.id && <Check className="ml-auto h-4 w-4 shrink-0" />}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
                        placeholder="Suche nach Modell, Marke, Nummer..."
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

                <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border/30 bg-muted/10 px-1 py-0.5">
                            {/* Filter Toggle */}
                            <Popover open={showFilters} onOpenChange={setShowFilters}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 relative text-muted-foreground hover:text-foreground"
                                        title="Filter"
                                    >
                                        <SlidersHorizontal className="h-4 w-4" />
                                        {activeFilterCount > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                                                {activeFilterCount}
                                            </span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80" align="end">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold">Filter & Optionen</p>
                                            {(filterStatus !== 'all' || filterEmployee !== 'all' || sortField !== 'none') && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => {
                                                        setFilterStatus('all')
                                                        setFilterEmployee('all')
                                                        setSortField('none')
                                                        setSortDir('desc')
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
                                                <Select value={sortField} onValueChange={(v: "created_at" | "none") => setSortField(v)}>
                                                    <SelectTrigger className="h-9 flex-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">Standard</SelectItem>
                                                        <SelectItem value="created_at">Erstellt am</SelectItem>
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

                                        {/* Refresh Button */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => { mutate(); setShowFilters(false); }}
                                            disabled={isLoading}
                                            className="w-full justify-start"
                                        >
                                            <Search className="mr-2 h-4 w-4" />
                                            {isLoading ? "Lädt..." : "Aktualisieren"}
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {/* Column Visibility Toggle — matches OrdersTable */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                        title="Spalten"
                                    >
                                        <Settings2 className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
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
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-muted-foreground hover:text-foreground transition-colors"
                                    title="Filter zurücksetzen"
                                    onClick={() => {
                                        setSearchTerm("")
                                        setFilterEmployee("all")
                                        setFilterStatus("all")
                                        setSortField("none")
                                        setSortDir("desc")
                                    }}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
            </div>
                {/* Status Tabs — matches OrdersTable */}
                <Tabs defaultValue="all" className="space-y-4" onValueChange={setFilterStatus}>
                    <TabsList variant="line" className="w-full overflow-x-auto flex-nowrap justify-start no-scrollbar pb-0 border-b-0 gap-4">
                        <TabsTrigger value="all" className="whitespace-nowrap items-center gap-2 pb-2.5 text-sm">
                            Alle
                            <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center tabular-nums leading-none",
                                statusCounts.all > 0 ? "bg-foreground/8 text-foreground/60" : "bg-muted/60 text-muted-foreground/60"
                            )}>
                                {statusCounts.all}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger value="offen" className="whitespace-nowrap items-center gap-2 pb-2.5 text-sm">
                            Offen
                            <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center tabular-nums leading-none",
                                statusCounts.offen > 0 ? "bg-rose-500/12 text-rose-500" : "bg-muted/60 text-muted-foreground/60"
                            )}>
                                {statusCounts.offen}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger value="in_progress" className="whitespace-nowrap items-center gap-2 pb-2.5 text-sm">
                            In Montage
                            <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center tabular-nums leading-none",
                                statusCounts.in_progress > 0 ? "bg-orange-500/12 text-orange-500" : "bg-muted/60 text-muted-foreground/60"
                            )}>
                                {statusCounts.in_progress}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger value="fertig" className="whitespace-nowrap items-center gap-2 pb-2.5 text-sm">
                            Montiert
                            <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center tabular-nums leading-none",
                                statusCounts.fertig > 0 ? "bg-yellow-500/12 text-yellow-500" : "bg-muted/60 text-muted-foreground/60"
                            )}>
                                {statusCounts.fertig}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger value="abgeschlossen" className="whitespace-nowrap items-center gap-2 pb-2.5 text-sm">
                            Kontrolliert
                            <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center tabular-nums leading-none",
                                statusCounts.abgeschlossen > 0 ? "bg-green-500/12 text-green-500" : "bg-muted/60 text-muted-foreground/60"
                            )}>
                                {statusCounts.abgeschlossen}
                            </span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="mt-0">
                        {renderTable(filteredBuilds)}
                    </TabsContent>
                    <TabsContent value="offen" className="mt-0">
                        {renderTable(filteredBuilds)}
                    </TabsContent>
                    <TabsContent value="in_progress" className="mt-0">
                        {renderTable(filteredBuilds)}
                    </TabsContent>
                    <TabsContent value="fertig" className="mt-0">
                        {renderTable(filteredBuilds)}
                    </TabsContent>
                    <TabsContent value="abgeschlossen" className="mt-0">
                        {renderTable(filteredBuilds)}
                    </TabsContent>
                </Tabs>
        </div>
    )
}
