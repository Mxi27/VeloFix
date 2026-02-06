-- Fix for "Could not find the 'updated_at' column of 'workshops' in the schema cache"
-- Run this in your Supabase SQL Editor

ALTER TABLE public.workshops 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
