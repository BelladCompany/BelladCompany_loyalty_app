import React from 'react';
import { User, Phone, Car, Award, ShieldCheck, CheckCircle2, PlusCircle, Lock, Sparkles } from 'lucide-react';
import StatusBadge from './StatusBadge';

/**
 * Clean Light Mode Customer Summary Card
 * Features high-contrast 16-18px typography, pure white card surface, and Add Receipt action button.
 */
export const CustomerSummaryCard = ({
  customer,
  onAddReceipt,
  onRecordEarning,
  onRedeemPoints,
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

  // Calculate 12-month redemption eligibility status across linked vehicles or customer purchase date
  let redemptionEligible = true;
  let lockReason = '';
  let eligibleDateStr = '';

  if (vehicles.length > 0) {
    for (const v of vehicles) {
      const rawDate = v.purchase_date || v.dms_invoice_date || v.purchaseDate;
      if (rawDate) {
        const pDate = new Date(rawDate);
        if (!isNaN(pDate.getTime())) {
          const eligibleAt = new Date(pDate);
          eligibleAt.setMonth(eligibleAt.getMonth() + 12);
          if (new Date() < eligibleAt) {
            redemptionEligible = false;
            eligibleDateStr = eligibleAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            lockReason = `Redemption is locked until 12 months after vehicle purchase date (Eligible on ${eligibleDateStr}). Points can still be earned for service!`;
            break;
          }
        }
      }
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
    <div className={`w-full bg-white rounded-3xl p-7 lg:p-8 border border-slate-200/90 shadow-card ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

        {/* Left: Customer Identity & Key Badges */}
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white font-mono font-bold text-sm rounded-xl shadow-xs">
              {customer.customer_id}
            </span>
            <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              {customer.name || customer.customer_name}
            </h2>
            <StatusBadge value={tierName} type="tier" />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-base pt-1">
            {/* Contact Phone Numbers */}
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
              {phones.length > 0 ? (
                phones.map((p, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm text-slate-800"
                  >
                    {p.phone_number || p}
                    {p.is_primary && <span className="ml-1.5 text-xs text-indigo-600 font-extrabold">(Primary)</span>}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 font-medium text-sm">No phone registered</span>
              )}
            </div>

            {/* Aadhaar Number Display */}
            {aadhaarDisplay && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-1 rounded-xl">
                <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Aadhaar:</span>
                <span className="font-mono font-bold text-sm text-slate-900">{aadhaarDisplay}</span>
              </div>
            )}
          </div>

          {/* Registered Vehicles */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Car className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Vehicles:</span>
            {vehicles.length > 0 ? (
              vehicles.map((v, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-indigo-50 border border-indigo-200/80 rounded-xl text-xs font-bold text-indigo-800"
                >
                  {v.registration_number || v.reg_no || v.vin || v.chassis_no} {v.model ? `(${v.model})` : ''}
                </span>
              ))
            ) : (
              <span className="text-slate-400 font-medium text-xs">No registered vehicles</span>
            )}
          </div>
        </div>

        {/* Right: Available Points & High-Impact CTA Actions */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-5 lg:pt-0 lg:pl-8">
          <div className="text-left lg:text-right">
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Available Loyalty Balance</div>
            <div className="text-3xl lg:text-4xl font-black text-slate-900 tabular-nums tracking-tight my-1">
              {Number(currentPoints).toLocaleString()} <span className="text-xl font-bold text-indigo-600">PTS</span>
            </div>
            <div className="text-sm font-bold text-emerald-600 font-mono">
              ≈ ₹{Number(rupeeValue).toLocaleString()} Redeemable Value
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Combined Add Receipt Button */}
            <button
              type="button"
              id="add-receipt-btn"
              onClick={() => {
                if (hasPendingCorrection) {
                  alert("Billing correction request is currently pending admin approval. Actions are locked until approved.");
                  return;
                }
                if (onAddReceipt) onAddReceipt(customer);
                else if (onRecordEarning) onRecordEarning(customer);
              }}
              disabled={hasPendingCorrection}
              className={`h-12 px-6 font-bold text-sm rounded-2xl flex items-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer ${
                hasPendingCorrection
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-white" />
              <span>Add Receipt</span>
            </button>
          </div>
        </div>

      </div>

      {/* Lock Warning Banner if 12-month rule applies */}
      {!redemptionEligible && (
        <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5 font-semibold">
          <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>{lockReason}</span>
        </div>
      )}
    </div>
  );
};

export default CustomerSummaryCard;
