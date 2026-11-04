import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Coins,
  Sparkles,
  RefreshCw,
  UploadCloud,
  MessageSquare,
  Lock,
} from 'lucide-react';
import ApiService from '../../services/api';

// Categories configuration (Service, Bodyshop, Accessories)
const CATEGORIES = [
  { id: 'service', label: 'Service' },
  { id: 'bodyshop', label: 'Bodyshop' },
  { id: 'accessories', label: 'Accessories' },
];

/**
 * AddReceiptModal
 *
 * Combined Receipt Entry Modal (Auto Loyalty Points Calculation & Redemption).
 * Everything is automatically calculated:
 * - If customer is eligible (Accessories anytime; Service/Bodyshop after 12 months lock),
 *   eligible loyalty points are automatically redeemed for an instant bill discount.
 * - Remaining cash balance automatically earns new loyalty points.
 * - Single-click "Push to RealBooks" integration sync.
 * - Automated WhatsApp notification dispatch.
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
  const [branchId, setBranchId] = useState(user?.branch_id || branches[0]?.id || 1);
  const [notes, setNotes] = useState('');

  const vehicles = customer?.vehicles || [];
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  // Live vehicle eligibility
  const [eligibilityData, setEligibilityData] = useState(null);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState(null);

  // RealBooks sync status
  const [pushingToRealbooks, setPushingToRealbooks] = useState(false);
  const [realbooksSynced, setRealbooksSynced] = useState(null);

  const currentPoints = Math.max(0, customer?.points_balance ?? customer?.total_points ?? customer?.current_balance ?? 0);
  const rupeeValue = Math.max(0, Math.floor(currentPoints / 4));

  const primaryPhone =
    (typeof customer?.phones?.[0] === 'string' ? customer.phones[0] : customer?.phones?.[0]?.phone_number) ||
    customer?.phone ||
    '';

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setCategory('service');
      setBillAmount('');
      setReceiptNo('');
      setBranchId(user?.branch_id || branches[0]?.id || 1);
      setNotes('');
      setErrorMessage('');
      setSuccessData(null);
      setPushingToRealbooks(false);
      setRealbooksSynced(null);

      if (vehicles.length > 0) {
        setSelectedVehicleId(String(vehicles[0].id || vehicles[0].vehicle_id || ''));
      }
    }
  }, [isOpen, customer]);

  // Fetch redemption eligibility when vehicle or category changes
  useEffect(() => {
    if (!isOpen || !selectedVehicleId) return;

    ApiService.getVehicleRedemptionStatus(selectedVehicleId, category)
      .then((res) => {
        setEligibilityData(res.data || null);
      })
      .catch(() => {
        setEligibilityData(null);
      });
  }, [isOpen, selectedVehicleId, category]);

  if (!isOpen || !customer) return null;

  // Selected vehicle context
  const selectedVeh = vehicles.find((v) => String(v.id || v.vehicle_id) === String(selectedVehicleId)) || vehicles[0];

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

  // Calculations: Auto-calculate everything
  const numAmount = parseFloat(billAmount || '0') || 0;
  const rateMultiplier = category === 'service' ? 4 : category === 'accessories' ? 2 : category === 'bodyshop' ? 3 : 1;

  // Auto-calculated Points to Redeem (4 PTS = ₹1):
  // Cannot exceed available points, and cannot exceed bill amount * 4
  const activeRedeemPoints = isEligible && numAmount > 0 ? Math.min(currentPoints, Math.floor(numAmount * 4)) : 0;
  const discountAmount = Math.floor(activeRedeemPoints / 4);
  const netCashPaid = Math.max(0, numAmount - discountAmount);
  const earnedPoints = netCashPaid > 0 ? Math.floor((netCashPaid / 100) * rateMultiplier) : 0;
  const projectedBalance = Math.max(0, currentPoints - activeRedeemPoints) + earnedPoints;

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (numAmount <= 0) {
      setErrorMessage('Please enter a valid bill amount greater than ₹0.');
      return;
    }
    if (!receiptNo.trim()) {
      setErrorMessage('Receipt / Invoice Number is strictly required.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEligible && activeRedeemPoints > 0) {
        // Auto-Redemption Flow (Instant discount + new points on cash paid, NO OTP)
        const payload = {
          customer_id: customer.customer_id,
          phone: primaryPhone ? String(primaryPhone).replace(/[^\d+]/g, '') : undefined,
          bill_amount: numAmount,
          points: activeRedeemPoints,
          category: category,
          receipt_no: receiptNo.trim(),
          vehicle_id: selectedVehicleId ? parseInt(selectedVehicleId, 10) : undefined,
          branch_id: branchId ? parseInt(branchId, 10) : 1,
        };

        const res = await ApiService.redeemPoints(payload);
        const resData = res.data || res;
        const ptsEarned = resData.new_points_earned ?? earnedPoints;
        const updatedBalance = resData.updated_total_balance ?? resData.remaining_balance ?? resData.balance?.remaining_balance ?? (Math.max(0, currentPoints - activeRedeemPoints) + ptsEarned);

        setSuccessData({
          type: 'redemption',
          billAmount: numAmount,
          discountAmount: resData.discount_applied ?? discountAmount,
          cashPaid: resData.cash_paid ?? netCashPaid,
          pointsRedeemed: resData.points_redeemed ?? activeRedeemPoints,
          pointsEarned: ptsEarned,
          newBalance: updatedBalance,
          receiptNo: receiptNo.trim(),
          category,
          branchId: branchId ? parseInt(branchId, 10) : 1,
          jobCard: notes.trim(),
          vehicleId: selectedVehicleId ? parseInt(selectedVehicleId, 10) : null,
          model: selectedVeh?.model || null,
          brandName: selectedVeh?.brand_name || null,
          firmName: selectedVeh?.firm_name || null,
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
          description: `Receipt: ${receiptNo.trim()}${notes.trim() ? ` | Job Card: ${notes.trim()}` : ''}`,
        };

        const res = await ApiService.earnPoints(payload);
        const resData = res.data || res;
        const pts = resData?.ledger_entry?.points ?? earnedPoints;
        const updatedBalance = currentPoints + pts;

        setSuccessData({
          type: 'earning',
          billAmount: numAmount,
          discountAmount: 0,
          cashPaid: numAmount,
          pointsRedeemed: 0,
          pointsEarned: pts,
          newBalance: updatedBalance,
          receiptNo: receiptNo.trim(),
          category,
          branchId: branchId ? parseInt(branchId, 10) : 1,
          jobCard: notes.trim(),
          vehicleId: selectedVehicleId ? parseInt(selectedVehicleId, 10) : null,
          model: selectedVeh?.model || null,
          brandName: selectedVeh?.brand_name || null,
          firmName: selectedVeh?.firm_name || null,
        });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to process receipt transaction. Please check details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePushToRealbooks = async () => {
    if (!successData || pushingToRealbooks || realbooksSynced) return;
    setPushingToRealbooks(true);

    try {
      const res = await ApiService.pushRealbooksSync({
        receipt_no: successData.receiptNo,
        customer_id: customer.customer_id,
        vehicle_id: successData.vehicleId || (selectedVehicleId ? parseInt(selectedVehicleId, 10) : null),
        model: successData.model || selectedVeh?.model || null,
        brand_name: successData.brandName || selectedVeh?.brand_name || null,
        firm_name: successData.firmName || selectedVeh?.firm_name || null,
        bill_amount: successData.billAmount,
        discount_amount: successData.discountAmount,
        points_redeemed: successData.pointsRedeemed,
        category: successData.category,
        branch_id: successData.branchId || branchId || 1,
        job_card: successData.jobCard || notes.trim() || '',
      });
      setRealbooksSynced(res.data || { voucher_id: 'RB-' + Date.now() });
    } catch (err) {
      alert('Failed to push to RealBooks: ' + (err.message || 'Network error'));
    } finally {
      setPushingToRealbooks(false);
    }
  };

  const handleFinish = () => {
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col">

        {/* ── Modal Header ── */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-lg font-black tracking-tight truncate">Add Receipt &amp; Loyalty Points</h3>
              <p className="text-[10px] sm:text-xs text-slate-300 font-medium truncate">Record invoice, auto-calculate loyalty discount &amp; award points</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Customer Context Strip ── */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between text-xs gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px] sm:text-[11px]">
              {customer.customer_id}
            </span>
            <span className="font-black text-slate-900 text-xs sm:text-sm">{customer.name || customer.customer_name}</span>
            <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              {customer.tier_name || 'Silver'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-slate-500 font-medium text-[11px] sm:text-xs">Available:</span>
            <span className="font-mono font-black text-indigo-700 text-xs sm:text-sm">{Number(currentPoints).toLocaleString('en-IN')} PTS</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 text-[10px] sm:text-xs">
              ≈ ₹{rupeeValue.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* ── Success Screen ── */}
        {successData ? (
          <div className="p-4 sm:p-7 space-y-4 sm:space-y-6 text-center animate-fadeIn flex-1 overflow-y-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8 sm:w-9 sm:h-9" />
            </div>

            <div>
              <h4 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Receipt Processed Successfully!</h4>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Receipt #{successData.receiptNo} has been securely saved in the loyalty ledger.
              </p>
            </div>

            {/* Receipt Summary Grid */}
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 text-left space-y-2.5 sm:space-y-3">
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
                <span className="text-sm sm:text-base text-slate-900 font-mono">
                  {Number(successData.newBalance).toLocaleString('en-IN')} PTS (≈ ₹{(successData.newBalance * 0.25).toFixed(2)})
                </span>
              </div>
            </div>

            {/* Auto WhatsApp Notification Banner */}
            <div className="p-3 sm:p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-left gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-emerald-950 block truncate">
                    Automated WhatsApp Alert Dispatched
                  </span>
                  <span className="text-[11px] text-emerald-800 font-medium block truncate">
                    Receipt details &amp; updated balance sent to customer ({primaryPhone || 'registered phone'})
                  </span>
                </div>
              </div>
              {primaryPhone && (
                <a
                  href={`https://api.whatsapp.com/send?phone=${encodeURIComponent(
                    primaryPhone.replace(/[^\d]/g, '')
                  )}&text=${encodeURIComponent(
                    `Dear ${customer.name || 'Valued Customer'},\nThank you for visiting Bellad & Company!\nReceipt: #${successData.receiptNo}\nBill Amount: ₹${Number(
                      successData.billAmount
                    ).toLocaleString('en-IN')}\nDiscount Applied: ₹${Number(successData.discountAmount).toLocaleString(
                      'en-IN'
                    )}\nPoints Earned: +${successData.pointsEarned} PTS\nNew Balance: ${successData.newBalance
                    } PTS (≈ ₹${(successData.newBalance * 0.25).toFixed(2)})`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shrink-0 shadow-xs cursor-pointer"
                >
                  Share WhatsApp
                </a>
              )}
            </div>

            {/* Actions: Push to RealBooks + Done */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 pb-4">
              <button
                type="button"
                disabled={pushingToRealbooks || realbooksSynced}
                onClick={handlePushToRealbooks}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md disabled:opacity-60 cursor-pointer"
              >
                {pushingToRealbooks ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Pushing to RealBooks...
                  </>
                ) : realbooksSynced ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>
                      Pushed to RealBooks {realbooksSynced.mode === 'test' ? '[Test Sandbox]' : ''} ({realbooksSynced.voucher_id || 'Synced'})
                    </span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 text-indigo-200" /> Push to RealBooks
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="w-full sm:w-auto px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm rounded-xl transition shadow-md cursor-pointer"
              >
                Done
              </button>
            </div>

            {/* RealBooks Dynamic Model & Segment Routing Info */}
            {realbooksSynced && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-left flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-indigo-950 font-bold">RealBooks Accounting Segment:</span>
                  <span className="font-mono text-indigo-800 bg-white px-2 py-0.5 rounded border border-indigo-200 font-bold">
                    {realbooksSynced.segment_name || `Segment #${realbooksSynced.segid}`}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-indigo-700 font-semibold flex items-center gap-2">
                  <span>CID: <strong>{realbooksSynced.cid || '6460'}</strong></span>
                  <span>•</span>
                  <span>SEGID: <strong>{realbooksSynced.segid || '6476'}</strong></span>
                  {realbooksSynced.brand && (
                    <>
                      <span>•</span>
                      <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-bold">{realbooksSynced.brand}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Main Receipt Form ── */
          <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-4">
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 1. Category Selector Buttons (Service, Bodyshop, Accessories) */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Transaction Category *
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`py-2.5 sm:py-3 px-2 sm:px-3 rounded-xl border text-xs sm:text-sm font-black transition text-center cursor-pointer ${
                        category === cat.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Vehicle Selector (If customer has vehicles) */}
              {vehicles.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Select Associated Vehicle
                  </label>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full h-10 sm:h-11 px-3 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                  >
                    {vehicles.map((v) => {
                      const vid = String(v.id || v.vehicle_id);
                      return (
                        <option key={vid} value={vid}>
                          {v.registration_number || v.reg_no || 'Vehicle'} - {v.model || v.brand_name || 'Vehicle'} (Purchased: {v.purchase_date ? new Date(v.purchase_date).toLocaleDateString('en-IN') : 'N/A'})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* 3. Lock Status Banner */}
              {!isEligible && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs">
                  <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-amber-900 uppercase tracking-wider text-[10px] sm:text-[11px] block">
                      {currentPoints <= 0 ? 'No Points to Redeem' : 'Redemption Locked (<12 Months)'}
                    </span>
                    <p className="text-amber-800 font-medium text-[11px] sm:text-xs mt-0.5">
                      {lockReason || 'Points are locked for Service / Sales until 12 months from vehicle purchase. (Accessories redemption is unlocked anytime).'}
                    </p>
                  </div>
                </div>
              )}

              {/* 4. Bill Amount & Invoice Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Bill Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm sm:text-base">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      placeholder="Enter total invoice amount e.g. 2000"
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                      className="w-full h-11 sm:h-12 pl-8 sm:pl-9 pr-4 py-2 text-sm sm:text-base font-black font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      className="w-full h-10 sm:h-11 px-3 text-xs font-bold font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                    />
                  </div>

                  {/* Job Card (Optional) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Job Card <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. JC-2026-081"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full h-10 sm:h-11 px-3 text-xs font-bold font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                    />
                  </div>

                  {/* Branch */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Dealership Branch
                    </label>
                    <select
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      className="w-full h-10 sm:h-11 px-3 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                    >
                      {branches.map((b) => (
                        <option key={b.id || b.branch_id} value={b.id || b.branch_id}>
                          {b.name || b.branch_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 5. Live Auto-Calculation Breakdown Strip */}
              {numAmount > 0 && (
                <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  {/* Auto-deducted loyalty points notification if eligible */}
                  {isEligible && activeRedeemPoints > 0 ? (
                    <div className="bg-emerald-50/80 border-b border-emerald-200 p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-950 font-bold">
                        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Auto Loyalty Discount Applied (4 PTS = ₹1)</span>
                      </div>
                      <span className="font-mono font-black text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                        - {activeRedeemPoints} PTS (- ₹{discountAmount})
                      </span>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border-b border-slate-200 p-2.5 text-xs text-slate-600 font-medium">
                      No points redeemed for this invoice. New points will be earned on full amount.
                    </div>
                  )}

                  <div className="p-3.5 bg-white space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Total Bill:</span>
                      <span className="font-mono font-bold text-slate-900">₹{numAmount.toLocaleString('en-IN')}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-emerald-700 font-semibold">
                        <span>Points Discount ({activeRedeemPoints} PTS):</span>
                        <span className="font-mono font-bold">- ₹{discountAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-slate-900 font-black pt-1 border-t border-slate-100">
                      <span>Net Cash to Collect:</span>
                      <span className="font-mono text-sm text-indigo-700 font-bold">₹{netCashPaid.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-amber-500" /> New Points to Earn:
                      </span>
                      <span className="font-mono font-black text-amber-600">+{earnedPoints} PTS</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500 pt-1 text-[11px]">
                      <span>Projected New Balance:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {projectedBalance} PTS (≈ ₹{(projectedBalance * 0.25).toFixed(2)})
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 6. Pinned Sticky Action Footer — Always visible on mobile and desktop */}
            <div className="flex-shrink-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:p-4 px-4 sm:px-6 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] z-20">
              <button
                type="submit"
                disabled={isSubmitting || numAmount <= 0}
                className={`w-full min-h-[46px] sm:min-h-[48px] py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                  isEligible && activeRedeemPoints > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Processing Receipt &amp; Updating Ledger...
                  </>
                ) : isEligible && activeRedeemPoints > 0 ? (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-200 shrink-0" />
                    <span className="truncate">
                      Confirm Receipt &amp; Redeem {activeRedeemPoints} PTS (- ₹{discountAmount})
                    </span>
                    <span className="text-emerald-200 ml-1">→</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4 text-amber-200 shrink-0" />
                    <span className="truncate">
                      Confirm &amp; Record Receipt (+{earnedPoints} PTS)
                    </span>
                    <span className="text-indigo-200 ml-1">→</span>
                  </>
                )}
              </button>
              {numAmount <= 0 && (
                <p className="text-[10px] sm:text-[11px] text-center text-slate-400 font-medium mt-1">
                  Enter invoice amount above to record receipt &amp; update loyalty points
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddReceiptModal;
