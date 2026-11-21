// Server Entry Point [P2]
// Responsibilities: Load environment config, connect to DB pool, start Express listener

const config = require('./src/config/env');
const app = require('./src/app');
const db = require('./src/db/pool');

const PORT = config.port;

// ---------------------------------------------------------------------------
// Startup DB connectivity check — runs once after the server begins listening.
// A failure is printed clearly (with IPv6/pooler hints) but does NOT crash the
// process; requests that reach the DB will get a 503 via the error handler.
// ---------------------------------------------------------------------------
async function checkDatabaseConnection() {
  try {
    await db.query('SELECT 1');
    console.log('[DB] ✓ Database connection verified (SELECT 1 passed).');
  } catch (err) {
    const isTimeout = err.code === 'ETIMEDOUT' || /timed?\s*out/i.test(err.message || '');
    console.error('[DB] ✗ Could not reach the database on startup.');
    console.error(`    Error code : ${err.code || '(none)'}`);
    console.error(`    Message    : ${err.message}`);
    if (isTimeout) {
      console.error('');
      console.error('  HINT — connection timed out. Common causes:');
      console.error('    • DATABASE_URL points to db.<ref>.supabase.co (direct host).');
      console.error('      That host is IPv6-only. Networks without IPv6 (e.g. most home');
      console.error('      routers) will never reach it.');
      console.error('    • Switch to the Supabase Session Pooler URL:');
      console.error('        postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres');
      console.error('      Copy it from: Supabase Dashboard → Settings → Database → Connection string');
      console.error('      Select "Session mode" (port 5432), not Transaction mode.');
      console.error('    • To test connectivity without code changes, try a phone hotspot');
      console.error('      (which typically provides IPv4+IPv6 dual-stack).');
    }
  }
}

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  if (!config.geminiApiKey) {
    console.warn('[CHATBOT] GEMINI_API_KEY is not configured; /api/chatbot/ask will return 503.');
  }
  void checkDatabaseConnection();
});
