-- Align the existing schema with Supabase identities without deleting legacy
-- users or changing application rows.
BEGIN;

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  usn TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'STUDENT'
    CHECK (role IN ('STUDENT', 'OFFICER', 'RECRUITER', 'ADMIN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Preserve the old password-backed accounts as profile records. The users
-- table remains intact for audit/legacy data; Supabase Auth is used by the API.
INSERT INTO profiles (id, full_name, email, usn, role)
SELECT u.id,
       COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', s.first_name, s.last_name)), ''), u.email),
       u.email,
       s.roll_number,
       CASE u.role::TEXT
         WHEN 'officer' THEN 'OFFICER'
         WHEN 'admin' THEN 'ADMIN'
         ELSE 'STUDENT'
       END
FROM users u
LEFT JOIN students s ON s.id = u.id
ON CONFLICT (id) DO NOTHING;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS graduation_year INTEGER,
  ADD COLUMN IF NOT EXISTS backlogs INTEGER;

ALTER TABLE students ALTER COLUMN roll_number DROP NOT NULL;

UPDATE students
SET user_id = id,
    graduation_year = COALESCE(graduation_year, batch_year),
    backlogs = COALESCE(backlogs, active_backlogs)
WHERE user_id IS NULL OR graduation_year IS NULL OR backlogs IS NULL;

ALTER TABLE students ALTER COLUMN user_id SET NOT NULL;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'students'::regclass
      AND conname = 'students_user_id_key'
  ) THEN
    ALTER TABLE students ADD CONSTRAINT students_user_id_key UNIQUE (user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'students'::regclass
      AND conname = 'students_user_id_fkey'
  ) THEN
    ALTER TABLE students ADD CONSTRAINT students_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'students'::regclass
      AND conname = 'students_id_fkey'
  ) THEN
    ALTER TABLE students DROP CONSTRAINT students_id_fkey;
  END IF;
END
$migration$;

CREATE TABLE IF NOT EXISTS academic_records (
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  department TEXT,
  degree TEXT,
  cgpa NUMERIC(4, 2) CHECK (cgpa BETWEEN 0 AND 10),
  graduation_year INTEGER,
  backlogs INTEGER CHECK (backlogs >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO academic_records (student_id, department, degree, cgpa, graduation_year, backlogs)
SELECT id, department, degree, cgpa, graduation_year, backlogs
FROM students
ON CONFLICT (student_id) DO NOTHING;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE job_drives
  ADD COLUMN IF NOT EXISTS role_type TEXT,
  ADD COLUMN IF NOT EXISTS package_lpa NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS work_mode TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID;

UPDATE job_drives
SET package_lpa = COALESCE(package_lpa, ctc_annual / 100000),
    location = COALESCE(location, job_location)
WHERE package_lpa IS NULL OR location IS NULL;

ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS offered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ctc NUMERIC(12, 2);

UPDATE offers
SET offered_at = COALESCE(offered_at, created_at),
    ctc = COALESCE(ctc, ctc_offered)
WHERE offered_at IS NULL OR ctc IS NULL;

ALTER TABLE interview_rounds
  ADD COLUMN IF NOT EXISTS application_id UUID,
  ADD COLUMN IF NOT EXISTS round_number INTEGER;

UPDATE interview_rounds
SET round_number = COALESCE(round_number, round_order)
WHERE round_number IS NULL;

ALTER TABLE interview_rounds DROP CONSTRAINT IF EXISTS unique_drive_round_order;

-- This view depends on the legacy enum-typed status column.
DROP VIEW IF EXISTS view_drive_conversion_metrics;

CREATE TABLE IF NOT EXISTS eligibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_drive_id UUID NOT NULL REFERENCES job_drives(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL CHECK (field_name IN ('cgpa', 'department', 'backlogs', 'graduation_year')),
  operator TEXT NOT NULL CHECK (operator IN ('>=', '<=', '>', '<', '=', 'IN')),
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $migration$
DECLARE
  constraint_row RECORD;
BEGIN
  -- The old status is a PostgreSQL enum. Cast to text so the additive CHECK
  -- can include the existing workflow plus the new selected state.
  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'applications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE applications DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;

  ALTER TABLE applications ALTER COLUMN status DROP DEFAULT;
  ALTER TABLE applications ALTER COLUMN status TYPE TEXT USING status::TEXT;
  ALTER TABLE applications ALTER COLUMN status SET DEFAULT 'applied';

  -- Explicitly inspect existing values before installing the status constraint.
  IF EXISTS (
    SELECT DISTINCT status
    FROM applications
    WHERE status NOT IN (
      'applied', 'shortlisted', 'in_interview', 'selected',
      'offered', 'accepted', 'rejected', 'withdrawn'
    )
  ) THEN
    RAISE EXCEPTION 'Existing application status is outside the supported lowercase status set';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'applications'::regclass
      AND conname = 'applications_status_check'
  ) THEN
    ALTER TABLE applications ADD CONSTRAINT applications_status_check
      CHECK (status IN (
        'applied', 'shortlisted', 'in_interview', 'selected',
        'offered', 'accepted', 'rejected', 'withdrawn'
      ));
  END IF;
END
$migration$;

DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'applications'::regclass AND conname = 'unique_student_drive_application') THEN
    ALTER TABLE applications ADD CONSTRAINT unique_student_drive_application UNIQUE (student_id, drive_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'offers'::regclass AND conname = 'offers_application_id_key') THEN
    ALTER TABLE offers ADD CONSTRAINT offers_application_id_key UNIQUE (application_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'interview_rounds'::regclass AND conname = 'unique_application_round_number') THEN
    ALTER TABLE interview_rounds ADD CONSTRAINT unique_application_round_number UNIQUE (application_id, round_number);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'students'::regclass AND conname = 'students_cgpa_range_check') THEN
    ALTER TABLE students ADD CONSTRAINT students_cgpa_range_check CHECK (cgpa BETWEEN 0 AND 10);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'students'::regclass AND conname = 'students_backlogs_nonnegative_check') THEN
    ALTER TABLE students ADD CONSTRAINT students_backlogs_nonnegative_check CHECK (backlogs >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'academic_records'::regclass AND conname = 'academic_records_cgpa_range_check') THEN
    ALTER TABLE academic_records ADD CONSTRAINT academic_records_cgpa_range_check CHECK (cgpa BETWEEN 0 AND 10);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'academic_records'::regclass AND conname = 'academic_records_backlogs_nonnegative_check') THEN
    ALTER TABLE academic_records ADD CONSTRAINT academic_records_backlogs_nonnegative_check CHECK (backlogs >= 0);
  END IF;
END
$migration$;

-- Replace legacy foreign keys where delete behavior must be explicit. Drives
-- with applications are protected by RESTRICT; dependent records cascade.
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_owner_id_fkey;
ALTER TABLE companies ADD CONSTRAINT companies_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE job_drives DROP CONSTRAINT IF EXISTS job_drives_company_id_fkey;
ALTER TABLE job_drives ADD CONSTRAINT job_drives_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE job_drives DROP CONSTRAINT IF EXISTS job_drives_created_by_fkey;
ALTER TABLE job_drives ADD CONSTRAINT job_drives_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_student_id_fkey;
ALTER TABLE applications ADD CONSTRAINT applications_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_drive_id_fkey;
ALTER TABLE applications ADD CONSTRAINT applications_drive_id_fkey
  FOREIGN KEY (drive_id) REFERENCES job_drives(id) ON DELETE RESTRICT;

ALTER TABLE interview_rounds DROP CONSTRAINT IF EXISTS interview_rounds_drive_id_fkey;
ALTER TABLE interview_rounds ADD CONSTRAINT interview_rounds_drive_id_fkey
  FOREIGN KEY (drive_id) REFERENCES job_drives(id) ON DELETE RESTRICT;
ALTER TABLE interview_rounds DROP CONSTRAINT IF EXISTS interview_rounds_application_id_fkey;
ALTER TABLE interview_rounds ADD CONSTRAINT interview_rounds_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;

ALTER TABLE interview_participants DROP CONSTRAINT IF EXISTS interview_participants_round_id_fkey;
ALTER TABLE interview_participants ADD CONSTRAINT interview_participants_round_id_fkey
  FOREIGN KEY (round_id) REFERENCES interview_rounds(id) ON DELETE CASCADE;
ALTER TABLE interview_participants DROP CONSTRAINT IF EXISTS interview_participants_application_id_fkey;
ALTER TABLE interview_participants ADD CONSTRAINT interview_participants_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;

ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_application_id_fkey;
ALTER TABLE offers ADD CONSTRAINT offers_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_student_id_fkey;
ALTER TABLE offers ADD CONSTRAINT offers_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

CREATE OR REPLACE VIEW view_department_placement_stats AS
SELECT s.department,
       COUNT(DISTINCT s.id) AS total_students,
       COUNT(DISTINCT s.id) FILTER (
         WHERE EXISTS (
           SELECT 1 FROM applications a
           WHERE a.student_id = s.id AND a.status = 'accepted'
         )
       ) AS placed_students,
       ROUND(
         COUNT(DISTINCT s.id) FILTER (
           WHERE EXISTS (
             SELECT 1 FROM applications a
             WHERE a.student_id = s.id AND a.status = 'accepted'
           )
         )::NUMERIC / NULLIF(COUNT(DISTINCT s.id), 0) * 100,
         2
       ) AS placement_percentage,
       ROUND(AVG(o.ctc_offered), 2) AS average_ctc,
       MAX(o.ctc_offered) AS highest_ctc
FROM students s
LEFT JOIN offers o ON o.student_id = s.id AND o.is_accepted IS TRUE
GROUP BY s.department;

CREATE OR REPLACE VIEW view_drive_conversion_metrics AS
SELECT d.id AS drive_id,
       d.title AS drive_title,
       c.name AS company_name,
       COUNT(DISTINCT a.id) AS total_applicants,
       COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'shortlisted') AS shortlisted_count,
       COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'in_interview') AS interview_count,
       COUNT(DISTINCT o.id) AS offers_released,
       COUNT(DISTINCT o.id) FILTER (WHERE a.status = 'accepted') AS offers_accepted
FROM job_drives d
JOIN companies c ON c.id = d.company_id
LEFT JOIN applications a ON a.drive_id = d.id
LEFT JOIN offers o ON o.application_id = a.id
GROUP BY d.id, d.title, c.name;

COMMIT;
