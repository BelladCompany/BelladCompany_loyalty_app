import React from 'react';

/**
 * High-contrast, touch-friendly Input component with large text and clear label
 */
export const Input = ({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  inputClassName = '',
  icon: Icon,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-base font-bold text-ink-primary flex items-center justify-between">
          <span>
            {label}
            {required && <span className="text-action-danger ml-1">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 pointer-events-none text-ink-secondary">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            w-full min-h-[44px] h-12 bg-white text-ink-primary text-base font-medium rounded border
            ${error ? 'border-action-danger bg-action-danger-light focus:border-action-danger' : 'border-surface-border focus:border-action-primary'}
            ${Icon ? 'pl-11 pr-4' : 'px-4'}
            placeholder:text-ink-muted
            focus:outline-none focus:ring-2 focus:ring-action-primary/20
            disabled:bg-slate-100 disabled:text-ink-muted disabled:cursor-not-allowed
            ${inputClassName}
          `}
          {...props}
        />
      </div>

      {error ? (
        <p className="text-sm font-semibold text-action-danger">{error}</p>
      ) : helperText ? (
        <p className="text-sm text-ink-secondary">{helperText}</p>
      ) : null}
    </div>
  );
};

export default Input;
