import React, { useState } from 'react';
import { X, UserPlus, Car, AlertCircle, CheckCircle2, UserCheck } from 'lucide-react';
import { Button } from '../ui';
import ApiService from '../../services/api';

/**
 * AddCustomerModal
 *
 * Manual customer registration modal for Cashiers/Admins.
 * Designed for registering First-Time Visiting Customers manually.
 *
 * Form fields:
 *  - Basic Customer Details: Ledger Name, Phone (10 digits), Age, Aadhaar No (12 digits)
 *  - Vehicle Details (Optional): Brand, Branch, Model, Reg No
 *
 * Excluded per requirement:
 *  - Firm / Company Name
 *  - Points Award / Opening Points (Manual customers start with 0 points)
 *  - VIN No, Purchase Date, Ex-Showroom Price
 */
export const AddCustomerModal = ({ isOpen, onClose, onSuccess, user }) => {
  // ─── Form State ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState('form'); // 'form' | 'otp'

  // Mandatory Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  // Optional Party & Accounting Info Fields
  const [ledgerGroup, setLedgerGroup] = useState('Sundry Debtors WS-General');
  const [partyType, setPartyType] = useState('Customer');
  const [firmName, setFirmName] = useState('');
  const [email, setEmail] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [gstRegType, setGstRegType] = useState('Unregistered Person');
  const [stateName, setStateName] = useState('Karnataka');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [vatNo, setVatNo] = useState('');
  const [panNo, setPanNo] = useState('');
  const [serviceTaxNo, setServiceTaxNo] = useState('');
  const [eccNo, setEccNo] = useState('');
  const [age, setAge] = useState('');

  // Optional Vehicle Details
  const [brandName, setBrandName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [model, setModel] = useState('');
  const [regNo, setRegNo] = useState('');

  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSentMsg, setOtpSentMsg] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(null);

  if (!isOpen) return null;

  // ─── Client-side validation ───────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!name.trim()) {
      errs.name = 'Contact Person / Customer Name is required.';
    }
    if (!phone.trim()) {
      errs.phone = 'Phone number is required.';
    } else if (!/^\d{10}$/.test(phone.trim())) {
      errs.phone = 'Phone number must be exactly 10 numeric digits.';
    }
    if (!aadhaar.trim()) {
      errs.aadhaar = 'Aadhaar Card number is required.';
    } else if (!/^\d{12}$/.test(aadhaar.trim())) {
      errs.aadhaar = 'Aadhaar number must be exactly 12 numeric digits.';
    }
    if (age.trim() && (isNaN(Number(age)) || Number(age) <= 0 || Number(age) > 120)) {
      errs.age = 'Please enter a valid age between 1 and 120.';
    }
    return errs;
  };

  // ─── Step 1: Request OTP ──────────────────────────────────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setErrors({});
    setOtpSentMsg('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await ApiService.requestCustomerCreationOtp(phone.trim());
      setOtpSentMsg(res.message || `OTP sent via WhatsApp to ${phone.trim()}`);
      setStep('otp');
    } catch (err) {
      if (err.status === 409) {
        setErrors({ phone: err.message || 'This phone number is already registered to another customer.' });
      } else {
        setSubmitError(err.message || 'Failed to send WhatsApp OTP. Please try again.');
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  // ─── Step 2: Final Submit with OTP ───────────────────────────────────────
  const handleVerifyAndCreate = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setErrors({});

    if (!otp.trim() || !/^\d{6}$/.test(otp.trim())) {
      setErrors({ otp: 'Please enter the valid 6-digit numeric OTP sent via WhatsApp.' });
      return;
    }

    setIsLoading(true);
    try {
      const hasVehicleData =
        brandName.trim() ||
        branchName.trim() ||
        model.trim() ||
        regNo.trim();

      const payload = {
        name: name.trim(),
        phone_numbers: [phone.trim()],
        aadhaar_number: aadhaar.trim(),
        gst_number: gstNumber.trim(),
        visit_type: 'first_time',
        is_first_time_visitor: true,
        otp: otp.trim(),

        // Optional Party & Accounting Fields
        ...(ledgerGroup.trim() && { ledger_group: ledgerGroup.trim() }),
        ...(partyType.trim() && { party_type: partyType.trim() }),
        ...(firmName.trim() && { firm_name: firmName.trim() }),
        ...(email.trim() && { email: email.trim() }),
        ...(customerType.trim() && { customer_type: customerType.trim() }),
        ...(gstRegType.trim() && { gst_registration_type: gstRegType.trim() }),
        ...(stateName.trim() && { state: stateName.trim() }),
        ...(city.trim() && { city: city.trim() }),
        ...(pincode.trim() && { pincode: pincode.trim() }),
        ...(vatNo.trim() && { vat_no: vatNo.trim() }),
        ...(panNo.trim() && { pan_no: panNo.trim() }),
        ...(serviceTaxNo.trim() && { service_tax_no: serviceTaxNo.trim() }),
        ...(eccNo.trim() && { ecc_no: eccNo.trim() }),
        ...(age.trim() && { age: parseInt(age.trim(), 10) }),

        ...(hasVehicleData && {
          vehicle: {
            brand_name: brandName.trim() || undefined,
            branch_name: branchName.trim() || undefined,
            model: model.trim() || undefined,
            registration_number: regNo.trim() || undefined,
          },
        }),
      };

      const res = await ApiService.createCustomer(payload);
      setSuccess(res.data);

      setTimeout(() => {
        onSuccess(res.data);
        handleClose();
      }, 1200);
    } catch (err) {
      setSubmitError(err.message || 'Failed to create customer. Please check OTP and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading || isSendingOtp) return;
    setStep('form');
    setName('');
    setPhone('');
    setAge('');
    setAadhaar('');
    setBrandName('');
    setBranchName('');
    setModel('');
    setRegNo('');
    setOtp('');
    setOtpSentMsg('');
    setErrors({});
    setSubmitError('');
    setSuccess(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white border-2 border-surface-border rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100 border-b border-surface-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-6 h-6 text-action-primary" />
            <h3 className="text-xl font-bold text-ink-primary">Add First-Time Customer</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="p-1 text-ink-secondary hover:text-ink-primary rounded hover:bg-slate-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={step === 'form' ? handleRequestOtp : handleVerifyAndCreate} className="overflow-y-auto flex-1">
          <div className="p-6 space-y-6">
            {submitError && (
              <div className="p-4 bg-action-danger-light border border-red-300 rounded flex items-start gap-2.5 text-action-danger font-bold text-base">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {success && (
              <div className="p-4 bg-action-success-light border border-green-300 rounded flex items-center gap-3 text-action-success font-bold text-base">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>
                  Customer <span className="font-mono">{success.customer_id}</span> created & verified! Loading profile…
                </span>
              </div>
            )}

            {/* Banner */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm text-brand-navy font-semibold">
              <UserCheck className="w-5 h-5 text-action-primary flex-shrink-0" />
              <span>Registering First-Time Visiting Customer. Mandatory WhatsApp OTP verification required.</span>
            </div>

            {step === 'otp' ? (
              /* ── STEP 2: OTP Verification Screen ─────────────────────────── */
              <div className="p-6 bg-slate-50 border-2 border-brand-gold/30 rounded-xl space-y-5 text-center">
                <div className="w-12 h-12 bg-amber-100 text-brand-gold rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <UserPlus className="w-6 h-6 text-amber-700" />
                </div>

                <div>
                  <h4 className="text-lg font-bold text-slate-900">Enter WhatsApp OTP</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    A 6-digit verification code was sent via WhatsApp to:
                  </p>
                  <p className="text-base font-bold font-mono text-brand-navy mt-1">
                    +91 {phone}
                  </p>
                </div>

                {otpSentMsg && (
                  <p className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 py-1.5 px-3 rounded-full inline-block">
                    {otpSentMsg}
                  </p>
                )}

                <div className="max-w-xs mx-auto">
                  <label className="text-xs font-extrabold uppercase text-slate-500 tracking-wider block mb-2">
                    6-Digit OTP Code <span className="text-action-danger">*</span>
                  </label>
                  <input
                    id="add-cust-otp"
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={isLoading || !!success}
                    autoFocus
                    className={`w-full text-center h-14 text-2xl font-mono tracking-widest font-extrabold border-2 rounded-lg bg-white shadow-inner focus:outline-none focus:border-brand-gold ${
                      errors.otp ? 'border-red-400 bg-red-50' : 'border-slate-300'
                    }`}
                  />
                  {errors.otp && <p className="text-xs text-action-danger font-semibold mt-1">{errors.otp}</p>}
                </div>

                <div className="pt-2 flex items-center justify-center gap-4 text-xs">
                  <button
                    type="button"
                    onClick={() => setStep('form')}
                    disabled={isLoading}
                    className="text-slate-600 hover:text-slate-900 font-semibold underline"
                  >
                    ← Edit Details
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={isSendingOtp || isLoading}
                    className="text-brand-navy hover:text-brand-gold font-bold"
                  >
                    {isSendingOtp ? 'Resending OTP…' : 'Resend OTP'}
                  </button>
                </div>
              </div>
            ) : (
              /* ── STEP 1: Customer Details Form ─────────────────────────── */
              <>
                {/* ── SECTION 1: Mandatory Customer Profile Details ─────────────────────────────── */}
                <div>
                  <h4 className="text-base font-bold text-ink-primary mb-3 pb-2 border-b border-surface-border flex items-center justify-between">
                    <span>Mandatory Identity Details</span>
                    <span className="text-xs text-action-danger font-bold">* Required Fields</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">
                        Ledger Name <span className="text-action-danger">*</span>
                      </label>
                      <input
                        id="add-cust-name"
                        type="text"
                        placeholder="e.g. Ramesh Kumar Sharma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isLoading || isSendingOtp || !!success}
                        className={`w-full h-11 px-4 border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white transition-colors ${
                          errors.name ? 'border-red-400 bg-red-50' : 'border-surface-border'
                        }`}
                      />
                      {errors.name && <p className="text-xs text-action-danger font-semibold mt-1">{errors.name}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">
                        Phone Number <span className="text-action-danger">*</span>
                      </label>
                      <input
                        id="add-cust-phone"
                        type="tel"
                        placeholder="e.g. 9876543210 (10 digits)"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        disabled={isLoading || isSendingOtp || !!success}
                        maxLength={10}
                        className={`w-full h-11 px-4 border rounded text-base font-mono font-medium focus:outline-none focus:border-action-primary bg-white transition-colors ${
                          errors.phone ? 'border-red-400 bg-red-50' : 'border-surface-border'
                        }`}
                      />
                      {errors.phone && <p className="text-xs text-action-danger font-semibold mt-1">{errors.phone}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">
                        Aadhaar Card No <span className="text-action-danger">*</span>
                      </label>
                      <input
                        id="add-cust-aadhaar"
                        type="text"
                        placeholder="e.g. 123456789012 (12 digits)"
                        value={aadhaar}
                        onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))}
                        disabled={isLoading || isSendingOtp || !!success}
                        maxLength={12}
                        className={`w-full h-11 px-4 border rounded text-base font-mono font-medium focus:outline-none focus:border-action-primary bg-white transition-colors ${
                          errors.aadhaar ? 'border-red-400 bg-red-50' : 'border-surface-border'
                        }`}
                      />
                      {errors.aadhaar && <p className="text-xs text-action-danger font-semibold mt-1">{errors.aadhaar}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">
                        GST Number / GSTIN
                      </label>
                      <input
                        id="add-cust-gst"
                        type="text"
                        placeholder="e.g. 29ABCDE1234F1Z5"
                        value={gstNumber}
                        onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                        disabled={isLoading || isSendingOtp || !!success}
                        className={`w-full h-11 px-4 border rounded text-base font-mono font-medium focus:outline-none focus:border-action-primary bg-white transition-colors ${
                          errors.gstNumber ? 'border-red-400 bg-red-50' : 'border-surface-border'
                        }`}
                      />
                      {errors.gstNumber && <p className="text-xs text-action-danger font-semibold mt-1">{errors.gstNumber}</p>}
                    </div>
                  </div>
                </div>

                {/* ── SECTION 2: Party Info & Accounting Details (Optional) ─── */}
                <div>
                  <h4 className="text-base font-bold text-ink-primary mb-3 pb-2 border-b border-surface-border flex items-center justify-between">
                    <span>Party & Ledger Information</span>
                    <span className="text-sm text-ink-muted font-medium">(Optional - Skip if unknown)</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">Ledger Group</label>
                      <input
                        id="add-cust-ledger-group"
                        type="text"
                        placeholder="e.g. Sundry Debtors WS-General"
                        value={ledgerGroup}
                        onChange={(e) => setLedgerGroup(e.target.value)}
                        disabled={isLoading || isSendingOtp || !!success}
                        className="w-full h-11 px-4 border border-surface-border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">Party Type</label>
                      <input
                        id="add-cust-party-type"
                        type="text"
                        placeholder="e.g. Customer, Dealer"
                        value={partyType}
                        onChange={(e) => setPartyType(e.target.value)}
                        disabled={isLoading || isSendingOtp || !!success}
                        className="w-full h-11 px-4 border border-surface-border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">Organization / Firm Name</label>
                      <input
                        id="add-cust-firm"
                        type="text"
                        placeholder="e.g. Sharma Enterprises"
                        value={firmName}
                        onChange={(e) => setFirmName(e.target.value)}
                        disabled={isLoading || isSendingOtp || !!success}
                        className="w-full h-11 px-4 border border-surface-border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">Email ID</label>
                      <input
                        id="add-cust-email"
                        type="email"
                        placeholder="e.g. ramesh@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading || isSendingOtp || !!success}
                        className="w-full h-11 px-4 border border-surface-border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">Customer / Party Type</label>
                      <input
                        id="add-cust-type"
                        type="text"
                        placeholder="e.g. Retail, Wholesale, Corporate"
                        value={customerType}
                        onChange={(e) => setCustomerType(e.target.value)}
                        disabled={isLoading || isSendingOtp || !!success}
                        className="w-full h-11 px-4 border border-surface-border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">GST Registration Type</label>
                      <select
                        id="add-cust-gst-type"
                        value={gstRegType}
                        onChange={(e) => setGstRegType(e.target.value)}
                        disabled={isLoading || isSendingOtp || !!success}
                        className="w-full h-11 px-4 border border-surface-border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white"
                      >
                        <option value="Unregistered Person">Unregistered Person</option>
                        <option value="Registered Regular">Registered Regular</option>
                        <option value="Composition">Composition</option>
                        <option value="Consumer">Consumer</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">State</label>
                      <input
                        id="add-cust-state"
                        type="text"
                        placeholder="e.g. Karnataka"
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        disabled={isLoading || isSendingOtp || !!success}
                        className="w-full h-11 px-4 border border-surface-border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">City</label>
                      <input
                        id="add-cust-city"
                        type="text"
                        placeholder="e.g. Belagavi"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        disabled={isLoading || isSendingOtp || !!success}
                        className="w-full h-11 px-4 border border-surface-border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">Pincode</label>
                      <input
                        id="add-cust-pincode"
                        type="text"
                        placeholder="e.g. 590001"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        disabled={isLoading || isSendingOtp || !!success}
                        maxLength={6}
                        className="w-full h-11 px-4 border border-surface-border rounded text-base font-mono font-medium focus:outline-none focus:border-action-primary bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">Age</label>
                      <input
                        id="add-cust-age"
                        type="number"
                        placeholder="e.g. 35"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        disabled={isLoading || isSendingOtp || !!success}
                        min={1}
                        max={120}
                        className={`w-full h-11 px-4 border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white transition-colors ${
                          errors.age ? 'border-red-400 bg-red-50' : 'border-surface-border'
                        }`}
                      />
                      {errors.age && <p className="text-xs text-action-danger font-semibold mt-1">{errors.age}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">PAN Number</label>
                      <input
                        id="add-cust-pan"
                        type="text"
                        placeholder="e.g. ABCDE1234F"
                        value={panNo}
                        onChange={(e) => setPanNo(e.target.value.toUpperCase())}
                        disabled={isLoading || isSendingOtp || !!success}
                        className="w-full h-11 px-4 border border-surface-border rounded text-base font-mono font-medium focus:outline-none focus:border-action-primary bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">VAT No</label>
                      <input
                        id="add-cust-vat"
                        type="text"
                        placeholder="e.g. VAT-123456"
                        value={vatNo}
                        onChange={(e) => setVatNo(e.target.value)}
                        disabled={isLoading || isSendingOtp || !!success}
                        className="w-full h-11 px-4 border border-surface-border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">Service Tax No</label>
                      <input
                        id="add-cust-stax"
                        type="text"
                        placeholder="e.g. STAX-7890"
                        value={serviceTaxNo}
                        onChange={(e) => setServiceTaxNo(e.target.value)}
                        disabled={isLoading || isSendingOtp || !!success}
                        className="w-full h-11 px-4 border border-surface-border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">ECC No</label>
                      <input
                        id="add-cust-ecc"
                        type="text"
                        placeholder="e.g. ECC-5544"
                        value={eccNo}
                        onChange={(e) => setEccNo(e.target.value)}
                        disabled={isLoading || isSendingOtp || !!success}
                        className="w-full h-11 px-4 border border-surface-border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white"
                      />
                    </div>

                    </div>
                </div>

                {/* ── SECTION 3: Vehicle Details (Optional) ──────────────────── */}
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-surface-border">
                    <Car className="w-5 h-5 text-ink-secondary" />
                    <h4 className="text-base font-bold text-ink-primary">Vehicle Details</h4>
                    <span className="text-sm text-ink-muted font-medium">(optional)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">Brand</label>
                      <input
                        id="add-cust-brand"
                        type="text"
                        placeholder="e.g. Maruti Suzuki, Hyundai"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        disabled={isLoading || isSendingOtp || !!success}
                        className="w-full h-11 px-4 border border-surface-border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">Branch</label>
                      <input
                        id="add-cust-branch"
                        type="text"
                        placeholder="e.g. Belgaum Main, Hubli"
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        disabled={isLoading || isSendingOtp || !!success}
                        className="w-full h-11 px-4 border border-surface-border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">Model</label>
                      <input
                        id="add-cust-model"
                        type="text"
                        placeholder="e.g. Swift, Creta"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        disabled={isLoading || isSendingOtp || !!success}
                        className="w-full h-11 px-4 border border-surface-border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold text-ink-primary block mb-1.5">Registration No.</label>
                      <input
                        id="add-cust-regno"
                        type="text"
                        placeholder="e.g. KA-22-AB-1234"
                        value={regNo}
                        onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                        disabled={isLoading || isSendingOtp || !!success}
                        className="w-full h-11 px-4 border border-surface-border rounded text-base font-mono font-medium focus:outline-none focus:border-action-primary bg-white"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-surface-border flex-shrink-0">
            <Button variant="outline" size="lg" onClick={handleClose} disabled={isLoading || isSendingOtp}>
              Cancel
            </Button>
            {step === 'form' ? (
              <Button type="submit" variant="primary" size="lg" disabled={isSendingOtp || !!success}>
                {isSendingOtp ? 'Sending WhatsApp OTP…' : 'Send WhatsApp OTP'}
              </Button>
            ) : (
              <Button type="submit" variant="primary" size="lg" disabled={isLoading || !!success}>
                {isLoading ? 'Verifying OTP & Creating…' : 'Verify OTP & Create Customer'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCustomerModal;
