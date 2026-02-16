import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { supabase } from "@/lib/supabase"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { PageTransition } from "@/components/PageTransition"
import { CockpitGreeting } from "@/components/dashboard/CockpitGreeting"
import { MyBikesSection } from "@/components/dashboard/MyBikesSection"
import { TasksSection } from "@/components/dashboard/TasksSection"
import { AllRepairsList } from "@/components/dashboard/AllRepairsList"
import type { OrderItem } from "@/components/dashboard/OrderCard"

interface ShopTask {
    id: string
    title: string
    description: string | null
    status: string
    due_date: string | null
    priority: 'low' | 'medium' | 'high'
    created_at: string
}

export default function CockpitPage() {
    const { user, workshopId } = useAuth()
    const { activeEmployee, employees } = useEmployee()

    const [myOrders, setMyOrders] = useState<OrderItem[]>([])
    const [allOrders, setAllOrders] = useState<OrderItem[]>([])
    const [qcOrders, setQcOrders] = useState<OrderItem[]>([])
    const [shopTasks, setShopTasks] = useState<ShopTask[]>([])
    const [loading, setLoading] = useState(true)

    const fetchAll = async () => {
        if (!workshopId || !user) return

        // Resolve Employee ID
        let employeeId = activeEmployee?.id
        if (!employeeId) {
            const { data: empData } = await supabase
                .from('employees')
                .select('id')
                .or(`user_id.eq.${user.id},email.eq.${user.email}`)
                .eq('workshop_id', workshopId)
                .maybeSingle()
            if (empData) employeeId = empData.id
        }

        // Fetch all active orders for the workshop (excluding completed and ready for pickup)
        const { data: orders } = await supabase
            .from('orders')
            .select('id, order_number, customer_name, bike_model, status, due_date, created_at, mechanic_ids, qc_mechanic_id')
            .eq('workshop_id', workshopId)
            .neq('status', 'abgeschlossen')
            .neq('status', 'abgeholt')
            .neq('status', 'trash')
            .neq('status', 'abholbereit') // User requested "status < abholbereit"
            .order('due_date', { ascending: true, nullsFirst: false })

        const allOrdersData = (orders || []) as OrderItem[]

        // Sort: due_date asc, then created_at asc
        const sortedOrders = [...allOrdersData].sort((a, b) => {
            const dateA = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
            const dateB = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER
            if (dateA !== dateB) return dateA - dateB
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })

        setAllOrders(sortedOrders)

        // Split into "mine" and "qc"
        if (employeeId) {
            setMyOrders(sortedOrders.filter(o =>
                o.mechanic_ids && o.mechanic_ids.includes(employeeId!)
            ))
            setQcOrders(sortedOrders.filter(o =>
                o.qc_mechanic_id === employeeId
            ))
        }

        // Fetch shop tasks assigned to user
        if (employeeId) {
            const { data: tasks } = await supabase
                .from('shop_tasks')
                .select('id, title, description, status, due_date, priority, created_at')
                .eq('workshop_id', workshopId)
                .neq('status', 'done')
                .neq('status', 'archived')
                .eq('assigned_to', employeeId)
                .order('due_date', { ascending: true, nullsFirst: false })

            setShopTasks((tasks || []) as ShopTask[])
        }

        setLoading(false)
    }

    useEffect(() => {
        fetchAll()

        // Poll every 30 seconds
        const interval = setInterval(fetchAll, 30000)
        return () => clearInterval(interval)
    }, [workshopId, user, activeEmployee])

    // ─── Loading State ───────────────────────────────────────────────────────

    if (loading) {
        return (
            <PageTransition>
                <DashboardLayout>
                    <div className="space-y-6 animate-pulse">
                        <div className="h-32 rounded-2xl bg-muted/30" />
                        <div className="grid gap-6 lg:grid-cols-3">
                            <div className="lg:col-span-2 h-80 rounded-xl bg-muted/20" />
                            <div className="h-80 rounded-xl bg-muted/20" />
                        </div>
                        <div className="h-96 rounded-xl bg-muted/20" />
                    </div>
                </DashboardLayout>
            </PageTransition>
        )
    }

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <PageTransition>
            <DashboardLayout>
                <CockpitGreeting
                    userName={user?.user_metadata?.full_name || ''}
                    myBikesCount={myOrders.length}
                    qcCount={qcOrders.length}
                    tasksCount={shopTasks.length}
                />

                <div className="grid gap-6 lg:grid-cols-3 mb-6">
                    {/* Main: My Bikes */}
                    <div className="lg:col-span-2">
                        <MyBikesSection orders={myOrders} />
                    </div>

                    {/* Sidebar: Tasks & QC */}
                    <div className="space-y-6">
                        <TasksSection
                            shopTasks={shopTasks}
                            qcOrders={qcOrders}
                        />
                    </div>
                </div>

                {/* All Repairs List - sorted by due date then created date */}
                <AllRepairsList
                    orders={allOrders}
                    employees={employees || []}
                />
            </DashboardLayout>
        </PageTransition>
    )
}
