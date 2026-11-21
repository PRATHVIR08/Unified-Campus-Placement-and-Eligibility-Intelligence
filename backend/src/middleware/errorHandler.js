const AppError = require('../utils/AppError');

// Network / connection error codes emitted by the 'pg' driver and Node.js net stack.
const DB_CONNECTION_CODES = new Set([
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'CONNECTION_TERMINATED', // pg pool: client released before query finished
]);

function isDbConnectionError(err) {
  if (!err) return false;
  if (DB_CONNECTION_CODES.has(err.code)) return true;
  // pg also sets err.errno for some system errors
  if (err.errno && DB_CONNECTION_CODES.has(err.errno)) return true;
  // Some pg versions surface it as a message string
  if (typeof err.message === 'string' && /connect\s+ETIMEDOUT|connection\s+timed?\s*out/i.test(err.message)) return true;
  return false;
}

const errorHandler = (err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON request body' });
  }

  // --- Database connectivity: return 503, never leak internals ---
  if (isDbConnectionError(err)) {
    console.error('[DB] Connection error (returning 503):', err.code || err.message, err.stack || '');
    return res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
  }

  let status = err instanceof AppError ? err.status : 500;
  let message = err instanceof AppError ? err.message : 'Internal Server Error';

  if (err.code === '23505') {
    status = 409;
    message = 'A record with these values already exists';
  } else if (err.code === '23503') {
    status = 409;
    message = 'A related record does not exist or is still in use';
  } else if (err.code === '23514') {
    status = 400;
    message = 'The request violates a data constraint';
  } else if (!(err instanceof AppError)) {
    console.error('Unhandled Application Error:', err);
  }

  return res.status(status).json({
    error: message,
    ...(err instanceof AppError && err.details ? err.details : {}),
  });
};

module.exports = errorHandler;
