// PostgreSQL Connection Pool [P2]
// Responsibilities: Manage connection pooling to PostgreSQL/Supabase database

require('../config/env');
const { Pool } = require('pg');

// ---------------------------------------------------------------------------
// Detect whether SSL should be enabled.
// Rules (applied in order):
//   1. DB_SSL=true env flag forces SSL on (useful for non-URL config).
//   2. When DATABASE_URL is set, enable SSL when the host looks like Supabase
//      (*.supabase.co / *.supabase.com / *.pooler.supabase.com) OR when the
//      DB_SSL flag is set.
//   3. When individual DB_HOST vars are used, enable SSL for Supabase hosts.
// Always use rejectUnauthorized:false for Supabase because its pooler
// presents a self-signed cert chain that the default CA bundle rejects.
// ---------------------------------------------------------------------------
function detectSsl(hostOrUrl) {
  if (process.env.DB_SSL === 'true') return { rejectUnauthorized: false };
  if (!hostOrUrl) return undefined;
  if (/\.supabase\.(?:co|com)$/i.test(hostOrUrl)) return { rejectUnauthorized: false };
  return undefined;
}

// A short connection timeout makes failures fast and obvious.
// 10 s is enough for a healthy pooler; the direct IPv6 host will
// hit this instead of blocking for the OS default (~2 min).
const CONNECTION_TIMEOUT_MS = parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '10000', 10);

let poolConfig;
if (process.env.DATABASE_URL) {
  // Parse the host out of the URL so we can apply the SSL heuristic.
  let parsedHost = '';
  try {
    parsedHost = new URL(process.env.DATABASE_URL).hostname;
  } catch {
    // Malformed URL – fall through without a host match; DB_SSL still works.
  }
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: detectSsl(parsedHost),
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  };
} else if (process.env.DB_HOST) {
  poolConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'postgres',
    ssl: detectSsl(process.env.DB_HOST),
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  };
} else {
  poolConfig = {
    host: 'localhost',
    port: 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'campus_placement',
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Failed to roll back PostgreSQL transaction:', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  withTransaction,
};
