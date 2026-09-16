import React, { useState, useRef } from 'react';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import ApiService from '../../services/api';

export default function EnrollmentScreen({ onLoginSuccess }) {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const otpInputsRef = useRef([]);

  const handleNameChange = (e) => {
    const val = e.target.value;
    if (/\d/.test(val)) {
      setError('Customer name cannot contain numbers.');
      return;
    }
    setError('');
    setName(val);
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/[^\d]/g, '');
    if (val.length <= 10) {
      setPhone(val);
      setError('');
    }
  };

  const handleAadhaarChange = (e) => {
    const val = e.target.value.replace(/[^\d]/g, '');
    if (val.length <= 12) {
      setAadhaar(val);
      setError('');
    }
  };

  // Format Aadhaar for display: 1234 5678 9012
  const formatAadhaarDisplay = (raw) => {
    const digits = raw.replace(/[^\d]/g, '');
    const parts = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.slice(i, i + 4));
    }
    return parts.join(' ');
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (/\d/.test(name)) {
      setError('Customer name cannot contain numbers.');
      return;
    }
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    if (aadhaar.length !== 12) {
      setError('Please enter a valid 12-digit Aadhaar number.');
      return;
    }

    setLoading(true);
    setError('');
    setInfoMsg('');

    try {
      const res = await ApiService.portalRequestOtp({
        name: name.trim(),
        phone,
        aadhaar_number: aadhaar,
      });
      setStep('otp');
      setInfoMsg(res.message || `OTP sent to +91 ${phone}`);
      setTimeout(() => {
        if (otpInputsRef.current[0]) {
          otpInputsRef.current[0].focus();
        }
      }, 100);
    } catch (err) {
      setError(err.message || 'Failed to send OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpBoxChange = (index, value) => {
    const cleanValue = value.replace(/[^\d]/g, '');
    if (!cleanValue) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }

    if (cleanValue.length === 1) {
      const newOtp = [...otp];
      newOtp[index] = cleanValue;
      setOtp(newOtp);
      setError('');
      if (index < 5 && otpInputsRef.current[index + 1]) {
        otpInputsRef.current[index + 1].focus();
      }
    } else if (cleanValue.length === 6) {
      const digits = cleanValue.split('');
      setOtp(digits);
      setError('');
      if (otpInputsRef.current[5]) {
        otpInputsRef.current[5].focus();
      }
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0 && otpInputsRef.current[index - 1]) {
        otpInputsRef.current[index - 1].focus();
      }
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter the complete 6-digit OTP code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await ApiService.portalOtpVerify({
        name: name.trim(),
        phone,
        otp: fullOtp,
        aadhaar_number: aadhaar,
      });
      if (onLoginSuccess) {
        onLoginSuccess(res.customer, res.is_new_enrollment);
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await ApiService.portalRequestOtp({
        name: name.trim(),
        phone,
        aadhaar_number: aadhaar,
      });
      setInfoMsg(res.message || 'A new code has been sent.');
      setOtp(['', '', '', '', '', '']);
      if (otpInputsRef.current[0]) {
        otpInputsRef.current[0].focus();
      }
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        {/* Header Branding — Bellad Logo */}
        <div className="flex items-center justify-center space-x-2.5 mb-6">
          <img
            src="/bellad-logo.png"
            alt="Bellad Automobiles"
            className="w-10 h-10 object-contain rounded-lg"
          />
          <span className="text-lg font-bold text-slate-900 tracking-tight">Bellad Loyalty</span>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
            {error}
          </div>
        )}

        {infoMsg && !error && (
          <div className="mb-5 p-3 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
            {infoMsg}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label htmlFor="customer-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                id="customer-name"
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="Enter your full name"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
              />
              <p className="text-[11px] text-slate-500 mt-1">Letters only (no numbers allowed)</p>
            </div>

            <div>
              <label htmlFor="customer-aadhaar" className="block text-xs font-semibold text-slate-700 mb-1">
                Aadhaar Card Number
              </label>
              <input
                id="customer-aadhaar"
                type="text"
                value={formatAadhaarDisplay(aadhaar)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d]/g, '');
                  if (raw.length <= 12) {
                    setAadhaar(raw);
                    setError('');
                  }
                }}
                placeholder="1234 5678 9012"
                required
                maxLength={14}
                inputMode="numeric"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 tracking-widest font-mono focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
              />
              <p className="text-[11px] text-slate-500 mt-1">12-digit Aadhaar number (used for unique identity verification)</p>
            </div>

            <div>
              <label htmlFor="customer-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm text-slate-500 font-medium">+91</span>
                <input
                  id="customer-phone"
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="9876543210"
                  required
                  className="w-full pl-12 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Send code</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setError('');
                  setInfoMsg('');
                }}
                className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Back
              </button>
              <span className="text-xs text-slate-500">+91 {phone}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2 text-center">
                Enter 6-digit WhatsApp OTP
              </label>
              <div className="flex justify-between gap-1.5">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpInputsRef.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpBoxChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-10 h-12 text-center text-lg font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6}
              className="w-full py-3 px-4 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Verify and continue</span>
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="text-xs text-slate-600 hover:text-slate-900 font-medium underline transition-colors"
              >
                Resend code
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-center space-x-1.5 text-slate-500 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Encrypted customer verification</span>
        </div>
      </div>

      {/* Footer — Terms & Conditions */}
      <div className="mt-6 text-center">
        <p className="text-[11px] text-slate-400">
          By enrolling, you agree to our{' '}
          <a
            href="/terms-and-conditions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 underline hover:text-slate-900 transition-colors"
          >
            Terms &amp; Conditions
          </a>{' '}
          and{' '}
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 underline hover:text-slate-900 transition-colors"
          >
            Privacy Policy
          </a>
        </p>
        <p className="text-[10px] text-slate-400 mt-1">© {new Date().getFullYear()} Bellad Automobile Corporation</p>
      </div>
    </div>
  );
}
