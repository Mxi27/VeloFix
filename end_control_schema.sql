-- Add the 'end_control' JSONB column to the orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS end_control JSONB DEFAULT '{}'::jsonb;

-- Optional: Comments to describe the field
COMMENT ON COLUMN public.orders.end_control IS 'Stores Control Mode data: steps, rating, feedback, etc.';
