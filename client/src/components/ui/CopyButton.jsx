import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * Universal 1-Click Copy Button with instant visual feedback and fallbacks
 */
export const CopyButton = ({
  text,
  label = '',
  className = '',
  size = 'sm',
  title = 'Copy to clipboard',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!text) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(String(text));
      } else {
        // Fallback for non-secure HTTP contexts or older browsers
        const textArea = document.createElement('textarea');
        textArea.value = String(text);
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied!' : title}
      className={`inline-flex items-center gap-1 p-1 rounded-md transition-all active:scale-90 cursor-pointer select-none ${
        copied
          ? 'text-emerald-600 bg-emerald-50 border border-emerald-200'
          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent'
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className={`${iconSizes[size] || 'w-3.5 h-3.5'} text-emerald-600 animate-in zoom-in-50 duration-200`} />
          <span className="text-[10px] font-bold text-emerald-700 tracking-tight">Copied!</span>
        </>
      ) : (
        <>
          <Copy className={iconSizes[size] || 'w-3.5 h-3.5'} />
          {label && <span className="text-[11px] font-medium">{label}</span>}
        </>
      )}
    </button>
  );
};

export default CopyButton;
