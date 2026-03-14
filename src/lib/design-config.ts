/**
 * Design Configuration Manager
 * Handles workshop design customization and CSS variable injection
 * Synchronizes with Supabase database for multi-user consistency
 */

import type { WorkshopDesignConfig } from '@/types/design'
import { DEFAULT_DESIGN_CONFIG } from '@/types/design'
import { supabase } from './supabase'

class DesignConfigManager {
  private config: WorkshopDesignConfig
  private workshopId: string | null = null
  private readonly STORAGE_KEY = 'velofix_design_config'

  constructor() {
    this.config = this.loadLocalFallback()
  }

  /**
   * Load design config from localStorage as a fallback
   */
  private loadLocalFallback(): WorkshopDesignConfig {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_DESIGN_CONFIG }
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        return { ...DEFAULT_DESIGN_CONFIG, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.error('Failed to load local design config:', error)
    }

    return { ...DEFAULT_DESIGN_CONFIG }
  }

  /**
   * Initialize and load config from Supabase
   */
  async init(workshopId: string): Promise<void> {
    this.workshopId = workshopId
    await this.fetchFromServer()
  }

  /**
   * Fetch configuration from the database
   */
  async fetchFromServer(): Promise<void> {
    if (!this.workshopId) return

    try {
      const { data, error } = await supabase
        .from('workshops')
        .select('design_config')
        .eq('id', this.workshopId)
        .single()

      if (error) throw error

      if (data?.design_config) {
        // cast to any because we might have JSON type issues in the generated types
        const serverConfig = data.design_config as any
        this.config = { ...DEFAULT_DESIGN_CONFIG, ...serverConfig }
        this.saveLocalFallback(this.config)
        this.applyConfig()
      }
    } catch (error: any) {
      // PGRST204 = No results from .single(), 42703 = Column does not exist
      if (error?.code === 'PGRST204' || error?.code === '42703' || error?.message?.includes('design_config')) {
        console.warn('Design config column missing or workshop not found. Initializing with defaults.')
      } else {
        console.error('Failed to fetch design config from server:', error)
      }
    }
  }

  /**
   * Save design config to localStorage as fallback
   */
  private saveLocalFallback(config: WorkshopDesignConfig) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config))
    } catch (error) {
      console.error('Failed to save local design config:', error)
    }
  }

  /**
   * Get current design config
   */
  getConfig(): WorkshopDesignConfig {
    return { ...this.config }
  }

  /**
   * Update design config on server and locally
   */
  async updateConfig(updates: Partial<WorkshopDesignConfig>): Promise<void> {
    this.config = { ...this.config, ...updates }
    this.saveLocalFallback(this.config)
    this.applyConfig()

    if (this.workshopId) {
      try {
        const { error } = await supabase
          .from('workshops')
          .update({
            design_config: this.config as any,
            updated_at: new Date().toISOString()
          })
          .eq('id', this.workshopId)

        if (error) throw error
      } catch (error) {
        console.error('Failed to update design config on server:', error)
      }
    }
  }

  /**
   * Apply design config to CSS variables
   */
  applyConfig(): void {
    if (typeof document === 'undefined') return

    const root = document.documentElement

    // Apply brand colors
    root.style.setProperty('--velofix-primary', this.config.primaryColor)
    root.style.setProperty('--velofix-secondary', this.config.secondaryColor)
    root.style.setProperty('--velofix-accent', this.config.accentColor)

    // Apply border radius
    const radiusMap = {
      smooth: '0.75rem',
      rounded: '0.5rem',
      sharp: '0.25rem',
    }
    root.style.setProperty('--radius', radiusMap[this.config.borderRadius || 'smooth'])
  }

  /**
   * Reset to default config
   */
  async resetConfig(): Promise<void> {
    await this.updateConfig(DEFAULT_DESIGN_CONFIG)
  }

  /**
   * Generate CSS for PDF styling
   */
  getPDFStyles(): string {
    return `
      :root {
        --pdf-primary: ${this.config.primaryColor};
        --pdf-secondary: ${this.config.secondaryColor};
        --pdf-accent: ${this.config.accentColor};
        --pdf-font: ${this.config.pdfFont || 'Inter'};
      }

      .pdf-header {
        background: linear-gradient(135deg, ${this.config.primaryColor}10 0%, ${this.config.secondaryColor}10 100%);
        border-bottom: 2px solid ${this.config.primaryColor};
      }

      .pdf-badge {
        background-color: ${this.config.primaryColor}20;
        color: ${this.config.primaryColor};
        border: 1px solid ${this.config.primaryColor}40;
      }

      .pdf-footer {
        background: ${this.config.primaryColor}05;
        border-top: 1px solid ${this.config.primaryColor}20;
      }
    `
  }
}

// Singleton instance
export const designConfig = new DesignConfigManager()

// Initialize local variables on client side (Server sync happens via AuthContext or similar)
if (typeof window !== 'undefined') {
  designConfig.applyConfig()
}
