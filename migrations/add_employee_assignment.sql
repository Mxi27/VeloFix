-- Migration: Add employee assignment to orders
-- Run this in Supabase SQL Editor

-- 1. Add assigned_employee_id column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_assigned_employee ON orders(assigned_employee_id);

-- 3. Update RLS policies to allow reading assigned employee
-- (Already covered by existing workshop-based policies)

-- Optional: Backfill existing orders with null (already default)
