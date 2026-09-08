import React from 'react';
import { User, Phone, Car, Award, Wallet } from 'lucide-react';
import StatusBadge from './StatusBadge';

/**
 * Counter-optimized Customer Summary Card for rapid glanceability
 */
export const CustomerSummaryCard = ({
  customer,
  onRecordEarning,
  onRedeemPoints,
  className = '',
}) => {
  if (!customer) return null;

  const currentPoints = customer.points_balance || customer.current_balance || 0;
  const rupeeValue = Math.floor(currentPoints / 4);
  const tierName = customer.tier_name || customer.tier || 'Silver';
  const phones = customer.phones || [];
  const vehicles = customer.vehicles || [];

  return (
    <div className={`w-full bg-white border-2 border-surface-border rounded-lg p-6 shadow-sm ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        {/* Left: Customer Identity & Details */}
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white font-mono font-bold text-lg rounded">
              {customer.customer_id}
            </span>
            <h2 className="text-2xl font-bold text-ink-primary">{customer.name}</h2>
            <StatusBadge value={tierName} type="tier" />
          </div>

          {/* Contact Numbers */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Phone className="w-5 h-5 text-ink-secondary flex-shrink-0" />
            {phones.length > 0 ? (
              phones.map((p, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-base font-mono font-semibold text-ink-primary"
                >
                  {p.phone_number || p}
                  {p.is_primary && <span className="ml-1 text-xs text-action-primary font-bold">(Main)</span>}
                </span>
              ))
            ) : (
              <span className="text-base text-ink-muted">No phone registered</span>
            )}
          </div>

          {/* Registered Vehicles */}
          <div className="flex flex-wrap items-center gap-2">
            <Car className="w-5 h-5 text-ink-secondary flex-shrink-0" />
            {vehicles.length > 0 ? (
              vehicles.map((v, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-base font-semibold text-ink-primary"
                >
                  {v.registration_number} {v.model ? `(${v.model})` : ''}
                </span>
              ))
            ) : (
              <span className="text-base text-ink-muted">No vehicle registered</span>
            )}
          </div>
        </div>

        {/* Right: Key Balance & POS Actions */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 border-t lg:border-t-0 lg:border-l border-surface-divider pt-4 lg:pt-0 lg:pl-6">
          <div className="text-left lg:text-right">
            <div className="text-sm font-bold text-ink-secondary uppercase tracking-wider">Available Loyalty Balance</div>
            <div className="text-3xl font-extrabold text-action-primary tabular-nums tracking-tight">
              {Number(currentPoints).toLocaleString()} <span className="text-xl font-bold">PTS</span>
            </div>
            <div className="text-base font-bold text-action-success">
              ≈ ₹{Number(rupeeValue).toLocaleString()} Discount Value
            </div>
          </div>

          {(onRecordEarning || onRedeemPoints) && (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {onRecordEarning && (
                <button
                  type="button"
                  onClick={() => onRecordEarning(customer)}
                  className="h-11 px-4 bg-action-primary hover:bg-action-primary-hover text-white font-bold text-base rounded transition-colors"
                >
                  + Add Points
                </button>
              )}
              {onRedeemPoints && (
                <button
                  type="button"
                  onClick={() => onRedeemPoints(customer)}
                  className="h-11 px-4 bg-action-success hover:bg-action-success-hover text-white font-bold text-base rounded transition-colors"
                >
                  Redeem (OTP)
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CustomerSummaryCard;
