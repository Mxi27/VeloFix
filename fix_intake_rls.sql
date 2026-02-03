-- Allow public read access to workshops table for Intake Form
-- Updated to explicitly drop "Allow public read access" if it exists

BEGIN;

-- Drop potentially conflicting policies (including the one that might already exist)
DROP POLICY IF EXISTS "Allow public read access" ON "public"."workshops";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."workshops";
DROP POLICY IF EXISTS "Allow public read" ON "public"."workshops";
DROP POLICY IF EXISTS "Employees can view their workshop" ON "public"."workshops";

-- Create permissive select policy
CREATE POLICY "Allow public read access"
ON "public"."workshops"
FOR SELECT
TO public
USING (true);

COMMIT;
