-- Fix for 400 Error in StatsCards.tsx
-- The error occurs because 'leasing_billed' column is missing in the orders table
-- but is being requested in the select query.

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS leasing_billed boolean DEFAULT false;
