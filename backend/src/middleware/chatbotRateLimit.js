const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 15;
const requestsByUser = new Map();

module.exports = (req, res, next) => {
  const now = Date.now();
  const requests = (requestsByUser.get(req.user.id) || [])
    .filter((timestamp) => now - timestamp < WINDOW_MS);

  if (requests.length >= MAX_REQUESTS) {
    requestsByUser.set(req.user.id, requests);
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  requests.push(now);
  requestsByUser.set(req.user.id, requests);

  for (const [userId, timestamps] of requestsByUser) {
    if (!timestamps.some((timestamp) => now - timestamp < WINDOW_MS)) {
      requestsByUser.delete(userId);
    }
  }

  return next();
};
