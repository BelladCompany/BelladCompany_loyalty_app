import React from 'react';

/**
 * High-contrast Status and Tier Badge
 */
export const StatusBadge = ({ value, type = 'status', className = '' }) => {
  const normVal = String(value || '').toLowerCase();

  let styles = 'bg-slate-100 text-slate-800 border-slate-300';

  if (type === 'tier') {
    switch (normVal) {
      case 'platinum':
        styles = 'bg-indigo-100 text-indigo-950 border-indigo-400 font-bold';
        break;
      case 'gold':
        styles = 'bg-amber-100 text-amber-950 border-amber-400 font-bold';
        break;
      case 'silver':
      default:
        styles = 'bg-slate-200 text-slate-900 border-slate-400 font-semibold';
        break;
    }
  } else {
    // Transaction or approval status
    switch (normVal) {
      case 'approved':
      case 'completed':
      case 'success':
        styles = 'bg-action-success-light text-green-900 border-green-400 font-bold';
        break;
      case 'pending':
        styles = 'bg-amber-100 text-amber-950 border-amber-400 font-bold';
        break;
      case 'rejected':
      case 'failed':
      case 'danger':
        styles = 'bg-action-danger-light text-red-950 border-red-400 font-bold';
        break;
      default:
        styles = 'bg-slate-100 text-slate-900 border-slate-300 font-medium';
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm uppercase tracking-wider border ${styles} ${className}`}
    >
      {value}
    </span>
  );
};

export default StatusBadge;
