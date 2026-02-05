-- EMERGENCY ACCESS FIX
-- The previous policies created a "circular dependency": You couldn't see the orders because the database checked if you were an employee,
-- but you couldn't check if you were an employee because you couldn't read the employees table!

BEGIN;

-- 1. Fix Employees View Policy (The Root Cause)
DROP POLICY IF EXISTS "Employees: View" ON public.employees;

CREATE POLICY "Employees: View" ON public.employees FOR SELECT TO authenticated USING (
    -- Always allow a user to see their OWN record. This breaks the "invisibility loop".
    user_id = (select auth.uid())
    OR
    -- Allow Owners to see their employees
    EXISTS (
        SELECT 1 FROM workshops WHERE id = employees.workshop_id AND owner_user_id = (select auth.uid())
    )
    OR
    -- Allow Employees to see other employees in the same workshop
    -- (This works now because they can see themselves first to establish their workshop_id)
    EXISTS (
        SELECT 1 FROM employees AS e 
        WHERE e.user_id = (select auth.uid()) 
        AND e.workshop_id = employees.workshop_id
    )
);

-- 2. Ensure Orders Select is definitely correct (re-applying just in case)
DROP POLICY IF EXISTS "Orders: Select" ON public.orders;
CREATE POLICY "Orders: Select" ON public.orders FOR SELECT TO authenticated USING (
    -- Workshop Owner
    EXISTS (
        SELECT 1 FROM workshops 
        WHERE id = orders.workshop_id 
        AND owner_user_id = (select auth.uid())
    )
    OR 
    -- Workshop Employee (Now works because they can read their own employee record)
    EXISTS (
        SELECT 1 FROM employees 
        WHERE user_id = (select auth.uid()) 
        AND workshop_id = orders.workshop_id
    )
);

COMMIT;
