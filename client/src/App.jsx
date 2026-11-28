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
import LoyaltyAppBuilder from './screens/LoyaltyAppBuilder';
import CustomerPortalScreen from './pages/CustomerPortalScreen';
import PublicOffersScreen from './pages/PublicOffersScreen';
import PublicGiftClaimScreen from './screens/PublicGiftClaimScreen';
import CustomerRedemptionsScreen from './screens/CustomerRedemptionsScreen';
import CampaignScreen from './screens/CampaignScreen';
import DirectorCommandCenter from './screens/DirectorCommandCenter';
import UserManagementScreen from './screens/UserManagementScreen';
import AdvisorInvoiceUploadScreen from './screens/AdvisorInvoiceUploadScreen';
import ApiService from './services/api';
import { isFeatureEnabled, getAppVersion, setAppVersion } from './config/versionConfig';

class BuilderErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error('LoyaltyAppBuilder sandbox error caught safely:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-slate-200 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900">App Builder Recovered</h3>
            <p className="text-xs text-slate-500">
              Local builder session has been refreshed. Your main loyalty POS counter and editor are 100% active and unaffected.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem('bac_app_builder_features_v2');
                    localStorage.removeItem('bac_app_builder_config');
                    localStorage.removeItem('bac_app_builder_clean_settings_v3');
                  } catch (e) {}
                  window.location.reload();
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Reload Builder
              </button>
              <button
                onClick={this.props.onExit}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Return to POS Counter
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  const [user, setUser] = useState(ApiService.getUser());
  const [sessionAlertMessage, setSessionAlertMessage] = useState(null);
  const [sessionSwitchedNotice, setSessionSwitchedNotice] = useState(false);
  const [appVersion, setAppVersionState] = useState(getAppVersion());
  const [activeTab, setActiveTab] = useState(() => {
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/campaigns')) {
      return 'campaigns';
    }
    const u = ApiService.getUser();
    if (
      u?.role === 'director' ||
      u?.role === 'management' ||
      u?.username?.toLowerCase() === 'director' ||
      u?.username?.toLowerCase() === 'agstya' ||
      u?.username?.toLowerCase() === 'agastya'
    ) {
      return 'director_command_center';
    }
    return 'dashboard';
  });
  const [searchResetNonce, setSearchResetNonce] = useState(0);

  // Check public paths & portal path
  const path = window.location.pathname;
  const isPublicBalancePass = path.startsWith('/balance/');
  const isPublicReferralLead = path.startsWith('/refer/');
  const isPublicGiftClaim = path.startsWith('/gift/') || path.startsWith('/claim-gift/');
  const isPublicOffers = path.startsWith('/offers') || path.startsWith('/deals') || path.startsWith('/monthly-offers');
  const isCustomerPortalV2 = path.startsWith('/portalv2') || path.startsWith('/portal-v2') || path.startsWith('/customer-portal-v2');
  const isCustomerPortal = isCustomerPortalV2 || path.startsWith('/portal') || path.startsWith('/customer-portal');
  const isEditorPath = path.startsWith('/editor') || path.startsWith('/studio');
  const isBuilderPath = path.startsWith('/builder') || path.startsWith('/app-builder') || path.startsWith('/create-app');

  const [isStudioMode, setIsStudioMode] = useState(isEditorPath);
  const [isBuilderMode, setIsBuilderMode] = useState(isBuilderPath);

  useEffect(() => {
    if (user?.role === 'cashier' && activeTab === 'invoice_upload') {
      setActiveTab('dashboard');
    }
  }, [user?.role, activeTab]);

  useEffect(() => {
    if (isPublicBalancePass || isPublicReferralLead || isPublicGiftClaim || isPublicOffers || isCustomerPortal) return;

    // Validate stored token on mount
    const token = ApiService.getToken();
    if (token) {
      ApiService.getMe()
        .then((res) => {
          if (res.data?.user) {
            setUser(res.data.user);
            ApiService.setUser(res.data.user);
            const u = res.data.user;
            if (
              u.role === 'director' ||
              u.role === 'management' ||
              u.username?.toLowerCase() === 'director' ||
              u.username?.toLowerCase() === 'agstya' ||
              u.username?.toLowerCase() === 'agastya'
            ) {
              setActiveTab((prev) => (prev === 'dashboard' ? 'director_command_center' : prev));
            }
          }
        })
        .catch(() => {
          ApiService.logout();
          setUser(null);
        });
    }
  }, [isPublicBalancePass, isPublicReferralLead, isPublicGiftClaim, isPublicOffers, isCustomerPortal]);

  // Listen for single-session invalidation (triggered when account is logged in from another browser/profile)
  useEffect(() => {
    const handleSessionSuperseded = (e) => {
      const msg = e.detail?.message || 'Your account was logged in from another browser or device. For security reasons, concurrent logins are not permitted.';
      ApiService.logout();
      setUser(null);
      setSessionAlertMessage(msg);
    };

    window.addEventListener('bac_session_superseded', handleSessionSuperseded);
    return () => window.removeEventListener('bac_session_superseded', handleSessionSuperseded);
  }, []);

  // Listen for Version 1 (Core) vs Version 2 (Full) edition changes
  useEffect(() => {
    const handleVersionChange = (e) => {
      const newVer = e.detail?.version || getAppVersion();
      setAppVersionState(newVer);
      if (newVer === 'v1') {
        if (['gift_cards', 'referrals'].includes(activeTab)) {
          setActiveTab('dashboard');
        }
        if (isBuilderMode && isFeatureEnabled('builder', user)) {
          setIsBuilderMode(false);
          window.history.pushState({}, '', '/');
        }
      }
    };
    window.addEventListener('bac_version_changed', handleVersionChange);
    return () => window.removeEventListener('bac_version_changed', handleVersionChange);
  }, [activeTab, isBuilderMode]);

  // Periodic heartbeat & tab-focus session check to instantly detect logins on another browser
  useEffect(() => {
    if (!user || isPublicBalancePass || isPublicReferralLead || isPublicGiftClaim || isPublicOffers || isCustomerPortal) return;

    const checkActiveSession = async () => {
      const token = ApiService.getToken();
      if (!token) return;
      try {
        await ApiService.validateSession();
      } catch (err) {
        // ApiService request interceptor catches 401 SESSION_SUPERSEDED and dispatches event
      }
    };

    // Heartbeat check every 10 seconds
    const intervalId = setInterval(checkActiveSession, 10000);

    // Instant check when switching to this tab/window
    const handleFocus = () => {
      checkActiveSession();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, isPublicBalancePass, isPublicReferralLead, isPublicGiftClaim, isPublicOffers, isCustomerPortal]);

  // Handle browser back/forward buttons for /editor & /builder navigation
  useEffect(() => {
    const handlePopState = () => {
      setIsStudioMode(window.location.pathname.startsWith('/editor') || window.location.pathname.startsWith('/studio'));
      setIsBuilderMode(window.location.pathname.startsWith('/builder') || window.location.pathname.startsWith('/app-builder') || window.location.pathname.startsWith('/create-app'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Public offers page does not require user authentication
  if (isPublicOffers) {
    return <PublicOffersScreen />;
  }

  // Public balance pass does not require user authentication
  if (isPublicBalancePass) {
    return <PublicBalancePassScreen />;
  }

  // Public referral lead form does not require user authentication
  if (isPublicReferralLead) {
    return <PublicReferralLeadScreen />;
  }

  // Public gift claim link does not require user authentication
  if (isPublicGiftClaim) {
    return <PublicGiftClaimScreen />;
  }

  // Customer Portal route or logged-in customer role
  if (isCustomerPortal || user?.role === 'customer') {
    const forcedPortalVersion = isCustomerPortalV2 ? 'v2' : 'v1';
    return <CustomerPortalScreen portalVersion={forcedPortalVersion} />;
  }

  const handleLoginSuccess = (loggedInUser, supersededPreviousSession) => {
    setSessionAlertMessage(null);
    setUser(loggedInUser);
    if (supersededPreviousSession) {
      setSessionSwitchedNotice(true);
      setTimeout(() => setSessionSwitchedNotice(false), 7000);
    }
    if (
      loggedInUser?.role === 'director' ||
      loggedInUser?.role === 'management' ||
      loggedInUser?.username?.toLowerCase() === 'director' ||
      loggedInUser?.username?.toLowerCase() === 'agstya' ||
      loggedInUser?.username?.toLowerCase() === 'agastya'
    ) {
      setActiveTab('director_command_center');
    } else {
      setActiveTab('dashboard');
    }
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
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        sessionAlert={sessionAlertMessage}
        onClearSessionAlert={() => setSessionAlertMessage(null)}
      />
    );
  }

  if (isBuilderMode && isFeatureEnabled('builder', user)) {
    return (
      <BuilderErrorBoundary
        onExit={() => {
          window.history.pushState({}, '', '/');
          setIsBuilderMode(false);
        }}
      >
        <LoyaltyAppBuilder
          user={user}
          onExitToCounterApp={() => {
            window.history.pushState({}, '', '/');
            setIsBuilderMode(false);
          }}
        />
      </BuilderErrorBoundary>
    );
  }

  // Standalone Master Studio Editor Portal (/editor) - Strictly restricted to Admin/Director
  const isAdmin = ['admin', 'super_admin', 'regional_admin', 'director'].includes(user?.role) ||
                  user?.username?.toLowerCase() === 'agstya' ||
                  user?.username?.toLowerCase() === 'agastya';
  const isManager = ['branch_manager', 'manager'].includes(user?.role);
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
    <>
      {sessionSwitchedNotice && (
        <div className="fixed top-5 right-5 z-[9999] max-w-sm bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-start gap-3 animate-fadeIn">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1 pr-2">
            <p className="font-bold text-xs text-white">Active Session Assigned Here</p>
            <p className="text-slate-300 text-[11px] leading-snug mt-0.5">
              Any other active browser session with this account has been safely logged out.
            </p>
          </div>
          <button
            onClick={() => setSessionSwitchedNotice(false)}
            className="text-slate-400 hover:text-white text-xs font-bold p-1"
          >
            ✕
          </button>
        </div>
      )}
      <SidebarLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      user={user}
      onLogout={handleLogout}
      onOpenStudio={() => {
        window.history.pushState({}, '', '/editor');
        setIsStudioMode(true);
      }}
      onOpenBuilder={() => {
        window.history.pushState({}, '', '/builder');
        setIsBuilderMode(true);
      }}
    >
      {activeTab === 'director_command_center' ? (
          <DirectorCommandCenter
            user={user}
            onSwitchToStaffView={() => setActiveTab('dashboard')}
            onOpenUserManagement={() => setActiveTab('user_management')}
          />
        ) : activeTab === 'user_management' ? (
          <UserManagementScreen user={user} />
        ) : activeTab === 'dashboard' || activeTab === 'search' || activeTab === 'redemptions' ? (
          <CashierDashboard
            user={user}
            activeTab={activeTab}
            resetNonce={searchResetNonce}
          />
        ) : activeTab === 'customer_redemptions' ? (
          isAdmin ? (
            <CustomerRedemptionsScreen user={user} />
          ) : (
            <div className="p-8 bg-white rounded-3xl border border-rose-200 shadow-sm text-center max-w-lg mx-auto mt-12 space-y-4">
              <h2 className="text-xl font-black text-slate-900">Restricted Admin Access</h2>
              <p className="text-sm text-slate-600">
                The Customer Redemptions list is restricted to Administrator privileges only.
              </p>
            </div>
          )
        ) : activeTab === 'campaigns' ? (
          isAdmin ? (
            <CampaignScreen user={user} />
          ) : (
            <div className="p-8 bg-white rounded-3xl border border-rose-200 shadow-sm text-center max-w-lg mx-auto mt-12 space-y-4">
              <h2 className="text-xl font-black text-slate-900">Restricted Director / Admin Access</h2>
              <p className="text-sm text-slate-600">
                The Campaign Add-on Engine requires Executive Director or Admin privileges.
              </p>
            </div>
          )
        ) : activeTab === 'gift_cards' && isFeatureEnabled('gift_cards', user) ? (
          <GiftCardsScreen user={user} />
        ) : activeTab === 'referrals' && isFeatureEnabled('referrals', user) ? (
          <ReferralsScreen user={user} />
        ) : activeTab === 'master_editor' ? (
          <MasterRuleEditorScreen user={user} />
        ) : activeTab === 'invoice_upload' ? (
          user?.role === 'cashier' ? (
            <CashierDashboard
              user={user}
              activeTab="dashboard"
              resetNonce={searchResetNonce}
            />
          ) : (
            <AdvisorInvoiceUploadScreen user={user} />
          )
        ) : activeTab === 'reports' ? (
          <ReportsScreen user={user} />
        ) : activeTab === 'kyc_approvals' ? (
          isManager ? (
            <CorrectionsQueueScreen />
          ) : (
            <KycApprovalsScreen />
          )
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
    </>
  );
}

export default App;
