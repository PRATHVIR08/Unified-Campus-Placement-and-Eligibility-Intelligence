BEGIN;

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

COMMIT;
