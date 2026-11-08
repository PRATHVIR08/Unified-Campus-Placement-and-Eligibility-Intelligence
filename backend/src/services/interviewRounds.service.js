const db = require('../db/pool');
const AppError = require('../utils/AppError');

async function listByDrive(driveId, user) {
  const access = await db.query(
    `SELECT d.id, c.owner_id
     FROM job_drives d JOIN companies c ON c.id = d.company_id
     WHERE d.id = $1`,
    [driveId]
  );
  if (!access.rows.length) throw new AppError(404, 'Job drive not found');
  if (user.role === 'recruiter' && access.rows[0].owner_id !== user.id) {
    throw new AppError(403, 'Recruiters may access rounds only for their own drives');
  }
  const result = await db.query(
    `SELECT r.id, r.drive_id, r.application_id, r.round_number, r.name, r.round_type,
       r.scheduled_at, r.result, r.score, COALESCE(r.feedback, p.feedback) AS feedback,
       p.attended, p.cleared
     FROM interview_rounds r
     LEFT JOIN interview_participants p
       ON p.round_id = r.id AND p.application_id = r.application_id
     WHERE r.drive_id = $1
     ORDER BY r.round_number`,
    [driveId]
  );
  return result.rows;
}

async function listByApplication(applicationId, user) {
  const found = await db.query(
    `SELECT a.id, c.owner_id
     FROM applications a
     JOIN job_drives d ON d.id = a.drive_id
     JOIN companies c ON c.id = d.company_id
     WHERE a.id = $1`,
    [applicationId]
  );
  const application = found.rows[0];
  if (!application) throw new AppError(404, 'Application not found');
  if (user.role === 'recruiter' && application.owner_id !== user.id) {
    throw new AppError(403, 'Recruiters may access rounds only for their own drives');
  }
  const result = await db.query(
    `SELECT id, drive_id, application_id, round_number, name, round_type,
       scheduled_at, result, feedback, score
     FROM interview_rounds
     WHERE application_id = $1
     ORDER BY round_number, id`,
    [applicationId]
  );
  return result.rows;
}

async function createForApplication(applicationId, input, user) {
  try {
    return await db.withTransaction(async (client) => {
      const found = await client.query(
        `SELECT a.id, a.drive_id, a.status, c.owner_id
         FROM applications a
         JOIN job_drives d ON d.id = a.drive_id
         JOIN companies c ON c.id = d.company_id
         WHERE a.id = $1
         FOR UPDATE OF a`,
        [applicationId]
      );
      const application = found.rows[0];
      if (!application) throw new AppError(404, 'Application not found');
      if (user.role === 'recruiter' && application.owner_id !== user.id) {
        throw new AppError(403, 'Recruiters may manage rounds only for their own drives');
      }

      if (application.status === 'applied') {
        await client.query(
          `UPDATE applications SET status = 'shortlisted', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [applicationId]
        );
        application.status = 'shortlisted';
      }
      if (application.status !== 'shortlisted') {
        throw new AppError(422, 'Interview rounds can be added only to shortlisted applications');
      }

      const inserted = await client.query(
        `INSERT INTO interview_rounds
          (drive_id, application_id, round_order, round_number, name, round_type, scheduled_at)
         VALUES ($1, $2, $3, $3, $4, $5, $6)
         RETURNING id, drive_id, application_id, round_number, name, round_type,
           scheduled_at, result, feedback, score`,
        [application.drive_id, applicationId, input.roundNumber, input.name,
          input.roundType, input.scheduledAt || null]
      );
      await client.query(
        'INSERT INTO interview_participants (round_id, application_id) VALUES ($1, $2)',
        [inserted.rows[0].id, applicationId]
      );
      return inserted.rows[0];
    });
  } catch (error) {
    if (error.code === '23505') throw new AppError(409, 'An interview round with this number already exists');
    throw error;
  }
}

async function updateApplicationRound(roundId, input, user) {
  return db.withTransaction(async (client) => {
    const found = await client.query(
      `SELECT r.id, r.application_id, a.status AS application_status, c.owner_id
       FROM interview_rounds r
       JOIN applications a ON a.id = r.application_id
       JOIN job_drives d ON d.id = a.drive_id
       JOIN companies c ON c.id = d.company_id
       WHERE r.id = $1
       FOR UPDATE OF r, a`,
      [roundId]
    );
    const round = found.rows[0];
    if (!round) throw new AppError(404, 'Interview round not found');
    if (user.role === 'recruiter' && round.owner_id !== user.id) {
      throw new AppError(403, 'Recruiters may manage rounds only for their own drives');
    }
    if (['selected', 'offered', 'accepted', 'rejected', 'withdrawn'].includes(round.application_status)) {
      throw new AppError(422, 'Interview rounds cannot be changed for a terminal application');
    }

    const updated = await client.query(
      `UPDATE interview_rounds
       SET result = $1,
         feedback = CASE WHEN $2 THEN $3 ELSE feedback END,
         score = CASE WHEN $4 THEN $5 ELSE score END
       WHERE id = $6
       RETURNING id, drive_id, application_id, round_number, name, round_type,
         scheduled_at, result, feedback, score`,
      [input.result, input.feedback !== undefined, input.feedback ?? null,
        input.score !== undefined, input.score ?? null, roundId]
    );
    await client.query(
      `UPDATE interview_participants
       SET cleared = CASE $1
         WHEN 'PASSED' THEN TRUE
         WHEN 'FAILED' THEN FALSE
         ELSE NULL
       END, feedback = CASE WHEN $2 THEN $3 ELSE feedback END
       WHERE round_id = $4 AND application_id = $5`,
      [input.result, input.feedback !== undefined, input.feedback ?? null,
        roundId, round.application_id]
    );
    if (input.result === 'FAILED') {
      await client.query(
        `UPDATE applications SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [round.application_id]
      );
    }
    return updated.rows[0];
  });
}

async function create(input) {
  return db.withTransaction(async (client) => {
    const found = await client.query(
      'SELECT id, drive_id, status FROM applications WHERE id = $1 FOR UPDATE',
      [input.applicationId]
    );
    const application = found.rows[0];
    if (!application) throw new AppError(404, 'Application not found');
    if (!['shortlisted', 'in_interview'].includes(application.status)) {
      throw new AppError(422, 'Interview rounds can be added only to shortlisted or in_interview applications');
    }

    const inserted = await client.query(
      `INSERT INTO interview_rounds
        (drive_id, application_id, round_order, round_number, name, round_type, scheduled_at)
       VALUES ($1, $2, $3, $3, $4, $5, $6)
       RETURNING id, drive_id, application_id, round_number, name, round_type, scheduled_at`,
      [application.drive_id, input.applicationId, input.roundNumber, input.name,
        input.roundType, input.scheduledAt || null]
    );
    await client.query(
      'INSERT INTO interview_participants (round_id, application_id) VALUES ($1, $2)',
      [inserted.rows[0].id, input.applicationId]
    );
    if (application.status === 'shortlisted') {
      await client.query(
        `UPDATE applications SET status = 'in_interview', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [input.applicationId]
      );
    }
    return inserted.rows[0];
  });
}

async function recordAttendance(input) {
  const result = await db.query(
    `UPDATE interview_participants p SET attended = $1
     FROM interview_rounds r
     WHERE p.round_id = r.id AND p.application_id = $2
       AND p.round_id = $3 AND r.application_id = $2
     RETURNING p.round_id, p.application_id, p.attended, p.cleared`,
    [input.attended, input.applicationId, input.roundId]
  );
  if (!result.rows.length) throw new AppError(404, 'Interview round participant not found');
  return result.rows[0];
}

async function recordResult(input) {
  return db.withTransaction(async (client) => {
    const found = await client.query(
      `SELECT a.id, a.status
       FROM applications a
       JOIN interview_rounds r ON r.application_id = a.id
       WHERE a.id = $1 AND r.id = $2
       FOR UPDATE OF a`,
      [input.applicationId, input.roundId]
    );
    const application = found.rows[0];
    if (!application) throw new AppError(404, 'Interview round participant not found');
    if (application.status !== 'in_interview') {
      throw new AppError(422, 'Interview results can be recorded only while the application is in_interview');
    }

    const updated = await client.query(
      `UPDATE interview_participants SET cleared = $1, feedback = $2
       WHERE round_id = $3 AND application_id = $4
       RETURNING round_id, application_id, attended, cleared, feedback`,
      [input.result === 'passed', input.feedback || null, input.roundId, input.applicationId]
    );
    if (!updated.rows.length) throw new AppError(404, 'Interview round participant not found');
    if (input.result === 'failed') {
      await client.query(
        `UPDATE applications SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [input.applicationId]
      );
    }
    return updated.rows[0];
  });
}

module.exports = {
  listByDrive,
  listByApplication,
  createForApplication,
  updateApplicationRound,
  create,
  recordAttendance,
  recordResult,
};
