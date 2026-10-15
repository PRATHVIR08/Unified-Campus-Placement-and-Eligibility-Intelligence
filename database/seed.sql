-- ==============================================================================
-- Seed Data: Unified Campus Placement and Eligibility Intelligence [P3]
-- Description: Baseline mock data for users, students, companies, drives, applications.
-- ==============================================================================

-- 1. SEED USERS & ROLES (Password: 'Password@123' bcrypt hash placeholder)
INSERT INTO users (id, email, password_hash, role) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'officer@campus.edu', '$2b$10$placeholderOfficerHashHere00000000000000000000000000', 'officer'),
    ('b0000000-0000-0000-0000-000000000001', 'student1@campus.edu', '$2b$10$placeholderStudentHashHere0000000000000000000000000', 'student'),
    ('b0000000-0000-0000-0000-000000000002', 'student2@campus.edu', '$2b$10$placeholderStudentHashHere0000000000000000000000000', 'student')
ON CONFLICT (id) DO NOTHING;

-- 2. SEED STUDENTS
INSERT INTO students (id, roll_number, first_name, last_name, department, batch_year, cgpa, tenth_percentage, twelfth_percentage, active_backlogs, total_backlogs_history) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'CS2024001', 'Aarav', 'Sharma', 'Computer Science', 2025, 8.75, 92.50, 89.00, 0, 0),
    ('b0000000-0000-0000-0000-000000000002', 'EC2024045', 'Diya', 'Patel', 'Electronics', 2025, 7.20, 85.00, 82.50, 1, 1)
ON CONFLICT (id) DO NOTHING;

-- 3. SEED COMPANIES
INSERT INTO companies (id, name, website, industry, contact_email) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'TechCorp Systems', 'https://techcorp.example.com', 'Software Engineering', 'recruitment@techcorp.example.com'),
    ('c0000000-0000-0000-0000-000000000002', 'CloudWave Dynamics', 'https://cloudwave.example.com', 'Cloud Services', 'careers@cloudwave.example.com')
ON CONFLICT (id) DO NOTHING;

-- 4. SEED JOB DRIVES
INSERT INTO job_drives (id, company_id, title, role_description, job_location, ctc_annual, min_cgpa, max_active_backlogs, eligible_departments, eligible_batch_years, application_deadline, status) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Software Development Engineer I', 'Backend Node.js & React developer role', 'Bengaluru, India', 1200000.00, 7.50, 0, ARRAY['Computer Science', 'Information Technology'], ARRAY[2025], NOW() + INTERVAL '14 days', 'active'),
    ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'Embedded Systems Engineer', 'Firmware and embedded firmware testing', 'Hyderabad, India', 850000.00, 6.50, 1, ARRAY['Electronics', 'Electrical'], ARRAY[2025], NOW() + INTERVAL '7 days', 'active')
ON CONFLICT (id) DO NOTHING;
