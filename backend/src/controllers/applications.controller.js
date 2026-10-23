const db = require('../db/pool');
const { isDriveOpen, isValidStatusTransition } = require('../services/applicationService');
const { evaluateEligibility } = require('../services/eligibilityService');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

exports.applyToDrive = async (req, res, next) => {
  const driveId = req.body?.driveId;
  if (typeof driveId !== 'string' || !UUID.test(driveId)) return res.status(400).json({ success: false, error: 'A valid driveId is required' });
  try {
    const [studentResult, driveResult] = await Promise.all([
      db.query('SELECT id, department, batch_year, cgpa, active_backlogs FROM students WHERE id = $1', [req.user.id]),
      db.query('SELECT * FROM job_drives WHERE id = $1', [driveId]),
    ]);
    if (!studentResult.rows.length) return res.status(404).json({ success: false, error: 'Student profile not found' });
    if (!driveResult.rows.length) return res.status(404).json({ success: false, error: 'Drive not found' });
    const drive = driveResult.rows[0];
    if (!isDriveOpen(drive)) return res.status(409).json({ success: false, error: 'Drive is closed or past its deadline' });
    const eligibility = evaluateEligibility(studentResult.rows[0], drive);
    if (!eligibility.isEligible) return res.status(403).json({ success: false, error: 'Student is not eligible for this drive', reasons: eligibility.reasons });
    const result = await db.query(
      `INSERT INTO applications (student_id, drive_id) VALUES ($1, $2)
       ON CONFLICT (student_id, drive_id) DO NOTHING
       RETURNING id, student_id, drive_id, status, applied_at`,
      [req.user.id, driveId]
    );
    if (!result.rows.length) return res.status(409).json({ success: false, error: 'Already applied to this drive' });
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) { return next(error); }
};

const applicationSelect = `SELECT a.id, a.student_id, a.drive_id, a.status, a.applied_at,
  d.title AS drive_title, d.ctc_annual, c.name AS company_name
  FROM applications a JOIN job_drives d ON d.id = a.drive_id
  JOIN companies c ON c.id = d.company_id`;

exports.getMyApplications = async (req, res, next) => {
  try {
    const result = await db.query(`${applicationSelect} WHERE a.student_id = $1 ORDER BY a.applied_at DESC`, [req.user.id]);
    return res.json({ success: true, data: result.rows.map((row) => ({ ...row, driveTitle: row.drive_title, companyName: row.company_name, appliedAt: row.applied_at })) });
  } catch (error) { return next(error); }
};

exports.getDriveApplications = async (req, res, next) => {
  if (!UUID.test(req.params.driveId)) return res.status(400).json({ success: false, error: 'Invalid drive id' });
  try {
    const result = await db.query(
      `${applicationSelect} JOIN students s ON s.id = a.student_id WHERE a.drive_id = $1 ORDER BY a.applied_at`,
      [req.params.driveId]
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) { return next(error); }
};

exports.updateStatus = async (req, res, next) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid application id' });
  const { status } = req.body || {};
  const studentWithdraw = req.user.role === 'student' && status === 'withdrawn';
  if (!studentWithdraw && req.user.role !== 'officer') return res.status(403).json({ success: false, error: 'Only officers can change application status' });
  if (!['shortlisted', 'in_interview', 'offered', 'accepted', 'rejected', 'withdrawn'].includes(status)) return res.status(400).json({ success: false, error: 'Invalid application status' });
  try {
    const found = await db.query('SELECT id, student_id, status FROM applications WHERE id = $1', [req.params.id]);
    const application = found.rows[0];
    if (!application || (studentWithdraw && application.student_id !== req.user.id)) return res.status(404).json({ success: false, error: 'Application not found' });
    if (!isValidStatusTransition(application.status, status)) return res.status(409).json({ success: false, error: `Cannot change status from ${application.status} to ${status}` });
    const updated = await db.query('UPDATE applications SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, student_id, drive_id, status, applied_at, updated_at', [status, req.params.id]);
    return res.json({ success: true, data: updated.rows[0] });
  } catch (error) { return next(error); }
};
