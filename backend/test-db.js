require('dotenv').config();
const { Pool } = require('pg');

console.log('Connecting with:');
console.log('  host:', process.env.DB_HOST);
console.log('  port:', process.env.DB_PORT);
console.log('  user:', process.env.DB_USER);
console.log('  database:', process.env.DB_NAME);
console.log('  password length:', (process.env.DB_PASSWORD || '').length);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

pool.query('SELECT current_user, current_database()')
  .then(r => { console.log('SUCCESS:', r.rows[0]); process.exit(0); })
  .catch(e => { console.error('FAIL:', e.message); process.exit(1); });
