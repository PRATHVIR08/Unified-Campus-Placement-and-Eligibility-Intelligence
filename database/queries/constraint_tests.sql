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
