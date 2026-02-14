-- Add extended details columns to workshops table
ALTER TABLE public.workshops
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS iban text,
ADD COLUMN IF NOT EXISTS bic text,
ADD COLUMN IF NOT EXISTS tax_id text,
ADD COLUMN IF NOT EXISTS ust_id text,
ADD COLUMN IF NOT EXISTS footer_text text,
ADD COLUMN IF NOT EXISTS terms_text text;
