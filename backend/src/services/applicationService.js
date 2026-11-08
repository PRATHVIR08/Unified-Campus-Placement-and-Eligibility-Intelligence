const db = require('../db/pool');
const AppError = require('../utils/AppError');
const { evaluateEligibility } = require('./eligibilityService');

function isDriveOpen(drive, now = new Date()) {
  return Boolean(
    drive && drive.status === 'active' &&
    new Date(drive.application_deadline).getTime() > now.getTime()
  );
}

function isValidStatusTransition(currentStatus, nextStatus, actorRole = 'officer') {
  if (actorRole === 'student') {
    return nextStatus === 'withdrawn' &&
      ['applied', 'shortlisted'].includes(currentStatus);
  }
  const transitions = {
    applied: ['shortlisted', 'rejected'],
    shortlisted: ['selected', 'rejected'],
    in_interview: ['selected', 'rejected'],
  };
  return ['officer', 'admin', 'recruiter'].includes(actorRole) &&
    (transitions[currentStatus] || []).includes(nextStatus);
}

async function applyToDrive(driveId, studentUserId) {
  try {
    return await db.withTransaction(async (client) => {
      const driveResult = await client.query(
        `SELECT id, status, application_deadline
         FROM job_drives WHERE id = $1 FOR UPDATE`,
        [driveId]
      );
      const drive = driveResult.rows[0];
      if (!drive) throw new AppError(404, 'Job drive not found');
      if (drive.status !== 'active') throw new AppError(422, 'Drive is not open for applications');
      if (!isDriveOpen(drive)) {
        throw new AppError(422, 'Deadline has passed');
      }

      const recordResult = await client.query(
        `SELECT s.id AS student_id,
           COALESCE(ar.cgpa, s.cgpa) AS cgpa,
           COALESCE(ar.department, s.department) AS department,
           COALESCE(ar.backlogs, s.backlogs, s.active_backlogs) AS backlogs,
           COALESCE(ar.graduation_year, s.graduation_year, s.batch_year) AS graduation_year
         FROM students s
         LEFT JOIN academic_records ar ON ar.student_id = s.id
         WHERE s.user_id = $1
         FOR UPDATE OF s`,
        [studentUserId]
      );
      const record = recordResult.rows[0];
      if (!record) throw new AppError(422, 'Academic record incomplete');

      const rulesResult = await client.query(
        `SELECT field_name, operator, value, mandatory
         FROM eligibility_rules WHERE job_drive_id = $1 ORDER BY created_at, id`,
        [driveId]
      );
      const eligibility = evaluateEligibility(record, rulesResult.rows);
      if (!eligibility.eligible) {
        throw new AppError(422, 'Student is not eligible', { reasons: eligibility.reasons });
      }

      const inserted = await client.query(
        `INSERT INTO applications (student_id, drive_id, status)
         VALUES ($1, $2, 'applied')
         RETURNING id, student_id, drive_id, status, applied_at`,
        [record.student_id, driveId]
      );
      return inserted.rows[0];
    });
  } catch (error) {
    if (error.code === '23505') throw new AppError(409, 'Already applied to this drive');
    throw error;
  }
}

async function transitionApplicationStatus(applicationId, nextStatus, user) {
  const normalizedNextStatus = typeof nextStatus === 'string' ? nextStatus.toLowerCase() : '';
  return db.withTransaction(async (client) => {
    const found = await client.query(
      `SELECT a.id, a.student_id, a.drive_id, a.status, c.owner_id, s.user_id
       FROM applications a
       JOIN job_drives d ON d.id = a.drive_id
       JOIN companies c ON c.id = d.company_id
       JOIN students s ON s.id = a.student_id
       WHERE a.id = $1 FOR UPDATE OF a`,
      [applicationId]
    );
    const application = found.rows[0];
    if (!application) throw new AppError(404, 'Application not found');
    if (user.role === 'student' && application.user_id !== user.id) {
      throw new AppError(403, 'Students may change only their own applications');
    }
    if (user.role === 'student' && normalizedNextStatus !== 'withdrawn') {
      throw new AppError(403, 'Students may only withdraw their own applications');
    }
    if (!['student', 'officer', 'admin', 'recruiter'].includes(user.role)) {
      throw new AppError(403, 'Role is not allowed to change application status');
    }
    if (user.role === 'recruiter' && application.owner_id !== user.id) {
      throw new AppError(403, 'Recruiters may manage applications only for their own drives');
    }
    if (!isValidStatusTransition(application.status, normalizedNextStatus, user.role)) {
      throw new AppError(422, `Cannot change application status from ${application.status} to ${normalizedNextStatus}`);
    }
    if (normalizedNextStatus === 'selected') {
      const rounds = await client.query(
        `SELECT COUNT(r.id)::INTEGER AS total,
           COUNT(r.id) FILTER (WHERE p.cleared IS TRUE)::INTEGER AS passed
         FROM interview_rounds r
         LEFT JOIN interview_participants p
           ON p.round_id = r.id AND p.application_id = $1
         WHERE r.application_id = $1`,
        [applicationId]
      );
      if (rounds.rows[0].total > 0 && rounds.rows[0].passed !== rounds.rows[0].total) {
        throw new AppError(422, 'An application can be selected only after every interview round has passed');
      }
    }
    const result = await client.query(
      `UPDATE applications SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING id, student_id, drive_id, status, applied_at, updated_at`,
      [normalizedNextStatus, applicationId]
    );
    return result.rows[0];
  });
}

async function listMyApplications(studentUserId) {
  const result = await db.query(
    `SELECT a.id, a.status, a.applied_at, d.id AS drive_id, d.title AS drive_title,
       d.role_type, d.package_lpa, d.location, d.work_mode, d.application_deadline,
       c.id AS company_id, c.name AS company_name
     FROM applications a
     JOIN students s ON s.id = a.student_id
     JOIN job_drives d ON d.id = a.drive_id
     JOIN companies c ON c.id = d.company_id
     WHERE s.user_id = $1 ORDER BY a.applied_at DESC`,
    [studentUserId]
  );
  return result.rows.map((row) => ({
    ...row,
    driveTitle: row.drive_title,
    companyName: row.company_name,
    ctcAnnual: row.package_lpa == null ? null : Number(row.package_lpa) * 100000,
  }));
}

module.exports = {
  isDriveOpen,
  isValidStatusTransition,
  applyToDrive,
  listMyApplications,
  transitionApplicationStatus,
};
