-- Fix RLS Recursion Issue via Security Definer Function

-- 1. Create a secure function to resolve workshop IDs for the current user
-- This function runs with elevated privileges (SECURITY DEFINER) to bypass RLS on employees/workshops tables
-- This breaks the infinite recursion loop when policies query these tables
CREATE OR REPLACE FUNCTION public.get_user_workshop_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    -- Get workshop IDs where user is an employee
    SELECT workshop_id FROM public.employees WHERE user_id = auth.uid()
    UNION
    -- Get workshop IDs where user is the owner
    SELECT id FROM public.workshops WHERE owner_user_id = auth.uid();
$$;

-- 2. Update Employees Policy to use the secure function
DROP POLICY IF EXISTS "Employees can view colleagues" ON public.employees;

CREATE POLICY "Employees can view colleagues"
ON public.employees
FOR SELECT
TO authenticated
USING (
    workshop_id IN (SELECT public.get_user_workshop_ids())
);

-- 3. Update Shop Tasks Policy to use the secure function
DROP POLICY IF EXISTS "Workshop members can manage shop tasks" ON public.shop_tasks;

CREATE POLICY "Workshop members can manage shop tasks"
ON public.shop_tasks
FOR ALL
TO authenticated
USING (
    workshop_id IN (SELECT public.get_user_workshop_ids())
);

-- 4. Update Orders Policy to use the secure function (Optimization)
DROP POLICY IF EXISTS "Workshop members can manage orders" ON public.orders;

CREATE POLICY "Workshop members can manage orders"
ON public.orders
FOR ALL
TO authenticated
USING (
    workshop_id IN (SELECT public.get_user_workshop_ids())
);
