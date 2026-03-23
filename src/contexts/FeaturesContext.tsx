import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { FeatureKey, FeaturesConfig } from '@/types'

interface FeaturesContextType {
    /** Returns true if a feature is enabled (default: true for unknown keys) */
    isEnabled: (key: FeatureKey) => boolean
    /** Raw config as stored in DB – use isEnabled() for checks */
    featuresConfig: FeaturesConfig
    /** Reload features from DB (call after saving changes) */
    reload: () => Promise<void>
    loading: boolean
}

const FeaturesContext = createContext<FeaturesContextType | undefined>(undefined)

/**
 * All features default to ON when no config is stored.
 * This ensures backwards compatibility: existing workshops without
 * a features_config see no change.
 */
const DEFAULT_ENABLED = true

export function FeaturesProvider({ children }: { children: ReactNode }) {
    const { workshopId } = useAuth()
    const [featuresConfig, setFeaturesConfig] = useState<FeaturesConfig>({})
    const [loading, setLoading] = useState(true)

    const fetchFeatures = async () => {
        if (!workshopId) {
            setFeaturesConfig({})
            setLoading(false)
            return
        }

        try {
            const { data, error } = await supabase
                .from('workshops')
                .select('features_config')
                .eq('id', workshopId)
                .single()

            if (error) throw error

            const raw = data?.features_config
            if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                setFeaturesConfig(raw as FeaturesConfig)
            } else {
                setFeaturesConfig({})
            }
        } catch (err) {
            console.error('Failed to load features_config:', err)
            setFeaturesConfig({})
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        setLoading(true)
        fetchFeatures()
    }, [workshopId])

    const isEnabled = (key: FeatureKey): boolean => {
        const value = featuresConfig[key]
        // If the key is not set, default to enabled (backwards compatible)
        return value === undefined ? DEFAULT_ENABLED : value
    }

    const reload = async () => {
        await fetchFeatures()
    }

    return (
        <FeaturesContext.Provider value={{ isEnabled, featuresConfig, reload, loading }}>
            {children}
        </FeaturesContext.Provider>
    )
}

export function useFeatures() {
    const context = useContext(FeaturesContext)
    if (context === undefined) {
        throw new Error('useFeatures must be used within a FeaturesProvider')
    }
    return context
}
