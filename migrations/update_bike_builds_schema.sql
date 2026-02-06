-- Migration: Update Bike Builds Table
-- Add fields for Neurad/Assembly Wizard functionality

-- 1. Add status column
ALTER TABLE public.bike_builds 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'offen'; -- offen, in_arbeit, fertig, abgeholt

-- 2. Add assembly_progress column (same as previously added to orders)
ALTER TABLE public.bike_builds 
ADD COLUMN IF NOT EXISTS assembly_progress jsonb DEFAULT '{}'::jsonb;
-- Structure: { current_step_id: uuid, completed_steps: [uuid], step_data: { step_id: { inputs... } } }

-- 3. Add assigned_employee_id column
ALTER TABLE public.bike_builds 
ADD COLUMN IF NOT EXISTS assigned_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;

-- 4. Add customer fields if missing (user mentioned customer interaction in wizard)
-- User listed: id, created_at, workshop_id, brand, model, color, frame_size, internal_number, battery_serial, notes, mechanic_name, updated_at
-- We might need customer_name if the table doesn't have it, but for now we'll stick to what we know is needed for the wizard.
-- The user mentioned "New Bike Builds", often these are stock and don't have a customer yet, OR they do. 
-- The user didn't explicitly ask for customer columns but previously my table used them. I'll add them as nullable just in case.
ALTER TABLE public.bike_builds 
ADD COLUMN IF NOT EXISTS customer_name text;

ALTER TABLE public.bike_builds 
ADD COLUMN IF NOT EXISTS customer_email text;
