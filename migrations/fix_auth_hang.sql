-- Fix for Infinite Loading / Auth Hang
-- This function runs with SECURITY DEFINER privileges to bypass RLS checks
-- preventing recursion deadlocks during initial load.

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid;
    v_workshop_id uuid;
    v_owner_workshop_id uuid;
    v_role text;
BEGIN
    v_uid := auth.uid();
    
    -- 1. Check if user is an OWNER
    SELECT id INTO v_owner_workshop_id
    FROM workshops
    WHERE owner_user_id = v_uid
    LIMIT 1;

    IF v_owner_workshop_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'workshopId', v_owner_workshop_id, 
            'role', 'owner'
        );
    END IF;

    -- 2. Check if user is an EMPLOYEE
    SELECT workshop_id, role INTO v_workshop_id, v_role
    FROM employees
    WHERE user_id = v_uid
    LIMIT 1;

    IF v_workshop_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'workshopId', v_workshop_id, 
            'role', v_role
        );
    END IF;

    -- 3. Default (No membership found)
    RETURN jsonb_build_object(
        'workshopId', null, 
        'role', null
    );
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- Optimizations for Auth Performance
CREATE INDEX IF NOT EXISTS idx_workshops_owner_user_id ON workshops(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
