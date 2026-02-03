-- Add leasing_portal_email to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS leasing_portal_email text;

-- Comment for clarity
COMMENT ON COLUMN orders.leasing_portal_email IS 'Email address from the leasing portal (may differ from customer contact email)';
