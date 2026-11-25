import React, { useState } from 'react';
import { User, Phone, Car, Award, ShieldCheck, CheckCircle2, PlusCircle, Lock, Sparkles, RefreshCw, AlertTriangle, X, ShieldAlert, Building2, FileText } from 'lucide-react';
import StatusBadge from './StatusBadge';
import CopyButton from './CopyButton';
import ApiService from '../../services/api';

/**
 * Clean Light Mode Customer Summary Card
 * Features high-contrast 16-18px typography, pure white card surface, and Add Receipt action button.
 */
export const CustomerSummaryCard = ({
  customer,
  onAddReceipt,
  onRecordEarning,
  onRedeemPoints,
  onRefresh,
  isRefreshing = false,
  hasPendingCorrection = false,
  className = '',
}) => {
  if (!customer) return null;

  const currentPoints = Math.max(0, customer.points_balance ?? customer.current_balance ?? 0);
  const rupeeValue = Math.max(0, Math.floor(currentPoints / 4));
  const tierName = customer.tier_name || customer.tier || 'Silver';
  const phones = customer.phones || [];
  const vehicles = customer.vehicles || [];
  const aadhaarDisplay = customer.aadhaar_number || customer.aadhaar_no || customer.aadhaar_last4 || null;
  const gstDisplay = customer.gst_number || customer.gstin || customer.gst_no || null;
  const hasAadhaar = Boolean(aadhaarDisplay);
  const hasGst = Boolean(gstDisplay);

  const currentUser = ApiService.getUser();
  const isAdvisor = currentUser?.role === 'advisor';

  // Add / Edit Aadhaar Modal State
  const [isAadhaarModalOpen, setIsAadhaarModalOpen] = useState(false);
  const [aadhaarInput, setAadhaarInput] = useState('');
  const [isSubmittingAadhaar, setIsSubmittingAadhaar] = useState(false);
  const [aadhaarError, setAadhaarError] = useState('');

  // Add / Edit GST Modal State (for commercial customers without Aadhaar)
  const [isGstModalOpen, setIsGstModalOpen] = useState(false);
  const [gstInput, setGstInput] = useState('');
  const [isSubmittingGst, setIsSubmittingGst] = useState(false);
  const [gstError, setGstError] = useState('');

  const handleSaveGst = async (e) => {
    e.preventDefault();
    const clean = gstInput.trim().toUpperCase();
    if (clean.length < 8 || clean.length > 15) {
      setGstError('GST number must be between 8 and 15 alphanumeric characters.');
      return;
    }
    setIsSubmittingGst(true);
    setGstError('');
    try {
      await ApiService.updateCustomer(customer.customer_id, {
        gst_number: clean,
      });
      setIsGstModalOpen(false);
      if (typeof onRefresh === 'function') {
        await onRefresh();
      }
    } catch (err) {
      setGstError(err.message || 'Failed to update GST number. Please try again.');
    } finally {
      setIsSubmittingGst(false);
    }
  };

  const handleSaveAadhaar = async (e) => {
    e.preventDefault();
    const clean = aadhaarInput.replace(/\D/g, '');
    if (clean.length !== 12) {
      setAadhaarError('Aadhaar must contain exactly 12 digits.');
      return;
    }
    setIsSubmittingAadhaar(true);
    setAadhaarError('');
    try {
      await ApiService.updateCustomer(customer.customer_id, {
        aadhaar_number: clean,
      });
      setIsAadhaarModalOpen(false);
      if (typeof onRefresh === 'function') {
        await onRefresh();
      }
    } catch (err) {
      setAadhaarError(err.message || 'Failed to update Aadhaar. Please try again.');
    } finally {
      setIsSubmittingAadhaar(false);
    }
  };

  // Calculate 12-month redemption eligibility status across linked vehicles or customer purchase date
  let redemptionEligible = true;
  let lockReason = '';
  let eligibleDateStr = '';

  if (vehicles.length > 0) {
    // If ANY linked vehicle is eligible (or bought >= 12 months ago), redemption is unlocked!
    const hasEligibleVehicle = vehicles.some((v) => {
      if (v.redemption_status === 'eligible') return true;
      const rawDate = v.purchase_date || v.dms_invoice_date || v.purchaseDate;
      if (!rawDate) return true; // No purchase date = active / eligible
      const pDate = new Date(rawDate);
      if (isNaN(pDate.getTime())) return true;
      const eligibleAt = new Date(pDate);
      eligibleAt.setMonth(eligibleAt.getMonth() + 12);
      return new Date() >= eligibleAt;
    });

    if (!hasEligibleVehicle) {
      redemptionEligible = false;
      const unlockDates = vehicles
        .map((v) => {
          const rawDate = v.purchase_date || v.dms_invoice_date || v.purchaseDate;
          if (!rawDate) return null;
          const p = new Date(rawDate);
          if (isNaN(p.getTime())) return null;
          p.setMonth(p.getMonth() + 12);
          return p;
        })
        .filter(Boolean)
        .sort((a, b) => a - b);

      if (unlockDates.length > 0) {
        eligibleDateStr = unlockDates[0].toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        lockReason = `Redemption is locked until 12 months after vehicle purchase date (Eligible on ${eligibleDateStr}). Points can still be earned for service!`;
      } else {
        lockReason = 'Redemption is locked until 12 months after vehicle purchase date.';
      }
    } else {
      redemptionEligible = true;
    }
  } else if (customer.dms_invoice_date || customer.purchase_date) {
    const rawDate = customer.dms_invoice_date || customer.purchase_date;
    const pDate = new Date(rawDate);
    if (!isNaN(pDate.getTime())) {
      const eligibleAt = new Date(pDate);
      eligibleAt.setMonth(eligibleAt.getMonth() + 12);
      if (new Date() < eligibleAt) {
        redemptionEligible = false;
        eligibleDateStr = eligibleAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        lockReason = `Redemption is locked until 12 months after vehicle purchase date (Eligible on ${eligibleDateStr}). Points can still be earned for service!`;
      }
    }
  }

  return (
    <div className={`w-full bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 lg:p-8 border border-slate-200/90 shadow-card ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">

        {/* Left: Customer Identity & Key Badges */}
        <div className="flex-1 space-y-3 sm:space-y-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-slate-900 text-white font-mono font-bold text-xs sm:text-sm rounded-xl shadow-xs shrink-0 select-text">
              <span>{customer.customer_id}</span>
              <CopyButton text={customer.customer_id} size="xs" className="text-slate-300 hover:text-white hover:bg-slate-800" title="Copy Customer ID" />
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight break-words select-text">
                {customer.name || customer.customer_name}
              </h2>
              <CopyButton text={customer.name || customer.customer_name} size="sm" title="Copy Customer Name" />
            </div>
            <StatusBadge value={tierName} type="tier" />
            {(customer.pr_status || customer.billing_status) && (
              <span className="inline-flex items-center text-[10px] sm:text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 uppercase tracking-wider shrink-0 whitespace-nowrap leading-none select-text">
                PR Status: {customer.pr_status || customer.billing_status}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm sm:text-base pt-0.5 sm:pt-1">
            {/* Contact Phone Numbers */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
              {phones.length > 0 ? (
                phones.map((p, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-0.5 sm:py-1 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs sm:text-sm text-slate-800 select-text"
                  >
                    <span>{p.phone_number || p}</span>
                    <CopyButton text={p.phone_number || p} size="xs" title="Copy Phone Number" />
                    {p.is_primary && <span className="ml-1 text-[11px] sm:text-xs text-indigo-600 font-extrabold">(Primary)</span>}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 font-medium text-xs sm:text-sm">No phone registered</span>
              )}
            </div>

            {/* Identity Display: Priority 1 = Aadhaar, Priority 2 = GSTIN for Commercial/Business, Fallback = Missing */}
            {hasAadhaar ? (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-amber-50 border border-amber-200 text-amber-900 px-3 py-0.5 sm:py-1 rounded-xl">
                <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-700">Aadhaar:</span>
                <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 select-text">{aadhaarDisplay}</span>
                <CopyButton text={aadhaarDisplay} size="xs" title="Copy Aadhaar" />
                {hasGst && (
                  <span className="inline-flex items-center gap-1 ml-1.5 pl-1.5 border-l border-amber-300 text-[11px] font-bold text-amber-800">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-mono">{gstDisplay}</span>
                  </span>
                )}
              </div>
            ) : hasGst ? (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-emerald-50 border border-emerald-300 text-emerald-950 px-3 py-0.5 sm:py-1 rounded-xl">
                <Building2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-800">GSTIN:</span>
                <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 select-text">{gstDisplay}</span>
                <CopyButton text={gstDisplay} size="xs" title="Copy GSTIN" />
                {!isAdvisor && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setGstInput(gstDisplay);
                        setGstError('');
                        setIsGstModalOpen(true);
                      }}
                      className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold ml-1 underline cursor-pointer"
                      title="Update GST number"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAadhaarInput('');
                        setAadhaarError('');
                        setIsAadhaarModalOpen(true);
                      }}
                      className="text-[10px] text-slate-500 hover:text-slate-800 font-bold ml-1.5 border-l border-emerald-300 pl-1.5 cursor-pointer"
                      title="Optionally link Aadhaar if individual customer"
                    >
                      + Add Aadhaar
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-300 text-rose-900 px-3 py-1 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-rose-800">Identity:</span>
                <span className="text-xs font-black text-rose-700">Missing / Not Linked</span>
                {!isAdvisor && (
                  <div className="flex items-center gap-1 ml-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAadhaarInput('');
                        setAadhaarError('');
                        setIsAadhaarModalOpen(true);
                      }}
                      className="px-2.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition shadow-xs cursor-pointer"
                      title="Click to add customer Aadhaar number"
                    >
                      + Add Aadhaar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGstInput('');
                        setGstError('');
                        setIsGstModalOpen(true);
                      }}
                      className="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition shadow-xs cursor-pointer"
                      title="Click to add customer commercial GSTIN"
                    >
                      + Add GST
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Registered Vehicles */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5 sm:pt-1">
            <Car className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Vehicles:</span>
            {vehicles.length > 0 ? (
              vehicles.map((v, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-0.5 sm:py-1 bg-indigo-50 border border-indigo-200/80 rounded-xl text-xs font-bold text-indigo-800 select-text"
                >
                  <span>{v.registration_number || v.reg_no || v.vin || v.chassis_no} {v.model ? `(${v.model})` : ''}</span>
                  <CopyButton text={v.registration_number || v.reg_no || v.vin || v.chassis_no} size="xs" title="Copy Registration/VIN" />
                </span>
              ))
            ) : (
              <span className="text-slate-400 font-medium text-xs">No registered vehicles</span>
            )}
          </div>
        </div>

        {/* Right: Available Points & High-Impact CTA Actions */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 sm:pt-5 lg:pt-0 lg:pl-8 w-full lg:w-auto">
          <div className="text-left lg:text-right w-full sm:w-auto">
            <div className="text-[11px] sm:text-xs font-black text-slate-400 uppercase tracking-wider">Available Loyalty Balance</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tabular-nums tracking-tight my-1">
              {Number(currentPoints).toLocaleString()} <span className="text-lg sm:text-xl font-bold text-indigo-600">PTS</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-emerald-600 font-mono">
              ≈ ₹{Number(rupeeValue).toLocaleString()} Redeemable Value
            </div>
            {customer.active_campaign_name && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-950 border border-amber-300 font-black text-[11px] shadow-2xs">
                <span>🎁 Active Campaign: <strong>{customer.active_campaign_name}</strong></span>
                {customer.campaign_bonus_points > 0 && (
                  <span className="text-emerald-800 font-bold bg-white px-1.5 py-0.2 rounded border border-amber-200">
                    (+{Number(customer.campaign_bonus_points).toLocaleString()} pts = ₹{Math.floor(customer.campaign_bonus_points / 4)} discount)
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Quick Refresh Profile Button */}
            {onRefresh && (
              <button
                type="button"
                id="refresh-profile-btn"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-11 sm:h-12 px-4 font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 transition-all border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh customer profile, points balance, and correction status"
              >
                <RefreshCw className={`w-4 h-4 text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh Profile'}</span>
              </button>
            )}

            {/* Combined Add Receipt Button (Only for Cashier/Admin) */}
            {onAddReceipt && (
              <button
                type="button"
                id="add-receipt-btn"
                onClick={() => {
                  if (onAddReceipt) onAddReceipt(customer);
                  else if (onRecordEarning) onRecordEarning(customer);
                }}
                className="h-11 sm:h-12 px-5 sm:px-6 font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25 w-full sm:w-auto"
              >
                <PlusCircle className="w-4 h-4 text-white" />
                <span>Add Receipt</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Lock Warning Banner if 12-month rule applies */}
      {!redemptionEligible && (
        <div className="mt-4 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5 font-semibold">
          <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>{lockReason}</span>
        </div>
      )}

      {/* Modal: Update / Link Customer Aadhaar */}
      {isAadhaarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  Link Customer Aadhaar Card
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAadhaarModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAadhaar} className="p-5 space-y-4">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Customer
                </span>
                <p className="text-sm font-bold text-slate-900">
                  {customer.name || customer.customer_name} ({customer.customer_id})
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  12-Digit Aadhaar Card Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  maxLength={14}
                  required
                  placeholder="e.g. 5421 8901 2345"
                  value={aadhaarInput}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
                    const formatted = digits.match(/.{1,4}/g)?.join(' ') || digits;
                    setAadhaarInput(formatted);
                    setAadhaarError('');
                  }}
                  className="w-full h-11 px-3 font-mono font-bold text-base text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Enter all 12 digits of the customer's government Aadhaar card.
                </p>
              </div>

              {aadhaarError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{aadhaarError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAadhaarModalOpen(false)}
                  disabled={isSubmittingAadhaar}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAadhaar || aadhaarInput.replace(/\D/g, '').length !== 12}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingAadhaar ? 'Saving...' : 'Save Aadhaar Number'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit GST Modal */}
      {isGstModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  {gstDisplay ? 'Update Customer GSTIN' : 'Link Commercial GSTIN'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGstModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGst} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  GST Number (8 to 15 Alphanumeric) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  maxLength={15}
                  required
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  value={gstInput}
                  onChange={(e) => {
                    setGstInput(e.target.value.toUpperCase().trim());
                    setGstError('');
                  }}
                  className="w-full h-11 px-3 font-mono font-bold text-base text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600 uppercase transition"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Enter customer's commercial firm GSTIN for business identity.
                </p>
              </div>

              {gstError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{gstError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGstModalOpen(false)}
                  disabled={isSubmittingGst}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGst || gstInput.trim().length < 8}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingGst ? 'Saving...' : 'Save GST Number'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSummaryCard;
