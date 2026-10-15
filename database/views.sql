-- ==============================================================================
-- Analytical Views: Unified Campus Placement and Eligibility Intelligence [P3]
-- Description: Standard SQL views providing placement metrics and reporting aggregates.
-- ==============================================================================

-- 1. DEPARTMENT-WISE PLACEMENT SUMMARY
CREATE OR REPLACE VIEW view_department_placement_stats AS
SELECT 
    s.department,
    COUNT(DISTINCT s.id) AS total_students,
    COUNT(DISTINCT o.student_id) AS placed_students,
    ROUND((COUNT(DISTINCT o.student_id)::NUMERIC / NULLIF(COUNT(DISTINCT s.id), 0)) * 100, 2) AS placement_percentage,
    ROUND(AVG(o.ctc_offered), 2) AS average_ctc,
    MAX(o.ctc_offered) AS highest_ctc
FROM students s
LEFT JOIN offers o ON s.id = o.student_id AND o.is_accepted = TRUE
GROUP BY s.department;

-- 2. DRIVE PARTICIPATION & CONVERSION METRICS
CREATE OR REPLACE VIEW view_drive_conversion_metrics AS
SELECT 
    jd.id AS drive_id,
    jd.title AS drive_title,
    c.name AS company_name,
    COUNT(DISTINCT a.id) AS total_applicants,
    COUNT(DISTINCT CASE WHEN a.status = 'shortlisted' THEN a.id END) AS shortlisted_count,
    COUNT(DISTINCT CASE WHEN a.status = 'in_interview' THEN a.id END) AS interview_count,
    COUNT(DISTINCT o.id) AS offers_released,
    COUNT(DISTINCT CASE WHEN o.is_accepted = TRUE THEN o.id END) AS offers_accepted
FROM job_drives jd
JOIN companies c ON jd.company_id = c.id
LEFT JOIN applications a ON jd.id = a.drive_id
LEFT JOIN offers o ON a.id = o.application_id
GROUP BY jd.id, jd.title, c.name;

-- 3. STUDENT ELIGIBILITY OVERVIEW
CREATE OR REPLACE VIEW view_student_academic_summary AS
SELECT 
    s.id AS student_id,
    s.roll_number,
    s.first_name || ' ' || s.last_name AS full_name,
    s.department,
    s.cgpa,
    s.active_backlogs,
    CASE 
        WHEN s.active_backlogs = 0 AND s.cgpa >= 7.5 THEN 'Tier 1 Eligible'
        WHEN s.active_backlogs <= 1 AND s.cgpa >= 6.0 THEN 'Tier 2 Eligible'
        ELSE 'Limited Eligibility'
    END AS eligibility_band,
    COUNT(o.id) AS offer_count
FROM students s
LEFT JOIN offers o ON s.id = o.student_id
GROUP BY s.id, s.roll_number, s.first_name, s.last_name, s.department, s.cgpa, s.active_backlogs;
