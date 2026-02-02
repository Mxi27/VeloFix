-- Add trash_date column to orders table if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS trash_date TIMESTAMP WITH TIME ZONE;

-- Create a function to delete old trash orders
CREATE OR REPLACE FUNCTION delete_old_trash_orders()
RETURNS void AS $$
BEGIN
  DELETE FROM orders
  WHERE status = 'trash' 
  AND trash_date < (NOW() - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;

-- Initial cleanup run (optional, safe to run)
SELECT delete_old_trash_orders();

-- Note for User:
-- To automate this, you can use pg_cron if available on your Supabase instance:
-- SELECT cron.schedule('0 0 * * *', $$SELECT delete_old_trash_orders()$$);
-- OR create a scheduled Edge Function.
