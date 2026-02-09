-- Fix for Employees Table RLS Recursion (Error 500)
-- Replaces recursive policies with performant, non-recursive checks using get_my_role()

BEGIN;

-- 1. Drop existing policies to be safe
DROP POLICY IF EXISTS "Employees: Select" ON public.employees;
DROP POLICY IF EXISTS "Employees: Insert" ON public.employees;
DROP POLICY IF EXISTS "Employees: Update" ON public.employees;
DROP POLICY IF EXISTS "Employees: Delete" ON public.employees;
DROP POLICY IF EXISTS "Public can view employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;

-- 2. Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 3. Create Optimized Policies

-- SELECT: 
-- Users can see themselves
-- OR Users can see employees in their workshop (if they are a member of that workshop)
CREATE POLICY "Employees: Select" ON public.employees
FOR SELECT TO authenticated
USING (
    -- User sees themselves
    auth.uid() = user_id
    OR
    -- Check if user belongs to the same workshop (using safe function)
    (get_my_role()->>'workshopId')::uuid = workshop_id
);

-- INSERT:
-- Only Owners and Admins can insert new employees
CREATE POLICY "Employees: Insert" ON public.employees
FOR INSERT TO authenticated
WITH CHECK (
    -- Check if user is Admin/Owner of this workshop
    (get_my_role()->>'workshopId')::uuid = workshop_id
    AND 
    (get_my_role()->>'role')::text IN ('owner', 'admin')
);

-- UPDATE:
-- Only Owners and Admins can update employees
-- Users can update their own profile (maybe?) -> limiting to admins for now as per requirement
CREATE POLICY "Employees: Update" ON public.employees
FOR UPDATE TO authenticated
USING (
    -- Check if user is Admin/Owner of this workshop
    (get_my_role()->>'workshopId')::uuid = workshop_id
    AND 
    (get_my_role()->>'role')::text IN ('owner', 'admin')
)
WITH CHECK (
    -- Check if user is Admin/Owner of this workshop
    (get_my_role()->>'workshopId')::uuid = workshop_id
    AND 
    (get_my_role()->>'role')::text IN ('owner', 'admin')
);

-- DELETE:
-- Only Owners and Admins can delete
CREATE POLICY "Employees: Delete" ON public.employees
FOR DELETE TO authenticated
USING (
    -- Check if user is Admin/Owner of this workshop
    (get_my_role()->>'workshopId')::uuid = workshop_id
    AND 
    (get_my_role()->>'role')::text IN ('owner', 'admin')
);

COMMIT;
