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
import { CockpitFilters, type UrgencyFilter } from "@/components/dashboard/CockpitFilters"
import { QuickActions } from "@/components/dashboard/QuickActions"
import { GlobalKeyboardShortcuts } from "@/components/dashboard/KeyboardShortcuts"
import type { OrderItem } from "@/components/dashboard/OrderCard"
import { filterByUrgency } from "@/lib/urgency"

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
    const { activeEmployee, employees, isKioskMode } = useEmployee()

    const [myOrders, setMyOrders] = useState<OrderItem[]>([])
    const [allOrders, setAllOrders] = useState<OrderItem[]>([])
    const [qcOrders, setQcOrders] = useState<OrderItem[]>([])
    const [shopTasks, setShopTasks] = useState<ShopTask[]>([])
    const [loading, setLoading] = useState(true)

    // Filter state
    const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all')

    // Kiosk Mode State
    const [viewAsEmployeeId, setViewAsEmployeeId] = useState<string | undefined>(undefined)

    // Effect to set initial viewAs based on active employee or user
    useEffect(() => {
        if (activeEmployee?.id) {
            setViewAsEmployeeId(activeEmployee.id)
        }
    }, [activeEmployee])

    const fetchAll = async () => {
        if (!workshopId || !user) return

        // Resolve Employee ID to use for filtering
        // If Kiosk mode and viewAs is set, use that.
        // Otherwise use activeEmployee or try to find employee by user
        let targetEmployeeId = viewAsEmployeeId

        if (!targetEmployeeId) {
            targetEmployeeId = activeEmployee?.id
        }

        if (!targetEmployeeId) {
            const { data: empData } = await supabase
                .from('employees')
                .select('id')
                .or(`user_id.eq.${user.id},email.eq.${user.email}`)
                .eq('workshop_id', workshopId)
                .maybeSingle()
            if (empData) targetEmployeeId = empData.id
        }

        // Use effective ID for filtering
        const filterId = targetEmployeeId

        // Fetch all active orders for the workshop (excluding completed and ready for pickup)
        const { data: orders } = await supabase
            .from('orders')
            .select('id, order_number, customer_name, bike_model, status, due_date, created_at, mechanic_ids, qc_mechanic_id, checklist')
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

        // Split into "mine" and "qc" based on the selected view
        if (filterId) {
            setMyOrders(sortedOrders.filter(o =>
                o.mechanic_ids && o.mechanic_ids.includes(filterId!)
            ))

            // QC Orders: Show ALL orders with status 'kontrolle_offen' (Control Open)
            // The user wanted to see ALL open controls here, regardless of assignment.
            setQcOrders(sortedOrders.filter(o =>
                o.status === 'kontrolle_offen'
            ))
        } else {
            setMyOrders([])
            setQcOrders([])
        }

        // Fetch shop tasks assigned to user (or viewed user)
        if (filterId) {
            const { data: tasks } = await supabase
                .from('shop_tasks')
                .select('id, title, description, status, due_date, priority, created_at')
                .eq('workshop_id', workshopId)
                .neq('status', 'done')
                .neq('status', 'archived')
                .eq('assigned_to', filterId)
                .order('due_date', { ascending: true, nullsFirst: false })

            setShopTasks((tasks || []) as ShopTask[])
        } else {
            setShopTasks([])
        }

        setLoading(false)
    }

    useEffect(() => {
        fetchAll()

        // Poll every 30 seconds
        const interval = setInterval(fetchAll, 30000)
        return () => clearInterval(interval)
    }, [workshopId, user, activeEmployee, viewAsEmployeeId]) // Re-fetch when viewAs changes

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

    // Calculate filter counts
    const filterCounts = {
        all: myOrders.length,
        overdue: filterByUrgency(myOrders, 'overdue').length,
        today: filterByUrgency(myOrders, 'today').length,
        urgent: filterByUrgency(myOrders, 'urgent').length,
        upcoming: filterByUrgency(myOrders, 'upcoming').length,
    }

    // Apply filter
    const filteredMyOrders = urgencyFilter === 'all'
        ? myOrders
        : filterByUrgency(myOrders, urgencyFilter)

    return (
        <PageTransition>
            <GlobalKeyboardShortcuts />
            <DashboardLayout>
                {/* Header Area with Quick Actions */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <CockpitGreeting
                                userName={
                                    viewAsEmployeeId
                                        ? employees?.find(e => e.id === viewAsEmployeeId)?.name || user?.user_metadata?.full_name || ''
                                        : user?.user_metadata?.full_name || ''
                                }
                                myBikesCount={myOrders.length}
                                qcCount={qcOrders.length}
                                tasksCount={shopTasks.length}
                                // Kiosk Mode Props
                                employees={isKioskMode ? employees : undefined}
                                currentEmployeeId={viewAsEmployeeId}
                                onSelectEmployee={setViewAsEmployeeId}
                            />
                        </div>
                        <QuickActions />
                    </div>

                    {/* Filters */}
                    {myOrders.length > 0 && (
                        <CockpitFilters
                            activeFilter={urgencyFilter}
                            onFilterChange={setUrgencyFilter}
                            counts={filterCounts}
                        />
                    )}
                </div>

                <div className="grid gap-6 lg:grid-cols-3 mb-6">
                    {/* Main: My Bikes */}
                    <div className="lg:col-span-2">
                        <MyBikesSection orders={filteredMyOrders} />
                    </div>

                    {/* Sidebar: Tasks & QC */}
                    <div className="space-y-6">
                        <TasksSection
                            shopTasks={shopTasks}
                            qcOrders={qcOrders}
                            currentEmployeeId={viewAsEmployeeId || activeEmployee?.id}
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
