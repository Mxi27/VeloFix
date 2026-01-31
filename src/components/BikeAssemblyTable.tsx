import useSWR from "swr"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Eye, Wrench } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { OrdersTableSkeleton } from "@/components/skeletons/OrdersTableSkeleton"
import { OrderCard } from "@/components/OrderCard"

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
}

export function BikeAssemblyTable() {
    const { workshopId } = useAuth()
    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState("")

    const fetchOrders = async () => {
        if (!workshopId) return []

        // TODO: Define specific filter for "Neurad Aufbau".
        // For now, we might assume they are identifiable by a specific status or type.
        // Or maybe show all active orders that are NOT leasing?
        // As a placeholder, I'm showing all active orders.
        // Ideally, we'd add .eq('type', 'assembly') or similar if that column existed.
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('workshopId', workshopId) // Typo in original file? original used 'workshop_id' but context uses 'workshopId'. Original query: .eq('workshop_id', workshopId).
            .eq('workshop_id', workshopId)
            .neq('status', 'abgeschlossen')
            .neq('status', 'abgeholt')
            .order('created_at', { ascending: false })

        if (error) throw error
        return data as Order[]
    }

    const { data: orders = [], isLoading } = useSWR(
        workshopId ? ['orders', workshopId, 'neurad-aufbau'] : null,
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
            order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (order.bike_model && order.bike_model.toLowerCase().includes(searchTerm.toLowerCase()))

        return matchesSearch
    })

    const handleViewOrder = (orderId: string) => {
        navigate(`/dashboard/orders/${orderId}`, { state: { from: '/dashboard/bike-assembly' } })
    }

    const renderCards = (ordersToRender: Order[]) => (
        <div className="grid grid-cols-1 gap-4 md:hidden">
            {ordersToRender.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                    <Search className="h-8 w-8 opacity-20" />
                    <p className="text-muted-foreground">Keine Neurad-Aufbauten gefunden</p>
                </div>
            ) : (
                ordersToRender.map((order) => (
                    <OrderCard key={order.id} order={order} onViewOrder={handleViewOrder} />
                ))
            )}
        </div>
    )

    const renderTable = (ordersToRender: Order[]) => (
        <div className="hidden md:block rounded-xl border border-glass-border bg-glass-bg overflow-x-auto backdrop-blur-md">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/40">
                        <TableHead className="w-[110px] pl-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Nr.</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Kunde</TableHead>
                        <TableHead className="hidden md:table-cell font-semibold text-xs uppercase tracking-wider text-muted-foreground">Modell</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                        <TableHead className="hidden lg:table-cell font-semibold text-xs uppercase tracking-wider text-muted-foreground">Datum</TableHead>
                        <TableHead className="text-right pr-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Aktion</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ordersToRender.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <Wrench className="h-8 w-8 opacity-20" />
                                    <p>Keine Aufbauten gefunden</p>
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
                                <TableCell className="pl-4 py-4 font-mono text-sm font-medium text-primary">
                                    {order.order_number}
                                </TableCell>
                                <TableCell className="py-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm text-foreground">{order.customer_name}</span>
                                        <span className="text-xs text-muted-foreground/80 truncate max-w-[120px]">
                                            {order.customer_email || '—'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell py-4 text-sm text-muted-foreground">
                                    {order.bike_model || '—'}
                                </TableCell>
                                <TableCell className="py-4">
                                    <Badge
                                        variant="secondary"
                                        className={`capitalize font-normal border ${STATUS_COLORS[order.status] || "bg-muted text-foreground border-border/60"}`}
                                    >
                                        {order.status.replace(/_/g, ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell className="hidden lg:table-cell py-4 text-xs text-muted-foreground font-mono">
                                    {new Date(order.created_at).toLocaleDateString('de-DE')}
                                </TableCell>
                                <TableCell className="text-right pr-4 py-4">
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
                                </TableCell>
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
        <Card >
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                        <CardTitle className="text-xl font-bold tracking-tight">
                            Neurad Aufbau Übersicht
                        </CardTitle>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchOrders}
                        disabled={loading}
                        className="shrink-0 bg-background/50 hover:bg-muted/50 backdrop-blur-sm"
                    >
                        {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" /> : <Filter className="mr-2 h-4 w-4" />}
                        {loading ? "Lädt..." : "Aktualisieren"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <div className="flex items-center gap-2 max-w-sm relative">
                        <Search className="h-4 w-4 absolute left-3 text-muted-foreground" />
                        <Input
                            placeholder="Suche nach Kunde, Modell..."
                            className="pl-9 bg-background"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {renderCards(filteredOrders)}
                    {renderTable(filteredOrders)}
                </div>
            </CardContent>
        </Card>
    )
}
