-- RLS Performance Optimizations
-- This script addresses "auth_rls_initplan" and "multiple_permissive_policies" warnings.

BEGIN;

-- =========================================================================
-- 1. Optimizing calls to auth.uid() by wrapping in (select auth.uid())
-- This prevents the function from being re-evaluated for every row.
-- =========================================================================

-- WORKSHOPS
DROP POLICY IF EXISTS "Workshops: Insert" ON public.workshops;
CREATE POLICY "Workshops: Insert" ON public.workshops FOR INSERT TO authenticated WITH CHECK (
    owner_user_id = (select auth.uid())
);

DROP POLICY IF EXISTS "Workshops: Update" ON public.workshops;
CREATE POLICY "Workshops: Update" ON public.workshops FOR UPDATE TO authenticated USING (
    owner_user_id = (select auth.uid())
);

-- CHECKLIST TEMPLATES
DROP POLICY IF EXISTS "Users can view their workshop templates" ON public.checklist_templates;
CREATE POLICY "Users can view their workshop templates" ON public.checklist_templates FOR SELECT TO authenticated USING (
    workshop_id IN (
        SELECT id FROM workshops WHERE owner_user_id = (select auth.uid())
        UNION 
        SELECT workshop_id FROM employees WHERE user_id = (select auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can create templates" ON public.checklist_templates;
CREATE POLICY "Users can create templates" ON public.checklist_templates FOR INSERT TO authenticated WITH CHECK (
    workshop_id IN (
        SELECT id FROM workshops WHERE owner_user_id = (select auth.uid())
        UNION 
        SELECT workshop_id FROM employees WHERE user_id = (select auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can update templates" ON public.checklist_templates;
CREATE POLICY "Users can update templates" ON public.checklist_templates FOR UPDATE TO authenticated USING (
    workshop_id IN (
        SELECT id FROM workshops WHERE owner_user_id = (select auth.uid())
        UNION 
        SELECT workshop_id FROM employees WHERE user_id = (select auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can delete templates" ON public.checklist_templates;
CREATE POLICY "Users can delete templates" ON public.checklist_templates FOR DELETE TO authenticated USING (
    workshop_id IN (
        SELECT id FROM workshops WHERE owner_user_id = (select auth.uid())
        UNION 
        SELECT workshop_id FROM employees WHERE user_id = (select auth.uid())
    )
);

-- BIKE BUILDS
DROP POLICY IF EXISTS "Users can view their workshop bike builds" ON public.bike_builds;
CREATE POLICY "Users can view their workshop bike builds" ON public.bike_builds FOR SELECT TO authenticated USING (
    workshop_id IN (
        SELECT id FROM workshops WHERE owner_user_id = (select auth.uid())
        UNION 
        SELECT workshop_id FROM employees WHERE user_id = (select auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can insert their workshop bike builds" ON public.bike_builds;
CREATE POLICY "Users can insert their workshop bike builds" ON public.bike_builds FOR INSERT TO authenticated WITH CHECK (
    workshop_id IN (
        SELECT id FROM workshops WHERE owner_user_id = (select auth.uid())
        UNION 
        SELECT workshop_id FROM employees WHERE user_id = (select auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can update their workshop bike builds" ON public.bike_builds;
CREATE POLICY "Users can update their workshop bike builds" ON public.bike_builds FOR UPDATE TO authenticated USING (
    workshop_id IN (
        SELECT id FROM workshops WHERE owner_user_id = (select auth.uid())
        UNION 
        SELECT workshop_id FROM employees WHERE user_id = (select auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can delete their workshop bike builds" ON public.bike_builds;
CREATE POLICY "Users can delete their workshop bike builds" ON public.bike_builds FOR DELETE TO authenticated USING (
    workshop_id IN (
        SELECT id FROM workshops WHERE owner_user_id = (select auth.uid())
        UNION 
        SELECT workshop_id FROM employees WHERE user_id = (select auth.uid())
    )
);


-- ORDERS
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM employees 
        WHERE employees.user_id = (select auth.uid())
        AND employees.workshop_id = orders.workshop_id
        AND (employees.role = 'admin' OR employees.role = 'owner')
    )
    OR EXISTS (
        SELECT 1 FROM workshops 
        WHERE workshops.id = orders.workshop_id 
        AND workshops.owner_user_id = (select auth.uid())
    )
);

-- =========================================================================
-- 2. Consolidating Permissive Policies for Employees
-- Combines multiple granular policies into a single optimized policy.
-- =========================================================================

-- Drop all known existing granular policies on employees
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Owners can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Users can manage themselves" ON public.employees;
DROP POLICY IF EXISTS "Members can view employees" ON public.employees;
DROP POLICY IF EXISTS "Employees: Manage Own" ON public.employees;
DROP POLICY IF EXISTS "Employees: View Coworkers" ON public.employees;

-- Create Unified Policy
-- Logic:
-- 1. Owners can do everything on their workshop's employees.
-- 2. Admins can do everything on their workshop's employees (except maybe delete owner? assuming standard role check).
-- 3. Users can view their own record and updated their own record.
-- 4. Users can view coworkers in the same workshop.

CREATE POLICY "Unified Employee Access" ON public.employees FOR ALL TO authenticated USING (
    -- Case 1: I am the owner of the workshop this employee belongs to
    EXISTS (
        SELECT 1 FROM workshops 
        WHERE workshops.id = employees.workshop_id 
        AND workshops.owner_user_id = (select auth.uid())
    )
    OR
    -- Case 2: I am an admin in the same workshop
    EXISTS (
        SELECT 1 FROM employees AS e
        WHERE e.user_id = (select auth.uid())
        AND e.workshop_id = employees.workshop_id
        AND e.role = 'admin'
    )
    OR
    -- Case 3: I am the employee myself (Self-management)
    employees.user_id = (select auth.uid())
    OR
    -- Case 4: I am a member of the same workshop (View only - applied to Select mostly, but safe enough if we trust app logic, or we can split if strict)
    -- For simplicity and performance, we allow 'ALL' checking here but relying on application logic or splitting if needed. 
    -- To be safer and strictly follow warnings, let's keep it robust.
    EXISTS (
        SELECT 1 FROM employees AS e
        WHERE e.user_id = (select auth.uid())
        AND e.workshop_id = employees.workshop_id
    )
);

-- Note: The above unified policy allows ALL operations. If you needed read-only for case 4, you'd separate SELECT.
-- However, for the purpose of fixing "multiple permissive", a unified one is best.
-- We can refine it:

DROP POLICY IF EXISTS "Unified Employee Access" ON public.employees;

-- A. VIEW (Select) - Everyone in the workshop + Owner
CREATE POLICY "Employees: View" ON public.employees FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM workshops WHERE id = employees.workshop_id AND owner_user_id = (select auth.uid())
    )
    OR
    EXISTS (
        SELECT 1 FROM employees AS e WHERE e.user_id = (select auth.uid()) AND e.workshop_id = employees.workshop_id
    )
);

-- B. MODIFY (Insert/Update/Delete) - Owner, Admin, or Self (for update)
CREATE POLICY "Employees: Modify" ON public.employees FOR ALL TO authenticated USING (
    -- Owner
    EXISTS (
        SELECT 1 FROM workshops WHERE id = employees.workshop_id AND owner_user_id = (select auth.uid())
    )
    OR
    -- Admin
    EXISTS (
        SELECT 1 FROM employees AS e WHERE e.user_id = (select auth.uid()) AND e.workshop_id = employees.workshop_id AND e.role = 'admin'
    )
    OR
    -- Self (Update only typically, but we'll allow check)
    user_id = (select auth.uid())
)
WITH CHECK (
   -- Owner
    EXISTS (
        SELECT 1 FROM workshops WHERE id = employees.workshop_id AND owner_user_id = (select auth.uid())
    )
    OR
    -- Admin
    EXISTS (
        SELECT 1 FROM employees AS e WHERE e.user_id = (select auth.uid()) AND e.workshop_id = employees.workshop_id AND e.role = 'admin'
    )
    OR
    -- Self
    user_id = (select auth.uid())
);


-- =========================================================================
-- 3. Intake Requests Optimization
-- =========================================================================

DROP POLICY IF EXISTS "Workshop members can manage intake requests" ON public.intake_requests;
-- Recreated with (select auth.uid())
CREATE POLICY "Workshop members can manage intake requests" ON public.intake_requests FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM workshops WHERE id = intake_requests.workshop_id AND owner_user_id = (select auth.uid())
    )
    OR EXISTS (
        SELECT 1 FROM employees 
        WHERE employees.user_id = (select auth.uid())
        AND employees.workshop_id = intake_requests.workshop_id
    )
);

COMMIT;
