-- Refactor mechanic assignment to use an array of UUIDs
-- This allows for any number of mechanics to be assigned to an order

-- 1. Add new column
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS mechanic_ids UUID[] DEFAULT '{}';

-- 2. Migrate existing data
DO $$
BEGIN
    -- Check if mechanic_2_id exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND column_name = 'mechanic_2_id'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND column_name = 'mechanic_id'
    ) THEN
        -- Both exist, migrate both
        UPDATE orders
        SET mechanic_ids = ARRAY_REMOVE(ARRAY[mechanic_id, mechanic_2_id], NULL);
    
    ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND column_name = 'mechanic_id'
    ) THEN
        -- Only mechanic_id exists
        UPDATE orders
        SET mechanic_ids = ARRAY_REMOVE(ARRAY[mechanic_id], NULL);
    END IF;
END $$;

-- 3. Create index for performance (using GIN for array containment queries)
CREATE INDEX IF NOT EXISTS idx_orders_mechanic_ids ON orders USING GIN (mechanic_ids);

-- 4. Drop old columns (SAFE TO RUN if you want to cleanup, otherwise keep for safety for now)
ALTER TABLE orders DROP COLUMN IF EXISTS mechanic_id;
ALTER TABLE orders DROP COLUMN IF EXISTS mechanic_2_id;
