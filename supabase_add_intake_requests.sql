-- Create intake_requests table
CREATE TABLE IF NOT EXISTS public.intake_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workshop_id uuid REFERENCES public.workshops(id) ON DELETE CASCADE NOT NULL,
    customer_name text NOT NULL,
    customer_email text,
    customer_phone text,
    customer_address text,
    description text,
    status text DEFAULT 'pending', -- 'pending', 'imported'
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.intake_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Public can insert (for the intake form)
-- We might want to restrict this slightly if possible, but for a public link, standard INSERT with true is common.
DROP POLICY IF EXISTS "Public can submit intake requests" ON public.intake_requests;
CREATE POLICY "Public can submit intake requests" ON public.intake_requests
FOR INSERT
WITH CHECK (true);

-- Policy: Workshop members (owners + employees) can view/manage their own requests
DROP POLICY IF EXISTS "Workshop members can manage intake requests" ON public.intake_requests;
CREATE POLICY "Workshop members can manage intake requests" ON public.intake_requests
FOR ALL
USING (
    workshop_id IN (
        SELECT id FROM public.workshops WHERE owner_user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.user_id = auth.uid()
        AND employees.workshop_id = public.intake_requests.workshop_id
    )
);

-- Grant permissions to anon/public for the insert
GRANT INSERT ON public.intake_requests TO anon;
GRANT SELECT, UPDATE, DELETE ON public.intake_requests TO authenticated;
