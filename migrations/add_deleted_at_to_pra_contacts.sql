-- Migration: Add deleted_at column to pra_contacts table for soft delete support

-- Add deleted_at column
ALTER TABLE pra_contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better performance on soft delete queries
CREATE INDEX IF NOT EXISTS idx_pra_contacts_deleted_at ON pra_contacts(deleted_at);

-- Update the updated_at trigger to include the new column
DROP TRIGGER IF EXISTS update_pra_contacts_updated_at ON pra_contacts;
CREATE TRIGGER update_pra_contacts_updated_at 
  BEFORE UPDATE ON pra_contacts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
