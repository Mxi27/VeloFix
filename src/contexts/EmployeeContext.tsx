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

const COCKPIT_EMPLOYEE_KEY = 'velofix-cockpit-employee'

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
                    setLoading(false)
                    return
                }

                // 2. Fetch all employees for this workshop
                const { data: allEmployees, error: allError } = await supabase
                    .from('employees')
                    .select('*')
                    .eq('workshop_id', myEmployee.workshop_id)
                    .eq('active', true)
                    .order('name')

                if (!mounted || abortController.signal.aborted) return

                const employeeList = (!allError && allEmployees) ? allEmployees : []
                setEmployees(employeeList)

                if (myEmployee.is_kiosk_mode) {
                    setIsKioskMode(true)
                    // Try to restore previously selected employee from localStorage
                    const savedId = localStorage.getItem(COCKPIT_EMPLOYEE_KEY)
                    const saved = savedId ? employeeList.find(e => e.id === savedId) : null
                    setActiveEmployee(saved || null)
                } else {
                    setIsKioskMode(false)
                    // Non-kiosk: check if user has manually switched in cockpit (localStorage override)
                    const savedId = localStorage.getItem(COCKPIT_EMPLOYEE_KEY)
                    const saved = savedId ? employeeList.find(e => e.id === savedId) : null
                    // Default to own employee record, but allow cockpit override
                    setActiveEmployee(saved || myEmployee)
                }

            } catch (err) {
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

    // Select employee: works in both kiosk and non-kiosk mode (for cockpit switcher)
    // Persists to localStorage so navigation away and back restores selection
    const selectEmployee = (employeeId: string) => {
        const selected = employees.find(e => e.id === employeeId)
        if (selected) {
            setActiveEmployee(selected)
            localStorage.setItem(COCKPIT_EMPLOYEE_KEY, employeeId)
        }
    }

    const clearSelectedEmployee = () => {
        if (isKioskMode) {
            setActiveEmployee(null)
            localStorage.removeItem(COCKPIT_EMPLOYEE_KEY)
        }
    }

    const refreshEmployees = async () => {
        if (!user) return
        const { data } = await supabase.from('employees').select('*').eq('active', true).order('name')
        if (data) setEmployees(data)
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
