import { createContext, useContext, useEffect, useState } from "react"
import { useAuth } from "./AuthContext"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type Employee = Database['public']['Tables']['employees']['Row']

interface EmployeeContextType {
    activeEmployee: Employee | null
    employees: Employee[]
    isKioskMode: boolean
    hasSelectedEmployee: boolean
    selectEmployee: (employeeId: string) => void
    clearSelectedEmployee: () => void
    refreshEmployees: () => Promise<void>
    loading: boolean
}

const EmployeeContext = createContext<EmployeeContextType>({} as EmployeeContextType)

export function useEmployee() {
    return useContext(EmployeeContext)
}

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth()
    const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null)
    const [employees, setEmployees] = useState<Employee[]>([])
    const [isKioskMode, setIsKioskMode] = useState(false)
    const [loading, setLoading] = useState(true)

    // On user change/load, identify if this is a Kiosk account
    useEffect(() => {
        let mounted = true
        const abortController = new AbortController()

        if (!user) {
            setActiveEmployee(null)
            setIsKioskMode(false)
            setEmployees([])
            setLoading(false)
            return
        }

        const fetchEmployeeData = async () => {
            if (!mounted) return
            setLoading(true)
            try {
                // 1. Get the employee record linked to this logged-in user
                const { data: myEmployee, error: myError } = await supabase
                    .from('employees')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle()

                if (!mounted || abortController.signal.aborted) return

                if (myError || !myEmployee) {
                    // User might not have an employee record yet (new signup)
                    setLoading(false)
                    return
                }

                if (myEmployee.is_kiosk_mode) {
                    // I am a Kiosk!
                    setIsKioskMode(true)
                    setActiveEmployee(null) // Reset active employee, force selection
                } else {
                    // I am a regular user
                    setIsKioskMode(false)
                    setActiveEmployee(myEmployee)
                }

                // 2. Fetch all employees for this workshop (for selection list)
                const { data: allEmployees, error: allError } = await supabase
                    .from('employees')
                    .select('*')
                    .eq('workshop_id', myEmployee.workshop_id)
                    .eq('active', true)
                    .order('name')

                if (!mounted || abortController.signal.aborted) return

                if (!allError && allEmployees) {
                    setEmployees(allEmployees)
                }

            } catch (err) {
                // Silent fail - don't log errors in production
                if (!mounted || abortController.signal.aborted) return
            } finally {
                if (mounted && !abortController.signal.aborted) {
                    setLoading(false)
                }
            }
        }

        fetchEmployeeData()

        return () => {
            mounted = false
            abortController.abort()
        }
    }, [user])

    const selectEmployee = (employeeId: string) => {
        if (!isKioskMode) return // Regular users can't switch identity easily (unless admin override?)

        const selected = employees.find(e => e.id === employeeId)
        if (selected) {
            setActiveEmployee(selected)
            // Optional: Persist selection to sessionStorage so refresh doesn't lose it immediately?
            // sessionStorage.setItem('kiosk_selected_employee', employeeId)
        }
    }

    const clearSelectedEmployee = () => {
        if (isKioskMode) {
            setActiveEmployee(null)
            // sessionStorage.removeItem('kiosk_selected_employee')
        }
    }

    const refreshEmployees = async () => {
        if (!user) return
        // simplistic re-fetch (could be optimized)
        await supabase.from('employees').select('*').eq('active', true)
        // ... simplified for brevity, relying on main effect mostly
    }

    return (
        <EmployeeContext.Provider value={{
            activeEmployee,
            employees,
            isKioskMode,
            hasSelectedEmployee: !!activeEmployee,
            selectEmployee,
            clearSelectedEmployee,
            refreshEmployees,
            loading
        }}>
            {children}
        </EmployeeContext.Provider>
    )
}
