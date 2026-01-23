-- Add leasing_code column if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS leasing_code text;
