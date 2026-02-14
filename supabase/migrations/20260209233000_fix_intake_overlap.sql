-- Fix overlap between Public and Workshop Member policies for intake_requests
-- Goal: Restrict "Public" policy to 'anon' role only, so it doesn't apply to 'authenticated' users.

-- 1. Drop the existing "Public" policy
DROP POLICY IF EXISTS "Public can submit intake requests" ON public.intake_requests;

-- 2. Re-create it strictly for the 'anon' role
CREATE POLICY "Public can submit intake requests"
ON public.intake_requests
FOR INSERT
TO anon
WITH CHECK (status = 'pending');
