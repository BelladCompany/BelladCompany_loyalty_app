import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  User,
  Calendar,
  Building2,
  Receipt,
  Eye
} from 'lucide-react';
import ApiService from '../../services/api';

export default function ViewCorrectionModal({ isOpen, correction, onClose, onRevalidate }) {
  const [activeProofZoom, setActiveProofZoom] = useState(false);

  if (!isOpen || !correction) return null;

  const status = correction.status || 'pending';
  const wrongNum = parseFloat(correction.wrong_bill_amount || 0);
  const correctNum = parseFloat(correction.correct_bill_amount || 0);
  const diff = correctNum - wrongNum;
  const isIncrease = diff > 0;
  const percent = wrongNum > 0 ? Math.abs((diff / wrongNum) * 100).toFixed(1) : '0';

  const proofUrl = correction.screenshot_file_url
    ? ApiService.getCorrectionProofUrl(correction.screenshot_file_url.split('/').pop())
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-hidden animate-fadeIn">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight truncate">
                Bill Correction Details
              </h3>
              <p className="text-[11px] text-slate-300 font-mono">
                Receipt Ref: <strong className="text-amber-300">{correction.points_ledger_reference}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">

          {/* Status Banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${status === 'approved'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
            : status === 'rejected'
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}>
            <div className="flex items-center gap-2.5 font-bold text-sm">
              {status === 'approved' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {status === 'rejected' && <XCircle className="w-5 h-5 text-rose-600" />}
              {status === 'pending' && <Clock className="w-5 h-5 text-amber-600 animate-pulse" />}
              <span>
                {status === 'approved' && 'Correction Approved by Manager'}
                {status === 'rejected' && 'Correction Rejected by Manager'}
                {status === 'pending' && 'Sent for Billing Correction (Under Review)'}
              </span>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${status === 'approved'
              ? 'bg-emerald-200/70 text-emerald-900 border border-emerald-300'
              : status === 'rejected'
                ? 'bg-rose-200/70 text-rose-900 border border-rose-300'
                : 'bg-amber-200/70 text-amber-900 border border-amber-300'
              }`}>
              {status}
            </span>
          </div>

          {/* Amount Comparison & Flags Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <span>Amount Audit Verification</span>
              <span className="font-mono text-slate-700">Ref: {correction.points_ledger_reference}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-slate-200 text-center">
              <div className="p-2 bg-rose-50/50 rounded-lg border border-rose-100">
                <div className="text-[10px] font-bold text-rose-600 uppercase">Wrong Recorded Bill</div>
                <div className="text-base font-black text-rose-700 line-through">
                  ₹{wrongNum.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="p-2 bg-emerald-50/50 rounded-lg border border-emerald-100">
                <div className="text-[10px] font-bold text-emerald-600 uppercase">Claimed Correct Bill</div>
                <div className="text-base font-black text-emerald-700">
                  ₹{correctNum.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Variance & Anti-Theft Indicators */}
            <div className="p-2.5 bg-slate-100 rounded-xl flex items-center justify-between font-medium text-slate-700">
              <span>Net Variance:</span>
              <span className={`font-bold font-mono ${isIncrease ? 'text-rose-700' : 'text-emerald-700'}`}>
                {diff > 0 ? `+₹${diff.toLocaleString('en-IN')}` : `-₹${Math.abs(diff).toLocaleString('en-IN')}`} ({percent}%)
              </span>
            </div>

            {isIncrease && (
              <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 flex items-center gap-2 text-amber-900 text-[11px] font-medium">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Notice: Bill amount increased. Manager verified genuine customer bill proof.
                </span>
              </div>
            )}
          </div>

          {/* Cashier Request Information */}
          <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="font-bold text-slate-800 text-xs block">Cashier Request Details</span>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div>
                <span className="text-slate-400 block">Submitted By:</span>
                <strong className="text-slate-800">{correction.cashier_name || 'Cashier'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Submitted Date &amp; Time:</span>
                <strong className="text-slate-800">
                  {correction.created_at ? new Date(correction.created_at).toLocaleString('en-IN') : 'N/A'}
                </strong>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <span className="text-slate-400 block text-[11px]">Reason / Explanation:</span>
              <p className="text-slate-800 italic mt-0.5 bg-white p-2.5 rounded-lg border border-slate-200 font-medium">
                "{correction.explanation || 'No explanation provided.'}"
              </p>
            </div>
          </div>

          {/* Manager Review Decision (if reviewed) */}
          {(status === 'approved' || status === 'rejected' || correction.review_notes) && (
            <div className={`space-y-2 p-4 rounded-2xl border ${status === 'approved'
              ? 'bg-emerald-50/60 border-emerald-200'
              : 'bg-rose-50/60 border-rose-200'
              }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">
                  {status === 'approved' ? 'Manager Approval Note' : 'Manager Rejection Reason'}
                </span>
                {correction.reviewed_at && (
                  <span className="text-[10px] text-slate-500 font-medium">
                    {new Date(correction.reviewed_at).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <p className="bg-white p-2.5 rounded-lg border border-slate-200 font-semibold text-slate-800 leading-relaxed">
                {correction.review_notes || (status === 'approved' ? 'Approved by manager.' : 'Rejected.')}
              </p>
              {correction.reviewer_name && (
                <div className="text-[10px] text-slate-500 text-right">
                  Reviewed by: <strong className="text-slate-700">{correction.reviewer_name}</strong>
                </div>
              )}
            </div>
          )}

          {/* Proof Evidence Screenshot */}
          {proofUrl && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Proof Evidence Screenshot</span>
                <button
                  type="button"
                  onClick={() => setActiveProofZoom(true)}
                  className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Full Size
                </button>
              </div>
              <div
                onClick={() => setActiveProofZoom(true)}
                className="max-h-40 overflow-hidden rounded-xl border border-slate-200 cursor-pointer hover:opacity-90 transition bg-slate-100 flex items-center justify-center"
              >
                <img
                  src={proofUrl}
                  alt="Proof Screenshot"
                  className="object-contain w-full max-h-40"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          {status === 'rejected' && onRevalidate && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRevalidate(correction);
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
            >
              Validate &amp; Re-submit Correction
            </button>
          )}
          <div className="ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Full Size Proof Zoom Overlay */}
      {activeProofZoom && proofUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4 cursor-pointer"
          onClick={() => setActiveProofZoom(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={proofUrl}
              alt="Proof Full Size"
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setActiveProofZoom(false)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center font-bold shadow-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
