const db = require('../db/pool');
const AppError = require('../utils/AppError');

const STUDENT_PROFILE = `SELECT p.id, p.email, p.full_name, p.usn, p.role,
  s.id AS student_id,
  COALESCE(ar.department, s.department) AS department,
  COALESCE(ar.degree, s.degree) AS degree,
  COALESCE(ar.cgpa, s.cgpa) AS cgpa,
  COALESCE(ar.graduation_year, s.graduation_year, s.batch_year) AS graduation_year,
  COALESCE(ar.backlogs, s.backlogs, s.active_backlogs) AS backlogs
  FROM profiles p
  LEFT JOIN students s ON s.user_id = p.id
  LEFT JOIN academic_records ar ON ar.student_id = s.id`;

async function getMe(userId) {
  const result = await db.query(`${STUDENT_PROFILE} WHERE p.id = $1`, [userId]);
  if (!result.rows.length) throw new AppError(404, 'Student profile not found');
  const { student_id, role, ...profile } = result.rows[0];
  return { ...profile, role: role.toUpperCase() };
}

async function updateMe(userId, input) {
  await db.withTransaction(async (client) => {
    const existing = await client.query(
      `SELECT p.id, p.full_name, p.usn, s.id AS student_id, s.roll_number,
        s.first_name, s.last_name,
        COALESCE(ar.department, s.department) AS department,
        COALESCE(ar.degree, s.degree) AS degree,
        COALESCE(ar.cgpa, s.cgpa) AS cgpa,
        COALESCE(ar.graduation_year, s.graduation_year, s.batch_year) AS graduation_year,
        COALESCE(ar.backlogs, s.backlogs, s.active_backlogs) AS backlogs
       FROM profiles p
       LEFT JOIN students s ON s.user_id = p.id
       LEFT JOIN academic_records ar ON ar.student_id = s.id
       WHERE p.id = $1 FOR UPDATE OF p`,
      [userId]
    );
    if (!existing.rows.length) throw new AppError(404, 'Student profile not found');
    const current = existing.rows[0];
    const academic = {
      department: input.department === undefined ? current.department : input.department,
      degree: input.degree === undefined ? current.degree : input.degree,
      cgpa: input.cgpa === undefined ? current.cgpa : input.cgpa,
      graduationYear: input.graduationYear === undefined ? current.graduation_year : input.graduationYear,
      backlogs: input.backlogs === undefined ? current.backlogs : input.backlogs,
    };
    const names = (input.fullName || current.full_name || '').trim().split(/\s+/).filter(Boolean);
    const firstName = names.shift() || 'Student';
    const lastName = names.join(' ');
    const rollNumber = current.usn || current.roll_number || null;

    if (input.fullName !== undefined) {
      await client.query('UPDATE profiles SET full_name = $1 WHERE id = $2', [input.fullName, userId]);
    }

    const student = await client.query(
      `INSERT INTO students
        (id, user_id, roll_number, first_name, last_name, department, degree,
         cgpa, batch_year, graduation_year, backlogs, active_backlogs)
       VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $9)
       ON CONFLICT (user_id) DO UPDATE SET
         department = EXCLUDED.department,
         degree = EXCLUDED.degree,
         cgpa = EXCLUDED.cgpa,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         batch_year = EXCLUDED.batch_year,
         graduation_year = EXCLUDED.graduation_year,
         backlogs = EXCLUDED.backlogs,
         active_backlogs = EXCLUDED.active_backlogs
       RETURNING id`,
      [userId, rollNumber, firstName, lastName, academic.department, academic.degree,
        academic.cgpa, academic.graduationYear, academic.backlogs]
    );
    await client.query(
      `INSERT INTO academic_records
        (student_id, department, degree, cgpa, graduation_year, backlogs)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (student_id) DO UPDATE SET
         department = EXCLUDED.department,
         degree = EXCLUDED.degree,
         cgpa = EXCLUDED.cgpa,
         graduation_year = EXCLUDED.graduation_year,
         backlogs = EXCLUDED.backlogs,
         updated_at = CURRENT_TIMESTAMP`,
      [student.rows[0].id, academic.department, academic.degree, academic.cgpa,
        academic.graduationYear, academic.backlogs]
    );
  });
  return getMe(userId);
}

async function listStudents(limit, offset) {
  const [count, rows] = await Promise.all([
    db.query('SELECT COUNT(*)::INTEGER AS total FROM students'),
    db.query(
      `${STUDENT_PROFILE}
       WHERE s.id IS NOT NULL
       ORDER BY p.full_name, p.id
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
  ]);
  return { data: rows.rows.map(({ student_id, role, ...row }) => ({ ...row, role: role.toUpperCase() })), total: count.rows[0].total };
}

module.exports = { getMe, updateMe, listStudents };
