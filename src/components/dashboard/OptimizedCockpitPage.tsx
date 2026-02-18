import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useEmployee } from "@/contexts/EmployeeContext"
import { supabase } from "@/lib/supabase"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { PageTransition } from "@/components/PageTransition"
import { CockpitGreeting } from "@/components/dashboard/CockpitGreeting"
import { MyBikesSection } from "@/components/dashboard/MyBikesSection"
import { TasksSection } from "@/components/dashboard/TasksSection"
import { AllRepairsList } from "@/components/dashboard/AllRepairsList"
import { CockpitFilters, UrgencyFilter } from "@/components/dashboard/CockpitFilters"
import { QuickActions } from "@/components/dashboard/QuickActions"
import { GlobalKeyboardShortcuts } from "@/components/dashboard/KeyboardShortcuts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { X, Filter, ChevronDown, ChevronUp, Maximize2, Minimize2, Clock, AlertTriangle } from "lucide-react"
import { cn, formatRelativeTime } from "@/lib/utils"
import type { OrderItem } from "@/components/dashboard/OrderCard"
import { filterByUrgency } from "@/lib/urgency"
import { motion, AnimatePresence } from "framer-motion"

interface ShopTask {
  id: string
  title: string
  description: string | null
  status: string
  due_date: string | null
  priority: 'low' | 'medium' | 'high'
  created_at: string
}

/**
 * OPTIMIZED COCKPIT PAGE
 * Focus: Maximum efficiency, zero time waste, perfect task completion
 */
export default function OptimizedCockpitPage() {
  const { user, workshopId } = useAuth()
  const { activeEmployee, employees, isKioskMode } = useEmployee()

  const [myOrders, setMyOrders] = useState<OrderItem[]>([])
  const [allOrders, setAllOrders] = useState<OrderItem[]>([])
  const [qcOrders, setQcOrders] = useState<OrderItem[]>([])
  const [shopTasks, setShopTasks] = useState<ShopTask[]>([])
  const [loading, setLoading] = useState(true)

  // UI State
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all')
  const [showFilters, setShowFilters] = useState(true)
  const [focusMode, setFocusMode] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

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

    const filterId = targetEmployeeId

    // Fetch all active orders
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, bike_model, status, due_date, created_at, mechanic_ids, qc_mechanic_id, checklist')
      .eq('workshop_id', workshopId)
      .neq('status', 'abgeschlossen')
      .neq('status', 'abgeholt')
      .neq('status', 'trash')
      .neq('status', 'abholbereit')
      .order('due_date', { ascending: true, nullsFirst: false })

    const allOrdersData = (orders || []) as OrderItem[]

    // Sort by due date
    const sortedOrders = [...allOrdersData].sort((a, b) => {
      const dateA = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
      const dateB = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER
      if (dateA !== dateB) return dateA - dateB
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    setAllOrders(sortedOrders)

    // Split into "mine" and "qc"
    if (filterId) {
      setMyOrders(sortedOrders.filter(o =>
        o.mechanic_ids && o.mechanic_ids.includes(filterId!)
      ))
      setQcOrders(sortedOrders.filter(o =>
        o.status === 'kontrolle_offen'
      ))
    } else {
      setMyOrders([])
      setQcOrders([])
    }

    // Fetch shop tasks
    const { data: tasks } = await supabase
      .from('shop_tasks')
      .select('*')
      .eq('workshop_id', workshopId)
      .in('status', ['open', 'in_progress'])
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true, nullsFirst: false })

    setShopTasks((tasks || []) as ShopTask[])
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()

    // Polling for real-time updates (every 30 seconds)
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [workshopId, user, viewAsEmployeeId, activeEmployee])

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

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

  // Calculate workload stats
  const totalWorkload = myOrders.length + qcOrders.length + shopTasks.length
  const highPriorityCount = myOrders.filter(o => {
    const urgency = filterByUrgency([o], 'overdue').length > 0 ||
      filterByUrgency([o], 'today').length > 0
    return urgency
  }).length

  if (loading) {
    return (
      <PageTransition>
        <DashboardLayout>
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-4">
              <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Lade Cockpit...</p>
            </div>
          </div>
        </DashboardLayout>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <GlobalKeyboardShortcuts />
      <DashboardLayout>
        <div className={cn(
          "transition-all duration-300",
          focusMode && "max-w-5xl mx-auto"
        )}>
          {/* Ultra-Compact Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <h1 className="text-xl font-bold tracking-tight">Cockpit</h1>
                <p className="text-xs text-muted-foreground">
                  {totalWorkload === 0
                    ? "Alles erledigt!"
                    : `${totalWorkload} ${totalWorkload === 1 ? 'Aufgabe' : 'Aufgaben'} offen`
                  }
                </p>
              </div>

              {highPriorityCount > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {highPriorityCount} Dringend
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <QuickActions />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFocusMode(!focusMode)}
                className="gap-2"
              >
                {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                <span className="hidden sm:inline text-xs">
                  {focusMode ? "Normal" : "Fokus"}
                </span>
              </Button>
            </div>
          </div>

          {/* Quick Filters - Always Visible */}
          {(myOrders.length > 0 || qcOrders.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <Card className="border-border/40 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 overflow-x-auto">
                      <Button
                        variant={urgencyFilter === 'all' ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setUrgencyFilter('all')}
                        className="gap-1.5 shrink-0"
                      >
                        Alle
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                          {filterCounts.all}
                        </Badge>
                      </Button>

                      <Button
                        variant={urgencyFilter === 'overdue' ? "destructive" : "ghost"}
                        size="sm"
                        onClick={() => setUrgencyFilter('overdue')}
                        className="gap-1.5 shrink-0"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Überfällig
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                          {filterCounts.overdue}
                        </Badge>
                      </Button>

                      <Button
                        variant={urgencyFilter === 'today' ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setUrgencyFilter('today')}
                        className="gap-1.5 shrink-0"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        Heute
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                          {filterCounts.today}
                        </Badge>
                      </Button>

                      <Button
                        variant={urgencyFilter === 'urgent' ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setUrgencyFilter('urgent')}
                        className="gap-1.5 shrink-0"
                      >
                        Dringend
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                          {filterCounts.urgent}
                        </Badge>
                      </Button>
                    </div>

                    {urgencyFilter !== 'all' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUrgencyFilter('all')}
                        className="gap-1 shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reset
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Main Grid */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* My Bikes - Takes most space */}
            <div className={cn(
              "lg:col-span-2",
              focusMode && "lg:col-span-3"
            )}>
              <AnimatePresence mode="wait">
                {!collapsedSections.has('mybikes') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <MyBikesSection orders={filteredMyOrders} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sidebar - QC & Tasks */}
            {!focusMode && (
              <div className="space-y-4">
                <AnimatePresence mode="wait">
                  {!collapsedSections.has('tasks') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <TasksSection
                        shopTasks={shopTasks}
                        qcOrders={qcOrders}
                        currentEmployeeId={viewAsEmployeeId || activeEmployee?.id}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* All Repairs List - Only in normal mode */}
          {!focusMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6"
            >
              <AllRepairsList
                orders={allOrders}
                employees={employees || []}
              />
            </motion.div>
          )}
        </div>
      </DashboardLayout>
    </PageTransition>
  )
}
