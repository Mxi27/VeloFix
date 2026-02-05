-- DEFINITIVE FIX: Security Definer Function
-- The previous attempts failed because of deep recursion in RLS.
-- The only robust way to solve "User needs to check Employee table to see if they are an Employee"
-- is to use a SECURITY DEFINER function. This function bypasses RLS to answer the question.

BEGIN;

-- 1. Create a helper function that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_my_workshop_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER -- <--- This is the magic key. It runs with admin privileges.
SET search_path = public
STABLE
AS $$
    SELECT workshop_id 
    FROM employees 
    WHERE user_id = auth.uid() 
    LIMIT 1;
$$;

-- 2. Update Employees View Policy to use the function
DROP POLICY IF EXISTS "Employees: View" ON public.employees;
CREATE POLICY "Employees: View" ON public.employees FOR SELECT TO authenticated USING (
    -- Case 1: I am the owner (direct check on workshops table)
    EXISTS (
        SELECT 1 FROM workshops WHERE id = employees.workshop_id AND owner_user_id = (select auth.uid())
    )
    OR
    -- Case 2: I am seeing myself
    user_id = (select auth.uid())
    OR
    -- Case 3: I am an employee in the same workshop (using the secure function)
    employees.workshop_id = get_my_workshop_id()
);

-- 3. Update Orders Select Policy to use the function
DROP POLICY IF EXISTS "Orders: Select" ON public.orders;
CREATE POLICY "Orders: Select" ON public.orders FOR SELECT TO authenticated USING (
    -- Owner
    EXISTS (
        SELECT 1 FROM workshops 
        WHERE id = orders.workshop_id 
        AND owner_user_id = (select auth.uid())
    )
    OR 
    -- Employee (using secure function)
    orders.workshop_id = get_my_workshop_id()
);

COMMIT;
