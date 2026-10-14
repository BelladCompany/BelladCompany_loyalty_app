import React, { useState, useEffect } from 'react';
import {
  X,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Send,
  Car,
  RefreshCw,
  Database,
  KeyRound,
  ShieldCheck,
  Calculator,
  ArrowRight,
  Sparkles,
  Phone,
  Coins
} from 'lucide-react';
import { Button } from '../ui';
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

  const [category, setCategory] = useState('service'); // 'service' | 'sale' | 'accessories' | 'bodyshop'
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
    (typeof customer?.phones?.[0] === 'string' ? customer.phones[0] : customer?.phones?.[0]?.phone_number) ||
    customer?.phone ||
    customer?.primary_phone ||
    customer?.phone_number ||
    customer?.phones?.[0]?.phone ||
    '';

  const vehicles = customer?.vehicles || [];
  const hasVehicles = vehicles.length > 0;
  const [selectedVehicleId, setSelectedVehicleId] = useState(hasVehicles ? vehicles[0]?.id || '' : '');

  const [discountAmount, setDiscountAmount] = useState('0');

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
      setDiscountAmount('0');
      setJobCardNumber('');
      const vehicleList = customer?.vehicles || [];
      setSelectedVehicleId(vehicleList.length > 0 ? vehicleList[0]?.id || '' : '');
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const numAmount = parseFloat(amount || '0');
  const numDiscount = parseFloat(discountAmount || '0');
  const netAmount = category === 'sale' ? Math.max(0, numAmount - numDiscount) : numAmount;
  const currentPoints = Math.max(0, customer?.total_points ?? customer?.points_balance ?? 0);

  // Dynamic preview earning calculation based on category (Service 4%, Accessory 2%, Bodyshop 3%, Sale 1%)
  const rateMultiplier =
    category === 'service' ? 4 : category === 'accessories' ? 2 : category === 'bodyshop' ? 3 : 1;
  const previewEarnedPoints = netAmount > 0 ? Math.floor((netAmount / 100) * rateMultiplier) : 0;
  const previewNewBalance = currentPoints + previewEarnedPoints;

  // Step 1: Request OTP from backend
  const handleRequestOtp = async () => {
    setError('');
    setIsRequestingOtp(true);
    setOtpFeedback('');

    try {
      const res = await ApiService.requestOtp({
        phone: customerPhone,
        customer_id: customer.customer_id,
      });
      const code = res.data?.debug_otp || res.data?.dummy_otp || res.debug_otp || res.dummy_otp || '123456';
      setOtpFeedback(`OTP generated (Test Mode Code: ${code})`);
      setOtpDebug(code);
      setOtp(code);
      setStep(2);
    } catch (err) {
      setOtpFeedback('Proceeding in Test Mode with code 123456.');
      setOtpDebug('123456');
      setOtp('123456');
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
      const res = await ApiService.requestOtp({
        phone: customerPhone,
        customer_id: customer.customer_id,
      });
      const code = res.data?.debug_otp || res.data?.dummy_otp || res.debug_otp || res.dummy_otp || '123456';
      setOtpFeedback(`Resent OTP (Test Code: ${code})`);
      setOtpDebug(code);
      setOtp(code);
    } catch (err) {
      setOtpFeedback('Test Mode Active (Use 123456).');
      setOtpDebug('123456');
      setOtp('123456');
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

    const isInhouse = category.startsWith('inhouse_');

    if (!isInhouse && (!numAmount || numAmount <= 0)) {
      setError('Please enter a valid bill amount greater than zero.');
      return;
    }

    if (hasVehicles && !selectedVehicleId) {
      setError('Please select a vehicle to link this transaction to.');
      return;
    }

    setIsLoading(true);
    try {
      let res;
      if (isInhouse) {
        let pts = 0;
        let desc = '';
        if (category === 'inhouse_finance') {
          pts = 100;
          desc = 'In-house Finance Bonus';
        }
        if (category === 'inhouse_insurance') {
          pts = 50;
          desc = 'In-house Insurance Bonus';
        }
        if (category === 'inhouse_exchange') {
          pts = 200;
          desc = 'In-house Exchange Bonus';
        }

        const payload = {
          customer_id: customer.customer_id,
          vehicle_id: selectedVehicleId ? parseInt(selectedVehicleId, 10) : undefined,
          branch_id: parseInt(branchId, 10),
          type: 'earn_service',
          points: pts,
          reference_id: jobCardNumber.trim(),
          description: desc,
        };
        res = await ApiService.grantInhouseBonus(payload);
      } else {
        const payload = {
          customer_id: customer.customer_id,
          phone_number: customerPhone,
          vehicle_id: selectedVehicleId ? parseInt(selectedVehicleId, 10) : undefined,
          branch_id: parseInt(branchId, 10),
          category,
          job_card_number: jobCardNumber.trim(),
          reference_id: jobCardNumber.trim(),
          bill_amount: netAmount,
          ex_showroom_price: category === 'sale' ? numAmount : netAmount,
          dealer_cash_discount: category === 'sale' ? numDiscount : 0,
          otp: otp.trim(),
          source: dmsStatus?.type === 'found' ? 'auto_dms' : 'manual',
        };
        res = await ApiService.syncTransaction(payload);
      }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* Clean Light Header */}
        <div className="flex items-center justify-between px-7 py-5 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Record Service & Earn Points</h3>
              <p className="text-xs font-semibold text-slate-500">Transaction Points Verification</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading || sending}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Context Summary Banner */}
        <div className="px-7 py-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Customer Profile</div>
            <div className="text-base font-black text-slate-900 flex items-center gap-2 mt-0.5">
              <span>{customer.name || customer.customer_name}</span>
              {customerPhone && (
                <span className="text-xs font-mono font-bold text-slate-600 bg-white px-2.5 py-0.5 border border-slate-200 rounded-lg">
                  +91 {customerPhone}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Current Balance</div>
            <div className="text-lg font-black text-indigo-600 font-mono mt-0.5">
              {currentPoints.toLocaleString()} PTS
            </div>
          </div>
        </div>

        {/* Step 1: Request OTP Screen */}
        {step === 1 && (
          <div className="p-7 space-y-6">
            <div className="p-6 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl text-indigo-950 space-y-4">
              <div className="flex items-center gap-2.5 font-bold text-base text-indigo-900">
                <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <span>Step 1: Security WhatsApp OTP</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                Before crediting transaction points, a 6-digit WhatsApp OTP is sent to the customer’s verified mobile number.
              </p>
              {customerPhone ? (
                <div className="p-4 bg-white border border-indigo-200 rounded-xl font-mono font-bold text-base text-slate-900 flex items-center justify-between shadow-2xs">
                  <span className="text-slate-500 text-xs font-bold uppercase">Registered Mobile:</span>
                  <span className="text-indigo-600 text-base font-black">+91 {customerPhone}</span>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-900 font-semibold">
                  No mobile number on file. OTP will be sent to primary account contact.
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 font-bold text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button variant="outline" size="md" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="dark"
                size="md"
                onClick={handleRequestOtp}
                disabled={isRequestingOtp}
                icon={isRequestingOtp ? RefreshCw : Send}
                className="whitespace-nowrap font-black rounded-full px-6"
              >
                {isRequestingOtp ? 'Sending OTP...' : 'Send WhatsApp OTP to Customer'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Form & Live Calculation Preview */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="p-7 space-y-6">
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 font-bold text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* OTP Verification Box */}
            <div className="p-5 bg-indigo-50/50 border border-indigo-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold flex items-center gap-2 text-indigo-950">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  Enter 6-Digit WhatsApp OTP <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isRequestingOtp}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                >
                  {isRequestingOtp ? 'Sending...' : 'Resend OTP'}
                </button>
              </div>

              <input
                id="earn-otp"
                type="text"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full h-13 text-center text-2xl font-mono font-black tracking-widest border border-indigo-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              />

              <div className="flex items-center justify-between text-xs font-bold text-indigo-900 pt-1">
                <span>💡 Test OTP: <strong>{otpDebug || '123456'}</strong></span>
                <button
                  type="button"
                  onClick={() => setOtp(otpDebug || '123456')}
                  className="px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 rounded-lg text-indigo-900 transition-colors"
                >
                  Auto-Fill
                </button>
              </div>
            </div>

            {/* Spend Category Selection */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                Spend Category <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'service', label: 'Service (4%)' },
                  { id: 'sale', label: 'Sale (1%)' },
                  { id: 'accessories', label: 'Accessories (2%)' },
                  { id: 'bodyshop', label: 'Bodyshop (3%)' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`h-11 px-3 rounded-xl text-xs font-bold transition-all border ${
                      category === cat.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* In-House Bonus Pills */}
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">
                Special In-House Schemes
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'inhouse_exchange', label: 'Exchange (+200)' },
                  { id: 'inhouse_insurance', label: 'Insurance (+50)' },
                  { id: 'inhouse_finance', label: 'Finance (+100)' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`h-10 px-2 rounded-xl text-xs font-bold transition-all border ${
                      category === cat.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle Selection */}
            {hasVehicles && (
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Linked Vehicle <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-base font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number || v.vin} — {v.brand_name || 'Vehicle'} {v.model ? `(${v.model})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Reference ID / Job Card Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Job Card / Invoice No <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoFetchDms}
                  disabled={isFetchingDms}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Database className="w-3.5 h-3.5" />
                  {isFetchingDms ? 'Fetching DMS...' : 'Auto-Fetch DMS'}
                </button>
              </div>
              <input
                type="text"
                placeholder="e.g. JC-2024-99881"
                value={jobCardNumber}
                onChange={(e) => setJobCardNumber(e.target.value)}
                className="w-full h-12 px-4 font-mono font-bold text-base rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-indigo-600"
              />
              {dmsStatus && (
                <p
                  className={`text-xs font-bold mt-1.5 ${
                    dmsStatus.type === 'found' ? 'text-emerald-600' : 'text-slate-500'
                  }`}
                >
                  {dmsStatus.text}
                </p>
              )}
            </div>

            {/* Bill Amount Input */}
            {!category.startsWith('inhouse_') && (
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Bill Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">₹</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 5400"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-13 pl-9 pr-4 font-mono font-black text-xl rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>
            )}

            {/* Live Calculation Hero Card (Image 1 Frosted Style) */}
            {numAmount > 0 && !category.startsWith('inhouse_') && (
              <div className="hero-card-purple p-5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-purple-200">
                  <span>Live Points Earning Calculation</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full">{rateMultiplier}% Multiplier</span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <div className="text-2xl font-black text-white">
                      +{previewEarnedPoints.toLocaleString()} <span className="text-sm font-bold text-purple-200">PTS</span>
                    </div>
                    <div className="text-xs text-purple-200 font-medium">New Total: {previewNewBalance.toLocaleString()} PTS</div>
                  </div>
                  <div className="text-right text-xs font-bold text-purple-100">
                    ≈ ₹{Math.floor(previewEarnedPoints / 4)} Cashback
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <Button variant="outline" size="md" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="primary"
                size="lg"
                type="submit"
                disabled={isLoading}
                icon={isLoading ? RefreshCw : Sparkles}
                className="whitespace-nowrap font-black px-8"
              >
                {isLoading ? 'Verifying & Crediting...' : 'Confirm & Credit Points'}
              </Button>
            </div>
          </form>
        )}

        {/* Step 3: Success Screen */}
        {step === 3 && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-2xl font-black text-slate-900 tracking-tight">Points Credited Successfully!</h4>
              <p className="text-sm text-slate-500 mt-1">Transaction recorded with verified customer OTP.</p>
            </div>

            <div className="card-white-glow p-5 max-w-sm mx-auto space-y-2 bg-slate-50/70 border border-slate-200">
              <div className="text-xs font-black uppercase text-slate-400">Total Points Awarded</div>
              <div className="text-3xl font-black text-emerald-600 font-mono">
                +{success?.ledger_entry?.points || previewEarnedPoints} PTS
              </div>
              <div className="text-xs font-bold text-slate-600">
                New Available Balance: {previewNewBalance.toLocaleString()} PTS
              </div>
            </div>

            {sendFeedback.text && (
              <div
                className={`p-3 rounded-xl text-xs font-bold ${
                  sendFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {sendFeedback.text}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-4">
              <Button
                variant="outline"
                size="md"
                onClick={handleSendNow}
                disabled={sending}
                icon={Send}
              >
                {sending ? 'Sending...' : 'Send WhatsApp Confirmation'}
              </Button>
              <Button variant="dark" size="md" onClick={handleClose}>
                Done & Return
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EarnPointsModal;
