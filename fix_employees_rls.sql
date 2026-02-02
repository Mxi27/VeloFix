-- 1. Ensure user_id can be NULL (required for Ghost Users)
ALTER TABLE employees ALTER COLUMN user_id DROP NOT NULL;

-- 2. Drop existing policy if it conflicts (optional, safe to try creating new ones)
DROP POLICY IF EXISTS "Owners can manage employees" ON employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON employees;

-- 3. Enable RLS on employees table (just in case)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- 4. Policy for Workshop Owners (CRITICAL: Allows the owner to add the first employee)
CREATE POLICY "Owners can manage employees" ON employees
FOR ALL
USING (
  workshop_id IN (
    SELECT id FROM workshops WHERE owner_user_id = auth.uid()
  )
)
WITH CHECK (
  workshop_id IN (
    SELECT id FROM workshops WHERE owner_user_id = auth.uid()
  )
);

-- 5. Policy for Shop Admins (Employees with admin role)
CREATE POLICY "Admins can manage employees" ON employees
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employees AS e
    WHERE e.user_id = auth.uid()
    AND e.workshop_id = employees.workshop_id
    AND e.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees AS e
    WHERE e.user_id = auth.uid()
    AND e.workshop_id = employees.workshop_id
    AND e.role = 'admin'
  )
);
