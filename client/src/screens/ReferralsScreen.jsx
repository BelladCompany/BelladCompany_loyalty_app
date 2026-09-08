import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  CheckCircle2,
  Clock,
  Award,
  AlertCircle,
  RefreshCw,
  Info,
  ChevronRight,
  ShieldCheck,
  X,
  Sparkles
} from 'lucide-react';
import { Button, DataTable, StatusBadge } from '../components/ui';
import ApiService from '../services/api';

// Layered name field with live fuzzy search. Searching by name lets the
// clerk cross-verify the customer name against its Customer ID before submitting.
const CustomerNameSelect = ({
  label,
  helpText,
  placeholder,
  value,
  onChange,
  selected,
  onSelect,
  results,
  searching,
  disabled,
}) => {
  const showDropdown = !(selected && value === selected.name) && !disabled;

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-ink-primary block">
        {label} <span className="text-action-danger">*</span>
      </label>

      <div className="relative">
        {showDropdown && (
          <div className="absolute top-0 -mt-2 right-2 z-30 p-0.5 px-2 bg-white rounded border border-surface-border shadow-sm">
            <button
              type="button"
              onClick={() => { onChange(''); onSelect(null); }}
              className="text-[11px] font-semibold text-ink-muted hover:text-action-danger flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          </div>
        )}
        <input
          type="text"
          placeholder={placeholder}
          value={selected && value === selected.name ? selected.name : value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          required
          disabled={disabled}
          className={`w-full h-11 px-3 border rounded-md text-sm focus:outline-none focus:border-action-primary bg-white transition-colors ${
            selected ? 'border-green-400 bg-green-50' : 'border-surface-border'
          }`}
        />

        {showDropdown && (
          <div className="absolute z-20 mt-1 left-0 right-0 bg-white border border-surface-border rounded-md shadow-lg max-h-64 overflow-auto">
            {searching && results.length === 0 && (
              <div className="px-3 py-2.5 text-xs text-ink-muted animate-pulse">Searching customers…</div>
            )}
            {results.map((cust) => (
              <button
                key={cust.customer_id}
                type="button"
                onClick={() => onSelect(cust)}
                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-slate-100 last:border-b-0 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-ink-primary truncate">{cust.name}</span>
                  <span className="font-mono text-xs text-action-primary font-medium flex-shrink-0">{cust.customer_id}</span>
                </div>
                <div className="text-xs text-ink-muted">
                  {cust.phones?.[0]?.phone_number ? `📱 ${cust.phones[0].phone_number}` : 'No phone on file'}
                </div>
              </button>
            ))}
            {!searching && results.length === 0 && value.trim().length > 0 && (
              <div className="px-3 py-2.5 text-xs text-action-danger font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> No customer matching "{value.trim()}" — check spelling.
              </div>
            )}
          </div>
        )}
      </div>

      {selected ? (
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-green-50 border border-green-300 rounded-md">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
          <span className="text-sm font-bold text-green-800">{selected.name}</span>
          <span className="text-xs font-mono text-green-600 ml-auto">{selected.customer_id}</span>
        </div>
      ) : (
        <p className="text-xs text-ink-muted">{helpText}</p>
      )}
    </div>
  );
};

export const ReferralsScreen = ({ user }) => {
  const [referrals, setReferrals] = useState([]);
  const [approvers, setApprovers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');

  // Register Referral Modal State
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [referrerName, setReferrerName] = useState('');
  const [referredName, setReferredName] = useState('');
  const [referrerResults, setReferrerResults] = useState([]);
  const [referredResults, setReferredResults] = useState([]);
  const [referrerSelected, setReferrerSelected] = useState(null);
  const [referredSelected, setReferredSelected] = useState(null);
  const [searchingReferrer, setSearchingReferrer] = useState(false);
  const [searchingReferred, setSearchingReferred] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');

  // Approve Referral Modal State
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [awardPoints, setAwardPoints] = useState('500');
  const [approvalReason, setApprovalReason] = useState('');
  const [selectedApproverId, setSelectedApproverId] = useState('');
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveError, setApproveError] = useState('');
  const [approveSuccess, setApproveSuccess] = useState('');

  const isAdmin = user?.role === 'admin';

  const loadReferrals = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await ApiService.getReferrals(statusFilter);
      setReferrals(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load referrals.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadApprovers = async () => {
    if (!isAdmin) return;
    try {
      const res = await ApiService.getReferralApprovers();
      const approverList = res.data || [];
      setApprovers(approverList);
      if (approverList.length > 0) {
        setSelectedApproverId(approverList[0].approver_id || approverList[0].id);
      }
    } catch (err) {
      console.warn('Failed to load approvers:', err.message);
    }
  };

  useEffect(() => {
    loadReferrals();
  }, [statusFilter]);

  useEffect(() => {
    loadApprovers();
  }, [isAdmin]);

  // Debounced live customer name search (fuzzy, run while the modal is open)
  useEffect(() => {
    if (!registerModalOpen) return;
    const q = referrerName.trim();
    if (referrerSelected && referrerSelected.name === q) { setReferrerResults([]); return; }
    if (q.length < 2) { setReferrerResults([]); setSearchingReferrer(false); return; }
    setSearchingReferrer(true);
    const t = setTimeout(async () => {
      try {
        const res = await ApiService.searchByName(q);
        setReferrerResults(Array.isArray(res.data) ? res.data : []);
      } catch {
        setReferrerResults([]);
      } finally {
        setSearchingReferrer(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [referrerName, registerModalOpen, referrerSelected]);

  useEffect(() => {
    if (!registerModalOpen) return;
    const q = referredName.trim();
    if (referredSelected && referredSelected.name === q) { setReferredResults([]); return; }
    if (q.length < 2) { setReferredResults([]); setSearchingReferred(false); return; }
    setSearchingReferred(true);
    const t = setTimeout(async () => {
      try {
        const res = await ApiService.searchByName(q);
        setReferredResults(Array.isArray(res.data) ? res.data : []);
      } catch {
        setReferredResults([]);
      } finally {
        setSearchingReferred(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [referredName, registerModalOpen, referredSelected]);

  // Handle Referral Registration
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');

    const referrerId = referrerSelected?.customer_id;
    const referredId = referredSelected?.customer_id;

    if (!referrerId || !referredId) {
      setRegisterError('Search and select both the Referrer and Referred customers by name to fetch their Customer IDs.');
      return;
    }

    if (referrerId.toUpperCase() === referredId.toUpperCase()) {
      setRegisterError('Self-referrals are not allowed. Referrer and Referred must be different customers.');
      return;
    }

    setRegisterLoading(true);
    try {
      await ApiService.registerReferral({
        referrer_customer_id: referrerId.toUpperCase(),
        referred_customer_id: referredId.toUpperCase(),
      });
      setRegisterSuccess(`Referral registered successfully in Pending status for ${referrerSelected.name} → ${referredSelected.name}!`);
      setReferrerName('');
      setReferredName('');
      setReferrerSelected(null);
      setReferredSelected(null);
      setReferrerResults([]);
      setReferredResults([]);
      setTimeout(() => {
        setRegisterModalOpen(false);
        setRegisterSuccess('');
        loadReferrals();
      }, 1000);
    } catch (err) {
      setRegisterError(err.message || 'Failed to register referral. Verify customer details.');
    } finally {
      setRegisterLoading(false);
    }
  };

  // Open Approval Dialog
  const openApproveModal = (referral) => {
    setSelectedReferral(referral);
    setAwardPoints('500');
    setApprovalReason(`Referred customer completed vehicle service / purchase`);
    setApproveError('');
    setApproveSuccess('');
    setApproveModalOpen(true);
  };

  // Handle Approval Submit
  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    setApproveError('');
    setApproveSuccess('');

    const pts = parseInt(awardPoints, 10);
    if (isNaN(pts) || pts <= 0) {
      setApproveError('Please enter a valid positive number of points to award.');
      return;
    }

    if (!approvalReason.trim()) {
      setApproveError('A mandatory reason is required to approve referral points.');
      return;
    }

    setApproveLoading(true);
    try {
      const refId = selectedReferral.referral_id || selectedReferral.id;
      await ApiService.approveReferral(refId, {
        points: pts,
        reason: approvalReason.trim(),
        approver_id: selectedApproverId ? parseInt(selectedApproverId, 10) : undefined,
      });

      setApproveSuccess(`Awarded ${pts} points to ${selectedReferral.referrer_name}!`);
      setTimeout(() => {
        setApproveModalOpen(false);
        setApproveSuccess('');
        setSelectedReferral(null);
        loadReferrals();
      }, 1200);
    } catch (err) {
      setApproveError(err.message || 'Failed to approve referral.');
    } finally {
      setApproveLoading(false);
    }
  };

  const columns = [
    {
      field: 'id',
      header: 'Ref ID',
      sortable: true,
      render: (_, row) => (
        <span className="font-mono text-xs font-bold text-ink-secondary bg-slate-100 px-2 py-1 rounded border border-slate-200">
          #{row.referral_id || row.id}
        </span>
      ),
    },
    {
      field: 'referrer',
      header: 'Referrer (Loyalty Member)',
      render: (_, row) => (
        <div>
          <div className="font-semibold text-ink-primary text-sm">{row.referrer_name || 'Customer'}</div>
          <div className="font-mono text-xs text-action-primary font-medium">{row.referrer_customer_id}</div>
        </div>
      ),
    },
    {
      field: 'referred',
      header: 'Referred Customer',
      render: (_, row) => (
        <div>
          <div className="font-semibold text-ink-primary text-sm">{row.referred_name || 'Customer'}</div>
          <div className="font-mono text-xs text-ink-muted">{row.referred_customer_id}</div>
        </div>
      ),
    },
    {
      field: 'status',
      header: 'Status',
      render: (val) => {
        const status = val || 'pending';
        return status === 'approved' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-full text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-full text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" /> Pending Approval
          </span>
        );
      },
    },
    {
      field: 'points_awarded',
      header: 'Points Awarded',
      align: 'right',
      render: (val) => (
        <span className="font-mono font-bold text-sm text-ink-primary">
          {Number(val || 0) > 0 ? `+${Number(val).toLocaleString()} PTS` : '0 PTS'}
        </span>
      ),
    },
    {
      field: 'approval_reason',
      header: 'Approval Notes & Approver',
      render: (val, row) => (
        <div className="max-w-xs text-xs space-y-0.5">
          {val ? (
            <p className="text-ink-secondary italic truncate" title={val}>"{val}"</p>
          ) : (
            <span className="text-ink-muted">Awaiting transaction verification</span>
          )}
          {row.approver_name && (
            <div className="text-ink-muted text-2xs">By: <strong className="text-ink-secondary">{row.approver_name}</strong></div>
          )}
        </div>
      ),
    },
    {
      field: 'created_at',
      header: 'Created Date',
      render: (val) => (
        <span className="text-xs text-ink-secondary">
          {val ? new Date(val).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      field: 'actions',
      header: 'Action',
      align: 'right',
      render: (_, row) => {
        const isPending = (row.status || 'pending') === 'pending';
        if (!isPending) {
          return (
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Completed
            </span>
          );
        }

        if (isAdmin) {
          return (
            <Button
              size="sm"
              variant="primary"
              onClick={() => openApproveModal(row)}
              className="text-xs h-8 px-2.5 whitespace-nowrap shadow-xs"
            >
              Approve & Award
            </Button>
          );
        }

        return (
          <span className="text-xs text-ink-muted italic">
            Manager Review
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">

      {/* ── 1. DEALERSHIP REFERRAL LOGIC EXPLANATION ── */}
      <div className="bg-white border-2 border-surface-border rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-action-primary flex-shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-ink-primary tracking-tight">Dealership Customer Referral Program</h2>
              <p className="text-sm text-ink-secondary font-medium">
                Verified, audit-controlled customer referrals with anti-fraud safeguards.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            icon={UserPlus}
            onClick={() => {
              setRegisterError('');
              setRegisterSuccess('');
              setRegisterModalOpen(true);
            }}
            className="shadow-sm whitespace-nowrap"
          >
            + Register Referral
          </Button>
        </div>

        {/* 4-Step Dealership Logic Explainer */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 border border-surface-border rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono px-2 py-0.5 bg-blue-100 text-blue-800 rounded">STEP 1</span>
              <UserPlus className="w-4 h-4 text-action-primary" />
            </div>
            <h4 className="text-sm font-bold text-ink-primary">Link Referrer & Friend</h4>
            <p className="text-xs text-ink-secondary leading-relaxed">
              When an existing loyal customer introduces a friend or relative, register their linkage.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-surface-border rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono px-2 py-0.5 bg-amber-100 text-amber-800 rounded">STEP 2</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <h4 className="text-sm font-bold text-ink-primary">Pending Verification (0 Pts)</h4>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Referral starts with 0 points. No auto-points to prevent fake accounts or self-referral inflation.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-surface-border rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono px-2 py-0.5 bg-purple-100 text-purple-800 rounded">STEP 3</span>
              <ShieldCheck className="w-4 h-4 text-purple-700" />
            </div>
            <h4 className="text-sm font-bold text-ink-primary">Manager / Admin Audit</h4>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Once the friend buys a car or services a vehicle, an authorized approver reviews & awards points with a reason.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-surface-border rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">STEP 4</span>
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
            <h4 className="text-sm font-bold text-ink-primary">Instant Credit & WhatsApp</h4>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Points are posted to the referrer's ledger, tier is upgraded, and an async WhatsApp alert confirms the reward!
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. REFERRAL LIST TABLE & FILTERS ── */}
      <div className="bg-white border border-surface-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-ink-primary">Referral Records</h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 bg-slate-100 border border-slate-300 rounded-full text-ink-secondary">
              {referrals.length} Total
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 border border-surface-border rounded-md text-sm font-medium bg-white text-ink-primary focus:outline-none focus:border-action-primary"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending Approval Only</option>
              <option value="approved">Approved Only</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={loadReferrals}
              disabled={isLoading}
              className="h-10 px-3"
            >
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-action-danger-light border border-red-300 rounded-lg flex items-center gap-2 text-action-danger font-semibold text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DataTable
          columns={columns}
          data={referrals}
          isLoading={isLoading}
          keyField="id"
          emptyMessage="No referrals found matching your filter criteria. Register a new referral to get started."
        />
      </div>

      {/* ── 3. MODAL: REGISTER NEW REFERRAL ── */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-surface-border rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-surface-border">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-action-primary" />
                <h3 className="text-lg font-bold text-ink-primary">Register New Customer Referral</h3>
              </div>
              <button
                type="button"
                onClick={() => setRegisterModalOpen(false)}
                className="p-1 text-ink-muted hover:text-ink-primary rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4">
              {registerError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-action-danger text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{registerError}</span>
                </div>
              )}

              {registerSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded text-action-success text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{registerSuccess}</span>
                </div>
              )}

              {/* ── Referrer Field ── */}
              <CustomerNameSelect
                label="Referrer Customer Name (Existing Customer)"
                helpText="Search by customer name, then select the row to verify the Customer ID before registering."
                placeholder="Type customer name… e.g. Rahul Sharma"
                value={referrerName}
                onChange={(v) => { setReferrerName(v); setReferrerSelected(null); }}
                selected={referrerSelected}
                onSelect={(c) => { setReferrerSelected(c); setReferrerName(c?.name || ''); setReferrerResults([]); }}
                results={referrerResults}
                searching={searchingReferrer}
                disabled={registerLoading}
              />

              {/* ── Referred Field ── */}
              <CustomerNameSelect
                label="Referred Customer Name (New Customer)"
                helpText="Search by customer name, then select the row to verify the Customer ID before registering."
                placeholder="Type customer name… e.g. Ananya Rao"
                value={referredName}
                onChange={(v) => { setReferredName(v); setReferredSelected(null); }}
                selected={referredSelected}
                onSelect={(c) => { setReferredSelected(c); setReferredName(c?.name || ''); setReferredResults([]); }}
                results={referredResults}
                searching={searchingReferred}
                disabled={registerLoading}
              />

              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 leading-relaxed space-y-1">
                <p>ℹ️ The referral will be registered in <strong>Pending status with 0 points</strong>. Points can be awarded upon vehicle delivery or service invoice confirmation by an authorized manager.</p>
                <p>🔍 <strong>Cross-verify Name ↔ ID:</strong> type the customer name, confirm the matching Customer ID shown in the search results, then select that row before submitting.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-divider">
                <Button variant="outline" size="md" onClick={() => setRegisterModalOpen(false)} disabled={registerLoading}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" disabled={registerLoading}>
                  {registerLoading ? 'Registering…' : 'Register Referral'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 4. MODAL: APPROVE REFERRAL (ADMIN ONLY) ── */}
      {approveModalOpen && selectedReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-surface-border rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-surface-border">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-action-primary" />
                <h3 className="text-lg font-bold text-ink-primary">Approve Referral & Award Points</h3>
              </div>
              <button
                type="button"
                onClick={() => setApproveModalOpen(false)}
                className="p-1 text-ink-muted hover:text-ink-primary rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApproveSubmit} className="p-6 space-y-4">
              {approveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-action-danger text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{approveError}</span>
                </div>
              )}

              {approveSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded text-action-success text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{approveSuccess}</span>
                </div>
              )}

              {/* Referral Context Summary */}
              <div className="p-3 bg-slate-50 border border-surface-border rounded-lg text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Referrer (to receive points):</span>
                  <strong className="text-ink-primary font-semibold">{selectedReferral.referrer_name} ({selectedReferral.referrer_customer_id})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Referred Customer:</span>
                  <strong className="text-ink-primary font-semibold">{selectedReferral.referred_name} ({selectedReferral.referred_customer_id})</strong>
                </div>
              </div>

              {/* Points to Award */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink-primary block">
                  Points to Award to Referrer <span className="text-action-danger">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 500 or 1000"
                    value={awardPoints}
                    onChange={(e) => setAwardPoints(e.target.value)}
                    required
                    disabled={approveLoading}
                    className="flex-1 h-11 px-3 border border-surface-border rounded-md font-mono text-base font-bold focus:outline-none focus:border-action-primary bg-white"
                  />
                  <div className="text-xs font-semibold text-action-primary bg-blue-50 px-3 py-2.5 rounded border border-blue-200 whitespace-nowrap">
                    ≈ ₹{Math.floor(parseInt(awardPoints || '0', 10) / 4).toLocaleString()} Value
                  </div>
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center gap-2">
                {[250, 500, 1000, 2000].map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => setAwardPoints(pts.toString())}
                    className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors ${
                      awardPoints === pts.toString()
                        ? 'bg-action-primary text-white border-action-primary'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {pts} pts
                  </button>
                ))}
              </div>

              {/* Mandatory Reason */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink-primary block">
                  Approval Reason / Transaction Note <span className="text-action-danger">*</span>
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. New vehicle Swift Dzire delivered, invoice #INV-2026-99"
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                  required
                  disabled={approveLoading}
                  className="w-full p-2.5 border border-surface-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-action-primary bg-white"
                />
              </div>

              {/* Approver Selection */}
              {approvers.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-ink-primary block">
                    Authorizing Approver
                  </label>
                  <select
                    value={selectedApproverId}
                    onChange={(e) => setSelectedApproverId(e.target.value)}
                    className="w-full h-10 px-3 border border-surface-border rounded-md text-sm font-medium bg-white text-ink-primary focus:outline-none focus:border-action-primary"
                  >
                    {approvers.map((app) => (
                      <option key={app.approver_id || app.id} value={app.approver_id || app.id}>
                        {app.name} (ID: {app.approver_id || app.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-divider">
                <Button variant="outline" size="md" onClick={() => setApproveModalOpen(false)} disabled={approveLoading}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" disabled={approveLoading}>
                  {approveLoading ? 'Approving…' : 'Approve & Credit Points'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ReferralsScreen;
