import React, { useState } from 'react';
import { Car, Lock, User, AlertCircle, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import ApiService from '../services/api';

export const LoginScreen = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
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
      <div className="w-full max-w-md relative z-10 bg-white rounded-4xl p-8 lg:p-10 shadow-island border border-slate-200/80">
        
        {/* Brand Header */}
        <div className="text-center space-y-3 pb-6 border-b border-slate-100">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 shadow-sm mb-1">
            <img
              src="/bellad-logo.png"
              alt="Bellad Logo"
              className="w-10 h-10 object-contain drop-shadow"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <Car className="w-8 h-8 text-indigo-600" style={{ display: 'none' }} />
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
              Bellad & Co
              <span className="text-[11px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
                POS
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Dealership Loyalty & Customer Rewards Counter</p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="pt-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <div>
            <label className="text-sm font-bold text-slate-700 ml-1">Operator Username</label>
            <div className="relative mt-1.5">
              <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                disabled={isLoading}
                placeholder="admin or cashier"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
            <div className="relative mt-1.5">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                disabled={isLoading}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-3 py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-base tracking-wide shadow-lg shadow-slate-900/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              <>
                Sign In to Counter
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Section */}
        <div className="mt-6 pt-5 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
            <span>QUICK DEMO ACCESS:</span>
            <span className="text-slate-400">Click to fill</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleFillDemo('agstya', 'agst@2026')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                username === 'agstya'
                  ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="text-sm font-bold flex items-center gap-1.5 text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Director Agastya
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">agstya / agst@2026</div>
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo('admin', 'admin@123')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                username === 'admin'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="text-sm font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Admin
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">admin / admin@123</div>
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo('kavya', 'kav@2026')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                username === 'kavya'
                  ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-sm'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="text-sm font-bold flex items-center gap-1.5">
                <User className="w-4 h-4 text-purple-600" />
                Manager Kavya
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">kavya / kav@2026</div>
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo('cashier', 'Cashier@123')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                username === 'cashier'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="text-sm font-bold flex items-center gap-1.5">
                <Car className="w-4 h-4 text-indigo-600" />
                Cashier
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">cashier / Cashier@123</div>
            </button>
          </div>
        </div>

        {/* Bottom Link to Standalone Master Editor */}
        <div className="mt-6 text-center">
          <a
            href="/editor"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-bold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Open Standalone Master Studio Editor ↗
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
