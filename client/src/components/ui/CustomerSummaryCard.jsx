import React, { useState } from 'react';
import { User, Phone, Car, Award, ShieldCheck, Share2, CheckCircle2, PlusCircle, Gift, Lock, Sparkles } from 'lucide-react';
import StatusBadge from './StatusBadge';
import api from '../../services/api';

/**
 * Clean Light Mode Customer Summary Card (Image 1 & 2 Reference)
 * Features high-contrast 16-18px typography, pure white card surface, and vibrant action buttons.
 */
export const CustomerSummaryCard = ({
  customer,
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

  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);

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

  // Send WhatsApp referral message
  const handleSendReferralWhatsApp = async () => {
    const primaryPhone = phones.find(p => p.is_primary)?.phone_number || phones[0]?.phone_number || phones[0];
    if (!primaryPhone) {
      alert('No phone number found for this customer');
      return;
    }

    try {
      setSendingReminder(true);
      await api.sendReferralWhatsApp({
        customer_id: customer.customer_id,
        phone_number: String(primaryPhone).replace(/[^0-9]/g, ''),
      });
      setReminderSent(true);
      setTimeout(() => setReminderSent(false), 4000);
    } catch (err) {
      alert(err.message || 'Failed to send WhatsApp referral link');
    } finally {
      setSendingReminder(false);
    }
  };

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
            {/* WhatsApp Referral Link Reminder Button */}
            <button
              type="button"
              onClick={handleSendReferralWhatsApp}
              disabled={sendingReminder}
              className={`h-12 px-4 flex items-center gap-2 font-bold text-xs rounded-2xl border transition-all ${
                reminderSent
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
              title="Send WhatsApp gift card link to customer"
            >
              {reminderSent ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Gift Card Sent!</span>
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4 text-emerald-600" />
                  <span>{sendingReminder ? 'Sending...' : '🎁 Send Gift Card'}</span>
                </>
              )}
            </button>

            {/* Earn Points Button */}
            {onRecordEarning && (
              <button
                type="button"
                onClick={() => onRecordEarning(customer)}
                className="h-12 px-5 font-bold text-sm rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Earn Points</span>
              </button>
            )}

            {/* Redeem Points Button */}
            {onRedeemPoints && (
              <button
                type="button"
                onClick={() => {
                  if (hasPendingCorrection) {
                    alert("Billing correction request is currently pending admin approval. Redemption is blocked until approved.");
                    return;
                  }
                  onRedeemPoints(customer);
                }}
                disabled={hasPendingCorrection}
                className={`h-12 px-5 font-bold text-sm rounded-2xl transition-all flex items-center gap-2 active:scale-[0.98] ${
                  hasPendingCorrection
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : !redemptionEligible
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'
                }`}
              >
                {!redemptionEligible ? <Gift className="w-4 h-4 text-amber-600" /> : <Gift className="w-4 h-4 text-amber-400" />}
                <span>
                  {hasPendingCorrection
                    ? 'Locked (Correction Pending)'
                    : !redemptionEligible
                    ? 'Redeem (Accessories Unlocked)'
                    : 'Redeem Points (OTP)'}
                </span>
              </button>
            )}
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
