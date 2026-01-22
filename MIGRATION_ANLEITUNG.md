# Supabase Checklist Templates Migration

## Schritt-für-Schritt Anleitung

### 1. Supabase Dashboard öffnen
- Gehe zu deinem Supabase Projekt: https://app.supabase.com
- Wähle dein VeloFix Projekt aus

### 2. SQL Editor öffnen
- Klicke in der linken Sidebar auf **SQL Editor**
- Klicke auf **New Query**

### 3. SQL-Code einfügen
- Öffne die Datei: `supabase_add_checklist_templates.sql`
- Kopiere den gesamten Inhalt
- Füge ihn in den SQL Editor ein

### 4. Migration ausführen
- Klicke auf **Run** (oder drücke Cmd+Enter)
- Warte auf die Bestätigung "Success"

### 5. Tabelle verifizieren
- Gehe zu **Table Editor** in der Sidebar
- Du solltest jetzt `checklist_templates` in der Liste sehen
- Die Tabelle hat folgende Spalten:
  - `id` (uuid)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  - `workshop_id` (uuid, verknüpft mit workshops)
  - `name` (text)
  - `description` (text)
  - `items` (jsonb)

### 6. Fertig! 🎉
Die Checklisten-Vorlagen funktionieren jetzt vollständig mit:
- ✅ Drag & Drop Sortierung
- ✅ Inline Bearbeitung
- ✅ Persistente Speicherung in der Datenbank
- ✅ Automatische Synchronisation

## Troubleshooting

**Fehler: "relation already exists"**
→ Die Tabelle existiert bereits, alles gut!

**Fehler: "permission denied"**
→ Stelle sicher, dass du mit dem richtigen Supabase-Account angemeldet bist

**Fehler: "foreign key violation"**
→ Das `workshops` Schema muss existieren (sollte es bereits)

## Was passiert als Nächstes?

Nach der Migration kannst du:
1. Zur Settings-Seite gehen → Checklisten Tab
2. Neue Vorlagen erstellen
3. Punkte per Drag & Drop sortieren
4. Inline bearbeiten
5. Vorlagen in Aufträgen verwenden
