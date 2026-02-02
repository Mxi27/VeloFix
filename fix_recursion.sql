-- 1. Erstmal die kaputten Policies löschen
DROP POLICY IF EXISTS "Owners can manage employees" ON employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON employees;
DROP POLICY IF EXISTS "Members can view employees" ON employees;

-- 2. Hilfsfunktion erstellen, die Admin-Status prüft (SECURITY DEFINER umgeht RLS Loop)
CREATE OR REPLACE FUNCTION is_workshop_admin(lookup_workshop_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employees
    WHERE workshop_id = lookup_workshop_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
END;
$$;

-- 3. Hilfsfunktion für einfache Mitglieder (Lesezugriff)
CREATE OR REPLACE FUNCTION is_workshop_member(lookup_workshop_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employees
    WHERE workshop_id = lookup_workshop_id
      AND user_id = auth.uid()
  );
END;
$$;

-- 4. Policy für Owner (Besitzer der Werkstatt aus 'workshops' Tabelle)
CREATE POLICY "Owners can manage employees" ON employees
FOR ALL
USING (
  workshop_id IN (SELECT id FROM workshops WHERE owner_user_id = auth.uid())
)
WITH CHECK (
  workshop_id IN (SELECT id FROM workshops WHERE owner_user_id = auth.uid())
);

-- 5. Policy für Admins (Nutzt die sichere Funktion)
CREATE POLICY "Admins can manage employees" ON employees
FOR ALL
USING (
  is_workshop_admin(workshop_id)
)
WITH CHECK (
  is_workshop_admin(workshop_id)
);

-- 6. Policy fürs Lesen (Jeder Mitarbeiter darf die Liste sehen)
CREATE POLICY "Members can view employees" ON employees
FOR SELECT
USING (
  is_workshop_member(workshop_id) OR
  workshop_id IN (SELECT id FROM workshops WHERE owner_user_id = auth.uid())
);

-- 7. Self-Service Policy: Man darf sich selbst sehen/bearbeiten (z.B. Profil)
CREATE POLICY "Users can manage themselves" ON employees
FOR ALL
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);
