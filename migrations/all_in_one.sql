-- ============================================
-- VELOFIX ALL-IN-ONE SUPABASE MIGRATION
-- ============================================
-- Run this script in your Supabase SQL Editor
-- This consolidates all required migrations
-- ============================================

BEGIN;

-- ============================================
-- 1. INTAKE REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.intake_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workshop_id uuid REFERENCES public.workshops(id) ON DELETE CASCADE NOT NULL,
    intake_type text DEFAULT 'standard', -- 'standard' or 'leasing'
    customer_name text NOT NULL,
    customer_email text,
    customer_phone text,
    customer_address text,
    description text,
    status text DEFAULT 'pending', -- 'pending', 'imported'
    -- Bike data
    bike_model text,
    bike_type text,
    -- Leasing specific
    leasing_provider text,
    contract_id text,
    service_package text,
    inspection_code text,
    pickup_code text,
    private_email text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.intake_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Public can insert (for the intake form)
DROP POLICY IF EXISTS "Public can submit intake requests" ON public.intake_requests;
CREATE POLICY "Public can submit intake requests" ON public.intake_requests
FOR INSERT WITH CHECK (true);

-- Policy: Workshop members can view/manage their own requests
DROP POLICY IF EXISTS "Workshop members can manage intake requests" ON public.intake_requests;
CREATE POLICY "Workshop members can manage intake requests" ON public.intake_requests
FOR ALL USING (
    workshop_id IN (
        SELECT id FROM public.workshops WHERE owner_user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.user_id = auth.uid()
        AND employees.workshop_id = public.intake_requests.workshop_id
    )
);

-- Grant permissions
GRANT INSERT ON public.intake_requests TO anon;
GRANT SELECT, UPDATE, DELETE ON public.intake_requests TO authenticated;

-- ============================================
-- 2. EMPLOYEE ASSIGNMENT FOR ORDERS
-- ============================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_assigned_employee ON orders(assigned_employee_id);

-- ============================================
-- 3. ORDERS TABLE ADDITIONS
-- ============================================
-- Leasing & additional fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_leasing boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS leasing_provider text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS contract_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_info jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_notes text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS private_email text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS end_control jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS trash_date timestamptz;

-- ============================================
-- 4. RLS POLICIES FOR ORDERS
-- ============================================

-- Drop overlapping policies
DROP POLICY IF EXISTS "Orders: Modify" ON public.orders;

-- Select policy (workshop members can view)
DROP POLICY IF EXISTS "Orders: Select" ON public.orders;
CREATE POLICY "Orders: Select" ON public.orders FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM workshops WHERE id = orders.workshop_id AND owner_user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM employees 
        WHERE user_id = auth.uid() 
        AND workshop_id = orders.workshop_id
    )
);

-- Insert policy
DROP POLICY IF EXISTS "Orders: Insert" ON public.orders;
CREATE POLICY "Orders: Insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM workshops WHERE id = orders.workshop_id AND owner_user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM employees 
        WHERE user_id = auth.uid() 
        AND workshop_id = orders.workshop_id
        AND role IN ('admin', 'owner', 'write')
    )
);

-- Update policy
DROP POLICY IF EXISTS "Orders: Update" ON public.orders;
CREATE POLICY "Orders: Update" ON public.orders FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM workshops WHERE id = orders.workshop_id AND owner_user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM employees 
        WHERE user_id = auth.uid() 
        AND workshop_id = orders.workshop_id
        AND role IN ('admin', 'owner', 'write')
    )
);

-- Delete policy (admin only)
DROP POLICY IF EXISTS "Orders: Delete" ON public.orders;
CREATE POLICY "Orders: Delete" ON public.orders FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM workshops WHERE id = orders.workshop_id AND owner_user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM employees 
        WHERE user_id = auth.uid() 
        AND workshop_id = orders.workshop_id
        AND role IN ('admin', 'owner')
    )
);

-- ============================================
-- 5. PUBLIC ORDER STATUS FUNCTION
-- ============================================
DROP FUNCTION IF EXISTS public.get_public_order_status(uuid);
CREATE OR REPLACE FUNCTION public.get_public_order_status(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'order_number', o.order_number,
        'status', o.status,
        'bike_model', o.bike_model,
        'bike_type', o.bike_type,
        'created_at', o.created_at,
        'workshop', jsonb_build_object(
            'name', w.name,
            'phone', w.phone,
            'email', w.email,
            'address', w.address,
            'city', w.city
        )
    )
    INTO result
    FROM orders o
    JOIN workshops w ON o.workshop_id = w.id
    WHERE o.id = p_order_id;
    
    RETURN result;
END;
$$;

-- Grant execute to anon for public status page
GRANT EXECUTE ON FUNCTION public.get_public_order_status(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_order_status(uuid) TO authenticated;

-- ============================================
-- 6. CHECKLIST TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.checklist_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workshop_id uuid REFERENCES public.workshops(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text,
    items jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workshop members can manage templates" ON public.checklist_templates;
CREATE POLICY "Workshop members can manage templates" ON public.checklist_templates
FOR ALL USING (
    workshop_id IN (
        SELECT id FROM public.workshops WHERE owner_user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.user_id = auth.uid()
        AND employees.workshop_id = public.checklist_templates.workshop_id
    )
);

COMMIT;

-- ============================================
-- DONE! Your VeloFix database is now ready.
-- ============================================
