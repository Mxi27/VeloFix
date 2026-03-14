
export type Theme = 'light' | 'dark' | 'system'

// Preset colors for the application
export const PRESET_COLORS = [
    { name: 'Default Blue', hex: '#3b82f6', oklch: '0.50 0.14 250' }, // Corrected default
    { name: 'Purple', hex: '#a855f7', oklch: '0.55 0.16 280' },
    { name: 'Green', hex: '#22c55e', oklch: '0.55 0.14 145' },
    { name: 'Orange', hex: '#f97316', oklch: '0.68 0.16 45' },
    { name: 'Red', hex: '#ef4444', oklch: '0.55 0.16 25' },
    { name: 'Pink', hex: '#ec4899', oklch: '0.60 0.16 340' },
]

// Convert hex to OKLCH (approximation for now, or use a library if precise conversion needed)
// For now, we will assume user picks from presets or we try a simple hue rotation if we want to be fancy.
// But mostly, let's just use the presets for V1 to ensure design consistency.
// If the user wants a custom color, we might need a real converter.
// For now, simply using the hex for inputs and storing it.

// Helper to inject legacy CSS variables if needed, OR we stick to the OKLCH system.
// Since Tailwind 4 uses CSS variables natively, we update the variables.

export function applyThemeColor(color: string) {
    const root = document.documentElement;

    // Find if it's a preset to get the perfect OKLCH values
    const preset = PRESET_COLORS.find(c => c.hex.toLowerCase() === color.toLowerCase());

    if (preset) {
        const [l, c, h] = preset.oklch.split(' ').map(parseFloat);
        root.style.setProperty('--velofix-primary', `oklch(${l} ${c} ${h})`);
        root.style.setProperty('--velofix-primary-light', `oklch(${Math.min(l + 0.1, 1)} ${c} ${h})`);
        root.style.setProperty('--velofix-primary-dark', `oklch(${Math.max(l - 0.1, 0)} ${c} ${h})`);
    } else {
        // Support for custom Hex colors using modern CSS color-mix for variations
        root.style.setProperty('--velofix-primary', color);
        // Derive light/dark versions from the custom color
        root.style.setProperty('--velofix-primary-light', `color-mix(in srgb, ${color}, white 20%)`);
        root.style.setProperty('--velofix-primary-dark', `color-mix(in srgb, ${color}, black 20%)`);
    }

    localStorage.setItem('velofix-accent-color', color);
}

// Load on startup
export function loadThemeColor() {
    const color = localStorage.getItem('velofix-accent-color');
    if (color) {
        applyThemeColor(color);
    }
}

export function applyTheme(theme: Theme) {
    const root = document.documentElement
    if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        root.classList.toggle('dark', systemPrefersDark)
    } else {
        root.classList.toggle('dark', theme === 'dark')
    }
    localStorage.setItem('theme', theme)
}

export function applyCompactMode(enabled: boolean) {
    const root = document.documentElement
    root.classList.toggle('compact-mode', enabled)
    localStorage.setItem('compact-mode', enabled.toString())
}

export function loadTheme(): Theme {
    const savedTheme = localStorage.getItem('theme') as Theme | null
    const theme = savedTheme || 'system'
    applyTheme(theme)
    return theme
}

export function loadCompactMode(): boolean {
    const savedCompact = localStorage.getItem('compact-mode')
    const isCompact = savedCompact === 'true'
    applyCompactMode(isCompact)
    return isCompact
}
