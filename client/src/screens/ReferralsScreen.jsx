import React, { useState, useEffect, useCallback } from 'react';
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
  Coins
} from 'lucide-react';
import ApiService from '../services/api';

export const ReferralsScreen = ({ user }) => {
  const [referrals, setReferrals] = useState([]);
  const [approvers, setApprovers] = useState([]);
  const [totals, setTotals] = useState({
    total_referrals: 0,
    total_approved: 0,
    total_pending: 0,
    total_points_credited: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Approval Modal State
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [awardPoints, setAwardPoints] = useState('2500');
  const [approvalReason, setApprovalReason] = useState('Vehicle purchase from Bellad dealership & PR verified');
  const [selectedApproverId, setSelectedApproverId] = useState('');
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveError, setApproveError] = useState('');
  const [approveSuccess, setApproveSuccess] = useState('');

  const fetchReferrals = useCallback(async () => {
    setIsLoading(true);
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
      setIsLoading(false);
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

  useEffect(() => {
    fetchReferrals();
    fetchApprovers();
  }, [fetchReferrals, fetchApprovers]);

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

      setApproveSuccess(res.message || 'Points successfully credited to both Referrer and Buyer!');
      setTimeout(() => {
        setApproveModalOpen(false);
        fetchReferrals();
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
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Compute metrics
  const eligibleCount = referrals.filter((r) => r.is_dealer_purchased && r.is_pr_done).length;
  const ineligibleCount = referrals.filter((r) => !r.is_dealer_purchased || !r.is_pr_done).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-7 sm:p-8 text-white shadow-xl border border-indigo-900/40">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Users className="w-3.5 h-3.5" />
              Referral Rewards & Verification
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Referral Program Audit
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Track who has sent (referrer) and who has received (buyer). Points are credited to both only when the vehicle is purchased from our dealership and PR is completed.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={fetchReferrals}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition border border-white/10 backdrop-blur-sm disabled:opacity-50"
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
                <strong>1. Dealer Purchase:</strong> Both parties receive points <u>only</u> if the referred customer purchases a vehicle from our Bellad dealerships. If not purchased with us, <strong>0 points for both</strong>.
              </p>
              <p>
                <strong>2. PR Done Required:</strong> Permanent Registration (PR) or DMS Invoice delivery must be verified before points are credited.
              </p>
              <p>
                <strong>3. Usage Restriction:</strong> Referral bonus points can <u>only</u> be redeemed during <strong>Service, Body Shop, or Accessories</strong> billing (locked for vehicle sales).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Referrals */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Referrals</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {totals.total_referrals.toLocaleString()}
            </span>
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            Registered referral pairs
          </div>
        </div>

        {/* Dealer Purchased & PR Done */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Purchased & PR Done</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-600 tracking-tight">
              {eligibleCount.toLocaleString()}
            </span>
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            Verified dealer vehicle buyers
          </div>
        </div>

        {/* Ineligible / Pending PR */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">No Purchase / PR Pending</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-600 tracking-tight">
              {ineligibleCount.toLocaleString()}
            </span>
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            No points until purchase & PR
          </div>
        </div>

        {/* Total Points Credited */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Points Awarded</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-blue-600 tracking-tight">
              {Number(totals.total_points_credited).toLocaleString()} PTS
            </span>
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            Usable on Service / Body Shop / Acc
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
            placeholder="Search by referrer or buyer name, phone, or customer ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Referrals' },
            { id: 'pending', label: 'Pending Approval' },
            { id: 'approved', label: 'Approved & Credited' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
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
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Referral Verification & Audit</h2>
            <p className="text-xs text-slate-500">
              Showing {referrals.length} referral records • Last updated {lastUpdated.toLocaleTimeString('en-IN')}
            </p>
          </div>
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
                : 'No referrals have been registered yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Referrer (Who Sent)</th>
                  <th className="py-3 px-5">Referred Buyer (Who Received)</th>
                  <th className="py-3 px-5">Dealership Purchase</th>
                  <th className="py-3 px-5">PR Status</th>
                  <th className="py-3 px-5">Points Eligibility</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {referrals.map((ref) => {
                  const isApproved = ref.status === 'approved';
                  const isEligible = ref.is_dealer_purchased && ref.is_pr_done;

                  return (
                    <tr key={ref.referral_id || ref.id} className="hover:bg-slate-50/60 transition">
                      {/* Referrer Details */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {ref.referrer_name?.charAt(0)?.toUpperCase() || 'R'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block truncate max-w-[170px]">
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

                      {/* Referred Buyer Details */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {ref.referred_name?.charAt(0)?.toUpperCase() || 'B'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block truncate max-w-[170px]">
                              {ref.referred_name}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                                {ref.referred_customer_id}
                              </span>
                              {ref.referred_phone && ref.referred_phone !== '—' && (
                                <span>📱 {ref.referred_phone}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Dealership Purchase Status */}
                      <td className="py-3.5 px-5">
                        {ref.is_dealer_purchased ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Building2 className="w-3 h-3 text-emerald-600" />
                              {ref.branch_name || 'Bellad Dealership'}
                            </span>
                            {ref.vehicle_model && (
                              <span className="text-[11px] text-slate-600 block mt-1 font-semibold flex items-center gap-1">
                                <Car className="w-3 h-3 text-slate-400" />
                                {ref.vehicle_model}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle className="w-3 h-3 text-rose-500" />
                              Not Purchased with Us
                            </span>
                            <span className="text-[10px] text-rose-500 block mt-0.5 font-medium">
                              No vehicle purchase on file
                            </span>
                          </div>
                        )}
                      </td>

                      {/* PR Status */}
                      <td className="py-3.5 px-5">
                        {ref.is_pr_done ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              PR Done
                            </span>
                            <span className="text-[11px] font-mono text-slate-600 block mt-1">
                              {ref.registration_number || ref.dms_invoice_number || 'DMS Verified'}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-500" />
                              PR Pending
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Reg / Invoice pending
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Points Eligibility */}
                      <td className="py-3.5 px-5">
                        {isApproved ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              <Award className="w-3 h-3 text-blue-600" />
                              Credited: +{ref.points_credited || 2500} PTS Each
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Both Referrer & Buyer
                            </span>
                          </div>
                        ) : isEligible ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Coins className="w-3 h-3 text-emerald-600" />
                              Eligible: Ready to Credit
                            </span>
                            <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">
                              +2,500 PTS to both parties
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              <AlertCircle className="w-3 h-3 text-slate-400" />
                              0 Points (No Dealer Purchase)
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Points locked for both
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <Check className="w-4 h-4" />
                            Approved
                          </span>
                        ) : isEligible ? (
                          <button
                            onClick={() => openApproveModal(ref)}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5"
                          >
                            <Award className="w-3.5 h-3.5" />
                            Approve Points
                          </button>
                        ) : (
                          <button
                            disabled
                            title="Cannot approve: Vehicle must be purchased from our dealership with PR completed"
                            className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed border border-slate-200"
                          >
                            Ineligible
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approval Modal */}
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
                  <h3 className="text-base font-bold text-slate-900">Approve Referral Reward</h3>
                  <p className="text-xs text-slate-500">Ref #{selectedReferral.referral_id || selectedReferral.id}</p>
                </div>
              </div>
              <button
                onClick={() => setApproveModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
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
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Referrer (Who Sent):</span>
                <span className="font-bold text-slate-900">{selectedReferral.referrer_name} ({selectedReferral.referrer_customer_id})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Referred Buyer:</span>
                <span className="font-bold text-slate-900">{selectedReferral.referred_name} ({selectedReferral.referred_customer_id})</span>
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

            {/* Important Rule Notice */}
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Automatic Dual-Credit & Service Usage:
              </div>
              <p>
                Points will be credited to <strong>BOTH Referrer and Buyer</strong>.
                These points can only be redeemed during <strong>Service, Body Shop, or Accessories</strong> billing (cannot be used for vehicle sales).
              </p>
            </div>

            <form onSubmit={handleApproveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Points to Award to Each Party
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
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approveLoading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {approveLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Confirm & Credit Points
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
