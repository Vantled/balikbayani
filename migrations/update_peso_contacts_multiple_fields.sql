-- Migration: Update PESO contacts to support multiple emails and contacts
-- This migration adds support for multiple emails and contacts like the PRAS contacts table

-- Add new columns for multiple emails and contacts
ALTER TABLE peso_contacts ADD COLUMN IF NOT EXISTS emails JSONB DEFAULT '[]'::jsonb;
ALTER TABLE peso_contacts ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb;

-- Migrate existing data to new format
UPDATE peso_contacts 
SET 
  emails = CASE 
    WHEN email IS NOT NULL AND email != '' 
    THEN jsonb_build_array(jsonb_build_object('email_address', email))
    ELSE '[]'::jsonb
  END,
  contacts = CASE 
    WHEN contact_number IS NOT NULL AND contact_number != '' 
    THEN jsonb_build_array(jsonb_build_object('contact_category', 'Mobile No.', 'contact_number', contact_number))
    ELSE '[]'::jsonb
  END
WHERE emails IS NULL OR contacts IS NULL;

-- Make the new columns NOT NULL after migration
ALTER TABLE peso_contacts ALTER COLUMN emails SET NOT NULL;
ALTER TABLE peso_contacts ALTER COLUMN contacts SET NOT NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_peso_contacts_emails ON peso_contacts USING GIN (emails);
CREATE INDEX IF NOT EXISTS idx_peso_contacts_contacts ON peso_contacts USING GIN (contacts);

-- Update the updated_at trigger to include the new columns
DROP TRIGGER IF EXISTS update_peso_contacts_updated_at ON peso_contacts;
CREATE TRIGGER update_peso_contacts_updated_at 
  BEFORE UPDATE ON peso_contacts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
