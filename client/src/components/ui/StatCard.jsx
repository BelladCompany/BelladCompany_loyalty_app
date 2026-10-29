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
    primary: 'border-slate-200 bg-white text-slate-900',
    success: 'border-emerald-200 bg-white text-emerald-900',
    danger: 'border-rose-200 bg-white text-rose-900',
  };

  return (
    <div className={`p-4 sm:p-6 rounded-2xl border ${variantStyles[variant] || variantStyles.default} shadow-xs transition-all hover:shadow-md ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>
        {Icon && <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />}
      </div>
      <div className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 tabular-nums break-words">
        {value}
      </div>
      {subtext && <div className="mt-1 text-xs font-semibold text-slate-500">{subtext}</div>}
    </div>
  );
};

export default StatCard;
