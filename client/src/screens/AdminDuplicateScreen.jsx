import React, { useState, useEffect } from 'react';
import {
  Users,
  GitMerge,
  History,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Phone,
  Car,
  ShieldAlert,
  ArrowRight,
  Info
} from 'lucide-react';
import { Button, Input, StatusBadge, DataTable, ConfirmationModal } from '../components/ui';
import ApiService from '../services/api';

export const AdminDuplicateScreen = () => {
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'logs' | 'appsheet'
  const [candidates, setCandidates] = useState([]);
  const [mergeLogs, setMergeLogs] = useState([]);
  const [appsheetLogs, setAppsheetLogs] = useState([]);
  const [selectedPair, setSelectedPair] = useState(null);
  const [survivingId, setSurvivingId] = useState('');
  const [mergeReason, setMergeReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Load candidate duplicate pairs, merge logs, and appsheet logs
  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [dupRes, logRes, appsheetRes] = await Promise.all([
        ApiService.getDuplicateQueue(),
        ApiService.getMergeLogs(),
        ApiService.getAppSheetWebhookLogs().catch(() => ({ data: [] })),
      ]);

      const pairList = dupRes.data || [];
      setCandidates(pairList);
      setMergeLogs(logRes.data || []);
      setAppsheetLogs(appsheetRes.data || []);

      if (pairList.length > 0 && !selectedPair) {
        selectPair(pairList[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load administration data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectPair = (pair) => {
    setSelectedPair(pair);
    // Default surviving ID to customer_a (typically older ID)
    setSurvivingId(pair.customer_a.customer_id);
    setMergeReason('');
    setError('');
    setSuccessMessage('');
  };

  const handleMergeSubmit = async () => {
    if (!selectedPair) return;
    if (!mergeReason || mergeReason.trim().length < 5) {
      setError('Please provide a mandatory merge reason of at least 5 characters.');
      return;
    }

    const mergedId =
      survivingId === selectedPair.customer_a.customer_id
        ? selectedPair.customer_b.customer_id
        : selectedPair.customer_a.customer_id;

    setIsMerging(true);
    setError('');
    try {
      await ApiService.approveMerge({
        surviving_customer_id: survivingId,
        merged_customer_id: mergedId,
        reason: mergeReason.trim(),
      });

      setSuccessMessage(
        `Customer ${mergedId} was successfully merged into ${survivingId}. Ledger points & assets transferred.`
      );
      setConfirmModalOpen(false);
      setSelectedPair(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'Customer merge operation failed.');
      setConfirmModalOpen(false);
    } finally {
      setIsMerging(false);
    }
  };

  // Merge Logs Columns
  const logColumns = [
    { field: 'id', header: 'Log ID', sortable: true, cellClassName: 'font-mono text-xs' },
    {
      field: 'surviving_customer_id',
      header: 'Surviving Customer',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-mono font-bold text-ink-primary">{val}</div>
          <div className="text-xs text-ink-secondary">{row.surviving_customer_name}</div>
        </div>
      ),
    },
    {
      field: 'merged_customer_id',
      header: 'Merged Customer (Archived)',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-mono font-bold text-slate-500 line-through">{val}</div>
          <div className="text-xs text-ink-muted">{row.merged_customer_name}</div>
        </div>
      ),
    },
    {
      field: 'transferred_points',
      header: 'Points Transferred',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="font-mono font-bold text-action-success">
          +{Number(val).toLocaleString()} PTS
        </span>
      ),
    },
    {
      field: 'reason',
      header: 'Admin Reason',
      sortable: false,
      render: (val) => <span className="text-sm font-medium text-ink-primary">{val}</span>,
    },
    {
      field: 'approved_by_username',
      header: 'Approved By',
      sortable: true,
      render: (val) => <span className="font-semibold text-sm text-ink-primary">{val || 'Admin'}</span>,
    },
    {
      field: 'created_at',
      header: 'Timestamp',
      sortable: true,
      render: (val) => (
        <span className="text-sm text-ink-secondary">
          {new Date(val).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </span>
      ),
    },
  ];

  // AppSheet Webhook Logs Columns
  const appsheetColumns = [
    { field: 'id', header: 'Log ID', sortable: true, cellClassName: 'font-mono text-xs' },
    {
      field: 'appsheet_row_id',
      header: 'AppSheet Row ID',
      sortable: true,
      render: (val) => <span className="font-mono text-xs font-bold text-slate-800">{val || 'N/A'}</span>,
    },
    {
      field: 'result',
      header: 'Status',
      sortable: true,
      render: (val) => {
        const colorClass =
          val === 'success'
            ? 'bg-green-100 text-green-800 border-green-300'
            : val === 'duplicate'
            ? 'bg-amber-100 text-amber-800 border-amber-300'
            : val === 'not_found'
            ? 'bg-orange-100 text-orange-800 border-orange-300'
            : 'bg-red-100 text-red-800 border-red-300';
        return (
          <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold uppercase border ${colorClass}`}>
            {val}
          </span>
        );
      },
    },
    {
      field: 'error_message',
      header: 'Details / Error',
      sortable: false,
      render: (val, row) => (
        <div className="max-w-xs text-xs">
          {val ? (
            <span className="text-red-600 font-semibold">{val}</span>
          ) : (
            <span className="text-slate-500 italic">Synced successfully</span>
          )}
        </div>
      ),
    },
    {
      field: 'payload',
      header: 'Payload Summary',
      sortable: false,
      render: (val) => (
        <div className="font-mono text-xs text-slate-600 truncate max-w-xs">
          {val ? `Phone: ${val.customer_phone || '-'} | Job: ${val.job_card_number || val.reference_id || '-'} | Amount: ₹${val.bill_amount || 0}` : '-'}
        </div>
      ),
    },
    {
      field: 'received_at',
      header: 'Timestamp',
      sortable: true,
      render: (val) => (
        <span className="text-xs text-ink-secondary">
          {new Date(val).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Header & Tab Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-surface-border p-6 rounded-lg shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <GitMerge className="w-6 h-6 text-action-primary" />
            <h2 className="text-2xl font-bold text-ink-primary">Duplicate Customers & Integration Audit</h2>
          </div>
          <p className="text-base text-ink-secondary mt-1">
            Review flagged duplicate candidates side-by-side, consolidate records, and monitor AppSheet billing webhook connection status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-surface-border">
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={`
                h-10 px-4 rounded font-bold text-base transition-colors flex items-center gap-2
                ${activeTab === 'queue' ? 'bg-white text-ink-primary shadow-sm' : 'text-ink-secondary hover:text-ink-primary'}
              `}
            >
              <span>Duplicate Queue</span>
              <span className="text-xs px-2 py-0.5 bg-action-primary text-white font-mono rounded-full font-bold">
                {candidates.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`
                h-10 px-4 rounded font-bold text-base transition-colors flex items-center gap-2
                ${activeTab === 'logs' ? 'bg-white text-ink-primary shadow-sm' : 'text-ink-secondary hover:text-ink-primary'}
              `}
            >
              <History className="w-4 h-4" />
              <span>Merge Audit Logs</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('appsheet')}
              className={`
                h-10 px-4 rounded font-bold text-base transition-colors flex items-center gap-2
                ${activeTab === 'appsheet' ? 'bg-white text-ink-primary shadow-sm' : 'text-ink-secondary hover:text-ink-primary'}
              `}
            >
              <span>AppSheet Logs</span>
              <span className="text-xs px-2 py-0.5 bg-slate-700 text-white font-mono rounded-full font-bold">
                {appsheetLogs.length}
              </span>
            </button>
          </div>

          <Button variant="outline" size="sm" icon={RefreshCw} onClick={loadData} disabled={isLoading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-action-danger-light border-2 border-red-300 rounded-lg flex items-center gap-3 text-action-danger font-bold text-base">
          <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-action-success-light border-2 border-green-300 rounded-lg flex items-center gap-3 text-action-success font-bold text-base">
          <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* TAB 1: DUPLICATE QUEUE & SIDE-BY-SIDE VIEW */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Queue List (1/3 width) */}
          <div className="bg-white border border-surface-border rounded-lg p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-surface-divider">
              <h3 className="text-lg font-bold text-ink-primary">Flagged Candidate Pairs</h3>
              <span className="text-sm font-semibold text-ink-secondary">{candidates.length} Pending</span>
            </div>

            {candidates.length === 0 ? (
              <div className="p-8 text-center text-ink-secondary space-y-2">
                <CheckCircle2 className="w-10 h-10 text-action-success mx-auto" />
                <div className="text-lg font-bold text-ink-primary">Queue is Clear</div>
                <div className="text-sm">No duplicate customer pairs detected by the system.</div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {candidates.map((pair) => {
                  const isSelected = selectedPair?.candidate_id === pair.candidate_id;
                  return (
                    <div
                      key={pair.candidate_id}
                      onClick={() => selectPair(pair)}
                      className={`
                        p-4 rounded-lg border-2 cursor-pointer transition-all space-y-2.5
                        ${isSelected ? 'border-action-primary bg-action-primary-light/40 shadow-sm' : 'border-surface-border bg-slate-50 hover:bg-white hover:border-slate-400'}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-950 border border-amber-300 rounded">
                          {pair.match_reason}
                        </span>
                        <ArrowRight className={`w-4 h-4 ${isSelected ? 'text-action-primary' : 'text-slate-400'}`} />
                      </div>

                      <div className="space-y-1 text-sm font-medium">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink-primary">{pair.customer_a.name}</span>
                          <span className="font-mono text-xs text-ink-secondary">{pair.customer_a.customer_id}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink-primary">{pair.customer_b.name}</span>
                          <span className="font-mono text-xs text-ink-secondary">{pair.customer_b.customer_id}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Side-by-Side Comparison (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {selectedPair ? (
              <div className="bg-white border-2 border-surface-border rounded-lg p-6 space-y-6 shadow-sm">
                
                {/* Match Banner */}
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-800 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-amber-950 text-base">Match Trigger: {selectedPair.match_reason}</span>
                      {selectedPair.detail && (
                        <span className="text-sm text-amber-900 block font-medium">{selectedPair.detail}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-950 bg-amber-200 px-2.5 py-1 rounded">
                    Admin Action Required
                  </span>
                </div>

                {/* Side by Side Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Record A */}
                  <div
                    className={`
                      p-5 rounded-lg border-2 transition-all space-y-4
                      ${survivingId === selectedPair.customer_a.customer_id ? 'border-action-primary bg-action-primary-light/20 ring-2 ring-action-primary/20' : 'border-surface-border bg-slate-50 opacity-90'}
                    `}
                  >
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="surviving_selection"
                          value={selectedPair.customer_a.customer_id}
                          checked={survivingId === selectedPair.customer_a.customer_id}
                          onChange={() => setSurvivingId(selectedPair.customer_a.customer_id)}
                          className="w-5 h-5 text-action-primary"
                        />
                        <span className="text-base font-bold text-ink-primary">Set as Surviving Master</span>
                      </div>
                      <span className="font-mono text-xs px-2 py-0.5 bg-slate-200 font-bold rounded">Record A</span>
                    </label>

                    <div className="space-y-2 pt-2 border-t border-surface-divider">
                      <div className="font-mono text-lg font-extrabold text-slate-900">
                        {selectedPair.customer_a.customer_id}
                      </div>
                      <div className="text-xl font-bold text-ink-primary">{selectedPair.customer_a.name}</div>
                      <div className="flex items-center gap-2">
                        <StatusBadge value={selectedPair.customer_a.tier_name || 'Silver'} type="tier" />
                        <span className="text-base font-bold font-mono text-action-primary">
                          {Number(selectedPair.customer_a.current_balance || 0).toLocaleString()} PTS
                        </span>
                      </div>

                      {/* Phones */}
                      <div className="text-sm font-medium space-y-1 pt-1">
                        <span className="text-xs font-bold text-ink-secondary uppercase block">Registered Phone(s):</span>
                        {(selectedPair.customer_a.phones || []).map((p, idx) => (
                          <div key={idx} className="font-mono bg-white p-1.5 border border-slate-300 rounded">
                            {p.phone_number || p} {p.is_primary && <span className="text-xs text-action-primary font-bold">(Main)</span>}
                          </div>
                        ))}
                      </div>

                      {/* Vehicles */}
                      <div className="text-sm font-medium space-y-1 pt-1">
                        <span className="text-xs font-bold text-ink-secondary uppercase block">Vehicles:</span>
                        {(selectedPair.customer_a.vehicles || []).length > 0 ? (
                          (selectedPair.customer_a.vehicles || []).map((v, idx) => (
                            <div key={idx} className="font-mono bg-white p-1.5 border border-slate-300 rounded text-xs">
                              {v.registration_number} {v.model ? `(${v.model})` : ''}
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-ink-muted italic">No vehicles</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Record B */}
                  <div
                    className={`
                      p-5 rounded-lg border-2 transition-all space-y-4
                      ${survivingId === selectedPair.customer_b.customer_id ? 'border-action-primary bg-action-primary-light/20 ring-2 ring-action-primary/20' : 'border-surface-border bg-slate-50 opacity-90'}
                    `}
                  >
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="surviving_selection"
                          value={selectedPair.customer_b.customer_id}
                          checked={survivingId === selectedPair.customer_b.customer_id}
                          onChange={() => setSurvivingId(selectedPair.customer_b.customer_id)}
                          className="w-5 h-5 text-action-primary"
                        />
                        <span className="text-base font-bold text-ink-primary">Set as Surviving Master</span>
                      </div>
                      <span className="font-mono text-xs px-2 py-0.5 bg-slate-200 font-bold rounded">Record B</span>
                    </label>

                    <div className="space-y-2 pt-2 border-t border-surface-divider">
                      <div className="font-mono text-lg font-extrabold text-slate-900">
                        {selectedPair.customer_b.customer_id}
                      </div>
                      <div className="text-xl font-bold text-ink-primary">{selectedPair.customer_b.name}</div>
                      <div className="flex items-center gap-2">
                        <StatusBadge value={selectedPair.customer_b.tier_name || 'Silver'} type="tier" />
                        <span className="text-base font-bold font-mono text-action-primary">
                          {Number(selectedPair.customer_b.current_balance || 0).toLocaleString()} PTS
                        </span>
                      </div>

                      {/* Phones */}
                      <div className="text-sm font-medium space-y-1 pt-1">
                        <span className="text-xs font-bold text-ink-secondary uppercase block">Registered Phone(s):</span>
                        {(selectedPair.customer_b.phones || []).map((p, idx) => (
                          <div key={idx} className="font-mono bg-white p-1.5 border border-slate-300 rounded">
                            {p.phone_number || p} {p.is_primary && <span className="text-xs text-action-primary font-bold">(Main)</span>}
                          </div>
                        ))}
                      </div>

                      {/* Vehicles */}
                      <div className="text-sm font-medium space-y-1 pt-1">
                        <span className="text-xs font-bold text-ink-secondary uppercase block">Vehicles:</span>
                        {(selectedPair.customer_b.vehicles || []).length > 0 ? (
                          (selectedPair.customer_b.vehicles || []).map((v, idx) => (
                            <div key={idx} className="font-mono bg-white p-1.5 border border-slate-300 rounded text-xs">
                              {v.registration_number} {v.model ? `(${v.model})` : ''}
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-ink-muted italic">No vehicles</div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Merge Action Form */}
                <div className="p-5 bg-slate-50 border-2 border-surface-border rounded-lg space-y-4">
                  <div className="flex items-start gap-2.5 text-sm text-ink-secondary font-medium">
                    <Info className="w-5 h-5 text-action-primary flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Merge Policy:</strong> All points_ledger entries, phone numbers, and vehicles will be transferred under master ID <strong>{survivingId}</strong>. The other customer record will be marked as merged (never deleted) and logged permanently in <code>customer_merge_log</code>.
                    </span>
                  </div>

                  <Input
                    label="Mandatory Reason for Merge"
                    placeholder="e.g. Duplicate account created during showroom visit with secondary phone"
                    value={mergeReason}
                    onChange={(e) => setMergeReason(e.target.value)}
                    required
                    helperText="This reason will be permanently recorded in the audit log."
                  />

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      variant="danger"
                      size="lg"
                      icon={GitMerge}
                      onClick={() => setConfirmModalOpen(true)}
                      disabled={isMerging || !mergeReason.trim() || mergeReason.trim().length < 5}
                    >
                      {isMerging ? 'Merging Records...' : 'Approve & Execute Merge'}
                    </Button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-white border-2 border-surface-border rounded-lg p-12 text-center space-y-3">
                <Users className="w-12 h-12 text-ink-muted mx-auto" />
                <h3 className="text-xl font-bold text-ink-primary">Select a Duplicate Candidate Pair</h3>
                <p className="text-base text-ink-secondary">
                  Choose a candidate from the left queue to compare both customer records side-by-side.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: MERGE AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white border border-surface-border rounded-lg p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-ink-primary">Historical Merge Audit Log</h3>
            <span className="text-sm font-semibold text-ink-secondary">{mergeLogs.length} Total Merges</span>
          </div>

          <DataTable
            columns={logColumns}
            data={mergeLogs}
            keyField="id"
            emptyMessage="No customer merges have been executed yet."
          />
        </div>
      )}

      {/* TAB 3: APPSHEET WEBHOOK LOGS */}
      {activeTab === 'appsheet' && (
        <div className="bg-white border border-surface-border rounded-lg p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-ink-primary">AppSheet Webhook Ingestion Log (Last 50 Entries)</h3>
              <p className="text-sm text-ink-secondary mt-0.5">
                Real-time log of billing transactions posted by AppSheet Bots. Check here to confirm connection health and troubleshoot missing transactions.
              </p>
            </div>
            <span className="text-sm font-semibold text-ink-secondary">{appsheetLogs.length} Entries</span>
          </div>

          <DataTable
            columns={appsheetColumns}
            data={appsheetLogs}
            keyField="id"
            emptyMessage="No AppSheet webhooks received yet."
          />
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedPair && (
        <ConfirmationModal
          isOpen={confirmModalOpen}
          title="Confirm Permanent Customer Merge"
          description={`Are you sure you want to merge ${
            survivingId === selectedPair.customer_a.customer_id
              ? selectedPair.customer_b.customer_id
              : selectedPair.customer_a.customer_id
          } into master record ${survivingId}? All points, phone numbers, and vehicles will be consolidated under ${survivingId}. The other ID will be archived permanently. Reason: "${mergeReason}".`}
          confirmText="Yes, Execute Merge"
          cancelText="Cancel"
          variant="danger"
          isLoading={isMerging}
          onConfirm={handleMergeSubmit}
          onCancel={() => setConfirmModalOpen(false)}
        />
      )}

    </div>
  );
};

export default AdminDuplicateScreen;
