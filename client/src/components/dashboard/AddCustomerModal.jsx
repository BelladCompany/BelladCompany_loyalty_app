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
 *  - Basic Customer Details: Name, Phone (10 digits), Age, Aadhaar No (12 digits), Address
 *  - Vehicle Details (Optional): Brand, Branch, Model, Variant, Reg No, Fuel/Engine Type
 *
 * Excluded per requirement:
 *  - Firm / Company Name
 *  - Points Award / Opening Points (Manual customers start with 0 points)
 *  - VIN No, Purchase Date, Ex-Showroom Price
 */
export const AddCustomerModal = ({ isOpen, onClose, onSuccess, user }) => {
  // ─── Form State ─────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [address, setAddress] = useState('');

  const [brandName, setBrandName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [model, setModel] = useState('');
  const [variant, setVariant] = useState('');
  const [regNo, setRegNo] = useState('');
  const [fuelType, setFuelType] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(null);

  if (!isOpen) return null;

  // ─── Client-side validation ───────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!name.trim()) {
      errs.name = 'Full name is required.';
    }
    if (!phone.trim()) {
      errs.phone = 'Phone number is required.';
    } else if (!/^\d{10}$/.test(phone.trim())) {
      errs.phone = 'Phone number must be exactly 10 digits.';
    }
    if (aadhaar.trim() && !/^\d{12}$/.test(aadhaar.trim())) {
      errs.aadhaar = 'Aadhaar number must be exactly 12 numeric digits.';
    }
    if (age.trim() && (isNaN(Number(age)) || Number(age) <= 0 || Number(age) > 120)) {
      errs.age = 'Please enter a valid age between 1 and 120.';
    }
    return errs;
  };

  // ─── Submit Handler ────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setErrors({});

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      const hasVehicleData =
        brandName.trim() ||
        branchName.trim() ||
        model.trim() ||
        variant.trim() ||
        regNo.trim() ||
        fuelType.trim();

      const payload = {
        name: name.trim(),
        phone_numbers: [phone.trim()],
        visit_type: 'first_time',
        is_first_time_visitor: true,
        ...(aadhaar.trim() && { aadhaar_number: aadhaar.trim() }),
        ...(age.trim() && { age: parseInt(age.trim(), 10) }),
        ...(address.trim() && { address: address.trim() }),
        ...(hasVehicleData && {
          vehicle: {
            brand_name: brandName.trim() || undefined,
            branch_name: branchName.trim() || undefined,
            model: model.trim() || undefined,
            variant: variant.trim() || undefined,
            registration_number: regNo.trim() || undefined,
            fuel_type: fuelType.trim() || undefined,
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
      if (err.status === 409) {
        if (err.message && err.message.toLowerCase().includes('aadhaar')) {
          setErrors({ aadhaar: err.message });
        } else {
          setErrors({ phone: err.message || 'This phone number is already registered to another customer.' });
        }
      } else {
        setSubmitError(err.message || 'Failed to create customer. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setName('');
    setPhone('');
    setAge('');
    setAadhaar('');
    setAddress('');
    setBrandName('');
    setBranchName('');
    setModel('');
    setVariant('');
    setRegNo('');
    setFuelType('');
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
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
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
                  Customer <span className="font-mono">{success.customer_id}</span> created! Loading profile…
                </span>
              </div>
            )}

            {/* Banner */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm text-brand-navy font-semibold">
              <UserCheck className="w-5 h-5 text-action-primary flex-shrink-0" />
              <span>Registering First-Time Visiting Customer. Initial points: 0. Points are calculated on service spend.</span>
            </div>

            {/* ── SECTION 1: Customer Details ─────────────────────────────── */}
            <div>
              <h4 className="text-base font-bold text-ink-primary mb-3 pb-2 border-b border-surface-border flex items-center justify-between">
                <span>Customer Profile Details</span>
                <span className="text-xs text-action-danger font-bold">* Required</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-ink-primary block mb-1.5">
                    Customer Name <span className="text-action-danger">*</span>
                  </label>
                  <input
                    id="add-cust-name"
                    type="text"
                    placeholder="e.g. Ramesh Kumar Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading || !!success}
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
                    disabled={isLoading || !!success}
                    maxLength={10}
                    className={`w-full h-11 px-4 border rounded text-base font-mono font-medium focus:outline-none focus:border-action-primary bg-white transition-colors ${
                      errors.phone ? 'border-red-400 bg-red-50' : 'border-surface-border'
                    }`}
                  />
                  {errors.phone && <p className="text-xs text-action-danger font-semibold mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label className="text-sm font-bold text-ink-primary block mb-1.5">Age</label>
                  <input
                    id="add-cust-age"
                    type="number"
                    placeholder="e.g. 35"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    disabled={isLoading || !!success}
                    min={1}
                    max={120}
                    className={`w-full h-11 px-4 border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white transition-colors ${
                      errors.age ? 'border-red-400 bg-red-50' : 'border-surface-border'
                    }`}
                  />
                  {errors.age && <p className="text-xs text-action-danger font-semibold mt-1">{errors.age}</p>}
                </div>

                <div>
                  <label className="text-sm font-bold text-ink-primary block mb-1.5">Aadhaar Number</label>
                  <input
                    id="add-cust-aadhaar"
                    type="text"
                    placeholder="e.g. 123456789012 (12 digits)"
                    value={aadhaar}
                    onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    disabled={isLoading || !!success}
                    maxLength={12}
                    className={`w-full h-11 px-4 border rounded text-base font-mono font-medium focus:outline-none focus:border-action-primary bg-white transition-colors ${
                      errors.aadhaar ? 'border-red-400 bg-red-50' : 'border-surface-border'
                    }`}
                  />
                  {errors.aadhaar && <p className="text-xs text-action-danger font-semibold mt-1">{errors.aadhaar}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-bold text-ink-primary block mb-1.5">Customer Address</label>
                  <textarea
                    id="add-cust-address"
                    rows={2}
                    placeholder="e.g. House No 42, Main Road, Tilakwadi, Belagavi"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={isLoading || !!success}
                    className="w-full p-3 border border-surface-border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white resize-none"
                  />
                </div>
              </div>
            </div>

            {/* ── SECTION 2: Vehicle Details ──────────────────────────── */}
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
                    disabled={isLoading || !!success}
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
                    disabled={isLoading || !!success}
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
                    disabled={isLoading || !!success}
                    className="w-full h-11 px-4 border border-surface-border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-ink-primary block mb-1.5">Variant</label>
                  <input
                    id="add-cust-variant"
                    type="text"
                    placeholder="e.g. VXI, ZXI Plus"
                    value={variant}
                    onChange={(e) => setVariant(e.target.value)}
                    disabled={isLoading || !!success}
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
                    disabled={isLoading || !!success}
                    className="w-full h-11 px-4 border border-surface-border rounded text-base font-mono font-medium focus:outline-none focus:border-action-primary bg-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-ink-primary block mb-1.5">Fuel / Engine Type</label>
                  <select
                    id="add-cust-fuel"
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    disabled={isLoading || !!success}
                    className="w-full h-11 px-4 border border-surface-border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white"
                  >
                    <option value="">Select Fuel Type (Optional)</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="EV">EV (Electric)</option>
                    <option value="CNG">CNG</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-surface-border flex-shrink-0">
            <Button variant="outline" size="lg" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="lg" disabled={isLoading || !!success}>
              {isLoading ? 'Creating Customer…' : 'Create & Open Profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCustomerModal;
