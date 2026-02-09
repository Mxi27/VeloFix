-- Add inquiry_retention_days to workshops table
ALTER TABLE public.workshops 
ADD COLUMN IF NOT EXISTS inquiry_retention_days integer DEFAULT NULL;

-- Function to delete old intake requests
CREATE OR REPLACE FUNCTION public.delete_old_intake_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
BEGIN
    -- Loop through workshops that have a retention policy set
    FOR r IN SELECT id, inquiry_retention_days FROM public.workshops WHERE inquiry_retention_days IS NOT NULL LOOP
        DELETE FROM public.intake_requests
        WHERE workshop_id = r.id
        AND created_at < now() - (r.inquiry_retention_days || ' days')::interval;
    END LOOP;
END;
$$;
