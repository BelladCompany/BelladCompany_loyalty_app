import React from 'react';

/**
 * Modern High-Contrast Button Component (Image 1 & 2 Reference)
 * Features tactile rounded-2xl geometry, clear 16px typography, and distinct action colors.
 */
export const Button = ({
  children,
  variant = 'primary', // 'primary' | 'danger' | 'success' | 'secondary' | 'outline' | 'dark'
  size = 'md', // 'md' (46px) | 'lg' (52px) | 'sm' (40px)
  type = 'button',
  disabled = false,
  fullWidth = false,
  onClick,
  className = '',
  icon: Icon,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold transition-all select-none rounded-2xl border focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]';

  const sizeStyles = {
    sm: 'h-10 px-4 text-sm gap-2',
    md: 'h-12 px-5 text-base gap-2.5',
    lg: 'h-14 px-7 text-base font-black gap-3',
  };

  const variantStyles = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-sm shadow-indigo-600/20',
    dark: 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900 shadow-xs',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-xs',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200',
    outline: 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs',
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
