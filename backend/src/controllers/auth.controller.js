const db = require('../db/pool');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

function createToken(user) {
  if (!process.env.JWT_SECRET || /your_|change_in_production|placeholder/i.test(process.env.JWT_SECRET)) {
    const error = new Error('JWT_SECRET is not configured');
    error.statusCode = 500;
    throw error;
  }

  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/register
// Public registration is restricted to student accounts.
exports.register = async (req, res, next) => {
  const {
    email,
    password,
    name,
    usn,
    rollNumber,
    firstName,
    lastName,
    department,
    batchYear,
    cgpa,
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required',
    });
  }

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Email and password must be strings',
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Password must contain at least 8 characters',
    });
  }

  const nameParts = typeof name === 'string' ? name.trim().split(/\s+/).filter(Boolean) : [];
  const resolvedFirstName = (typeof firstName === 'string' && firstName.trim()) || nameParts[0] || '';
  const resolvedLastName = (typeof lastName === 'string' && lastName.trim())
    || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
  const resolvedRollNumber = (typeof rollNumber === 'string' && rollNumber.trim())
    || (typeof usn === 'string' && usn.trim().toUpperCase())
    || '';

  if (!resolvedFirstName || !resolvedRollNumber) {
    return res.status(400).json({
      success: false,
      error: 'Student details are required: name (or firstName) and usn/rollNumber',
    });
  }

  let parsedBatchYear = null;
  let parsedCgpa = null;
  if (batchYear !== undefined && batchYear !== null && batchYear !== '') {
    parsedBatchYear = Number(batchYear);
    if (!Number.isInteger(parsedBatchYear)) {
      return res.status(400).json({
        success: false,
        error: 'Batch year must be an integer',
      });
    }
  }
  if (cgpa !== undefined && cgpa !== null && cgpa !== '') {
    parsedCgpa = Number(cgpa);
    if (!Number.isFinite(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10) {
      return res.status(400).json({
        success: false,
        error: 'CGPA must be between 0 and 10',
      });
    }
  }
  const resolvedDepartment = typeof department === 'string' && department.trim()
    ? department.trim()
    : null;

  let client;

  try {
    client = await db.pool.connect();
    await client.query('BEGIN');

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, 'student')
       RETURNING id, email, role`,
      [normalizedEmail, passwordHash]
    );

    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO students
       (id, roll_number, first_name, last_name, department, batch_year, cgpa)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        user.id,
        resolvedRollNumber,
        resolvedFirstName,
        resolvedLastName,
        resolvedDepartment,
        parsedBatchYear,
        parsedCgpa,
      ]
    );

    await client.query('COMMIT');

    const token = createToken(user);

    return res.status(201).json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Email or roll number already exists',
      });
    }

    return next(error);
  } finally {
    if (client) client.release();
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const result = await db.query(
      `SELECT id, email, password_hash, role
       FROM users
       WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];

    if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/auth/me
exports.getCurrentUser = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, email, role
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/auth/provision — bind a verified Supabase identity to a student row.
// Public signup always receives the student role; user metadata never supplies role.
exports.provisionStudent = async (req, res, next) => {
  const authUser = req.authUser;
  let client;
  try {
    client = await db.pool.connect();
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id, email, role FROM users WHERE id = $1 FOR UPDATE',
      [authUser.id]
    );

    let user = existing.rows[0];
    if (!user) {
      const metadata = authUser.user_metadata || {};
      const name = metadata.full_name || metadata.name;
      const usn = metadata.usn;
      const email = authUser.email;
      const normalizedUsn = typeof usn === 'string' ? usn.trim().toUpperCase() : '';
      if (typeof email !== 'string' || typeof name !== 'string' || !name.trim() ||
          !/^\d[A-Z]{2}\d{2}[A-Z]{2,3}\d{3}$/.test(normalizedUsn)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Supabase account needs a name and USN to create its student profile' });
      }

      const parts = name.trim().split(/\s+/);
      const inserted = await client.query(
        `INSERT INTO users (id, email, password_hash, role)
         VALUES ($1, $2, NULL, 'student')
         RETURNING id, email, role`,
        [authUser.id, email.trim().toLowerCase()]
      );
      user = inserted.rows[0];
      await client.query(
        `INSERT INTO students (id, roll_number, first_name, last_name, department, batch_year, cgpa, active_backlogs)
         VALUES ($1, $2, $3, $4, NULL, NULL, NULL, NULL)`,
        [user.id, normalizedUsn, parts.shift(), parts.join(' ')]
      );
    } else if (user.role === 'student') {
      // Repair a missing student row for an older student account using trusted
      // Supabase identity data. A duplicate USN safely fails through the DB key.
      const student = await client.query('SELECT id FROM students WHERE id = $1', [user.id]);
      if (!student.rows.length) {
        const metadata = authUser.user_metadata || {};
        const name = metadata.full_name || metadata.name;
        const usn = metadata.usn;
        const normalizedUsn = typeof usn === 'string' ? usn.trim().toUpperCase() : '';
        if (typeof name !== 'string' || !name.trim() || !/^\d[A-Z]{2}\d{2}[A-Z]{2,3}\d{3}$/.test(normalizedUsn)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, error: 'Supabase account needs a name and USN to create its student profile' });
        }
        const parts = name.trim().split(/\s+/);
        await client.query(
          `INSERT INTO students (id, roll_number, first_name, last_name, department, batch_year, cgpa, active_backlogs)
           VALUES ($1, $2, $3, $4, NULL, NULL, NULL, NULL)`,
          [user.id, normalizedUsn, parts.shift(), parts.join(' ')]
        );
      }
    }

    await client.query('COMMIT');
    return res.json({ success: true, user });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (error.code === '23505') {
      // Supabase emits auth-state events while signup is completing. Two
      // provisioning requests can race; accept the winner only for this same
      // authenticated id, and still reject email/USN conflicts from other users.
      let winner;
      try {
        winner = await db.query(
          `SELECT u.id, u.email, u.role FROM users u
           JOIN students s ON s.id = u.id WHERE u.id = $1`,
          [authUser.id]
        );
      } catch (winnerError) {
        return next(winnerError);
      }
      if (winner.rows.length && winner.rows[0].role === 'student') {
        return res.json({ success: true, user: winner.rows[0] });
      }
      if (error.constraint && error.constraint.includes('roll_number')) {
        return res.status(409).json({
          success: false,
          error: 'This USN is already linked to another student profile. Update the USN in your Supabase account metadata to a valid, unused USN, then sign in again.',
        });
      }
      if (error.constraint && error.constraint.includes('email')) {
        return res.status(409).json({
          success: false,
          error: 'This email is already linked to a different application account. Contact your placement administrator to link the accounts.',
        });
      }
      return res.status(409).json({ success: false, error: 'This account conflicts with an existing student profile. Contact your placement administrator.' });
    }
    return next(error);
  } finally {
    if (client) client.release();
  }
};
