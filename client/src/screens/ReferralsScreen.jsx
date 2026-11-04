import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  Award,
  AlertCircle,
  RefreshCw,
  Search,
  Check,
  ShieldCheck,
  X,
  Car,
  FileCheck2,
  Info,
  Building2,
  AlertTriangle,
  Coins,
  Share2,
  Copy,
  Calendar,
  Phone,
  User,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import ApiService from '../services/api';

export const ReferralsScreen = ({ user }) => {
  const [referrals, setReferrals] = useState([]);
  const [approvers, setApprovers] = useState([]);
  const [totals, setTotals] = useState({
    total_referrals: 0,
    total_whatsapp_shared: 0,
    total_approved: 0,
    total_pending: 0,
    total_points_credited: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedCode, setCopiedCode] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Approval Modal State
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [awardPoints, setAwardPoints] = useState('2500');
  const [approvalReason, setApprovalReason] = useState('Vehicle purchase from Bellad dealership & PR verified');
  const [selectedApproverId, setSelectedApproverId] = useState('');
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveError, setApproveError] = useState('');
  const [approveSuccess, setApproveSuccess] = useState('');

  const fetchReferrals = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const res = await ApiService.getAdminReferrals({
        search: searchQuery,
        status: statusFilter,
        limit: 100,
      });

      if (res.status === 'success') {
        setReferrals(res.data || []);
        if (res.totals) {
          setTotals(res.totals);
        }
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching admin referrals:', err);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  const fetchApprovers = useCallback(async () => {
    try {
      const res = await ApiService.getReferralApprovers();
      if (res.data && res.data.length > 0) {
        setApprovers(res.data);
        setSelectedApproverId(String(res.data[0].approver_id || res.data[0].id));
      }
    } catch (err) {
      console.error('Error fetching referral approvers:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchReferrals(false);
    fetchApprovers();
  }, [fetchReferrals, fetchApprovers]);

  // Live Auto-Refresh Polling (Every 10 seconds to auto-update when user shares on WhatsApp)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchReferrals(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchReferrals]);

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const openApproveModal = (ref) => {
    setSelectedReferral(ref);
    const suggested = ref.suggested_points && parseInt(ref.suggested_points, 10) > 0
      ? String(ref.suggested_points)
      : '2500';
    setAwardPoints(suggested);
    setApprovalReason(
      ref.approval_reason ||
      `Vehicle purchased from ${ref.branch_name || 'dealership'} & PR verified (${ref.registration_number || ref.dms_invoice_number || 'PR Complete'})`
    );
    setApproveError('');
    setApproveSuccess('');
    setApproveModalOpen(true);
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReferral) return;

    if (!selectedReferral.is_dealer_purchased || !selectedReferral.is_pr_done) {
      setApproveError('Cannot award points: Referred customer has not purchased a vehicle from our dealership or Permanent Registration (PR) is not completed.');
      return;
    }

    setApproveLoading(true);
    setApproveError('');
    setApproveSuccess('');

    try {
      const res = await ApiService.approveReferral(selectedReferral.referral_id || selectedReferral.id, {
        points: parseInt(awardPoints, 10),
        reason: approvalReason,
        approver_id: selectedApproverId ? parseInt(selectedApproverId, 10) : undefined,
      });

      setApproveSuccess(res.message || 'Points successfully credited to both Referrer (+2,500 PTS) and Buyer (+2,500 PTS)!');
      setTimeout(() => {
        setApproveModalOpen(false);
        fetchReferrals(false);
      }, 1500);
    } catch (err) {
      setApproveError(err.message || 'Failed to approve referral.');
    } finally {
      setApproveLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Compute metrics
  const eligibleCount = referrals.filter((r) => r.is_dealer_purchased && r.is_pr_done).length;
  const whatsappCount = totals.total_whatsapp_shared || referrals.filter(r => r.share_channel === 'whatsapp' || r.referral_code).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner - Matching GiftCardsScreen Modern Aesthetic */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-7 sm:p-8 text-white shadow-xl border border-indigo-900/40">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Share2 className="w-3.5 h-3.5 text-[#25D366]" />
              WhatsApp Referral Tracking & Rewards Audit
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Customer Referral Rewards
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Track customer details, unique referral codes sent via WhatsApp (NO PIN needed), exact date & time, dual reward points (+2,500 PTS each for referrer & buyer), and dealership purchase verification.
            </p>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0 flex-wrap">
            {/* Live Auto-Refresh Toggle Pill */}
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition border cursor-pointer ${
                autoRefresh
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-xs'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
              }`}
              title={autoRefresh ? 'Live auto-refresh is active (every 10s)' : 'Click to enable live auto-refresh'}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{autoRefresh ? 'Live Feed (10s)' : 'Paused'}</span>
            </button>

            <button
              onClick={() => fetchReferrals(false)}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition border border-white/10 backdrop-blur-sm disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Policy Rules Callout Card */}
      <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
              Dealership Purchase & PR Rules Policy
            </h4>
            <div className="text-xs text-amber-950/80 space-y-0.5">
              <p>
                <strong>1. Dual Reward:</strong> Both Referrer and Buyer receive <strong>+2,500 PTS each (5,000 PTS total)</strong> when the vehicle is purchased from our Bellad dealerships.
              </p>
              <p>
                <strong>2. Code Only (NO PIN):</strong> Referral codes require <strong>NO PIN</strong> (unlike gift cards). When shared via WhatsApp, the code and timestamp are automatically logged here.
              </p>
              <p>
                <strong>3. PR Verification & Redemption:</strong> Permanent Registration (PR) or DMS Invoice delivery must be verified before approval. Points are usable for Service, Body Shop, and Accessories.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Metric Stat Cards - Mirrored from GiftCardsScreen.jsx */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Referrals */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider leading-snug">
              Total Referrals
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-3">
            <span className="text-sm sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight tabular-nums block leading-tight">
              {Number(totals.total_referrals || 0).toLocaleString()}
            </span>
          </div>
          <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs font-medium text-slate-500 leading-tight">
            Customer invites generated
          </div>
        </div>

        {/* Shared via WhatsApp */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider leading-snug">
              Shared via WhatsApp
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-[#25D366] flex items-center justify-center shrink-0">
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-3">
            <span className="text-sm sm:text-xl md:text-2xl font-black text-emerald-600 tracking-tight tabular-nums block leading-tight">
              {Number(whatsappCount || 0).toLocaleString()}
            </span>
          </div>
          <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs font-medium text-slate-500 leading-tight">
            📱 WhatsApp tracked shares
          </div>
        </div>

        {/* Purchased & PR Done */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider leading-snug">
              Purchased &amp; PR Done
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-3">
            <span className="text-sm sm:text-xl md:text-2xl font-black text-blue-600 tracking-tight tabular-nums block leading-tight">
              {Number(totals.total_approved || eligibleCount || 0).toLocaleString()}
            </span>
          </div>
          <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs font-medium text-slate-500 leading-tight">
            Verified dealer vehicle buyers
          </div>
        </div>

        {/* Dual Points Awarded */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider leading-snug">
              Dual Points Credited
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-3">
            <span className="text-sm sm:text-xl md:text-2xl font-black text-amber-600 tracking-tight tabular-nums block leading-tight">
              {Number(totals.total_points_credited || 0).toLocaleString()} <span className="text-xs font-bold text-slate-400">PTS</span>
            </span>
          </div>
          <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs font-medium text-slate-500 leading-tight">
            Awarded to both Referrer &amp; Buyer
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by customer name, phone, ID, or referral code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Referrals' },
            { id: 'whatsapp', label: '📱 Shared via WhatsApp' },
            { id: 'pending', label: 'Pending Purchase / PR' },
            { id: 'approved', label: 'Approved & Credited' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Referrals List Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Referrals Shared by Customers</h2>
            <p className="text-xs text-slate-500">
              Showing {referrals.length} records • {autoRefresh ? 'Live auto-refreshing every 10s • ' : ''}Last updated {lastUpdated.toLocaleTimeString('en-IN')}
            </p>
          </div>
          {autoRefresh && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live Updates Active
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Loading referral records...</p>
          </div>
        ) : referrals.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Referrals Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'No referrals match the current search or status filter.'
                : 'No referrals have been shared by customers yet. Customers can share referral codes via WhatsApp directly from their portal page.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View - Cards Layout (Optimized for Small Screens, No Horizontal Scroll) */}
            <div className="block lg:hidden divide-y divide-slate-100">
              {referrals.map((ref) => {
                const isApproved = ref.status === 'approved' || ref.status === 'claimed';
                const isEligible = ref.is_dealer_purchased && ref.is_pr_done;
                const isSharedWhatsApp = ref.share_channel === 'whatsapp' || ref.status === 'shared';

                return (
                  <div key={ref.referral_id || ref.id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition">
                    {/* Top: Code + Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-mono text-xs px-2.5 py-1 rounded-lg transition border border-slate-200">
                        <span className="font-bold">{ref.referral_code || `REF-BELL-${ref.id || '9000'}`}</span>
                        <button
                          type="button"
                          title="Copy Referral Code"
                          onClick={() => handleCopyCode(ref.referral_code || `REF-BELL-${ref.id || '9000'}`)}
                          className="text-slate-400 hover:text-slate-700 ml-0.5 cursor-pointer"
                        >
                          {copiedCode === (ref.referral_code || `REF-BELL-${ref.id || '9000'}`) ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 ml-1">
                          No PIN
                        </span>
                      </div>

                      {isApproved ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          Approved &amp; Credited
                        </span>
                      ) : isEligible ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          Ready to Credit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          <Clock className="w-3 h-3 text-amber-600" />
                          PR / Purchase Pending
                        </span>
                      )}
                    </div>

                    {/* Parties: Referrer vs Recipient */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Referrer (Who Sent)</span>
                        <span className="font-bold text-slate-900 block truncate">{ref.referrer_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{ref.referrer_customer_id}</span>
                        {ref.referrer_phone && ref.referrer_phone !== '—' && (
                          <span className="text-[10px] text-slate-500 block">📱 {ref.referrer_phone}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recipient / Friend</span>
                        <span className="font-bold text-slate-900 block truncate">{ref.referred_name || 'Friend Referral'}</span>
                        {ref.referred_customer_id ? (
                          <span className="text-[10px] text-slate-500 font-mono">{ref.referred_customer_id}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#25D366] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            📱 WhatsApp Share
                          </span>
                        )}
                        {ref.referred_phone && ref.referred_phone !== '—' && (
                          <span className="text-[10px] text-slate-500 block">📱 {ref.referred_phone}</span>
                        )}
                      </div>
                    </div>

                    {/* Sent Date & Time + Dual Points Value */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Sent: {formatDate(ref.shared_at || ref.created_at)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-indigo-700 block font-mono">
                          +2,500 PTS each (5,000 Total)
                        </span>
                      </div>
                    </div>

                    {/* Dealership Purchase & PR Info */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                      <span className="text-slate-600">
                        {ref.is_dealer_purchased ? `🏢 ${ref.branch_name || 'Dealership'} • ${ref.vehicle_model || 'Vehicle'}` : '❌ No dealership purchase'}
                      </span>
                      <span>
                        {ref.is_pr_done ? (
                          <span className="text-emerald-700 font-bold">✓ PR Done</span>
                        ) : (
                          <span className="text-amber-700 font-medium">PR Pending</span>
                        )}
                      </span>
                    </div>

                    {/* Action Button */}
                    {!isApproved && (
                      <div className="pt-1">
                        {isEligible ? (
                          <button
                            type="button"
                            onClick={() => openApproveModal(ref)}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Approve &amp; Credit Both (+2,500 PTS Each)</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="w-full py-1.5 bg-slate-100 text-slate-400 font-semibold text-xs rounded-xl cursor-not-allowed border border-slate-200"
                          >
                            Awaiting Vehicle Purchase &amp; PR
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Referral Code (No PIN)</th>
                    <th className="py-3 px-4">Referrer (Who Sent)</th>
                    <th className="py-3 px-4">Recipient / Share Channel</th>
                    <th className="py-3 px-4">Sent Date &amp; Time</th>
                    <th className="py-3 px-4">Dual Points Reward</th>
                    <th className="py-3 px-4">Dealership Purchase &amp; PR</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {referrals.map((ref) => {
                    const isApproved = ref.status === 'approved' || ref.status === 'claimed';
                    const isEligible = ref.is_dealer_purchased && ref.is_pr_done;
                    const code = ref.referral_code || `REF-BELL-${ref.id || '9000'}`;

                    return (
                      <tr key={ref.referral_id || ref.id} className="hover:bg-slate-50/60 transition">
                        {/* 1. Referral Code (NO PIN) */}
                        <td className="py-3 px-4">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-mono text-xs px-2.5 py-1 rounded-lg transition border border-slate-200">
                            <span className="font-bold">{code}</span>
                            <button
                              type="button"
                              title="Copy Referral Code"
                              onClick={() => handleCopyCode(code)}
                              className="text-slate-400 hover:text-slate-700 ml-0.5 cursor-pointer"
                            >
                              {copiedCode === code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                            🔒 Code Only • No PIN
                          </span>
                        </td>

                        {/* 2. Referrer Details */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                              {ref.referrer_name?.charAt(0)?.toUpperCase() || 'R'}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block whitespace-nowrap">
                                {ref.referrer_name}
                              </span>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                                  {ref.referrer_customer_id}
                                </span>
                                {ref.referrer_phone && ref.referrer_phone !== '—' && (
                                  <span>📱 {ref.referrer_phone}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 3. Recipient / Share Channel Details */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#25D366] font-bold flex items-center justify-center text-xs flex-shrink-0">
                              <Share2 className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 block whitespace-nowrap">
                                  {ref.referred_name || 'Friend Referral'}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  📱 WhatsApp
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                {ref.referred_customer_id && (
                                  <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                                    {ref.referred_customer_id}
                                  </span>
                                )}
                                {ref.referred_phone && ref.referred_phone !== '—' ? (
                                  <span>📱 {ref.referred_phone}</span>
                                ) : (
                                  <span className="text-slate-400">Via WhatsApp Invite</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 4. Sent Date & Time */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDate(ref.shared_at || ref.created_at)}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            WhatsApp share timestamp
                          </span>
                        </td>

                        {/* 5. Dual Points Reward */}
                        <td className="py-3 px-4">
                          {isApproved ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                <Award className="w-3 h-3 text-blue-600" />
                                Credited: +{ref.points_credited || 2500} PTS Each
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Both Referrer &amp; Buyer (+5,000 PTS Total)
                              </span>
                            </div>
                          ) : isEligible ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                Eligible: Ready to Credit Both
                              </span>
                              <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">
                                +2,500 PTS each (₹1,250 combined value)
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                <Clock className="w-3 h-3 text-slate-400" />
                                2,500 PTS Each Locked
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Pending friend vehicle purchase &amp; PR
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 6. Dealership Purchase & PR Status */}
                        <td className="py-3 px-4">
                          {ref.is_dealer_purchased ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Building2 className="w-3 h-3 text-emerald-600" />
                                {ref.branch_name || 'Bellad Dealership'}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                {ref.vehicle_model && (
                                  <span className="text-[11px] text-slate-700 font-semibold flex items-center gap-1">
                                    <Car className="w-3 h-3 text-slate-400" />
                                    {ref.vehicle_model}
                                  </span>
                                )}
                                {ref.is_pr_done ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.2 rounded">
                                    ✓ PR Verified
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                                    PR Pending
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertCircle className="w-3 h-3 text-rose-500" />
                                Not Purchased with Us
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Awaiting dealership booking
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 7. Action Button */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                              <Check className="w-4 h-4" />
                              Approved &amp; Credited
                            </span>
                          ) : isEligible ? (
                            <button
                              onClick={() => openApproveModal(ref)}
                              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Award className="w-3.5 h-3.5" />
                              Approve &amp; Credit Both
                            </button>
                          ) : (
                            <button
                              disabled
                              title="Cannot approve: Vehicle must be purchased from our dealership with PR completed"
                              className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed border border-slate-200"
                            >
                              PR / Purchase Pending
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Approval Modal - Dual Crediting */}
      {approveModalOpen && selectedReferral && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Approve Dual Referral Reward</h3>
                  <p className="text-xs text-slate-500">
                    Ref #{selectedReferral.referral_id || selectedReferral.id} • Code: {selectedReferral.referral_code || 'REF-BELL'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApproveModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error or Success Alert */}
            {approveError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{approveError}</span>
              </div>
            )}
            {approveSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{approveSuccess}</span>
              </div>
            )}

            {/* Vehicle Purchase & PR Details Verification Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Referrer (Who Sent):</span>
                <span className="font-bold text-slate-900">{selectedReferral.referrer_name} ({selectedReferral.referrer_customer_id})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Referred Buyer:</span>
                <span className="font-bold text-slate-900">{selectedReferral.referred_name} ({selectedReferral.referred_customer_id || 'Buyer'})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Referral Code:</span>
                <span className="font-mono font-bold text-indigo-700">{selectedReferral.referral_code || 'REF-BELL'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Dealership Branch:</span>
                <span className="font-bold text-emerald-700">{selectedReferral.branch_name || 'Bellad Central'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">PR Registration / Invoice:</span>
                <span className="font-mono font-bold text-indigo-700">
                  {selectedReferral.registration_number || selectedReferral.dms_invoice_number || 'Verified'}
                </span>
              </div>
            </div>

            {/* Important Dual Credit Notice */}
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                Automatic Dual-Credit &amp; Usage Terms:
              </div>
              <p>
                Points will be credited to <strong>BOTH Referrer (+{awardPoints} PTS) and Buyer (+{awardPoints} PTS)</strong>.
                Total points awarded across both accounts: <strong>{parseInt(awardPoints || 0, 10) * 2} PTS</strong>.
                These points can only be redeemed during <strong>Service, Body Shop, or Accessories</strong> billing (cannot be used for vehicle sales).
              </p>
            </div>

            <form onSubmit={handleApproveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Points to Award to Each Party (Dual Reward)
                </label>
                <input
                  type="number"
                  min="1"
                  step="100"
                  value={awardPoints}
                  onChange={(e) => setAwardPoints(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Authorized Referral Approver
                </label>
                <select
                  value={selectedApproverId}
                  onChange={(e) => setSelectedApproverId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {approvers.map((app) => (
                    <option key={app.approver_id || app.id} value={app.approver_id || app.id}>
                      {app.name} (Approver #{app.approver_id || app.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Approval Reason / Notes
                </label>
                <input
                  type="text"
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setApproveModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approveLoading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {approveLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Confirm &amp; Credit Both
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralsScreen;
