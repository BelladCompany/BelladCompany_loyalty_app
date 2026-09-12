import React, { useState, useEffect, useCallback } from 'react';
import { X, MessageSquare, RefreshCw, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../ui';
import ApiService from '../../services/api';

const LogBadge = ({ status }) => {
  const sent = String(status || '').toLowerCase() === 'sent';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
      sent ? 'bg-action-success-light text-green-900 border-green-400' : 'bg-action-danger-light text-red-950 border-red-400'
    }`}>
      {sent ? 'Sent' : status || 'Failed'}
    </span>
  );
};

export const MessageLogModal = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await ApiService.getNotificationLogs(20);
      setLogs(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load message log.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, loadLogs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white border-2 border-surface-border rounded-lg shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-action-primary" />
            <h3 className="text-xl font-bold text-ink-primary">WhatsApp Message Log</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadLogs}
              disabled={isLoading}
              className="p-2 text-ink-secondary hover:text-ink-primary rounded hover:bg-slate-200"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-ink-secondary hover:text-ink-primary rounded hover:bg-slate-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-4 bg-action-danger-light border-2 border-red-300 rounded flex items-start gap-2.5 text-action-danger font-bold text-base">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isLoading && logs.length === 0 && (
            <div className="text-center py-10 text-base font-semibold text-ink-secondary">
              Loading your recent WhatsApp messages...
            </div>
          )}

          {!isLoading && logs.length === 0 && !error && (
            <div className="text-center py-10 space-y-2">
              <MessageSquare className="w-10 h-10 text-ink-muted mx-auto" />
              <p className="text-base font-semibold text-ink-secondary">
                No WhatsApp messages have been logged yet.
              </p>
              <p className="text-sm text-ink-secondary">
                Dispatch a points-earned or redemption message to start logging.
              </p>
            </div>
          )}

          {logs.length > 0 && (
            <ul className="space-y-3">
              {logs.map((log) => {
                const failed = String(log.status || '').toLowerCase() === 'failed';
                return (
                  <li key={log.id} className="p-4 bg-slate-50 border border-surface-border rounded">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-ink-primary text-base">{log.phone_number}</span>
                        <LogBadge status={log.status} />
                      </div>
                      <span className="text-sm font-medium text-ink-secondary">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {failed ? (
                        <XCircle className="w-4 h-4 text-action-danger" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-action-success" />
                      )}
                      <span className="text-sm font-bold text-ink-primary">{log.template_name}</span>
                      <span className="text-xs text-ink-muted">via {log.provider}</span>
                    </div>
                    {failed && log.error_message && (
                      <p className="mt-2 text-sm font-semibold text-action-danger bg-action-danger-light border border-red-200 rounded p-2">
                        {log.error_message}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-100 border-t border-surface-border flex items-center justify-between">
          <span className="text-sm font-medium text-ink-secondary">
            Latest {logs.length} dispatch attempt(s)
          </span>
          <Button variant="primary" size="lg" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageLogModal;