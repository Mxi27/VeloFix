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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Eye, Trash2, RotateCcw } from "lucide-react"
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


type TableMode = 'active' | 'archived' | 'leasing_billing' | 'trash'

interface OrdersTableProps {
    mode?: TableMode
    // Backward compatibility prop (optional)
    showArchived?: boolean
}

export function OrdersTable({ mode = 'active', showArchived }: OrdersTableProps) {
    const { workshopId, userRole } = useAuth()
    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState("")
    const [filterStatus, setFilterStatus] = useState("all")
    const [orderToDelete, setOrderToDelete] = useState<string | null>(null)

    const handleDeleteOrder = async () => {
        if (!orderToDelete) return

        try {
            if (effectiveMode === 'trash') {
                // Permanent Delete
                const { error } = await supabase
                    .from('orders')
                    .delete()
                    .eq('id', orderToDelete)

                if (error) throw error
            } else {
                // Soft Delete (Move to Trash)
                const { error } = await supabase
                    .from('orders')
                    .update({ status: 'trash', trash_date: new Date().toISOString() })
                    .eq('id', orderToDelete)

                if (error) throw error
            }

            mutate() // Refresh list
            toastSuccess('Auftrag gelöscht', 'Der Auftrag wurde erfolgreich gelöscht.')
        } catch (error) {
            toastError('Fehler beim Löschen', 'Der Auftrag konnte nicht gelöscht werden.')
        } finally {
            setOrderToDelete(null)
        }
    }

    const handleRestoreOrder = async (orderId: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'eingegangen', trash_date: null }) // Restore to default status
                .eq('id', orderId)

            if (error) throw error
            mutate()
            toastSuccess('Wiederhergestellt', 'Der Auftrag wurde erfolgreich wiederhergestellt.')
        } catch (error) {
            toastError('Fehler beim Wiederherstellen', 'Der Auftrag konnte nicht wiederhergestellt werden.')
        }
    }

    // Resolve effective mode
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
            // Leasing billing: is_leasing = true AND status = 'abgeholt'
            query = query.eq('is_leasing', true).eq('status', 'abgeholt')
        } else if (effectiveMode === 'trash') {
            query = query.eq('status', 'trash')
        } else {
            // Active: Exclude 'abgeschlossen', 'abgeholt', AND 'trash'
            query = query.neq('status', 'abgeschlossen').neq('status', 'abgeholt').neq('status', 'trash')

            // Also exclude 'trash' explicitly just in case string matching overlaps, though 'trash' !='abgeschlossen'
        }

        const { data, error } = await query

        if (error) throw error
        return data as Order[]
    }

    const { data: orders = [], isLoading, mutate } = useSWR(
        workshopId ? ['orders', workshopId, effectiveMode] : null,
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
            effectiveMode === 'active'
                ? (filterStatus === 'all' ? true : order.status === filterStatus)
                : true

        return matchesSearch && matchesStatus
    })

    const handleViewOrder = (orderId: string) => {
        let returnPath = '/dashboard'
        if (effectiveMode === 'archived') returnPath = '/dashboard/archive'
        if (effectiveMode === 'leasing_billing') returnPath = '/dashboard/leasing-billing'

        navigate(`/dashboard/orders/${orderId}`, { state: { from: returnPath } })
    }

    const renderTable = (ordersToRender: Order[]) => (
        <div className="rounded-xl border border-border/60 bg-background overflow-x-auto shadow-sm">
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
                                        className={`capitalize font-normal border ${STATUS_COLORS[order.status] || "bg-muted text-foreground border-border/60"}`}
                                    >
                                        {order.status.replace(/_/g, ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell className="hidden lg:table-cell py-4 text-xs text-muted-foreground font-mono">
                                    {new Date(order.created_at).toLocaleDateString('de-DE')}
                                </TableCell>
                                <TableCell className="text-right pr-4 py-4">
                                    <div className="flex justify-end gap-2">
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
                                        {userRole === 'admin' && effectiveMode === 'trash' && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-green-600 hover:bg-green-50 rounded-full"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleRestoreOrder(order.id)
                                                    }}
                                                    title="Wiederherstellen"
                                                >
                                                    <RotateCcw className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setOrderToDelete(order.id)
                                                    }}
                                                    title="Endgültig löschen"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )

    const getTitle = () => {
        switch (effectiveMode) {
            case 'archived': return "Archivierte Aufträge"
            case 'leasing_billing': return "Leasing Abrechnung (Abgeholt)"
            case 'trash': return "Papierkorb"
            default: return "Aktive Aufträge"
        }
    }

    return (
        <>
            <Card className="border-none shadow-sm bg-card/50">
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
                    {effectiveMode === 'active' ? (
                        <Tabs defaultValue="all" className="space-y-6" onValueChange={setFilterStatus}>
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-2 w-full md:w-auto md:flex-1 relative max-w-sm">
                                    <Search className="h-4 w-4 absolute left-3 text-muted-foreground" />
                                    <Input
                                        placeholder="Suche nach Kunde, Auftragsnummer oder Modell..."
                                        className="pl-9 bg-background"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <TabsList variant="line" className="w-full md:w-auto overflow-x-auto flex-nowrap justify-start no-scrollbar pb-1">
                                    <TabsTrigger value="all" className="whitespace-nowrap">Alle</TabsTrigger>
                                    <TabsTrigger value="eingegangen" className="whitespace-nowrap">Eingegangen</TabsTrigger>
                                    <TabsTrigger value="warten_auf_teile" className="whitespace-nowrap">Warten auf Teile</TabsTrigger>
                                    <TabsTrigger value="in_bearbeitung" className="whitespace-nowrap">In Bearbeitung</TabsTrigger>
                                    <TabsTrigger value="abholbereit" className="whitespace-nowrap">Abholbereit</TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="all" className="mt-0">
                                {renderTable(filteredOrders)}
                            </TabsContent>
                            <TabsContent value="eingegangen" className="mt-0">
                                {renderTable(filteredOrders)}
                            </TabsContent>
                            <TabsContent value="warten_auf_teile" className="mt-0">
                                {renderTable(filteredOrders)}
                            </TabsContent>
                            <TabsContent value="in_bearbeitung" className="mt-0">
                                {renderTable(filteredOrders)}
                            </TabsContent>
                            <TabsContent value="abholbereit" className="mt-0">
                                {renderTable(filteredOrders)}
                            </TabsContent>
                        </Tabs>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 max-w-sm relative">
                                <Search className="h-4 w-4 absolute left-3 text-muted-foreground" />
                                <Input
                                    placeholder={effectiveMode === 'archived' ? "Suche im Archiv..." : (effectiveMode === 'trash' ? "Suche im Papierkorb..." : "Suche in Abrechnung...")}
                                    className="pl-9 bg-background"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            {renderTable(filteredOrders)}
                        </div>
                    )}
                </CardContent>

                <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Auftrag wirklich löschen?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {effectiveMode === 'trash'
                                    ? "Diese Aktion kann nicht rückgängig gemacht werden. Der Auftrag wird dauerhaft aus der Datenbank entfernt."
                                    : "Der Auftrag wird in den Papierkorb verschoben und nach 30 Tagen automatisch endgültig gelöscht."}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteOrder}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            >
                                {effectiveMode === 'trash' ? "Endgültig löschen" : "Verschieben"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </Card>
        </>
    )
}
