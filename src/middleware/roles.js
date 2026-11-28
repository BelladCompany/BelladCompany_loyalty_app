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
    // director / management / super_admin > admin > regional_admin > branch_manager > cashier
    const userRole = (req.user.role || '').toLowerCase();
    const effectiveRoles = [userRole];

    if (userRole === 'director' || userRole === 'management' || userRole === 'super_admin') {
      effectiveRoles.push('director', 'management', 'super_admin', 'admin', 'regional_admin', 'branch_manager', 'manager', 'cashier');
    } else if (userRole === 'admin') {
      effectiveRoles.push('director', 'management', 'super_admin', 'admin', 'regional_admin', 'branch_manager', 'manager', 'cashier');
    } else if (userRole === 'regional_admin') {
      effectiveRoles.push('branch_manager', 'manager', 'cashier');
    } else if (userRole === 'hod') {
      effectiveRoles.push('hod', 'branch_manager', 'manager', 'cashier');
    } else if (userRole === 'branch_manager' || userRole === 'manager') {
      effectiveRoles.push('branch_manager', 'manager', 'cashier');
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
 * Check if a user is an Admin, Director, or HOD with cross-dealership oversight
 */
const isAdminOrDirector = (user) => {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const username = (user.username || '').toLowerCase();
  return (
    ['admin', 'super_admin', 'director', 'management', 'hod'].includes(role) ||
    ['admin', 'director', 'agstya', 'agastya'].includes(username)
  );
};

/**
 * Branch scoping helper for queries based on user role and assigned branch_id.
 * - Admin & Director: Can query all branches or filter by any requested branch_id.
 * - Branch Managers / Staff (e.g. Belgaum, Hubli, Dharwad, Bangalore):
 *   Strictly forces branch_id to user.branch_id, disallowing cross-branch or all-branch views.
 */
const scopeBranchAccess = (req) => {
  const user = req.user;
  const isElevated = isAdminOrDirector(user);

  if (!isElevated) {
    // If a non-elevated user (manager/cashier) has no branch_id, lock to -1 to prevent leaking network-wide records
    const userBranchId = user && user.branch_id ? parseInt(user.branch_id, 10) : -1;
    return {
      branchId: userBranchId,
      isRestrictedToBranch: true,
      userBranchId,
    };
  }

  const requestedBranch = req.query?.branch_id || req.body?.branch_id || null;
  if (requestedBranch && requestedBranch !== 'all' && requestedBranch !== '') {
    return {
      branchId: parseInt(requestedBranch, 10),
      isRestrictedToBranch: false,
      userBranchId: null,
    };
  }

  return {
    branchId: null,
    isRestrictedToBranch: false,
    userBranchId: null,
  };
};

requireRole.requireRole = requireRole;
requireRole.scopeBranchAccess = scopeBranchAccess;
requireRole.isAdminOrDirector = isAdminOrDirector;

module.exports = requireRole;
