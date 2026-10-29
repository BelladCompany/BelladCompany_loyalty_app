import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Car,
  Coins,
  Gift,
  Lock,
  Sparkles,
  Building,
  BadgeCheck,
  PlusCircle,
} from 'lucide-react';
import ApiService from '../../services/api';

/**
 * AddReceiptModal
 *
 * Combined Receipt Entry Modal (Auto Loyalty Points Calculation & Redemption).
 * Cashier enters Bill Amount, Receipt No, Account Ledger No, Category, and Branch.
 * Everything is automatically calculated:
 * - If customer is eligible (Accessories anytime; Service/Sale/Bodyshop after 12 months lock),
 *   eligible loyalty points are automatically redeemed for an instant bill discount.
 * - Remaining cash balance automatically earns new loyalty points.
 * - No manual points edit or checkbox toggle required.
 * - NO OTP VERIFICATION REQUIRED.
 */
export const AddReceiptModal = ({
  isOpen,
  customer,
  onClose,
  onSuccess,
  branches = [{ id: 1, name: 'Central Showroom - Bangalore' }],
  user,
}) => {
  const [category, setCategory] = useState('service');
  const [billAmount, setBillAmount] = useState('');
  const [receiptNo, setReceiptNo] = useState('');
  const [ledgerNo, setLedgerNo] = useState('');
  const [branchId, setBranchId] = useState(user?.branch_id || branches[0]?.id || 1);
  const [notes, setNotes] = useState('');

  const vehicles = customer?.vehicles || [];
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  // Live vehicle eligibility
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityData, setEligibilityData] = useState(null);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState(null);

  const currentPoints = Math.max(0, customer?.points_balance ?? customer?.total_points ?? customer?.current_balance ?? 0);
  const rupeeValue = Math.max(0, Math.floor(currentPoints / 4));

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setCategory('service');
      setBillAmount('');
      setReceiptNo('');
      setLedgerNo('');
      setBranchId(user?.branch_id || branches[0]?.id || 1);
      setNotes('');
      setErrorMessage('');
      setSuccessData(null);
      setIsSubmitting(false);

      const vList = customer?.vehicles || [];
      if (vList.length > 0) {
        setSelectedVehicleId(vList[0]?.id || vList[0]?.vehicle_id || '');
      } else {
        setSelectedVehicleId('');
      }
    }
  }, [isOpen, customer, user, branches]);

  // Check live vehicle eligibility when vehicle or category changes
  useEffect(() => {
    if (!isOpen) return;

    if (selectedVehicleId) {
      setEligibilityLoading(true);
      ApiService.getVehicleRedemptionStatus(selectedVehicleId, category)
        .then((res) => {
          setEligibilityData(res.data || null);
        })
        .catch(() => {
          setEligibilityData(null);
        })
        .finally(() => {
          setEligibilityLoading(false);
        });
    } else {
      setEligibilityData(null);
      setEligibilityLoading(false);
    }
  }, [isOpen, selectedVehicleId, category]);

  if (!isOpen || !customer) return null;

  // Determine eligibility status
  const isAccessories = category === 'accessories';
  let isEligible = false;
  let lockReason = '';

  if (currentPoints <= 0) {
    isEligible = false;
    lockReason = 'Customer has 0 points available to redeem. Points will be earned on this receipt.';
  } else if (isAccessories) {
    // Accessories are unlocked ANYTIME
    isEligible = true;
    lockReason = '';
  } else if (eligibilityData) {
    if (eligibilityData.status === 'eligible') {
      isEligible = true;
      lockReason = '';
    } else {
      isEligible = false;
      lockReason = eligibilityData.message || 'Points redemption is locked until 12 months after purchase date. (Accessories redemption is unlocked anytime).';
    }
  } else {
    // Client-side fallback check on purchase date
    const selectedVeh = vehicles.find((v) => String(v.id || v.vehicle_id) === String(selectedVehicleId)) || vehicles[0];
    const rawDate = selectedVeh?.purchase_date || selectedVeh?.dms_invoice_date || customer?.purchase_date || customer?.dms_invoice_date;

    if (rawDate) {
      const pDate = new Date(rawDate);
      if (!isNaN(pDate.getTime())) {
        const eligibleAt = new Date(pDate);
        eligibleAt.setMonth(eligibleAt.getMonth() + 12);
        if (new Date() < eligibleAt) {
          isEligible = false;
          const eligibleDateStr = eligibleAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          lockReason = `Redemption locked until 12 months from purchase date (${eligibleDateStr}). Accessories can be redeemed anytime!`;
        } else {
          isEligible = true;
        }
      } else {
        isEligible = true;
      }
    } else {
      isEligible = true;
    }
  }

  // Categories configuration (Clean categories without rate percentages)
  const CATEGORIES = [
    { id: 'service', label: 'Service' },
    { id: 'sale', label: 'Sale' },
    { id: 'bodyshop', label: 'Bodyshop' },
    { id: 'accessories', label: 'Accessories' },
    { id: 'gift_cards', label: 'Gift Cards' },
  ];

  // Calculations: Auto-calculate everything
  const numAmount = parseFloat(billAmount || '0') || 0;
  const rateMultiplier = category === 'service' ? 4 : category === 'accessories' ? 2 : category === 'bodyshop' ? 3 : 1;

  // Auto-calculated Points to Redeem (4 PTS = ₹1):
  // Cannot exceed available points, and cannot exceed bill amount * 4
  const activeRedeemPoints = isEligible && numAmount > 0 ? Math.min(currentPoints, Math.floor(numAmount * 4)) : 0;
  const discountAmount = Math.floor(activeRedeemPoints / 4);
  const netCashPaid = Math.max(0, numAmount - discountAmount);
  const earnedPoints = netCashPaid > 0 ? Math.floor((netCashPaid / 100) * rateMultiplier) : 0;
  const projectedBalance = currentPoints - activeRedeemPoints + earnedPoints;

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (numAmount <= 0) {
      setErrorMessage('Please enter a valid bill amount greater than ₹0.');
      return;
    }

    if (!receiptNo.trim()) {
      setErrorMessage('Receipt / Bill number is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEligible && activeRedeemPoints > 0) {
        // Auto-Redemption Flow (Instant discount + new points on cash paid, NO OTP)
        const primaryPhone =
          (typeof customer?.phones?.[0] === 'string' ? customer.phones[0] : customer?.phones?.[0]?.phone_number) ||
          customer?.phone ||
          '';

        const payload = {
          customer_id: customer.customer_id,
          phone: primaryPhone ? String(primaryPhone).replace(/[^\d+]/g, '') : undefined,
          bill_amount: numAmount,
          points: activeRedeemPoints,
          category: category,
          receipt_no: receiptNo.trim(),
          account_ledger_no: ledgerNo.trim() || undefined,
          vehicle_id: selectedVehicleId ? parseInt(selectedVehicleId, 10) : undefined,
          branch_id: branchId ? parseInt(branchId, 10) : 1,
        };

        const res = await ApiService.redeemPoints(payload);
        const resData = res.data || res;

        setSuccessData({
          type: 'redemption',
          billAmount: numAmount,
          discountAmount: resData.discount_applied ?? discountAmount,
          cashPaid: resData.cash_paid ?? netCashPaid,
          pointsRedeemed: resData.points_redeemed ?? activeRedeemPoints,
          pointsEarned: resData.new_points_earned ?? earnedPoints,
          newBalance: resData.remaining_balance ?? projectedBalance,
          receiptNo: receiptNo.trim(),
          ledgerNo: ledgerNo.trim(),
          category,
        });
      } else {
        // Standard Points Earning Flow (NO OTP)
        const payload = {
          customer_id: customer.customer_id,
          vehicle_id: selectedVehicleId ? parseInt(selectedVehicleId, 10) : null,
          branch_id: branchId ? parseInt(branchId, 10) : 1,
          amount: Math.round(numAmount),
          type: category === 'sale' ? 'sale' : 'service',
          category: category,
          reference_id: receiptNo.trim(),
          receipt_no: receiptNo.trim(),
          account_ledger_no: ledgerNo.trim() || null,
          description: `Receipt: ${receiptNo.trim()}${ledgerNo.trim() ? ` | Ledger: ${ledgerNo.trim()}` : ''}${notes.trim() ? ` | ${notes.trim()}` : ''}`,
        };

        const res = await ApiService.earnPoints(payload);
        const resData = res.data || res;
        const pts = resData?.ledger_entry?.points ?? earnedPoints;

        setSuccessData({
          type: 'earning',
          billAmount: numAmount,
          discountAmount: 0,
          cashPaid: numAmount,
          pointsRedeemed: 0,
          pointsEarned: pts,
          newBalance: currentPoints + pts,
          receiptNo: receiptNo.trim(),
          ledgerNo: ledgerNo.trim(),
          category,
        });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to process receipt transaction. Please check details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2.5 sm:p-4 overflow-hidden animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[94vh] flex flex-col">

        {/* ── Modal Header ── */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                Add Receipt &amp; Loyalty Points
              </h3>
              <p className="text-[11px] sm:text-xs text-indigo-200 font-medium">
                Record invoice, auto-calculate loyalty discount &amp; award points
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Customer Info Strip ── */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3.5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5 text-xs flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold bg-slate-200 px-2.5 py-0.5 rounded-lg text-slate-800">
              {customer.customer_id}
            </span>
            <span className="font-black text-slate-900 text-xs sm:text-sm">{customer.name || customer.customer_name}</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold uppercase text-[10px]">
              {customer.tier_name || customer.tier || 'Silver'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-right">
            <span className="text-slate-500 font-semibold text-[11px] sm:text-xs">Available:</span>
            <span className="font-black font-mono text-indigo-700 text-xs sm:text-sm">
              {currentPoints.toLocaleString()} PTS
            </span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 text-[11px] sm:text-xs">
              ≈ ₹{rupeeValue}
            </span>
          </div>
        </div>

        {/* ── Success Screen ── */}
        {successData ? (
          <div className="p-5 sm:p-7 space-y-5 sm:space-y-6 text-center animate-fadeIn flex-1 overflow-y-auto">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h4 className="text-2xl font-black text-slate-900 tracking-tight">Receipt Processed Successfully!</h4>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Receipt #{successData.receiptNo} has been securely saved in the loyalty ledger.
              </p>
            </div>

            {/* Receipt Summary Grid */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 text-left space-y-3">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 text-slate-600">
                <span>Operation Category</span>
                <span className="font-bold text-slate-900 uppercase">{successData.category}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 text-slate-600">
                <span>Total Bill Amount</span>
                <span className="font-bold text-slate-900">₹{Number(successData.billAmount).toLocaleString('en-IN')}</span>
              </div>
              {successData.discountAmount > 0 && (
                <>
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 text-emerald-700 font-semibold">
                    <span>Loyalty Points Redeemed ({successData.pointsRedeemed} PTS)</span>
                    <span className="font-black">- ₹{Number(successData.discountAmount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 text-slate-900 font-bold">
                    <span>Net Cash Collected</span>
                    <span className="text-base font-black text-indigo-700 font-mono">
                      ₹{Number(successData.cashPaid).toLocaleString('en-IN')}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center text-xs pt-1 text-slate-700">
                <span className="font-bold flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-500" /> New Points Earned:
                </span>
                <span className="font-black text-amber-600 text-sm">+{successData.pointsEarned} PTS</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200 text-slate-900 font-black">
                <span>Updated Customer Balance</span>
                <span className="text-base text-slate-900 font-mono">
                  {Number(successData.newBalance).toLocaleString('en-IN')} PTS (≈ ₹{Math.floor(successData.newBalance / 4)})
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleFinish}
                className="w-full sm:w-auto px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-xl transition shadow-md cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ── Main Receipt Form ── */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-4 sm:space-y-5">
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 1. Category Selector Buttons (Clean: Service, Sale, Bodyshop, Accessories, Gift Cards) */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Operation / Department Category *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {CATEGORIES.map((cat, idx) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`py-2.5 sm:py-3 px-2 rounded-xl sm:rounded-2xl text-center border font-extrabold text-xs transition-all cursor-pointer ${
                      idx === 4 ? 'col-span-2 sm:col-span-1' : ''
                    } ${
                      category === cat.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Vehicle Selector (if customer has vehicles) */}
            {vehicles.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Select Customer Vehicle
                </label>
                <div className="relative">
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id || v.vehicle_id} value={v.id || v.vehicle_id}>
                        {v.registration_number || v.reg_no || v.chassis_no || v.vin} {v.model ? `(${v.model})` : ''}
                      </option>
                    ))}
                    <option value="">No Vehicle / General Over-the-counter</option>
                  </select>
                </div>
              </div>
            )}

            {/* 3. Live Eligibility Notice Banner */}
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 transition-all ${
                isAccessories
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : isEligible
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-950'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              {isAccessories ? (
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : isEligible ? (
                <BadgeCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              ) : (
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <span className="font-black uppercase tracking-wider text-[11px] block">
                  {isAccessories
                    ? 'Accessories Unlocked (Anytime Redemption)'
                    : isEligible
                    ? 'Redemption Eligible for this visit'
                    : 'Redemption Locked (<12 Months)'}
                </span>
                <p className="font-medium leading-relaxed">
                  {isAccessories
                    ? 'Customer is eligible to redeem points for accessories with NO 12-month lock! Points discount will be auto-calculated.'
                    : isEligible
                    ? `Customer can redeem points toward bill discount (${currentPoints.toLocaleString()} PTS available = ₹${rupeeValue}). Everything will auto-calculate.`
                    : lockReason || 'Points are locked for service until 12 months after purchase date. Full points will be earned for this visit!'}
                </p>
              </div>
            </div>

            {/* 4. Receipt Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Bill Amount */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Bill Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-black text-slate-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    placeholder="e.g. 6000"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    className="w-full h-12 pl-9 pr-4 text-lg font-black font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                  />
                </div>
              </div>

              {/* Receipt / Invoice No */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Receipt / Invoice No *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. REC-2026-081"
                  value={receiptNo}
                  onChange={(e) => setReceiptNo(e.target.value)}
                  className="w-full h-11 px-3.5 text-xs font-bold font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                />
              </div>

              {/* Ledger / Account No */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ledger / Account No <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. LDG-8891"
                  value={ledgerNo}
                  onChange={(e) => setLedgerNo(e.target.value)}
                  className="w-full h-11 px-3.5 text-xs font-bold font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                />
              </div>

              {/* Branch */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Dealership Branch
                </label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full h-11 px-3.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                >
                  {branches.map((b) => (
                    <option key={b.id || b.branch_id} value={b.id || b.branch_id}>
                      {b.name || b.branch_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes / Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Job Card / Remarks <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Regular 2nd Periodic Service"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-11 px-3.5 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                />
              </div>
            </div>

            {/* 5. Live Auto-Calculation Breakdown Strip */}
            {numAmount > 0 && (
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {/* Auto-deducted loyalty points notification if eligible */}
                {isEligible && activeRedeemPoints > 0 ? (
                  <div className="bg-emerald-50/80 border-b border-emerald-200 p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-emerald-950 font-bold">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Loyalty Discount Auto-Applied:</span>
                      <span className="font-mono font-black text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-300">
                        {activeRedeemPoints.toLocaleString()} PTS (−₹{discountAmount.toLocaleString('en-IN')})
                      </span>
                    </div>
                    <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      Auto Deducted
                    </span>
                  </div>
                ) : !isEligible && currentPoints > 0 ? (
                  <div className="bg-amber-50 border-b border-amber-200 p-3 flex items-center gap-2 text-xs text-amber-900 font-semibold">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Redemption locked for this visit. Full points will be earned on this bill amount.</span>
                  </div>
                ) : null}

                {/* Dark Financial Summary Card */}
                <div className="p-4 bg-slate-900 text-white space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Gross Invoice Amount:</span>
                    <span className="font-mono font-bold text-white text-sm">₹{numAmount.toLocaleString('en-IN')}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-emerald-400 font-semibold">
                      <span>Loyalty Discount Applied ({activeRedeemPoints.toLocaleString()} PTS):</span>
                      <span className="font-mono font-black text-sm">−₹{discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm font-black pt-2 border-t border-white/10">
                    <span>Net Cash to Collect:</span>
                    <span className="font-mono text-amber-400 text-lg">₹{netCashPaid.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-300 pt-1 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-emerald-400" />
                      Points Earned on this receipt:
                    </span>
                    <span className="font-mono font-black text-emerald-400 text-xs">+{earnedPoints} PTS</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Action Buttons ── */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <FileText className="w-4 h-4 text-white" />
                    <span>Process &amp; Save Receipt</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default AddReceiptModal;
