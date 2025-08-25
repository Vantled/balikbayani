-- Add is_first_login column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT false;

-- Update existing users to have is_first_login = false
UPDATE users SET is_first_login = false WHERE is_first_login IS NULL;
