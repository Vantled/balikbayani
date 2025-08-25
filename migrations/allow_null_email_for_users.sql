-- Migration: Allow NULL email for temporary users
-- This migration modifies the users table to allow NULL email values
-- for temporary users who will set their email during first-time setup

-- First, drop the existing unique constraint on email
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- Then, modify the email column to allow NULL values
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Create a unique index that excludes NULL values
CREATE UNIQUE INDEX users_email_unique_idx ON users (email) WHERE email IS NOT NULL;
