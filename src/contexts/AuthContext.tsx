import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import { type User, type Session, type AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { designConfig } from '@/lib/design-config'

export type UserRole = 'owner' | 'admin' | 'write' | 'read' | null

interface AuthContextType {
    user: User | null
    session: Session | null
    loading: boolean
    userRole: UserRole
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
    signUp: (email: string, password: string, name: string) => Promise<{ data?: { user: User | null; session: Session | null }; error: AuthError | null }>
    signOut: () => Promise<void>
    leaveWorkshop: () => Promise<void>
    workshopId: string | null
    refreshSession: () => Promise<void>
    broadcastThemeChange: (color: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_CACHE_KEY = 'velofix_auth_meta'


export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [workshopId, setWorkshopId] = useState<string | null>(null)
    const [userRole, setUserRole] = useState<UserRole>(null)
    const [loading, setLoading] = useState(true)
    const channelRef = useRef<any>(null)

    // Helper to fetch and apply workshop accent color
    const syncAccentColor = async (wId: string) => {
        try {
            const { data, error } = await supabase
                .from('workshops')
                .select('accent_color')
                .eq('id', wId)
                .single()

            if (error) throw error
            if (data?.accent_color) {
                const { applyThemeColor } = await import('@/lib/theme')
                applyThemeColor(data.accent_color)
            }
        } catch (err) {
            console.error('Failed to sync accent color:', err)
        }
    }

    // Subscribe to workshop changes (Real-time) and add robust fallbacks
    useEffect(() => {
        if (!workshopId) return

        // Enhanced channel config for better cross-device reliability
        const channel = supabase
            .channel(`workshop-updates-${workshopId}`, {
                config: {
                    broadcast: { ack: true }, // Request acknowledgement
                    presence: { key: workshopId }
                }
            })
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'workshops',
                    filter: `id=eq.${workshopId}`,
                },
                async (payload) => {
                    const { applyThemeColor } = await import('@/lib/theme')
                    console.log('Realtime DB update received:', payload.new)
                    let newColor = null
                    if (payload.new && payload.new.design_config?.primaryColor) {
                        newColor = payload.new.design_config.primaryColor
                    } else if (payload.new && payload.new.accent_color) {
                        newColor = payload.new.accent_color
                    }
                    if (newColor) {
                        applyThemeColor(newColor)
                    }
                }
            )
            .on(
                'broadcast',
                { event: 'THEME_UPDATE' },
                async ({ payload }) => {
                    console.log('Broadcast message received:', payload)
                    if (payload.accent_color) {
                        const { applyThemeColor } = await import('@/lib/theme')
                        applyThemeColor(payload.accent_color)
                    }
                }
            )
            .subscribe((status, err) => {
                console.log(`Realtime status for workshop ${workshopId}:`, status)
                if (err) console.error('Realtime subscription error:', err)
            })

        channelRef.current = channel

        // Fallback 1: Window Focus - Fetch latest from DB when tab becomes active
        const handleFocus = () => {
             console.log('Window focused, syncing theme color...')
             syncAccentColor(workshopId)
        }
        window.addEventListener('focus', handleFocus)

        // Fallback 2: Storage Event - Cross-tab sync within same browser
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'velofix-accent-color' && e.newValue) {
                import('@/lib/theme').then(({ applyThemeColor }) => {
                    applyThemeColor(e.newValue!)
                })
            }
            if (e.key === 'compact-mode' && e.newValue) {
                import('@/lib/theme').then(({ applyCompactMode }) => {
                    applyCompactMode(e.newValue === 'true')
                })
            }
        }
        window.addEventListener('storage', handleStorage)

        // Fallback 3: Background Pulse - Periodic check every 30s for cross-device sync
        // only runs when the page is actually visible to save resources
        const pulseInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                console.log('Background pulse: checking for theme updates...')
                syncAccentColor(workshopId)
            }
        }, 30000)

        return () => {
            supabase.removeChannel(channel)
            channelRef.current = null
            window.removeEventListener('focus', handleFocus)
            window.removeEventListener('storage', handleStorage)
            clearInterval(pulseInterval)
        }
    }, [workshopId])

    const broadcastThemeChange = (color: string) => {
        if (channelRef.current) {
            console.log('Broadcasting theme change:', color)
            channelRef.current.send({
                type: 'broadcast',
                event: 'THEME_UPDATE',
                payload: { accent_color: color },
            })
        } else {
            console.warn('Cannot broadcast theme change: no active workshop channel')
        }
    }

    // Initial accent color sync when workshopId is set
    useEffect(() => {
        if (workshopId) {
            syncAccentColor(workshopId)
        }
    }, [workshopId])

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
                designConfig.init(workshopId)
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
        try {
            // Optimistic UI: Don't wait for workshop data to resolve login form
            const { data, error } = await supabase.auth.signInWithPassword({ email, password })

            if (error) {
                return { error }
            }

            if (data.user && data.session) {
                // Set loading to true immediately to show loading screen instead of flickering onboarding
                setLoading(true)

                setSession(data.session)
                setUser(data.user)

                // Fetch in background but await it here to ensure we have the data before stopping loading
                try {
                    const { workshopId: wId, role } = await fetchMembership()

                    // Check if component is still mounted using ref since we are in async callback of a function
                    if (mountedRef.current) {
                        setWorkshopId(wId)
                        setUserRole(role)
                        // Only stop loading after we have the workshop data
                        setLoading(false)
                    }
                } catch (e) {
                    console.error("Error fetching membership during signin:", e)
                    if (mountedRef.current) {
                        setLoading(false)
                    }
                }
            }

            return { error: null }
        } catch (err: any) {
            console.error("Unexpected error during sign in:", err)
            if (mountedRef.current) {
                setLoading(false)
            }
            return { error: { message: err.message || "An unexpected error occurred", name: "UnexpectedError" } as AuthError }
        }
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

    const leaveWorkshop = async () => {
        const { error } = await supabase.rpc('leave_workshop')
        if (error) throw error

        // Clear local state
        setWorkshopId(null)
        setUserRole(null)
        localStorage.removeItem(AUTH_CACHE_KEY)

        // Reload session/membership (should be null now)
        await refreshSession()
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
        leaveWorkshop,
        workshopId,
        refreshSession,
        broadcastThemeChange
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
