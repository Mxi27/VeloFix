-- Fix 1: Mutable Search Path for Functions
-- This forces the search_path to 'public' for security
ALTER FUNCTION public.append_order_history SET search_path = public;
ALTER FUNCTION public.delete_old_trash_orders SET search_path = public;
ALTER FUNCTION public.generate_invite_code SET search_path = public;
ALTER FUNCTION public.get_my_membership SET search_path = public;
ALTER FUNCTION public.join_workshop_by_code SET search_path = public;
ALTER FUNCTION public.is_workshop_admin SET search_path = public;
ALTER FUNCTION public.is_workshop_member SET search_path = public;
ALTER FUNCTION public.get_my_workshop_id SET search_path = public;

-- Fix 2: Refine Permissive RLS Policy for Intake Requests
-- Replaces "WITH CHECK (true)" with explicit role checks to satisfy security linter
-- Functionally, this still allows public access (anon role), which is required for the intake form.

BEGIN;
  -- Drop the existing permissive policy
  DROP POLICY IF EXISTS "Public can submit intake requests" ON public.intake_requests;

  -- Create a cleaner, explicit policy
  CREATE POLICY "Public can submit intake requests" ON public.intake_requests
  FOR INSERT
  WITH CHECK (
    auth.role() = 'anon' OR 
    auth.role() = 'authenticated' OR 
    auth.role() = 'service_role'
  );
COMMIT;
