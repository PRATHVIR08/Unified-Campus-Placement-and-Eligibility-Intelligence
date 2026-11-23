const db = require('../db/pool');
const AppError = require('../utils/AppError');

const ALLOWED_KEYS = new Set([
  'role', 'role_type', 'location', 'workMode', 'work_mode',
  'skills', 'skillMatch', 'minPackage', 'maxPackage', 'min_package', 'max_package',
  'eligibleOnly', 'eligible_only', 'hideClosed', 'hide_closed', 'sort', 'page', 'limit',
]);

function validateFilterJson(filter) {
  if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
    throw new AppError(400, 'filter_json must be an object');
  }
  for (const [key, value] of Object.entries(filter)) {
    if (!ALLOWED_KEYS.has(key)) throw new AppError(400, `Unsupported filter key: ${key}`);
    if (['role', 'role_type', 'location', 'work_mode', 'workMode', 'q', 'keyword'].includes(key) &&
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
    `SELECT filter_id, student_id, name, COALESCE(criteria, filter_json) AS criteria,
            is_default, created_at, updated_at
     FROM student_filters
     WHERE student_id = $1
     ORDER BY created_at DESC, filter_id`,
    [studentId]
  );
  return result.rows;
}

async function create(studentId, input) {
  if (typeof input.name !== 'string' || input.name.trim().length < 1 || input.name.trim().length > 40) {
    throw new AppError(400, 'name must be between 1 and 40 characters');
  }
  const filter = validateFilterJson(input.criteria ?? input.filter_json);
  return db.withTransaction(async (client) => {
    const count = await client.query(
      'SELECT COUNT(*)::INTEGER AS total FROM student_filters WHERE student_id = $1',
      [studentId]
    );
    if (count.rows[0].total >= 10) throw new AppError(422, 'A student can save at most 10 filters');
    if (input.is_default === true) {
      await client.query(
        'UPDATE student_filters SET is_default = false, updated_at = CURRENT_TIMESTAMP WHERE student_id = $1',
        [studentId]
      );
    }
    try {
      const result = await client.query(
        `INSERT INTO student_filters (student_id, name, criteria, filter_json, is_default)
         VALUES ($1, $2, $3::jsonb, $3::jsonb, $4)
         RETURNING filter_id, student_id, name, criteria, is_default, created_at, updated_at`,
        [studentId, input.name.trim(), JSON.stringify(filter), input.is_default === true]
      );
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') throw new AppError(409, 'A saved filter with this name already exists');
      throw error;
    }
  });
}

async function update(studentId, filterId, input) {
  if (input.name !== undefined && (typeof input.name !== 'string' || input.name.trim().length < 1 || input.name.trim().length > 40)) {
    throw new AppError(400, 'name must be between 1 and 40 characters');
  }
  if (input.criteria !== undefined) validateFilterJson(input.criteria);
  if (input.filter_json !== undefined) validateFilterJson(input.filter_json);
  const existingCheck = await db.query(
    'SELECT filter_id, student_id FROM student_filters WHERE filter_id = $1',
    [filterId]
  );
  if (!existingCheck.rows.length) {
    const legacyCheck = await db.query(
      'SELECT student_id FROM student_filters WHERE filter_id = $1',
      [filterId]
    );
    if (!legacyCheck.rows.length) throw new AppError(404, 'Saved filter not found');
    if (legacyCheck.rows[0].student_id !== studentId) {
      throw new AppError(403, 'Students may modify only their own saved filters');
    }
  } else if (existingCheck.rows[0].student_id !== studentId) {
    throw new AppError(403, 'Students may modify only their own saved filters');
  }
  const withTransaction = db.withTransaction;
  if (typeof withTransaction !== 'function') {
    throw new AppError(500, 'Transaction support is unavailable');
  }
  return db.withTransaction(async (client) => {
    const existing = await client.query(
      'SELECT filter_id, student_id FROM student_filters WHERE filter_id = $1',
      [filterId]
    );
    if (!existing.rows.length) throw new AppError(404, 'Saved filter not found');
    if (existing.rows[0].student_id !== studentId) throw new AppError(403, 'Students may modify only their own saved filters');

    if (input.is_default === true) {
      await client.query(
        'UPDATE student_filters SET is_default = false, updated_at = CURRENT_TIMESTAMP WHERE student_id = $1',
        [studentId]
      );
    }
    const values = [];
    const assignments = [];
    if (input.name !== undefined) { values.push(input.name.trim()); assignments.push(`name = $${values.length}`); }
    const criteria = input.criteria ?? input.filter_json;
    if (criteria !== undefined) {
      values.push(JSON.stringify(criteria));
      assignments.push(`criteria = $${values.length}::jsonb`);
      assignments.push(`filter_json = $${values.length}::jsonb`);
    }
    if (input.is_default !== undefined) {
      values.push(input.is_default === true);
      assignments.push(`is_default = $${values.length}`);
    }
    assignments.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(filterId);
    values.push(studentId);
    try {
      const result = await client.query(
        `UPDATE student_filters SET ${assignments.join(', ')}
         WHERE filter_id = $${values.length - 1} AND student_id = $${values.length}
         RETURNING filter_id, student_id, name, criteria, is_default, created_at, updated_at`,
        values
      );
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') throw new AppError(409, 'A saved filter with this name already exists');
      throw error;
    }
  });
}

async function remove(studentId, filterId) {
  const result = await db.query(
    'DELETE FROM student_filters WHERE filter_id = $1 AND student_id = $2 RETURNING filter_id',
    [filterId, studentId]
  );
  if (result.rows.length) return;
  const existing = await db.query('SELECT student_id FROM student_filters WHERE filter_id = $1', [filterId]);
  if (!existing.rows.length) throw new AppError(404, 'Saved filter not found');
  throw new AppError(403, 'Students may delete only their own saved filters');
}

module.exports = { list, create, update, remove, validateFilterJson };
