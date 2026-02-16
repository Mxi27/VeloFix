
-- Migration to add 'kontrolle_offen' to orders status check constraint

DO $$
BEGIN
    -- Drop the constraint if it exists (assuming default name order_status_check or orders_status_check)
    -- We try multiple common names just in case
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check') THEN
        ALTER TABLE orders DROP CONSTRAINT orders_status_check;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check1') THEN
        ALTER TABLE orders DROP CONSTRAINT orders_status_check1;
    END IF;

    -- Also check for a constraint on the column that might have an auto-generated name?
    -- Hard to target without knowing name. We assume 'orders_status_check' is the one we set previously.
    
    -- Re-add the constraint with the new value
    ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN (
        'eingegangen', 
        'warten_auf_teile', 
        'in_bearbeitung', 
        'kontrolle_offen', 
        'abholbereit', 
        'abgeholt', 
        'abgeschlossen', 
        'trash',
        -- Legacy/Other potential values observed in code
        'todo',
        'in_progress',
        'done'
    ));
END $$;
