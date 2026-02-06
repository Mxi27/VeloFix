-- Add missing control_data column to bike_builds
-- This fixes the crash in the Feedback Page

ALTER TABLE public.bike_builds 
ADD COLUMN IF NOT EXISTS control_data jsonb DEFAULT '{}'::jsonb;

-- Optional: Add index for performance if querying by completed status inside jsonb
-- CREATE INDEX IF NOT EXISTS idx_bike_builds_control_data ON public.bike_builds USING gin (control_data);
