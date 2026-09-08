import React from 'react';

/**
 * Large metric stat card for counter glanceability
 */
export const StatCard = ({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'default', // 'default' | 'primary' | 'success' | 'danger'
  className = '',
}) => {
  const variantStyles = {
    default: 'border-surface-border bg-white text-ink-primary',
    primary: 'border-blue-300 bg-action-primary-light text-action-primary',
    success: 'border-green-300 bg-action-success-light text-action-success',
    danger: 'border-red-300 bg-action-danger-light text-action-danger',
  };

  return (
    <div className={`p-5 rounded border ${variantStyles[variant] || variantStyles.default} ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-ink-secondary">{label}</span>
        {Icon && <Icon className="w-6 h-6 text-ink-secondary" />}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-ink-primary tabular-nums">
        {value}
      </div>
      {subtext && <div className="mt-1 text-sm font-semibold text-ink-secondary">{subtext}</div>}
    </div>
  );
};

export default StatCard;
