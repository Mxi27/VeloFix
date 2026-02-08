-- Add mechanic_2_id to orders table for secondary assignment

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS mechanic_2_id UUID REFERENCES employees(id);

CREATE INDEX IF NOT EXISTS idx_orders_mechanic_2_id ON orders(mechanic_2_id);
