import React from 'react';

/**
 * Clean Light Mode Status and Tier Badge (Image 1 & 2 Reference)
 */
export const StatusBadge = ({ value, type = 'status', className = '' }) => {
  const normVal = String(value || '').toLowerCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';

  if (type === 'tier') {
    switch (normVal) {
      case 'platinum':
        styles = 'bg-purple-50 text-purple-700 border-purple-200 font-bold';
        break;
      case 'gold':
        styles = 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
        break;
      case 'silver':
      default:
        styles = 'bg-slate-100 text-slate-700 border-slate-300 font-bold';
        break;
    }
  } else {
    // Transaction or approval status
    switch (normVal) {
      case 'approved':
      case 'completed':
      case 'success':
      case 'active':
        styles = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold';
        break;
      case 'pending':
      case 'upcoming':
        styles = 'bg-amber-50 text-amber-800 border-amber-200 font-bold';
        break;
      case 'rejected':
      case 'failed':
      case 'expired':
      case 'danger':
        styles = 'bg-rose-50 text-rose-800 border-rose-200 font-bold';
        break;
      default:
        styles = 'bg-slate-100 text-slate-700 border-slate-200 font-medium';
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs uppercase tracking-wider border shadow-2xs ${styles} ${className}`}
    >
      <span className="w-2 h-2 rounded-full bg-current inline-block" />
      {value}
    </span>
  );
};

export default StatusBadge;
