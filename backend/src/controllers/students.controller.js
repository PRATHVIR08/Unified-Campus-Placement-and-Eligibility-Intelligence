const db = require('../db/pool');

const profileSelect = `SELECT s.id, u.email, s.roll_number, s.first_name, s.last_name,
  s.department, s.degree, s.batch_year, s.cgpa, s.active_backlogs,
  s.tenth_percentage, s.twelfth_percentage, s.total_backlogs_history
  FROM students s JOIN users u ON u.id = s.id`;

function formatProfile(row) {
  return {
    ...row,
    name: [row.first_name, row.last_name].filter(Boolean).join(' '),
    usn: row.roll_number,
    rollNumber: row.roll_number,
    batchYear: row.batch_year,
    activeBacklogs: row.active_backlogs,
  };
}

exports.getProfile = async (req, res, next) => {
  try {
    const id = req.user.role === 'officer' && req.query.studentId
      ? req.query.studentId : req.user.id;
    const result = await db.query(`${profileSelect} WHERE s.id = $1`, [id]);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Student profile not found' });
    return res.json({ success: true, data: formatProfile(result.rows[0]) });
  } catch (error) { return next(error); }
};

exports.updateProfile = async (req, res, next) => {
  const body = req.body || {};
  const updates = [];
  const params = [];
  const add = (column, value) => { params.push(value); updates.push(`${column} = $${params.length}`); };
  const values = {
    department: body.department,
    degree: body.degree,
    batch_year: body.batchYear ?? body.batch_year,
    cgpa: body.cgpa,
    active_backlogs: body.activeBacklogs ?? body.active_backlogs,
  };

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) return res.status(400).json({ success: false, error: 'Name must be a non-empty string' });
    const parts = body.name.trim().split(/\s+/);
    add('first_name', parts.shift());
    add('last_name', parts.join(' '));
  }
  for (const [column, value] of Object.entries(values)) {
    if (value === undefined) continue;
    if (column === 'department' || column === 'degree') {
      if (value === null || value === '') {
        add(column, null);
      } else if (typeof value !== 'string' || !value.trim()) {
        return res.status(400).json({ success: false, error: `${column} must be a string` });
      } else {
        add(column, value.trim());
      }
    } else {
      if (value === null || value === '') {
        add(column, null);
        continue;
      }
      const number = Number(value);
      const valid = Number.isFinite(number) && (column === 'cgpa' ? number >= 0 && number <= 10 : column === 'batch_year' ? Number.isInteger(number) : Number.isInteger(number) && number >= 0);
      if (!valid) return res.status(400).json({ success: false, error: `Invalid ${column}` });
      add(column, number);
    }
  }
  if (!updates.length) return res.status(400).json({ success: false, error: 'No supported profile fields supplied' });

  try {
    params.push(req.user.id);
    const result = await db.query(
      `UPDATE students SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING id`,
      params
    );
    if (!result.rowCount) return res.status(404).json({ success: false, error: 'Student profile not found' });
    const profile = await db.query(`${profileSelect} WHERE s.id = $1`, [req.user.id]);
    return res.json({ success: true, data: formatProfile(profile.rows[0]) });
  } catch (error) { return next(error); }
};

exports.getAllStudents = async (req, res, next) => {
  try {
    const result = await db.query(`${profileSelect} ORDER BY s.department, s.batch_year, s.roll_number`);
    return res.json({ success: true, data: result.rows.map(formatProfile) });
  } catch (error) { return next(error); }
};
