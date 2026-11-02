import React from 'react';

/**
 * Clean Light Metric Stat Card (Centered by default per UX feedback)
 */
export const StatCard = ({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'default',
  align = 'center',
  className = '',
}) => {
  const variantStyles = {
    default: 'border-slate-200 bg-white text-slate-900',
    primary: 'border-slate-200 bg-white text-slate-900',
    success: 'border-emerald-200 bg-white text-emerald-900',
    danger: 'border-rose-200 bg-white text-rose-900',
  };

  const isCentered = align === 'center';

  return (
    <div
      className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border ${variantStyles[variant] || variantStyles.default} shadow-xs transition-all hover:shadow-md ${
        isCentered ? 'text-center flex flex-col items-center justify-center' : ''
      } ${className}`}
    >
      <div className={`flex items-center gap-1.5 ${isCentered ? 'justify-center w-full text-center' : 'justify-between'}`}>
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 leading-snug">
          {label}
        </span>
        {Icon && <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />}
      </div>
      <div className="mt-1 text-base sm:text-lg lg:text-xl font-black tracking-tight text-slate-900 tabular-nums break-words leading-tight">
        {value}
      </div>
      {subtext && (
        <div className="mt-0.5 text-[10px] sm:text-xs font-medium text-slate-500 leading-snug">
          {subtext}
        </div>
      )}
    </div>
  );
};

export default StatCard;
