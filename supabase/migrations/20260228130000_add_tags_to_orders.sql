-- Create tags table
CREATE TABLE IF NOT EXISTS public.workshop_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(workshop_id, name)
);

-- Enable RLS
ALTER TABLE public.workshop_tags ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for workshop_tags
CREATE POLICY "Workshop members can manage tags"
ON public.workshop_tags
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workshops
    WHERE id = workshop_tags.workshop_id
    AND owner_user_id = (SELECT auth.uid())
  )
  OR
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE workshop_id = workshop_tags.workshop_id
    AND user_id = (SELECT auth.uid())
  )
);

-- Add tags column to orders
ALTER TABLE public.orders 
ADD COLUMN tags UUID[] DEFAULT '{}'::UUID[];
