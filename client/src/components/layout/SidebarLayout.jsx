import React from 'react';
import {
  Search,
  LayoutDashboard,
  Gift,
  Users,
  ShieldCheck,
  LogOut,
  Car,
  Store,
  CheckCircle2
} from 'lucide-react';

/**
 * High-contrast, left-hand POS sidebar layout with role-based visibility
 */
export const SidebarLayout = ({
  activeTab = 'search',
  onTabChange,
  user = { username: 'cashier', role: 'cashier', branch_code: 'BLR-01', tenant_id: 'BAC-MAIN' },
  onLogout,
  children,
}) => {
  const isAdmin = user?.role === 'admin';

  const navItems = [
    { id: 'search', label: 'Search', icon: Search },
    { id: 'dashboard', label: 'Cashier Dashboard', icon: LayoutDashboard },
    { id: 'redemptions', label: 'Redemptions', icon: Gift },
    { id: 'referrals', label: 'Referrals', icon: Users },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: ShieldCheck, adminOnly: true }] : []),
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-screen text-ink-primary select-none">

      {/* Fixed Left Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-slate-900 text-white flex flex-col justify-between border-r border-slate-800">

        {/* Brand Header */}
        <div>
          <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800 bg-slate-950">
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

          {/* Navigation Items (48px tap targets) */}
          <nav className="p-3 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`
                    w-full min-h-[44px] h-12 px-4 rounded flex items-center gap-3.5 text-base font-bold transition-colors text-left
                    ${isActive ? 'bg-action-primary text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                  `}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                  {item.adminOnly && (
                    <span className="ml-auto text-xs px-1.5 py-0.5 bg-amber-500 text-slate-950 font-bold rounded">
                      ADMIN
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User & Terminal Info Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-bold tracking-wider">
              <span>Terminal User</span>
              <span className="text-amber-400 font-bold capitalize">{user?.role}</span>
            </div>
            <div className="text-base font-bold text-white truncate">
              {user?.username}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <Store className="w-3.5 h-3.5" />
              <span>Branch: {user?.branch_code || 'Main Showroom'}</span>
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full h-11 px-3 bg-slate-800 hover:bg-action-danger text-slate-200 hover:text-white font-bold text-base rounded flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          )}
        </div>

      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col overflow-hidden bg-surface-screen">

        {/* Top Operational Bar */}
        <header className="h-16 px-6 bg-white border-b border-surface-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-ink-primary capitalize">
              {navItems.find((i) => i.id === activeTab)?.label || activeTab}
            </h1>
          </div>

          <div className="flex items-center gap-4 text-base font-semibold text-ink-secondary">
            <div className="flex items-center gap-1.5 text-action-success">
              <CheckCircle2 className="w-5 h-5" />
              <span>Online / POS Ready</span>
            </div>
            <div className="h-6 w-px bg-surface-divider" />
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-surface-border shadow-xs hover:bg-slate-100 transition-colors">
              <img
                src="/bellad-logo.png"
                alt="Bellad Logo"
                className="h-8 w-auto max-w-[120px] object-contain drop-shadow-xs"
              />
              {/* <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider hidden md:inline">
                Bellad & Company
              </span> */}
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </div>

      </main>

    </div>
  );
};

export default SidebarLayout;
