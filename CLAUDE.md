# VeloFix Project Context for Claude Code

## Project Overview
VeloFix is a bicycle repair shop management application built with React, TypeScript, and Supabase. It features multi-tenant workshop management, order tracking, and inventory/leasing tools.

## Commands
- **Start Dev Server**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Type Check**: `npx tsc -b`

## Tech Stack
- **Frontend**: React 19, Vite 7, TypeScript 5.9
- **Styling**: Tailwind CSS v4.0, Shadcn/UI, OKLCH color palette
- **Icons**: Lucide React
- **Routing**: React Router DOM v7
- **Backend/Auth**: Supabase (PostgreSQL, RLS enabled)

## Architecture & Code Structure
- **`src/components/ui/`**: Reusable UI components (shadcn/ui based).
- **`src/pages/`**: Main route views (`DashboardPage`, `OrderDetailPage`, `LoginPage`).
- **`src/contexts/`**: Global state (`AuthContext` for user/workshop session).
- **`src/lib/supabase.ts`**: Supabase client initialization.
- **`src/types/`**: TypeScript definitions (especially Supabase schema).

### Key Concepts
1.  **Workshops (Tenancy)**: Users belong to a `workshop`. Most queries are filtered by `workshop_id`.
2.  **Orders**: The core entity. Status flow: `accepted` -> `in_progress` -> `done` -> `picked_up`.
3.  **Authentication**: Handled via Supabase Auth + `AuthContext`. Users land on `OnboardingPage` if no workshop is linked.

## Style Guidelines (Design DNA)
- **Theme**: Dark mode optimized, generally using `oklch` colors defined in `src/index.css`.
- **Tailwind v4**: Uses the new `@theme inline` syntax in CSS.
- **Glassmorphism**: often used in cards/overlays.
- **Components**: strictly prefer existing `shadcn/ui` components over custom HTML.
- **Icons**: Use `lucide-react` imports.

## Development Rules
1.  **Performance**: Avoid importing the entire project context. Read only relevant files (`LoginPage`, `AuthContext` etc.) for specific tasks.
2.  **Types**: Strict TypeScript usage. No `any` unless absolutely necessary.
3.  **Supabase**: Always check for `error` in responses. Use Row Level Security (RLS) policies compliance in mind.
