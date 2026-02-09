-- Add frame_number and frame_size to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS frame_number text,
ADD COLUMN IF NOT EXISTS frame_size text;

-- Add comments for clarity
COMMENT ON COLUMN orders.frame_number IS 'Manufacturer frame number / serial number';
COMMENT ON COLUMN orders.frame_size IS 'Size of the bicycle frame (e.g. M, L, 56cm)';
