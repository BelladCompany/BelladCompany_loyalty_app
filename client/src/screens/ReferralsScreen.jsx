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
  Sparkles,
  Zap
} from 'lucide-react';
import { Button, DataTable, StatusBadge } from '../components/ui';
import ApiService from '../services/api';

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

  // Referral Leads Pipeline State
  const [activeTab, setActiveTab] = useState('leads'); // 'leads' | 'manual'
  const [leadsPipeline, setLeadsPipeline] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadStatusFilter, setLeadStatusFilter] = useState('all');
  const [leadSearch, setLeadSearch] = useState('');
  const [rcActionLoading, setRcActionLoading] = useState(false);
  const [rcActionSuccess, setRcActionSuccess] = useState('');
  const [rcActionError, setRcActionError] = useState('');

  const loadLeadsPipeline = async () => {
    setLeadsLoading(true);
    setRcActionError('');
    try {
      const res = await ApiService.getReferralLeadsPipeline(leadStatusFilter, leadSearch);
      setLeadsPipeline(res.data || []);
    } catch (err) {
      setRcActionError(err.message || 'Failed to load referral leads pipeline.');
    } finally {
      setLeadsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'leads') {
      loadLeadsPipeline();
    }
  }, [activeTab, leadStatusFilter, leadSearch]);

  const handleConfirmRc = async (leadId) => {
    if (!window.confirm(`Confirm RC Completion for Lead #${leadId}? This will credit referral bonus points to both referrer and buyer.`)) {
      return;
    }

    setRcActionLoading(true);
    setRcActionSuccess('');
    setRcActionError('');
    try {
      const res = await ApiService.confirmRcCompletion(leadId);
      setRcActionSuccess(res.message || `RC Completion confirmed for Lead #${leadId}!`);
      loadLeadsPipeline();
    } catch (err) {
      setRcActionError(err.message || 'Failed to confirm RC completion.');
    } finally {
      setRcActionLoading(false);
    }
  };

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

  const openApproveModal = (referral) => {
    setSelectedReferral(referral);
    const suggested = referral.suggested_points || referral.points_awarded || 500;
    setAwardPoints(suggested.toString());
    setApprovalReason(referral.approval_reason || 'Verified vehicle purchase referral');
    setApproveError('');
    setApproveSuccess('');
    setApproveModalOpen(true);
  };

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

  const leadColumns = [
    {
      field: 'id',
      header: 'Lead ID',
      sortable: true,
      render: (_, row) => (
        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
          #{row.id}
        </span>
      ),
    },
    {
      field: 'generated_code',
      header: 'Referral Lead Code',
      render: (val) => (
        <span className="font-mono font-black text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded shadow-2xs">
          {val}
        </span>
      ),
    },
    {
      field: 'lead_name',
      header: 'Lead Details (Friend)',
      render: (val, row) => (
        <div>
          <div className="font-extrabold text-slate-900 text-sm">{val}</div>
          <div className="font-mono text-xs text-slate-500 font-semibold">{row.lead_phone}</div>
        </div>
      ),
    },
    {
      field: 'referrer_name',
      header: 'Referrer Customer',
      render: (val, row) => (
        <div>
          <div className="font-bold text-slate-900 text-sm">{val || 'Referrer'}</div>
          <div className="font-mono text-xs text-indigo-600 font-bold">{row.referrer_customer_id}</div>
        </div>
      ),
    },
    {
      field: 'status',
      header: 'Pipeline Status',
      render: (val) => {
        if (val === 'rc_completed') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full text-xs font-extrabold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> RC Completed (Credited)
            </span>
          );
        }
        if (val === 'used') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-950 border border-amber-400 rounded-full text-xs font-extrabold">
              <Clock className="w-4 h-4 text-amber-600 animate-pulse" /> Used (Awaiting RC)
            </span>
          );
        }
        if (val === 'mismatched') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-950 border border-rose-400 rounded-full text-xs font-extrabold">
              <AlertCircle className="w-4 h-4 text-rose-600" /> Aadhaar Mismatch
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 border border-slate-300 rounded-full text-xs font-bold">
            Pending Purchase
          </span>
        );
      },
    },
    {
      field: 'matched_sale_reference',
      header: 'Matched Sale / Invoice',
      render: (val, row) => (
        <div>
          <div className="font-mono text-xs font-bold text-slate-800">{val || '—'}</div>
          {row.flagged_reason && <div className="text-[11px] text-rose-600 font-semibold">{row.flagged_reason}</div>}
        </div>
      ),
    },
    {
      field: 'created_at',
      header: 'Date Registered',
      render: (val) => (
        <span className="text-xs text-slate-500 font-medium">
          {val ? new Date(val).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      field: 'actions',
      header: 'Action',
      align: 'right',
      render: (_, row) => {
        if (row.status === 'rc_completed') {
          return (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-300">
              Credited
            </span>
          );
        }

        if (row.status === 'used' || row.status === 'mismatched') {
          return (
            <button
              type="button"
              onClick={() => handleConfirmRc(row.id)}
              disabled={rcActionLoading}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg shadow-sm transition-all whitespace-nowrap"
            >
              {rcActionLoading ? 'Processing…' : 'Confirm RC & Credit'}
            </button>
          );
        }

        return <span className="text-xs text-slate-400 font-medium">Awaiting Sale</span>;
      },
    },
  ];

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
      header: 'Points (Suggested / Final)',
      align: 'right',
      render: (val, row) => {
        const isPending = (row.status || 'pending') === 'pending';
        const suggested = Number(row.suggested_points || 0);
        const awarded = Number(val || 0);
        return (
          <div className="space-y-0.5 text-right">
            {isPending && suggested > 0 ? (
              <div className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                <Zap className="w-3 h-3 text-action-primary" /> Suggested: +{suggested.toLocaleString()} PTS
              </div>
            ) : (
              <span className="font-mono font-bold text-sm text-ink-primary">
                {awarded > 0 ? `+${awarded.toLocaleString()} PTS` : '0 PTS'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      field: 'approval_reason',
      header: 'Notes & Approver',
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
              className="text-xs h-8 px-2.5 whitespace-nowrap shadow-xs font-bold"
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

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b-2 border-slate-200 gap-6 text-base font-bold bg-white px-6 py-2 rounded-xl shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('leads')}
          className={`pb-2 pt-2 border-b-4 transition-all flex items-center gap-2 ${
            activeTab === 'leads'
              ? 'border-indigo-600 text-indigo-900 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-5 h-5 text-indigo-600" />
          Referral Leads Pipeline (RC Deferred Crediting)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('manual')}
          className={`pb-2 pt-2 border-b-4 transition-all flex items-center gap-2 ${
            activeTab === 'manual'
              ? 'border-indigo-600 text-indigo-900 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-5 h-5 text-slate-600" />
          Manual Referrals & Approvals
        </button>
      </div>

      {activeTab === 'leads' && (
        <div className="bg-white border border-surface-border rounded-xl p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                Referral Leads Pipeline
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Tracks leads generated via public links. Crediting triggers strictly upon RC Completion confirmation.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Search lead name, phone, code..."
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
                className="h-10 px-3 border border-slate-300 rounded-lg text-xs font-semibold w-48 sm:w-64 focus:outline-none focus:border-indigo-500"
              />

              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
                {['all', 'pending', 'used', 'rc_completed', 'mismatched'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setLeadStatusFilter(st)}
                    className={`px-3 py-1 rounded-md capitalize transition-all ${
                      leadStatusFilter === st
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'used' ? 'Awaiting RC' : st === 'rc_completed' ? 'RC Completed' : st}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                onClick={loadLeadsPipeline}
                disabled={leadsLoading}
                className="h-10 px-3"
              >
                Refresh
              </Button>
            </div>
          </div>

          {rcActionSuccess && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-lg flex items-center justify-between text-emerald-900 font-extrabold text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{rcActionSuccess}</span>
              </div>
              <button onClick={() => setRcActionSuccess('')} className="text-emerald-800 hover:text-emerald-950 font-black">✕</button>
            </div>
          )}

          {rcActionError && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-lg flex items-center justify-between text-rose-900 font-bold text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <span>{rcActionError}</span>
              </div>
              <button onClick={() => setRcActionError('')} className="text-rose-800 hover:text-rose-950 font-bold">✕</button>
            </div>
          )}

          <DataTable
            columns={leadColumns}
            data={leadsPipeline}
            isLoading={leadsLoading}
            keyField="id"
            emptyMessage="No referral leads found in pipeline matching filter criteria."
          />
        </div>
      )}

      {activeTab === 'manual' && (
        <>
          {/* ── 1. DEALERSHIP REFERRAL LOGIC EXPLANATION ── */}
          <div className="bg-white border-2 border-surface-border rounded-xl p-6 shadow-sm relative overflow-hidden animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-surface-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-action-primary flex-shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-ink-primary tracking-tight">Manual Referral Entry & Approvals</h2>
                  <p className="text-sm text-ink-secondary font-medium">
                    Auto-calculated slab rewards with mandatory approver sign-off and audit logging.
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
                  When an existing loyal customer introduces a friend, register their linkage.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-surface-border rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono px-2 py-0.5 bg-amber-100 text-amber-800 rounded">STEP 2</span>
                  <Zap className="w-4 h-4 text-amber-600" />
                </div>
                <h4 className="text-sm font-bold text-ink-primary">Auto Slab Pre-Fill</h4>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  Upon vehicle purchase, system auto-matches 2W/4W slab price range & pre-fills suggested points.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-surface-border rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono px-2 py-0.5 bg-purple-100 text-purple-800 rounded">STEP 3</span>
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                </div>
                <h4 className="text-sm font-bold text-ink-primary">Manager Sign-Off</h4>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  Approver reviews suggested amount, overrides with mandatory note if needed, and signs off.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-surface-border rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">STEP 4</span>
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                </div>
                <h4 className="text-sm font-bold text-ink-primary">Instant Credit & Audit</h4>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  Points posted to referrer's ledger, logged in audit trail (suggested vs final), and WhatsApp sent!
                </p>
              </div>
            </div>
          </div>

          {/* ── 2. REFERRAL LIST TABLE & FILTERS ── */}
          <div className="bg-white border border-surface-border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-ink-primary">Manual Referral Records</h3>
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
        </>
      )}

      {/* ── 3. MODAL: REGISTER NEW REFERRAL ── */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-surface-border rounded-xl shadow-2xl max-h-[92vh] overflow-y-auto">
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
                <p>ℹ️ The referral will be registered in <strong>Pending status with 0 points</strong>. Points will be automatically suggested when the friend completes a vehicle purchase based on slab rates.</p>
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
          <div className="w-full max-w-lg bg-white border border-surface-border rounded-xl shadow-2xl max-h-[92vh] overflow-y-auto">
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

              {/* Auto-Suggested Points Banner */}
              {selectedReferral.suggested_points > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-300 rounded-lg flex items-center justify-between text-xs text-blue-900 font-bold">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-action-primary" />
                    <span>Auto-Suggested Points (from Slab):</span>
                  </div>
                  <span className="text-sm font-mono font-extrabold text-action-primary">
                    +{selectedReferral.suggested_points.toLocaleString()} PTS
                  </span>
                </div>
              )}

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
                    placeholder="e.g. 2500"
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

              {/* Override Warning Notice */}
              {selectedReferral.suggested_points > 0 && parseInt(awardPoints || '0', 10) !== selectedReferral.suggested_points && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs font-semibold text-amber-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    Override Notice: Changing points from suggested slab (+{selectedReferral.suggested_points} pts) to +{awardPoints || 0} pts will be logged in audit trail.
                  </span>
                </div>
              )}

              {/* Mandatory Reason */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink-primary block">
                  Approval Reason / Override Explanation <span className="text-action-danger">*</span>
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Auto-calculated from referral slab: 5-10L"
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
