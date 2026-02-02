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
            console.log('[AuthContext] Fetching membership...')

            // 3000ms timeout race to prevent hang
            const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
                setTimeout(() => resolve({ timeout: true }), 3000)
            )

            const rpcPromise = supabase.rpc('get_my_membership')

            const result = await Promise.race([rpcPromise, timeoutPromise]) as
                | { timeout: true }
                | { data: any, error: any }

            if ('timeout' in result) {
                console.error('[AuthContext] Membership fetch timed out (3000ms)')
                return { workshopId: null, role: null }
            }

            const { data, error } = result

            if (error) {
                console.warn('[AuthContext] RPC Error (using fallback nulls):', error)
                return { workshopId: null, role: null }
            }

            console.log('[AuthContext] Membership data:', data)
            const resultData = data as { workshopId: string | null, role: string | null }
            const role = (resultData?.role as UserRole) || null
            const workshopId = resultData?.workshopId || null

            return { workshopId, role }
        } catch (error) {
            console.error('[fetchMembership] Unexpected Error:', error)
            return { workshopId: null, role: null }
        }
    }

    useEffect(() => {
        let mounted = true

        const initAuth = async () => {
            console.log('[AuthContext] Initializing...')
            try {
                // Create a timeout promise
                const timeoutPromise = new Promise<{ timeout: true }>((resolve) => {
                    setTimeout(() => resolve({ timeout: true }), 5000) // 5 second timeout
                })

                // Race session check against timeout
                const sessionPromise = supabase.auth.getSession()

                const result = await Promise.race([sessionPromise, timeoutPromise]) as
                    | { timeout: true }
                    | { data: { session: Session | null }, error: AuthError | null }

                if (!mounted) return

                // Handle Timeout
                if ('timeout' in result) {
                    console.warn('[AuthContext] Session check timed out. Defaulting to no session.')
                    setSession(null)
                    setUser(null)
                    setWorkshopId(null)
                    setUserRole(null)
                    setLoading(false)
                    return
                }

                // Handle Session Result
                const { data: { session }, error } = result

                if (error) {
                    console.error('[AuthContext] Session error:', error)
                    throw error
                }

                if (session?.user) {
                    console.log('[AuthContext] Session found, fetching membership...')
                    const { workshopId: wId, role } = await fetchMembership()

                    if (mounted) {
                        setSession(session)
                        setUser(session.user)
                        setWorkshopId(wId)
                        setUserRole(role)
                    }
                } else {
                    console.log('[AuthContext] No session')
                }
            } catch (error) {
                console.error('[AuthContext] Init error:', error)
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
            console.log('[AuthContext] Auth state changed:', event)

            if (!mounted) return

            if (event === 'SIGNED_OUT') {
                // Clear state immediately
                setSession(null)
                setUser(null)
                setWorkshopId(null)
                setUserRole(null)
                setLoading(false)
            } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                // On sign in, fetch membership BEFORE updating state
                if (newSession?.user) {
                    const { workshopId: wId, role } = await fetchMembership()

                    if (mounted) {
                        // Batch update
                        setSession(newSession)
                        setUser(newSession.user)
                        setWorkshopId(wId)
                        setUserRole(role)
                        setLoading(false)
                    }
                }
            } else if (event === 'TOKEN_REFRESHED') {
                // Just update session
                if (newSession) {
                    setSession(newSession)
                    setUser(newSession.user)
                }
            } else if (newSession?.user) {
                // Catch-all for other events
                setSession(newSession)
                setUser(newSession.user)
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
            // Wait for workshop data
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
