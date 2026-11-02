import React, { useState } from 'react';
import { FileSpreadsheet, Upload, AlertCircle, CheckCircle2, X, FileCheck, RefreshCw, Car, ShieldCheck } from 'lucide-react';
import ApiService from '../../services/api';
import { useToast } from '../ui';

export default function BulkImportModal({ isOpen, onClose, onImportSuccess }) {
  const { showSuccess, showError, showWarning } = useToast();

  const [csvFile, setCsvFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [validationReport, setValidationReport] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const normalizeKey = (k) => String(k || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const parseCsvText = (text) => {
    const rawLines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    if (rawLines.length === 0) return [];

    // Parse CSV line handling quotes & commas inside values
    const parseLine = (line) => {
      const fields = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (c === ',' && !inQuotes) {
          fields.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      fields.push(cur.trim());
      return fields;
    };

    const headers = parseLine(rawLines[0]).map((h) => h.replace(/^["']|["']$/g, '').trim());
    const normHeaders = headers.map(normalizeKey);

    const rows = [];
    for (let i = 1; i < rawLines.length; i++) {
      const values = parseLine(rawLines[i]).map((v) => v.replace(/^["']|["']$/g, '').trim());
      const rowObj = {};
      normHeaders.forEach((nh, idx) => {
        if (nh) rowObj[nh] = values[idx] || '';
      });
      rows.push({ rowIndex: i, raw: rowObj });
    }
    return rows;
  };

  const getField = (raw, aliases) => {
    for (const alias of aliases) {
      const key = normalizeKey(alias);
      if (raw[key] !== undefined && String(raw[key]).trim() !== '') {
        return String(raw[key]).trim();
      }
    }
    return '';
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

      const name = getField(r, ['name', 'customer_name', 'customer name', 'cust_name', 'fullname', 'party_name', 'party name', 'customer']);
      const rawPhone = getField(r, ['phone', 'phone_no', 'phone no', 'phone_number', 'phone number', 'mobile', 'mobile_no', 'mobile no', 'contact', 'contact_no', 'contact no']);
      const cleanPhone = rawPhone.replace(/[^\d+]/g, '');
      const tenDigitPhone = cleanPhone.replace(/[^\d]/g, '').slice(-10);

      const rawAadhaar = getField(r, ['adhar', 'aadhar', 'aadhaar', 'adhar_no', 'adhar no', 'aadhar_no', 'aadhar no', 'aadhaar_no', 'aadhaar no', 'adhar_number', 'aadhar_number', 'aadhaar_number', 'uid', 'uidai']);
      const cleanAadhaar = rawAadhaar.replace(/[^\d]/g, '');

      let reg = getField(r, [
        'registration_number', 'registration number', 'reg_no', 'reg no', 'registration_no', 'registration no',
        'vehicle_reg', 'vehicle reg', 'vehicle_registration', 'vehicle registration', 'vehicle_no', 'vehicle no',
        'vehicle_number', 'vehicle number', 'veh_no', 'veh no', 'rc_no', 'rc no', 'rc_number', 'plate', 'plate_no',
        'carnumber', 'car_no', 'car no', 'vehicle_details', 'vehicle details', 'vehicle'
      ]);

      const vehicleDetails = getField(r, ['vehicle_details', 'vehicle details', 'veh_details', 'car_details', 'vehicle_desc', 'vehicle']);
      const model = getField(r, ['model', 'vehicle_model', 'vehicle model', 'car_model', 'car model', 'variant']);
      const branch = getField(r, ['branch', 'branch_name', 'branch name', 'dealership_branch', 'dealership branch', 'location', 'dealership']);
      const vin = getField(r, ['vin', 'vin_no', 'vin no', 'vin_number', 'vin number', 'chassis', 'chassis_no', 'chassis no', 'chassis_number', 'chassis number']);
      const email = getField(r, ['email', 'email_id', 'email id', 'mail']);

      // If reg is empty but vehicle details has registration-like text
      if (!reg && vehicleDetails) {
        reg = vehicleDetails;
      }

      if (!name) {
        errors.push('Missing customer name');
      }

      if (!rawPhone) {
        errors.push('Missing phone number');
      } else if (tenDigitPhone.length < 10) {
        errors.push('Invalid phone format (must have 10 digits)');
      }

      if (cleanAadhaar && cleanAadhaar.length !== 12) {
        errors.push('Aadhaar must be exactly 12 digits');
      }

      const isValid = errors.length === 0;
      if (isValid) validCount++;
      else invalidCount++;

      validated.push({
        rowIndex: item.rowIndex,
        data: {
          name,
          phone: tenDigitPhone || rawPhone,
          aadhaar: cleanAadhaar || '',
          registration_number: reg.toUpperCase(),
          vehicle_details: vehicleDetails,
          model: model || (reg ? 'Tata Motors' : ''),
          branch: branch || 'Bellad Hubli',
          vin: vin.toUpperCase(),
          email,
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
        const hasVehicle = Boolean(record.registration_number || record.model || record.vin || record.branch);
        await ApiService.createCustomer({
          name: record.name,
          phone_numbers: [record.phone],
          email: record.email || undefined,
          aadhaar_number: record.aadhaar || undefined,
          ...(hasVehicle && {
            vehicle: {
              registration_number: record.registration_number || undefined,
              model: record.model || undefined,
              branch_name: record.branch || undefined,
              vin: record.vin || undefined,
              chassis_no: record.vin || undefined,
            },
          }),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/50 backdrop-blur-md animate-fadeIn overflow-hidden">
      <div className="bg-white max-w-4xl w-full rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-7 py-3.5 sm:py-5 bg-white border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight truncate">Bulk Customer CSV Import</h2>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500">
                Supports Name, Aadhaar, Phone, Vehicle Details, Model, Branch &amp; VIN
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
          {/* File Picker */}
          {!validationReport && (
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-3 bg-slate-50 hover:bg-slate-100/80 transition cursor-pointer relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="w-10 h-10 text-indigo-600 mx-auto" />
              <div>
                <span className="text-sm font-bold text-slate-800">Click to upload customer CSV spreadsheet</span>
                <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
                  Accepted headers: <span className="font-semibold text-slate-700">Name, Phone No, Aadhaar, Vehicle Reg / Vehicle Details, Model, Branch, VIN No, Email</span>.
                </p>
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
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Row</th>
                      <th className="p-2.5">Customer Name</th>
                      <th className="p-2.5">Phone No</th>
                      <th className="p-2.5">Aadhaar</th>
                      <th className="p-2.5">Vehicle Reg / Details</th>
                      <th className="p-2.5">Model</th>
                      <th className="p-2.5">Branch</th>
                      <th className="p-2.5">VIN No</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className={row.isValid ? 'bg-white hover:bg-slate-50/60' : 'bg-rose-50/60'}>
                        <td className="p-2.5 font-mono text-slate-400">#{row.rowIndex}</td>
                        <td className="p-2.5 font-bold text-slate-900">{row.data.name || '—'}</td>
                        <td className="p-2.5 font-mono text-slate-700">{row.data.phone || '—'}</td>
                        <td className="p-2.5 font-mono text-slate-600">{row.data.aadhaar ? `•••• •••• ${row.data.aadhaar.slice(-4)}` : '—'}</td>
                        <td className="p-2.5 uppercase font-mono font-bold text-indigo-700">{row.data.registration_number || '—'}</td>
                        <td className="p-2.5 text-slate-700">{row.data.model || '—'}</td>
                        <td className="p-2.5 text-slate-700">{row.data.branch || '—'}</td>
                        <td className="p-2.5 font-mono text-slate-600">{row.data.vin || '—'}</td>
                        <td className="p-2.5">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Valid
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-rose-700 font-bold text-[11px] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200"
                              title={row.errors.join(', ')}
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" /> {row.errors[0]}
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
            className="text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            Clear &amp; Reset
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleRunImport}
              disabled={loading || !validationReport || validationReport.valid === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Importing...
                </>
              ) : (
                <>
                  <FileCheck className="w-3.5 h-3.5 text-amber-300" /> Confirm &amp; Import {validationReport?.valid || 0} Customers
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
