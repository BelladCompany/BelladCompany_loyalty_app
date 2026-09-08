import React from 'react';

/**
 * High-contrast, POS-optimized Button component (minimum 44px height for touchscreens)
 */
export const Button = ({
  children,
  variant = 'primary', // 'primary' | 'danger' | 'success' | 'secondary' | 'outline'
  size = 'md', // 'md' (44px) | 'lg' (48px) | 'sm' (38px)
  type = 'button',
  disabled = false,
  fullWidth = false,
  onClick,
  className = '',
  icon: Icon,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold transition-colors select-none rounded border focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'h-10 px-4 text-base gap-2',
    md: 'min-h-[44px] h-11 px-5 text-base gap-2.5',
    lg: 'min-h-[48px] h-12 px-6 text-lg gap-3',
  };

  const variantStyles = {
    primary: 'bg-action-primary hover:bg-action-primary-hover active:bg-action-primary-active text-white border-transparent',
    danger: 'bg-action-danger hover:bg-action-danger-hover text-white border-transparent',
    success: 'bg-action-success hover:bg-action-success-hover text-white border-transparent',
    secondary: 'bg-slate-800 hover:bg-slate-900 text-white border-transparent',
    outline: 'bg-white hover:bg-slate-100 text-ink-primary border-surface-border',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`
        ${baseStyles}
        ${sizeStyles[size] || sizeStyles.md}
        ${variantStyles[variant] || variantStyles.primary}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
      <span>{children}</span>
    </button>
  );
};

export default Button;
