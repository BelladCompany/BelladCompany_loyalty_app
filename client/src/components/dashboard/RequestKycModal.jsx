import React, { useState, useEffect } from 'react';
import { ShieldCheck, Upload, AlertCircle, Phone, FileText, Lock, X, RefreshCw, Send, CheckCircle2 } from 'lucide-react';
import ApiService from '../../services/api';
import { useToast } from '../ui';

export default function RequestKycModal({ isOpen, onClose, customer, onSuccess }) {
  const { showSuccess, showError, showInfo } = useToast();

  const [selectedCustomerId, setSelectedCustomerId] = useState(customer?.customer_id || '');
  const [currentPhone, setCurrentPhone] = useState('');
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');
  const [idProofType, setIdProofType] = useState('Aadhaar Card');
  const [idProofFile, setIdProofFile] = useState(null);
  const [otp, setOtp] = useState('');

  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Customer search fallback if no customer is passed
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (customer) {
      setSelectedCustomerId(customer.customer_id);
      const mainPhone = (customer.phones && customer.phones[0])
        ? (customer.phones[0].phone_number || customer.phones[0])
        : customer.phone_number || '';
      setCurrentPhone(mainPhone);
    }
  }, [customer]);

  if (!isOpen) return null;

  const handleSearchCustomer = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setErrorMessage('');
    try {
      const res = await ApiService.search(searchQuery.trim());
      setSearchResults(res.data || []);
      if ((res.data || []).length === 0) {
        showInfo('No customer found matching query.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Customer lookup failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCustomer = (cust) => {
    setSelectedCustomerId(cust.customer_id);
    const mainPhone = (cust.phones && cust.phones[0])
      ? (cust.phones[0].phone_number || cust.phones[0])
      : cust.phone_number || '';
    setCurrentPhone(mainPhone);
    setSearchResults([]);
  };

  const handleRequestOtp = async () => {
    if (!currentPhone) {
      setErrorMessage('Current phone number could not be resolved.');
      return;
    }
    setSendingOtp(true);
    setErrorMessage('');
    try {
      await ApiService.requestOtp(currentPhone);
      setOtpSent(true);
      showSuccess(`Verification OTP sent to customer's current phone (+91 ${currentPhone}).`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to send OTP to current phone number.');
      showError(err.message || 'OTP delivery failed.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedCustomerId) {
      setErrorMessage('Please select a customer.');
      return;
    }
    if (!newValue || !/^\+?[0-9]{10,12}$/.test(newValue.replace(/[\s-]/g, ''))) {
      setErrorMessage('Please enter a valid 10-digit new mobile number.');
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('Reason for phone change is mandatory.');
      return;
    }
    if (!otp.trim()) {
      setErrorMessage('Please enter the 6-digit OTP code sent to the current phone.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('change_type', 'phone_update');
      formData.append('new_value', newValue.trim());
      formData.append('reason', reason.trim());
      formData.append('id_proof_type', idProofType);
      formData.append('otp', otp.trim());

      if (idProofFile) {
        formData.append('id_proof_file', idProofFile);
      }

      const res = await ApiService.submitKycChange(selectedCustomerId, formData);
      showSuccess(res.message || 'KYC change request submitted successfully and queued for approval.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit KYC change request.');
      showError(err.message || 'KYC submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white max-w-xl w-full rounded-2xl shadow-2xl border border-surface-border overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Request KYC Phone Number Update</h2>
              <p className="text-xs text-slate-400">Submit phone change request with OTP & ID proof</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-center gap-2.5 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Customer Selection Step if no customer pre-selected */}
          {!customer && !selectedCustomerId && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 uppercase">Step 1: Select Customer</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search customer phone, name, or VIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                />
                <button
                  type="button"
                  onClick={handleSearchCustomer}
                  disabled={isSearching}
                  className="px-4 py-2 bg-brand-navy text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden bg-white max-h-36 overflow-y-auto">
                  {searchResults.map((cust) => (
                    <div
                      key={cust.customer_id}
                      onClick={() => handleSelectCustomer(cust)}
                      className="p-2.5 hover:bg-slate-100 cursor-pointer flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-slate-900">{cust.name} ({cust.customer_id})</span>
                      <span className="font-mono text-slate-600">{(cust.phones && cust.phones[0]) ? (cust.phones[0].phone_number || cust.phones[0]) : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pre-selected Customer Info Banner */}
          {selectedCustomerId && (
            <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Selected Customer</span>
                <span className="font-bold text-slate-900">{customer?.name || selectedCustomerId} ({selectedCustomerId})</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase">Current Phone</span>
                <span className="font-mono font-bold text-slate-800">{currentPhone || '—'}</span>
              </div>
            </div>
          )}

          {/* Step 2: OTP Verification on Current Phone */}
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-600" /> Mandatory Security OTP Verification
              </span>
              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={sendingOtp || !currentPhone}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
              >
                {sendingOtp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {otpSent ? 'Resend OTP' : 'Send OTP to Current Phone'}
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Enter 6-Digit OTP Code</label>
              <input
                type="text"
                maxLength={6}
                placeholder="e.g. 123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full text-sm font-mono font-bold tracking-widest p-2.5 rounded-lg border border-amber-300 bg-white focus:ring-2 focus:ring-amber-500 text-slate-900"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">OTP is sent to customer's current registered mobile number (+91 {currentPhone}).</p>
            </div>
          </div>

          {/* Step 3: New Phone Details & Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Mobile Number</label>
              <input
                type="text"
                placeholder="e.g. 9983600795"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white font-mono font-bold text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ID Proof Type</label>
              <select
                value={idProofType}
                onChange={(e) => setIdProofType(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 font-semibold"
              >
                <option value="Aadhaar Card">Aadhaar Card</option>
                <option value="Driving License">Driving License</option>
                <option value="Passport">Passport</option>
                <option value="Voter ID">Voter ID</option>
                <option value="PAN Card">PAN Card</option>
              </select>
            </div>
          </div>

          {/* Change Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Phone Number Update (Mandatory)</label>
            <textarea
              rows={2}
              placeholder="Explain why customer is requesting phone update (e.g., lost SIM card, verified physical ID)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white text-slate-900"
              required
            />
          </div>

          {/* File Upload for ID Proof */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Upload ID Proof Document (.jpg, .png, .pdf)</label>
            <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 flex items-center justify-between text-xs">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => setIdProofFile(e.target.files[0] || null)}
                className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 cursor-pointer"
              />
              {idProofFile && <span className="text-emerald-700 font-bold text-[11px] truncate">{idProofFile.name}</span>}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !otp.trim() || !newValue.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 bg-brand-navy hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Submit Request for Approval
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
