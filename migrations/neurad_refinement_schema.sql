-- Migration: Refined Neurad Workflow & Base Schema
-- Support for Guided Assembly, Templates, and Configurable Data Entry

-- ==========================================
-- 1. BASE TABLES (If not exist)
-- ==========================================

-- 1.1 Neurad Steps Table
CREATE TABLE IF NOT EXISTS public.neurad_steps (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workshop_id uuid REFERENCES public.workshops(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text,
    order_index integer NOT NULL DEFAULT 0,
    is_active boolean DEFAULT true,
    required boolean DEFAULT true,
    estimated_minutes integer DEFAULT 15,
    inputs jsonb DEFAULT '[]'::jsonb, 
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS for neurad_steps
ALTER TABLE public.neurad_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workshop members can manage neurad steps" ON public.neurad_steps;
CREATE POLICY "Workshop members can manage neurad steps" ON public.neurad_steps
FOR ALL USING (
    workshop_id IN (
        SELECT id FROM public.workshops WHERE owner_user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.user_id = auth.uid()
        AND employees.workshop_id = public.neurad_steps.workshop_id
    )
);

-- 1.2 Neurad Configurations
CREATE TABLE IF NOT EXISTS public.neurad_configs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workshop_id uuid REFERENCES public.workshops(id) ON DELETE CASCADE NOT NULL,
    config_key text NOT NULL,
    config_value jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(workshop_id, config_key)
);

-- RLS for neurad_configs
ALTER TABLE public.neurad_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workshop members can manage neurad configs" ON public.neurad_configs;
CREATE POLICY "Workshop members can manage neurad configs" ON public.neurad_configs
FOR ALL USING (
    workshop_id IN (
        SELECT id FROM public.workshops WHERE owner_user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.user_id = auth.uid()
        AND employees.workshop_id = public.neurad_configs.workshop_id
    )
);


-- ==========================================
-- 2. REFINEMENTS (Templates & Data Fields)
-- ==========================================

-- 2.1 Add 'template_name' to neurad_steps
ALTER TABLE public.neurad_steps 
ADD COLUMN IF NOT EXISTS template_name text DEFAULT 'Standard';

-- 2.2 Add 'checklist_template' to bike_builds
ALTER TABLE public.bike_builds 
ADD COLUMN IF NOT EXISTS checklist_template text DEFAULT 'Standard';

-- 2.3 Add extra columns to bike_builds if missing
ALTER TABLE public.bike_builds 
ADD COLUMN IF NOT EXISTS serial_number text;

ALTER TABLE public.bike_builds 
ADD COLUMN IF NOT EXISTS battery_serial text;

ALTER TABLE public.bike_builds 
ADD COLUMN IF NOT EXISTS notes text;
