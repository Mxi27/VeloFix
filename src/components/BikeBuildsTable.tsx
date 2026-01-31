import useSWR from "swr"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { BUILD_STATUS_COLORS } from "@/lib/constants"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Eye } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { BikeBuildCard } from "@/components/BikeBuildCard"

interface BikeBuild {
    id: string
    build_number: string
    customer_name: string
    customer_email: string | null
    frame_brand: string | null
    frame_model: string | null
    build_type: 'custom' | 'production'
    status: string
    estimated_completion: string | null
    total_budget: number | null
    created_at: string
}

type TableMode = 'active' | 'completed'

interface BikeBuildsTableProps {
    mode?: TableMode
}

export function BikeBuildsTable({ mode = 'active' }: BikeBuildsTableProps) {
    const { workshopId } = useAuth()
    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState("")
    const [filterStatus, setFilterStatus] = useState("all")

    const fetchBikeBuilds = async () => {
        if (!workshopId) return []

        let query = supabase
            .from('bike_builds')
            .select('*')
            .eq('workshop_id', workshopId)
            .order('created_at', { ascending: false })

        if (mode === 'completed') {
            query = query.eq('status', 'delivered')
        } else {
            query = query.neq('status', 'delivered')
        }

        const { data, error } = await query

        if (error) throw error
        return data as BikeBuild[]
    }

    const { data: builds = [], isLoading } = useSWR(
        workshopId ? ['bike-builds', workshopId, mode] : null,
        fetchBikeBuilds,
        {
            refreshInterval: 30000,
            revalidateOnFocus: true
        }
    )

    const loading = isLoading

    const filteredBuilds = builds.filter(build => {
        const matchesSearch =
            build.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            build.build_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (build.frame_brand?.toLowerCase() || '').includes(searchTerm.toLowerCase())

        const matchesStatus =
            mode === 'active'
                ? (filterStatus === 'all' ? true : build.status === filterStatus)
                : true

        return matchesSearch && matchesStatus
    })

    const handleViewBuild = (buildId: string) => {
        const returnPath = mode === 'completed' ? '/dashboard/bike-builds/completed' : '/dashboard/bike-builds'
        navigate(`/dashboard/bike-builds/${buildId}`, { state: { from: returnPath } })
    }

    const renderCards = (buildsToRender: BikeBuild[]) => (
        <div className="grid grid-cols-1 gap-4 md:hidden">
            {buildsToRender.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                    <Search className="h-8 w-8 opacity-20" />
                    <p className="text-muted-foreground">Keine Bike Builds gefunden</p>
                </div>
            ) : (
                buildsToRender.map((build) => (
                    <BikeBuildCard key={build.id} build={build} onViewBuild={handleViewBuild} />
                ))
            )}
        </div>
    )

    const renderTable = (buildsToRender: BikeBuild[]) => (
        <div className="hidden md:block rounded-xl border border-glass-border bg-glass-bg overflow-x-auto backdrop-blur-md">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/40">
                        <TableHead className="w-[110px] pl-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Nr.</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Kunde</TableHead>
                        <TableHead className="hidden md:table-cell font-semibold text-xs uppercase tracking-wider text-muted-foreground">Rahmen</TableHead>
                        <TableHead className="hidden sm:table-cell font-semibold text-xs uppercase tracking-wider text-muted-foreground">Typ</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                        <TableHead className="hidden lg:table-cell font-semibold text-xs uppercase tracking-wider text-muted-foreground">Budget</TableHead>
                        <TableHead className="hidden lg:table-cell font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fertigstellung</TableHead>
                        <TableHead className="text-right pr-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Aktion</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {buildsToRender.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <Search className="h-8 w-8 opacity-20" />
                                    <p>Keine Bike Builds gefunden</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        buildsToRender.map((build) => (
                            <TableRow
                                key={build.id}
                                className="hover:bg-muted/40 cursor-pointer transition-colors border-b border-border/40 last:border-0"
                                onClick={() => handleViewBuild(build.id)}
                            >
                                <TableCell className="pl-4 py-4 font-mono text-sm font-medium text-primary">
                                    {build.build_number}
                                </TableCell>
                                <TableCell className="py-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm text-foreground">{build.customer_name}</span>
                                        <span className="text-xs text-muted-foreground/80 truncate max-w-[120px]">
                                            {build.customer_email || '—'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell py-4 text-sm text-muted-foreground">
                                    {build.frame_brand && build.frame_model
                                        ? `${build.frame_brand} ${build.frame_model}`
                                        : build.frame_brand || build.frame_model || '—'}
                                </TableCell>
                                <TableCell className="hidden sm:table-cell py-4">
                                    <Badge
                                        variant="outline"
                                        className={build.build_type === 'custom'
                                            ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                                            : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                                        }
                                    >
                                        {build.build_type === 'custom' ? "Custom" : "Produktion"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="py-4">
                                    <Badge
                                        variant="secondary"
                                        className={`capitalize font-normal border ${BUILD_STATUS_COLORS[build.status] || "bg-muted text-foreground border-border/60"}`}
                                    >
                                        {build.status.replace(/_/g, ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell className="hidden lg:table-cell py-4 text-sm text-muted-foreground">
                                    {build.total_budget
                                        ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(build.total_budget)
                                        : '—'}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell py-4 text-xs text-muted-foreground">
                                    {build.estimated_completion
                                        ? new Date(build.estimated_completion).toLocaleDateString('de-DE')
                                        : '—'}
                                </TableCell>
                                <TableCell className="text-right pr-4 py-4">
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
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )

    const getTitle = () => {
        switch (mode) {
            case 'completed': return "Abgeschlossene Builds"
            default: return "Aktive Builds"
        }
    }

    if (loading) {
        return (
            <Card >
                <CardContent className="p-12">
                    <div className="flex items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card >
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                        <CardTitle className="text-xl font-bold tracking-tight">
                            {getTitle()}
                        </CardTitle>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.reload()}
                        disabled={loading}
                        className="shrink-0 bg-background/50 hover:bg-muted/50 backdrop-blur-sm"
                    >
                        {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" /> : <Filter className="mr-2 h-4 w-4" />}
                        {loading ? "Lädt..." : "Aktualisieren"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {mode === 'active' ? (
                    <Tabs defaultValue="all" className="space-y-6" onValueChange={setFilterStatus}>
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2 w-full md:w-auto md:flex-1 relative max-w-sm">
                                <Search className="h-4 w-4 absolute left-3 text-muted-foreground" />
                                <Input
                                    placeholder="Suche nach Kunde, Build-Nummer oder Rahmen..."
                                    className="pl-9 bg-background"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <TabsList variant="line" className="w-full md:w-auto overflow-x-auto flex-nowrap justify-start no-scrollbar pb-1">
                                <TabsTrigger value="all" className="whitespace-nowrap">Alle</TabsTrigger>
                                <TabsTrigger value="planning" className="whitespace-nowrap">Planung</TabsTrigger>
                                <TabsTrigger value="in_progress" className="whitespace-nowrap">In Bau</TabsTrigger>
                                <TabsTrigger value="assembly" className="whitespace-nowrap">Montage</TabsTrigger>
                                <TabsTrigger value="final_touches" className="whitespace-nowrap">Finishing</TabsTrigger>
                                <TabsTrigger value="ready" className="whitespace-nowrap">Bereit</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="all" className="mt-0">
                            {renderCards(filteredBuilds)}
                            {renderTable(filteredBuilds)}
                        </TabsContent>
                        <TabsContent value="planning" className="mt-0">
                            {renderCards(filteredBuilds)}
                            {renderTable(filteredBuilds)}
                        </TabsContent>
                        <TabsContent value="in_progress" className="mt-0">
                            {renderCards(filteredBuilds)}
                            {renderTable(filteredBuilds)}
                        </TabsContent>
                        <TabsContent value="assembly" className="mt-0">
                            {renderCards(filteredBuilds)}
                            {renderTable(filteredBuilds)}
                        </TabsContent>
                        <TabsContent value="final_touches" className="mt-0">
                            {renderCards(filteredBuilds)}
                            {renderTable(filteredBuilds)}
                        </TabsContent>
                        <TabsContent value="ready" className="mt-0">
                            {renderCards(filteredBuilds)}
                            {renderTable(filteredBuilds)}
                        </TabsContent>
                    </Tabs>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 max-w-sm relative">
                            <Search className="h-4 w-4 absolute left-3 text-muted-foreground" />
                            <Input
                                placeholder="Suche in abgeschlossenen Builds..."
                                className="pl-9 bg-background"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {renderCards(filteredBuilds)}
                        {renderTable(filteredBuilds)}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
