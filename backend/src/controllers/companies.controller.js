const db = require('../db/pool');

exports.getAllCompanies = async (req, res, next) => {
  try {
    const result = await db.query('SELECT id, name, industry AS sector, website, contact_email, contact_name FROM companies ORDER BY name');
    return res.json({ success: true, data: result.rows.map((row) => ({ ...row, contactName: row.contact_name, contactEmail: row.contact_email })) });
  } catch (error) { return next(error); }
};

exports.createCompany = async (req, res, next) => {
  const { name, sector, industry, website, contactEmail, contactName } = req.body || {};
  if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ success: false, error: 'Company name is required' });
  if (website && !/^https?:\/\//i.test(website)) return res.status(400).json({ success: false, error: 'Website must be an http or https URL' });
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return res.status(400).json({ success: false, error: 'Contact email is invalid' });
  try {
    const result = await db.query(
      `INSERT INTO companies (name, industry, website, contact_email, contact_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, industry AS sector, website, contact_email, contact_name`,
      [name.trim(), (industry || sector || '').trim() || null, website || null, contactEmail || null, contactName || null]
    );
    return res.status(201).json({ success: true, data: { ...result.rows[0], contactName: result.rows[0].contact_name, contactEmail: result.rows[0].contact_email } });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ success: false, error: 'Company already exists' });
    return next(error);
  }
};

exports.getCompanyById = async (req, res, next) => {
  try {
    const result = await db.query('SELECT id, name, industry AS sector, website, contact_email, contact_name FROM companies WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Company not found' });
    return res.json({ success: true, data: result.rows[0] });
  } catch (error) { return next(error); }
};
