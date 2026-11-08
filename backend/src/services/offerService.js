const db = require('../db/pool');
const AppError = require('../utils/AppError');

async function listForStudent(studentId) {
  const result = await db.query(
    `SELECT o.id, o.application_id, o.student_id, o.ctc, o.offered_at,
       o.offer_letter_url, o.is_accepted, UPPER(o.status) AS status,
       d.title AS drive_title, d.role_type, c.name AS company_name
     FROM offers o
     JOIN applications a ON a.id = o.application_id
     JOIN students s ON s.id = o.student_id
     JOIN job_drives d ON d.id = a.drive_id
     JOIN companies c ON c.id = d.company_id
     WHERE s.user_id = $1
     ORDER BY o.offered_at DESC`,
    [studentId]
  );
  return result.rows;
}

async function listAll() {
  const result = await db.query(
    `SELECT o.id, o.application_id, o.student_id, o.ctc, o.offered_at,
       o.offer_letter_url, o.is_accepted, a.status, d.title AS drive_title,
       c.name AS company_name
     FROM offers o
     JOIN applications a ON a.id = o.application_id
     JOIN job_drives d ON d.id = a.drive_id
     JOIN companies c ON c.id = d.company_id
     ORDER BY o.offered_at DESC`
  );
  return result.rows;
}

async function create(input) {
  return db.withTransaction(async (client) => {
    const found = await client.query(
      'SELECT id, student_id, status FROM applications WHERE id = $1 FOR UPDATE',
      [input.applicationId]
    );
    const application = found.rows[0];
    if (!application) throw new AppError(404, 'Application not found');
    const existingOffer = await client.query(
      'SELECT id FROM offers WHERE application_id = $1',
      [input.applicationId]
    );
    if (existingOffer.rows.length) {
      throw new AppError(409, 'An offer already exists for this application');
    }
    if (application.status !== 'selected') {
      throw new AppError(422, 'An offer can be created only for a selected application');
    }

    const result = await client.query(
      `INSERT INTO offers
        (application_id, student_id, ctc, ctc_offered, offered_at, offer_letter_url)
       VALUES ($1, $2, $3, $3, CURRENT_TIMESTAMP, $4)
       RETURNING id, application_id, student_id, ctc, offered_at, offer_letter_url,
         is_accepted, UPPER(status) AS status`,
      [input.applicationId, application.student_id, input.ctc, input.offerLetterUrl || null]
    );
    const applicationUpdate = await client.query(
      `UPDATE applications SET status = 'offered', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'selected' RETURNING id`,
      [input.applicationId]
    );
    if (!applicationUpdate.rowCount) {
      throw new AppError(409, 'Application status changed before the offer could be issued');
    }
    return result.rows[0];
  });
}

async function createForApplication(applicationId, input) {
  try {
    return await db.withTransaction(async (client) => {
      const found = await client.query(
        'SELECT id, student_id, status FROM applications WHERE id = $1 FOR UPDATE',
        [applicationId]
      );
      const application = found.rows[0];
      if (!application) throw new AppError(404, 'Application not found');
      const existingOffer = await client.query(
        'SELECT id FROM offers WHERE application_id = $1',
        [applicationId]
      );
      if (existingOffer.rows.length) {
        throw new AppError(409, 'An offer already exists for this application');
      }
      if (application.status !== 'selected') {
        throw new AppError(422, 'An offer can be created only for a selected application');
      }

      const result = await client.query(
        `INSERT INTO offers
          (application_id, student_id, ctc, ctc_offered, offered_at, offer_letter_url, status)
         VALUES ($1, $2, $3, $3, CURRENT_TIMESTAMP, $4, 'offered')
         RETURNING id, application_id, student_id, ctc, offered_at,
           offer_letter_url, UPPER(status) AS status`,
        [applicationId, application.student_id, input.ctc, input.offerLetterUrl || null]
      );
      await client.query(
        `UPDATE applications SET status = 'offered', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [applicationId]
      );
      return result.rows[0];
    });
  } catch (error) {
    if (error.code === '23505') throw new AppError(409, 'An offer already exists for this application');
    throw error;
  }
}

async function accept(offerId, studentId) {
  return updateStatus(offerId, 'accepted', { id: studentId, role: 'student' });
}

async function updateStatus(offerId, nextStatus, user) {
  const status = nextStatus.toLowerCase();
  return db.withTransaction(async (client) => {
    const found = await client.query(
      `SELECT o.id, o.application_id, o.student_id, o.status, s.user_id
       FROM offers o
       JOIN students s ON s.id = o.student_id
      JOIN applications a ON a.id = o.application_id
      WHERE o.id = $1
      FOR UPDATE OF o, a`,
      [offerId]
    );
    const offer = found.rows[0];
    if (!offer) throw new AppError(404, 'Offer not found');

    if (user.role === 'student') {
      if (!['accepted', 'declined'].includes(status)) {
        throw new AppError(403, 'Students may only accept or decline offers');
      }
      if (offer.user_id !== user.id) throw new AppError(403, 'Students may update only their own offers');
    } else if (['officer', 'admin'].includes(user.role)) {
      if (status !== 'withdrawn') throw new AppError(403, 'Staff may only withdraw offers');
    } else {
      throw new AppError(403, 'Role is not allowed to update offers');
    }

    if (offer.status !== 'offered') {
      throw new AppError(422, 'Only offered offers can be changed');
    }

    if (status === 'accepted') {
      await client.query('SELECT id FROM students WHERE id = $1 FOR UPDATE', [offer.student_id]);
      const maxAccepted = process.env.MAX_ACCEPTED_OFFERS_PER_STUDENT === undefined
        ? 1
        : Number(process.env.MAX_ACCEPTED_OFFERS_PER_STUDENT);
      if (!Number.isInteger(maxAccepted) || maxAccepted < 1) {
        throw new Error('MAX_ACCEPTED_OFFERS_PER_STUDENT must be a positive integer');
      }
      const accepted = await client.query(
        `SELECT COUNT(*)::INTEGER AS total
         FROM offers WHERE student_id = $1 AND status = 'accepted'`,
        [offer.student_id]
      );
      if (Number(accepted.rows[0].total) >= maxAccepted) {
        throw new AppError(422, `A student may accept at most ${maxAccepted} offer${maxAccepted === 1 ? '' : 's'}`);
      }
    }

    const updated = await client.query(
      `UPDATE offers
       SET status = $1, is_accepted = CASE
         WHEN $1 = 'accepted' THEN TRUE
         WHEN $1 = 'declined' THEN FALSE
         ELSE NULL
       END
       WHERE id = $2
       RETURNING id, application_id, student_id, ctc, offered_at,
         offer_letter_url, UPPER(status) AS status`,
      [status, offerId]
    );
    if (status === 'accepted') {
      await client.query(
        `UPDATE applications SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [offer.application_id]
      );
    } else if (status === 'declined' || status === 'withdrawn') {
      await client.query(
        `UPDATE applications SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [offer.application_id]
      );
    }
    return updated.rows[0];
  });
}

module.exports = { listForStudent, listAll, create, createForApplication, accept, updateStatus };
