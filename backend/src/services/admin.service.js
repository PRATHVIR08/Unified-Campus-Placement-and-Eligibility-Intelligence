const db = require('../db/pool');
const AppError = require('../utils/AppError');

async function listUsers({ page, limit, search }) {
  const filters = [];
  const values = [];
  if (search) {
    values.push(`%${search}%`);
    filters.push(`(full_name ILIKE $1 OR email ILIKE $1 OR usn ILIKE $1)`);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  const [count, users] = await Promise.all([
    db.query(`SELECT COUNT(*)::INTEGER AS total FROM profiles ${where}`, values),
    db.query(
      `SELECT id, full_name, email, usn, role, created_at
       FROM profiles ${where}
       ORDER BY created_at DESC, id
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    ),
  ]);
  return { data: users.rows, total: count.rows[0].total, page, limit };
}

async function updateRole(userId, role, actorId) {
  return db.withTransaction(async (client) => {
    const found = await client.query(
      'SELECT id, role FROM profiles WHERE id = $1 FOR UPDATE',
      [userId]
    );
    const target = found.rows[0];
    if (!target) throw new AppError(404, 'User not found');
    if (target.role === 'ADMIN' && role !== 'ADMIN') {
      const admins = await client.query(
        `SELECT id FROM profiles WHERE role = 'ADMIN' ORDER BY id FOR UPDATE`
      );
      if (admins.rows.length <= 1 && target.id === actorId) {
        throw new AppError(422, 'The last administrator cannot demote their own account');
      }
    }
    const updated = await client.query(
      `UPDATE profiles SET role = $1
       WHERE id = $2
       RETURNING id, full_name, email, usn, role`,
      [role, userId]
    );
    return updated.rows[0];
  });
}

module.exports = { listUsers, updateRole };
