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
        try {
            // Check employee first
            const { data: employeeData } = await supabase
                .from('employees')
                .select('workshop_id')
                .eq('user_id', userId)
                .maybeSingle()

            if (employeeData?.workshop_id) {
                return employeeData.workshop_id
            }

            // Check owner
            const { data: workshopData } = await supabase
                .from('workshops')
                .select('id')
                .eq('owner_user_id', userId)
                .maybeSingle()

            if (workshopData?.id) {
                return workshopData.id
            }

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
                    console.log('[AuthContext] Session found, fetching workshop...')
                    const wId = await fetchWorkshop(session.user.id)

                    if (mounted) {
                        setSession(session)
                        setUser(session.user)
                        setWorkshopId(wId)
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
                setLoading(false)
            } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                // On sign in, fetch workshop BEFORE updating state to prevent redirect race conditions
                if (newSession?.user) {
                    const wId = await fetchWorkshop(newSession.user.id)

                    if (mounted) {
                        // Batch update
                        setSession(newSession)
                        setUser(newSession.user)
                        setWorkshopId(wId)
                        setLoading(false)
                    }
                }
            } else if (event === 'TOKEN_REFRESHED') {
                // Just update session, no need to re-fetch workshop usually
                if (newSession) {
                    setSession(newSession)
                    setUser(newSession.user)
                }
            } else if (newSession?.user) {
                // Catch-all for other events
                setSession(newSession)
                setUser(newSession.user)
                if (!workshopId) {
                    const wId = await fetchWorkshop(newSession.user.id)
                    if (mounted) setWorkshopId(wId)
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
