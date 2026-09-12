import React, { useState } from 'react';
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  Upload,
  Calculator,
  Receipt,
  CreditCard,
  Sparkles,
  Eye,
} from 'lucide-react';
import ApiService from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';

export const RaiseCorrectionModal = ({
  isOpen,
  initialReference = '',
  initialCustomerId = '',
  onClose,
  onSuccess,
}) => {
  const [reference, setReference] = useState(initialReference);
  const [wrongAmount, setWrongAmount] = useState('');
  const [correctAmount, setCorrectAmount] = useState('');
  const [explanation, setExplanation] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  if (!isOpen) return null;

  const handlePreview = async () => {
    if (!reference.trim()) {
      setPreviewError('Please enter a Transaction Reference (Receipt No or Reference ID).');
      return;
    }
    if (!correctAmount || parseFloat(correctAmount) <= 0) {
      setPreviewError('Please enter a valid positive Correct Bill Amount.');
      return;
    }

    setPreviewLoading(true);
    setPreviewError('');
    setPreviewData(null);
    try {
      const res = await ApiService.previewCorrection({
        points_ledger_reference: reference.trim(),
        correct_bill_amount: parseFloat(correctAmount),
      });
      setPreviewData(res.data);
    } catch (err) {
      setPreviewError(err.message || 'Failed to fetch correction preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!reference.trim()) {
      setError('Transaction Reference is required.');
      return;
    }
    if (!wrongAmount || parseFloat(wrongAmount) <= 0) {
      setError('Please enter the original wrong bill amount.');
      return;
    }
    if (!correctAmount || parseFloat(correctAmount) <= 0) {
      setError('Please enter the intended correct bill amount.');
      return;
    }
    if (!explanation || explanation.trim().length < 20) {
      setError('Mandatory explanation must be at least 20 characters long.');
      return;
    }
    if (!selectedFile) {
      setError('A mandatory screenshot proof file must be uploaded.');
      return;
    }

    const formData = new FormData();
    formData.append('points_ledger_reference', reference.trim());
    formData.append('wrong_bill_amount', wrongAmount);
    formData.append('correct_bill_amount', correctAmount);
    formData.append('explanation', explanation.trim());
    formData.append('screenshot', selectedFile);
    if (initialCustomerId) {
      formData.append('customer_id', initialCustomerId);
    }

    setIsLoading(true);
    try {
      const res = await ApiService.raiseCorrection(formData);
      setSuccessResult(res);
      if (onSuccess) onSuccess(res);
    } catch (err) {
      setError(err.message || 'Failed to submit correction request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleResetAndClose = () => {
    setReference(initialReference);
    setWrongAmount('');
    setCorrectAmount('');
    setExplanation('');
    setSelectedFile(null);
    setPreviewData(null);
    setPreviewError('');
    setError('');
    setSuccessResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white border-2 border-surface-border rounded-xl shadow-2xl max-h-[94vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-600" />
            <h3 className="text-xl font-bold text-slate-900">
              Raise Transaction Billing Correction Request
            </h3>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            disabled={isLoading}
            className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-4 bg-rose-50 border-2 border-rose-300 rounded-lg flex items-start gap-2.5 text-rose-800 font-bold text-base">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Screen */}
          {successResult ? (
            <div className="space-y-6 text-center animate-fadeIn py-4">
              <div className="mx-auto inline-flex items-center justify-center p-4 bg-emerald-100 border-2 border-emerald-500 rounded-full shadow-md">
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900">
                Correction Ticket Submitted!
              </h3>
              <p className="text-base font-semibold text-slate-600 max-w-md mx-auto">
                {successResult.message || 'Your ticket has been queued for admin review and approval.'}
              </p>

              {successResult.data?.high_frequency_warning && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs font-bold">
                  {successResult.data.high_frequency_warning}
                </div>
              )}

              <div className="flex justify-center pt-4">
                <Button variant="primary" size="lg" onClick={handleResetAndClose} className="font-bold px-8">
                  Done & Close
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-900 leading-relaxed">
                ℹ️ <strong>Append-Only Integrity Notice:</strong> Points ledger entries are never modified or deleted. Approving this request will automatically generate exact <strong>REVERSAL</strong> entries for the wrong transaction and <strong>CORRECTED</strong> entries for the right amount.
              </div>

              {/* Form Input Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Receipt No / Reference ID / Vehicle Reg No"
                    placeholder="e.g. KA 25 MP 2009, BAC-100008, or REC-2026-9901"
                    icon={Receipt}
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    required
                  />
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    Accepts Vehicle Reg No (e.g. KA 25 MP 2009), Customer ID, or Receipt No.
                  </p>
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="Wrong Bill Amount Recorded (₹)"
                      type="number"
                      placeholder="e.g. 2000"
                      icon={CreditCard}
                      value={wrongAmount}
                      onChange={(e) => setWrongAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Input
                  label="Correct Bill Amount Intended (₹)"
                  type="number"
                  placeholder="e.g. 1200"
                  icon={CreditCard}
                  value={correctAmount}
                  onChange={(e) => setCorrectAmount(e.target.value)}
                  required
                />

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreview}
                    disabled={previewLoading || !reference || !correctAmount}
                    className="w-full h-11 flex items-center justify-center gap-2 font-bold border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                  >
                    {previewLoading ? 'Calculating…' : (
                      <>
                        <Eye className="w-4 h-4" /> Preview Correction Math
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Live Preview Card */}
              {previewError && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs font-bold text-amber-900">
                  {previewError}
                </div>
              )}

              {previewData && previewData.calculation_breakup && (
                <div className="p-4 bg-slate-900 text-white rounded-xl border-2 border-slate-700 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2 text-xs font-extrabold uppercase text-emerald-400">
                    <span className="flex items-center gap-1.5"><Calculator className="w-4 h-4" /> Preview Impact Breakdown</span>
                    <span>Customer: {previewData.customer_id}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 bg-slate-800 rounded border border-slate-700">
                      <div className="text-slate-400 font-semibold uppercase">Original Net Pts</div>
                      <div className="text-base font-mono font-bold text-rose-400">
                        {previewData.calculation_breakup.original_net_points > 0 ? `+${previewData.calculation_breakup.original_net_points}` : previewData.calculation_breakup.original_net_points}
                      </div>
                    </div>

                    <div className="p-2 bg-slate-800 rounded border border-slate-700">
                      <div className="text-slate-400 font-semibold uppercase">Corrected Net Pts</div>
                      <div className="text-base font-mono font-bold text-emerald-400">
                        {previewData.calculation_breakup.corrected_net_points > 0 ? `+${previewData.calculation_breakup.corrected_net_points}` : previewData.calculation_breakup.corrected_net_points}
                      </div>
                    </div>

                    <div className="p-2 bg-slate-800 rounded border border-slate-700">
                      <div className="text-slate-400 font-semibold uppercase">Correct Cash Paid</div>
                      <div className="text-base font-extrabold text-sky-400">
                        ₹{previewData.calculation_breakup.cash_paid.toLocaleString()}
                      </div>
                    </div>

                    <div className="p-2 bg-slate-800 rounded border border-slate-700">
                      <div className="text-slate-400 font-semibold uppercase">Net Balance Adj.</div>
                      <div className="text-base font-mono font-bold text-amber-400">
                        {previewData.calculation_breakup.net_balance_adjustment > 0 ? `+${previewData.calculation_breakup.net_balance_adjustment}` : previewData.calculation_breakup.net_balance_adjustment} PTS
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Explanation Field (Mandatory min 20 chars) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-bold text-slate-800">
                    Mandatory Explanation & Mistake Details <span className="text-rose-600">*</span>
                  </label>
                  <span className={`text-xs font-bold ${explanation.trim().length >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {explanation.trim().length} / 20 min chars
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Explain exactly how the mistake happened (e.g. Entered ₹2000 instead of ₹1200 due to keying error on service bill)..."
                  className="w-full p-3 border-2 border-slate-300 rounded-lg text-sm focus:border-indigo-600 focus:outline-none font-medium"
                  required
                />
                {explanation.trim().length > 0 && explanation.trim().length < 20 && (
                  <p className="text-xs text-amber-700 font-semibold mt-1">
                    ⚠️ Minimum 20 characters required. Please type a brief sentence explaining the mistake.
                  </p>
                )}
              </div>

              {/* Mandatory File Upload */}
              <div>
                <label className="text-sm font-bold text-slate-800 block mb-1.5">
                  Mandatory Screenshot / Receipt Proof Upload <span className="text-rose-600">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Upload className="w-5 h-5 text-slate-500" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {selectedFile ? selectedFile.name : 'Select Screenshot File (JPEG, PNG, WEBP, PDF)'}
                      </div>
                      <div className="text-[11px] text-slate-500">Max file size: 10MB</div>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="text-xs font-bold text-indigo-600 cursor-pointer file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="outline" size="lg" onClick={handleResetAndClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isLoading || !reference || !wrongAmount || !correctAmount || explanation.trim().length < 20 || !selectedFile}
                  className="font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isLoading ? 'Submitting Ticket…' : 'Submit Correction Ticket →'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RaiseCorrectionModal;
