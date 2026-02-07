-- Add qc_mechanic_id column to bike_builds table
ALTER TABLE public.bike_builds 
ADD COLUMN IF NOT EXISTS qc_mechanic_id uuid REFERENCES public.employees(id);

-- Add comment
COMMENT ON COLUMN public.bike_builds.qc_mechanic_id IS 'The employee responsible for quality control (Endkontrolle)';
