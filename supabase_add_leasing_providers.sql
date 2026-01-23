-- Add leasing_providers JSONB column to workshops table
-- We use JSONB for efficiency and flexibility
ALTER TABLE workshops 
ADD COLUMN IF NOT EXISTS leasing_providers JSONB DEFAULT '[]'::jsonb;

-- Optional: Comment to explain the structure
COMMENT ON COLUMN workshops.leasing_providers IS 'List of enabled leasing providers for the workshop';
