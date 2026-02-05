-- Final RLS Fix for Orders
-- Addresses "multiple_permissive_policies" on public.orders (Select overlap).

BEGIN;

-- "Orders: Modify" currently is FOR ALL, which includes SELECT.
-- "Orders: Select" is FOR SELECT.
-- This causes the overlap warning. 
-- We will split "Orders: Modify" into specific INSERT, UPDATE, DELETE policies.

DROP POLICY IF EXISTS "Orders: Modify" ON public.orders;

-- 1. Insert
CREATE POLICY "Orders: Insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (
     EXISTS (
        SELECT 1 FROM workshops WHERE id = orders.workshop_id AND owner_user_id = (select auth.uid())
    )
    OR EXISTS (
        SELECT 1 FROM employees 
        WHERE user_id = (select auth.uid()) 
        AND workshop_id = orders.workshop_id
        AND (role = 'admin' OR role = 'owner')
    )
);

-- 2. Update
CREATE POLICY "Orders: Update" ON public.orders FOR UPDATE TO authenticated USING (
     EXISTS (
        SELECT 1 FROM workshops WHERE id = orders.workshop_id AND owner_user_id = (select auth.uid())
    )
    OR EXISTS (
        SELECT 1 FROM employees 
        WHERE user_id = (select auth.uid()) 
        AND workshop_id = orders.workshop_id
        AND (role = 'admin' OR role = 'owner')
    )
);

-- 3. Delete
CREATE POLICY "Orders: Delete" ON public.orders FOR DELETE TO authenticated USING (
     EXISTS (
        SELECT 1 FROM workshops WHERE id = orders.workshop_id AND owner_user_id = (select auth.uid())
    )
    OR EXISTS (
        SELECT 1 FROM employees 
        WHERE user_id = (select auth.uid()) 
        AND workshop_id = orders.workshop_id
        AND (role = 'admin' OR role = 'owner')
    )
);

-- "Orders: Select" remains as the sole policy for SELECT.

COMMIT;
