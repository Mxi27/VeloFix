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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Eye } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"

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


export function OrdersTable() {
    const { workshopId } = useAuth()
    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState("")
    const [filterStatus, setFilterStatus] = useState("all")

    const fetchOrders = async () => {
        if (!workshopId) return []

        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('workshop_id', workshopId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data as Order[]
    }

    const { data: orders = [], isLoading } = useSWR(
        workshopId ? ['orders', workshopId] : null,
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
            filterStatus === 'all' ? true :
                filterStatus === 'leasing' ? order.is_leasing :
                    filterStatus === 'repair' ? !order.is_leasing : true

        return matchesSearch && matchesStatus
    })

    const handleViewOrder = (orderId: string) => {
        navigate(`/dashboard/orders/${orderId}`)
    }

    const renderTable = (ordersToRender: Order[]) => (
        <div className="rounded-xl border border-border/60 bg-background overflow-hidden shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/40">
                        <TableHead className="w-[110px] pl-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Nr.</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Kunde</TableHead>
                        <TableHead className="hidden md:table-cell font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fahrrad</TableHead>
                        <TableHead className="hidden sm:table-cell font-semibold text-xs uppercase tracking-wider text-muted-foreground">Typ</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                        <TableHead className="hidden lg:table-cell font-semibold text-xs uppercase tracking-wider text-muted-foreground">Datum</TableHead>
                        <TableHead className="text-right pr-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Aktion</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ordersToRender.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
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
                                <TableCell className="hidden sm:table-cell py-4">
                                    <Badge
                                        variant="outline"
                                        className={order.is_leasing
                                            ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                                            : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                                        }
                                    >
                                        {order.is_leasing ? "Leasing" : "Standard"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="py-4">
                                    <Badge
                                        variant="secondary"
                                        className="capitalize bg-muted text-foreground border border-border/60 font-normal hover:bg-muted/80"
                                    >
                                        {order.status.replace('_', ' ')}
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

    return (
        <Card className="border-none shadow-sm bg-card/50">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                        <CardTitle className="text-xl font-bold tracking-tight">Aktive Aufträge</CardTitle>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchOrders}
                        disabled={loading}
                        className="shrink-0 bg-background hover:bg-muted/50"
                    >
                        {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" /> : <Filter className="mr-2 h-4 w-4" />}
                        {loading ? "Lädt..." : "Aktualisieren"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="all" className="space-y-6" onValueChange={setFilterStatus}>
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-1 relative max-w-sm">
                            <Search className="h-4 w-4 absolute left-3 text-muted-foreground" />
                            <Input
                                placeholder="Suche nach Kunde, Auftragsnummer oder Modell..."
                                className="pl-9 bg-background"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <TabsList variant="line">
                            <TabsTrigger value="all">Alle</TabsTrigger>
                            <TabsTrigger value="leasing">Leasing</TabsTrigger>
                            <TabsTrigger value="repair">Reparatur</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="all" className="mt-0">
                        {renderTable(filteredOrders)}
                    </TabsContent>
                    <TabsContent value="leasing" className="mt-0">
                        {renderTable(filteredOrders)}
                    </TabsContent>
                    <TabsContent value="repair" className="mt-0">
                        {renderTable(filteredOrders)}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
