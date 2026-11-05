import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Crown,
  Building,
  Key,
  Lock,
  Eye,
  EyeOff,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ChevronRight,
  UserCheck,
  Briefcase,
  Trash2,
  Copy,
  Check,
  X,
} from 'lucide-react';
import ApiService from '../services/api';

export const UserManagementScreen = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [toast, setToast] = useState(null);

  // Create User Form State
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [newUser, setNewUser] = useState({
    username: '',
    password: 'Cashier@123',
    role: 'cashier',
    branch_id: '',
  });

  // Reset Password Modal State
  const [resetModalUser, setResetModalUser] = useState(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetShowPassword, setResetShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [copiedReset, setCopiedReset] = useState(false);

  // Delete User Modal State
  const [deleteModalUser, setDeleteModalUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [usersRes, branchesRes] = await Promise.all([
        ApiService.getMasterUsers(),
        ApiService.getBranches().catch(() => ({ data: [] })),
      ]);

      const loadedUsers = usersRes?.data || [];
      const loadedBranches = branchesRes?.data || [];

      setUsers(loadedUsers);
      setBranches(loadedBranches);

      if (!newUser.branch_id && loadedBranches.length > 0) {
        // Default to Belgaum if available, or first branch
        const belgaum = loadedBranches.find(
          (b) =>
            (b.name || b.branch_name || '').toLowerCase().includes('belgaum') ||
            (b.address || b.city || b.branch_city || '').toLowerCase().includes('belgaum')
        );
        setNewUser((prev) => ({
          ...prev,
          branch_id: belgaum ? belgaum.id || belgaum.branch_id : loadedBranches[0].id || loadedBranches[0].branch_id,
        }));
      }
    } catch (err) {
      showToast(err.message || 'Failed to load user access list.', true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1-Click Role Switch
  const handleRoleSwitch = async (targetUser, newRole) => {
    const userId = targetUser.id || targetUser.user_id;
    if (targetUser.role === newRole) return;

    try {
      await ApiService.updateMasterUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => ((u.id || u.user_id) === userId ? { ...u, role: newRole } : u))
      );
      showToast(`Updated '${targetUser.username}' role to ${newRole.toUpperCase()} successfully.`);
    } catch (err) {
      showToast(err.message || 'Failed to update user role.', true);
    }
  };

  // 1-Click Branch Switch
  const handleBranchSwitch = async (targetUser, newBranchId) => {
    const userId = targetUser.id || targetUser.user_id;
    const parsedId = Number(newBranchId) || null;

    try {
      await ApiService.updateMasterUserBranch(userId, parsedId);
      const matchedBranch = branches.find((b) => String(b.id || b.branch_id) === String(parsedId));
      const branchName = matchedBranch ? matchedBranch.name || matchedBranch.branch_name : 'Assigned branch';

      setUsers((prev) =>
        prev.map((u) =>
          (u.id || u.user_id) === userId
            ? { ...u, branch_id: parsedId, branch_name: branchName }
            : u
        )
      );
      showToast(`Updated '${targetUser.username}' dealership branch to '${branchName}'.`);
    } catch (err) {
      showToast(err.message || 'Failed to update user branch.', true);
    }
  };

  // Create New User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!newUser.username.trim()) {
      setFormError('Username is required.');
      return;
    }

    if (!newUser.password.trim() || newUser.password.length < 4) {
      setFormError('Password must be at least 4 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedBranchId = Number(newUser.branch_id) || branches[0]?.id || 1;
      await ApiService.createMasterUser({
        username: newUser.username.trim().toLowerCase(),
        password: newUser.password.trim(),
        role: newUser.role,
        branch_id: selectedBranchId,
      });

      showToast(`Staff member '${newUser.username}' created successfully with role ${newUser.role.toUpperCase()}.`);
      setShowCreateCard(false);
      setNewUser({
        username: '',
        password: 'Cashier@123',
        role: 'cashier',
        branch_id: selectedBranchId,
      });
      await loadData(true);
    } catch (err) {
      setFormError(err.message || 'Failed to create user. Please check credentials or network.');
      showToast(err.message || 'Failed to create user.', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Reset Password Modal
  const handleOpenResetModal = (targetUser) => {
    setResetModalUser(targetUser);
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    setResetPasswordInput(`Bellad@${randomDigits}`);
    setResetShowPassword(false);
    setResetError('');
    setCopiedReset(false);
  };

  // Generate Random Password
  const handleGeneratePassword = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    setResetPasswordInput(`Bellad@${randomDigits}`);
    setCopiedReset(false);
  };

  // Submit Password Reset
  const handleConfirmResetPassword = async (e) => {
    e.preventDefault();
    if (!resetModalUser) return;
    if (!resetPasswordInput.trim() || resetPasswordInput.trim().length < 4) {
      setResetError('Password must be at least 4 characters long.');
      return;
    }

    setIsResetting(true);
    setResetError('');
    try {
      const uid = resetModalUser.id || resetModalUser.user_id;
      await ApiService.resetMasterUserPassword(uid, resetPasswordInput.trim());
      showToast(`Password for '${resetModalUser.username}' reset successfully!`);
      setResetModalUser(null);
    } catch (err) {
      setResetError(err.message || 'Failed to reset password.');
    } finally {
      setIsResetting(false);
    }
  };

  // Copy Reset Password
  const handleCopyPassword = () => {
    if (!resetPasswordInput) return;
    navigator.clipboard.writeText(resetPasswordInput);
    setCopiedReset(true);
    setTimeout(() => setCopiedReset(false), 2000);
  };

  // Open Delete User Modal
  const handleOpenDeleteModal = (targetUser) => {
    const isCurrentLoggedUser = (user?.username || '').toLowerCase() === (targetUser.username || '').toLowerCase();
    if (isCurrentLoggedUser) {
      showToast('You cannot delete your own logged-in user account.', true);
      return;
    }
    if (['admin', 'director'].includes((targetUser.username || '').toLowerCase())) {
      showToast(`Root system account '${targetUser.username}' cannot be deleted.`, true);
      return;
    }
    setDeleteModalUser(targetUser);
    setDeleteError('');
  };

  // Submit Delete User
  const handleConfirmDeleteUser = async () => {
    if (!deleteModalUser) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const uid = deleteModalUser.id || deleteModalUser.user_id;
      await ApiService.deleteMasterUser(uid);
      setUsers((prev) => prev.filter((u) => (u.id || u.user_id) !== uid));
      showToast(`User '${deleteModalUser.username}' has been removed successfully.`);
      setDeleteModalUser(null);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete user.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter & Search computation
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (roleFilter !== 'ALL') {
        if (roleFilter === 'cashier' && u.role !== 'cashier') return false;
        if (roleFilter === 'manager' && u.role !== 'manager' && u.role !== 'branch_manager') return false;
        if (roleFilter === 'admin' && u.role !== 'admin' && u.role !== 'super_admin' && u.role !== 'regional_admin') return false;
        if (roleFilter === 'director' && u.role !== 'director') return false;
      }

      // Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesUsername = (u.username || '').toLowerCase().includes(q);
        const matchesRole = (u.role || '').toLowerCase().includes(q);
        const matchesBranch = (u.branch_name || '').toLowerCase().includes(q) || (u.branch_city || '').toLowerCase().includes(q);
        return matchesUsername || matchesRole || matchesBranch;
      }

      return true;
    });
  }, [users, roleFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = users.length;
    const cashiers = users.filter((u) => u.role === 'cashier').length;
    const managers = users.filter((u) => u.role === 'manager' || u.role === 'branch_manager').length;
    const admins = users.filter((u) => u.role === 'admin' || u.role === 'super_admin' || u.role === 'director').length;
    return { total, cashiers, managers, admins };
  }, [users]);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'director':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-200">
            <Crown className="w-3 h-3 text-amber-600" />
            Director
          </span>
        );
      case 'admin':
      case 'super_admin':
      case 'regional_admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-indigo-50 text-indigo-800 border border-indigo-200">
            <ShieldCheck className="w-3 h-3 text-indigo-600" />
            Admin
          </span>
        );
      case 'branch_manager':
      case 'manager':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-purple-50 text-purple-800 border border-purple-200">
            <Briefcase className="w-3 h-3 text-purple-600" />
            Manager
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
            <UserCheck className="w-3 h-3 text-emerald-600" />
            Cashier
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold transition-all animate-bounce ${
            toast.isError
              ? 'bg-rose-900 text-white border-rose-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {toast.isError ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── 1. Top Executive Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl sm:rounded-4xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                Executive Access Control
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-400/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Branch Counter Sync
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              User &amp; Staff Access Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Create counter cashiers, branch managers, or directors with custom passwords, assigned home branches, and instant 1-click role switching. When a cashier logs in, their assigned branch automatically pre-selects during receipt generation.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition border border-white/10 cursor-pointer disabled:opacity-50"
              title="Refresh Staff List"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setShowCreateCard((prev) => !prev)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs sm:text-sm font-black shadow-lg shadow-indigo-500/25 transition active:scale-98 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              {showCreateCard ? 'Hide Form' : '+ Create New User'}
            </button>
          </div>
        </div>

        {/* Glanceable KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Staff Accounts</span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono">{stats.total}</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Active Cashiers</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">{stats.cashiers}</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Branch Managers</span>
            <span className="text-xl sm:text-2xl font-black text-purple-300 font-mono">{stats.managers}</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Admins &amp; Directors</span>
            <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono">{stats.admins}</span>
          </div>
        </div>
      </div>

      {/* ── 2. Create User Card (Toggled) ── */}
      {showCreateCard && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-indigo-100 shadow-xl shadow-indigo-500/5 animate-fadeIn">
          <div className="flex items-center justify-between pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">Create New Staff Account</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Provide credentials, assign role authority, and designate their home dealership branch.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateCard(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateUser} className="mt-6 space-y-5">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. cashier_belgaum"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full h-11 px-3.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter secure password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full h-11 pl-3.5 pr-10 text-xs font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Assigned Role *
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full h-11 px-3.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition cursor-pointer"
                >
                  <option value="cashier">CASHIER (Counter POS &amp; Redemptions)</option>
                  <option value="branch_manager">BRANCH MANAGER (Supervisor Approvals)</option>
                  <option value="admin">ADMIN (Full System Administration)</option>
                  <option value="director">DIRECTOR (Executive Intelligence Suite)</option>
                </select>
              </div>

              {/* Dealership Branch */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Home Dealership Branch *
                </label>
                <select
                  value={newUser.branch_id}
                  onChange={(e) => setNewUser({ ...newUser, branch_id: e.target.value })}
                  className="w-full h-11 px-3.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id || b.branch_id} value={b.id || b.branch_id}>
                      {b.name || b.branch_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium">
                Tip: When this cashier records an invoice, this dealership outlet will auto-populate automatically.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateCard(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 transition active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Create Staff Account
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── 3. Filters & Search Strip ── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by username, role, or branch (e.g. Belgaum, Hubli)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
          />
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: `All Staff (${users.length})` },
            { id: 'cashier', label: `Cashiers (${stats.cashiers})` },
            { id: 'manager', label: `Managers (${stats.managers})` },
            { id: 'admin', label: `Admins (${stats.admins})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRoleFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                roleFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. Main User List & 1-Click Role Switch Table ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
            <p>Loading staff users and dealership outlets...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs space-y-2">
            <Users className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-bold text-slate-700">No staff accounts match your search or filter.</p>
            <p className="text-[11px] text-slate-400">Try clearing the search query or adding a new staff account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-6 py-4">Staff Member</th>
                  <th className="px-6 py-4">Current Authority</th>
                  <th className="px-6 py-4">Assigned Dealership Branch</th>
                  <th className="px-6 py-4">1-Click Role Switch</th>
                  <th className="px-6 py-4 text-center">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredUsers.map((u) => {
                  const uid = u.id || u.user_id;
                  const isCurrentLoggedUser = (user?.username || '').toLowerCase() === (u.username || '').toLowerCase();

                  return (
                    <tr key={uid} className="hover:bg-slate-50/70 transition">
                      {/* Identity */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-xs uppercase shrink-0">
                            {u.username?.slice(0, 2) || 'ST'}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                              <span>{u.username}</span>
                              {isCurrentLoggedUser && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              UID #{uid} {u.created_at ? `• Added ${new Date(u.created_at).toLocaleDateString('en-IN')}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Current Role Badge */}
                      <td className="px-6 py-4">
                        {getRoleBadge(u.role)}
                      </td>

                      {/* Assigned Dealership Branch Dropdown */}
                      <td className="px-6 py-4">
                        <div className="space-y-1 max-w-xs">
                          <select
                            value={String(u.branch_id || '')}
                            onChange={(e) => handleBranchSwitch(u, e.target.value)}
                            className="w-full h-8 px-2.5 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-600 transition cursor-pointer"
                          >
                            <option value="">No Branch Assigned</option>
                            {branches.map((b) => (
                              <option key={b.id || b.branch_id} value={String(b.id || b.branch_id)}>
                                {b.name || b.branch_name}
                              </option>
                            ))}
                          </select>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {u.branch_name ? `Outlet: ${u.branch_name}` : 'Unassigned Outlet'}
                          </span>
                        </div>
                      </td>

                      {/* 1-Click Role Switch Action Strip */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {[
                            { role: 'cashier', label: 'Cashier' },
                            { role: 'branch_manager', label: 'Manager' },
                            { role: 'admin', label: 'Admin' },
                            { role: 'director', label: 'Director' },
                          ].map((btn) => {
                            const isMatch =
                              u.role === btn.role ||
                              (btn.role === 'branch_manager' && u.role === 'manager') ||
                              (btn.role === 'admin' && (u.role === 'super_admin' || u.role === 'regional_admin'));

                            return (
                              <button
                                key={btn.role}
                                type="button"
                                onClick={() => handleRoleSwitch(u, btn.role)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                                  isMatch
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                                title={`Switch ${u.username} to ${btn.label}`}
                              >
                                {btn.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* Manage Actions: Reset Password & Delete */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenResetModal(u)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
                            title={`Reset password for ${u.username}`}
                          >
                            <Key className="w-3.5 h-3.5 text-amber-600" />
                            <span>Reset Pwd</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(u)}
                            disabled={isCurrentLoggedUser || ['admin', 'director'].includes((u.username || '').toLowerCase())}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition shadow-2xs ${
                              isCurrentLoggedUser || ['admin', 'director'].includes((u.username || '').toLowerCase())
                                ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-60'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 cursor-pointer active:scale-95'
                            }`}
                            title={
                              isCurrentLoggedUser
                                ? 'Cannot delete yourself'
                                : ['admin', 'director'].includes((u.username || '').toLowerCase())
                                ? 'Root account protected'
                                : `Delete user ${u.username}`
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 5. Reset Password Modal ── */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Reset Staff Password</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    User: <span className="font-bold text-slate-800">@{resetModalUser.username}</span> ({resetModalUser.role?.toUpperCase()})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={resetShowPassword ? 'text' : 'password'}
                    value={resetPasswordInput}
                    onChange={(e) => setResetPasswordInput(e.target.value)}
                    placeholder="Enter or generate new password"
                    className="w-full h-11 pl-3.5 pr-20 text-sm font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                    autoFocus
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setResetShowPassword(!resetShowPassword)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                      title={resetShowPassword ? 'Hide password' : 'Show password'}
                    >
                      {resetShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                      title="Copy password to clipboard"
                    >
                      {copiedReset ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Generate Random Password</span>
                  </button>
                  {copiedReset && (
                    <span className="text-xs font-bold text-emerald-600 animate-fadeIn">Copied to clipboard!</span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
                <p className="font-bold">⚠️ Note for Admin / Director:</p>
                <p>
                  Share this new password with <strong>@{resetModalUser.username}</strong> immediately. They can log in right away using these credentials.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  disabled={isResetting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isResetting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>Confirm Reset Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. Delete User Confirmation Modal ── */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete User Account</h3>
                <p className="text-xs text-slate-500 font-medium">Permanent staff access revocation</p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Staff Account</span>
                <span className="font-mono font-bold text-slate-900">@{deleteModalUser.username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Current Role</span>
                <span className="font-bold uppercase text-slate-800">{deleteModalUser.role}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Assigned Branch</span>
                <span className="font-bold text-slate-800">{deleteModalUser.branch_name || 'No Branch'}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove <strong>@{deleteModalUser.username}</strong>? Their login session will be invalidated immediately. All audit history and ledger entries linked to this user will be safely preserved.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deleting Account...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Delete User</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementScreen;

