-- Checklist Templates Table Migration
-- Add this table to your existing Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query

-- Create the checklist_templates table
CREATE TABLE public.checklist_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  workshop_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  items jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT checklist_templates_pkey PRIMARY KEY (id),
  CONSTRAINT checklist_templates_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX idx_checklist_templates_workshop_id ON public.checklist_templates(workshop_id);

-- Enable Row Level Security
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view templates from their workshop
CREATE POLICY "Users can view their workshop templates"
ON public.checklist_templates FOR SELECT
USING (
  workshop_id IN (
    SELECT id FROM public.workshops WHERE owner_user_id = auth.uid()
    UNION
    SELECT workshop_id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- RLS Policy: Workshop owners and admins can insert templates
CREATE POLICY "Users can create templates"
ON public.checklist_templates FOR INSERT
WITH CHECK (
  workshop_id IN (
    SELECT id FROM public.workshops WHERE owner_user_id = auth.uid()
    UNION
    SELECT workshop_id FROM public.employees WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policy: Workshop owners and admins can update templates
CREATE POLICY "Users can update templates"
ON public.checklist_templates FOR UPDATE
USING (
  workshop_id IN (
    SELECT id FROM public.workshops WHERE owner_user_id = auth.uid()
    UNION
    SELECT workshop_id FROM public.employees WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policy: Workshop owners and admins can delete templates
CREATE POLICY "Users can delete templates"
ON public.checklist_templates FOR DELETE
USING (
  workshop_id IN (
    SELECT id FROM public.workshops WHERE owner_user_id = auth.uid()
    UNION
    SELECT workshop_id FROM public.employees WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Checklist templates table created successfully!';
END $$;
