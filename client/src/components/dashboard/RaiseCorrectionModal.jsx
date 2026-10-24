import React, { useState } from 'react';
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  Upload,
  Receipt,
  CreditCard,
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

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  if (!isOpen) return null;

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
    if (!explanation || !explanation.trim()) {
      setError('Explanation is required.');
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
              {/* Form Input Fields with Clean Alignment */}
              <div className="space-y-4">
                <Input
                  label="Receipt No / Reference ID / Vehicle Reg No"
                  placeholder="e.g. KA 25 MP 2009, BAC-100008, or Receipt No"
                  icon={Receipt}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Wrong Bill Amount (₹)"
                    type="number"
                    placeholder="e.g. 2000"
                    icon={CreditCard}
                    value={wrongAmount}
                    onChange={(e) => setWrongAmount(e.target.value)}
                    required
                  />

                  <Input
                    label="Correct Bill Amount (₹)"
                    type="number"
                    placeholder="e.g. 1200"
                    icon={CreditCard}
                    value={correctAmount}
                    onChange={(e) => setCorrectAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Explanation Field (Mandatory - No Character Limit) */}
              <div>
                <label className="text-sm font-bold text-slate-800 block mb-1.5">
                  Explanation &amp; Reason <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Enter explanation for billing correction..."
                  className="w-full p-3 border-2 border-slate-300 rounded-lg text-sm focus:border-indigo-600 focus:outline-none font-medium"
                  required
                />
              </div>

              {/* Proof File Upload */}
              <div>
                <label className="text-sm font-bold text-slate-800 block mb-1.5">
                  Screenshot / Receipt Proof <span className="text-rose-600">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-3.5 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between">
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
                  disabled={isLoading || !reference || !wrongAmount || !correctAmount || !explanation.trim() || !selectedFile}
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
