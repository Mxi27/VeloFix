-- Additional data lifecycle fields for workshops table
ALTER TABLE workshops 
ADD COLUMN IF NOT EXISTS order_retention_days INT DEFAULT 365,
ADD COLUMN IF NOT EXISTS trash_retention_days INT DEFAULT 30;

-- Comments for documentation
COMMENT ON COLUMN workshops.order_retention_days IS 'Number of days to keep archived orders before automatic deletion';
COMMENT ON COLUMN workshops.trash_retention_days IS 'Number of days to keep items in trash before permanent deletion';
