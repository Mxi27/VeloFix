-- Add dedicated columns for notes and leasing details to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS internal_note text,
ADD COLUMN IF NOT EXISTS customer_note text,
ADD COLUMN IF NOT EXISTS contract_id text,
ADD COLUMN IF NOT EXISTS service_package text,
ADD COLUMN IF NOT EXISTS inspection_code text,
ADD COLUMN IF NOT EXISTS pickup_code text;

-- Update the status view or any other views if necessary (likely not strictly needed unless used in specific reporting views)
-- The get_public_order_status function might need an update if we want to show specific notes, but usually public status only shows status history.
