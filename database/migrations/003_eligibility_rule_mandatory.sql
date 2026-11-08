BEGIN;

ALTER TABLE eligibility_rules
  ADD COLUMN IF NOT EXISTS mandatory BOOLEAN NOT NULL DEFAULT TRUE;

INSERT INTO eligibility_rules (job_drive_id, field_name, operator, value, mandatory)
SELECT d.id, 'cgpa', '>=', to_jsonb(d.min_cgpa), TRUE
FROM job_drives d
WHERE d.min_cgpa IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM eligibility_rules r
    WHERE r.job_drive_id = d.id AND r.field_name = 'cgpa'
      AND r.operator = '>=' AND r.value = to_jsonb(d.min_cgpa)
  );

INSERT INTO eligibility_rules (job_drive_id, field_name, operator, value, mandatory)
SELECT d.id, 'backlogs', '<=', to_jsonb(d.max_active_backlogs), TRUE
FROM job_drives d
WHERE d.max_active_backlogs IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM eligibility_rules r
    WHERE r.job_drive_id = d.id AND r.field_name = 'backlogs'
      AND r.operator = '<=' AND r.value = to_jsonb(d.max_active_backlogs)
  );

INSERT INTO eligibility_rules (job_drive_id, field_name, operator, value, mandatory)
SELECT d.id, 'department', 'IN', to_jsonb(array_to_string(d.eligible_departments, ', ')), TRUE
FROM job_drives d
WHERE cardinality(d.eligible_departments) > 0
  AND NOT EXISTS (
    SELECT 1 FROM eligibility_rules r
    WHERE r.job_drive_id = d.id AND r.field_name = 'department'
      AND r.operator = 'IN'
      AND r.value = to_jsonb(array_to_string(d.eligible_departments, ', '))
  );

INSERT INTO eligibility_rules (job_drive_id, field_name, operator, value, mandatory)
SELECT d.id, 'graduation_year', 'IN',
       to_jsonb(array_to_string(d.eligible_batch_years, ', ')), TRUE
FROM job_drives d
WHERE cardinality(d.eligible_batch_years) > 0
  AND NOT EXISTS (
    SELECT 1 FROM eligibility_rules r
    WHERE r.job_drive_id = d.id AND r.field_name = 'graduation_year'
      AND r.operator = 'IN'
      AND r.value = to_jsonb(array_to_string(d.eligible_batch_years, ', '))
  );

COMMIT;
