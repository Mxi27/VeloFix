/**
 * Design System Configuration for Workshop Branding
 * Allows workshops to customize the look and feel of their VeloFix instance
 */

export interface WorkshopDesignConfig {
  // Brand Colors
  primaryColor: string
  secondaryColor: string
  accentColor: string

  // Logo
  logoUrl?: string | null
  logoWidth?: number
  showLogoInPDF?: boolean

  // Company Info for PDFs
  companyName?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  companyWebsite?: string
  taxId?: string

  // PDF Settings
  pdfFont?: 'inter' | 'roboto' | 'opensans'
  showStamps?: boolean
  showBarcode?: boolean

  // UI Customization
  borderRadius?: 'smooth' | 'rounded' | 'sharp'
  theme?: 'light' | 'dark' | 'auto'
}

export const DEFAULT_DESIGN_CONFIG: WorkshopDesignConfig = {
  primaryColor: '#3b82f6', // VeloFix blue
  secondaryColor: '#8b5cf6', // Purple
  accentColor: '#f59e0b', // Amber
  logoUrl: null,
  logoWidth: 150,
  showLogoInPDF: true,
  pdfFont: 'inter',
  showStamps: true,
  showBarcode: true,
  borderRadius: 'smooth',
  theme: 'auto',
}

// Design presets for quick customization
export const DESIGN_PRESETS: Record<string, Partial<WorkshopDesignConfig>> = {
  default: {
    primaryColor: '#3b82f6',
    secondaryColor: '#8b5cf6',
    accentColor: '#f59e0b',
  },
  ocean: {
    primaryColor: '#0ea5e9',
    secondaryColor: '#06b6d4',
    accentColor: '#14b8a6',
  },
  forest: {
    primaryColor: '#22c55e',
    secondaryColor: '#10b981',
    accentColor: '#84cc16',
  },
  sunset: {
    primaryColor: '#f97316',
    secondaryColor: '#ef4444',
    accentColor: '#f59e0b',
  },
  royal: {
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    accentColor: '#ec4899',
  },
  minimal: {
    primaryColor: '#18181b',
    secondaryColor: '#71717a',
    accentColor: '#a1a1aa',
  },
}
