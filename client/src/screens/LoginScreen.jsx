import React, { useState } from 'react';
import { Car, Lock, User, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button, Input } from '../components/ui';
import ApiService from '../services/api';

export const LoginScreen = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('cashier');
  const [password, setPassword] = useState('Cashier@123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await ApiService.login(username, password);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-surface-screen p-6">
      <div className="w-full max-w-md bg-white border-2 border-surface-border rounded-lg shadow-md overflow-hidden">
        
        {/* Counter Header */}
        <div className="bg-slate-900 text-white p-6 text-center border-b border-slate-800">
          <div className="inline-flex items-center justify-center p-3 bg-slate-800 rounded-full mb-3">
            <Car className="w-8 h-8 text-action-primary-light" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">BAC Loyalty Portal</h1>
          <p className="text-base text-slate-300 mt-1 font-medium">Dealership Counter & POS Terminal</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-action-danger-light border-2 border-red-300 rounded flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-action-danger flex-shrink-0 mt-0.5" />
              <div className="text-base font-bold text-red-950">{error}</div>
            </div>
          )}

          <Input
            label="Operator Username"
            id="username"
            placeholder="e.g. cashier or admin"
            icon={User}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={isLoading}
          />

          <Input
            label="Password"
            id="password"
            type="password"
            placeholder="Enter password"
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />

          <Button
            type="submit"
            size="lg"
            fullWidth
            disabled={isLoading}
            variant="primary"
          >
            {isLoading ? 'Signing In...' : 'Sign In to Counter'}
          </Button>

          {/* Quick Demo Credentials */}
          <div className="pt-4 border-t border-surface-divider space-y-2">
            <div className="text-xs font-bold text-ink-secondary uppercase tracking-wider">Demo Credentials:</div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => {
                  setUsername('cashier');
                  setPassword('Cashier@123');
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 border border-surface-border rounded text-left"
              >
                <div className="font-bold text-ink-primary">Cashier Account</div>
                <div className="text-ink-secondary">cashier / Cashier@123</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername('admin');
                  setPassword('Admin@123');
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 border border-surface-border rounded text-left"
              >
                <div className="font-bold text-ink-primary">Admin Account</div>
                <div className="text-ink-secondary">admin / Admin@123</div>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};

export default LoginScreen;
