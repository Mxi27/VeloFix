-- Migration: Neurad System (Dynamic Assembly)
-- Run in Supabase SQL Editor

-- 1. Neurad Steps Table (Guided Assembly Steps)
CREATE TABLE IF NOT EXISTS public.neurad_steps (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workshop_id uuid REFERENCES public.workshops(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text,
    order_index integer NOT NULL DEFAULT 0,
    is_active boolean DEFAULT true,
    required boolean DEFAULT true,
    estimated_minutes integer DEFAULT 15,
    inputs jsonb DEFAULT '[]'::jsonb, -- dynamic input fields definition (e.g. torque values)
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

-- 2. Neurad Configurations (Global Settings)
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

-- 3. (Removed) Add 'assembly_progress' to Orders - moved to bike_builds table
-- ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assembly_progress jsonb DEFAULT '{}'::jsonb; 


COMMIT;
