-- Add design and configuration fields to workshops table
ALTER TABLE workshops 
ADD COLUMN IF NOT EXISTS design_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS acceptance_checklist TEXT[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS inquiry_retention_days INT;

-- Comments for documentation
COMMENT ON COLUMN workshops.design_config IS 'Stores brand colors, PDF settings, and UI preferences';
COMMENT ON COLUMN workshops.acceptance_checklist IS 'List of items to be checked during intake';
COMMENT ON COLUMN workshops.inquiry_retention_days IS 'Number of days to keep customer inquiries before automatic deletion';
