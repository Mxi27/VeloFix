import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { type User, type Session, type AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
    user: User | null
    session: Session | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
    signUp: (email: string, password: string, name: string) => Promise<{ data?: { user: User | null; session: Session | null }; error: AuthError | null }>
    signOut: () => Promise<void>
    workshopId: string | null
    refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [workshopId, setWorkshopId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchWorkshop = async (userId: string): Promise<string | null> => {
        console.log('[fetchWorkshop] Fetching for userId:', userId)
        try {
            // Check employee first
            const { data: employeeData } = await supabase
                .from('employees')
                .select('workshop_id')
                .eq('user_id', userId)
                .maybeSingle()

            if (employeeData?.workshop_id) {
                console.log('[fetchWorkshop] Found as employee:', employeeData.workshop_id)
                return employeeData.workshop_id
            }

            // Check owner
            const { data: workshopData } = await supabase
                .from('workshops')
                .select('id')
                .eq('owner_user_id', userId)
                .maybeSingle()

            if (workshopData?.id) {
                console.log('[fetchWorkshop] Found as owner:', workshopData.id)
                return workshopData.id
            }

            console.log('[fetchWorkshop] No workshop found')
            return null
        } catch (error) {
            console.error('[fetchWorkshop] Error:', error)
            return null
        }
    }

    useEffect(() => {
        let mounted = true

        const initAuth = async () => {
            console.log('[AuthContext] Initializing...')
            try {
                const { data: { session }, error } = await supabase.auth.getSession()

                if (!mounted) return

                if (error) {
                    console.error('[AuthContext] Session error:', error)
                    setSession(null)
                    setUser(null)
                    setWorkshopId(null)
                    setLoading(false)
                } else if (session?.user) {
                    console.log('[AuthContext] Session found, fetching workshop...')

                    // Fetch workshop BEFORE setting any state
                    const wId = await fetchWorkshop(session.user.id)

                    if (mounted) {
                        // BATCH STATE UPDATE - all at once to prevent flash
                        console.log('[AuthContext] Setting all state at once')
                        setSession(session)
                        setUser(session.user)
                        setWorkshopId(wId)
                        setLoading(false)
                    }
                } else {
                    console.log('[AuthContext] No session')
                    setSession(null)
                    setUser(null)
                    setWorkshopId(null)
                    setLoading(false)
                }
            } catch (error) {
                console.error('[AuthContext] Init error:', error)
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        initAuth()

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            console.log('[AuthContext] Auth state changed:', event)

            if (!mounted) return

            if (event === 'SIGNED_OUT') {
                setSession(null)
                setUser(null)
                setWorkshopId(null)
            } else if (event === 'SIGNED_IN' && newSession?.user) {
                // On sign in, fetch workshop first then batch update
                const wId = await fetchWorkshop(newSession.user.id)
                if (mounted) {
                    setSession(newSession)
                    setUser(newSession.user)
                    setWorkshopId(wId)
                }
            } else if (newSession?.user) {
                setSession(newSession)
                setUser(newSession.user)

                // Refresh workshop on other auth events
                const wId = await fetchWorkshop(newSession.user.id)
                if (mounted) {
                    setWorkshopId(wId)
                }
            } else {
                setSession(null)
                setUser(null)
                setWorkshopId(null)
            }
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        if (data.user && data.session) {
            // Wait for workshop data to be fetched before resolving
            // This ensures the UI stays in loading state until we have all data
            const wId = await fetchWorkshop(data.user.id)
            setSession(data.session)
            setUser(data.user)
            setWorkshopId(wId)
        }

        return { error }
    }

    const signUp = async (email: string, password: string, name: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                },
            },
        })
        return { data, error }
    }

    const signOut = async () => {
        setWorkshopId(null)
        setUser(null)
        setSession(null)
        await supabase.auth.signOut()
    }

    const refreshSession = async () => {
        if (user) {
            const wId = await fetchWorkshop(user.id)
            setWorkshopId(wId)
        }
    }

    const value = {
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        workshopId,
        refreshSession
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
