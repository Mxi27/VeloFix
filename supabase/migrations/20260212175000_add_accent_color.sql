-- Add accent_color column to workshops table
ALTER TABLE public.workshops
ADD COLUMN IF NOT EXISTS accent_color text;
