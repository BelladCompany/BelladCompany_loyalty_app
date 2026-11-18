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
  const [importSummary, setImportSummary] = useState(null);

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
      setSelectedSheet(res.recommendedSheet || res.sheetNames?.[0] || '');
      showSuccess(`Workbook scanned: Found ${res.totalSheets || 1} sheet(s). Auto-detected '${res.recommendedSheet || res.sheetNames?.[0]}'.`);
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
      });

      setImportSummary(res.summary);
      showSuccess(`Import complete: ${res.summary.imported} sales imported with ${res.summary.totalPointsCredited?.toLocaleString()} points awarded!`);
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
              <h3 className="font-bold text-slate-900 text-lg">Order Form Importer &amp; Historical Sync</h3>
              <p className="text-xs text-slate-500 font-medium">
                Import Order Form vehicle sales with automatic discount deductions and loyalty points
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

        {/* Body Content - Single Direct Upload */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
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
                Supports <code>.xlsx</code>, <code>.xls</code>, or <code>.csv</code> containing 3-year historical order form data.
                Multi-tab workbooks are supported — unwanted sheets and junk columns will be automatically ignored without errors.
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

              {/* Safety Guardrails Card */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-900 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Automatic Protection &amp; Safe Field Extraction:
                </div>
                <ul className="text-xs text-emerald-800 space-y-1 pl-5 list-disc">
                  <li>
                    <strong>Unwanted Tabs Filter:</strong> Only tab <code>'{selectedSheet}'</code> will be processed. Other sheets are completely ignored and will not cause crashes.
                  </li>
                  <li>
                    <strong>Smart Field Mapping:</strong> Automatically extracts Customer Details, VIN/Model, Gross Ex-Showroom, Discounts (Dealer, EMPS, OEM), DMS Invoice Date, and PR Status.
                  </li>
                  <li>
                    <strong>Safe Junk Skipping:</strong> All auxiliary columns (photos, PDF links, signatures, internal timestamps) are safely disregarded.
                  </li>
                </ul>
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
                  Order Form Import Successfully Completed!
                </div>
                <p className="text-xs text-emerald-700">
                  Processed tab <code>{importSummary.sheetName}</code> without crashes or database lockups.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Rows Processed</div>
                    <div className="text-lg font-black text-slate-900">{importSummary.processed?.toLocaleString()}</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                    <div className="text-[10px] text-emerald-600 font-bold uppercase">Sales Imported</div>
                    <div className="text-lg font-black text-emerald-600">{importSummary.imported?.toLocaleString()}</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                    <div className="text-[10px] text-indigo-600 font-bold uppercase">Points Credited</div>
                    <div className="text-lg font-black text-indigo-600">+{importSummary.totalPointsCredited?.toLocaleString()} PTS</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Skipped Non-PR / Empty</div>
                    <div className="text-lg font-black text-slate-600">{importSummary.skipped?.toLocaleString()}</div>
                  </div>
                </div>

                {importSummary.skippedReasons && Object.keys(importSummary.skippedReasons).length > 0 && (
                  <div className="mt-4 pt-3 border-t border-emerald-200/60 text-xs">
                    <span className="font-bold text-slate-700">Skipped breakdown: </span>
                    {Object.entries(importSummary.skippedReasons).map(([reason, count]) => (
                      <span key={reason} className="inline-block bg-white text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 mr-2 mt-1">
                        {reason}: <strong>{count}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
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
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing Orders &amp; Points...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-3.5 h-3.5 text-amber-300" /> Start Order Import ({selectedSheet})
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
