-- ============================================================
-- VeloFix: Terminbuchungssystem – Datenbankschema
-- Ausführen im Supabase SQL Editor
-- ============================================================

-- 1. Appointments-Tabelle
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,

    -- Kundendaten
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,

    -- Termin
    requested_date DATE NOT NULL,
    requested_time TEXT NOT NULL,
    confirmed_date DATE,
    confirmed_time TEXT,
    duration_minutes INTEGER DEFAULT 30,

    -- Details
    service_type TEXT NOT NULL DEFAULT 'repair',
    bike_brand TEXT,
    bike_model TEXT,
    bike_type TEXT,
    bike_color TEXT,
    description TEXT,
    internal_note TEXT,

    -- Status: pending | confirmed | completed | no_show | cancelled
    status TEXT NOT NULL DEFAULT 'pending',
    assigned_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,

    -- Tracking
    reminder_sent BOOLEAN DEFAULT FALSE,
    cancel_token UUID DEFAULT gen_random_uuid(),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indizes
CREATE INDEX IF NOT EXISTS idx_appointments_workshop_date
    ON appointments(workshop_id, requested_date);

CREATE INDEX IF NOT EXISTS idx_appointments_status
    ON appointments(workshop_id, status);

CREATE INDEX IF NOT EXISTS idx_appointments_cancel_token
    ON appointments(cancel_token);

-- 3. Row Level Security
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Werkstatt-Mitglieder können alle Termine ihrer Werkstatt lesen
CREATE POLICY "Workshop members can view appointments"
    ON appointments FOR SELECT
    USING (
        workshop_id IN (
            SELECT workshop_id FROM employees WHERE user_id = auth.uid()
        )
    );

-- Werkstatt-Mitglieder können Termine verwalten
CREATE POLICY "Workshop members can update appointments"
    ON appointments FOR UPDATE
    USING (
        workshop_id IN (
            SELECT workshop_id FROM employees WHERE user_id = auth.uid()
        )
    );

-- Werkstatt-Mitglieder können Termine löschen
CREATE POLICY "Workshop members can delete appointments"
    ON appointments FOR DELETE
    USING (
        workshop_id IN (
            SELECT workshop_id FROM employees WHERE user_id = auth.uid()
        )
    );

-- Öffentlich: Jeder kann einen Termin anfragen (Insert)
CREATE POLICY "Public can insert appointments"
    ON appointments FOR INSERT
    WITH CHECK (TRUE);

-- Öffentlich: Kunden können ihren Termin per cancel_token lesen
CREATE POLICY "Public can view own appointment by cancel_token"
    ON appointments FOR SELECT
    USING (TRUE);

-- 4. appointment_config auf workshops-Tabelle
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS appointment_config JSONB DEFAULT NULL;
