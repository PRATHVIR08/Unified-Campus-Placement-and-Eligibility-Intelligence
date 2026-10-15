-- ==============================================================================
-- Placement Officer Report Queries [P3]
-- Description: Core queries powering reports and dashboards.
-- ==============================================================================

-- 1. Department Placement Rate & Package Breakdown
SELECT 
    department,
    total_students,
    placed_students,
    placement_percentage,
    average_ctc,
    highest_ctc
FROM view_department_placement_stats
ORDER BY placement_percentage DESC;

-- 2. Ongoing Drive Funnel Status
SELECT 
    drive_id,
    drive_title,
    company_name,
    total_applicants,
    shortlisted_count,
    interview_count,
    offers_released,
    offers_accepted
FROM view_drive_conversion_metrics
ORDER BY total_applicants DESC;

-- 3. Unplaced High-Performing Students (CGPA >= 8.0, 0 Backlogs)
SELECT 
    s.roll_number,
    s.first_name || ' ' || s.last_name AS student_name,
    s.department,
    s.cgpa
FROM students s
LEFT JOIN offers o ON s.id = o.student_id AND o.is_accepted = TRUE
WHERE s.cgpa >= 8.00 
  AND s.active_backlogs = 0
  AND o.id IS NULL
ORDER BY s.cgpa DESC;
