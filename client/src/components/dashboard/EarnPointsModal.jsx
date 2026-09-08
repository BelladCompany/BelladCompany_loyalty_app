import React, { useState } from 'react';
import { X, PlusCircle, Calculator, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, Input } from '../ui';
import ApiService from '../../services/api';

export const EarnPointsModal = ({
  isOpen,
  customer,
  onClose,
  onSuccess,
  branches = [{ id: 1, name: 'Central Showroom - Bangalore' }],
}) => {
  const [type, setType] = useState('sale'); // 'sale' | 'service'
  const [amount, setAmount] = useState('');
  const [branchId, setBranchId] = useState(branches[0]?.id || 1);
  const [referenceId, setReferenceId] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !customer) return null;

  // Exact integer calculation preview
  const numAmount = parseInt(amount || '0', 10);
  const pointsPreview = type === 'sale'
    ? Math.floor(numAmount / 100)
    : Math.floor((numAmount / 100) * 4);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        customer_id: customer.customer_id,
        branch_id: parseInt(branchId, 10),
        type,
        amount: numAmount,
        reference_id: referenceId || undefined,
        description: description || undefined,
      };

      const res = await ApiService.earnPoints(payload);
      onSuccess(res.data);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record points transaction.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white border-2 border-surface-border rounded-lg shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <PlusCircle className="w-6 h-6 text-action-primary" />
            <h3 className="text-xl font-bold text-ink-primary">Record Points Earning</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
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

          {/* Transaction Type Selector (48px tap targets) */}
          <div>
            <label className="text-base font-bold text-ink-primary block mb-2">
              Transaction Type <span className="text-action-danger">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('sale')}
                className={`
                  h-12 px-4 rounded border font-bold text-base flex items-center justify-center gap-2 transition-colors
                  ${type === 'sale' ? 'bg-action-primary text-white border-action-primary shadow-sm' : 'bg-white text-ink-primary border-surface-border hover:bg-slate-50'}
                `}
              >
                <span>Vehicle Sale</span>
                <span className="text-xs opacity-80">(Ex-showroom / 100)</span>
              </button>
              <button
                type="button"
                onClick={() => setType('service')}
                className={`
                  h-12 px-4 rounded border font-bold text-base flex items-center justify-center gap-2 transition-colors
                  ${type === 'service' ? 'bg-action-primary text-white border-action-primary shadow-sm' : 'bg-white text-ink-primary border-surface-border hover:bg-slate-50'}
                `}
              >
                <span>Service / Workshop</span>
                <span className="text-xs opacity-80">(Bill / 100 × 4)</span>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <Input
            label={type === 'sale' ? 'Pre-Tax Ex-Showroom Amount (₹)' : 'Total Workshop Bill Amount (₹)'}
            type="number"
            placeholder="e.g. 850000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            helperText={type === 'sale' ? 'Calculated on ex-showroom price only (not on-road price)' : 'Calculated on total invoice bill amount'}
          />

          {/* Live Points Calculated Box */}
          <div className="p-4 bg-action-primary-light border border-blue-300 rounded flex items-center justify-between">
            <div className="flex items-center gap-2 text-action-primary font-bold text-base">
              <Calculator className="w-5 h-5" />
              <span>Calculated Points Awarded:</span>
            </div>
            <div className="text-2xl font-extrabold text-action-primary font-mono tabular-nums">
              +{pointsPreview.toLocaleString()} PTS
            </div>
          </div>

          {/* Reference Invoice ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Invoice / RO Number"
              placeholder="e.g. INV-2026-9901"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
            />
            <div>
              <label className="text-base font-bold text-ink-primary block mb-1.5">Branch Location</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full h-12 px-4 bg-white border border-surface-border rounded text-base font-medium focus:border-action-primary focus:outline-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
            <Button variant="outline" size="lg" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="lg" disabled={isLoading || pointsPreview <= 0}>
              {isLoading ? 'Recording...' : `Award ${pointsPreview.toLocaleString()} Points`}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default EarnPointsModal;
