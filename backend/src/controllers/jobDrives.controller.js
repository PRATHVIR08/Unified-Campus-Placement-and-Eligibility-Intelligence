const db = require('../db/pool');
const { evaluateEligibility } = require('../services/eligibilityService');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SELECT = `SELECT d.*, c.name AS company_name, c.industry AS company_industry,
  c.website AS company_website FROM job_drives d JOIN companies c ON c.id = d.company_id`;

function shape(row, eligibility) {
  return {
    ...row,
    companyName: row.company_name,
    ctcAnnual: Number(row.ctc_annual),
    minCgpa: Number(row.min_cgpa),
    maxActiveBacklogs: row.max_active_backlogs,
    eligibleDepartments: row.eligible_departments,
    eligibleBatchYears: row.eligible_batch_years,
    applicationDeadline: row.application_deadline,
    location: row.job_location,
    ...(eligibility || {}),
  };
}

async function studentFor(userId) {
  const result = await db.query('SELECT department, batch_year, cgpa, active_backlogs FROM students WHERE id = $1', [userId]);
  return result.rows[0];
}

function validDrive(body) {
  return typeof body.title === 'string' && body.title.trim() && UUID.test(body.companyId || '') &&
    Number.isFinite(Number(body.ctcAnnual)) && Number(body.ctcAnnual) > 0 &&
    Number.isFinite(Number(body.minCgpa ?? 6)) && Number(body.minCgpa ?? 6) >= 0 && Number(body.minCgpa ?? 6) <= 10 &&
    Number.isInteger(Number(body.maxActiveBacklogs ?? 0)) && Number(body.maxActiveBacklogs ?? 0) >= 0 &&
    Array.isArray(body.eligibleDepartments) && body.eligibleDepartments.every((department) => typeof department === 'string' && department.trim()) &&
    Array.isArray(body.eligibleBatchYears) &&
    body.eligibleBatchYears.every((year) => Number.isInteger(Number(year))) &&
    !Number.isNaN(Date.parse(body.applicationDeadline));
}

exports.getAllDrives = async (req, res, next) => {
  try {
    const params = [];
    const conditions = req.user.role === 'student' ? ["d.status = 'active'"] : [];
    if (req.query.keyword) { params.push(`%${req.query.keyword}%`); conditions.push(`(d.title ILIKE $${params.length} OR c.name ILIKE $${params.length})`); }
    if (req.query.location) { params.push(`%${req.query.location}%`); conditions.push(`d.job_location ILIKE $${params.length}`); }
    if (req.query.minPackage) {
      const minPackage = Number(req.query.minPackage);
      if (!Number.isFinite(minPackage) || minPackage < 0) return res.status(400).json({ success: false, error: 'minPackage must be a non-negative number' });
      params.push(minPackage * 100000); conditions.push(`d.ctc_annual >= $${params.length}`);
    }
    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
    const result = await db.query(`${SELECT}${where} ORDER BY d.created_at DESC`, params);
    const student = req.user.role === 'student' ? await studentFor(req.user.id) : null;
    const data = result.rows.map((row) => {
      const eligibility = student ? evaluateEligibility(student, row) : null;
      return shape(row, eligibility ? {
        isEligible: eligibility.isEligible,
        eligibilityReasons: eligibility.reasons.map((message) => ({ passed: false, message })),
      } : null);
    }).filter((drive) => req.query.eligibleOnly !== '1' || drive.isEligible);
    return res.json({ success: true, data });
  } catch (error) { return next(error); }
};

exports.getDriveById = async (req, res, next) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid drive id' });
  try {
    const studentOnly = req.user.role === 'student' ? " AND d.status = 'active'" : '';
    const result = await db.query(`${SELECT} WHERE d.id = $1${studentOnly}`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Drive not found' });
    const student = req.user.role === 'student' ? await studentFor(req.user.id) : null;
    const eligibility = student ? evaluateEligibility(student, result.rows[0]) : null;
    return res.json({ success: true, data: shape(result.rows[0], eligibility ? {
      isEligible: eligibility.isEligible,
      eligibilityReasons: eligibility.reasons.map((message) => ({ passed: false, message })),
    } : null) });
  } catch (error) { return next(error); }
};

exports.createDrive = async (req, res, next) => {
  const body = req.body || {};
  if (!validDrive(body)) return res.status(400).json({ success: false, error: 'Invalid drive details' });
  try {
    const result = await db.query(
      `INSERT INTO job_drives (company_id, title, role_description, job_location, ctc_annual,
       min_cgpa, max_active_backlogs, eligible_departments, eligible_batch_years, application_deadline, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [body.companyId, body.title.trim(), body.roleDescription || null, body.location || null,
        Number(body.ctcAnnual), Number(body.minCgpa ?? 6), Number(body.maxActiveBacklogs ?? 0),
        body.eligibleDepartments, body.eligibleBatchYears.map(Number), body.applicationDeadline, body.status === 'active' ? 'active' : 'draft']
    );
    const company = await db.query('SELECT name FROM companies WHERE id = $1', [body.companyId]);
    return res.status(201).json({ success: true, data: shape({ ...result.rows[0], company_name: company.rows[0]?.name }) });
  } catch (error) { return next(error); }
};

exports.updateDrive = async (req, res, next) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid drive id' });
  const body = req.body || {};
  const allowed = { title: 'title', roleDescription: 'role_description', location: 'job_location', ctcAnnual: 'ctc_annual', minCgpa: 'min_cgpa', maxActiveBacklogs: 'max_active_backlogs', eligibleDepartments: 'eligible_departments', eligibleBatchYears: 'eligible_batch_years', applicationDeadline: 'application_deadline' };
  const sets = []; const params = [];
  for (const [key, column] of Object.entries(allowed)) {
    if (body[key] === undefined) continue;
    if (['title', 'roleDescription', 'location'].includes(key) && typeof body[key] !== 'string') return res.status(400).json({ success: false, error: `Invalid ${key}` });
    if (key === 'ctcAnnual' && (!Number.isFinite(Number(body[key])) || Number(body[key]) <= 0)) return res.status(400).json({ success: false, error: 'ctcAnnual must be greater than zero' });
    if (key === 'minCgpa' && (!Number.isFinite(Number(body[key])) || Number(body[key]) < 0 || Number(body[key]) > 10)) return res.status(400).json({ success: false, error: 'minCgpa must be between 0 and 10' });
    if (key === 'maxActiveBacklogs' && (!Number.isInteger(Number(body[key])) || Number(body[key]) < 0)) return res.status(400).json({ success: false, error: 'maxActiveBacklogs must be a non-negative integer' });
    if (key === 'eligibleDepartments' && (!Array.isArray(body[key]) || !body[key].every((item) => typeof item === 'string'))) return res.status(400).json({ success: false, error: 'eligibleDepartments must be an array of strings' });
    if (key === 'eligibleBatchYears' && (!Array.isArray(body[key]) || !body[key].every((year) => Number.isInteger(Number(year))))) return res.status(400).json({ success: false, error: 'eligibleBatchYears must be an array of years' });
    if (key === 'applicationDeadline' && Number.isNaN(Date.parse(body[key]))) return res.status(400).json({ success: false, error: 'applicationDeadline must be a valid date' });
    params.push(key === 'eligibleBatchYears' ? body[key].map(Number) : body[key]);
    sets.push(`${column} = $${params.length}`);
  }
  if (!sets.length) return res.status(400).json({ success: false, error: 'No supported drive fields supplied' });
  try {
    params.push(req.params.id);
    const result = await db.query(`UPDATE job_drives SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Drive not found' });
    return res.json({ success: true, data: result.rows[0] });
  } catch (error) { return next(error); }
};

exports.updateDriveStatus = async (req, res, next) => {
  if (!['draft', 'active', 'closed', 'completed'].includes(req.body?.status)) return res.status(400).json({ success: false, error: 'Invalid drive status' });
  try {
    const result = await db.query('UPDATE job_drives SET status = $1 WHERE id = $2 RETURNING *', [req.body.status, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Drive not found' });
    return res.json({ success: true, data: result.rows[0] });
  } catch (error) { return next(error); }
};
