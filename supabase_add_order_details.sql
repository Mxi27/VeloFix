-- Add missing columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS internal_notes text,
ADD COLUMN IF NOT EXISTS actual_price decimal(10,2);
