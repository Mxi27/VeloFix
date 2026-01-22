-- Checklist Templates Table
-- Run this SQL in your Supabase SQL Editor to enable persistent checklist template storage

CREATE TABLE IF NOT EXISTS checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_checklist_templates_workshop_id 
ON checklist_templates(workshop_id);

-- Row Level Security (RLS)
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view templates from their workshop
CREATE POLICY "Users can view their workshop's templates"
ON checklist_templates FOR SELECT
USING (
    workshop_id IN (
        SELECT id FROM workshops WHERE owner_user_id = auth.uid()
        UNION
        SELECT workshop_id FROM employees WHERE user_id = auth.uid()
    )
);

-- Policy: Users can insert templates for their workshop
CREATE POLICY "Users can create templates for their workshop"
ON checklist_templates FOR INSERT
WITH CHECK (
    workshop_id IN (
        SELECT id FROM workshops WHERE owner_user_id = auth.uid()
        UNION
        SELECT workshop_id FROM employees WHERE user_id = auth.uid() AND role IN ('admin', 'write')
    )
);

-- Policy: Users can update their workshop's templates
CREATE POLICY "Users can update their workshop's templates"
ON checklist_templates FOR UPDATE
USING (
    workshop_id IN (
        SELECT id FROM workshops WHERE owner_user_id = auth.uid()
        UNION
        SELECT workshop_id FROM employees WHERE user_id = auth.uid() AND role IN ('admin', 'write')
    )
);

-- Policy: Users can delete their workshop's templates
CREATE POLICY "Users can delete their workshop's templates"
ON checklist_templates FOR DELETE
USING (
    workshop_id IN (
        SELECT id FROM workshops WHERE owner_user_id = auth.uid()
        UNION
        SELECT workshop_id FROM employees WHERE user_id = auth.uid() AND role IN ('admin', 'write')
    )
);
