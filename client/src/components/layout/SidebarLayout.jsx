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
  Building2,
  SlidersHorizontal,
  Sparkles,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Tag,
  Percent,
  Layers,
  Award,
  Crown
} from 'lucide-react';

/**
 * Smart CRM Categorized Sidebar & Light Neumorphic Header Layout (Image 1 & 2 Reference)
 */
export const SidebarLayout = ({
  activeTab = 'dashboard',
  onTabChange,
  user = { username: 'cashier', role: 'cashier', branch_code: 'BLR-01', tenant_id: 'bellad_and_company' },
  onLogout,
  onOpenStudio,
  onOpenBuilder,
  children,
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isCashier = user?.role === 'cashier';
  const isManager = ['branch_manager', 'manager'].includes(user?.role);
  const isAdmin = ['admin', 'super_admin', 'regional_admin', 'director'].includes(user?.role) ||
                  user?.username?.toLowerCase() === 'agstya' ||
                  user?.username?.toLowerCase() === 'agastya';

  const closeMobileNav = () => setMobileNavOpen(false);

  const isNavActive = (id) =>
    activeTab === id || (id === 'dashboard' && (activeTab === 'search' || activeTab === 'redemptions'));

  // Smart CRM Grouped Categories based on staff role
  const navSections = isManager
    ? [
        {
          group: 'Counter POS',
          items: [
            { id: 'dashboard', label: 'Customer Search & 360', icon: LayoutDashboard },
          ],
        },
        {
          group: 'Managerial Approvals',
          items: [
            { id: 'kyc_approvals', label: 'KYC Approvals', icon: ShieldCheck },
            { id: 'corrections_queue', label: 'Queue Approvals', icon: FileText },
          ],
        },
      ]
    : isCashier
    ? [
        {
          group: 'Counter POS',
          items: [
            { id: 'dashboard', label: 'Customer Search & 360', icon: LayoutDashboard },
          ],
        },
      ]
    : [
        // Admin / Director role has full access
        {
          group: 'Counter POS',
          items: [
            { id: 'dashboard', label: 'Customer Search & 360', icon: LayoutDashboard },
          ],
        },
        {
          group: 'Gift Card Rewards',
          items: [
            { id: 'referrals', label: 'Gift Card Rewards', icon: Gift },
          ],
        },
        {
          group: 'Loyalty Rewards',
          items: [
            { id: 'kyc_approvals', label: 'KYC Approvals', icon: ShieldCheck },
            { id: 'corrections_queue', label: 'Queue Approvals', icon: FileText },
          ],
        },
        {
          group: 'Loyalty App Studio',
          items: [
            { id: 'app_builder', label: 'App Builder (WordPress Mode)', icon: Sparkles, isBuilder: true },
            { id: 'master_editor', label: 'Rules & Logic Studio', icon: SlidersHorizontal, isStudio: true },
          ],
        },
        {
          group: 'Analytics',
          items: [
            { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
          ],
        },
      ];

  const SidebarContent = ({ handleNavigate, handleLogout }) => (
    <div className="flex flex-col h-full justify-between bg-white border-r border-slate-200/80">
      {/* Brand Header */}
      <div className="flex flex-col min-h-0 flex-1 overflow-y-auto">
        <div className="h-20 px-6 flex items-center justify-between border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-lg text-slate-900 tracking-tight block">Bellad CRM</span>
              <span className="text-xs font-semibold text-slate-500">Loyalty Platform</span>
            </div>
          </div>
        </div>

        {/* User Role Badge */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between flex-shrink-0">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            {user?.role?.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Categorized Navigation (Smart CRM Style) */}
        <div className="p-4 space-y-6 flex-shrink-0">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1.5">
              <span className="px-3 text-xs font-black uppercase tracking-wider text-slate-400 block">
                {section.group}
              </span>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isNavActive(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.isBuilder && onOpenBuilder) {
                          onOpenBuilder();
                        } else if (item.isStudio && onOpenStudio) {
                          onOpenStudio();
                        } else {
                          handleNavigate(item.id);
                        }
                        closeMobileNav();
                      }}
                      className={`
                        w-full h-11 px-3.5 rounded-2xl flex items-center gap-3 text-sm transition-all text-left font-bold
                        ${isActive
                          ? 'smart-crm-active-pill'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                      `}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span className="truncate">{item.label}</span>
                      {item.isBuilder && (
                        <span className="ml-auto text-[10px] uppercase font-mono px-2 py-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full font-black shadow-xs">
                          No-Code
                        </span>
                      )}
                      {item.isStudio && !item.isBuilder && (
                        <span className="ml-auto text-[10px] uppercase font-mono px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold">
                          AppSheet
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/70 space-y-3 flex-shrink-0">
        <div className="space-y-0.5 px-2">
          <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Operator</div>
          <div className="text-sm font-bold text-slate-900 truncate">{user?.username}</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
            <Store className="w-3.5 h-3.5 text-indigo-600" />
            <span>{user?.branch_code || 'Main Showroom'}</span>
          </div>
        </div>

        {handleLogout && (
          <button
            type="button"
            onClick={handleLogout}
            className="w-full h-10 px-3 bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#EBF0F5] text-slate-900 select-none">

      {/* Left Sidebar (Desktop) */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col justify-between">
        <SidebarContent handleNavigate={onTabChange} handleLogout={onLogout} />
      </aside>

      {/* Mobile Off-Canvas Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={closeMobileNav}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-64 max-w-[85vw] flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200">
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
            className="absolute top-4 left-[calc(16rem+0.5rem)] text-white lg:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Main Viewport Container */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#EBF0F5]">

        {/* Top Header Bar (Image 1 Style: Bold Title + Add Loyalty Black Pill CTA) */}
        <header className="h-16 sm:h-20 px-4 sm:px-6 lg:px-10 bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between gap-3 sm:gap-4 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 truncate tracking-tight">
              Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">


            {/* Black Pill CTA (Only visible for Admin/Director on tablet/desktop) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  if (onOpenStudio) onOpenStudio();
                  else window.location.href = '/editor';
                }}
                className="hidden sm:inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-slate-900/10 transition-all hover:scale-[1.02]"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>+ Master Brain Editor</span>
              </button>
            )}

            {/* User Profile Pill Avatar */}
            <div className="flex items-center gap-2.5 pl-1 sm:pl-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs sm:text-sm shadow-sm">
                {user?.username?.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-bold text-slate-900 block leading-tight">{user?.username}</span>
                <span className="text-[11px] font-semibold text-slate-500">{user?.branch_code || 'Counter'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body (Light Island Canvas) */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </div>

      </main>

    </div>
  );
};

export default SidebarLayout;