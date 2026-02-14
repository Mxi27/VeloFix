-- Fix function_search_path_mutable for check_employee_data_integrity
ALTER FUNCTION public.check_employee_data_integrity() SET search_path = public;

-- Fix function_search_path_mutable for delete_old_intake_requests
ALTER FUNCTION public.delete_old_intake_requests() SET search_path = public;

-- Fix rls_policy_always_true for intake_requests
-- First drop the permissive policy
DROP POLICY IF EXISTS "Public can submit intake requests" ON public.intake_requests;

-- Re-create the policy with a stricter check (must use status = 'pending')
CREATE POLICY "Public can submit intake requests" 
ON public.intake_requests 
FOR INSERT 
WITH CHECK (status = 'pending');
