import React, { useState, useEffect } from 'react';
import SidebarLayout from './components/layout/SidebarLayout';
import LoginScreen from './screens/LoginScreen';
import CashierDashboard from './screens/CashierDashboard';
import AdminDuplicateScreen from './screens/AdminDuplicateScreen';
import ReferralsScreen from './screens/ReferralsScreen';
import ApiService from './services/api';

export function App() {
  const [user, setUser] = useState(ApiService.getUser());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchResetNonce, setSearchResetNonce] = useState(0);

  useEffect(() => {
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
  }, []);

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
      {activeTab === 'dashboard' || activeTab === 'search' ? (
        <CashierDashboard
          user={user}
          activeTab={activeTab}
          resetNonce={searchResetNonce}
        />
      ) : activeTab === 'redemptions' ? (
        <div className="space-y-6">
          <div className="p-6 bg-white border border-surface-border rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold text-ink-primary mb-2">Redemptions Counter</h2>
            <p className="text-base text-ink-secondary mb-4">
              To process an OTP redemption for a customer, lookup their phone number or vehicle chassis/VIN number in the search bar below.
            </p>
            <CashierDashboard user={user} activeTab={activeTab} resetNonce={searchResetNonce} />
          </div>
        </div>
      ) : activeTab === 'referrals' ? (
        <ReferralsScreen user={user} />
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
