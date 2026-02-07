-- Add due_date column to intake_requests table
ALTER TABLE intake_requests 
ADD COLUMN IF NOT EXISTS due_date timestamptz;

-- Refresh the schema cache (optional, but good practice if using PostgREST)
NOTIFY pgrst, 'reload config';
