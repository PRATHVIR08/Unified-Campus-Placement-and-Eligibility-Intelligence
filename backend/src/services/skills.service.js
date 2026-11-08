const db = require('../db/pool');

async function list() {
  const result = await db.query('SELECT id, name FROM skills ORDER BY name');
  return result.rows;
}

module.exports = { list };
