import React from 'react';

/**
 * Clean Light Metric Stat Card (Image 1 & 2 Reference)
 */
export const StatCard = ({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'default',
  className = '',
}) => {
  const variantStyles = {
    default: 'border-slate-200 bg-white text-slate-900',
    primary: 'border-indigo-200 bg-indigo-50/40 text-indigo-900',
    success: 'border-emerald-200 bg-emerald-50/40 text-emerald-900',
    danger: 'border-rose-200 bg-rose-50/40 text-rose-900',
  };

  return (
    <div className={`p-6 rounded-2xl border ${variantStyles[variant] || variantStyles.default} shadow-xs transition-all hover:shadow-md ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>
        {Icon && <Icon className="w-5 h-5 text-slate-400" />}
      </div>
      <div className="mt-3 text-3xl font-black tracking-tight text-slate-900 tabular-nums">
        {value}
      </div>
      {subtext && <div className="mt-1 text-xs font-semibold text-slate-500">{subtext}</div>}
    </div>
  );
};

export default StatCard;
