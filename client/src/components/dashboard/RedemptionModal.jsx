import React, { useState, useEffect } from 'react';
import {
  Gift,
  AlertCircle,
  CheckCircle2,
  X,
  Car,
  KeyRound,
  FileText,
  CreditCard,
  Receipt,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Calculator,
  Lock,
} from 'lucide-react';
import ApiService from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';

// Rate Constants
const POINTS_PER_RUPEE_REDEMPTION = 0.25; // 4 points = ₹1 discount
const POINTS_PER_100_RUPEES_EARNED = 4;     // 4 points per ₹100 cash paid

// ─── Eligibility Status Badge Component ───────────────────────────────────────

function EligibilityBanner({ status, eligible_at, expires_at, points_balance, message, loading, isManualCustomer }) {
  if (loading) {
    return (
      <div className="p-4 bg-slate-100 border border-slate-300 rounded-lg animate-pulse text-slate-600 font-semibold text-sm">
        Checking vehicle eligibility status…
      </div>
    );
  }

  if (!status) return null;

  const config = {
    eligible: {
      bg: 'bg-emerald-50 border-emerald-300 text-emerald-900',
      badge: 'bg-emerald-600 text-white',
      badgeText: isManualCustomer ? 'ACTIVE FOR GET POINTS' : 'ELIGIBLE TO REDEEM',
      icon: CheckCircle2,
    },
    locked: {
      bg: 'bg-amber-50 border-amber-300 text-amber-900',
      badge: 'bg-amber-500 text-white',
      badgeText: 'WINDOW LOCKED',
      icon: AlertCircle,
    },
    locked_pending_correction: {
      bg: 'bg-amber-100 border-2 border-amber-400 text-amber-950',
      badge: 'bg-amber-600 text-white',
      badgeText: 'PENDING CORRECTION TICKET LOCK',
      icon: AlertCircle,
    },
    expired: {
      bg: 'bg-rose-50 border-rose-300 text-rose-900',
      badge: 'bg-rose-600 text-white',
      badgeText: 'POINTS EXPIRED',
      icon: AlertCircle,
    },
  };

  const cfg = config[status] || config.eligible;
  const IconComponent = cfg.icon;

  return (
    <div className={`p-4 border-2 rounded-lg ${cfg.bg} space-y-2`}>
      <div className="flex items-center justify-between">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wider uppercase ${cfg.badge}`}>
          {cfg.badgeText}
        </span>
        {points_balance !== undefined && (
          <span className="font-mono font-extrabold text-lg">
            {Number(points_balance).toLocaleString()} PTS AVAILABLE
          </span>
        )}
      </div>

      <div className="flex items-start gap-2 pt-1">
        <IconComponent className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p className="text-base font-semibold leading-snug">{message}</p>
      </div>
    </div>
  );
}

// ─── Main Redemption Modal Component ──────────────────────────────────────────

export const RedemptionModal = ({
  isOpen,
  customer,
  onClose,
  onSuccess,
}) => {
  const vehicles = customer?.vehicles || [];
  const hasSingleVehicle = vehicles.length === 1;

  const [step, setStep] = useState(hasSingleVehicle ? 1 : 0);
  const [selectedVehicle, setSelectedVehicle] = useState(hasSingleVehicle ? vehicles[0] : null);
  const [vehicleStatus, setVehicleStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState(
    customer?.phones?.[0]?.phone_number || customer?.phone_number || ''
  );

  // Step 2 Form State
  const [otp, setOtp] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [category, setCategory] = useState('service'); // service | accessories | bodyshop | referral
  const [receiptNo, setReceiptNo] = useState('');
  const [accountLedgerNo, setAccountLedgerNo] = useState('');

  // Referral Tab Specific State
  const [referralCode, setReferralCode] = useState('');
  const [referrerDetails, setReferrerDetails] = useState(null);
  const [referrerLoading, setReferrerLoading] = useState(false);
  const [referrerError, setReferrerError] = useState('');

  const [debugOtp, setDebugOtp] = useState('');
  const [whatsappWarning, setWhatsappWarning] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [redemptionResult, setRedemptionResult] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const selectedVid = selectedVehicle?.id || selectedVehicle?.vehicle_id;

  // Auto-fetch referring customer name on entering referral code
  useEffect(() => {
    if (category !== 'referral') return;
    const clean = referralCode.trim();
    if (!clean || clean.length < 3) {
      setReferrerDetails(null);
      setReferrerError('');
      return;
    }

    setReferrerLoading(true);
    setReferrerError('');
    const timer = setTimeout(() => {
      ApiService.getByReferralCode(clean)
        .then((res) => {
          setReferrerDetails(res.data);
          setReferrerError('');
        })
        .catch((err) => {
          setReferrerDetails(null);
          setReferrerError(err.message || `No customer found matching referral code '${clean}'.`);
        })
        .finally(() => setReferrerLoading(false));
    }, 400);

    return () => clearTimeout(timer);
  }, [referralCode, category]);

  // Fetch vehicle eligibility status whenever selected vehicle changes
  useEffect(() => {
    if (!selectedVid) return;
    setVehicleStatus(null);
    setStatusLoading(true);
    setError('');
    ApiService.getVehicleRedemptionStatus(selectedVid)
      .then((res) => setVehicleStatus(res.data))
      .catch((err) => setError(err.message || 'Failed to load vehicle redemption status.'))
      .finally(() => setStatusLoading(false));
  }, [selectedVid]);

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setError('');
      setOtp('');
      setBillAmount('');
      setCategory('service');
      setReceiptNo('');
      setAccountLedgerNo('');
      setReferralCode('');
      setReferrerDetails(null);
      setReferrerError('');
      setDebugOtp('');
      setWhatsappWarning('');
      setRedemptionResult(null);

      const vList = customer?.vehicles || [];
      if (vList.length === 1) {
        setSelectedVehicle(vList[0]);
        setStep(1);
      } else if (vList.length > 1) {
        setSelectedVehicle(null);
        setVehicleStatus(null);
        setStep(0);
      } else {
        setSelectedVehicle(null);
        setVehicleStatus(null);
        setStep(1);
      }
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const currentBalance = vehicleStatus?.points_balance ?? customer?.points_balance ?? customer?.current_balance ?? 0;
  const isPendingCorrection = vehicleStatus?.status === 'locked_pending_correction';
  const isLocked = vehicleStatus?.status === 'locked' || isPendingCorrection;
  const isExpired = vehicleStatus?.status === 'expired';
  const isEligible = vehicleStatus?.status === 'eligible';

  // Live Arithmetic Preview Calculations
  const numBillAmount = parseFloat(billAmount || '0');
  const redeemableRupees = currentBalance * POINTS_PER_RUPEE_REDEMPTION;
  const previewDiscountApplied = numBillAmount > 0 ? Math.min(redeemableRupees, numBillAmount) : 0;
  const previewPointsRedeemed = numBillAmount > 0 ? Math.round(previewDiscountApplied / POINTS_PER_RUPEE_REDEMPTION) : 0;
  const previewCashPaid = numBillAmount > 0 ? Math.max(0, numBillAmount - previewDiscountApplied) : 0;
  const previewNewPointsEarned = numBillAmount > 0 ? Math.floor((previewCashPaid / 100) * POINTS_PER_100_RUPEES_EARNED) : 0;
  const previewUpdatedBalance = (currentBalance - previewPointsRedeemed) + previewNewPointsEarned;

  // ── Step Handlers ──────────────────────────────────────────────────────────

  const handleVehicleSelect = (v) => {
    setSelectedVehicle(v);
    setVehicleStatus(null);
    setError('');
  };

  const handleProceedToOtp = () => {
    if (!selectedVehicle) return;
    setStep(1);
  };

  const handleRequestOtp = async () => {
    setError('');
    setWhatsappWarning('');
    setDebugOtp('');
    setIsLoading(true);
    try {
      const res = await ApiService.requestOtp(selectedPhone);
      const code = res.data?.debug_otp || res.data?.dummy_otp || res.debug_otp || res.dummy_otp || '123456';
      setDebugOtp(code);
      setOtp(code); // Pre-fill for instant test convenience
      if (res.data?.whatsapp_warning) setWhatsappWarning(res.data.whatsapp_warning);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to request OTP. Check phone number or rate limit.');
    } finally {
      setIsLoading(false);
    }
  };

  const isVehiclePurchaseContext = Boolean(
    selectedVid &&
    ((selectedVehicle?.ex_showroom_price && Number(selectedVehicle.ex_showroom_price) > 0) ||
      (selectedVehicle?.ex_showroom_price_paise && Number(selectedVehicle.ex_showroom_price_paise) > 0))
  );

  const handleRedeemSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code provided by the customer.');
      return;
    }

    if (category === 'referral') {
      if (!referralCode || !referralCode.trim()) {
        setError('Please enter a referral code.');
        return;
      }
      if (!isVehiclePurchaseContext) {
        setError('Referral bonus can only be applied to a vehicle purchase.');
        return;
      }
      if (referrerError) {
        setError(referrerError);
        return;
      }
    } else {
      if (!numBillAmount || numBillAmount <= 0) {
        setError('Please enter a valid Bill Amount (before tax).');
        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await ApiService.redeemPoints({
        phone: selectedPhone,
        customer_id: customer.customer_id,
        otp: otp.trim(),
        bill_amount: category === 'referral' ? undefined : numBillAmount,
        category,
        receipt_no: receiptNo.trim() || undefined,
        account_ledger_no: accountLedgerNo.trim() || undefined,
        vehicle_id: selectedVid,
        referral_code: category === 'referral' ? referralCode.trim() : undefined,
      });

      setRedemptionResult(res.data);
      setStep(3);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      setError(err.message || 'Redemption failed. Check OTP code or entry fields.');
    } finally {
      setIsLoading(false);
    }
  };

  const isManualCustomer =
    !selectedVehicle?.purchase_date &&
    !customer?.purchase_date &&
    !customer?.dms_invoice_date;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleClose = () => {
    setStep(hasSingleVehicle ? 1 : 0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white border-2 border-surface-border rounded-xl shadow-2xl max-h-[94vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <Gift className="w-6 h-6 text-emerald-600" />
            <h3 className="text-xl font-bold text-slate-900">
              {isManualCustomer ? 'Get Points / Service Discount Calculation' : 'Points Redemption & Real Rates Calculation'}
            </h3>
          </div>
          {step !== 3 && (
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="p-6">
          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-4 bg-rose-50 border-2 border-rose-300 rounded-lg flex items-start gap-2.5 text-rose-800 font-bold text-base">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* ── STEP 0: Select Vehicle (Multi-vehicle customers) ── */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500">Customer ID</span>
                  <span className="font-mono font-extrabold text-slate-900">{customer.customer_id}</span>
                </div>
                <div className="text-xl font-extrabold text-slate-900">{customer.name}</div>
              </div>

              <div>
                <label className="text-base font-bold text-slate-900 block mb-2.5">
                  Select Vehicle to Redeem Points For:
                </label>
                <div className="space-y-2">
                  {vehicles.map((v) => {
                    const vid = v.id || v.vehicle_id;
                    const isSelected = selectedVid === vid;
                    return (
                      <button
                        key={vid}
                        type="button"
                        onClick={() => handleVehicleSelect(v)}
                        className={`w-full flex items-center gap-4 p-4 border-2 rounded-lg text-left transition-all ${isSelected
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
                          }`}
                      >
                        <Car className={`w-6 h-6 flex-shrink-0 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-mono font-extrabold text-slate-900 text-base">
                            {v.registration_number || v.chassis_no || v.vin}
                          </div>
                          <div className="text-sm font-medium text-slate-600">
                            {v.brand_name || 'Vehicle'}{v.model ? ` · ${v.model}` : ''}
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedVehicle && (
                <EligibilityBanner
                  status={vehicleStatus?.status}
                  eligible_at={vehicleStatus?.eligible_at}
                  expires_at={vehicleStatus?.expires_at}
                  points_balance={vehicleStatus?.points_balance}
                  message={vehicleStatus?.message}
                  loading={statusLoading}
                  isManualCustomer={isManualCustomer}
                />
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="outline" size="lg" onClick={handleClose}>Cancel</Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleProceedToOtp}
                  disabled={!selectedVehicle || statusLoading || isExpired || isLocked || !vehicleStatus}
                >
                  {statusLoading ? 'Checking status…' : 'Proceed to OTP →'}
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 1: Request OTP ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500">Customer Profile</span>
                  <span className="font-mono font-extrabold text-slate-900 text-base">{customer.customer_id}</span>
                </div>
                <div className="text-xl font-extrabold text-slate-900">{customer.name}</div>
                {selectedVehicle && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                    <Car className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-slate-600">
                      Vehicle: <span className="font-mono font-bold text-slate-900">
                        {selectedVehicle.registration_number || selectedVehicle.chassis_no || selectedVehicle.vin}
                      </span>
                    </span>
                    {!hasSingleVehicle && (
                      <button
                        type="button"
                        onClick={() => { setStep(0); setError(''); }}
                        className="ml-auto text-xs font-bold text-emerald-600 underline"
                      >
                        Change
                      </button>
                    )}
                  </div>
                )}
              </div>

              <EligibilityBanner
                status={vehicleStatus?.status}
                eligible_at={vehicleStatus?.eligible_at}
                expires_at={vehicleStatus?.expires_at}
                points_balance={vehicleStatus?.points_balance}
                message={vehicleStatus?.message}
                loading={statusLoading}
                isManualCustomer={isManualCustomer}
              />

              {isEligible && (
                <div>
                  <label className="text-base font-bold text-slate-900 block mb-2">
                    Select Customer Registered Phone to Receive OTP:
                  </label>
                  <div className="space-y-2">
                    {(customer.phones || []).map((p, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center justify-between p-3.5 border-2 rounded-lg cursor-pointer transition-colors ${selectedPhone === (p.phone_number || p)
                          ? 'border-emerald-600 bg-emerald-50 font-bold'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="otp_phone"
                            value={p.phone_number || p}
                            checked={selectedPhone === (p.phone_number || p)}
                            onChange={() => setSelectedPhone(p.phone_number || p)}
                            className="w-5 h-5 text-emerald-600"
                          />
                          <span className="text-lg font-mono font-extrabold">{p.phone_number || p}</span>
                        </div>
                        {p.is_primary && <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">(Main Phone)</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                {!hasSingleVehicle && (
                  <Button variant="outline" size="lg" onClick={() => setStep(0)} disabled={isLoading}>
                    ← Back
                  </Button>
                )}
                {hasSingleVehicle && (
                  <Button variant="outline" size="lg" onClick={handleClose} disabled={isLoading}>Cancel</Button>
                )}
                <Button
                  variant="success"
                  size="lg"
                  onClick={handleRequestOtp}
                  disabled={isLoading || !selectedPhone || !isEligible}
                  className="font-bold"
                >
                  {isLoading ? 'Sending OTP…' : isExpired ? 'Points Expired' : isPendingCorrection ? 'Locked: Correction Pending Admin Approval' : isLocked ? 'Not Yet Eligible' : 'Send OTP to Customer Phone'}
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Enter OTP & Transaction Bill Details ── */}
          {step === 2 && (
            <form onSubmit={handleRedeemSubmit} className="space-y-5">

              {/* Category Tabs */}
              <div>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Transaction Category:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'service', label: 'Service' },
                    { id: 'accessories', label: 'Accessories' },
                    { id: 'bodyshop', label: 'BodyShop' },
                    { id: 'referral', label: 'Referral' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCategory(tab.id)}
                      className={`py-3 px-2 rounded-lg font-extrabold text-sm border-2 text-center transition-all ${category === tab.id
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-400'
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* OTP Input Banner */}
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-800 uppercase">OTP Sent To</div>
                  <div className="text-lg font-mono font-bold text-emerald-950">{selectedPhone}</div>
                </div>
                <button
                  type="button"
                  onClick={() => { setStep(1); setOtp(''); setDebugOtp(''); setError(''); }}
                  className="text-sm font-bold text-emerald-700 underline"
                >
                  Resend / Change Phone
                </button>
              </div>

              {whatsappWarning && (
                <div className="p-3 bg-amber-50 border border-amber-400 rounded-lg text-amber-900 text-sm font-semibold">
                  {whatsappWarning}
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-950 flex items-center justify-between font-mono">
                <span>💡 Test OTP Code: <strong>{debugOtp || '123456'}</strong></span>
                <button
                  type="button"
                  onClick={() => setOtp(debugOtp || '123456')}
                  className="px-3 py-1 bg-amber-200 hover:bg-amber-300 font-bold rounded text-amber-950 transition-colors"
                >
                  Use Code
                </button>
              </div>

              {/* Form Input Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Customer OTP (6-Digits)"
                  placeholder="e.g. 482910"
                  icon={KeyRound}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                />

                {category === 'referral' ? (
                  <Input
                    label="Referral Code"
                    placeholder="e.g. BAC-100001 or 9845012345"
                    icon={Sparkles}
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    required
                  />
                ) : (
                  <Input
                    label="Bill Amount (Before Tax, ₹)"
                    type="number"
                    placeholder="e.g. 1200"
                    icon={CreditCard}
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    required
                  />
                )}

                <Input
                  label="Receipt No"
                  placeholder="e.g. REC-2026-9901"
                  icon={Receipt}
                  value={receiptNo}
                  onChange={(e) => setReceiptNo(e.target.value)}
                />

                <Input
                  label="Account Ledger No"
                  placeholder="e.g. ACC-109283"
                  icon={FileText}
                  value={accountLedgerNo}
                  onChange={(e) => setAccountLedgerNo(e.target.value)}
                />
              </div>

              {/* Referral Tab Auto-Fetched Referrer Preview & Vehicle Purchase Guard */}
              {category === 'referral' && (
                <div className="space-y-3 pt-1">
                  {!isVehiclePurchaseContext && (
                    <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-lg flex items-start gap-2.5 text-rose-800 font-bold text-sm">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
                      <span>
                        Referral bonus can only be applied to a vehicle purchase. Current selected vehicle has no ex-showroom price context.
                      </span>
                    </div>
                  )}

                  {referrerLoading && (
                    <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 font-semibold text-sm animate-pulse">
                      Fetching referring customer profile for '{referralCode}'...
                    </div>
                  )}

                  {referrerError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-bold text-sm">
                      {referrerError}
                    </div>
                  )}

                  {referrerDetails && (
                    <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-emerald-800 tracking-wider">
                          Verified Referring Customer
                        </span>
                        <span className="font-mono font-extrabold text-emerald-950 text-sm">
                          {referrerDetails.customer_id}
                        </span>
                      </div>
                      <div className="text-lg font-extrabold text-emerald-950">
                        {referrerDetails.customer_name}
                      </div>
                      {referrerDetails.phone_number && (
                        <div className="text-xs font-semibold text-emerald-800 font-mono">
                          Phone: {referrerDetails.phone_number}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Live Arithmetic Computation Card (Service / Accessories / BodyShop) */}
              {category !== 'referral' && numBillAmount > 0 && (
                <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl border-2 border-slate-700 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                      <Calculator className="w-4 h-4" /> Calculated Rate Breakup
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      Balance: {currentBalance.toLocaleString()} PTS
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700">
                      <div className="text-xs font-bold text-slate-400 uppercase">Discount Applied</div>
                      <div className="text-xl font-extrabold text-emerald-400 tabular-nums">
                        ₹{previewDiscountApplied.toLocaleString()}
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700">
                      <div className="text-xs font-bold text-slate-400 uppercase">{isManualCustomer ? 'Points Used' : 'Points Redeemed'}</div>
                      <div className="text-xl font-extrabold text-rose-400 font-mono tabular-nums">
                        -{previewPointsRedeemed.toLocaleString()}
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700">
                      <div className="text-xs font-bold text-slate-400 uppercase">Cash Paid</div>
                      <div className="text-xl font-extrabold text-sky-400 tabular-nums">
                        ₹{previewCashPaid.toLocaleString()}
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700">
                      <div className="text-xs font-bold text-slate-400 uppercase">New Points Earned</div>
                      <div className="text-xl font-extrabold text-amber-400 font-mono tabular-nums">
                        +{previewNewPointsEarned.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-700 text-sm font-semibold">
                    <span className="text-slate-300">New Final Balance After Transaction:</span>
                    <span className="font-mono font-extrabold text-white text-base">
                      {previewUpdatedBalance.toLocaleString()} PTS
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="outline" size="lg" onClick={() => setStep(1)} disabled={isLoading}>Back</Button>
                <Button
                  type="submit"
                  variant="success"
                  size="lg"
                  disabled={
                    isLoading ||
                    !otp ||
                    (category === 'referral'
                      ? !referralCode || !isVehiclePurchaseContext || !referrerDetails
                      : numBillAmount <= 0)
                  }
                  className="font-bold flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing Transaction…</span>
                    </>
                  ) : isManualCustomer ? (
                    'Submit Service Bill & Apply Points'
                  ) : (
                    `Submit ${category === 'referral' ? 'Referral Bonus' : 'Redemption'} & Process`
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* ── STEP 3: Success View ── */}
          {step === 3 && redemptionResult && (
            <div className="space-y-6 animate-fadeIn">

              <div className="text-center space-y-3">
                <div className="mx-auto inline-flex items-center justify-center p-4 bg-emerald-100 border-2 border-emerald-500 rounded-full shadow-md">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900">
                  {redemptionResult.category === 'referral'
                    ? 'Referral Bonus Credited!'
                    : isManualCustomer
                      ? 'Service Transaction & Points Applied!'
                      : 'Redemption & Transaction Completed!'}
                </h3>
                <p className="text-sm font-semibold text-slate-600 max-w-md mx-auto">
                  {redemptionResult.category === 'referral'
                    ? `Awarded +${redemptionResult.points_awarded || 2500} points to both Referrer and Buyer!`
                    : 'Discount applied and new points earned on cash paid.'}
                </p>
              </div>

              {redemptionResult.category === 'referral' ? (
                <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl shadow-xl border-2 border-slate-700 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-800/90 rounded-lg border border-slate-700 space-y-1">
                      <div className="text-xs font-bold text-emerald-400 uppercase">Referrer Credited</div>
                      <div className="text-lg font-extrabold text-white">{redemptionResult.referrer?.name}</div>
                      <div className="text-xs font-mono text-slate-400">{redemptionResult.referrer?.customer_id}</div>
                      <div className="text-xl font-extrabold text-emerald-400 pt-1 font-mono">
                        +{redemptionResult.points_awarded || 2500} PTS
                      </div>
                    </div>

                    <div className="p-4 bg-slate-800/90 rounded-lg border border-slate-700 space-y-1">
                      <div className="text-xs font-bold text-sky-400 uppercase">Buyer Credited</div>
                      <div className="text-lg font-extrabold text-white">{customer.name}</div>
                      <div className="text-xs font-mono text-slate-400">{redemptionResult.buyer?.customer_id || customer.customer_id}</div>
                      <div className="text-xl font-extrabold text-emerald-400 pt-1 font-mono">
                        +{redemptionResult.points_awarded || 2500} PTS
                      </div>
                    </div>
                  </div>

                  {redemptionResult.slab_label && (
                    <div className="p-3 bg-slate-800/60 rounded-lg text-center text-xs font-bold text-slate-300 border border-slate-700">
                      Slab: {redemptionResult.slab_label}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl shadow-xl border-2 border-slate-700 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="p-3 bg-slate-800/90 rounded-lg border border-slate-700">
                      <div className="text-xs font-bold text-slate-400 uppercase">Discount Applied</div>
                      <div className="text-2xl font-extrabold text-emerald-400 tabular-nums">
                        ₹{(redemptionResult.discount_applied ?? 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-800/90 rounded-lg border border-slate-700">
                      <div className="text-xs font-bold text-slate-400 uppercase">{isManualCustomer ? 'Points Used' : 'Points Redeemed'}</div>
                      <div className="text-2xl font-extrabold text-rose-400 font-mono tabular-nums">
                        -{Number(redemptionResult.points_redeemed ?? 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-800/90 rounded-lg border border-slate-700">
                      <div className="text-xs font-bold text-slate-400 uppercase">Cash Paid</div>
                      <div className="text-2xl font-extrabold text-sky-400 tabular-nums">
                        ₹{(redemptionResult.cash_paid ?? 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-800/90 rounded-lg border border-slate-700">
                      <div className="text-xs font-bold text-slate-400 uppercase">New Points Earned</div>
                      <div className="text-2xl font-extrabold text-amber-400 font-mono tabular-nums">
                        +{(redemptionResult.new_points_earned ?? 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-800/60 rounded-lg flex items-center justify-between border border-slate-700">
                    <span className="text-slate-300 font-semibold text-sm">Updated Total Point Balance:</span>
                    <span className="font-mono font-extrabold text-white text-xl">
                      {Number(redemptionResult.updated_total_balance ?? 0).toLocaleString()} PTS
                    </span>
                  </div>
                </div>
              )}

              {/* Voucher Code & Tags */}
              <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-800">
                <div>
                  Voucher Code: <span className="font-mono font-bold text-emerald-700">{redemptionResult.redemption_code}</span>
                </div>
                {redemptionResult.receipt_no && (
                  <div>Receipt No: <span className="font-mono font-bold text-slate-900">{redemptionResult.receipt_no}</span></div>
                )}
                {redemptionResult.account_ledger_no && (
                  <div>Ledger No: <span className="font-mono font-bold text-slate-900">{redemptionResult.account_ledger_no}</span></div>
                )}
              </div>

              <div className="flex justify-center pt-3 border-t border-slate-200">
                <Button variant="primary" size="lg" onClick={handleClose} className="font-bold px-8">
                  Done & Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RedemptionModal;
