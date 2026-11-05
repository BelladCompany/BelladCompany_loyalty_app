import React, { useState, useEffect } from 'react';
import { Car, Lock, User, AlertCircle, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import ApiService from '../services/api';

export const LoginScreen = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
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
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#EBF0F5]">
      {/* Background Soft Ambient Gradient Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-purple-200/50 via-indigo-100/40 to-blue-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Island Card */}
      <div className="w-full max-w-md relative z-10 bg-white rounded-3xl sm:rounded-4xl p-5 sm:p-8 lg:p-10 shadow-island border border-slate-200/80">
        
        {/* Brand Header */}
        <div className="text-center space-y-2.5 pb-5 sm:pb-6 border-b border-slate-100">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-50 border border-indigo-100 shadow-sm mb-1">
            <img
              src="/bellad-logo.png"
              alt="Bellad Logo"
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <Car className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600" style={{ display: 'none' }} />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
              Bellad &amp; Co
              <span className="text-[10px] sm:text-[11px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
                POS
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">Dealership Loyalty &amp; Customer Rewards Counter</p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="pt-5 sm:pt-6 space-y-3.5 sm:space-y-4">
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
                placeholder="admin or cashier"
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
                type="password"
                required
                disabled={isLoading}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
              />
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
        </form>

        {/* Demo Credentials Section */}
        <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 font-bold px-1">
            <span>QUICK DEMO ACCESS:</span>
            <span className="text-slate-400">Click to fill</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => handleFillDemo('admin', 'admin@123')}
              className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer ${
                username === 'admin'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="text-xs sm:text-sm font-bold flex items-center gap-1 sm:gap-1.5 truncate">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">Admin Full Suite</span>
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-mono mt-0.5 truncate">admin / admin@123</div>
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo('cashier_belgaum', 'Cashier@123')}
              className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer ${
                username === 'cashier_belgaum'
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-sm ring-2 ring-emerald-500/20'
                  : 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300 text-emerald-900'
              }`}
            >
              <div className="text-xs sm:text-sm font-black flex items-center gap-1 sm:gap-1.5 truncate text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate">Cashier Belgaum</span>
              </div>
              <div className="text-[10px] sm:text-xs text-emerald-800 font-mono mt-0.5 truncate font-bold">cashier_belgaum / Cashier@123</div>
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo('cashier', 'Cashier@123')}
              className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer ${
                username === 'cashier'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="text-xs sm:text-sm font-bold flex items-center gap-1 sm:gap-1.5 truncate">
                <Car className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">Cashier Hubli</span>
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-mono mt-0.5 truncate">cashier / Cashier@123</div>
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo('kavya', 'kav@2026')}
              className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer ${
                username === 'kavya'
                  ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-sm'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="text-xs sm:text-sm font-bold flex items-center gap-1 sm:gap-1.5 truncate">
                <User className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="truncate">Manager Kavya</span>
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-mono mt-0.5 truncate">kavya / kav@2026</div>
            </button>
          </div>
        </div>

        {/* Bottom Link to Standalone Master Editor */}
        <div className="mt-6 text-center space-y-1">
          <div>
            <a
              href="/editor"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-bold transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Open Standalone Master Studio Editor ↗
            </a>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-mono tracking-tight">
              Backend API: {ApiService.getApiBase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
