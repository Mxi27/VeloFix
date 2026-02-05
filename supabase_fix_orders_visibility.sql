-- RESTORE ORDER VISIBILITY
-- It seems the "Orders: Select" policy might not have been created correctly (possibly due to a name conflict), 
-- and since we dropped the "Modify" policy, you lost read access.
-- This script explicitly restores read access.

BEGIN;

-- 1. Ensure we start fresh for SELECT
DROP POLICY IF EXISTS "Orders: Select" ON public.orders;
DROP POLICY IF EXISTS "Orders: Workshop Isolation" ON public.orders; 
DROP POLICY IF EXISTS "Allow public read access" ON public.orders; -- Just in case

-- 2. Create the SELECT policy clearly
CREATE POLICY "Orders: Select" ON public.orders 
FOR SELECT 
TO authenticated 
USING (
    -- Case 1: Owner of the workshop
    EXISTS (
        SELECT 1 FROM workshops 
        WHERE id = orders.workshop_id 
        AND owner_user_id = (select auth.uid())
    )
    OR 
    -- Case 2: Employee of the workshop
    EXISTS (
        SELECT 1 FROM employees 
        WHERE user_id = (select auth.uid()) 
        AND workshop_id = orders.workshop_id
    )
);

COMMIT;
