import React, { useState, useEffect } from 'react';
import { Car, Lock, User, AlertCircle, ArrowRight, Eye, EyeOff, AlertTriangle, ShieldAlert } from 'lucide-react';
import ApiService from '../services/api';

export const LoginScreen = ({ onLoginSuccess, sessionAlert, onClearSessionAlert }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingElapsed, setLoadingElapsed] = useState(0);

  useEffect(() => {
    // Proactively ping backend to wake up sleeping Render instance as soon as login screen mounts
    ApiService.wakeUpBackend();
  }, []);

  useEffect(() => {
    let timer;
    if (isLoading) {
      setLoadingElapsed(0);
      timer = setInterval(() => {
        setLoadingElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      setLoadingElapsed(0);
    }
    return () => clearInterval(timer);
  }, [isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await ApiService.login(username, password);
      onLoginSuccess(data.user, data.supersededPreviousSession);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#EBF0F5]">
      {/* Background Soft Ambient Gradient Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-purple-200/50 via-indigo-100/40 to-blue-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Island Card */}
      <div className="w-full max-w-md relative z-10 bg-white rounded-3xl sm:rounded-4xl p-5 sm:p-8 lg:p-10 shadow-island border border-slate-200/80">
        
        {/* Brand Header */}
        <div className="text-center space-y-2 pb-5 sm:pb-6 border-b border-slate-100">
          <div className="flex items-center justify-center mb-2">
            <img
              src="/bellad-logo.png"
              alt="Bellad & Company Logo"
              className="h-16 sm:h-20 w-auto max-w-[220px] object-contain drop-shadow-sm"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Bellad &amp; Company
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">Dealership Loyalty &amp; Customer Rewards Counter</p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="pt-5 sm:pt-6 space-y-3.5 sm:space-y-4">
          {sessionAlert && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm flex items-start gap-3 shadow-xs animate-fadeIn">
              <div className="p-1.5 rounded-xl bg-amber-200/80 text-amber-900 shrink-0 mt-0.5">
                <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-amber-900" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-amber-950 text-xs sm:text-sm">Single Active Session Security</h4>
                  {onClearSessionAlert && (
                    <button
                      type="button"
                      onClick={onClearSessionAlert}
                      className="text-amber-700 hover:text-amber-950 text-xs font-bold px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <p className="text-amber-850 text-[11px] sm:text-xs mt-1 leading-relaxed">
                  {sessionAlert}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 sm:p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="font-semibold leading-snug">{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs sm:text-sm font-bold text-slate-700 ml-1">Operator Username</label>
            <div className="relative mt-1">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                disabled={isLoading}
                placeholder="cashier, advisor, or admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs sm:text-sm font-bold text-slate-700 ml-1">Password</label>
            <div className="relative mt-1">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isLoading}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 sm:pl-11 pr-11 py-2.5 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer focus:outline-none"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 sm:mt-3 py-3 sm:py-4 px-5 sm:px-6 rounded-xl sm:rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm sm:text-base tracking-wide shadow-lg shadow-slate-900/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {loadingElapsed > 8
                  ? `Waking cloud server (${loadingElapsed}s)...`
                  : loadingElapsed > 3
                    ? `Connecting to backend (${loadingElapsed}s)...`
                    : 'Signing in...'}
              </span>
            ) : (
              <>
                <span>Sign In to Counter</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </button>

          {isLoading && loadingElapsed > 4 && (
            <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-center animate-pulse leading-snug">
              ⏱️ Cloud server is waking up from sleep mode (free tier cold starts take ~20-40s). Please wait a moment...
            </p>
          )}

          {/* Quick Demo Credentials Switcher */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block text-center mb-1.5">
              Quick Role Login (Click to auto-fill)
            </span>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setUsername('cashier');
                  setPassword('Cashier@123');
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                  username === 'cashier' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cashier
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername('advisor');
                  setPassword('advisor123');
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                  username === 'advisor' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Advisor
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername('admin');
                  setPassword('Admin@123');
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                  username === 'admin' ? 'bg-white text-indigo-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin
              </button>
            </div>
          </div>
        </form>

        {/* Footer info */}
        <div className="mt-6 text-center">
          <span className="text-[10px] text-slate-400 font-mono tracking-tight">
            Backend API: {ApiService.getApiBase()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
