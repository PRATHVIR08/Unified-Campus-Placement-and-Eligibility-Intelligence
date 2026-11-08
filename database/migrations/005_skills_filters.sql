CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  CONSTRAINT skills_name_lowercase CHECK (name = LOWER(BTRIM(name)))
);

CREATE TABLE IF NOT EXISTS drive_skills (
  drive_id UUID NOT NULL REFERENCES job_drives(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
  PRIMARY KEY (drive_id, skill_id)
);

CREATE TABLE IF NOT EXISTS student_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (BTRIM(name) <> ''),
  filter_json JSONB NOT NULL CHECK (jsonb_typeof(filter_json) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_filters_owner ON student_filters(student_id);
