import React, { useState } from 'react';
import { X, Gift, Phone, CheckCircle2, AlertCircle, KeyRound, Copy, Check } from 'lucide-react';
import { Button, Input } from '../ui';
import ApiService from '../../services/api';

export const RedemptionModal = ({
  isOpen,
  customer,
  onClose,
  onSuccess,
  branches = [{ id: 1, name: 'Central Showroom - Bangalore' }],
}) => {
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Enter OTP & Points, 3: Success Summary
  const [selectedPhone, setSelectedPhone] = useState(
    customer?.phones?.[0]?.phone_number || customer?.phone_number || ''
  );
  const [otp, setOtp] = useState('');
  const [points, setPoints] = useState('');
  const [branchId, setBranchId] = useState(branches[0]?.id || 1);
  const [debugOtp, setDebugOtp] = useState('');
  const [whatsappWarning, setWhatsappWarning] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [redemptionResult, setRedemptionResult] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen || !customer) return null;

  const currentBalance = customer.points_balance || customer.current_balance || 0;
  const numPoints = parseInt(points || '0', 10);
  const discountRupees = Math.floor(numPoints / 4);

  // Step 1: Request OTP
  const handleRequestOtp = async () => {
    setError('');
    setWhatsappWarning('');
    setDebugOtp('');
    setIsLoading(true);
    try {
      const res = await ApiService.requestOtp(selectedPhone);
      // In dev mode only: show the auto-fill helper for cashier testing
      if (import.meta.env.DEV && res.data?.debug_otp) {
        setDebugOtp(res.data.debug_otp);
      }
      // Surface WhatsApp delivery warnings (e.g. Reltigrow API timeout)
      if (res.data?.whatsapp_warning) {
        setWhatsappWarning(res.data.whatsapp_warning);
      }
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to request OTP. Check rate limit or phone number.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Submit Redemption
  const handleRedeem = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code provided by the customer.');
      return;
    }

    if (!numPoints || numPoints <= 0) {
      setError('Please enter points to redeem.');
      return;
    }

    if (numPoints > currentBalance) {
      setError(`Requested ${numPoints} points exceeds available balance of ${currentBalance} points.`);
      return;
    }

    setIsLoading(true);
    try {
      const res = await ApiService.redeemPoints({
        phone: selectedPhone,
        otp: otp.trim(),
        points: numPoints,
        branch_id: parseInt(branchId, 10),
        bypass_lock_in: true, // Allow cashier POS redemption
      });

      setRedemptionResult(res.data);
      setStep(3);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      setError(err.message || 'Redemption failed. Check OTP or lock-in requirements.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white border-2 border-surface-border rounded-lg shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <Gift className="w-6 h-6 text-action-success" />
            <h3 className="text-xl font-bold text-ink-primary">
              Points Redemption (Step {step} of 3)
            </h3>
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

        {/* Modal Content */}
        <div className="p-6">
          {error && (
            <div className="mb-5 p-4 bg-action-danger-light border-2 border-red-300 rounded flex items-start gap-2.5 text-action-danger font-bold text-base">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Request OTP */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 border border-surface-border rounded space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-ink-secondary">Customer</span>
                  <span className="font-mono font-bold text-ink-primary">{customer.customer_id}</span>
                </div>
                <div className="text-xl font-bold text-ink-primary">{customer.name}</div>
                <div className="text-base font-semibold text-action-primary">
                  Available Balance: {Number(currentBalance).toLocaleString()} Points (≈ ₹{Math.floor(currentBalance / 4).toLocaleString()})
                </div>
              </div>

              <div>
                <label className="text-base font-bold text-ink-primary block mb-2">
                  Select Phone Number to Receive OTP:
                </label>
                <div className="space-y-2">
                  {(customer.phones || []).map((p, idx) => (
                    <label
                      key={idx}
                      className={`
                        flex items-center justify-between p-3.5 border rounded cursor-pointer transition-colors
                        ${selectedPhone === (p.phone_number || p) ? 'border-action-primary bg-action-primary-light/50 font-bold' : 'border-surface-border bg-white hover:bg-slate-50'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="otp_phone"
                          value={p.phone_number || p}
                          checked={selectedPhone === (p.phone_number || p)}
                          onChange={() => setSelectedPhone(p.phone_number || p)}
                          className="w-5 h-5 text-action-primary"
                        />
                        <span className="text-lg font-mono">{p.phone_number || p}</span>
                      </div>
                      {p.is_primary && <span className="text-xs font-bold text-action-primary">(Main Contact)</span>}
                    </label>
                  ))}
                </div>
              </div>

              <div className="text-sm font-medium text-ink-secondary bg-slate-50 p-3 border border-surface-border rounded">
                🔒 OTPs are 6-digit single-use codes valid for 10 minutes (Rate limit: 5 per hour).
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
                <Button variant="outline" size="lg" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button variant="success" size="lg" onClick={handleRequestOtp} disabled={isLoading || !selectedPhone}>
                  {isLoading ? 'Sending OTP...' : 'Send OTP to Customer Phone'}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Enter OTP & Points */}
          {step === 2 && (
            <form onSubmit={handleRedeem} className="space-y-6">
              <div className="p-4 bg-action-success-light border border-green-300 rounded flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-action-success uppercase">OTP Sent To</div>
                  <div className="text-lg font-mono font-bold text-green-950">{selectedPhone}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // Navigate back to step 1 — next "Send OTP" will regenerate a new OTP and invalidate the old one
                    setStep(1);
                    setOtp('');
                    setDebugOtp('');
                    setWhatsappWarning('');
                    setError('');
                  }}
                  className="text-sm font-bold text-action-primary underline"
                >
                  Resend / Change
                </button>
              </div>

              {/* WhatsApp delivery warning */}
              {whatsappWarning && (
                <div className="p-3 bg-amber-50 border border-amber-400 rounded flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-amber-900">{whatsappWarning}</p>
                </div>
              )}

              {/* Development-only debug OTP helper (never shown in production) */}
              {import.meta.env.DEV && debugOtp && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded text-sm text-amber-950 flex items-center justify-between font-mono">
                  <span>Terminal Auto-Fill (DEV only): <strong>{debugOtp}</strong></span>
                  <button
                    type="button"
                    onClick={() => setOtp(debugOtp)}
                    className="px-2 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold rounded"
                  >
                    Use Code
                  </button>
                </div>
              )}

              <Input
                label="Customer OTP (6-Digits)"
                placeholder="e.g. 482910"
                icon={KeyRound}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                helperText="Ask the customer for the 6-digit code received via WhatsApp/SMS"
              />

              <Input
                label={`Points to Redeem (Max: ${Number(currentBalance).toLocaleString()} PTS)`}
                type="number"
                placeholder="e.g. 4000"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                required
                helperText="Fixed conversion rate: 4 points = 1 rupee discount"
              />

              {/* Live Discount Calculator Preview */}
              <div className="p-4 bg-action-primary-light border border-blue-300 rounded flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-action-primary uppercase">Bill Discount Applied</div>
                  <div className="text-3xl font-extrabold text-action-primary tabular-nums">
                    ₹{discountRupees.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-ink-secondary uppercase">Points Deducted</div>
                  <div className="text-xl font-bold text-action-danger font-mono tabular-nums">
                    -{numPoints.toLocaleString()} PTS
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
                <Button variant="outline" size="lg" onClick={() => setStep(1)} disabled={isLoading}>
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  size="lg"
                  disabled={isLoading || !otp || numPoints <= 0 || numPoints > currentBalance}
                >
                  {isLoading ? 'Validating...' : `Apply ₹${discountRupees.toLocaleString()} Discount`}
                </Button>
              </div>
            </form>
          )}

          {/* STEP 3: Success Confirmation */}
          {step === 3 && redemptionResult && (
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center justify-center p-4 bg-action-success-light rounded-full border-2 border-green-400">
                <CheckCircle2 className="w-12 h-12 text-action-success" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-ink-primary">Redemption Successful!</h3>
                <p className="text-base text-ink-secondary mt-1">
                  Discount of <strong className="text-action-success text-xl">₹{redemptionResult.discount_amount_rupees?.toLocaleString()}</strong> has been approved.
                </p>
              </div>

              {/* Unique Redemption Code Banner */}
              <div className="p-5 bg-slate-900 text-white rounded-lg border-2 border-slate-700 space-y-2">
                <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">Unique Redemption Code</div>
                <div className="text-2xl font-mono font-extrabold tracking-wider text-amber-400 flex items-center justify-center gap-2">
                  <span>{redemptionResult.redemption_code}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(redemptionResult.redemption_code)}
                    className="p-1 hover:bg-slate-800 rounded"
                    title="Copy Code"
                  >
                    {copiedCode ? <Check className="w-5 h-5 text-action-success" /> : <Copy className="w-5 h-5 text-slate-400" />}
                  </button>
                </div>
                <div className="text-xs text-slate-300">
                  Provide this code to RealBooks or cashier counter receipt.
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-surface-border rounded flex items-center justify-between text-base">
                <span className="font-bold text-ink-secondary">Remaining Customer Balance:</span>
                <span className="font-mono font-bold text-ink-primary text-lg">
                  {Number(redemptionResult.remaining_balance).toLocaleString()} PTS
                </span>
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => {
                  onClose();
                  setStep(1);
                }}
              >
                Done / Return to Counter
              </Button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default RedemptionModal;
