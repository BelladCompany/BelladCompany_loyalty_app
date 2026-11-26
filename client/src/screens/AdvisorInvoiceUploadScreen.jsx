import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Eye,
  ExternalLink,
  Search,
  Filter,
  Check,
  ShieldAlert,
  Car,
  User,
  Hash,
  Trash2,
} from 'lucide-react';
import ApiService from '../services/api';

/**
 * AdvisorInvoiceUploadScreen
 *
 * Dedicated tab for Service Advisors:
 * - Allows dragging & dropping single or bulk (multiple) invoice PDFs at once.
 * - Saves PDFs to backend disk storage (uploads/advisor_invoices/).
 * - Runs backend OCR to extract customer name, vehicle reg, invoice #, and spare parts.
 * - Displays a live, searchable day-wise queue of all uploaded invoices with status ('pending' / 'completed').
 * - Advisor has view-only access; receipt creation is processed by Cashiers.
 */
export const AdvisorInvoiceUploadScreen = ({ user }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [uploadSuccessAlert, setUploadSuccessAlert] = useState(null);
  const [uploadError, setUploadError] = useState('');

  const [queueItems, setQueueItems] = useState([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'completed'
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [actionNotice, setActionNotice] = useState('');

  const fileInputRef = useRef(null);

  // Fetch queue items
  const loadQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const res = await ApiService.getAdvisorInvoiceQueue({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery.trim() || undefined,
      });
      setQueueItems(res.data || []);
    } catch (err) {
      console.warn('[AdvisorInvoiceUploadScreen] Queue load error:', err);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [statusFilter]);

  // Delete invoice handler
  const handleDeleteItem = async (item) => {
    const invLabel = item.invoice_number ? `#${item.invoice_number}` : (item.original_filename || 'PDF invoice');
    if (!window.confirm(`Are you sure you want to delete invoice ${invLabel} from the queue? This will remove the uploaded PDF.`)) {
      return;
    }
    setDeletingId(item.id);
    try {
      await ApiService.deleteAdvisorInvoiceQueueItem(item.id);
      setActionNotice(`Invoice ${invLabel} deleted successfully.`);
      setTimeout(() => setActionNotice(''), 4000);
      await loadQueue();
    } catch (err) {
      console.error('[AdvisorInvoiceUploadScreen] Delete error:', err);
      setUploadError(err.message || 'Failed to delete invoice PDF.');
      setTimeout(() => setUploadError(''), 4000);
    } finally {
      setDeletingId(null);
    }
  };

  // Handle single or bulk file upload
  const handleFilesUpload = async (files) => {
    if (!files || files.length === 0) return;

    const pdfFiles = Array.from(files).filter(
      (f) => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf'
    );

    if (pdfFiles.length === 0) {
      setUploadError('Please select or drop valid PDF invoice files.');
      setTimeout(() => setUploadError(''), 4000);
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setUploadSuccessAlert(null);
    setUploadProgressMsg(`Uploading and parsing ${pdfFiles.length} invoice PDF(s)...`);

    try {
      const res = await ApiService.uploadAdvisorInvoice(pdfFiles, {
        autoSave: true,
      });

      const count = res.uploaded_count || (Array.isArray(res.data) ? res.data.length : 1);
      setUploadSuccessAlert({
        count,
        message: `Successfully uploaded ${count} invoice(s) to backend storage! Queued for Cashier processing.`,
      });
      setTimeout(() => setUploadSuccessAlert(null), 8000);

      // Refresh queue
      await loadQueue();
    } catch (err) {
      console.error('[AdvisorInvoiceUploadScreen] Upload error:', err);
      setUploadError(err.message || 'Failed to upload invoice PDFs. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgressMsg('');
    }
  };

  // Group queue day-wise
  const groupedQueue = queueItems.reduce((acc, item) => {
    const rawDate = item.upload_date || (item.created_at ? item.created_at.substring(0, 10) : 'Recent');
    let dateLabel = rawDate;
    try {
      const d = new Date(rawDate);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) {
        dateLabel = 'Today';
      } else {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) {
          dateLabel = 'Yesterday';
        } else {
          dateLabel = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      }
    } catch (_) {}

    if (!acc[dateLabel]) {
      acc[dateLabel] = [];
    }
    acc[dateLabel].push(item);
    return acc;
  }, {});

  const pendingCount = queueItems.filter((i) => i.status === 'pending').length;
  const completedCount = queueItems.filter((i) => i.status === 'completed').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-sky-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
              Advisor Portal
            </span>
            <span className="text-xs text-slate-300 font-semibold">• Multi-Brand OCR Storage</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Invoice PDF Upload &amp; Queue</h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            Drag and drop customer invoices in bulk or single files (Hero, Hyundai, Tata). Files are saved to backend storage and parsed for Cashier receipt creation.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15">
          <div className="text-center px-2">
            <span className="text-[10px] text-slate-300 uppercase font-bold block">Pending</span>
            <span className="text-xl font-black text-amber-300 font-mono">{pendingCount}</span>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="text-center px-2">
            <span className="text-[10px] text-slate-300 uppercase font-bold block">Processed</span>
            <span className="text-xl font-black text-emerald-300 font-mono">{completedCount}</span>
          </div>
        </div>
      </div>

      {/* Bulk / Single PDF Drag & Drop Area */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) handleFilesUpload(files);
            e.target.value = '';
          }}
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const files = e.dataTransfer.files;
            if (files && files.length > 0) handleFilesUpload(files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-3 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3.5 ${
            isDragging
              ? 'bg-sky-50 border-sky-500 scale-[0.99] shadow-inner'
              : 'border-sky-300/80 bg-sky-50/40 hover:bg-sky-50/80 hover:border-sky-500'
          }`}
        >
          <div className="w-16 h-16 rounded-3xl bg-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-600/25">
            {isUploading ? (
              <RefreshCw className="w-8 h-8 animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              {isUploading
                ? uploadProgressMsg || 'Uploading and Parsing Invoice PDFs...'
                : 'Drag & Drop Invoice PDFs Here, or Click to Browse'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 max-w-md mx-auto">
              Supports <strong className="text-slate-800">single or bulk multi-file upload</strong>. Invoices are stored in backend folder and OCR extracts Customer, Reg #, and Spare Parts.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] uppercase font-black px-3 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
              PDF Invoices Only
            </span>
            <span className="text-[10px] uppercase font-black px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Multi-File Selection Supported
            </span>
          </div>
        </div>

        {/* Upload Success Alert */}
        {uploadSuccessAlert && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-900 font-semibold animate-fadeIn">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className="font-black text-emerald-950 block">{uploadSuccessAlert.message}</span>
              <span className="text-[11px] text-emerald-800 font-medium">
                Cashiers can now pick these invoices from their Counter POS screen to auto-fill receipts.
              </span>
            </div>
          </div>
        )}

        {/* Upload Error Alert */}
        {uploadError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-900 font-semibold animate-shake">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Delete / Action Notice Alert */}
        {actionNotice && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-900 font-semibold animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}
      </div>

      {/* Uploaded Invoices Queue Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-700" />
            <div>
              <h3 className="text-base font-black text-slate-900">Uploaded Invoices Queue</h3>
              <p className="text-[11px] text-slate-500 font-medium">Day-wise log of stored PDFs and extraction status</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({queueItems.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'pending'
                    ? 'bg-white text-amber-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'completed'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search invoice, customer, reg #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadQueue();
                }}
                className="h-9 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 w-44 sm:w-60 font-medium"
              />
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadQueue}
              disabled={isLoadingQueue}
              className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh queue list"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isLoadingQueue ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Day-Wise Grouped Invoices */}
        {isLoadingQueue ? (
          <div className="py-16 text-center text-xs text-slate-500 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-sky-600 mx-auto" />
            <p className="font-semibold">Loading uploaded invoices queue...</p>
          </div>
        ) : Object.keys(groupedQueue).length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">No invoices uploaded in this view</p>
            <p className="text-slate-400 max-w-sm mx-auto">
              Drag &amp; drop customer invoices into the upload zone above. They will automatically be recorded here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedQueue).map(([dateLabel, items]) => (
              <div key={dateLabel} className="space-y-3">
                {/* Date Header */}
                <div className="flex items-center gap-2 px-1">
                  <Clock className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    {dateLabel}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    ({items.length} {items.length === 1 ? 'file' : 'files'})
                  </span>
                  <div className="flex-1 h-px bg-slate-200 ml-2" />
                </div>

                {/* Grid of Invoice Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((item) => {
                    const isPending = item.status === 'pending';
                    const pdfUrl = (typeof ApiService.getAdvisorInvoicePdfUrl === 'function' && item?.id)
                      ? ApiService.getAdvisorInvoicePdfUrl(item.id)
                      : (item?.file_path ? `/${item.file_path}` : '#');
                    const amt = Number(item.net_amount_rupees || (item.net_amount_paise / 100) || 0);

                    return (
                      <div
                        key={item.id}
                        className="p-4 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 hover:border-sky-300 transition shadow-2xs space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono font-black text-xs text-slate-900 truncate">
                              {item.invoice_number ? `#${item.invoice_number}` : 'Invoice Stored'}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span
                                className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                                  isPending
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                {item.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item)}
                                disabled={deletingId === item.id}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition border border-transparent hover:border-rose-200 cursor-pointer disabled:opacity-50"
                                title="Delete invoice card"
                              >
                                {deletingId === item.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin text-rose-600" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{item.customer_name || 'Customer Name Detected'}</span>
                            </div>

                            {item.registration_number && (
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 mt-1">
                                <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-mono uppercase">{item.registration_number}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 font-medium block">Total Payable</span>
                            <span className="font-mono font-black text-slate-900 text-sm">
                              ₹{amt.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <a
                              href={pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition shadow-2xs"
                              title="Open raw PDF invoice"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>View PDF</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </a>

                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item)}
                              disabled={deletingId === item.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white text-xs font-bold rounded-xl border border-rose-200 hover:border-rose-600 transition shadow-2xs disabled:opacity-50 cursor-pointer"
                              title="Delete uploaded invoice PDF"
                            >
                              {deletingId === item.id ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Deleting...</span>
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvisorInvoiceUploadScreen;
