export type Theme = 'light' | 'dark' | 'system'

// Preset colors for the application (Refined premium palette)
export const PRESET_COLORS = [
    { name: 'VeloFix Red',    hex: '#de4c4a' },
    { name: 'Terracotta',     hex: '#d66a4e' },
    { name: 'Amber Glow',     hex: '#d97706' },
    { name: 'Nordic Green',   hex: '#2d8a5d' },
    { name: 'Deep Teal',      hex: '#0d9488' },
    { name: 'Steel Blue',     hex: '#4a7fb4' },
    { name: 'Royal Indigo',   hex: '#4f46e5' },
    { name: 'Soft Violet',    hex: '#8b5cf6' },
    { name: 'Graphite Grey',  hex: '#64748b' },
]

// Convert hex to OKLCH (approximation for now, or use a library if precise conversion needed)
// For now, we will assume user picks from presets or we try a simple hue rotation if we want to be fancy.
// But mostly, let's just use the presets for V1 to ensure design consistency.
// If the user wants a custom color, we might need a real converter.
// For now, simply using the hex for inputs and storing it.

// Helper to inject legacy CSS variables if needed, OR we stick to the OKLCH system.
// Since Tailwind 4 uses CSS variables natively, we update the variables.

export function applyThemeColor(color: string | null | undefined) {
    if (!color) {
        // Explicit fallback to VeloFix primary blue to prevent jumping to other defaults
        color = '#3b82f6';
    }

    const normalizedColor = color.toLowerCase().trim();
    const root = document.documentElement;

    // Anti-Flicker Guard: Check actual DOM instead of JS variables to prevent desyncs
    if (root.style.getPropertyValue('--velofix-primary') === normalizedColor) {
        return;
    }

    // We strictly use the hex value directly to guarantee the active theme
    // perfectly matches the circle color you click, bypassing flawed OKLCH approximations.
    root.style.setProperty('--velofix-primary', normalizedColor);
    root.style.setProperty('--velofix-primary-light', `color-mix(in srgb, ${normalizedColor}, white 20%)`);
    root.style.setProperty('--velofix-primary-dark', `color-mix(in srgb, ${normalizedColor}, black 20%)`);
    
    // Dispatch event so all UI components always match the true DOM state
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('velofix-theme-update', { detail: normalizedColor }));
    }

    localStorage.setItem('velofix-accent-color', normalizedColor);
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
    
    // Anti-Flicker Guard: Only apply and dispatch if the state actually changes
    const isAlreadyCompact = root.classList.contains('compact-mode')
    if (isAlreadyCompact === enabled) return

    root.classList.toggle('compact-mode', enabled)
    localStorage.setItem('compact-mode', enabled.toString())

    // Dispatch event so UI components and other tabs can sync
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('velofix-compact-update', { detail: enabled }))
    }
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
