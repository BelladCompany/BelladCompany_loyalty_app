import React, { useState } from 'react';
import { X, UserPlus, Car, Calculator, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button, Input } from '../ui';
import ApiService from '../../services/api';

/**
 * AddCustomerModal
 *
 * Opens as a modal overlay. Fields:
 *  Required : Full Name, Phone Number (10-digit)
 *  Optional : Vehicle Reg No, Vehicle Model, Purchase Date, Ex-Showroom Price, Vehicle City
 *  Admin-only: Opening Points Balance
 *
 * On success, calls onSuccess(newCustomer) so the dashboard can immediately
 * navigate to the newly created customer's 360 profile.
 */
export const AddCustomerModal = ({ isOpen, onClose, onSuccess, user }) => {
  // ─── Form state ─────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [chassisOrVin, setChassisOrVin] = useState('');
  const [model, setModel] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [exShowroomPrice, setExShowroomPrice] = useState('');
  const [vehicleCity, setVehicleCity] = useState('');
  const [openingPoints, setOpeningPoints] = useState('0');

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(null);

  const isAdmin = user?.role === 'admin';

  if (!isOpen) return null;

  // ─── Live points preview for opening balance ──────────────────────────────
  const openingPtsNum = parseInt(openingPoints || '0', 10);
  const openingPtsRupees = Math.floor(openingPtsNum / 4);

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
    if (exShowroomPrice && (isNaN(Number(exShowroomPrice)) || Number(exShowroomPrice) < 0)) {
      errs.exShowroomPrice = 'Ex-showroom price must be a positive number.';
    }
    if (openingPtsNum < 0) {
      errs.openingPoints = 'Opening points cannot be negative.';
    }
    return errs;
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
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
      const hasVehicle = chassisOrVin.trim() || model.trim() || purchaseDate || exShowroomPrice || vehicleCity.trim();
      const payload = {
        name: name.trim(),
        phone_numbers: [phone.trim()],
        ...(hasVehicle && {
          vehicle: {
            chassis_no: chassisOrVin.trim() || undefined,
            vin: chassisOrVin.trim() || undefined,
            registration_number: chassisOrVin.trim() || undefined,
            model: model.trim() || undefined,
            purchase_date: purchaseDate || undefined,
            ex_showroom_price: exShowroomPrice ? Number(exShowroomPrice) : undefined,
            vehicle_city: vehicleCity.trim() || undefined,
          },
        }),
        // Only send opening_points if admin
        ...(isAdmin && openingPtsNum > 0 && { opening_points: openingPtsNum }),
      };

      const res = await ApiService.createCustomer(payload);
      setSuccess(res.data);
      // Small delay to show success state, then trigger parent callback
      setTimeout(() => {
        onSuccess(res.data);
        handleClose();
      }, 1200);
    } catch (err) {
      if (err.status === 409) {
        setErrors({ phone: 'This phone number is already registered to another customer.' });
      } else {
        setSubmitError(err.message || 'Failed to create customer. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    // Reset all state
    setName(''); setPhone(''); setChassisOrVin(''); setModel('');
    setPurchaseDate(''); setExShowroomPrice(''); setVehicleCity('');
    setOpeningPoints('0'); setErrors({}); setSubmitError(''); setSuccess(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white border-2 border-surface-border rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100 border-b border-surface-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-6 h-6 text-action-primary" />
            <h3 className="text-xl font-bold text-ink-primary">Register New Customer</h3>
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

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-6 space-y-6">
            
            {/* Submit error */}
            {submitError && (
              <div className="p-4 bg-action-danger-light border border-red-300 rounded flex items-start gap-2.5 text-action-danger font-bold text-base">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="p-4 bg-action-success-light border border-green-300 rounded flex items-center gap-3 text-action-success font-bold text-base">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>Customer <span className="font-mono">{success.customer_id}</span> created! Loading profile…</span>
              </div>
            )}

            {/* ── SECTION 1: Basic Details ─────────────────────────────── */}
            <div>
              <h4 className="text-base font-bold text-ink-primary mb-3 pb-2 border-b border-surface-border">
                Basic Details <span className="text-action-danger">*</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-ink-primary block mb-1.5">
                    Full Name <span className="text-action-danger">*</span>
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
                  <label className="text-sm font-semibold text-ink-primary block mb-1.5">
                    Chassis No. / VIN No.
                  </label>
                  <input
                    id="add-cust-chassis"
                    type="text"
                    placeholder="e.g. MA3EW... or 17-digit Chassis / VIN No"
                    value={chassisOrVin}
                    onChange={(e) => setChassisOrVin(e.target.value.toUpperCase())}
                    disabled={isLoading || !!success}
                    className="w-full h-11 px-4 border border-surface-border rounded-md text-base font-mono font-medium focus:outline-none focus:border-action-primary bg-white shadow-xs transition-colors"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-ink-primary block mb-1.5">Vehicle Model</label>
                  <input
                    id="add-cust-model"
                    type="text"
                    placeholder="e.g. Swift Dzire, Creta"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    disabled={isLoading || !!success}
                    className="w-full h-11 px-4 border border-surface-border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-ink-primary block mb-1.5">Purchase Date</label>
                  <input
                    id="add-cust-purchase-date"
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    disabled={isLoading || !!success}
                    className="w-full h-11 px-4 border border-surface-border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-ink-primary block mb-1.5">Vehicle City</label>
                  <input
                    id="add-cust-city"
                    type="text"
                    placeholder="e.g. Bangalore"
                    value={vehicleCity}
                    onChange={(e) => setVehicleCity(e.target.value)}
                    disabled={isLoading || !!success}
                    className="w-full h-11 px-4 border border-surface-border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-bold text-ink-primary block mb-1.5">Ex-Showroom Price (₹)</label>
                  <input
                    id="add-cust-ex-showroom"
                    type="number"
                    placeholder="e.g. 850000 (pre-tax, not on-road price)"
                    value={exShowroomPrice}
                    onChange={(e) => setExShowroomPrice(e.target.value)}
                    disabled={isLoading || !!success}
                    min={0}
                    className={`w-full h-11 px-4 border rounded text-base font-medium focus:outline-none focus:border-action-primary bg-white transition-colors ${
                      errors.exShowroomPrice ? 'border-red-400 bg-red-50' : 'border-surface-border'
                    }`}
                  />
                  {errors.exShowroomPrice && <p className="text-xs text-action-danger font-semibold mt-1">{errors.exShowroomPrice}</p>}
                  <p className="text-xs text-ink-muted mt-1">Used to calculate loyalty points if you also apply points via "+ Add Points" after registration.</p>
                </div>
              </div>
            </div>

            {/* ── SECTION 3: Opening Points (Admin only) ─────────────── */}
            {isAdmin && (
              <div>
                <h4 className="text-base font-bold text-ink-primary mb-3 pb-2 border-b border-surface-border">
                  Opening Points Balance
                  <span className="ml-2 text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">ADMIN ONLY</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="text-sm font-bold text-ink-primary block mb-1.5">Points to Award</label>
                    <input
                      id="add-cust-opening-pts"
                      type="number"
                      placeholder="0"
                      value={openingPoints}
                      onChange={(e) => setOpeningPoints(e.target.value)}
                      disabled={isLoading || !!success}
                      min={0}
                      className={`w-full h-11 px-4 border rounded text-base font-mono font-medium focus:outline-none focus:border-action-primary bg-white transition-colors ${
                        errors.openingPoints ? 'border-red-400 bg-red-50' : 'border-surface-border'
                      }`}
                    />
                    {errors.openingPoints && <p className="text-xs text-action-danger font-semibold mt-1">{errors.openingPoints}</p>}
                  </div>

                  {openingPtsNum > 0 && (
                    <div className="p-3 bg-action-primary-light border border-blue-300 rounded flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-action-primary flex-shrink-0" />
                      <span className="text-sm font-bold text-action-primary">
                        ≈ ₹{openingPtsRupees.toLocaleString()} discount value
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-surface-border flex-shrink-0">
            <Button variant="outline" size="lg" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading || !!success}
            >
              {isLoading ? 'Creating Customer…' : 'Create & Open Profile'}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default AddCustomerModal;
