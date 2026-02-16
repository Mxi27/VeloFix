import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // PDF generation
          'vendor-pdf': ['jspdf', 'html2canvas', 'qrcode'],
          // Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
          // Animation libraries
          'vendor-motion': ['framer-motion'],
          // UI utilities
          'vendor-ui': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
      },
    },
  },
})


