-- Add new columns for leasing support to intake_requests
ALTER TABLE public.intake_requests
ADD COLUMN IF NOT EXISTS intake_type text DEFAULT 'standard', -- 'standard' or 'leasing'
ADD COLUMN IF NOT EXISTS leasing_provider text,
ADD COLUMN IF NOT EXISTS contract_id text,
ADD COLUMN IF NOT EXISTS service_package text,
ADD COLUMN IF NOT EXISTS inspection_code text,
ADD COLUMN IF NOT EXISTS pickup_code text,
ADD COLUMN IF NOT EXISTS private_email text;
