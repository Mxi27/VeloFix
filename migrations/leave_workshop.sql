-- Function to allow employees to leave a workshop
-- Owners cannot leave (they must delete the workshop)

CREATE OR REPLACE FUNCTION public.leave_workshop()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid;
BEGIN
    v_uid := auth.uid();

    -- 1. Check if user is an OWNER of ANY workshop
    IF EXISTS (SELECT 1 FROM workshops WHERE owner_user_id = v_uid) THEN
        RAISE EXCEPTION 'Owners cannot leave their own workshop. Please delete the workshop or transfer ownership.';
    END IF;

    -- 2. Remove from employees table
    DELETE FROM employees
    WHERE user_id = v_uid;

    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_workshop() TO authenticated;
