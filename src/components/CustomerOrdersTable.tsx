import useSWR from "swr"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { 
    Search, 
    MoreHorizontal, 
    ExternalLink, 
    Trash2, 
    Mail, 
    Phone,
    Package
} from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { toastSuccess, toastError } from "@/lib/toast-utils"
import type { CustomerOrder } from "@/types"

export function CustomerOrdersTable() {
    const { workshopId } = useAuth()
    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState("")

    const fetchCustomerOrders = async () => {
        if (!workshopId) return []
        const { data, error } = await supabase
            .from("customer_orders")
            .select("*")
            .eq("workshop_id", workshopId)
            .order("created_at", { ascending: false })

        if (error) throw error
        return data as CustomerOrder[]
    }

    const { data: orders = [], isLoading, mutate } = useSWR(
        workshopId ? ["customer_orders", workshopId] : null,
        fetchCustomerOrders
    )

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from("customer_orders")
                .delete()
                .eq("id", id)

            if (error) throw error
            toastSuccess("Gelöscht", "Bestellung wurde entfernt.")
            mutate()
        } catch (error) {
            toastError("Fehler", "Konnte nicht gelöscht werden.")
        }
    }

    const filteredOrders = orders.filter(order => 
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Lädt...</div>
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 max-w-sm px-3 py-2 rounded-lg border border-border/40 bg-muted/20 focus-within:bg-background transition-all">
                <Search className="h-4 w-4 text-muted-foreground/40" />
                <input
                    placeholder="Suchen nach Kunde oder Artikel..."
                    className="bg-transparent text-sm outline-none w-full"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="rounded-xl border border-border/40 bg-background overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-b border-border/30">
                            <TableHead className="w-[200px] text-[10px] uppercase tracking-wider font-bold text-muted-foreground/50">Kunde</TableHead>
                            <TableHead className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/50">Artikel</TableHead>
                            <TableHead className="w-[150px] text-[10px] uppercase tracking-wider font-bold text-muted-foreground/50">Status</TableHead>
                            <TableHead className="w-[120px] text-[10px] uppercase tracking-wider font-bold text-muted-foreground/50">Datum</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                        <Package className="h-8 w-8 opacity-20" />
                                        <p>Keine Bestellungen gefunden</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredOrders.map(order => (
                                <TableRow 
                                    key={order.id} 
                                    className="group hover:bg-muted/30 cursor-pointer transition-colors"
                                    onClick={() => navigate(`/dashboard/customer-orders/${order.id}`)}
                                >
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-semibold text-sm">{order.customer_name}</span>
                                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                                {order.customer_email && <Mail className="h-3 w-3" />}
                                                {order.customer_phone && <Phone className="h-3 w-3" />}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {order.items.map((item, i) => (
                                                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium border border-border/40">
                                                    {item.quantity}x {item.name}
                                                </span>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={order.status} variant="customer_order" />
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-[11px] font-mono text-muted-foreground">
                                            {new Date(order.created_at).toLocaleDateString('de-DE')}
                                        </span>
                                    </TableCell>
                                    <TableCell onClick={e => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => navigate(`/dashboard/customer-orders/${order.id}`)}>
                                                    <ExternalLink className="mr-2 h-4 w-4" /> Details öffnen
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem 
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={() => handleDelete(order.id)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" /> Löschen
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
