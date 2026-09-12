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

    // Role aliases: 'admin' and 'super_admin' are treated as top-level admins
    const userRole = req.user.role;
    const effectiveRoles = [userRole];
    if (userRole === 'super_admin') effectiveRoles.push('admin');
    if (userRole === 'admin') effectiveRoles.push('super_admin');

    const hasAccess = allowedRoles.some((role) => effectiveRoles.includes(role));

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
  const user = req.user || {};
  const userRole = user.role;
  const userBranchId = user.branch_id;

  // Branch manager is strictly scoped to their assigned branch
  if (userRole === 'branch_manager' && userBranchId) {
    return {
      branchId: userBranchId,
      isRestrictedToBranch: true,
    };
  }

  // Regional Admin, Admin, Super Admin can specify a branch_id or view all
  const requestedBranch = req.query?.branch_id || req.body?.branch_id || null;
  return {
    branchId: requestedBranch ? parseInt(requestedBranch, 10) : null,
    isRestrictedToBranch: false,
  };
};

requireRole.requireRole = requireRole;
requireRole.scopeBranchAccess = scopeBranchAccess;

module.exports = requireRole;
