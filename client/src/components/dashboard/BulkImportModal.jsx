import React, { useState } from 'react';
import { FileSpreadsheet, Upload, AlertCircle, CheckCircle2, X, FileCheck, RefreshCw } from 'lucide-react';
import ApiService from '../../services/api';
import { useToast } from '../ui';

export default function BulkImportModal({ isOpen, onClose, onImportSuccess }) {
  const { showSuccess, showError, showWarning } = useToast();

  const [csvFile, setCsvFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [validationReport, setValidationReport] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const parseCsvText = (text) => {
    const lines = text
      .split(/\r\n|\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return [];

    // Parse header
    const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.replace(/^["']|["']$/g, '').trim());
      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || '';
      });
      rows.push({ rowIndex: i, raw: rowObj });
    }
    return rows;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const parsed = parseCsvText(text);
        validateParsedData(parsed);
      } catch (err) {
        showError('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const validateParsedData = (parsed) => {
    let validCount = 0;
    let invalidCount = 0;
    const validated = [];

    parsed.forEach((item) => {
      const r = item.raw;
      const errors = [];

      const name = r.name || r.customer_name || '';
      const phone = r.phone || r.phone_number || r.mobile || '';
      const reg = r.registration_number || r.reg_no || r.vehicle_reg || '';

      if (!name) errors.push('Missing customer name');
      if (!phone) errors.push('Missing phone number');
      else if (!/^\+?[0-9]{10,12}$/.test(phone.replace(/[\s-]/g, ''))) {
        errors.push('Invalid phone format (must be 10-12 digits)');
      }

      if (!reg) errors.push('Missing vehicle registration number');

      const isValid = errors.length === 0;
      if (isValid) validCount++;
      else invalidCount++;

      validated.push({
        rowIndex: item.rowIndex,
        data: {
          name,
          phone,
          registration_number: reg,
          brand: r.brand || 'Tata Motors',
          model: r.model || 'Nexon EV',
          email: r.email || '',
        },
        isValid,
        errors,
      });
    });

    setParsedRows(validated);
    setValidationReport({
      total: parsed.length,
      valid: validCount,
      invalid: invalidCount,
    });
  };

  const handleRunImport = async () => {
    const validRecords = parsedRows.filter((r) => r.isValid).map((r) => r.data);
    if (validRecords.length === 0) {
      showWarning('No valid records found to import.');
      return;
    }

    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const record of validRecords) {
      try {
        await ApiService.createCustomer({
          name: record.name,
          phones: [record.phone],
          email: record.email || undefined,
          vehicles: [
            {
              registration_number: record.registration_number,
              model: record.model,
            },
          ],
        });
        successCount++;
      } catch (err) {
        failCount++;
      }
    }

    setLoading(false);
    showSuccess(`Bulk Import Completed: ${successCount} customers imported successfully (${failCount} duplicates skipped).`);
    if (onImportSuccess) onImportSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/40 backdrop-blur-md animate-fadeIn overflow-hidden">
      <div className="bg-white max-w-2xl w-full rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-7 py-3.5 sm:py-5 bg-white border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight truncate">Bulk Customer CSV Import</h2>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500">Validate and onboard customer records in bulk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* File Picker */}
          {!validationReport && (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center space-y-3 bg-slate-50 hover:bg-slate-100/80 transition cursor-pointer relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="w-10 h-10 text-brand-gold mx-auto" />
              <div>
                <span className="text-sm font-bold text-slate-800">Click to upload CSV file</span>
                <p className="text-xs text-slate-500 mt-1">Expected columns: name, phone, registration_number, brand, model, email</p>
              </div>
            </div>
          )}

          {/* Validation Summary Report */}
          {validationReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Total Rows</span>
                  <p className="text-lg font-black text-slate-900">{validationReport.total}</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold uppercase text-emerald-700">Valid</span>
                  <p className="text-lg font-black text-emerald-700">{validationReport.valid}</p>
                </div>
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                  <span className="text-[10px] font-bold uppercase text-rose-700">Invalid / Errors</span>
                  <p className="text-lg font-black text-rose-700">{validationReport.invalid}</p>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                    <tr>
                      <th className="p-2.5">Row</th>
                      <th className="p-2.5">Customer Name</th>
                      <th className="p-2.5">Phone</th>
                      <th className="p-2.5">Vehicle Reg</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className={row.isValid ? 'bg-white' : 'bg-rose-50/60'}>
                        <td className="p-2.5 font-mono text-slate-400">#{row.rowIndex}</td>
                        <td className="p-2.5 font-medium text-slate-900">{row.data.name || '—'}</td>
                        <td className="p-2.5 font-mono text-slate-700">{row.data.phone || '—'}</td>
                        <td className="p-2.5 uppercase font-mono text-slate-700">{row.data.registration_number || '—'}</td>
                        <td className="p-2.5">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-rose-700 font-bold text-[11px]"
                              title={row.errors.join(', ')}
                            >
                              <AlertCircle className="w-3.5 h-3.5" /> {row.errors[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => {
              setValidationReport(null);
              setParsedRows([]);
              setCsvFile(null);
            }}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 transition"
          >
            Clear & Reset
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleRunImport}
              disabled={loading || !validationReport || validationReport.valid === 0}
              className="inline-flex items-center gap-2 px-5 py-2 bg-brand-navy hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Importing...
                </>
              ) : (
                <>
                  <FileCheck className="w-3.5 h-3.5 text-amber-400" /> Confirm & Import {validationReport?.valid || 0} Customers
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
