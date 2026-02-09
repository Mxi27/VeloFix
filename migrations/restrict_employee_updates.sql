-- Prevent updating Name/Email for Linked Employees
-- Real users manage their own profile; admins can only change roles/status.

CREATE OR REPLACE FUNCTION public.check_employee_data_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- If the employee is linked to a real user account (user_id IS NOT NULL)
    IF OLD.user_id IS NOT NULL THEN
        -- Check if critical fields are being changed
        IF (NEW.email <> OLD.email) OR (NEW.name <> OLD.name) THEN
            RAISE EXCEPTION 'Cannot update name or email of a linked user account. User must update their own profile.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop trigger if exists to allow re-running
DROP TRIGGER IF EXISTS trg_protect_linked_employee_data ON public.employees;

-- Create Trigger
CREATE TRIGGER trg_protect_linked_employee_data
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.check_employee_data_integrity();
