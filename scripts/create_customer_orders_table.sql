-- ============================================================
-- VeloFix: Customer Orders (Kundenbestellungen) – Datenbankschema
-- ============================================================

-- 1. Helper Function for Performance & Security (Avoid Circular Dependencies)
CREATE OR REPLACE FUNCTION public.get_my_workshop_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT workshop_id 
    FROM employees 
    WHERE user_id = auth.uid() 
    LIMIT 1;
$$;

-- 2. Customer Orders Tabelle
CREATE TABLE IF NOT EXISTS public.customer_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,

    -- Kundendaten
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,

    -- Details
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ "name": "...", "quantity": 1, "status": "..." }]
    notes TEXT,
    
    -- Status: open | ordered | received | notified | ready | completed | cancelled
    status TEXT NOT NULL DEFAULT 'open',
    
    -- Tracking & Public Access
    status_token TEXT DEFAULT gen_random_uuid()::text,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_customer_orders_modtime ON public.customer_orders;
CREATE TRIGGER update_customer_orders_modtime
    BEFORE UPDATE ON public.customer_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- 4. Indizes
CREATE INDEX IF NOT EXISTS idx_customer_orders_workshop_status
    ON public.customer_orders(workshop_id, status);

CREATE INDEX IF NOT EXISTS idx_customer_orders_status_token
    ON public.customer_orders(status_token);

-- 5. Row Level Security
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

-- Werkstatt-Mitglieder können alle Bestellungen ihrer Werkstatt lesen
CREATE POLICY "Workshop members can view customer_orders"
    ON public.customer_orders FOR SELECT
    TO authenticated
    USING (
        workshop_id = public.get_my_workshop_id()
    );

-- Werkstatt-Mitglieder können Bestellungen anlegen
CREATE POLICY "Workshop members can insert customer_orders"
    ON public.customer_orders FOR INSERT
    TO authenticated
    WITH CHECK (
        workshop_id = public.get_my_workshop_id()
    );

-- Werkstatt-Mitglieder können Bestellungen verwalten
CREATE POLICY "Workshop members can update customer_orders"
    ON public.customer_orders FOR UPDATE
    TO authenticated
    USING (
        workshop_id = public.get_my_workshop_id()
    )
    WITH CHECK (
        workshop_id = public.get_my_workshop_id()
    );

-- Werkstatt-Mitglieder können Bestellungen löschen
CREATE POLICY "Workshop members can delete customer_orders"
    ON public.customer_orders FOR DELETE
    TO authenticated
    USING (
        workshop_id = public.get_my_workshop_id()
    );

-- Öffentlich: Kunden können ihre Bestellung per status_token lesen
CREATE POLICY "Public can view own customer_order by status_token"
    ON public.customer_orders FOR SELECT
    USING (
        status_token IS NOT NULL
    );
