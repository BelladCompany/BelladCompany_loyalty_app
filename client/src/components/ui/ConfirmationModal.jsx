import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Button from './Button';

/**
 * High-contrast Confirmation Modal for irreversible counter operations
 */
export const ConfirmationModal = ({
  isOpen = false,
  title = 'Confirm Action',
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'primary' | 'success'
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white border-2 border-surface-border rounded-lg shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100 border-b border-surface-border">
          <div className="flex items-center gap-3">
            {variant === 'danger' && <AlertTriangle className="w-6 h-6 text-action-danger flex-shrink-0" />}
            <h3 className="text-xl font-bold text-ink-primary">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="p-1 text-ink-secondary hover:text-ink-primary rounded hover:bg-slate-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-base text-ink-primary font-medium leading-relaxed">
            {description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 px-6 py-4 bg-slate-50 border-t border-surface-border">
          <Button
            variant="outline"
            size="lg"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            size="lg"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </div>

      </div>
    </div>
  );
};

export default ConfirmationModal;
