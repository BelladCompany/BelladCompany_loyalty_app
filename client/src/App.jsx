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
  };

  if (!user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <SidebarLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      user={user}
      onLogout={handleLogout}
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
        <div className="p-8 bg-white border border-surface-border rounded-lg space-y-4 shadow-sm">
          <h2 className="text-2xl font-bold text-ink-primary">Administration</h2>
          <p className="text-base text-ink-secondary">
            Select a management view from the navigation menu.
          </p>
        </div>
      )}
    </SidebarLayout>
  );
}

export default App;
