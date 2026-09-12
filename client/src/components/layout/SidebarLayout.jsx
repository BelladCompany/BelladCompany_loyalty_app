import React, { useState } from 'react';
import {
  Search,
  LayoutDashboard,
  Gift,
  Users,
  ShieldCheck,
  LogOut,
  Store,
  CheckCircle2,
  Menu,
  X,
  BarChart3,
  Settings,
  FileText,
} from 'lucide-react';

/**
 * High-contrast, left-hand POS sidebar layout with role-based visibility.
 * Desktop: fixed sidebar column. Mobile: off-canvas drawer toggled from the header.
 *
 * ROLE RULES:
 * - cashier          → Search Customer only (actions embedded in Customer360View)
 * - branch_manager / regional_admin → Search + Reports + KYC Approvals + Referrals
 * - admin / super_admin             → All of the above + Admin Tools
 */
export const SidebarLayout = ({
  activeTab = 'search',
  onTabChange,
  user = { username: 'cashier', role: 'cashier', branch_code: 'BLR-01', tenant_id: 'BAC-MAIN' },
  onLogout,
  children,
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isCashier = user?.role === 'cashier';
  const isManagerOrAdmin = ['admin', 'super_admin', 'regional_admin', 'branch_manager'].includes(user?.role);
  const isAdmin = ['admin', 'super_admin'].includes(user?.role);

  // ── Cashier: minimal nav — search is the only entry point ──────────────────
  const cashierNav = [
    { id: 'dashboard', label: 'Search Customer', icon: Search },
  ];

  // ── Manager / Admin: full nav ───────────────────────────────────────────────
  const managerNav = [
    { id: 'dashboard', label: 'Search Customer', icon: LayoutDashboard },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'kyc_approvals', label: 'KYC Approvals', icon: ShieldCheck },
    { id: 'corrections_queue', label: 'Corrections Queue', icon: FileText },
    { id: 'referrals', label: 'Referrals', icon: Users },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin Tools', icon: Settings, adminOnly: true }] : []),
  ];

  const navItems = isCashier ? cashierNav : managerNav;

  const closeMobileNav = () => setMobileNavOpen(false);

  const isNavActive = (item) =>
    activeTab === item.id || (item.id === 'dashboard' && (activeTab === 'search' || activeTab === 'redemptions'));

  const SidebarContent = ({ handleNavigate, handleLogout }) => (
    <>
      {/* Brand Header */}
      <div className="flex flex-col min-h-0 flex-1">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800 bg-slate-950 flex-shrink-0">
          <img
            src="/bellad-logo.png"
            alt="Bellad Logo"
            className="h-9 w-9 object-contain bg-white/10 p-1 rounded-md flex-shrink-0"
          />
          <div className="flex flex-col">
            <span className="font-bold text-base text-white tracking-wide">BAC Loyalty</span>
            <span className="text-xs font-mono font-medium text-slate-400">Dealership Portal</span>
          </div>
        </div>

        {/* Role Pill */}
        <div className="px-4 py-2.5 border-b border-slate-800/60 flex-shrink-0">
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full ${
            isCashier
              ? 'bg-brand-orange/15 text-brand-orange border border-brand-orange/30'
              : isAdmin
              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
              : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
            {user?.role?.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 flex-shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavActive(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  handleNavigate(item.id);
                  closeMobileNav();
                }}
                className={`
                  w-full min-h-[44px] h-12 px-4 rounded-lg flex items-center gap-3.5 text-sm font-bold transition-all text-left
                  ${isActive
                    ? 'bg-brand-orange text-white shadow-orange-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
                {item.adminOnly && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 font-bold rounded border border-purple-500/30">
                    ADMIN
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Cashier contextual tip */}
        {isCashier && (
          <div className="mx-3 p-3 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-slate-400 leading-relaxed">
            <span className="font-bold text-slate-300 block mb-1">💡 Quick Actions</span>
            After searching a customer, use the inline buttons to:
            <ul className="mt-1.5 space-y-0.5 text-slate-500">
              <li>• Earn Points (service/sale)</li>
              <li>• Redeem Discount (OTP)</li>
              <li>• Request KYC Update</li>
            </ul>
          </div>
        )}
      </div>

      {/* User & Terminal Info Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-3 flex-shrink-0">
        <div className="space-y-1">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Logged In As</div>
          <div className="text-sm font-bold text-white truncate">{user?.username}</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Store className="w-3.5 h-3.5" />
            <span>{user?.branch_code || 'Main Showroom'}</span>
          </div>
        </div>

        {handleLogout && (
          <button
            type="button"
            onClick={handleLogout}
            className="w-full h-11 px-3 bg-slate-800 hover:bg-action-danger text-slate-200 hover:text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface-screen text-ink-primary select-none">

      {/* Fixed Left Sidebar (desktop only) */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 bg-slate-900 text-white flex-col justify-between border-r border-slate-800">
        <SidebarContent handleNavigate={onTabChange} handleLogout={onLogout} />
      </aside>

      {/* Mobile Off-Canvas Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60"
            onClick={closeMobileNav}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-64 max-w-[85vw] bg-slate-900 text-white flex flex-col justify-between border-r border-slate-800 shadow-2xl animate-in slide-in-from-left duration-200">
            <SidebarContent
              handleNavigate={onTabChange}
              handleLogout={() => {
                if (onLogout) onLogout();
                closeMobileNav();
              }}
            />
          </aside>
          <button
            type="button"
            onClick={closeMobileNav}
            aria-label="Close navigation menu"
            className="absolute top-4 left-[calc(16rem+0.5rem)] text-white/80 hover:text-white lg:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col overflow-hidden bg-surface-screen">

        {/* Top Operational Bar */}
        <header className="h-16 px-4 sm:px-6 bg-white border-b border-surface-border flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-1 text-ink-secondary hover:text-ink-primary rounded hover:bg-slate-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-ink-primary truncate">
              {navItems.find((i) => isNavActive(i))?.label || 'Search Customer'}
            </h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-xs font-semibold text-ink-secondary flex-shrink-0">
            {/* Branch badge */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
              <div className="flex items-center gap-1 text-slate-700">
                <Store className="w-3.5 h-3.5 text-brand-orange" />
                <span className="font-bold">{user?.branch_code || 'Main Showroom'}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-action-success" title="Online / POS Ready">
              <CheckCircle2 className="w-4 h-4" />
              <span className="hidden md:inline">Online / POS Ready</span>
            </div>
            <div className="hidden md:block h-6 w-px bg-surface-divider" />
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-surface-border shadow-xs hover:bg-slate-100 transition-colors">
              <img
                src="/bellad-logo.png"
                alt="Bellad Logo"
                className="h-8 w-auto max-w-[120px] object-contain drop-shadow-xs"
              />
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </div>

      </main>

    </div>
  );
};

export default SidebarLayout;