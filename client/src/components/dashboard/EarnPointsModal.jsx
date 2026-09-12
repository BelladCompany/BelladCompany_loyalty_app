import React, { useState, useEffect } from 'react';
import { X, PlusCircle, CheckCircle2, AlertCircle, Send, Car, RefreshCw, Database } from 'lucide-react';
import { Button, Input } from '../ui';
import ApiService from '../../services/api';

export const EarnPointsModal = ({
  isOpen,
  customer,
  onClose,
  onSuccess,
  branches = [{ id: 1, name: 'Central Showroom - Bangalore' }],
}) => {
  const [category, setCategory] = useState('service'); // 'service' | 'sale' | 'accessory' | 'bodyshop'
  const [amount, setAmount] = useState('');
  const [jobCardNumber, setJobCardNumber] = useState('');
  const [branchId, setBranchId] = useState(branches[0]?.id || 1);
  const [description, setDescription] = useState('');
  const [isFetchingDms, setIsFetchingDms] = useState(false);
  const [dmsStatus, setDmsStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState({ type: null, text: '' });

  const vehicles = customer?.vehicles || [];
  const hasVehicles = vehicles.length > 0;
  const [selectedVehicleId, setSelectedVehicleId] = useState(hasVehicles ? vehicles[0]?.id || '' : '');

  useEffect(() => {
    if (isOpen) {
      setSuccess(null);
      setSending(false);
      setDmsStatus(null);
      setSendFeedback({ type: null, text: '' });
      const vehicleList = customer?.vehicles || [];
      setSelectedVehicleId(vehicleList.length > 0 ? vehicleList[0]?.id || '' : '');
    }
  }, [isOpen]);

  if (!isOpen || !customer) return null;

  const numAmount = parseFloat(amount || '0');

  // Auto-Fetch DMS Data (called when cashier enters job_card_number / reference_id and clicks Auto-Fetch)
  const handleAutoFetchDms = async () => {
    if (!jobCardNumber.trim()) {
      setError('Please enter a Job Card Number / Reference ID to auto-fetch DMS data.');
      return;
    }
    setError('');
    setIsFetchingDms(true);
    setDmsStatus(null);

    try {
      const res = await ApiService.lookupTransaction(category, jobCardNumber.trim(), branchId);
      if (res.data) {
        const tx = res.data;
        const amountPaise = tx.bill_amount_paise || tx.ex_showroom_price_paise || 0;
        setAmount((amountPaise / 100).toString());
        setDmsStatus({
          type: 'found',
          text: `DMS transaction located! Amount: ₹${(amountPaise / 100).toLocaleString()}`,
        });
      }
    } catch (err) {
      setDmsStatus({
        type: 'not_found',
        text: 'No uncredited DMS transaction found. Proceed with manual entry below.',
      });
    } finally {
      setIsFetchingDms(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (success) return;

    if (!jobCardNumber.trim()) {
      setError('Please enter a Job Card Number / Reference ID.');
      return;
    }

    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid bill amount greater than zero.');
      return;
    }

    if (hasVehicles && !selectedVehicleId) {
      setError('Please select a vehicle to link this transaction to.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        customer_id: customer.customer_id,
        vehicle_id: selectedVehicleId ? parseInt(selectedVehicleId, 10) : undefined,
        branch_id: parseInt(branchId, 10),
        category,
        job_card_number: jobCardNumber.trim(),
        reference_id: jobCardNumber.trim(),
        bill_amount: numAmount,
        source: dmsStatus?.type === 'found' ? 'auto_dms' : 'manual',
      };

      const res = await ApiService.syncTransaction(payload);
      onSuccess(res);
      setSuccess(res);
    } catch (err) {
      setError(err.message || 'Failed to record transaction.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendNow = async () => {
    setSending(true);
    setSendFeedback({ type: null, text: '' });
    try {
      const res = await ApiService.sendPointsEarnedNow({
        customer_id: customer.customer_id,
        points: success?.ledger_entry?.points || 0,
        transaction_type: category,
      });
      setSendFeedback({ type: 'success', text: res.message || 'WhatsApp sent successfully.' });
    } catch (err) {
      setSendFeedback({ type: 'error', text: err.message || 'WhatsApp message failed to send.' });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (sending) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white border-2 border-surface-border rounded-lg shadow-2xl max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <PlusCircle className="w-6 h-6 text-action-primary" />
            <h3 className="text-xl font-bold text-ink-primary">Record Transaction & Credit Points</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading || sending}
            className="p-1 text-ink-secondary hover:text-ink-primary rounded hover:bg-slate-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-action-danger-light border border-red-300 rounded flex items-start gap-2.5 text-action-danger font-bold text-base">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer Context */}
          <div className="p-4 bg-slate-50 border border-surface-border rounded flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-ink-secondary uppercase">Customer</div>
              <div className="text-lg font-bold text-ink-primary">{customer.name}</div>
            </div>
            <div className="font-mono text-base font-bold text-slate-900 bg-white px-3 py-1 border border-surface-border rounded">
              {customer.customer_id}
            </div>
          </div>

          {/* Vehicle Selector */}
          <div>
            <label className="text-base font-bold text-ink-primary block mb-2">
              Vehicle <span className="text-action-danger">*</span>
            </label>
            {hasVehicles ? (
              <div className="space-y-2">
                {vehicles.map((v) => {
                  const isSelected = String(selectedVehicleId || '') === String(v.id);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVehicleId(v.id)}
                      disabled={!!success}
                      className={`w-full flex items-center gap-3 p-3.5 border-2 rounded-lg text-left transition-colors ${
                        isSelected
                          ? 'border-action-primary bg-action-primary-light/40'
                          : 'border-surface-border bg-white hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <Car className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-action-primary' : 'text-ink-muted'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono font-bold text-ink-primary text-base">
                          {v.registration_number || v.chassis_no || v.vin}
                        </div>
                        <div className="text-sm font-medium text-ink-secondary">
                          {v.brand_name || 'Vehicle'}{v.model ? ` · ${v.model}` : ''}
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-action-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded text-sm font-semibold text-amber-900">
                No vehicle registered for this customer. Points will be recorded directly to customer profile.
              </div>
            )}
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="text-base font-bold text-ink-primary block mb-2">
              Transaction Category <span className="text-action-danger">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'service', label: 'Service' },
                { id: 'sale', label: 'Sale' },
                { id: 'accessory', label: 'Accessory' },
                { id: 'bodyshop', label: 'Bodyshop' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  disabled={!!success}
                  className={`
                    h-12 px-3 rounded border font-bold text-sm flex items-center justify-center transition-colors
                    ${category === cat.id ? 'bg-action-primary text-white border-action-primary shadow-sm' : 'bg-white text-ink-primary border-surface-border hover:bg-slate-50'}
                  `}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Job Card / Reference ID & Auto-Fetch DMS Button */}
          <div className="space-y-2">
            <label className="text-base font-bold text-ink-primary block">
              Job Card Number / Invoice Ref <span className="text-action-danger">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. JC-2026-8801"
                value={jobCardNumber}
                onChange={(e) => setJobCardNumber(e.target.value)}
                disabled={isLoading || !!success}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAutoFetchDms}
                disabled={isFetchingDms || !jobCardNumber.trim() || !!success}
                icon={isFetchingDms ? RefreshCw : Database}
                className="h-12 whitespace-nowrap px-4 font-bold"
              >
                {isFetchingDms ? 'Fetching...' : 'Auto-Fetch DMS'}
              </Button>
            </div>
            {dmsStatus && (
              <div className={`p-3 rounded text-sm font-semibold border ${
                dmsStatus.type === 'found' ? 'bg-action-success-light border-green-300 text-green-900' : 'bg-slate-100 border-slate-300 text-ink-secondary'
              }`}>
                {dmsStatus.text}
              </div>
            )}
          </div>

          {/* Bill Amount Input */}
          <Input
            label={category === 'sale' ? 'Pre-Tax Ex-Showroom Amount (₹)' : 'Total Bill Amount (₹)'}
            type="number"
            placeholder="e.g. 5000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            disabled={isLoading || !!success}
            helperText="Server computes exact point allocation based on configured point rules."
          />

          {/* Branch Selector */}
          <div>
            <label className="text-base font-bold text-ink-primary block mb-1.5">Branch Location</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              disabled={isLoading || !!success}
              className="w-full h-12 px-4 bg-white border border-surface-border rounded text-base font-medium focus:border-action-primary focus:outline-none disabled:bg-slate-100 disabled:text-ink-muted"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Read-Only Server Result After Submission */}
          {success ? (
            <div className="space-y-4 pt-4 border-t border-surface-border">
              <div className="p-4 bg-action-success-light border border-green-300 rounded flex items-start gap-2.5 text-green-900 font-bold text-base">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold text-lg">
                    +{success?.ledger_entry?.points?.toLocaleString() || 0} Points Credited Server-Side
                  </div>
                  <div className="text-sm font-medium text-green-800">
                    Status: {success?.status === 'already_processed' ? 'Idempotent Sync (Already Processed)' : 'New Transaction Recorded'}
                  </div>
                </div>
              </div>

              {sendFeedback.type && (
                <div className={`
                  p-3 rounded flex items-start gap-2.5 font-bold text-base border
                  ${sendFeedback.type === 'success' ? 'bg-action-success-light border-green-300 text-green-900' : 'bg-action-danger-light border-red-300 text-action-danger'}
                `}>
                  {sendFeedback.type === 'success'
                    ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                  <span>{sendFeedback.text}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                <Button variant="outline" size="lg" onClick={handleClose} disabled={sending}>
                  Done
                </Button>
                <Button variant="primary" size="lg" icon={Send} onClick={handleSendNow} disabled={sending} className="whitespace-nowrap">
                  {sending ? 'Sending...' : 'Send WhatsApp Now'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
              <Button variant="outline" size="lg" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="lg" disabled={isLoading || !jobCardNumber.trim() || !numAmount}>
                {isLoading ? 'Processing...' : 'Submit Transaction'}
              </Button>
            </div>
          )}
        </form>

      </div>
    </div>
  );
};

export default EarnPointsModal;
