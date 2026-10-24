import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, AlertCircle, RefreshCw, Eye, FileText, User, Phone, MapPin, Clock, ExternalLink, PlusCircle } from 'lucide-react';
import { Button, StatusBadge, DataTable, ConfirmationModal, useToast, Skeleton } from '../components/ui';
import ApiService from '../services/api';
import RequestKycModal from '../components/dashboard/RequestKycModal';

export const KycApprovalsScreen = () => {
  const { showSuccess, showError } = useToast();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  
  // Modal state for creating a new KYC request
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  
  // Modal state for approve confirmation
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [pendingApproveItem, setPendingApproveItem] = useState(null);

  // Modal state for rejection notes
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal state for previewing ID proof document
  const [previewFileUrl, setPreviewFileUrl] = useState(null);

  const fetchRequests = async (overrideStatus) => {
    setIsLoading(true);
    setError('');
    const targetStatus = overrideStatus !== undefined ? overrideStatus : statusFilter;
    try {
      const res = await ApiService.getPendingKycRequests(targetStatus);
      setRequests(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load KYC requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(statusFilter);
  }, [statusFilter]);

  const handleApprove = async (reqItem) => {
    // Show confirmation modal instead of window.confirm
    setPendingApproveItem(reqItem);
    setApproveModalOpen(true);
  };

  const confirmApprove = async () => {
    if (!pendingApproveItem) return;
    setApproveModalOpen(false);
    setError('');
    setActionSuccess('');
    setIsSubmitting(true);
    try {
      const res = await ApiService.approveKycRequest(pendingApproveItem.id, 'Approved by Accounts Head / Manager');
      const msg = res.message || 'KYC request approved and phone number updated.';
      setActionSuccess(msg);
      showSuccess(msg);
      await fetchRequests();
    } catch (err) {
      const msg = err.message || 'Failed to approve KYC request.';
      setError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
      setPendingApproveItem(null);
    }
  };

  const openRejectModal = (reqItem) => {
    setSelectedReq(reqItem);
    setRejectNotes('');
    setError('');
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectNotes.trim()) {
      setError('Rejection notes are mandatory.');
      return;
    }

    setError('');
    setActionSuccess('');
    setIsSubmitting(true);
    try {
      const res = await ApiService.rejectKycRequest(selectedReq.id, rejectNotes.trim());
      setActionSuccess(res.message || 'KYC request rejected.');
      setRejectModalOpen(false);
      setSelectedReq(null);
      await fetchRequests();
    } catch (err) {
      setError(err.message || 'Failed to reject KYC request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border-2 border-surface-border rounded-lg p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-action-primary-light text-action-primary rounded-lg">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink-primary">KYC Approvals & Audit Trail</h1>
            <p className="text-sm font-medium text-ink-secondary">
              Review customer phone number updates and inspect complete historical record of approved and rejected requests.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          {/* Status Filter Tabs (like Billing Corrections Queue) */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
            {[
              { id: 'pending', label: 'Pending' },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'all', label: 'All Records' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-md capitalize transition-all cursor-pointer font-bold ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Button
            variant="primary"
            size="md"
            icon={PlusCircle}
            onClick={() => setRequestModalOpen(true)}
            className="font-bold whitespace-nowrap bg-action-primary hover:bg-blue-700"
          >
            + Request KYC Update
          </Button>
          <Button
            variant="outline"
            size="md"
            icon={RefreshCw}
            onClick={() => fetchRequests()}
            disabled={isLoading}
            className="font-bold whitespace-nowrap"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-action-danger-light border-2 border-red-300 rounded-lg flex items-center gap-3 text-action-danger font-bold text-base">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 bg-action-success-light border-2 border-green-300 rounded-lg flex items-center gap-3 text-green-900 font-bold text-base">
          <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Requests Queue / Audit Trail */}
      {isLoading ? (
        <Skeleton.KycQueue items={3} />
      ) : requests.length === 0 ? (
        <div className="bg-white border-2 border-surface-border rounded-lg p-12 text-center space-y-3 shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-xl font-bold text-ink-primary">
            {statusFilter === 'pending'
              ? 'All Clear! No Pending Requests'
              : `No ${statusFilter} KYC requests found`}
          </h3>
          <p className="text-base font-medium text-ink-secondary">
            {statusFilter === 'pending'
              ? 'There are currently no pending KYC phone update requests awaiting review.'
              : `No KYC records currently match the "${statusFilter}" status filter.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((reqItem) => (
            <div key={reqItem.id} className="bg-white border-2 border-surface-border rounded-lg p-6 space-y-4 shadow-sm hover:border-slate-400 transition-colors">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-surface-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-surface-border flex items-center justify-center font-bold text-ink-primary text-lg">
                    {reqItem.customer_name?.[0] || 'C'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-ink-primary">{reqItem.customer_name}</span>
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 border border-slate-300 rounded">
                        {reqItem.customer_id}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-ink-secondary flex items-center gap-3 mt-1 flex-wrap">
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> Cashier: {reqItem.cashier_username || 'System'}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Branch: {reqItem.branch_name || 'Central'}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Requested: {new Date(reqItem.created_at).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {reqItem.status === 'pending' && (
                    <StatusBadge status="warning">Pending Review</StatusBadge>
                  )}
                  {reqItem.status === 'approved' && (
                    <StatusBadge status="success">Approved &amp; Updated</StatusBadge>
                  )}
                  {reqItem.status === 'rejected' && (
                    <StatusBadge status="danger">Rejected</StatusBadge>
                  )}
                </div>
              </div>

              {/* Proposed Phone Update Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3.5 bg-slate-50 border border-surface-border rounded-lg space-y-1">
                  <div className="text-xs font-bold text-ink-secondary uppercase">Current / Previous Phone</div>
                  <div className="font-mono text-base font-bold text-slate-800 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-ink-muted" />
                    {reqItem.old_value || 'None'}
                  </div>
                </div>

                <div className="p-3.5 bg-action-primary-light/50 border border-blue-300 rounded-lg space-y-1">
                  <div className="text-xs font-bold text-action-primary uppercase">
                    {reqItem.status === 'approved' ? 'Active Updated Phone' : 'Proposed New Phone'}
                  </div>
                  <div className="font-mono text-lg font-extrabold text-action-primary flex items-center gap-2">
                    <Phone className="w-5 h-5 text-action-primary" />
                    {reqItem.new_value}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-surface-border rounded-lg space-y-1">
                  <div className="text-xs font-bold text-ink-secondary uppercase">ID Proof Document</div>
                  <div className="text-sm font-bold text-ink-primary flex items-center justify-between">
                    <span>{reqItem.id_proof_type || 'Aadhaar Card'}</span>
                    {reqItem.id_proof_file_url ? (
                      <button
                        type="button"
                        onClick={() => setPreviewFileUrl(reqItem.id_proof_file_url)}
                        className="text-action-primary font-bold text-xs flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Eye className="w-4 h-4" /> View Proof
                      </button>
                    ) : (
                      <span className="text-xs text-ink-muted">No file attached</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Reason for Request */}
              <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-lg space-y-1">
                <div className="text-xs font-bold text-amber-900 uppercase">Reason for Request</div>
                <div className="text-sm font-medium text-amber-950">{reqItem.reason}</div>
              </div>

              {/* Review Audit Trail (For Approved or Rejected Records) */}
              {reqItem.status !== 'pending' && (
                <div
                  className={`p-3.5 rounded-lg border text-xs flex flex-col md:flex-row md:items-center justify-between gap-2 font-semibold ${
                    reqItem.status === 'approved'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {reqItem.status === 'approved' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    )}
                    <div>
                      <span>{reqItem.status === 'approved' ? 'Approved' : 'Rejected'} by:</span>{' '}
                      <strong className="font-bold">{reqItem.reviewer_username || 'Accounts Head'}</strong>
                      {reqItem.reviewed_at && (
                        <span className="ml-2 font-normal text-slate-600">
                          on {new Date(reqItem.reviewed_at).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                  {reqItem.review_notes && (
                    <div className="italic text-slate-700">
                      Notes: "{reqItem.review_notes}"
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons (Only when Pending) */}
              {reqItem.status === 'pending' && (
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    icon={XCircle}
                    disabled={isSubmitting}
                    onClick={() => openRejectModal(reqItem)}
                    className="border-action-danger text-action-danger hover:bg-red-50 font-bold"
                  >
                    Reject Request
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    icon={CheckCircle2}
                    disabled={isSubmitting}
                    onClick={() => handleApprove(reqItem)}
                    className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                  >
                    Approve & Update Phone
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal with Mandatory Notes */}
      {rejectModalOpen && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border-2 border-surface-border rounded-lg shadow-2xl p-6 space-y-4">
            <h3 className="text-xl font-bold text-action-danger flex items-center gap-2">
              <XCircle className="w-6 h-6" /> Reject KYC Change Request
            </h3>
            <p className="text-sm font-medium text-ink-secondary">
              Rejecting request for <span className="font-bold text-ink-primary">{selectedReq.customer_name}</span>. Provide mandatory reason/notes for rejection.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-ink-primary block mb-1">
                  Rejection Notes <span className="text-action-danger">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="e.g. ID proof document is blurry or unreadable. Request customer to submit clear copy."
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  required
                  className="w-full p-3 bg-white border border-surface-border rounded-lg text-sm font-medium focus:border-action-danger focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-border">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setRejectModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting || !rejectNotes.trim()}
                  className="bg-action-danger hover:bg-red-700 font-bold"
                >
                  {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFileUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-white border-2 border-surface-border rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 bg-slate-100 border-b border-surface-border">
              <h4 className="text-lg font-bold text-ink-primary">ID Proof Document Preview</h4>
              <button
                type="button"
                onClick={() => setPreviewFileUrl(null)}
                className="text-ink-secondary hover:text-ink-primary p-1 rounded"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 flex justify-center bg-slate-900/10">
              {previewFileUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe src={previewFileUrl} className="w-full h-[600px] border-none" title="ID Proof PDF" />
              ) : (
                <img src={previewFileUrl} alt="ID Proof Preview" className="max-w-full max-h-[70vh] object-contain rounded border border-surface-border shadow" />
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-surface-border flex justify-end">
              <a
                href={previewFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-action-primary font-bold text-sm flex items-center gap-1.5 hover:underline"
              >
                Open Original in New Tab <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      <ConfirmationModal
        isOpen={approveModalOpen}
        title="Approve Phone Update"
        description={pendingApproveItem
          ? `Approve phone number update for ${pendingApproveItem.customer_name} (${pendingApproveItem.customer_id}) to ${pendingApproveItem.new_value}? This will immediately update the customer's contact record.`
          : ''}
        confirmText="Approve & Update Phone"
        cancelText="Cancel"
        variant="success"
        isLoading={isSubmitting}
        onConfirm={confirmApprove}
        onCancel={() => { setApproveModalOpen(false); setPendingApproveItem(null); }}
      />

      {/* Request KYC Update Modal */}
      <RequestKycModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSuccess={() => {
          const msg = 'KYC Phone Change Request submitted successfully! Awaiting manager approval.';
          setActionSuccess(msg);
          showSuccess(msg);
          fetchRequests();
        }}
      />
    </div>
  );
};

export default KycApprovalsScreen;
