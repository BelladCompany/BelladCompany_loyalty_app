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
import ApiService from './services/api';

export function App() {
  const [user, setUser] = useState(ApiService.getUser());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchResetNonce, setSearchResetNonce] = useState(0);

  // Check if current path is a public page (/balance/:token or /refer/:referrerCode)
  const isPublicBalancePass = window.location.pathname.startsWith('/balance/');
  const isPublicReferralLead = window.location.pathname.startsWith('/refer/');

  useEffect(() => {
    if (isPublicBalancePass || isPublicReferralLead) return;

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
  }, [isPublicBalancePass, isPublicReferralLead]);

  // Public balance pass does not require user authentication
  if (isPublicBalancePass) {
    return <PublicBalancePassScreen />;
  }

  // Public referral lead form does not require user authentication
  if (isPublicReferralLead) {
    return <PublicReferralLeadScreen />;
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
      ) : activeTab === 'referrals' ? (
        <ReferralsScreen user={user} />
      ) : activeTab === 'reports' ? (
        <ReportsScreen user={user} />
      ) : activeTab === 'kyc_approvals' ? (
        <KycApprovalsScreen />
      ) : activeTab === 'corrections_queue' ? (
        <CorrectionsQueueScreen />
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
