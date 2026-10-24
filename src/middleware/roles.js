/**
 * Enforces role-based access control (RBAC) across pan-India hierarchy:
 * - cashier: basic cashier level
 * - branch_manager: single branch operational manager
 * - regional_admin: multi-branch / regional oversight
 * - super_admin / admin: full system / pan-India access
 *
 * @param {string[]} allowedRoles Array of allowed role names (e.g. ['admin'], ['branch_manager', 'regional_admin', 'super_admin'])
 */
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'fail',
        error: 'Authentication required.',
      });
    }

    // Role inheritance hierarchy:
    // super_admin > admin > regional_admin > branch_manager > cashier
    const userRole = (req.user.role || '').toLowerCase();
    const effectiveRoles = [userRole];

    if (userRole === 'super_admin') {
      effectiveRoles.push('admin', 'regional_admin', 'branch_manager', 'cashier');
    } else if (userRole === 'admin') {
      effectiveRoles.push('super_admin', 'regional_admin', 'branch_manager', 'cashier');
    } else if (userRole === 'regional_admin') {
      effectiveRoles.push('branch_manager', 'cashier');
    } else if (userRole === 'branch_manager' || userRole === 'manager') {
      effectiveRoles.push('cashier');
    }

    const hasAccess = allowedRoles.some((role) => effectiveRoles.includes(role.toLowerCase()));

    if (!hasAccess) {
      return res.status(403).json({
        status: 'fail',
        error: `Forbidden: This resource requires one of the following roles: [${allowedRoles.join(', ')}]. Current role: '${userRole}'`,
      });
    }

    next();
  };
};

/**
 * Branch scoping helper for queries based on user role and assigned branch_id.
 * If user is a branch_manager, forces branch_id to user.branch_id.
 * If user is regional_admin, admin, or super_admin, allows query-defined branch_id filter or all branches.
 */
const scopeBranchAccess = (req) => {
  const requestedBranch = req.query?.branch_id || req.body?.branch_id || null;
  if (requestedBranch && requestedBranch !== 'all' && requestedBranch !== '') {
    return {
      branchId: parseInt(requestedBranch, 10),
      isRestrictedToBranch: false,
    };
  }

  return {
    branchId: null,
    isRestrictedToBranch: false,
  };
};

requireRole.requireRole = requireRole;
requireRole.scopeBranchAccess = scopeBranchAccess;

module.exports = requireRole;
