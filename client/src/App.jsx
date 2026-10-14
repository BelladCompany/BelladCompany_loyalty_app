import React, { useState, useEffect } from 'react';
import SidebarLayout from './components/layout/SidebarLayout';
import LoginScreen from './screens/LoginScreen';
import CashierDashboard from './screens/CashierDashboard';
import AdminDuplicateScreen from './screens/AdminDuplicateScreen';
import ReferralsScreen from './screens/ReferralsScreen';
import KycApprovalsScreen from './screens/KycApprovalsScreen';
import CorrectionsQueueScreen from './screens/CorrectionsQueueScreen';
import PublicBalancePassScreen from './screens/PublicBalancePassScreen';
import PublicReferralLeadScreen from './screens/PublicReferralLeadScreen';
import ReportsScreen from './screens/ReportsScreen';
import GiftCardsScreen from './screens/GiftCardsScreen';
import TenantManagementScreen from './screens/TenantManagementScreen';
import MasterRuleEditorScreen from './screens/MasterRuleEditorScreen';
import StandaloneMasterEditorPortal from './screens/StandaloneMasterEditorPortal';
import CustomerPortalScreen from './pages/CustomerPortalScreen';
import ApiService from './services/api';

export function App() {
  const [user, setUser] = useState(ApiService.getUser());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchResetNonce, setSearchResetNonce] = useState(0);

  // Check public paths & portal path
  const path = window.location.pathname;
  const isPublicBalancePass = path.startsWith('/balance/');
  const isPublicReferralLead = path.startsWith('/refer/');
  const isCustomerPortal = path.startsWith('/portal') || path.startsWith('/customer-portal');
  const isEditorPath = path.startsWith('/editor') || path.startsWith('/studio');

  const [isStudioMode, setIsStudioMode] = useState(isEditorPath);

  useEffect(() => {
    if (isPublicBalancePass || isPublicReferralLead || isCustomerPortal) return;

    // Validate stored token on mount
    const token = ApiService.getToken();
    if (token) {
      ApiService.getMe()
        .then((res) => {
          if (res.data?.user) {
            setUser(res.data.user);
            ApiService.setUser(res.data.user);
          }
        })
        .catch(() => {
          ApiService.logout();
          setUser(null);
        });
    }
  }, [isPublicBalancePass, isPublicReferralLead, isCustomerPortal]);

  // Handle browser back/forward buttons for /editor navigation
  useEffect(() => {
    const handlePopState = () => {
      setIsStudioMode(window.location.pathname.startsWith('/editor') || window.location.pathname.startsWith('/studio'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Public balance pass does not require user authentication
  if (isPublicBalancePass) {
    return <PublicBalancePassScreen />;
  }

  // Public referral lead form does not require user authentication
  if (isPublicReferralLead) {
    return <PublicReferralLeadScreen />;
  }

  // Customer Portal route or logged-in customer role
  if (isCustomerPortal || user?.role === 'customer') {
    return <CustomerPortalScreen />;
  }

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setActiveTab('dashboard');
  };

  const handleTabChange = (newTab) => {
    if (newTab === 'search') {
      setSearchResetNonce((prev) => prev + 1);
    }
    setActiveTab(newTab);
  };

  const handleLogout = () => {
    ApiService.logout();
    setUser(null);
    setIsStudioMode(false);
  };

  if (!user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Standalone Master Studio Editor Portal (/editor) - Strictly restricted to Admin/Director
  const isAdmin = ['admin', 'super_admin', 'regional_admin', 'director'].includes(user?.role) ||
                  user?.username?.toLowerCase() === 'agstya' ||
                  user?.username?.toLowerCase() === 'agastya';
  if (isStudioMode) {
    if (!isAdmin) {
      return (
        <SidebarLayout
          activeTab={activeTab}
          onTabChange={handleTabChange}
          user={user}
          onLogout={handleLogout}
        >
          <div className="p-8 bg-white rounded-3xl border border-rose-200 shadow-sm text-center max-w-lg mx-auto mt-12 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-slate-900">Restricted Manager Access</h2>
            <p className="text-sm text-slate-600">
              The Master Policy Studio requires Executive Director or Admin privileges. As a Manager, your control is dedicated to KYC Approvals and Queue Operations.
            </p>
            <button
              onClick={() => {
                window.history.pushState({}, '', '/');
                setIsStudioMode(false);
              }}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition shadow-sm"
            >
              Return to Approvals Dashboard
            </button>
          </div>
        </SidebarLayout>
      );
    }
    return (
      <StandaloneMasterEditorPortal
        user={user}
        onExitToCounterApp={() => {
          window.history.pushState({}, '', '/');
          setIsStudioMode(false);
        }}
      />
    );
  }

  return (
    <SidebarLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      user={user}
      onLogout={handleLogout}
      onOpenStudio={() => {
        window.history.pushState({}, '', '/editor');
        setIsStudioMode(true);
      }}
    >
      {activeTab === 'dashboard' || activeTab === 'search' || activeTab === 'redemptions' ? (
        <CashierDashboard
          user={user}
          activeTab={activeTab}
          resetNonce={searchResetNonce}
        />
      ) : activeTab === 'gift_cards' ? (
        <GiftCardsScreen user={user} />
      ) : activeTab === 'referrals' ? (
        <ReferralsScreen user={user} />
      ) : activeTab === 'master_editor' ? (
        <MasterRuleEditorScreen user={user} />
      ) : activeTab === 'reports' ? (
        <ReportsScreen user={user} />
      ) : activeTab === 'kyc_approvals' ? (
        <KycApprovalsScreen />
      ) : activeTab === 'corrections_queue' ? (
        <CorrectionsQueueScreen />
      ) : activeTab === 'tenants' ? (
        <TenantManagementScreen user={user} />
      ) : activeTab === 'admin' ? (
        <AdminDuplicateScreen />
      ) : (
        <div className="p-8 sonexo-glass rounded-3xl space-y-4">
          <h2 className="text-xl font-bold text-white">Administration</h2>
          <p className="text-sm text-slate-400">
            Select a management view from the navigation menu.
          </p>
        </div>
      )}
    </SidebarLayout>
  );
}

export default App;
