BEGIN;

ALTER TABLE job_drives
  ADD COLUMN IF NOT EXISTS role_type TEXT,
  ADD COLUMN IF NOT EXISTS package_lpa NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS work_mode TEXT;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'job_drives'::regclass
      AND conname = 'job_drives_package_lpa_check'
  ) THEN
    ALTER TABLE job_drives
      ADD CONSTRAINT job_drives_package_lpa_check CHECK (package_lpa >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'job_drives'::regclass
      AND conname = 'job_drives_work_mode_check'
  ) THEN
    ALTER TABLE job_drives
      ADD CONSTRAINT job_drives_work_mode_check
      CHECK (work_mode IS NULL OR work_mode IN ('ONSITE', 'REMOTE', 'HYBRID'));
  END IF;
END
$migration$;

UPDATE job_drives
SET package_lpa = COALESCE(package_lpa, ctc_annual / 100000),
    location = COALESCE(location, job_location),
    work_mode = CASE UPPER(BTRIM(work_mode))
      WHEN 'ONSITE' THEN 'ONSITE'
      WHEN 'REMOTE' THEN 'REMOTE'
      WHEN 'HYBRID' THEN 'HYBRID'
      ELSE NULL
    END
WHERE package_lpa IS NULL OR location IS NULL OR work_mode IS NOT NULL;

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  CONSTRAINT skills_name_trimmed UNIQUE (name)
);

CREATE UNIQUE INDEX IF NOT EXISTS skills_name_lower_unique ON skills (LOWER(BTRIM(name)));
CREATE INDEX IF NOT EXISTS idx_drive_skills_skill ON drive_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_job_drives_package_lpa ON job_drives(package_lpa);
CREATE INDEX IF NOT EXISTS idx_job_drives_location_lower ON job_drives(LOWER(location));
CREATE INDEX IF NOT EXISTS idx_job_drives_role_type ON job_drives(role_type);

ALTER TABLE student_filters
  ADD COLUMN IF NOT EXISTS criteria JSONB,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE student_filters
SET criteria = filter_json
WHERE criteria IS NULL;

ALTER TABLE student_filters ALTER COLUMN criteria SET NOT NULL;
ALTER TABLE student_filters
  ADD CONSTRAINT student_filters_name_length
  CHECK (CHAR_LENGTH(BTRIM(name)) BETWEEN 1 AND 40);

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_filters' AND column_name = 'id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_filters' AND column_name = 'filter_id'
  ) THEN
    ALTER TABLE student_filters RENAME COLUMN id TO filter_id;
  END IF;
END
$migration$;

ALTER TABLE student_filters DROP CONSTRAINT IF EXISTS student_filters_student_id_name_key;
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'student_filters'::regclass
      AND conname = 'student_filters_student_id_name_key'
  ) THEN
    ALTER TABLE student_filters
      ADD CONSTRAINT student_filters_student_id_name_key UNIQUE (student_id, name);
  END IF;
END
$migration$;

CREATE UNIQUE INDEX IF NOT EXISTS student_filters_one_default
  ON student_filters(student_id) WHERE is_default;
CREATE INDEX IF NOT EXISTS idx_student_filters_student ON student_filters(student_id);

COMMIT;
