-- 1. Drop the existing constraint that is blocking us
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;

-- 2. Clean up any invalid data that might be there (optional, but good practice)
-- UPDATE employees SET role = 'read' WHERE role NOT IN ('admin', 'write', 'read');

-- 3. Re-add the constraint with the EXACT values used in the Frontend
ALTER TABLE employees 
ADD CONSTRAINT employees_role_check 
CHECK (role IN ('admin', 'write', 'read'));
