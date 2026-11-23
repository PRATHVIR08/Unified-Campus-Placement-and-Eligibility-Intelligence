const db = require('../db/pool');
const AppError = require('../utils/AppError');
const { evaluateEligibility } = require('./eligibilityService');

const SORTS = new Set(['deadline', 'package', 'newest']);
const WORK_MODES = new Set(['ONSITE', 'REMOTE', 'HYBRID']);

function bad(message) {
  throw new AppError(400, message);
}

function validateFilters(query = {}) {
  const result = {};
  const roleValue = query.role ?? query.role_type ?? query.roleType;
  if (roleValue !== undefined) {
    if (typeof roleValue !== 'string' || roleValue.length > 200) bad('role must be text');
    result.role = roleValue.trim();
  }
  for (const field of ['location']) {
    if (query[field] !== undefined) {
      if (typeof query[field] !== 'string' || query[field].length > 200) bad(`${field} must be text`);
      result[field] = query[field].trim();
    }
  }

  for (const field of ['minPackage', 'maxPackage']) {
    const alias = field === 'minPackage' ? (query.minPackage ?? query.min_package) :
      (query.maxPackage ?? query.max_package);
    if (alias !== undefined) {
      if (typeof alias !== 'string' || !alias.trim() ||
          !Number.isFinite(Number(alias)) || Number(alias) < 0) {
        bad(`${field} must be a non-negative number`);
      }
      result[field] = Number(alias);
    }
  }
  if (result.minPackage !== undefined && result.maxPackage !== undefined &&
      result.minPackage > result.maxPackage) bad('minPackage cannot be greater than maxPackage');

  if (query.skills !== undefined) {
    if (typeof query.skills !== 'string' || query.skills.length > 1000) bad('skills must be a comma-separated list');
    result.skills = [...new Set(query.skills.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean))];
  }
  result.skillMatch = query.skillMatch === undefined ? 'any' : String(query.skillMatch).toLowerCase();
  if (!['any', 'all'].includes(result.skillMatch)) bad('skillMatch must be any or all');

  const locationValue = query.location;
  if (locationValue !== undefined) {
    result.locations = locationValue.split(',').map((item) => item.trim()).filter(Boolean);
  }
  const workModeValue = query.workMode ?? query.work_mode;
  if (workModeValue !== undefined) {
    if (typeof workModeValue !== 'string') bad('workMode must be a comma-separated list');
    result.workModes = [...new Set(workModeValue.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean))];
    if (result.workModes.some((item) => !WORK_MODES.has(item))) bad('Unknown workMode');
  }

  for (const [field, defaultValue] of [['page', 1], ['limit', 20]]) {
    const value = query[field] === undefined ? defaultValue : query[field];
    if (!/^\d+$/.test(String(value))) bad(`${field} must be numeric`);
    result[field] = Number(value);
  }
  if (!Number.isInteger(result.page) || result.page < 1) bad('page must be a positive integer');
  if (!Number.isInteger(result.limit) || result.limit < 1 || result.limit > 100) bad('limit must be between 1 and 100');

  result.sort = query.sort === undefined ? 'deadline' : String(query.sort).toLowerCase();
  if (!SORTS.has(result.sort)) bad('sort must be deadline, package, or newest');

  for (const [field, key] of [['eligibleOnly', 'eligibleOnly'], ['hideClosed', 'hideClosed']]) {
    if (query[field] !== undefined) {
      if (typeof query[field] !== 'string' || !['true', 'false', '1', '0'].includes(query[field].toLowerCase())) {
        bad(`${field} must be true or false`);
      }
      result[field] = ['true', '1'].includes(query[field].toLowerCase());
    } else result[field] = false;
  }
  return result;
}

async function getFilterOptions() {
  const result = await db.query(
    `SELECT
       COALESCE(json_agg(DISTINCT location ORDER BY location) FILTER (WHERE location IS NOT NULL), '[]') AS locations,
       COALESCE(json_agg(DISTINCT role_type ORDER BY role_type) FILTER (WHERE role_type IS NOT NULL), '[]') AS role_types,
       COALESCE(json_agg(DISTINCT work_mode ORDER BY work_mode) FILTER (WHERE work_mode IS NOT NULL), '[]') AS work_modes,
       MIN(package_lpa) AS min_package,
       MAX(package_lpa) AS max_package
     FROM job_drives`
  );
  return result.rows[0];
}

async function list(filters, user) {
  const values = [];
  const conditions = [];
  const add = (value) => { values.push(value); return `$${values.length}`; };

  if (filters.role) conditions.push(`(d.role_type ILIKE ${add(`%${filters.role}%`)} OR d.title ILIKE ${add(`%${filters.role}%`)})`);
  if (filters.skills?.length) {
    const names = add(filters.skills);
    if (filters.skillMatch === 'all') {
      conditions.push(`d.id IN (
        SELECT ds.drive_id FROM drive_skills ds JOIN skills sk ON sk.id = ds.skill_id
        WHERE LOWER(sk.name) = ANY(${names}::text[]) OR sk.id::text = ANY(${names}::text[])
        GROUP BY ds.drive_id HAVING COUNT(DISTINCT LOWER(sk.name)) >= ${filters.skills.length}
      )`);
    } else {
      conditions.push(`EXISTS (
        SELECT 1 FROM drive_skills ds JOIN skills sk ON sk.id = ds.skill_id
        WHERE ds.drive_id = d.id AND (LOWER(sk.name) = ANY(${names}::text[]) OR sk.id::text = ANY(${names}::text[]))
      )`);
    }
  }
  if (filters.minPackage !== undefined) conditions.push(`d.package_lpa >= ${add(filters.minPackage)}`);
  if (filters.maxPackage !== undefined) conditions.push(`d.package_lpa <= ${add(filters.maxPackage)}`);
  if (filters.locations?.length) {
    const clauses = filters.locations.map((location) => `d.location ILIKE ${add(`%${location}%`)}`);
    conditions.push(`(${clauses.join(' OR ')})`);
  }
  if (filters.workModes?.length) conditions.push(`d.work_mode = ANY(${add(filters.workModes)}::text[])`);
  if (filters.hideClosed) conditions.push(`d.application_deadline > CURRENT_TIMESTAMP`);
  if (user.role === 'student') conditions.push(`d.status = 'active'`);

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countSql = `SELECT COUNT(*)::INTEGER AS total FROM job_drives d JOIN companies c ON c.id = d.company_id ${where}`;
  const countResult = await db.query(countSql, values);

  let eligibleOnly = filters.eligibleOnly && user.role === 'student';
  const orderBy = filters.sort === 'package'
    ? 'd.package_lpa DESC NULLS LAST, d.application_deadline ASC'
    : filters.sort === 'newest'
      ? 'd.created_at DESC'
      : 'd.application_deadline ASC';

  let dataValues = [...values];
  let limitSql = '';
  if (!eligibleOnly) {
    dataValues.push(filters.limit, (filters.page - 1) * filters.limit);
    limitSql = ` LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length}`;
  }
  const dataResult = await db.query(
    `SELECT d.*, c.name AS company_name,
      COALESCE(json_agg(json_build_object('id', sk.id, 'name', sk.name)) FILTER (WHERE sk.id IS NOT NULL), '[]') AS skills
     FROM job_drives d
     JOIN companies c ON c.id = d.company_id
     LEFT JOIN drive_skills ds ON ds.drive_id = d.id
     LEFT JOIN skills sk ON sk.id = ds.skill_id
     ${where}
     GROUP BY d.id, c.name
     ORDER BY ${orderBy}${limitSql}`,
    dataValues
  );

  const driveIds = dataResult.rows.map((row) => row.id);
  let rules = new Map();
  if (driveIds.length) {
    const rulesResult = await db.query(
      `SELECT id, job_drive_id, field_name, operator, value, mandatory
       FROM eligibility_rules WHERE job_drive_id = ANY($1::uuid[]) ORDER BY created_at, id`,
      [driveIds]
    );
    rules = new Map(driveIds.map((id) => [id, []]));
    for (const rule of rulesResult.rows) if (rules.has(rule.job_drive_id)) rules.get(rule.job_drive_id).push(rule);
  }

  let academicRecord = null;
  if (user.role === 'student' && dataResult.rows.length) {
    const record = await db.query(
      `SELECT COALESCE(ar.cgpa, s.cgpa) AS cgpa,
              COALESCE(ar.department, s.department) AS department,
              COALESCE(ar.backlogs, s.backlogs, s.active_backlogs) AS backlogs,
              COALESCE(ar.graduation_year, s.graduation_year, s.batch_year) AS graduation_year
       FROM students s LEFT JOIN academic_records ar ON ar.student_id = s.id
       WHERE s.user_id = $1`,
      [user.id]
    );
    academicRecord = record.rows[0] || null;
  }

  let drives = dataResult.rows.map((row) => {
    const deadline = row.application_deadline ? new Date(row.application_deadline) : null;
    const eligibility = user.role === 'student'
      ? evaluateEligibility(academicRecord, rules.get(row.id) || [])
      : null;
    return {
      ...row,
      companyName: row.company_name,
      roleType: row.role_type,
      workMode: row.work_mode,
      packageLpa: row.package_lpa,
      applicationDeadline: row.application_deadline,
      deadline: row.application_deadline,
      isClosed: deadline ? deadline.getTime() <= Date.now() : false,
      ...(eligibility && {
        eligible: eligibility.eligible,
        isEligible: eligibility.eligible,
        eligibilityReasons: eligibility.reasons,
      }),
    };
  });
  let total = countResult.rows[0]?.total || 0;
  if (eligibleOnly) {
    drives = drives.filter((drive) => drive.isEligible);
    total = drives.length;
    drives = drives.slice((filters.page - 1) * filters.limit, filters.page * filters.limit);
  }
  return { data: drives, pagination: { page: filters.page, limit: filters.limit, total } };
}

module.exports = { validateFilters, getFilterOptions, list, buildDriveFilterQuery: list };
