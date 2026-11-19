import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  X,
  FileCheck,
  RefreshCw,
  ShieldCheck,
  Layers,
  Calendar,
  AlertTriangle,
  AlertCircle,
  Download,
  Check,
  HelpCircle
} from 'lucide-react';
import ApiService from '../../services/api';
import { useToast } from '../ui';

export default function BulkImportModal({ isOpen, onClose, onImportSuccess }) {
  const { showSuccess, showError, showWarning } = useToast();

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inspecting, setInspecting] = useState(false);

  // Order form workbook state
  const [inspectionData, setInspectionData] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [allowHistorical, setAllowHistorical] = useState(true);
  const [updateAadhaarOnly, setUpdateAadhaarOnly] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [showErrorTable, setShowErrorTable] = useState(true);

  if (!isOpen) return null;

  // Handle Order Form File Selection & Auto-Inspection
  const handleOrderFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportSummary(null);
    setInspecting(true);

    try {
      const res = await ApiService.inspectWorkbook(selectedFile);
      setInspectionData(res);
      const chosen = res.recommendedSheet || res.sheetNames?.[0] || '';
      setSelectedSheet(chosen);
      showSuccess(`Workbook scanned: Found ${res.totalSheets || 1} sheet(s). Auto-detected '${chosen}'.`);
    } catch (err) {
      showError('Failed to inspect workbook: ' + (err.message || 'Unknown error'));
      setInspectionData(null);
    } finally {
      setInspecting(false);
    }
  };

  // Run Order Form Bulk Import
  const handleRunOrderImport = async () => {
    if (!file) {
      showWarning('Please select an Excel or CSV file first.');
      return;
    }

    setLoading(true);
    setImportSummary(null);

    try {
      const res = await ApiService.importOrderWorkbook(file, {
        sheetName: selectedSheet,
        allowHistorical,
        customCutoffDate: '2020-01-01',
        updateAadhaarOnly,
      });

      setImportSummary(res.summary);
      if (updateAadhaarOnly) {
        if (res.summary.imported > 0) {
          showSuccess(`Aadhaar sync complete: ${res.summary.imported} customer Aadhaar numbers updated! (Zero points / zero duplicate transactions)`);
        } else {
          showWarning(`Aadhaar sync finished: 0 updated, ${res.summary.skipped} skipped.`);
        }
      } else {
        if (res.summary.imported > 0) {
          showSuccess(`Import complete: ${res.summary.imported} sales imported with ${res.summary.totalPointsCredited?.toLocaleString()} points awarded!`);
        } else {
          showWarning(`Import finished: 0 imported, ${res.summary.skipped} skipped. Check the missing fields error report.`);
        }
      }
      if (onImportSuccess) onImportSuccess(res.summary);
    } catch (err) {
      showError('Import failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setInspectionData(null);
    setSelectedSheet('');
    setImportSummary(null);
  };

  // Export skipped rows / errors to CSV for easy spreadsheet correction
  const handleDownloadErrorReport = () => {
    if (!importSummary?.errors || importSummary.errors.length === 0) return;

    const headers = ['Excel Row', 'Order ID', 'Customer Name', 'Phone Number', 'Missing Fields', 'Full Error Message'];
    const rows = importSummary.errors.map(err => [
      err.row || '',
      `"${String(err.orderId || '').replace(/"/g, '""')}"`,
      `"${String(err.customerName || '').replace(/"/g, '""')}"`,
      `"${String(err.phone || '').replace(/"/g, '""')}"`,
      `"${(err.missingFields || []).join('; ').replace(/"/g, '""')}"`,
      `"${String(err.error || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Import_Missing_Fields_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentSheetInfo = inspectionData?.sheets?.find(s => s.sheetName === selectedSheet);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Order Form Importer &amp; Validation</h3>
              <p className="text-xs text-slate-500 font-medium">
                Mandatory field validation, scientific notation protection, and loyalty credit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200/70 flex items-center justify-center text-slate-500 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Mandatory Fields Requirements Banner */}
          <div className="p-4 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl">
            <div className="flex items-center gap-2 font-bold text-indigo-950 text-xs mb-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              6 Mandatory Fields Required For Every Row:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-indigo-100 font-semibold text-slate-800">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>1. Customer Name</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-indigo-100 font-semibold text-slate-800">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>2. Phone No (10 digits)</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-indigo-100 font-semibold text-slate-800">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>3. Vehicle (VIN/Reg/Model)</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-indigo-100 font-semibold text-slate-800">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>4. Purchase Date</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-indigo-100 font-semibold text-slate-800">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>5. Aadhaar No (12 digits)</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-indigo-100 font-semibold text-slate-800">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>6. Ex-Showroom Price</span>
              </div>
            </div>
            <p className="text-[11px] text-indigo-900 mt-2 font-medium">
              Rows missing any of these 6 fields will be safely skipped, and the exact missed fields will be reported row-by-row.
            </p>
          </div>

          {/* Aadhaar Format & Scientific Notation Warning Banner */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <span className="font-bold">Aadhaar Card "0000" Prevention Notice:</span>
              <p>
                When exporting Excel sheets to CSV, 12-digit Aadhaar numbers get converted into scientific notation (e.g. <code>2.38096E+11</code>), which strips the last 6 digits into <code>000000</code>.
              </p>
              <p className="font-semibold text-amber-950">
                💡 Best Practice: Upload your original <code>.xlsx</code> file directly, or format the Aadhaar column as "Plain Text" in Excel before saving.
              </p>
            </div>
          </div>

          {/* File Upload Zone */}
          {!inspectionData && !importSummary && (
            <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/20 hover:bg-indigo-50/40 rounded-2xl p-8 text-center transition">
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                {inspecting ? <RefreshCw className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
              </div>
              <h4 className="font-bold text-slate-800 text-base mb-1">
                {inspecting ? 'Analyzing Excel workbook tabs & columns...' : 'Upload Order Form Excel or CSV File'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                Supports <code>.xlsx</code> (preferred), <code>.xls</code>, or <code>.csv</code>.
                Multi-tab workbooks are supported — unwanted sheets and extra columns will be automatically ignored without errors.
              </p>
              <label className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md shadow-indigo-100 transition">
                <FileSpreadsheet className="w-4 h-4" />
                Select Order Form File (.xlsx / .csv)
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleOrderFileUpload}
                  className="hidden"
                  disabled={inspecting}
                />
              </label>
            </div>
          )}

          {/* Inspection & Configuration View */}
          {inspectionData && !importSummary && (
            <div className="space-y-5">
              {/* Workbook Info Banner */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{inspectionData.filename}</div>
                    <div className="text-xs text-slate-500">
                      {(inspectionData.filesize / (1024 * 1024)).toFixed(2)} MB • {inspectionData.totalSheets} sheet(s) detected
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold px-3 py-1.5 bg-slate-200/70 rounded-lg cursor-pointer transition"
                >
                  Change File
                </button>
              </div>

              {/* Sheet Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Select Worksheet Tab to Import:
                </label>
                <div className="flex flex-wrap gap-2">
                  {inspectionData.sheets.map((s) => {
                    const isSelected = selectedSheet === s.sheetName;
                    return (
                      <button
                        key={s.sheetName}
                        type="button"
                        onClick={() => setSelectedSheet(s.sheetName)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>{s.sheetName}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                            isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {s.rowCount?.toLocaleString()} rows
                        </span>
                        {s.isRecommended && (
                          <span className={`text-[10px] px-1 py-0.5 rounded ${isSelected ? 'bg-amber-400 text-amber-950' : 'bg-amber-100 text-amber-800'}`}>
                            Auto-Matched
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sheet Scientific Notation Warning if Detected */}
              {currentSheetInfo?.hasScientificAadhaar && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-900 space-y-1">
                    <span className="font-bold">Caution: Corrupted Aadhaar Scientific Notation Detected in this sheet!</span>
                    <p>
                      Sample rows in <code>{selectedSheet}</code> contain numbers formatted like <code>2.38E+11</code> or ending in <code>00000</code>.
                      These rows will fail mandatory Aadhaar validation during import.
                    </p>
                    <p className="font-semibold text-rose-950">
                      Please upload the original <code>.xlsx</code> file directly where numbers are not truncated.
                    </p>
                  </div>
                </div>
              )}

              {/* Import Mode Selector: Normal vs Aadhaar-Only Sync */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2.5">
                <div className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Select Import Action Mode
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${!updateAadhaarOnly ? 'bg-white border-indigo-600 ring-2 ring-indigo-600/20 shadow-xs' : 'bg-slate-50 border-slate-200 hover:bg-white'}`}>
                    <input
                      type="radio"
                      name="importMode"
                      checked={!updateAadhaarOnly}
                      onChange={() => setUpdateAadhaarOnly(false)}
                      className="mt-0.5 text-indigo-600 cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900">Normal Order Import</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Creates new customers, vehicles &amp; credits loyalty points.
                      </div>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${updateAadhaarOnly ? 'bg-white border-indigo-600 ring-2 ring-indigo-600/20 shadow-xs' : 'bg-slate-50 border-slate-200 hover:bg-white'}`}>
                    <input
                      type="radio"
                      name="importMode"
                      checked={updateAadhaarOnly}
                      onChange={() => setUpdateAadhaarOnly(true)}
                      className="mt-0.5 text-indigo-600 cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                        <span>⚡ Update Aadhaar Only</span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-mono font-bold">Safe Mode</span>
                      </div>
                      <div className="text-[11px] text-indigo-900 mt-0.5 leading-relaxed">
                        Safely updates customer Aadhaar numbers ONLY. Zero new points, zero duplicate ledger entries.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Historical Sync Options */}
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-amber-950">Past 3 Years Historical Backfill (2020 – 2026)</div>
                    <div className="text-[11px] text-amber-700">
                      Bypasses the standard 2026-04-01 cutoff so older vehicle sales and loyalty balances are correctly created and credited.
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-amber-950">
                  <input
                    type="checkbox"
                    checked={allowHistorical}
                    onChange={(e) => setAllowHistorical(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  />
                  Enable Backfill
                </label>
              </div>
            </div>
          )}

          {/* Import Result Summary View */}
          {importSummary && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-base mb-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Order Form Import Completed
                </div>
                <p className="text-xs text-emerald-700">
                  Processed tab <code>{importSummary.sheetName}</code> with mandatory field validation.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Rows Processed</div>
                    <div className="text-lg font-black text-slate-900">{importSummary.processed?.toLocaleString()}</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                    <div className="text-[10px] text-emerald-600 font-bold uppercase">Valid &amp; Imported</div>
                    <div className="text-lg font-black text-emerald-600">{importSummary.imported?.toLocaleString()}</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                    <div className="text-[10px] text-indigo-600 font-bold uppercase">Points Credited</div>
                    <div className="text-lg font-black text-indigo-600">+{importSummary.totalPointsCredited?.toLocaleString()} PTS</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                    <div className="text-[10px] text-amber-600 font-bold uppercase">Skipped / Missed Fields</div>
                    <div className="text-lg font-black text-amber-600">{importSummary.skipped?.toLocaleString()}</div>
                  </div>
                </div>

                {/* Skipped reasons breakdown */}
                {importSummary.skippedReasons && Object.keys(importSummary.skippedReasons).length > 0 && (
                  <div className="mt-4 pt-3 border-t border-emerald-200/60 text-xs">
                    <span className="font-bold text-slate-700 block mb-1.5">Reason breakdown:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(importSummary.skippedReasons).map(([reason, count]) => (
                        <span key={reason} className="inline-flex items-center gap-1 bg-white text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px]">
                          <span>{reason}:</span>
                          <strong className="text-slate-900 font-bold">{count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Detailed Missing Fields Table */}
              {importSummary.errors && importSummary.errors.length > 0 && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span className="font-bold text-slate-900 text-xs">
                        Missing Mandatory Fields Report ({importSummary.errors.length} rows reported)
                      </span>
                    </div>
                    <button
                      onClick={handleDownloadErrorReport}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-lg cursor-pointer transition shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      Download Error Log (.csv)
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider sticky top-0">
                        <tr>
                          <th className="py-2 px-3 font-bold">Row #</th>
                          <th className="py-2 px-3 font-bold">Customer Name</th>
                          <th className="py-2 px-3 font-bold">Phone</th>
                          <th className="py-2 px-3 font-bold">Missing Field(s)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importSummary.errors.slice(0, 100).map((err, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition">
                            <td className="py-2 px-3 font-mono font-bold text-slate-800">{err.row}</td>
                            <td className="py-2 px-3 font-medium text-slate-900">{err.customerName || 'Unknown'}</td>
                            <td className="py-2 px-3 font-mono text-slate-600">{err.phone || 'N/A'}</td>
                            <td className="py-2 px-3">
                              <div className="flex flex-wrap gap-1">
                                {(err.missingFields || [err.error]).map((mf, mIdx) => (
                                  <span
                                    key={mIdx}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100"
                                  >
                                    {mf}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importSummary.errors.length > 100 && (
                    <p className="text-[11px] text-slate-500 italic text-center">
                      Showing first 100 errors. Click "Download Error Log (.csv)" above to export all {importSummary.errors.length} failed rows.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            Clear &amp; Reset
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Close
            </button>

            {inspectionData && !importSummary && (
              <button
                onClick={handleRunOrderImport}
                disabled={loading || !selectedSheet}
                className={`inline-flex items-center gap-2 px-5 py-2.5 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer ${
                  updateAadhaarOnly ? 'bg-indigo-700 hover:bg-indigo-800' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />{' '}
                    {updateAadhaarOnly ? 'Updating Customer Aadhaar Numbers...' : 'Processing Orders & Points...'}
                  </>
                ) : (
                  <>
                    <FileCheck className="w-3.5 h-3.5 text-amber-300" />{' '}
                    {updateAadhaarOnly ? 'Sync & Update Customer Aadhaar Only' : `Start Order Import (${selectedSheet})`}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
