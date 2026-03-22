/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    // Add further VITE_ variables here as the project grows
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
