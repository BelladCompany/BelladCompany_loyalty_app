import React, { useState, useEffect } from 'react';
import EnrollmentScreen from '../components/portal/EnrollmentScreen';
import PortalDashboardScreen from '../components/portal/PortalDashboardScreen';
import ApiService from '../services/api';

export default function CustomerPortalScreen() {
  const [customer, setCustomer] = useState(() => ApiService.getUser());
  const [token, setToken] = useState(() => ApiService.getToken());

  useEffect(() => {
    // If token exists, sync state
    const currentToken = ApiService.getToken();
    if (currentToken && !token) {
      setToken(currentToken);
    }
  }, [token]);

  const handleLoginSuccess = (custData) => {
    setCustomer(custData);
    setToken(ApiService.getToken());
  };

  const handleSignOut = () => {
    ApiService.logout();
    setCustomer(null);
    setToken(null);
  };

  if (!token) {
    return <EnrollmentScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return <PortalDashboardScreen customerInfo={customer} onSignOut={handleSignOut} />;
}
