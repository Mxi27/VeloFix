-- Update workshops table to support invite codes
ALTER TABLE workshops 
ADD COLUMN IF NOT EXISTS invite_code text UNIQUE,
ADD COLUMN IF NOT EXISTS allow_guest_join boolean DEFAULT false;

-- Update employees table to distinguish ghost users and add UI elements
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS color text DEFAULT '#3b82f6', -- default blue-500
ADD COLUMN IF NOT EXISTS initials text,
ADD COLUMN IF NOT EXISTS is_kiosk_mode boolean DEFAULT false; -- Flags if this account is a restricted "Standard Account"

-- Function to generate a unique invite code for a workshop
CREATE OR REPLACE FUNCTION generate_invite_code(target_workshop_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code text;
BEGIN
  LOOP
    -- Generate a random 6-character code (simple alphanumeric)
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check uniqueness
    IF NOT EXISTS (SELECT 1 FROM workshops WHERE invite_code = new_code) THEN
      UPDATE workshops SET invite_code = new_code WHERE id = target_workshop_id;
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$;

-- Function to join a workshop via code
CREATE OR REPLACE FUNCTION join_workshop_by_code(
  p_invite_code text,
  p_user_id uuid,
  p_user_email text,
  p_user_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workshop_id uuid;
  v_allow_join boolean;
BEGIN
  -- 1. Find workshop
  SELECT id, allow_guest_join INTO v_workshop_id, v_allow_join
  FROM workshops
  WHERE invite_code = upper(p_invite_code);

  IF v_workshop_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ungültiger Code');
  END IF;

  IF v_allow_join = false THEN
     RETURN jsonb_build_object('success', false, 'message', 'Beitritt derzeit deaktiviert');
  END IF;

  -- 2. Check if user is already an employee in ANY workshop (optional constraint? for now assume 1 user = 1 workshop)
  -- Or just add them.
  
  -- 3. Create employee record
  INSERT INTO employees (workshop_id, user_id, email, name, role, active, color, initials)
  VALUES (
    v_workshop_id, 
    p_user_id, 
    p_user_email, 
    p_user_name, 
    'read', -- Default role for guests, can be upgraded by admin
    true,
    '#10b981', -- default green for joined users
    substring(upper(p_user_name) from 1 for 2)
  )
  ON CONFLICT (user_id) DO UPDATE SET workshop_id = EXCLUDED.workshop_id; -- Move user to new workshop if they join another?

  RETURN jsonb_build_object('success', true, 'workshop_id', v_workshop_id);
END;
$$;
