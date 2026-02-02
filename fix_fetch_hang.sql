-- Function to safely get the current user's workshop ID and ROLE
-- bypassing potentially complex RLS policies on the client side
CREATE OR REPLACE FUNCTION get_my_membership()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workshop_id uuid;
  v_role text;
BEGIN
  -- 1. Check if I am an employee
  SELECT workshop_id, role INTO v_workshop_id, v_role
  FROM employees
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_workshop_id IS NOT NULL THEN
    RETURN jsonb_build_object('workshopId', v_workshop_id, 'role', v_role);
  END IF;

  -- 2. Check if I am an owner
  -- Owners are implicitly 'admin'
  SELECT id INTO v_workshop_id
  FROM workshops
  WHERE owner_user_id = auth.uid()
  LIMIT 1;

  IF v_workshop_id IS NOT NULL THEN
    RETURN jsonb_build_object('workshopId', v_workshop_id, 'role', 'admin');
  END IF;

  RETURN jsonb_build_object('workshopId', null, 'role', null);
END;
$$;
