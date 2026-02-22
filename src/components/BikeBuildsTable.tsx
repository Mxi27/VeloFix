import useSWR from "swr"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
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
import { Badge } from "@/components/ui/badge"
import { Search, Eye } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { RotateCcw as Restore, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface BikeBuild {
    id: string
    created_at: string
    brand: string
    model: string
    color: string
    frame_size: string
    internal_number: string
    battery_serial: string | null
    notes: string | null
    mechanic_name: string | null
}

export function BikeBuildsTable({ mode = 'active' }: { mode?: 'active' | 'trash' }) {
    const { workshopId } = useAuth()
    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState("")

    const fetchBuilds = async () => {
        if (!workshopId) return []

        let query = supabase
            .from('bike_builds')
            .select('*')
            .eq('workshop_id', workshopId)

        if (mode === 'trash') {
            query = query.eq('status', 'trash')
        } else {
            query = query.neq('status', 'trash')
        }

        const { data, error } = await query
            .order('created_at', { ascending: false })

        if (error) throw error
        return data as BikeBuild[]
    }

    const { data: builds = [], isLoading, mutate } = useSWR(
        workshopId ? ['bike_builds', workshopId, mode] : null,
        fetchBuilds
    )

    const handleRestore = async (id: string) => {
        try {
            const { error } = await supabase
                .from('bike_builds')
                .update({ status: 'offen' })
                .eq('id', id)

            if (error) throw error
            toast.success("Wiederhergestellt")
            mutate()
        } catch (error) {
            toast.error("Fehler beim Wiederherstellen")
        }
    }

    const handlePermanentDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from('bike_builds')
                .delete()
                .eq('id', id)

            if (error) throw error
            toast.success("Endgültig gelöscht")
            mutate()
        } catch (error) {
            toast.error("Fehler beim Löschen")
        }
    }


    const filteredBuilds = builds.filter(build => {
        const searchLower = searchTerm.toLowerCase()
        return (
            build.brand.toLowerCase().includes(searchLower) ||
            build.model.toLowerCase().includes(searchLower) ||
            build.internal_number.toLowerCase().includes(searchLower) ||
            (build.mechanic_name || '').toLowerCase().includes(searchLower)
        )
    })

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Lade Daten...</div>
    }

    return (
        <Card className="border-none shadow-sm bg-card/50">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                        <CardTitle className="text-xl font-bold tracking-tight">
                            {mode === 'trash' ? "Papierkorb: Neuradaufbau" : "Neuradaufbau Liste"}
                        </CardTitle>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <div className="flex items-center gap-2 max-w-sm relative">
                        <Search className="h-4 w-4 absolute left-3 text-muted-foreground" />
                        <Input
                            placeholder="Suchen..."
                            className="pl-9 bg-background"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Desktop View */}
                    <div className="hidden md:block w-full min-w-0 overflow-x-auto rounded-xl border border-border/60 bg-background shadow-sm">
                        <Table className="w-full min-w-[600px] md:min-w-full table-fixed">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent bg-muted/40">
                                    <TableHead className="pl-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Datum</TableHead>
                                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground w-[100px]">Nr.</TableHead>
                                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">Marke & Modell</TableHead>
                                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground hidden xl:table-cell">Eigenschaften</TableHead>
                                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground hidden xl:table-cell">Akku Nr.</TableHead>
                                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Mechaniker</TableHead>
                                    <TableHead className="text-right pr-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Aktion</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBuilds.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Search className="h-8 w-8 opacity-20" />
                                                <p>Keine Einträge gefunden</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBuilds.map((build) => (
                                        <TableRow
                                            key={build.id}
                                            className="hover:bg-muted/40 cursor-pointer transition-colors border-b border-border/40 last:border-0"
                                            onClick={() => navigate(`/dashboard/bike-builds/${build.id}`)}
                                        >
                                            <TableCell className="pl-4 py-4 text-xs text-muted-foreground font-mono hidden lg:table-cell">
                                                {format(new Date(build.created_at), 'dd.MM.yyyy', { locale: de })}
                                            </TableCell>
                                            <TableCell className="py-4 font-mono text-sm font-medium text-primary w-[100px]">
                                                {build.internal_number}
                                            </TableCell>
                                            <TableCell className="py-4 hidden md:table-cell">
                                                <div className="flex flex-col max-w-[150px] md:max-w-[250px]">
                                                    <span className="font-medium text-sm text-foreground truncate">{build.brand}</span>
                                                    <span className="text-xs text-muted-foreground/80 truncate">{build.model}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4 hidden xl:table-cell">
                                                <div className="flex gap-2">
                                                    <Badge variant="outline" className="bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20 px-2 py-0.5 text-[10px] uppercase">
                                                        {build.frame_size}
                                                    </Badge>
                                                    <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 px-2 py-0.5 text-[10px] uppercase">
                                                        {build.color}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4 font-mono text-sm text-muted-foreground hidden xl:table-cell">
                                                {build.battery_serial || '—'}
                                            </TableCell>
                                            <TableCell className="py-4 text-sm text-muted-foreground hidden lg:table-cell">
                                                {build.mechanic_name || '—'}
                                            </TableCell>
                                            <TableCell className="text-right pr-4 py-4">
                                                <div className="flex justify-end gap-2">
                                                    {mode === 'trash' ? (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 text-primary hover:bg-primary/10 rounded-full"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRestore(build.id);
                                                                }}
                                                                title="Wiederherstellen"
                                                            >
                                                                <Restore className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 rounded-full"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handlePermanentDelete(build.id);
                                                                }}
                                                                title="Endgültig löschen"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/dashboard/bike-builds/${build.id}`);
                                                            }}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile View - Styled to match list/card look but consistent with desktop cleaner style */}
                    <div className="md:hidden space-y-3">
                        {filteredBuilds.length === 0 ? (
                            <div className="text-center text-muted-foreground py-12 border border-dashed border-border/40 rounded-xl">
                                Keine Einträge gefunden
                            </div>
                        ) : (
                            filteredBuilds.map((build) => (
                                <div
                                    key={build.id}
                                    onClick={() => navigate(`/dashboard/bike-builds/${build.id}`)}
                                    className="bg-background border border-border/60 rounded-xl p-4 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sm">{build.brand}</span>
                                            <span className="text-xs text-muted-foreground">{build.model}</span>
                                        </div>
                                        <span className="font-mono text-sm font-medium text-primary bg-primary/5 px-2 py-1 rounded">
                                            {build.internal_number}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-3">
                                        <Badge variant="outline" className="bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20 px-2 py-0.5 text-[10px] uppercase">
                                            {build.frame_size}
                                        </Badge>
                                        <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 px-2 py-0.5 text-[10px] uppercase">
                                            {build.color}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-3 border-t border-border/40">
                                        <div>
                                            {format(new Date(build.created_at), 'dd.MM.yyyy', { locale: de })}
                                        </div>
                                        <div className="text-right">
                                            {build.mechanic_name || '—'}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </CardContent>

        </Card>
    )
}
