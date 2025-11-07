-- Migration: Update PRAS contacts to support multiple contact persons and office heads
-- This migration adds support for multiple contact persons and office heads similar to emails and contacts

-- Add new columns for multiple contact persons and office heads
ALTER TABLE pra_contacts ADD COLUMN IF NOT EXISTS pra_contact_persons JSONB DEFAULT '[]'::jsonb;
ALTER TABLE pra_contacts ADD COLUMN IF NOT EXISTS office_heads JSONB DEFAULT '[]'::jsonb;

-- Migrate existing data to new format
UPDATE pra_contacts 
SET 
  pra_contact_persons = CASE 
    WHEN pra_contact_person IS NOT NULL AND pra_contact_person != '' 
    THEN jsonb_build_array(jsonb_build_object('name', pra_contact_person))
    ELSE '[]'::jsonb
  END,
  office_heads = CASE 
    WHEN office_head IS NOT NULL AND office_head != '' 
    THEN jsonb_build_array(jsonb_build_object('name', office_head))
    ELSE '[]'::jsonb
  END
WHERE pra_contact_persons IS NULL OR office_heads IS NULL;

-- Make the new columns NOT NULL after migration
ALTER TABLE pra_contacts ALTER COLUMN pra_contact_persons SET NOT NULL;
ALTER TABLE pra_contacts ALTER COLUMN office_heads SET NOT NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pra_contacts_contact_persons ON pra_contacts USING GIN (pra_contact_persons);
CREATE INDEX IF NOT EXISTS idx_pra_contacts_office_heads ON pra_contacts USING GIN (office_heads);

