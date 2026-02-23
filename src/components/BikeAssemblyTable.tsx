import useSWR from "swr"
import { toastSuccess, toastError } from '@/lib/toast-utils'
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { NEURAD_STATUS_MAP, NEURAD_STATUSES } from "@/lib/constants"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Eye, UserPlus, Users, X, Check, Wrench, Zap, RefreshCw, SlidersHorizontal } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { OrdersTableSkeleton } from "@/components/skeletons/OrdersTableSkeleton"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
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
    assembly_progress: any
    control_data: any
    is_ebike?: boolean
}

// Helper to get human-readable status
function getNeuradStatus(status: string) {
    return NEURAD_STATUS_MAP[status] || { label: status, color: 'bg-muted text-muted-foreground border-border/60', dotColor: 'bg-muted-foreground' }
}

// Helper to calculate real progress % from assembly_progress
function getAssemblyProgress(build: BikeBuild): { pct: number; done: number; total: number } {
    const prog = build.assembly_progress
    if (!prog) return { pct: 0, done: 0, total: 0 }
    const done = (prog.completed_steps?.length || 0)
    const skipped = (prog.skipped_steps?.length || 0)
    const total = done + skipped + (prog.remaining_steps?.length || 0)
    // If we don't have remaining, just show what we have
    if (total === 0 && done > 0) return { pct: 100, done, total: done }
    if (total === 0) return { pct: 0, done: 0, total: 0 }
    return { pct: Math.round(((done + skipped) / total) * 100), done, total }
}

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

    const fetchBuilds = async () => {
        if (!workshopId) return []
        const { data, error } = await supabase
            .from('bike_builds')
            .select('*')
            .eq('workshop_id', workshopId)
            .order('created_at', { ascending: false })
        if (error) throw error
        return data as BikeBuild[]
    }

    const { data: builds = [], isLoading, mutate } = useSWR(
        workshopId ? ['bike_builds', workshopId] : null,
        fetchBuilds,
        { refreshInterval: 30000, revalidateOnFocus: true }
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

        const field = sortField as "created_at"
        const aVal = a[field]
        const bVal = b[field]

        if (aVal === bVal) return 0
        if (!aVal) return 1
        if (!bVal) return -1

        const timeA = new Date(aVal).getTime()
        const timeB = new Date(bVal).getTime()

        if (sortDir === "asc") {
            return timeA - timeB
        } else {
            return timeB - timeA
        }
    })

    const handleViewBuild = (buildId: string) => {
        navigate(`/dashboard/bike-builds/${buildId}`, { state: { from: '/dashboard/bike-builds' } })
    }

    const getEmployeeName = (id: string | null) => {
        if (!id) return null
        return employees.find(e => e.id === id)?.name || "Unbekannt"
    }

    if (isLoading) return <OrdersTableSkeleton />

    const activeCount = filteredBuilds.filter(b => b.status === 'in_progress').length
    const activeFilterCount = [
        filterStatus !== 'all',
        filterEmployee !== 'all',
        sortField !== 'none'
    ].filter(Boolean).length
    const hasActiveFilters = searchTerm || activeFilterCount > 0

    return (
        <Card className="border-none shadow-sm bg-card/50">
            <CardHeader className="pb-4">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <CardTitle className="text-xl font-bold tracking-tight text-foreground/90">
                            Neurad Aufbau (Aktiv)
                        </CardTitle>

                        {/* Filter Bar — identical to OrdersTable style */}
                        <div className="flex items-center gap-2">
                            <Popover open={showFilters} onOpenChange={setShowFilters}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 bg-background border-border/50 h-9"
                                    >
                                        <SlidersHorizontal className="h-3.5 w-3.5" />
                                        Filter
                                        {activeFilterCount > 0 && (
                                            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] font-bold">
                                                {activeFilterCount}
                                            </Badge>
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
                                                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
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
                                            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Sortierung</label>
                                            <div className="flex items-center gap-2">
                                                <Select value={sortField} onValueChange={(v: "created_at" | "none") => setSortField(v)}>
                                                    <SelectTrigger className="h-9 flex-1 bg-background/50 border-border/40 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none" className="text-xs">Standard</SelectItem>
                                                        <SelectItem value="created_at" className="text-xs">Erstellt am</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Select value={sortDir} onValueChange={(v: "asc" | "desc") => setSortDir(v)} disabled={sortField === "none"}>
                                                    <SelectTrigger className="h-9 w-[110px] bg-background/50 border-border/40 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="desc" className="text-xs">Absteigend</SelectItem>
                                                        <SelectItem value="asc" className="text-xs">Aufsteigend</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Status Filter */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Status</label>
                                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                                <SelectTrigger className="h-9 bg-background/50 border-border/40 text-xs">
                                                    <SelectValue placeholder="Status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all" className="text-xs">Alle Status</SelectItem>
                                                    {NEURAD_STATUSES.map(s => (
                                                        <SelectItem key={s.value} value={s.value} className="text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn("h-1.5 w-1.5 rounded-full", s.dotColor)} />
                                                                {s.label}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Employee Filter */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Mitarbeiter</label>
                                            <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                                                <SelectTrigger className="h-9 bg-background/50 border-border/40 text-xs">
                                                    <SelectValue placeholder="Mitarbeiter" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all" className="text-xs">Alle Mitarbeiter</SelectItem>
                                                    <SelectItem value="unassigned" className="text-xs">Nicht zugewiesen</SelectItem>
                                                    {employees.map(emp => (
                                                        <SelectItem key={emp.id} value={emp.id} className="text-xs">{emp.name}</SelectItem>
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
                                            className="w-full justify-start h-9 bg-background/50 border-border/40 text-xs"
                                        >
                                            <RefreshCw className={cn("mr-2 h-3.5 w-3.5", isLoading && "animate-spin")} />
                                            {isLoading ? "Lädt..." : "Aktualisieren"}
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => mutate()}
                                disabled={isLoading}
                                className="h-9 w-9 bg-background/80 border-border/50 shadow-sm"
                                title="Aktualisieren"
                            >
                                <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                            </Button>

                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 px-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                                    onClick={() => {
                                        setSearchTerm("")
                                        setFilterEmployee("all")
                                        setFilterStatus("all")
                                        setSortField("none")
                                        setSortDir("desc")
                                    }}
                                >
                                    <X className="h-3.5 w-3.5 mr-1" />
                                    Reset
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Suche nach Modell, Marke, Nummer, Kunde..."
                            className="pl-9 h-10 bg-background border-border/50"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                {/* Summary row */}
                {filteredBuilds.length > 0 && (
                    <div className="flex items-center gap-4 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 mb-4 px-1">
                        <span>{filteredBuilds.length} Einträge</span>
                        {activeCount > 0 && (
                            <>
                                <span className="opacity-30">•</span>
                                <span className="text-primary/80">
                                    {activeCount} in Montage
                                </span>
                            </>
                        )}
                    </div>
                )}

                {/* Table — Dashboard-style */}
                <div className="rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent bg-muted/30 border-b border-border/40">
                                <TableHead className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground h-10 pl-5">
                                    Nr. / Modell
                                </TableHead>
                                <TableHead className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground h-10">
                                    Farbe / Größe
                                </TableHead>
                                <TableHead className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground h-10">
                                    Kunde
                                </TableHead>
                                <TableHead className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground h-10">
                                    Monteur
                                </TableHead>
                                <TableHead className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground h-10">
                                    Fortschritt
                                </TableHead>
                                <TableHead className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground h-10">
                                    Status
                                </TableHead>
                                <TableHead className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground h-10 pr-5 text-right">
                                    Aktionen
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBuilds.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-56 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                            <div className="p-5 rounded-2xl bg-muted/30 border border-border/20 shadow-inner">
                                                <Wrench className="h-10 w-10 opacity-20" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-foreground/70">Keine Neuräder gefunden</p>
                                                <p className="text-xs opacity-60 mt-1.5">
                                                    {hasActiveFilters ? 'Passe die Filter an' : 'Erstelle einen neuen Eintrag oben rechts'}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredBuilds.map(build => {
                                    const statusInfo = getNeuradStatus(build.status)
                                    const progress = getAssemblyProgress(build)

                                    return (
                                        <TableRow
                                            key={build.id}
                                            className="group cursor-pointer transition-colors hover:bg-muted/30 border-b border-border/20 last:border-0"
                                            onClick={() => handleViewBuild(build.id)}
                                        >
                                            {/* Nr / Modell */}
                                            <TableCell className="pl-5 py-3.5">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-[11px] font-bold text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded">
                                                            {build.internal_number || '—'}
                                                        </span>
                                                        {build.is_ebike && (
                                                            <span title="E-Bike" className="p-0.5 rounded-full bg-amber-500/10">
                                                                <Zap className="h-3 w-3 text-amber-500" />
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-semibold text-foreground/90">
                                                        {build.brand} <span className="text-muted-foreground font-medium">{build.model}</span>
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Farbe/Größe */}
                                            <TableCell className="py-3.5">
                                                <div className="flex flex-col text-sm">
                                                    <span className="text-foreground/80 font-medium">{build.color || '—'}</span>
                                                    <span className="text-[11px] text-muted-foreground leading-tight tracking-tight uppercase font-medium">{build.frame_size || ''}</span>
                                                </div>
                                            </TableCell>

                                            {/* Kunde */}
                                            <TableCell className="py-3.5">
                                                <div className="flex flex-col text-sm">
                                                    <span className="font-semibold text-foreground/80">{build.customer_name || <span className="text-muted-foreground/60 italic font-medium text-xs">Lager</span>}</span>
                                                    {build.customer_email && (
                                                        <span className="text-[11px] text-muted-foreground/60 truncate max-w-[140px] font-medium leading-none mt-0.5">{build.customer_email}</span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Mechaniker */}
                                            <TableCell className="py-3.5" onClick={e => e.stopPropagation()}>
                                                {build.assigned_employee_id ? (
                                                    <Badge variant="outline" className="bg-background/40 hover:bg-background/60 shadow-xs border-border/40 text-[11px] font-medium py-0 px-2 h-5 transition-colors">
                                                        {getEmployeeName(build.assigned_employee_id)}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-[11px] text-muted-foreground/30 italic font-medium">—</span>
                                                )}
                                            </TableCell>

                                            {/* Fortschritt */}
                                            <TableCell className="py-3.5">
                                                {progress.total > 0 ? (
                                                    <div className="flex items-center gap-2.5 min-w-[90px]">
                                                        <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden shadow-inner border border-border/5">
                                                            <div
                                                                className={cn(
                                                                    "h-full rounded-full transition-all duration-500 ease-out shadow-sm",
                                                                    progress.pct === 100 ? "bg-emerald-500" : "bg-primary"
                                                                )}
                                                                style={{ width: `${progress.pct}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground font-bold font-mono whitespace-nowrap bg-muted/40 px-1 py-0.5 rounded border border-border/20">
                                                            {progress.pct}%
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground/20 italic">—</span>
                                                )}
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell className="py-3.5">
                                                <Badge
                                                    variant="secondary"
                                                    className={cn(
                                                        "font-medium border shadow-xs text-[10px] uppercase tracking-wider py-0 px-2 h-5",
                                                        statusInfo.color
                                                    )}
                                                >
                                                    <div className={cn("h-1.5 w-1.5 rounded-full mr-1.5 shadow-sm", statusInfo.dotColor)} />
                                                    {statusInfo.label}
                                                </Badge>
                                            </TableCell>

                                            {/* Aktionen */}
                                            <TableCell className="text-right pr-4 py-3.5">
                                                <div className="flex justify-end gap-1.5">
                                                    {/* Mechaniker zuweisen */}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg opacity-0 lg:group-hover:opacity-100 transition-all duration-200"
                                                                onClick={e => e.stopPropagation()}
                                                            >
                                                                <UserPlus className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-56">
                                                            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 px-3 py-2">Mechaniker zuweisen</DropdownMenuLabel>
                                                            <DropdownMenuSeparator className="bg-border/40" />
                                                            <DropdownMenuItem className="text-xs py-2 px-3 focus:bg-muted" onClick={e => { e.stopPropagation(); handleAssignEmployee(build.id, null) }}>
                                                                <X className="mr-2 h-3.5 w-3.5 text-muted-foreground/60" />
                                                                <span>Keine Zuweisung</span>
                                                            </DropdownMenuItem>
                                                            {employees.map(emp => (
                                                                <DropdownMenuItem
                                                                    key={emp.id}
                                                                    className="text-xs py-2 px-3 focus:bg-muted"
                                                                    onClick={e => { e.stopPropagation(); handleAssignEmployee(build.id, emp.id) }}
                                                                >
                                                                    <Users className="mr-2 h-3.5 w-3.5 text-muted-foreground/60" />
                                                                    <span className="font-medium">{emp.name}</span>
                                                                    {build.assigned_employee_id === emp.id && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>

                                                    {/* Details */}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg border border-transparent lg:hover:border-primary/20 transition-all"
                                                        onClick={e => { e.stopPropagation(); handleViewBuild(build.id) }}
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
