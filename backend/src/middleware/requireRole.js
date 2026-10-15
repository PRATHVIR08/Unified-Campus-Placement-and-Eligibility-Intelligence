// Role-based Authorization Middleware [P2]
// Responsibilities: Enforce allowed roles (e.g. 'officer', 'student', 'admin')

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Access restricted to roles: ${allowedRoles.join(', ')}`,
      });
    }
    next();
  };
};

module.exports = requireRole;
