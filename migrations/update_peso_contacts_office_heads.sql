-- Migration: Update PESO contacts to support multiple office heads
-- This migration adds support for multiple office heads similar to emails and contacts

-- Add new column for multiple office heads
ALTER TABLE peso_contacts ADD COLUMN IF NOT EXISTS office_heads JSONB DEFAULT '[]'::jsonb;

-- Migrate existing data to new format
UPDATE peso_contacts 
SET 
  office_heads = CASE 
    WHEN office_head IS NOT NULL AND office_head != '' 
    THEN jsonb_build_array(jsonb_build_object('name', office_head))
    ELSE '[]'::jsonb
  END
WHERE office_heads IS NULL;

-- Make the new column NOT NULL after migration
ALTER TABLE peso_contacts ALTER COLUMN office_heads SET NOT NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_peso_contacts_office_heads ON peso_contacts USING GIN (office_heads);

