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
import { Search, Eye, UserPlus, Users, X, Check, Wrench, Zap, RefreshCw } from "lucide-react"
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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
    const hasActiveFilters = searchTerm || filterEmployee !== 'all' || filterStatus !== 'all'

    return (
        <div className="space-y-4">
            {/* Filter Bar — identical to OrdersTable style */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Suche nach Modell, Marke, Nummer..."
                        className="pl-9 h-10 bg-background/80 border-border/50"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="h-10 w-[150px] bg-background/80 border-border/50">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Alle Status</SelectItem>
                            {NEURAD_STATUSES.map(s => (
                                <SelectItem key={s.value} value={s.value}>
                                    <div className="flex items-center gap-2">
                                        <div className={cn("h-2 w-2 rounded-full", s.dotColor)} />
                                        {s.label}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                        <SelectTrigger className="h-10 w-[160px] bg-background/80 border-border/50">
                            <SelectValue placeholder="Mitarbeiter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Alle Mitarbeiter</SelectItem>
                            <SelectItem value="unassigned">Nicht zugewiesen</SelectItem>
                            {employees.map(emp => (
                                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => mutate()}
                        disabled={isLoading}
                        className="h-10 w-10 bg-background/80 border-border/50"
                        title="Aktualisieren"
                    >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </Button>

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 px-3 text-muted-foreground"
                            onClick={() => {
                                setSearchTerm("")
                                setFilterEmployee("all")
                                setFilterStatus("all")
                            }}
                        >
                            <X className="h-4 w-4 mr-1" />
                            Reset
                        </Button>
                    )}
                </div>
            </div>

            {/* Summary row */}
            {filteredBuilds.length > 0 && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
                    <span>{filteredBuilds.length} Einträge</span>
                    {activeCount > 0 && (
                        <>
                            <span>•</span>
                            <span className="text-blue-600 dark:text-blue-400">
                                {activeCount} in Montage
                            </span>
                        </>
                    )}
                </div>
            )}

            {/* Table — Dashboard-style */}
            <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent bg-muted/30 border-b border-border/40">
                            <TableHead className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground h-11 pl-5">
                                Nr. / Modell
                            </TableHead>
                            <TableHead className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground h-11">
                                Farbe / Größe
                            </TableHead>
                            <TableHead className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground h-11">
                                Kunde
                            </TableHead>
                            <TableHead className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground h-11">
                                Monteur
                            </TableHead>
                            <TableHead className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground h-11">
                                Fortschritt
                            </TableHead>
                            <TableHead className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground h-11">
                                Status
                            </TableHead>
                            <TableHead className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground h-11 pr-5 text-right">
                                Aktionen
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredBuilds.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-44 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                        <div className="p-4 rounded-full bg-muted/50">
                                            <Wrench className="h-8 w-8 opacity-30" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">Keine Neuräder gefunden</p>
                                            <p className="text-xs opacity-60 mt-1">
                                                {hasActiveFilters ? 'Passe die Filter an' : 'Erstelle einen neuen Eintrag'}
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
                                        className="group cursor-pointer transition-colors hover:bg-muted/40 border-b border-border/30 last:border-0"
                                        onClick={() => handleViewBuild(build.id)}
                                    >
                                        {/* Nr / Modell */}
                                        <TableCell className="pl-5 py-3.5">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-semibold text-primary">
                                                        {build.internal_number || '—'}
                                                    </span>
                                                    {build.is_ebike && (
                                                        <span title="E-Bike">
                                                            <Zap className="h-3 w-3 text-amber-500" />
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-sm font-medium text-foreground">
                                                    {build.brand} <span className="text-muted-foreground font-normal">{build.model}</span>
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Farbe/Größe */}
                                        <TableCell className="py-3.5">
                                            <div className="flex flex-col text-sm">
                                                <span className="text-foreground">{build.color || '—'}</span>
                                                <span className="text-xs text-muted-foreground">{build.frame_size || ''}</span>
                                            </div>
                                        </TableCell>

                                        {/* Kunde */}
                                        <TableCell className="py-3.5">
                                            <div className="flex flex-col text-sm">
                                                <span className="font-medium text-foreground">{build.customer_name || <span className="text-muted-foreground italic text-xs">Lager</span>}</span>
                                                {build.customer_email && (
                                                    <span className="text-xs text-muted-foreground/70 truncate max-w-[140px]">{build.customer_email}</span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Mechaniker */}
                                        <TableCell className="py-3.5" onClick={e => e.stopPropagation()}>
                                            {build.assigned_employee_id ? (
                                                <Badge variant="outline" className="bg-background/60 text-xs font-normal">
                                                    {getEmployeeName(build.assigned_employee_id)}
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">—</span>
                                            )}
                                        </TableCell>

                                        {/* Fortschritt */}
                                        <TableCell className="py-3.5">
                                            {progress.total > 0 ? (
                                                <div className="flex items-center gap-2 min-w-[80px]">
                                                    <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                "h-full rounded-full transition-all",
                                                                progress.pct === 100 ? "bg-green-500" : "bg-primary"
                                                            )}
                                                            style={{ width: `${progress.pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                                                        {progress.pct}%
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground/40">—</span>
                                            )}
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell className="py-3.5">
                                            <Badge
                                                variant="secondary"
                                                className={cn(
                                                    "font-normal border text-xs",
                                                    statusInfo.color
                                                )}
                                            >
                                                <div className={cn("h-1.5 w-1.5 rounded-full mr-1.5", statusInfo.dotColor)} />
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
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            <UserPlus className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel className="text-xs">Mechaniker zuweisen</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={e => { e.stopPropagation(); handleAssignEmployee(build.id, null) }}>
                                                            <X className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                                            <span className="text-sm">Keine Zuweisung</span>
                                                        </DropdownMenuItem>
                                                        {employees.map(emp => (
                                                            <DropdownMenuItem
                                                                key={emp.id}
                                                                onClick={e => { e.stopPropagation(); handleAssignEmployee(build.id, emp.id) }}
                                                            >
                                                                <Users className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                                                <span className="text-sm">{emp.name}</span>
                                                                {build.assigned_employee_id === emp.id && <Check className="ml-auto h-3.5 w-3.5" />}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>

                                                {/* Details */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
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
        </div>
    )
}
