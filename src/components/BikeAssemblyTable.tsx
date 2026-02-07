import useSWR from "swr"
import { toastSuccess, toastError } from '@/lib/toast-utils'
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { STATUS_COLORS } from "@/lib/constants"
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
import { Search, Filter, Eye, Wrench, UserPlus, Users, X, Check } from "lucide-react"
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


interface BikeBuild {
    id: string
    internal_number: string // Mapped to 'order_number' for display if needed, or treated as independent
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
}

export function BikeAssemblyTable() {
    const { workshopId } = useAuth()
    const { employees } = useEmployee()
    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState("")
    const [filterEmployee, setFilterEmployee] = useState<string>("all")
    const [filterStatus, setFilterStatus] = useState<string>("all")
    const [columns, setColumns] = useState<any[]>([])

    // Fetch dynamic columns config
    const { data: configData } = useSWR(
        workshopId ? ['neurad_configs', workshopId, 'neurad_table_columns'] : null,
        async () => {
            const { data, error } = await supabase
                .from('neurad_configs')
                .select('config_value')
                .eq('workshop_id', workshopId)
                .eq('config_key', 'neurad_table_columns')
                .maybeSingle()

            if (error) return null
            return data?.config_value
        }
    )

    // Update columns when config loads or set defaults
    useSWR(
        workshopId ? ['neurad_cols_init', workshopId, configData] : null,
        () => {
            if (configData && Array.isArray(configData)) {
                let loadedCols = [...configData]
                // Ensure new columns exist if missing from saved config
                if (!loadedCols.find((c: any) => c.key === 'assigned_employee_id')) {
                    // Insert before status or at end
                    loadedCols.splice(3, 0, { key: "assigned_employee_id", label: "Mechaniker", visible: true })
                }
                setColumns(loadedCols)
            } else {
                // Fallback defaults adapted for BikeBuilds
                setColumns([
                    { key: "internal_number", label: "Int. Nr.", visible: true },
                    { key: "brand_model", label: "Modell", visible: true },
                    { key: "customer_name", label: "Kunde", visible: true },
                    { key: "assigned_employee_id", label: "Mechaniker", visible: true },
                    { key: "status", label: "Status", visible: true },
                    { key: "created_at", label: "Datum", visible: true },
                    { key: "actions", label: "Aktion", visible: true }
                ])
            }
        },
        { revalidateOnFocus: false }
    )

    const handleAssignEmployee = async (buildId: string, employeeId: string | null) => {
        // Optimistic update
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
        } catch (error) {
            toastError('Fehler', 'Mechaniker konnte nicht zugewiesen werden.')
            mutate()
        }
    }

    const fetchBuilds = async () => {
        if (!workshopId) return []

        const { data, error } = await supabase
            .from('bike_builds')
            .select('*')
            .eq('workshop_id', workshopId)
            // .neq('status', 'abgeschlossen') // TODO: Decide on status filtering for builds
            .order('created_at', { ascending: false })

        if (error) throw error
        return data as BikeBuild[]
    }

    const { data: builds = [], isLoading, mutate } = useSWR(
        workshopId ? ['bike_builds', workshopId] : null,
        fetchBuilds,
        {
            refreshInterval: 30000,
            revalidateOnFocus: true
        }
    )

    const loading = isLoading

    const filteredBuilds = builds.filter(build => {
        const matchesSearch =
            (build.customer_name && build.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (build.internal_number && build.internal_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (build.model && build.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (build.brand && build.brand.toLowerCase().includes(searchTerm.toLowerCase()))

        const matchesEmployee =
            filterEmployee === 'all'
                ? true
                : filterEmployee === 'unassigned'
                    ? build.assigned_employee_id === null
                    : build.assigned_employee_id === filterEmployee

        const matchesStatus =
            filterStatus === 'all'
                ? true
                : build.status === filterStatus

        return matchesSearch && matchesEmployee && matchesStatus
    })



    const handleViewBuild = (buildId: string) => {
        navigate(`/dashboard/bike-builds/${buildId}`, { state: { from: '/dashboard/bike-builds' } })
    }

    const getEmployeeName = (id: string | null) => {
        if (!id) return null
        return employees.find(e => e.id === id)?.name || "Unbekannt"
    }

    // Reuse OrderCard style but adapted for BikeBuild? 
    // For now we only render table on desktop, mobile cards we skip or use simple list
    // To keep it simple, I'll focus on the table first. Mobile view might need a specific BikeBuildCard.

    const renderTable = (buildsToRender: BikeBuild[]) => (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/30 border-b">
                        {columns.filter(c => c.visible).map((col: any) => (
                            <TableHead key={col.key} className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground h-11 px-4 first:pl-5 last:pr-5">
                                {col.label}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {buildsToRender.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={columns.filter(c => c.visible).length} className="h-40 text-center">
                                <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                    <div className="p-4 rounded-full bg-muted/50">
                                        <Wrench className="h-8 w-8 opacity-40" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Keine Neuräder gefunden</p>
                                        <p className="text-sm opacity-70">Erstelle einen neuen Aufbau um zu starten</p>
                                    </div>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        buildsToRender.map((build) => (
                            <TableRow
                                key={build.id}
                                className="group cursor-pointer transition-colors hover:bg-muted/40 border-b last:border-0"
                                onClick={() => handleViewBuild(build.id)}
                            >
                                {columns.filter(c => c.visible).map((col: any) => {
                                    if (col.key === 'internal_number') {
                                        return (
                                            <TableCell key={col.key} className="pl-4 py-4 font-mono text-sm font-medium text-primary">
                                                {build.internal_number}
                                            </TableCell>
                                        )
                                    }
                                    if (col.key === 'customer_name') {
                                        return (
                                            <TableCell key={col.key} className="py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm text-foreground">{build.customer_name || '—'}</span>
                                                    <span className="text-xs text-muted-foreground/80 truncate max-w-[120px]">
                                                        {build.customer_email || ''}
                                                    </span>
                                                </div>
                                            </TableCell>
                                        )
                                    }
                                    if (col.key === 'brand_model' || col.key === 'bike_model') {
                                        return (
                                            <TableCell key={col.key} className="py-4 text-sm text-muted-foreground">
                                                <span className="font-medium text-foreground">{build.brand}</span> {build.model}
                                            </TableCell>
                                        )
                                    }
                                    if (col.key === 'assigned_employee_id') {
                                        return (
                                            <TableCell key={col.key} className="py-4" onClick={(e) => e.stopPropagation()}>
                                                {build.assigned_employee_id ? (
                                                    <Badge variant="outline" className="bg-background">
                                                        {getEmployeeName(build.assigned_employee_id)}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">—</span>
                                                )}
                                            </TableCell>
                                        )
                                    }
                                    if (col.key === 'status') {
                                        return (
                                            <TableCell key={col.key} className="py-4">
                                                <Badge
                                                    variant="secondary"
                                                    className={`capitalize font-normal border ${STATUS_COLORS[build.status] || "bg-muted text-foreground border-border/60"}`}
                                                >
                                                    {(build.status || 'offen').replace(/_/g, ' ')}
                                                </Badge>
                                            </TableCell>
                                        )
                                    }
                                    if (col.key === 'created_at') {
                                        return (
                                            <TableCell key={col.key} className="py-4 text-xs text-muted-foreground font-mono">
                                                {new Date(build.created_at).toLocaleDateString('de-DE')}
                                            </TableCell>
                                        )
                                    }
                                    if (col.key === 'actions') {
                                        return (
                                            <TableCell key={col.key} className="text-right pr-4 py-4">
                                                <div className="flex justify-end gap-2">
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
                                                            <DropdownMenuLabel>Mechaniker zuweisen</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleAssignEmployee(build.id, null)
                                                            }}>
                                                                <X className="mr-2 h-4 w-4 text-muted-foreground" />
                                                                <span>Keine Zuweisung</span>
                                                            </DropdownMenuItem>
                                                            {employees.map(emp => (
                                                                <DropdownMenuItem
                                                                    key={emp.id}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleAssignEmployee(build.id, emp.id)
                                                                    }}
                                                                >
                                                                    <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                                                                    <span>{emp.name}</span>
                                                                    {build.assigned_employee_id === emp.id && <Check className="ml-auto h-4 w-4" />}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleViewBuild(build.id)
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        )
                                    }
                                    return <TableCell key={col.key} />
                                })}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )

    if (loading) {
        return <OrdersTableSkeleton />
    }

    return (
        <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2 flex-1 relative">
                    <Search className="h-4 w-4 absolute left-3 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Suche nach Modell, Int. Nr..."
                        className="pl-9 h-10 bg-background"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="h-10 w-[130px] bg-background">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Alle Status</SelectItem>
                            <SelectItem value="offen">Offen</SelectItem>
                            <SelectItem value="active">Aktiv</SelectItem>
                            <SelectItem value="fertig">Fertig</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                        <SelectTrigger className="h-10 w-[150px] bg-background">
                            <SelectValue placeholder="Mitarbeiter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Alle</SelectItem>
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
                        disabled={loading}
                        className="h-10 w-10 bg-background"
                    >
                        {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : <Filter className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Table */}
            {renderTable(filteredBuilds)}
        </div>
    )
}
