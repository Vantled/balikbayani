-- Add first_name, middle_name, and last_name columns to users table
-- This allows proper storage and retrieval of names without parsing full_name

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Backfill existing records by parsing full_name
-- This handles existing users who only have full_name
UPDATE users
SET 
  first_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' THEN
      SPLIT_PART(TRIM(full_name), ' ', 1)
    ELSE NULL
  END,
  last_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' AND array_length(string_to_array(TRIM(full_name), ' '), 1) > 1 THEN
      SPLIT_PART(TRIM(full_name), ' ', array_length(string_to_array(TRIM(full_name), ' '), 1))
    ELSE NULL
  END,
  middle_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' AND array_length(string_to_array(TRIM(full_name), ' '), 1) > 2 THEN
      array_to_string(
        (SELECT array_agg(part) FROM unnest(string_to_array(TRIM(full_name), ' ')) WITH ORDINALITY AS t(part, idx) 
         WHERE idx > 1 AND idx < array_length(string_to_array(TRIM(full_name), ' '), 1)),
        ' '
      )
    ELSE NULL
  END
WHERE first_name IS NULL OR last_name IS NULL;

