/**
 * Design Configuration Manager
 * Handles workshop design customization and CSS variable injection
 */

import type { WorkshopDesignConfig } from '@/types/design'
import { DEFAULT_DESIGN_CONFIG } from '@/types/design'

class DesignConfigManager {
  private config: WorkshopDesignConfig
  private readonly STORAGE_KEY = 'velofix_design_config'

  constructor() {
    this.config = this.loadConfig()
  }

  /**
   * Load design config from localStorage or use defaults
   */
  private loadConfig(): WorkshopDesignConfig {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_DESIGN_CONFIG }
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        return { ...DEFAULT_DESIGN_CONFIG, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.error('Failed to load design config:', error)
    }

    return { ...DEFAULT_DESIGN_CONFIG }
  }

  /**
   * Save design config to localStorage
   */
  private saveConfig(config: WorkshopDesignConfig) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config))
    } catch (error) {
      console.error('Failed to save design config:', error)
    }
  }

  /**
   * Get current design config
   */
  getConfig(): WorkshopDesignConfig {
    return { ...this.config }
  }

  /**
   * Update design config
   */
  updateConfig(updates: Partial<WorkshopDesignConfig>): void {
    this.config = { ...this.config, ...updates }
    this.saveConfig(this.config)
    this.applyConfig()
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
   * Apply a design preset
   */
  applyPreset(presetName: string): void {
    const { DESIGN_PRESETS } = require('@/types/design')

    if (DESIGN_PRESETS[presetName]) {
      this.updateConfig(DESIGN_PRESETS[presetName])
    }
  }

  /**
   * Reset to default config
   */
  resetConfig(): void {
    this.config = { ...DEFAULT_DESIGN_CONFIG }
    this.saveConfig(this.config)
    this.applyConfig()
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

// Initialize on client side
if (typeof window !== 'undefined') {
  designConfig.applyConfig()
}
