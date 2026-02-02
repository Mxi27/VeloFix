-- 1. Ensure trash_date column exists
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS trash_date TIMESTAMP WITH TIME ZONE;

-- 2. Handle Status Constraint (if it exists)
-- Attempt to drop the check constraint if it creates issues with 'trash' status
DO $$ 
BEGIN
    -- Check if there is a constraint named 'orders_status_check' or similar and drop it
    -- We can try to just alter the type if it is an enum, or the check constraint
    
    -- Option A: If it's a Check Constraint
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check') THEN
        ALTER TABLE orders DROP CONSTRAINT orders_status_check;
        
        ALTER TABLE orders ADD CONSTRAINT orders_status_check 
        CHECK (status IN ('eingegangen', 'warten_auf_teile', 'in_bearbeitung', 'abholbereit', 'abgeholt', 'abgeschlossen', 'trash'));
    END IF;
END $$;

-- 3. Update RLS Policies (Crucial!)
-- Ensure Admins can UPDATE the orders table, specifically the 'status' and 'trash_date' columns
-- This is a generic policy update, adjust to your specific RLS names if known
CREATE POLICY "Admins can update orders"
ON orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE employees.user_id = auth.uid() 
    AND employees.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE employees.user_id = auth.uid() 
    AND employees.role = 'admin'
  )
);

-- 4. Re-run cleanup function just in case
CREATE OR REPLACE FUNCTION delete_old_trash_orders()
RETURNS void AS $$
BEGIN
  DELETE FROM orders
  WHERE status = 'trash' 
  AND trash_date < (NOW() - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;
