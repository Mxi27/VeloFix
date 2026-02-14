-- Optimize RLS Policies
-- Goal: Remove duplicates and wrap auth.uid() in (select ...) to avoid initplan warnings.

-- 1. ORDERS
-- Drop existing policies (including variations found in linter)
DROP POLICY IF EXISTS "Enable read access for valid users" ON public.orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.orders;
DROP POLICY IF EXISTS "Enable update for owners and assigned mechanics" ON public.orders;
DROP POLICY IF EXISTS "Orders: Select" ON public.orders;
DROP POLICY IF EXISTS "Orders: Insert" ON public.orders;
DROP POLICY IF EXISTS "Orders: Update" ON public.orders;
DROP POLICY IF EXISTS "Orders: Delete" ON public.orders;
DROP POLICY IF EXISTS "Workshop members can manage orders" ON public.orders;

-- Create unified policy for Owners and Employees
CREATE POLICY "Workshop members can manage orders"
ON public.orders
FOR ALL
TO authenticated
USING (
  -- Check if user is the owner of the workshop (workshops.owner_user_id)
  EXISTS (
    SELECT 1 FROM public.workshops
    WHERE id = orders.workshop_id
    AND owner_user_id = (SELECT auth.uid())
  )
  OR
  -- Check if user is an employee of the workshop
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE workshop_id = orders.workshop_id
    AND user_id = (SELECT auth.uid())
  )
);


-- 2. INTAKE_REQUESTS
-- Drop existing policies
DROP POLICY IF EXISTS "Public can submit intake requests" ON public.intake_requests;
DROP POLICY IF EXISTS "Workshop members can manage intake requests" ON public.intake_requests;
DROP POLICY IF EXISTS "Workshop members can delete intake requests" ON public.intake_requests;
DROP POLICY IF EXISTS "Workshop members can update intake requests" ON public.intake_requests;

-- Re-create Public Insert (from previous fix, just ensuring it exists cleanly)
CREATE POLICY "Public can submit intake requests"
ON public.intake_requests
FOR INSERT
WITH CHECK (status = 'pending');

-- Unified Policy for Workshop Members
CREATE POLICY "Workshop members can manage intake requests"
ON public.intake_requests
FOR ALL
TO authenticated
USING (
  -- Check if user is owner or employee of the workshop
  EXISTS (
    SELECT 1 FROM public.workshops
    WHERE id = intake_requests.workshop_id
    AND owner_user_id = (SELECT auth.uid())
  )
  OR
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE workshop_id = intake_requests.workshop_id
    AND user_id = (SELECT auth.uid())
  )
);


-- 3. CHECKLIST_TEMPLATES
-- Drop existing policies
DROP POLICY IF EXISTS "Users can create templates" ON public.checklist_templates;
DROP POLICY IF EXISTS "Users can view their workshop templates" ON public.checklist_templates;
DROP POLICY IF EXISTS "Users can update templates" ON public.checklist_templates;
DROP POLICY IF EXISTS "Users can delete templates" ON public.checklist_templates;
DROP POLICY IF EXISTS "Workshop members can manage templates" ON public.checklist_templates;

-- Unified Policy
CREATE POLICY "Workshop members can manage templates"
ON public.checklist_templates
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workshops
    WHERE id = checklist_templates.workshop_id
    AND owner_user_id = (SELECT auth.uid())
  )
  OR
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE workshop_id = checklist_templates.workshop_id
    AND user_id = (SELECT auth.uid())
  )
);


-- 4. EMPLOYEES
-- Drop existing policies
DROP POLICY IF EXISTS "Employees: Select" ON public.employees;
DROP POLICY IF EXISTS "Employees: View" ON public.employees;

-- Unified Select Policy (assuming employees can view other employees in same workshop)
CREATE POLICY "Employees can view colleagues"
ON public.employees
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e2
    WHERE e2.workshop_id = employees.workshop_id
    AND e2.user_id = (SELECT auth.uid())
  )
  OR
  -- Owners can view their employees
  EXISTS (
    SELECT 1 FROM public.workshops
    WHERE id = employees.workshop_id
    AND owner_user_id = (SELECT auth.uid())
  )
);


-- 5. NEURAD_STEPS & NEURAD_CONFIGS
-- These tables likely have "Workshop members can manage..." policies.
-- We'll drop and recreate them with the optimization.

-- neurad_steps
DROP POLICY IF EXISTS "Workshop members can manage neurad steps" ON public.neurad_steps;

CREATE POLICY "Workshop members can manage neurad steps"
ON public.neurad_steps
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workshops
    WHERE id = neurad_steps.workshop_id
    AND owner_user_id = (SELECT auth.uid())
  )
  OR
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE workshop_id = neurad_steps.workshop_id
    AND user_id = (SELECT auth.uid())
  )
);

-- neurad_configs
DROP POLICY IF EXISTS "Workshop members can manage neurad configs" ON public.neurad_configs;

CREATE POLICY "Workshop members can manage neurad configs"
ON public.neurad_configs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workshops
    WHERE id = neurad_configs.workshop_id
    AND owner_user_id = (SELECT auth.uid())
  )
  OR
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE workshop_id = neurad_configs.workshop_id
    AND user_id = (SELECT auth.uid())
  )
);
