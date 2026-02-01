-- Add history column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;

-- Function to atomically append to history
-- This prevents race conditions where two users updating history 
-- at the same time might overwrite each other's changes if we just did read-modify-write on the client.
CREATE OR REPLACE FUNCTION append_order_history(
  p_order_id uuid,
  p_event jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE orders
  SET history = history || p_event
  WHERE id = p_order_id;
END;
$$;
