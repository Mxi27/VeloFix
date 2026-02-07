-- Add mechanic_id and qc_mechanic_id to orders table

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS mechanic_id UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS qc_mechanic_id UUID REFERENCES employees(id);
