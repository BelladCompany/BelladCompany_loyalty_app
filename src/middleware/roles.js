/**
 * Enforces role-based access control (RBAC)
 * @param {string[]} allowedRoles Array of allowed role names (e.g. ['admin'], ['cashier', 'admin'])
 */
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'fail',
        error: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        error: `Forbidden: This resource requires one of the following roles: [${allowedRoles.join(', ')}]. Current role: '${req.user.role}'`,
      });
    }

    next();
  };
};

module.exports = requireRole;
