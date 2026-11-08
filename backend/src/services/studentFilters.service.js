const db = require('../db/pool');
const AppError = require('../utils/AppError');

const ALLOWED_KEYS = new Set([
  'role_type', 'roleType', 'location', 'work_mode', 'workMode',
  'min_package', 'minPackage', 'q', 'keyword', 'active_only',
  'eligible_only', 'eligibleOnly', 'skills', 'page', 'limit',
]);

function validateFilterJson(filter) {
  if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
    throw new AppError(400, 'filter_json must be an object');
  }
  for (const [key, value] of Object.entries(filter)) {
    if (!ALLOWED_KEYS.has(key)) throw new AppError(400, `Unsupported filter key: ${key}`);
    if (['role_type', 'roleType', 'location', 'work_mode', 'workMode', 'q', 'keyword'].includes(key) &&
        (typeof value !== 'string' || value.length > 200)) {
      throw new AppError(400, `${key} must be a string of at most 200 characters`);
    }
    if (['min_package', 'minPackage'].includes(key) &&
        (!Number.isFinite(Number(value)) || Number(value) < 0)) {
      throw new AppError(400, `${key} must be a non-negative number`);
    }
    if (['active_only', 'eligible_only', 'eligibleOnly'].includes(key) &&
        typeof value !== 'boolean' &&
        !(typeof value === 'string' && ['true', 'false', '1', '0'].includes(value.toLowerCase()))) {
      throw new AppError(400, `${key} must be boolean`);
    }
    if (['page', 'limit'].includes(key) && (!Number.isInteger(Number(value)) || Number(value) < 1 ||
        (key === 'limit' && Number(value) > 100))) {
      throw new AppError(400, `${key} must be a valid positive integer`);
    }
    if (key === 'skills' && !(typeof value === 'string' ||
        (Array.isArray(value) && value.every((skill) => typeof skill === 'string' && skill.trim())))) {
      throw new AppError(400, 'skills must be a comma-separated string or an array of names');
    }
  }
  return filter;
}

async function list(studentId) {
  const result = await db.query(
    `SELECT id, student_id, name, filter_json, created_at
     FROM student_filters
     WHERE student_id = $1
     ORDER BY created_at DESC, id`,
    [studentId]
  );
  return result.rows;
}

async function create(studentId, input) {
  const filter = validateFilterJson(input.filter_json);
  const result = await db.query(
    `INSERT INTO student_filters (student_id, name, filter_json)
     VALUES ($1, $2, $3::jsonb)
     RETURNING id, student_id, name, filter_json, created_at`,
    [studentId, input.name, JSON.stringify(filter)]
  );
  return result.rows[0];
}

async function update(studentId, filterId, input) {
  if (input.filter_json !== undefined) validateFilterJson(input.filter_json);
  const values = [];
  const assignments = [];
  if (input.name !== undefined) {
    values.push(input.name);
    assignments.push(`name = $${values.length}`);
  }
  if (input.filter_json !== undefined) {
    values.push(JSON.stringify(input.filter_json));
    assignments.push(`filter_json = $${values.length}::jsonb`);
  }
  values.push(filterId);
  values.push(studentId);
  const result = await db.query(
    `UPDATE student_filters
     SET ${assignments.join(', ')}
     WHERE id = $${values.length - 1} AND student_id = $${values.length}
     RETURNING id, student_id, name, filter_json, created_at`,
    values
  );
  if (result.rows.length) return result.rows[0];
  const existing = await db.query('SELECT student_id FROM student_filters WHERE id = $1', [filterId]);
  if (!existing.rows.length) throw new AppError(404, 'Saved filter not found');
  throw new AppError(403, 'Students may modify only their own saved filters');
}

async function remove(studentId, filterId) {
  const result = await db.query(
    'DELETE FROM student_filters WHERE id = $1 AND student_id = $2 RETURNING id',
    [filterId, studentId]
  );
  if (result.rows.length) return;
  const existing = await db.query('SELECT student_id FROM student_filters WHERE id = $1', [filterId]);
  if (!existing.rows.length) throw new AppError(404, 'Saved filter not found');
  throw new AppError(403, 'Students may delete only their own saved filters');
}

module.exports = { list, create, update, remove, validateFilterJson };
