const db = require('../db/pool');

const REPORT_VIEWS = Object.freeze({
  'placement-summary': 'v_placement_summary',
  'department-placement': 'v_department_placement',
  'drive-funnel': 'v_drive_funnel',
  'upcoming-deadlines': 'v_upcoming_deadlines',
});

const REPORT_COLUMNS = Object.freeze({
  'placement-summary': [
    'total_students', 'applied', 'shortlisted', 'selected', 'accepted_offers', 'placement_rate',
  ],
  'department-placement': [
    'department', 'graduation_year', 'total_students', 'applications', 'placed_students', 'placement_rate',
  ],
  'drive-funnel': [
    'drive_id', 'drive_title', 'company_name', 'applied', 'shortlisted', 'selected', 'offers',
  ],
  'upcoming-deadlines': [
    'drive_id', 'drive_title', 'company_name', 'application_deadline',
  ],
});

async function getReport(name) {
  const view = REPORT_VIEWS[name];
  if (!view) {
    const AppError = require('../utils/AppError');
    throw new AppError(404, 'Report not found');
  }
  const result = await db.query(`SELECT * FROM ${view}`);
  return result.rows;
}

async function getDepartmentSummary() {
  const result = await db.query(
    `WITH student_departments AS (
       SELECT s.id AS student_id,
         COALESCE(NULLIF(BTRIM(ar.department), ''), NULLIF(BTRIM(s.department), ''), 'Unassigned') AS department
       FROM students s
       LEFT JOIN academic_records ar ON ar.student_id = s.id
     ),
     department_totals AS (
       SELECT department, COUNT(*)::INTEGER AS total_students
       FROM student_departments
       GROUP BY department
     ),
     applicant_totals AS (
       SELECT sd.department, COUNT(DISTINCT a.id)::INTEGER AS applicants
       FROM student_departments sd
       JOIN applications a ON a.student_id = sd.student_id
       GROUP BY sd.department
     ),
     placement_totals AS (
       SELECT sd.department,
         COUNT(DISTINCT o.student_id)::INTEGER AS placed,
         ROUND(AVG(o.ctc)::NUMERIC, 2)::DOUBLE PRECISION AS avg_ctc,
         MAX(o.ctc)::DOUBLE PRECISION AS highest_ctc
       FROM student_departments sd
       JOIN offers o ON o.student_id = sd.student_id
       WHERE o.is_accepted IS TRUE
       GROUP BY sd.department
     )
     SELECT totals.department, totals.total_students,
       COALESCE(applicants.applicants, 0)::INTEGER AS applicants,
       COALESCE(placements.placed, 0)::INTEGER AS placed,
       ROUND(
         COALESCE(placements.placed, 0)::NUMERIC /
           NULLIF(totals.total_students, 0) * 100,
         2
       )::DOUBLE PRECISION AS placement_percentage,
       placements.avg_ctc,
       placements.highest_ctc
     FROM department_totals totals
     LEFT JOIN applicant_totals applicants ON applicants.department = totals.department
     LEFT JOIN placement_totals placements ON placements.department = totals.department
     ORDER BY totals.department`
  );
  return result.rows.map((row) => ({
    ...row,
    total_students: Number(row.total_students),
    applicants: Number(row.applicants),
    placed: Number(row.placed),
    placement_percentage: row.placement_percentage == null ? null : Number(row.placement_percentage),
    avg_ctc: row.avg_ctc == null ? null : Number(row.avg_ctc),
    highest_ctc: row.highest_ctc == null ? null : Number(row.highest_ctc),
  }));
}

async function getFunnelMetrics() {
  const result = await db.query(
    `SELECT d.id AS drive_id, d.title AS drive_title, c.name AS company_name,
       COUNT(DISTINCT a.id)::INTEGER AS total_applicants,
       COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'shortlisted')::INTEGER AS shortlisted_count,
       COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'in_interview')::INTEGER AS interview_count,
       COUNT(DISTINCT o.id)::INTEGER AS offers_released,
       COUNT(DISTINCT o.id) FILTER (WHERE o.is_accepted IS TRUE)::INTEGER AS offers_accepted
     FROM job_drives d
     JOIN companies c ON c.id = d.company_id
     LEFT JOIN applications a ON a.drive_id = d.id
     LEFT JOIN offers o ON o.application_id = a.id
     GROUP BY d.id, d.title, c.name
     ORDER BY total_applicants DESC, d.title`
  );
  return result.rows.map((row) => ({
    ...row,
    total_applicants: Number(row.total_applicants),
    shortlisted_count: Number(row.shortlisted_count),
    interview_count: Number(row.interview_count),
    offers_released: Number(row.offers_released),
    offers_accepted: Number(row.offers_accepted),
  }));
}

module.exports = {
  getReport,
  getDepartmentSummary,
  getFunnelMetrics,
  REPORT_VIEWS,
  REPORT_COLUMNS,
};
