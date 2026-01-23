ALTER TABLE workshops 
ADD COLUMN IF NOT EXISTS acceptance_checklist JSONB DEFAULT '["Sichtprüfung auf Beschädigungen dokumentiert", "Zubehör/Ausstattung erfasst (Licht, Schloss, Gepäckträger etc.)", "Akkustand/Akku vorhanden geprüft (bei E-Bike)", "Kundenwunsch / Reparaturauftrag notiert", "Kostenvoranschlag/Preisrahmen kommuniziert", "Voraussichtliches Abholtermin besprochen"]'::JSONB;
