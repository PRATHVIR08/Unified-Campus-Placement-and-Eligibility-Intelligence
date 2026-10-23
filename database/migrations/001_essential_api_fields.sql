-- Additive migration for the essential API fields missing from older installs.
-- Safe to run more than once; does not drop or reset data.
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'withdrawn';

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS degree VARCHAR(100);

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);

-- Supabase Auth owns passwords. Keep the local hash nullable for Supabase users.
ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL;

-- New students complete academic data in their profile before applying.
ALTER TABLE students
  ALTER COLUMN department DROP NOT NULL,
  ALTER COLUMN batch_year DROP NOT NULL,
  ALTER COLUMN cgpa DROP NOT NULL,
  ALTER COLUMN active_backlogs DROP NOT NULL;
