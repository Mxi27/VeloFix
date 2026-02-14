-- Fix RLS Infinite Recursion & Optimize Performance
-- Introduces a SECURITY DEFINER function to break the recursion loop in 'employees' policy.

-- 1. Create Helper Function
DROP FUNCTION IF EXISTS public.is_workshop_member(uuid);

CREATE OR REPLACE FUNCTION public.is_workshop_member(_workshop_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS, allowing it to check employees table without triggering policy
SET search_path = public -- Secure search path
AS $$
BEGIN
  -- Check if user is owner OR employee
  RETURN EXISTS (
    SELECT 1 FROM public.workshops
    WHERE id = _workshop_id
    AND owner_user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.employees
    WHERE workshop_id = _workshop_id
    AND user_id = auth.uid()
  );
END;
$$;

-- 2. Update EMPLOYEES Policy (The culprit of recursion)
DROP POLICY IF EXISTS "Employees can view colleagues" ON public.employees;

CREATE POLICY "Employees can view colleagues"
ON public.employees
FOR SELECT
TO authenticated
USING (
  -- Use the function to check permission on the *target* row's workshop_id
  is_workshop_member(workshop_id)
);

-- 3. Update ORDERS Policy
DROP POLICY IF EXISTS "Workshop members can manage orders" ON public.orders;

CREATE POLICY "Workshop members can manage orders"
ON public.orders
FOR ALL
TO authenticated
USING (
  is_workshop_member(workshop_id)
);

-- 4. Update INTAKE_REQUESTS Policy
DROP POLICY IF EXISTS "Workshop members can manage intake requests" ON public.intake_requests;

CREATE POLICY "Workshop members can manage intake requests"
ON public.intake_requests
FOR ALL
TO authenticated
USING (
  is_workshop_member(workshop_id)
);

-- 5. Update CHECKLIST_TEMPLATES Policy
DROP POLICY IF EXISTS "Workshop members can manage templates" ON public.checklist_templates;

CREATE POLICY "Workshop members can manage templates"
ON public.checklist_templates
FOR ALL
TO authenticated
USING (
  is_workshop_member(workshop_id)
);

-- 6. Update NEURAD Policies
DROP POLICY IF EXISTS "Workshop members can manage neurad steps" ON public.neurad_steps;

CREATE POLICY "Workshop members can manage neurad steps"
ON public.neurad_steps
FOR ALL
TO authenticated
USING (
  is_workshop_member(workshop_id)
);

DROP POLICY IF EXISTS "Workshop members can manage neurad configs" ON public.neurad_configs;

CREATE POLICY "Workshop members can manage neurad configs"
ON public.neurad_configs
FOR ALL
TO authenticated
USING (
  is_workshop_member(workshop_id)
);
