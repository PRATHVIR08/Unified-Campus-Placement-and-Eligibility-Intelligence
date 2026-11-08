require('../config/env');
const { createClient } = require('@supabase/supabase-js');
const db = require('../db/pool');
const AppError = require('../utils/AppError');

let supabase;

function getSupabase() {
  const { supabaseUrl, supabaseServiceKey } = require('../config/env');
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new AppError(500, 'Supabase authentication is not configured: set SUPABASE_URL and SUPABASE_SERVICE_KEY in backend/.env');
  }
  if (!supabase) supabase = createClient(supabaseUrl, supabaseServiceKey);
  return supabase;
}

async function requireAuth(req, res, next) {
  const match = (req.headers.authorization || '').match(/^Bearer\s+(\S+)$/i);
  if (!match) return next(new AppError(401, 'A Supabase bearer token is required'));

  try {
    const { data, error } = await getSupabase().auth.getUser(match[1]);
    if (error || !data.user) throw new AppError(401, 'Invalid or expired Supabase access token');

    const authUser = data.user;
    const metadata = authUser.user_metadata || {};
    const fullName = metadata.full_name || metadata.name || authUser.email || 'Student';
    const usn = typeof metadata.usn === 'string' && metadata.usn.trim()
      ? metadata.usn.trim().toUpperCase()
      : null;

    await db.query(
      `INSERT INTO profiles (id, full_name, email, usn, role)
       VALUES ($1, $2, $3, $4, 'STUDENT')
       ON CONFLICT (id) DO NOTHING`,
      [authUser.id, fullName, authUser.email || null, usn]
    );
    const result = await db.query(
      'SELECT id, email, role, full_name FROM profiles WHERE id = $1',
      [authUser.id]
    );
    if (!result.rows.length) throw new AppError(401, 'Authenticated profile could not be loaded');

    const profile = result.rows[0];
    req.user = {
      id: profile.id,
      email: profile.email,
      role: profile.role.toLowerCase(),
      fullName: profile.full_name,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = requireAuth;
