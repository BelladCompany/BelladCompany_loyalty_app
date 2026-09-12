import React, { useState, useEffect } from 'react';
import {
  Award,
  Coins,
  Car,
  Clock,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Lock,
  Gift,
  ShieldCheck,
} from 'lucide-react';
import ApiService from '../services/api';

export default function PublicBalancePassScreen({ token: propToken }) {
  // Extract token from URL path if not passed as prop
  const pathToken = window.location.pathname.split('/balance/')[1] || '';
  const token = propToken || pathToken;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('No public balance token provided in URL.');
      setLoading(false);
      return;
    }

    fetchPassData();
  }, [token]);

  const fetchPassData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await ApiService.getPublicBalance(token);
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Unable to load digital pass. The link may have expired or is invalid.');
    } finally {
      setLoading(false);
    }
  };

  const getTierBadgeColor = (tier) => {
    const lower = (tier || '').toLowerCase();
    if (lower.includes('platinum')) return 'from-slate-300 via-gray-100 to-slate-400 text-slate-900 border-slate-300';
    if (lower.includes('gold')) return 'from-amber-400 via-yellow-200 to-amber-500 text-amber-950 border-amber-300';
    return 'from-slate-400 via-slate-200 to-slate-500 text-slate-950 border-slate-400';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'eligible':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Eligible for Redemption
          </span>
        );
      case 'locked':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Lock className="w-3.5 h-3.5" />
            Locked (12m Window)
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <AlertTriangle className="w-3.5 h-3.5" />
            Expired (&gt; 24m)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-300 border border-gray-500/40">
            <Clock className="w-3.5 h-3.5" />
            Pending Verification
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Container */}
      <div className="max-w-md w-full mx-auto space-y-6 my-auto py-4">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            Bellad & Company Loyalty
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
            Digital Balance Pass
          </h1>
          <p className="text-xs text-slate-400">Live Read-Only Customer Balance & Redemption Eligibility</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-8 border border-slate-800 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
            <p className="text-sm text-slate-300 font-medium">Verifying digital pass security token...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-rose-950/40 backdrop-blur-md rounded-2xl p-6 border border-rose-800/60 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-rose-200">Pass Link Unavailable</h3>
              <p className="text-xs text-rose-300/80 mt-1">{error}</p>
            </div>
            <button
              onClick={fetchPassData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-900/60 hover:bg-rose-900 text-rose-200 text-xs font-semibold border border-rose-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Access
            </button>
          </div>
        )}

        {/* Success Pass Card */}
        {data && !loading && (
          <div className="space-y-5">
            {/* Customer & Tier Card */}
            <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-5 border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -z-0 pointer-events-none" />

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold text-lg shadow-lg">
                    {data.customer_name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-base font-bold text-slate-100">{data.customer_name}</h2>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" title="Verified Customer" />
                    </div>
                    <p className="text-xs text-slate-400">Read-Only Member Pass</p>
                  </div>
                </div>

                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getTierBadgeColor(
                    data.tier
                  )} shadow-md border`}
                >
                  <Award className="w-3.5 h-3.5 inline mr-1" />
                  {data.tier || 'Silver'} Member
                </div>
              </div>

              <hr className="my-4 border-slate-800" />

              {/* Main Balance Display */}
              <div className="text-center py-2 space-y-2">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Current Loyalty Balance</p>
                <div className="text-4xl sm:text-5xl font-black text-amber-400 tracking-tight">
                  {data.current_balance?.toLocaleString('en-IN')}{' '}
                  <span className="text-lg font-bold text-amber-500/80">PTS</span>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold text-sm">
                  <Gift className="w-4 h-4 text-emerald-400" />
                  Equivalent to ₹{data.discount_value_in_rs?.toLocaleString('en-IN')} Discount
                </div>

                <p className="text-[11px] text-slate-400 pt-1">
                  💡 Conversion Rate: <span className="text-slate-300 font-medium">{data.points_conversion_rate}</span>
                </p>
              </div>

              {/* Secondary Stats */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/60">
                  <span className="text-slate-400 text-[10px] uppercase block">Lifetime Points</span>
                  <span className="font-bold text-slate-200 text-sm">
                    {data.lifetime_points?.toLocaleString('en-IN')} PTS
                  </span>
                </div>
                <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/60">
                  <span className="text-slate-400 text-[10px] uppercase block">Status</span>
                  <span className="font-bold text-emerald-400 text-sm">Active & Verified</span>
                </div>
              </div>
            </div>

            {/* Vehicle Redemption Eligibility Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-2">
                <Car className="w-4 h-4 text-amber-400" /> Vehicle Redemption Windows
              </h3>

              {(!data.vehicles_eligibility || data.vehicles_eligibility.length === 0) && (
                <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 text-center text-xs text-slate-400">
                  No registered vehicles found associated with this pass.
                </div>
              )}

              {data.vehicles_eligibility?.map((veh, idx) => (
                <div
                  key={veh.vehicle_id || idx}
                  className="bg-slate-900/80 backdrop-blur-md rounded-xl p-4 border border-slate-800 space-y-2.5 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs">
                        <Car className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-100 uppercase tracking-wide">
                          {veh.registration_number || 'Vehicle'}
                        </span>
                      </div>
                    </div>

                    <div>{getStatusBadge(veh.status)}</div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 rounded-lg p-2 border border-slate-800/50">
                    {veh.message}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Eligible From:</span>
                      <span className="font-medium text-slate-200">
                        {veh.eligible_at ? new Date(veh.eligible_at).toLocaleDateString('en-IN') : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Valid Until:</span>
                      <span className="font-medium text-slate-200">
                        {veh.expires_at ? new Date(veh.expires_at).toLocaleDateString('en-IN') : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA & Help Box */}
            <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 rounded-2xl p-5 border border-amber-500/30 text-center space-y-3">
              <h4 className="text-sm font-bold text-amber-200">Ready to Redeem Your Points?</h4>
              <p className="text-xs text-slate-300">
                Visit any Bellad & Company branch or quote your registered phone number at the service counter to apply
                discounts instantly.
              </p>

              <div className="pt-1 flex flex-col sm:flex-row gap-2 justify-center">
                <a
                  href="tel:1800123456"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition"
                >
                  <PhoneCall className="w-4 h-4" /> Call Branch Support
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-400 space-y-1">
          <p>© {new Date().getFullYear()} Bellad & Company. All rights reserved.</p>
          <p className="text-slate-400">Secure Token Pass • Privacy Masked Read-Only View</p>
        </div>
      </div>
    </div>
  );
}
