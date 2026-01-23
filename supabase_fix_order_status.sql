-- 1. First, remove the strict rule that is blocked the update (DROP CONSTRAINT FIRST)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 2. Now that the rule is gone, we can safely update the values to the new German system
UPDATE orders SET status = 'eingegangen' WHERE status = 'received';
UPDATE orders SET status = 'warten_auf_teile' WHERE status = 'pending';

-- Fallback for any other weird status
UPDATE orders 
SET status = 'eingegangen' 
WHERE status NOT IN ('eingegangen', 'warten_auf_teile', 'in_bearbeitung', 'abholbereit', 'abgeholt', 'abgeschlossen');

-- 3. Finally, establish the new rule with the correct German values
ALTER TABLE orders
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('eingegangen', 'warten_auf_teile', 'in_bearbeitung', 'abholbereit', 'abgeholt', 'abgeschlossen'));
