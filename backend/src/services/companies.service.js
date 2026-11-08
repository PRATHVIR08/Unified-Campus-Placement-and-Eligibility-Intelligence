const db = require('../db/pool');
const AppError = require('../utils/AppError');

const COMPANY_COLUMNS = `id, name, industry AS sector, website, contact_email, contact_name`;

async function list() {
  const result = await db.query(`SELECT ${COMPANY_COLUMNS} FROM companies ORDER BY name`);
  return result.rows;
}

async function getById(companyId) {
  const result = await db.query(`SELECT ${COMPANY_COLUMNS} FROM companies WHERE id = $1`, [companyId]);
  return result.rows[0] || null;
}

function assertCanManage(company, user) {
  if (!['officer', 'admin', 'recruiter'].includes(user.role)) {
    throw new AppError(403, 'Only officers, admins, or recruiters can manage companies');
  }
  if (user.role === 'recruiter' && company.owner_id !== user.id) {
    throw new AppError(403, 'Recruiters can manage only their own companies');
  }
}

async function create(input, user) {
  assertCanManage({ owner_id: user.id }, user);
  const result = await db.query(
    `INSERT INTO companies (name, industry, website, contact_email, contact_name, owner_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COMPANY_COLUMNS}`,
    [input.name, input.industry || input.sector || null, input.website || null,
      input.contactEmail || null, input.contactName || null,
      user.role === 'recruiter' ? user.id : null]
  );
  return result.rows[0];
}

async function update(companyId, input, user) {
  return db.withTransaction(async (client) => {
    const found = await client.query('SELECT id, owner_id FROM companies WHERE id = $1 FOR UPDATE', [companyId]);
    if (!found.rows.length) throw new AppError(404, 'Company not found');
    assertCanManage(found.rows[0], user);

    const normalizedInput = { ...input, industry: input.industry ?? input.sector };
    const columns = {
      name: 'name',
      industry: 'industry',
      website: 'website',
      contactEmail: 'contact_email',
      contactName: 'contact_name',
    };
    const assignments = [];
    const values = [];
    for (const [field, column] of Object.entries(columns)) {
      if (normalizedInput[field] === undefined) continue;
      values.push(normalizedInput[field]);
      assignments.push(`${column} = $${values.length}`);
    }
    values.push(companyId);
    const updated = await client.query(
      `UPDATE companies SET ${assignments.join(', ')} WHERE id = $${values.length}
       RETURNING ${COMPANY_COLUMNS}`,
      values
    );
    return updated.rows[0];
  });
}

async function remove(companyId, user) {
  return db.withTransaction(async (client) => {
    const found = await client.query('SELECT id, owner_id FROM companies WHERE id = $1 FOR UPDATE', [companyId]);
    if (!found.rows.length) throw new AppError(404, 'Company not found');
    assertCanManage(found.rows[0], user);
    await client.query('DELETE FROM companies WHERE id = $1', [companyId]);
  });
}

module.exports = { list, getById, create, update, remove };
