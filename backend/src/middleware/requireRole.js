// Role-based Authorization Middleware [P2]
// Responsibilities: Enforce allowed roles (e.g. 'officer', 'student', 'admin')

const requireRole = (...allowedRoles) => {
  const normalizedAllowedRoles = allowedRoles.map((role) => role.toLowerCase());
  return (req, res, next) => {
    if (!req.user || !normalizedAllowedRoles.includes(req.user.role.toLowerCase())) {
      const AppError = require('../utils/AppError');
      return next(new AppError(403, `Access restricted to roles: ${allowedRoles.join(', ')}`));
    }
    return next();
  };
};

module.exports = requireRole;
