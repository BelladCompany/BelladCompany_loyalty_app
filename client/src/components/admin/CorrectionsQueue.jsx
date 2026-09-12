import React, { useState, useEffect } from 'react';
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  Calculator,
  User,
  Building2,
  Calendar,
  AlertTriangle,
  Receipt,
  Check,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import ApiService from '../../services/api';
import Button from '../ui/Button';

export const CorrectionsQueue = () => {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected Proof Modal State
  const [activeProofUrl, setActiveProofUrl] = useState(null);

  // Reject Modal State
  const [rejectId, setRejectId] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await ApiService.getCorrectionRequests(statusFilter);
      setRequests(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load correction requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleApprove = async (id) => {
    if (!window.confirm(`Approve correction request #${id}? This will execute reversal and corrected ledger entries in database.`)) {
      return;
    }

    setActionLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await ApiService.approveCorrection(id, 'Approved by admin');
      setActionSuccess(res.message || `Correction request #${id} approved successfully.`);
      fetchRequests();
    } catch (err) {
      setActionError(err.message || 'Failed to approve correction request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectNotes || rejectNotes.trim().length < 5) {
      setActionError('Mandatory rejection notes (at least 5 characters) must be provided.');
      return;
    }

    setActionLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await ApiService.rejectCorrection(rejectId, rejectNotes.trim());
      setActionSuccess(res.message || `Correction request #${rejectId} rejected.`);
      setRejectId(null);
      setRejectNotes('');
      fetchRequests();
    } catch (err) {
      setActionError(err.message || 'Failed to reject correction request.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Billing Correction Requests Queue
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Review cashier billing mistake tickets. Approval creates strict reversal + corrected ledger entries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
            {['pending', 'approved', 'rejected', 'all'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchRequests}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg border border-slate-200"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Action Messages */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-lg flex items-center justify-between text-emerald-900 font-bold text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-emerald-700 hover:text-emerald-950 font-bold">✕</button>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-lg flex items-center justify-between text-rose-900 font-bold text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="text-rose-700 hover:text-rose-950 font-bold">✕</button>
        </div>
      )}

      {/* Loading & Empty States */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-sm font-bold text-slate-600">Loading correction queue requests…</div>
        </div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <div className="text-base font-bold text-slate-800">No {statusFilter !== 'all' ? statusFilter : ''} correction requests found.</div>
          <div className="text-xs font-semibold text-slate-500">All cashier billing error tickets are up to date.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const filename = req.screenshot_file_url ? req.screenshot_file_url.split('/').pop() : '';
            const proofUrl = filename ? ApiService.getCorrectionProofUrl(filename) : null;
            const diff = req.diff_preview?.calculation_breakup;

            return (
              <div
                key={req.id}
                className="bg-white border-2 border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-all p-5 space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-slate-900 text-white font-mono font-extrabold text-xs rounded-md">
                      Ticket #{req.id}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                        req.status === 'pending'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}
                    >
                      {req.status}
                    </span>

                    {/* Fraud Flag / Cashier Weekly Frequency Warning */}
                    {req.is_unusual_frequency && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-500 text-white flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Unusual Frequency ({req.cashier_weekly_count} in 7d)
                      </span>
                    )}
                    {!req.is_unusual_frequency && req.cashier_weekly_count > 1 && (
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Cashier: {req.cashier_weekly_count} tickets this week
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {new Date(req.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Col 1: Customer & Cashier Info */}
                  <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Request Details</div>
                    
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div>
                        <span className="font-extrabold text-slate-900 text-sm">{req.customer_name}</span>
                        <span className="font-mono text-slate-500 block text-[11px]">{req.customer_id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
                      <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div>
                        <span className="font-bold text-slate-800">Cashier: {req.cashier_name || 'System Cashier'}</span>
                        <span className="text-slate-500 block text-[11px]">{req.branch_name || 'Branch #1'}</span>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-slate-200 font-mono font-semibold text-slate-700">
                      Ref: <strong className="text-slate-900">{req.points_ledger_reference}</strong>
                    </div>
                  </div>

                  {/* Col 2: Amount Comparison & Explanation */}
                  <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Bill Amount Correction</div>
                    
                    <div className="flex items-center justify-around p-2 bg-white rounded border border-slate-200 text-center">
                      <div>
                        <div className="text-[10px] font-bold text-rose-600 uppercase">Wrong Recorded</div>
                        <div className="text-base font-extrabold text-rose-700 line-through">
                          ₹{Number(req.wrong_bill_amount).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-slate-400 font-bold text-lg">→</div>
                      <div>
                        <div className="text-[10px] font-bold text-emerald-600 uppercase">Correct Amount</div>
                        <div className="text-base font-extrabold text-emerald-700">
                          ₹{Number(req.correct_bill_amount).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-slate-200">
                      <div className="font-bold text-slate-700 text-[11px]">Cashier Explanation:</div>
                      <p className="text-slate-800 font-medium italic mt-0.5 leading-snug">
                        "{req.explanation}"
                      </p>
                    </div>
                  </div>

                  {/* Col 3: Proof Screenshot & Computed Diff Preview */}
                  <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Evidence Proof & Diff</div>
                    
                    {proofUrl && (
                      <button
                        type="button"
                        onClick={() => setActiveProofUrl(proofUrl)}
                        className="w-full py-2 px-3 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded text-indigo-700 font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" /> View Proof Screenshot
                      </button>
                    )}

                    {diff && (
                      <div className="p-2 bg-slate-900 text-white rounded font-mono text-[11px] space-y-1">
                        <div className="flex justify-between text-slate-400">
                          <span>Reversal Pts:</span>
                          <span className="text-rose-400 font-bold">{-diff.original_net_points}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Corrected Pts:</span>
                          <span className="text-emerald-400 font-bold">+{diff.corrected_net_points}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-700 text-amber-300 font-bold">
                          <span>Net Balance Adj:</span>
                          <span>{diff.net_balance_adjustment > 0 ? `+${diff.net_balance_adjustment}` : diff.net_balance_adjustment} PTS</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Notes Footer (if already approved/rejected) */}
                {req.status !== 'pending' && (
                  <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-xs flex items-center justify-between text-slate-700 font-semibold">
                    <div>Reviewed by: <strong>{req.reviewer_name || 'Admin'}</strong> on {req.reviewed_at ? new Date(req.reviewed_at).toLocaleString() : 'N/A'}</div>
                    {req.review_notes && <div>Notes: <em>"{req.review_notes}"</em></div>}
                  </div>
                )}

                {/* Approve / Reject Controls (Pending Requests) */}
                {req.status === 'pending' && (
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRejectId(req.id)}
                      disabled={actionLoading}
                      className="border-rose-300 text-rose-700 hover:bg-rose-50 font-bold"
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Reject Request
                    </Button>

                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleApprove(req.id)}
                      disabled={actionLoading}
                      className="font-bold flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Approve & Execute Reversal
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Proof Screenshot Preview Modal */}
      {activeProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white border-2 border-slate-300 rounded-xl shadow-2xl max-w-3xl w-full p-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
              <h4 className="font-bold text-slate-900 text-base">Correction Proof Screenshot Evidence</h4>
              <button onClick={() => setActiveProofUrl(null)} className="p-1 hover:bg-slate-100 rounded text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-900 rounded-lg p-2">
              <img
                src={activeProofUrl}
                alt="Correction Proof Evidence"
                className="max-h-[70vh] object-contain rounded"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '';
                  alert('Failed to load proof image file. Ensure filename and token authorization are valid.');
                }}
              />
            </div>
            <div className="flex justify-end pt-3">
              <Button variant="outline" size="sm" onClick={() => setActiveProofUrl(null)}>Close Viewer</Button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Notes Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white border-2 border-slate-300 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="font-bold text-slate-900 text-lg">Reject Correction Request #{rejectId}</h4>
              <button onClick={() => setRejectId(null)} className="p-1 text-slate-500 hover:text-slate-900">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Mandatory Rejection Notes <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Provide reason for rejecting this correction request (min 5 characters)..."
                  className="w-full p-2.5 border-2 border-slate-300 rounded-lg text-xs font-medium focus:border-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <Button variant="outline" size="sm" onClick={() => setRejectId(null)} disabled={actionLoading}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  disabled={actionLoading || rejectNotes.trim().length < 5}
                  className="font-bold bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {actionLoading ? 'Rejecting…' : 'Confirm Rejection'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorrectionsQueue;
