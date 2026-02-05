import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { type User, type Session, type AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type UserRole = 'admin' | 'write' | 'read' | null

interface AuthContextType {
    user: User | null
    session: Session | null
    loading: boolean
    userRole: UserRole
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
    const [userRole, setUserRole] = useState<UserRole>(null)
    const [loading, setLoading] = useState(true)

    const fetchMembership = async (): Promise<{ workshopId: string | null, role: UserRole }> => {
        try {
            const { data, error } = await supabase.rpc('get_my_membership')

            if (error) {
                console.error('Error fetching membership:', error)
                // We do not return nulls immediately if it's just a network glitch? 
                // But for now, returning nulls is safer than stalling if we want to fail gracefully.
                // However, without timeout, we just rely on supabase client's internal retry/timeout.
                return { workshopId: null, role: null }
            }

            const resultData = data as { workshopId: string | null, role: string | null }
            const role = (resultData?.role as UserRole) || null
            const workshopId = resultData?.workshopId || null

            return { workshopId, role }
        } catch (error) {
            console.error('Unexpected error fetching membership:', error)
            return { workshopId: null, role: null }
        }
    }

    useEffect(() => {
        let mounted = true

        const initAuth = async () => {
            try {
                // Remove timeout race. Just await the session.
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) throw error

                if (session?.user) {
                    const { workshopId: wId, role } = await fetchMembership()

                    if (mounted) {
                        setSession(session)
                        setUser(session.user)
                        setWorkshopId(wId)
                        setUserRole(role)
                    }
                }
            } catch (error) {
                console.error('Error initializing auth:', error)
                if (mounted) {
                    setSession(null)
                    setUser(null)
                    setWorkshopId(null)
                    setUserRole(null)
                }
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        initAuth()

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (!mounted) return

            if (event === 'SIGNED_OUT') {
                setSession(null)
                setUser(null)
                setWorkshopId(null)
                setUserRole(null)
                setLoading(false)
            } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                if (newSession?.user) {
                    // Fetch membership BEFORE setting final state if possible to prevent redirects,
                    // but we must be careful not to block UI if it takes too long.
                    // However, we are already async here.
                    const { workshopId: wId, role } = await fetchMembership()

                    if (mounted) {
                        setSession(newSession)
                        setUser(newSession.user)
                        setWorkshopId(wId)
                        setUserRole(role)
                        setLoading(false)
                    }
                }
            } else if (event === 'TOKEN_REFRESHED') {
                if (newSession) {
                    setSession(newSession)
                    setUser(newSession.user)
                }
            } else if (newSession?.user) {
                // Catch-all for other events (e.g. USER_UPDATED)
                setSession(newSession)
                setUser(newSession.user)

                // Only fetch if we are logged in but missing workshop data (recovery)
                if (!workshopId) {
                    const { workshopId: wId, role } = await fetchMembership()
                    if (mounted) {
                        setWorkshopId(wId)
                        setUserRole(role)
                    }
                }
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
            // Explicitly fetch membership to ensure state is ready before resolving
            const { workshopId: wId, role } = await fetchMembership()
            setSession(data.session)
            setUser(data.user)
            setWorkshopId(wId)
            setUserRole(role)
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
        setUserRole(null)
        setUser(null)
        setSession(null)
        await supabase.auth.signOut()
    }

    const refreshSession = async () => {
        if (user) {
            const { workshopId: wId, role } = await fetchMembership()
            setWorkshopId(wId)
            setUserRole(role)
        }
    }

    const value = {
        user,
        session,
        loading,
        userRole,
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
