// PostgreSQL Connection Pool [P2]
// Responsibilities: Manage connection pooling to PostgreSQL/Supabase database

const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;
const pool = new Pool(
  databaseUrl
    ? {
        connectionString: databaseUrl,
        // Let pg honor sslmode=require in hosted DATABASE_URL values. Local
        // PostgreSQL URLs without sslmode continue to use the default (plain) connection.
        ...(process.env.NODE_ENV === 'production' ? { ssl: { rejectUnauthorized: false } } : {}),
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'campus_placement',
      }
);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
