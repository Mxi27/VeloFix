-- Add bike_model and bike_type columns to intake_requests for better order mapping
ALTER TABLE public.intake_requests
ADD COLUMN IF NOT EXISTS bike_model text,
ADD COLUMN IF NOT EXISTS bike_type text; -- Expected values: 'road', 'mtb', 'city', 'ebike'
