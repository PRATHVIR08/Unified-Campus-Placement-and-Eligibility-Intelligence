-- Add interview outcomes and normalized offer statuses without removing
-- legacy attendance/result columns or existing offer data.
ALTER TABLE interview_rounds
  ADD COLUMN IF NOT EXISTS result TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS feedback TEXT,
  ADD COLUMN IF NOT EXISTS score NUMERIC(6, 2);

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'interview_rounds'::regclass
      AND conname = 'interview_rounds_result_check'
  ) THEN
    ALTER TABLE interview_rounds
      ADD CONSTRAINT interview_rounds_result_check
      CHECK (result IN ('PASSED', 'FAILED', 'PENDING'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'interview_rounds'::regclass
      AND conname = 'interview_rounds_score_check'
  ) THEN
    ALTER TABLE interview_rounds
      ADD CONSTRAINT interview_rounds_score_check CHECK (score BETWEEN 0 AND 100);
  END IF;
END
$migration$;

ALTER TABLE offers ADD COLUMN IF NOT EXISTS status TEXT;
UPDATE offers
SET status = CASE
  WHEN is_accepted IS TRUE THEN 'accepted'
  WHEN is_accepted IS FALSE THEN 'declined'
  ELSE 'offered'
END
WHERE status IS NULL;
ALTER TABLE offers ALTER COLUMN status SET DEFAULT 'offered';
ALTER TABLE offers ALTER COLUMN status SET NOT NULL;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'offers'::regclass AND conname = 'offers_status_check'
  ) THEN
    ALTER TABLE offers
      ADD CONSTRAINT offers_status_check
      CHECK (status IN ('offered', 'accepted', 'declined', 'withdrawn'));
  END IF;
END
$migration$;

-- Placement is defined as a student with at least one ACCEPTED offer.
CREATE OR REPLACE VIEW v_placement_summary AS
SELECT
  (SELECT COUNT(*)::INTEGER FROM students) AS total_students,
  COUNT(DISTINCT a.student_id) FILTER (WHERE a.status = 'applied')::INTEGER AS applied,
  COUNT(DISTINCT a.student_id) FILTER (
    WHERE a.status IN ('shortlisted', 'in_interview')
  )::INTEGER AS shortlisted,
  COUNT(DISTINCT a.student_id) FILTER (WHERE a.status = 'selected')::INTEGER AS selected,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'accepted')::INTEGER AS accepted_offers,
  CASE
    WHEN (SELECT COUNT(*) FROM students) = 0 THEN 0::NUMERIC
    ELSE ROUND(
      COUNT(DISTINCT o.student_id) FILTER (WHERE o.status = 'accepted')::NUMERIC
        / (SELECT COUNT(*) FROM students) * 100,
      2
    )
  END AS placement_rate
FROM applications a
LEFT JOIN offers o ON o.application_id = a.id;

CREATE OR REPLACE VIEW v_department_placement AS
SELECT
  COALESCE(NULLIF(BTRIM(ar.department), ''), NULLIF(BTRIM(s.department), ''), 'Unassigned') AS department,
  COALESCE(ar.graduation_year, s.graduation_year, s.batch_year) AS graduation_year,
  COUNT(DISTINCT s.id)::INTEGER AS total_students,
  COUNT(DISTINCT a.id)::INTEGER AS applications,
  COUNT(DISTINCT o.student_id) FILTER (WHERE o.status = 'accepted')::INTEGER AS placed_students,
  CASE
    WHEN COUNT(DISTINCT s.id) = 0 THEN 0::NUMERIC
    ELSE ROUND(
      COUNT(DISTINCT o.student_id) FILTER (WHERE o.status = 'accepted')::NUMERIC
        / COUNT(DISTINCT s.id) * 100,
      2
    )
  END AS placement_rate
FROM students s
LEFT JOIN academic_records ar ON ar.student_id = s.id
LEFT JOIN applications a ON a.student_id = s.id
LEFT JOIN offers o ON o.application_id = a.id
GROUP BY
  COALESCE(NULLIF(BTRIM(ar.department), ''), NULLIF(BTRIM(s.department), ''), 'Unassigned'),
  COALESCE(ar.graduation_year, s.graduation_year, s.batch_year);

CREATE OR REPLACE VIEW v_drive_funnel AS
SELECT
  d.id AS drive_id,
  d.title AS drive_title,
  c.name AS company_name,
  COUNT(DISTINCT a.id)::INTEGER AS applied,
  COUNT(DISTINCT a.id) FILTER (
    WHERE a.status IN ('shortlisted', 'in_interview', 'selected', 'offered', 'accepted')
       OR EXISTS (SELECT 1 FROM interview_rounds r WHERE r.application_id = a.id)
  )::INTEGER AS shortlisted,
  COUNT(DISTINCT a.id) FILTER (
    WHERE a.status IN ('selected', 'offered', 'accepted')
       OR EXISTS (SELECT 1 FROM offers o WHERE o.application_id = a.id)
  )::INTEGER AS selected,
  COUNT(DISTINCT o.id)::INTEGER AS offers
FROM job_drives d
JOIN companies c ON c.id = d.company_id
LEFT JOIN applications a ON a.drive_id = d.id
LEFT JOIN offers o ON o.application_id = a.id
GROUP BY d.id, d.title, c.name;

CREATE OR REPLACE VIEW v_upcoming_deadlines AS
SELECT d.id AS drive_id, d.title AS drive_title, c.name AS company_name,
       d.application_deadline
FROM job_drives d
JOIN companies c ON c.id = d.company_id
WHERE d.status = 'active' AND d.application_deadline > CURRENT_TIMESTAMP;
