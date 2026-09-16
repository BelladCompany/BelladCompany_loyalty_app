import React, { useState, useEffect } from 'react';
import { X, PlusCircle, CheckCircle2, AlertCircle, Send, Car, RefreshCw, Database, KeyRound, ShieldCheck, Calculator, ArrowRight } from 'lucide-react';
import { Button, Input } from '../ui';
import ApiService from '../../services/api';

export const EarnPointsModal = ({
  isOpen,
  customer,
  onClose,
  onSuccess,
  branches = [{ id: 1, name: 'Central Showroom - Bangalore' }],
}) => {
  const [step, setStep] = useState(1); // 1: OTP Request, 2: Details & Live Calc, 3: Success
  const [otp, setOtp] = useState('');
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [otpDebug, setOtpDebug] = useState('');
  const [otpFeedback, setOtpFeedback] = useState('');

  const [category, setCategory] = useState('service'); // 'service' | 'sale' | 'accessory' | 'bodyshop'
  const [amount, setAmount] = useState('');
  const [jobCardNumber, setJobCardNumber] = useState('');
  const [branchId, setBranchId] = useState(branches[0]?.id || 1);
  const [isFetchingDms, setIsFetchingDms] = useState(false);
  const [dmsStatus, setDmsStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState({ type: null, text: '' });

  const customerPhone =
    customer?.phone ||
    customer?.primary_phone ||
    customer?.phones?.[0]?.phone_number ||
    customer?.phone_number ||
    '';

  const vehicles = customer?.vehicles || [];
  const hasVehicles = vehicles.length > 0;
  const [selectedVehicleId, setSelectedVehicleId] = useState(hasVehicles ? vehicles[0]?.id || '' : '');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setOtp('');
      setOtpDebug('');
      setOtpFeedback('');
      setError('');
      setSuccess(null);
      setSending(false);
      setDmsStatus(null);
      setSendFeedback({ type: null, text: '' });
      setAmount('');
      setJobCardNumber('');
      const vehicleList = customer?.vehicles || [];
      setSelectedVehicleId(vehicleList.length > 0 ? vehicleList[0]?.id || '' : '');
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const numAmount = parseFloat(amount || '0');
  const currentPoints = customer?.total_points ?? customer?.points_balance ?? 0;
  
  // Dynamic preview earning calculation (1 pt per ₹100 spent on service/acc/bodyshop, 1 pt per ₹1000 on sale)
  const rateMultiplier = category === 'sale' ? 1000 : 100;
  const previewEarnedPoints = numAmount > 0 ? Math.floor(numAmount / rateMultiplier) : 0;
  const previewNewBalance = currentPoints + previewEarnedPoints;

  // Step 1: Request OTP from backend
  const handleRequestOtp = async () => {
    setError('');
    setIsRequestingOtp(true);
    setOtpFeedback('');

    try {
      const res = await ApiService.requestOtp(customerPhone || customer.customer_id);
      setOtpFeedback(`OTP sent via WhatsApp to ${res.phone_number || customerPhone || 'customer'}.`);
      if (res.debug_otp) {
        setOtpDebug(res.debug_otp);
        setOtp(res.debug_otp); // Auto-fill in dev mode for convenience
      }
      setStep(2);
    } catch (err) {
      // If OTP request fails (e.g. phone not found), allow fallback skip to Step 2 with warning
      setOtpFeedback('Proceed with POS authorization code.');
      setStep(2);
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // Resend OTP inside Step 2
  const handleResendOtp = async () => {
    setError('');
    setIsRequestingOtp(true);
    try {
      const res = await ApiService.requestOtp(customerPhone || customer.customer_id);
      setOtpFeedback(`Resent OTP to ${res.phone_number || customerPhone}. Valid for 10 minutes.`);
      if (res.debug_otp) {
        setOtpDebug(res.debug_otp);
        setOtp(res.debug_otp);
      }
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // Auto-Fetch DMS Data
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

    if (!otp.trim()) {
      setError('Please enter the 6-digit OTP received by the customer.');
      return;
    }

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
        phone_number: customerPhone,
        vehicle_id: selectedVehicleId ? parseInt(selectedVehicleId, 10) : undefined,
        branch_id: parseInt(branchId, 10),
        category,
        job_card_number: jobCardNumber.trim(),
        reference_id: jobCardNumber.trim(),
        bill_amount: numAmount,
        otp: otp.trim(),
        source: dmsStatus?.type === 'found' ? 'auto_dms' : 'manual',
      };

      const res = await ApiService.syncTransaction(payload);
      setSuccess(res);
      setStep(3);
      if (onSuccess) onSuccess(res);
    } catch (err) {
      setError(err.message || 'Failed to record transaction and verify OTP.');
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
        points: success?.ledger_entry?.points || previewEarnedPoints,
        transaction_type: category,
      });
      setSendFeedback({ type: 'success', text: res.message || 'WhatsApp message sent successfully.' });
    } catch (err) {
      setSendFeedback({ type: 'error', text: err.message || 'WhatsApp message failed to send.' });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (sending || isLoading) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white border-2 border-surface-border rounded-xl shadow-2xl max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <PlusCircle className="w-6 h-6 text-emerald-400" />
            <h3 className="text-xl font-bold tracking-tight">Record Service & Get Points</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading || sending}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Customer Context Summary */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-surface-border flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-ink-secondary uppercase tracking-wider">Customer Profile</div>
            <div className="text-base font-extrabold text-ink-primary flex items-center gap-2">
              <span>{customer.name || customer.customer_name}</span>
              {customerPhone && (
                <span className="text-xs font-mono font-medium text-slate-500 bg-white px-2 py-0.5 border border-slate-200 rounded">
                  +91 {customerPhone}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-ink-secondary uppercase tracking-wider">Current Points</div>
            <div className="text-lg font-black text-emerald-600 font-mono">
              {currentPoints.toLocaleString()} PTS
            </div>
          </div>
        </div>

        {/* Step 1: Request OTP Screen */}
        {step === 1 && (
          <div className="p-6 space-y-6">
            <div className="p-5 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-900 space-y-3">
              <div className="flex items-center gap-2 font-bold text-base text-blue-900">
                <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span>Step 1: Send OTP to Customer</span>
              </div>
              <p className="text-sm text-blue-800 leading-relaxed">
                Before crediting service points, a 6-digit WhatsApp OTP must be sent to the customer’s phone for verification.
              </p>
              {customerPhone ? (
                <div className="p-3 bg-white border border-blue-200 rounded-lg font-mono font-bold text-base text-slate-900 flex items-center justify-between">
                  <span>Registered Mobile:</span>
                  <span className="text-blue-700">+91 {customerPhone}</span>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-900 font-semibold">
                  No mobile number on file. OTP will be sent to primary account contact.
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 bg-action-danger-light border border-red-300 rounded-lg flex items-start gap-2.5 text-action-danger font-bold text-base">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-surface-border">
              <Button variant="outline" size="lg" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleRequestOtp}
                disabled={isRequestingOtp}
                icon={isRequestingOtp ? RefreshCw : Send}
                className="whitespace-nowrap font-bold"
              >
                {isRequestingOtp ? 'Sending OTP...' : 'Send WhatsApp OTP to Customer'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Form & Live Point Auto-Calculations */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="p-4 bg-action-danger-light border border-red-300 rounded-lg flex items-start gap-2.5 text-action-danger font-bold text-base">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* OTP Entry Section */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 text-white">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold flex items-center gap-2 text-slate-200">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  Enter 6-Digit WhatsApp OTP <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isRequestingOtp}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
                >
                  {isRequestingOtp ? 'Sending...' : 'Resend OTP'}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <Input
                  placeholder="e.g. 849201"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                  disabled={isLoading}
                  className="bg-white text-slate-900 font-mono font-bold text-lg tracking-widest text-center h-12"
                />
              </div>

              {otpFeedback && (
                <div className="text-xs text-emerald-300 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                  <span>{otpFeedback}</span>
                </div>
              )}

              {otpDebug && (
                <div className="text-xs font-mono font-bold bg-amber-500/20 border border-amber-400/40 text-amber-300 p-2 rounded flex items-center justify-between">
                  <span>Demo/Sandbox OTP:</span>
                  <span className="text-amber-200 tracking-widest">{otpDebug}</span>
                </div>
              )}
            </div>

            {/* Vehicle Selector */}
            <div>
              <label className="text-base font-bold text-ink-primary block mb-2">
                Vehicle <span className="text-action-danger">*</span>
              </label>
              {hasVehicles ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {vehicles.map((v) => {
                    const isSelected = String(selectedVehicleId || '') === String(v.id);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVehicleId(v.id)}
                        disabled={isLoading}
                        className={`w-full flex items-center gap-3 p-3 border-2 rounded-lg text-left transition-colors ${
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
                <div className="p-3 bg-amber-50 border border-amber-300 rounded text-xs font-semibold text-amber-900">
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
                    disabled={isLoading}
                    className={`
                      h-11 px-3 rounded border font-bold text-sm flex items-center justify-center transition-colors
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
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAutoFetchDms}
                  disabled={isFetchingDms || !jobCardNumber.trim()}
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
              disabled={isLoading}
            />

            {/* Branch Selector */}
            <div>
              <label className="text-base font-bold text-ink-primary block mb-1.5">Branch Location</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                disabled={isLoading}
                className="w-full h-12 px-4 bg-white border border-surface-border rounded text-base font-medium focus:border-action-primary focus:outline-none disabled:bg-slate-100 disabled:text-ink-muted"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* LIVE AUTO-CALCULATED DETAILS CARD */}
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-base border-b border-emerald-200 pb-2">
                <Calculator className="w-5 h-5 text-emerald-700" />
                <span>Live Auto-Calculated Details</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white p-3 rounded-lg border border-emerald-200">
                  <div className="text-xs font-semibold text-emerald-800">Bill Amount</div>
                  <div className="text-lg font-black text-slate-900 font-mono">
                    ₹{numAmount > 0 ? numAmount.toLocaleString() : '0'}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-emerald-200">
                  <div className="text-xs font-semibold text-emerald-800">Earning Rate</div>
                  <div className="text-sm font-bold text-slate-700">
                    {category === 'sale' ? '1 PT per ₹1,000' : '1 PT per ₹100 (1%)'}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-emerald-200">
                  <div className="text-xs font-semibold text-emerald-800">New Service Points Earned</div>
                  <div className="text-lg font-black text-emerald-600 font-mono">
                    +{previewEarnedPoints.toLocaleString()} PTS
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-emerald-200">
                  <div className="text-xs font-semibold text-emerald-800">New Final Balance</div>
                  <div className="text-lg font-black text-blue-700 font-mono">
                    {previewNewBalance.toLocaleString()} PTS
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
              <Button variant="outline" size="lg" onClick={() => setStep(1)} disabled={isLoading}>
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isLoading || !otp.trim() || !jobCardNumber.trim() || !numAmount}
                className="font-bold whitespace-nowrap"
              >
                {isLoading ? 'Verifying OTP & Syncing...' : 'Verify OTP & Credit Points'}
              </Button>
            </div>
          </form>
        )}

        {/* Step 3: Success Confirmation View */}
        {step === 3 && (
          <div className="p-6 space-y-6">
            <div className="p-5 bg-emerald-50 border-2 border-emerald-400 rounded-xl space-y-3 text-emerald-950">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                <div>
                  <div className="font-black text-xl text-emerald-900">
                    +{success?.ledger_entry?.points?.toLocaleString() || previewEarnedPoints.toLocaleString()} Points Credited Successfully!
                  </div>
                  <div className="text-sm font-semibold text-emerald-800">
                    OTP Verified · Transaction Sync Completed
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transaction Summary</div>
              <div className="flex items-center justify-between text-base font-semibold text-slate-800">
                <span>Job Card / Ref ID:</span>
                <span className="font-mono font-bold text-slate-900">{jobCardNumber}</span>
              </div>
              <div className="flex items-center justify-between text-base font-semibold text-slate-800">
                <span>Bill Amount Paid:</span>
                <span className="font-mono font-bold text-slate-900">₹{numAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Updated Final Customer Balance:</span>
                <span className="font-mono text-xl text-emerald-600">
                  {(currentPoints + (success?.ledger_entry?.points || previewEarnedPoints)).toLocaleString()} PTS
                </span>
              </div>
            </div>

            {sendFeedback.type && (
              <div className={`
                p-3 rounded-lg flex items-start gap-2.5 font-bold text-sm border
                ${sendFeedback.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-300 text-red-900'}
              `}>
                {sendFeedback.type === 'success'
                  ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
                  : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />}
                <span>{sendFeedback.text}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-surface-border">
              <Button variant="outline" size="lg" onClick={handleClose} disabled={sending}>
                Done
              </Button>
              <Button variant="primary" size="lg" icon={Send} onClick={handleSendNow} disabled={sending} className="whitespace-nowrap font-bold">
                {sending ? 'Sending...' : 'Send WhatsApp Confirmation'}
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default EarnPointsModal;
