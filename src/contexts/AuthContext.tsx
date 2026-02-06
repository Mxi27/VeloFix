import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import { type User, type Session, type AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type UserRole = 'owner' | 'admin' | 'write' | 'read' | null

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

const AUTH_CACHE_KEY = 'velofix_auth_meta'


export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [workshopId, setWorkshopId] = useState<string | null>(null)
    const [userRole, setUserRole] = useState<UserRole>(null)
    const [loading, setLoading] = useState(true)

    // Helper to load cache synchronously if possible (or effectively so)
    const loadFromCache = () => {
        try {
            const cached = localStorage.getItem(AUTH_CACHE_KEY)
            if (cached) {
                const parsed = JSON.parse(cached) as { workshopId: string | null, role: UserRole }
                return parsed
            }
        } catch (e) {
            console.error('Failed to parse auth cache', e)
        }
        return null
    }

    const fetchMembership = async (): Promise<{ workshopId: string | null, role: UserRole }> => {
        try {
            const { data, error } = await supabase.rpc('get_my_role')

            if (error) {
                console.error('Error fetching membership:', error)
                return { workshopId: null, role: null }
            }

            const resultData = data as { workshopId: string | null, role: string | null }
            const role = (resultData?.role as UserRole) || null
            const workshopId = resultData?.workshopId || null

            // Cache the successful result
            if (workshopId) {
                localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ workshopId, role }))
            }

            return { workshopId, role }
        } catch (error) {
            console.error('Unexpected error fetching membership:', error)
            return { workshopId: null, role: null }
        }
    }

    const mountedRef = useRef(true)

    useEffect(() => {
        return () => {
            mountedRef.current = false
        }
    }, [])

    useEffect(() => {
        let mounted = true

        const initAuth = async () => {
            // Safety valve: Force unblock after 3s no matter what
            const safetyTimeout = setTimeout(() => {
                if (mounted) {
                    console.warn('Auth initialization timed out, forcing unblock')
                    setLoading(false)
                }
            }, 3000)

            try {
                // Remove timeout race. Just await the session.
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) throw error

                if (session?.user) {
                    // 1. Set User State IMMEDIATELY (Optimistic)
                    // This ensures we are "authenticated" even if membership fetch hangs/fails
                    setSession(session)
                    setUser(session.user)

                    // 2. Try Cache First for immediate UI
                    const cached = loadFromCache()

                    if (cached && mounted) {
                        setWorkshopId(cached.workshopId)
                        setUserRole(cached.role)
                        // If we have cache, we can unblock loading immediately!
                        setLoading(false)
                        clearTimeout(safetyTimeout)
                    }

                    // 3. Fetch fresh data in background (Stale-While-Revalidate)
                    try {
                        const { workshopId: wId, role } = await fetchMembership()

                        if (mounted) {
                            // Only update if changed or if we didn't have cache to avoid unnecessary re-renders
                            if (!cached || wId !== cached.workshopId || role !== cached.role) {
                                // Session/User already set above, just update meta
                                setWorkshopId(wId)
                                setUserRole(role)
                            }

                            // Ensure loading is false if we didn't use cache
                            if (!cached) {
                                setLoading(false)
                                clearTimeout(safetyTimeout)
                            }
                        }
                    } catch (fetchErr) {
                        console.error('Background fetch failed', fetchErr)
                        // Even if fetch fails, we are logged in.
                        if (mounted && !cached) {
                            setLoading(false)
                            clearTimeout(safetyTimeout) // Ensure we unblock
                        }
                    }
                } else {
                    // No user, stop loading
                    if (mounted) {
                        setLoading(false)
                        clearTimeout(safetyTimeout)
                    }
                }
            } catch (error) {
                console.error('Error initializing auth:', error)
                if (mounted) {
                    setSession(null)
                    setUser(null)
                    setWorkshopId(null)
                    setUserRole(null)
                    setLoading(false)
                    clearTimeout(safetyTimeout)
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
                    // Optimistic update: Set session/user immediately!
                    // Do NOT wait for fetchMembership
                    if (mounted) {
                        setSession(newSession)
                        setUser(newSession.user)
                    }

                    // Background fetch
                    fetchMembership().then(({ workshopId: wId, role }) => {
                        if (mounted) {
                            setWorkshopId(wId)
                            setUserRole(role)
                            setLoading(false) // Ensure loading is cleared
                        }
                    })
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
                    fetchMembership().then(({ workshopId: wId, role }) => {
                        if (mounted) {
                            setWorkshopId(wId)
                            setUserRole(role)
                        }
                    })
                }
            }
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    const signIn = async (email: string, password: string) => {
        // Optimistic UI: Don't wait for workshop data to resolve login form
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        if (data.user && data.session) {
            setSession(data.session)
            setUser(data.user)

            // Fetch in background
            fetchMembership().then(({ workshopId: wId, role }) => {
                // Check if component is still mounted using ref since we are in async callback of a function
                if (mountedRef.current) {
                    setWorkshopId(wId)
                    setUserRole(role)
                }
            })
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
        localStorage.removeItem(AUTH_CACHE_KEY)
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
