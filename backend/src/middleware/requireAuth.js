const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const db = require('../db/pool');

let supabase;
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key || !/^https:\/\//i.test(url) || /your-project|placeholder/i.test(url) || /your-|placeholder/i.test(key)) return null;
  if (!supabase) supabase = createClient(url, key);
  return supabase;
}

async function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    return res.status(401).json({ success: false, error: 'Bearer token required' });
  }

  try {
    const token = match[1];
    let identity;

    // The current backend login issues local JWTs. Otherwise validate the access
    // token with Supabase. Role is always loaded from PostgreSQL below.
    if (process.env.JWT_SECRET && !/your_|change_in_production|placeholder/i.test(process.env.JWT_SECRET)) {
      try {
        const claims = jwt.verify(token, process.env.JWT_SECRET);
        if (claims.id) identity = { id: claims.id };
      } catch (_) { /* Supabase access token may be the supplied token. */ }
    }

    if (!identity) {
      const verified = await verifySupabaseUser(token);
      if (!verified.user) return res.status(verified.status).json({ success: false, error: verified.message });
      identity = { id: verified.user.id };
    }

    const result = await db.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [identity.id]
    );
    if (!result.rows.length) {
      return res.status(401).json({ success: false, error: 'Account is not registered in this application' });
    }
    req.user = result.rows[0];
    return next();
  } catch (error) {
    return next(error);
  }
}

async function verifySupabaseUser(token) {
  const client = getSupabase();
  if (!client) return { status: 503, message: 'Supabase authentication is not configured' };
  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return { status: 401, message: 'Invalid or expired Supabase access token' };
    return { user: data.user };
  } catch (error) {
    return { status: 503, message: 'Supabase authentication could not be reached' };
  }
}

async function requireSupabaseAuth(req, res, next) {
  const match = (req.headers.authorization || '').match(/^Bearer\s+(\S+)$/i);
  if (!match) return res.status(401).json({ success: false, error: 'Bearer token required' });
  const verified = await verifySupabaseUser(match[1]);
  if (!verified.user) return res.status(verified.status).json({ success: false, error: verified.message });
  req.authUser = verified.user;
  return next();
}

module.exports = requireAuth;
module.exports.requireSupabaseAuth = requireSupabaseAuth;
