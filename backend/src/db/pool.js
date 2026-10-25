// PostgreSQL Connection Pool [P2]
// Responsibilities: Manage connection pooling to PostgreSQL/Supabase database

const { Pool } = require('pg');

// Prefer individual params over DATABASE_URL when DB_HOST is set.
// The pg driver mis-parses Supabase's "postgres.PROJECT_REF" username from a URL.
const isSupabase = process.env.DB_HOST && /\.supabase\.(?:co|com)$/i.test(process.env.DB_HOST);

let poolConfig;
if (process.env.DB_HOST) {
  poolConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'postgres',
    ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
  };
} else if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  };
} else {
  poolConfig = {
    host: 'localhost',
    port: 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'campus_placement',
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
