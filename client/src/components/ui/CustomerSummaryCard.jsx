import React, { useState } from 'react';
import { User, Phone, Car, Award, ShieldCheck, Share2, CheckCircle2 } from 'lucide-react';
import StatusBadge from './StatusBadge';
import api from '../../services/api';

/**
 * Counter-optimized Customer Summary Card with prominent fonts & clear visibility
 */
export const CustomerSummaryCard = ({
  customer,
  onRecordEarning,
  onRedeemPoints,
  hasPendingCorrection = false,
  className = '',
}) => {
  if (!customer) return null;

  const currentPoints = customer.points_balance || customer.current_balance || 0;
  const rupeeValue = Math.floor(currentPoints / 4);
  const tierName = customer.tier_name || customer.tier || 'Silver';
  const phones = customer.phones || [];
  const vehicles = customer.vehicles || [];
  const aadhaarDisplay = customer.aadhaar_number || customer.aadhaar_no || customer.aadhaar_last4 || null;

  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);

  const handleSendReferralWhatsApp = async () => {
    try {
      setSendingReminder(true);
      const primaryPhone = phones[0]?.phone_number || phones[0] || null;
      await api.sendReferralReminder(customer.customer_id, primaryPhone);
      setReminderSent(true);
      setTimeout(() => setReminderSent(false), 4000);
    } catch (err) {
      alert(err.message || 'Failed to send WhatsApp referral link');
    } finally {
      setSendingReminder(false);
    }
  };

  return (
    <div className={`w-full bg-white border-2 border-slate-300 rounded-xl p-6 shadow-md ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

        {/* Left: Customer Identity & Key Badges */}
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white font-mono font-extrabold text-xl rounded-lg shadow-sm">
              {customer.customer_id}
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{customer.name || customer.customer_name}</h2>
            <StatusBadge value={tierName} type="tier" />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-base pt-1">
            {/* Contact Phone Numbers */}
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-slate-600 flex-shrink-0" />
              {phones.length > 0 ? (
                phones.map((p, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-slate-100 border border-slate-300 rounded-lg font-mono font-bold text-lg text-slate-900"
                  >
                    {p.phone_number || p}
                    {p.is_primary && <span className="ml-1.5 text-xs text-blue-700 font-extrabold">(Primary)</span>}
                  </span>
                ))
              ) : (
                <span className="text-slate-500 font-medium">No phone registered</span>
              )}
            </div>

            {/* Aadhaar Number Display */}
            {aadhaarDisplay && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 text-amber-900 px-3 py-1 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-amber-700 flex-shrink-0" />
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Aadhaar:</span>
                <span className="font-mono font-bold text-lg text-slate-900">{aadhaarDisplay}</span>
              </div>
            )}
          </div>

          {/* Registered Vehicles */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Car className="w-5 h-5 text-slate-600 flex-shrink-0" />
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mr-1">Vehicles:</span>
            {vehicles.length > 0 ? (
              vehicles.map((v, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg text-base font-bold text-blue-900"
                >
                  {v.registration_number || v.reg_no || v.vin || v.chassis_no} {v.model ? `(${v.model})` : ''}
                </span>
              ))
            ) : (
              <span className="text-base text-slate-500">No vehicle registered</span>
            )}
          </div>
        </div>

        {/* Right: Key Balance & POS Actions */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-6">
          <div className="text-left lg:text-right">
            <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Available Loyalty Balance</div>
            <div className="text-4xl font-black text-blue-900 tabular-nums tracking-tight my-1">
              {Number(currentPoints).toLocaleString()} <span className="text-2xl font-bold text-slate-700">PTS</span>
            </div>
            <div className="text-lg font-extrabold text-emerald-700">
              ≈ ₹{Number(rupeeValue).toLocaleString()} Redeemable Value
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* WhatsApp Referral Link Reminder Button */}
            <button
              type="button"
              onClick={handleSendReferralWhatsApp}
              disabled={sendingReminder}
              className={`h-12 px-4 flex items-center gap-2 font-bold text-base rounded-xl border-2 transition-all shadow-sm ${
                reminderSent
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white'
              }`}
              title="Send WhatsApp referral link to customer using template loyalty_refferral_progrm_reminder"
            >
              {reminderSent ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Referral Link Sent!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5" />
                  <span>{sendingReminder ? 'Sending...' : 'Send Referral Link (WhatsApp)'}</span>
                </>
              )}
            </button>

            {onRedeemPoints && (
              <button
                type="button"
                onClick={() => {
                  if (hasPendingCorrection) {
                    alert("Billing correction request is currently pending admin approval. Redemption and edits are blocked until approved.");
                    return;
                  }
                  onRedeemPoints(customer);
                }}
                disabled={hasPendingCorrection}
                className={`h-12 px-5 font-extrabold text-lg rounded-xl shadow transition-colors ${
                  hasPendingCorrection
                    ? 'bg-amber-600 text-white cursor-not-allowed opacity-90'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
                title={hasPendingCorrection ? "Billing correction ticket pending admin approval. Account is locked." : ""}
              >
                {hasPendingCorrection
                  ? 'Locked (Correction Pending)'
                  : (customer?.vehicles?.[0]?.purchase_date || customer?.purchase_date ? 'Redeem (OTP)' : 'Get Points (OTP)')}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default CustomerSummaryCard;
