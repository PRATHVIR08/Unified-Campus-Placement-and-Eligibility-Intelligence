-- ==============================================================================
-- Database Constraint Verification Tests [P3]
-- Description: Intentionally invalid statements that MUST FAIL to confirm DB integrity.
-- ==============================================================================

-- TEST 1: Invalid CGPA (> 10.00) must fail check constraint
-- EXPECTED: ERROR: new row for relation "students" violates check constraint "students_cgpa_check"
INSERT INTO students (id, roll_number, first_name, last_name, department, batch_year, cgpa, active_backlogs)
VALUES ('b0000000-0000-0000-0000-000000000099', 'TEST_FAIL_01', 'Fail', 'Student', 'Computer Science', 2025, 11.50, 0);

-- TEST 2: Negative Backlog Count must fail check constraint
-- EXPECTED: ERROR: new row for relation "students" violates check constraint "students_active_backlogs_check"
INSERT INTO students (id, roll_number, first_name, last_name, department, batch_year, cgpa, active_backlogs)
VALUES ('b0000000-0000-0000-0000-000000000098', 'TEST_FAIL_02', 'Fail', 'Student', 'Computer Science', 2025, 8.00, -2);

-- TEST 3: Duplicate Application (Same student applying twice to same drive)
-- EXPECTED: ERROR: duplicate key value violates unique constraint "unique_student_drive_application"
INSERT INTO applications (student_id, drive_id, status)
VALUES ('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'applied');
-- (Running again for same IDs will fail due to unique constraint)

-- TEST 4: Negative or Zero CTC in Job Drive
-- EXPECTED: ERROR: new row for relation "job_drives" violates check constraint "job_drives_ctc_annual_check"
INSERT INTO job_drives (company_id, title, ctc_annual, application_deadline)
VALUES ('c0000000-0000-0000-0000-000000000001', 'Invalid CTC Job', -50000.00, NOW() + INTERVAL '1 day');

-- TEST 5: Duplicate USN
-- EXPECTED: unique_violation from profiles.usn.
INSERT INTO profiles (id, full_name, email, usn, role)
VALUES (
  'b0000000-0000-0000-0000-000000000099',
  'Duplicate USN Test',
  'duplicate-usn-test@example.invalid',
  'CS2024001',
  'STUDENT'
);

-- TEST 6: Unsupported application status
-- EXPECTED: check_violation from applications_status_check.
INSERT INTO applications (student_id, drive_id, status)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000002',
  'not_a_status'
);

-- TEST 7: Interview round for a missing application
-- EXPECTED: foreign_key_violation from interview_rounds_application_id_fkey.
INSERT INTO interview_rounds
  (drive_id, application_id, round_order, round_number, name, round_type)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  999999,
  999999,
  'Missing Application Test',
  'technical'
);

-- TEST 8: Offer for a missing application
-- EXPECTED: foreign_key_violation from offers_application_id_fkey.
INSERT INTO offers (application_id, student_id, ctc, ctc_offered, status)
VALUES (
  'f0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000001',
  100000,
  100000,
  'offered'
);

-- TEST 9: Second offer for the same application
-- EXPECTED: unique_violation from offers_application_id_key.
-- Requires at least one existing offer row.
INSERT INTO offers (application_id, student_id, ctc, ctc_offered, status)
SELECT application_id, student_id, 100000, 100000, 'offered'
FROM offers
LIMIT 1;
