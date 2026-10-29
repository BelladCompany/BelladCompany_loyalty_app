import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Gift,
  KeyRound,
  Lock,
  Wrench,
  Check
} from 'lucide-react';
import ApiService from '../../services/api';

export default function EnrollmentScreen({ onLoginSuccess }) {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [activeTestCode, setActiveTestCode] = useState('123456');
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [referralCode, setReferralCode] = useState('');

  const otpInputsRef = useRef([]);

  // Capture referral code from URL query parameter ?ref=... or sessionStorage
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const refParam = urlParams.get('ref') || sessionStorage.getItem('bellad_referral_code');
      if (refParam) {
        const cleanRef = String(refParam).trim();
        setReferralCode(cleanRef);
        sessionStorage.setItem('bellad_referral_code', cleanRef);
      }
    } catch (e) {
      // Ignore URL parsing errors
    }
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleNameChange = (e) => {
    const val = e.target.value;
    if (/\d/.test(val)) {
      setError('Full name cannot contain numbers.');
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
    const raw = e.target.value.replace(/[^\d]/g, '');
    if (raw.length <= 12) {
      setAadhaar(raw);
      setError('');
    }
  };

  const formatAadhaarDisplay = (raw) => {
    const digits = (raw || '').replace(/[^\d]/g, '');
    const parts = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.slice(i, i + 4));
    }
    return parts.join(' ');
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name as per vehicle RC.');
      return;
    }
    if (/\d/.test(name)) {
      setError('Customer name cannot contain numbers.');
      return;
    }
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
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
        referral_code: referralCode,
      });
      setStep('otp');
      const testCode = res.debug_otp || res.dummy_otp || '123456';
      setActiveTestCode(testCode);
      setInfoMsg(res.message || 'Verification code sent to your WhatsApp number.');
      setResendCountdown(30);
    } catch (err) {
      setError(err.message || 'Unable to request OTP. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpBoxChange = (index, value) => {
    const val = value.replace(/[^\d]/g, '');
    const newOtp = [...otp];
    newOtp[index] = val ? val[val.length - 1] : '';
    setOtp(newOtp);

    // Auto-advance
    if (val && index < 5 && otpInputsRef.current[index + 1]) {
      otpInputsRef.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0 && otpInputsRef.current[index - 1]) {
      otpInputsRef.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^\d]/g, '').slice(0, 6);
    if (!pastedData) return;
    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    const nextIndex = Math.min(pastedData.length, 5);
    if (otpInputsRef.current[nextIndex]) {
      otpInputsRef.current[nextIndex].focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter the complete 6-digit OTP code.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const verifyMethod = (ApiService.portalVerifyOtp || ApiService.portalOtpVerify).bind(ApiService);
      const res = await verifyMethod({
        name: name.trim(),
        phone,
        otp: fullOtp,
        aadhaar_number: aadhaar,
        referral_code: referralCode,
      });
      if (onLoginSuccess) {
        onLoginSuccess(res.customer, res.is_new_enrollment);
      }
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP. Please verify and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setLoading(true);
    setError('');
    try {
      const res = await ApiService.portalRequestOtp({
        name: name.trim(),
        phone,
        aadhaar_number: aadhaar,
      });
      setInfoMsg(res.message || 'A new verification code has been sent to your WhatsApp.');
      setOtp(['', '', '', '', '', '']);
      setResendCountdown(30);
      if (otpInputsRef.current[0]) {
        otpInputsRef.current[0].focus();
      }
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* Subtle modern ambient background gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-100/40 via-slate-50/20 to-transparent pointer-events-none" />

      {/* Clean Navbar */}
      <nav className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200/80 p-1.5 shadow-sm flex items-center justify-center shrink-0">
            <img
              src="/bellad-logo.png"
              alt="Bellad & Company"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <div>
            <span className="text-base font-black tracking-tight text-slate-900 block leading-tight">
              Bellad &amp; Company
            </span>
            <span className="text-[11px] font-semibold text-slate-500 block">
              Member Loyalty Portal
            </span>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200/80 px-3 py-1.5 rounded-full shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">256-Bit Encrypted</span>
          <span className="sm:hidden">Secure</span>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-3.5 sm:px-8 py-4 sm:py-12 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          
          {/* Left Column: Clean Minimal Presentation (Desktop & Tablet) */}
          <div className="order-2 lg:order-1 lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-xs font-bold text-indigo-700">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Customer Rewards &amp; Perks</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-[1.15]">
                Your Automotive Rewards, <span className="text-indigo-600">Simplified.</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-600 max-w-lg leading-relaxed mx-auto lg:mx-0">
                Log in with your WhatsApp number to view live loyalty points, redeem service vouchers, and manage your vehicle perks with zero hassle.
              </p>
            </div>

            {/* 3 Minimal Neat Feature Points */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/70 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                  <Wrench className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-slate-900">Instant Points</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Earn on every service &amp; bodyshop visit</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/70 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                  <Gift className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-slate-900">Gift Rewards</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Share digital passes via WhatsApp</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/70 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-slate-900">Verified Access</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Fast, passwordless WhatsApp 2FA</p>
              </div>
            </div>
          </div>

          {/* Right Column: Modern, Minimalist Login Card */}
          <div className="order-1 lg:order-2 lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-8 shadow-xl shadow-slate-200/50 text-slate-900 relative">
              
              {/* Stepper Header */}
              <div className="flex items-center justify-between pb-4 sm:pb-5 border-b border-slate-100">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {step === 'phone' ? 'Member Access' : 'Verify WhatsApp Code'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    {step === 'phone' ? 'Enter details to receive your one-time code' : `Code sent to +91 ${phone}`}
                  </p>
                </div>
                <span className="text-[11px] sm:text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 shrink-0">
                  {step === 'phone' ? 'Step 1 of 2' : 'Step 2 of 2'}
                </span>
              </div>

              {/* Referral Invite Active Banner */}
              {referralCode && (
                <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Gift className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-amber-900">Referral Reward Active</p>
                    <p className="text-amber-700 text-[11px] leading-tight">
                      Invited by <span className="font-mono font-bold text-amber-950">{referralCode}</span>. Earn 2,500 bonus points (₹625) upon vehicle purchase!
                    </p>
                  </div>
                </div>
              )}

              {/* Error Alert Box */}
              {error && (
                <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Info / Success Alert Box */}
              {infoMsg && !error && (
                <div className="mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span>{infoMsg}</span>
                </div>
              )}

              {/* Step 1: Clean Form */}
              {step === 'phone' ? (
                <form onSubmit={handleRequestOtp} className="mt-5 space-y-4">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="customer-name" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="customer-name"
                        type="text"
                        value={name}
                        onChange={handleNameChange}
                        placeholder="e.g. Ramesh Patil"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  {/* Aadhaar Card */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="customer-aadhaar" className="text-xs font-bold text-slate-700">
                        Aadhaar Card Number
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">12 Digits</span>
                    </div>
                    <div className="relative">
                      <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="customer-aadhaar"
                        type="text"
                        value={formatAadhaarDisplay(aadhaar)}
                        onChange={handleAadhaarChange}
                        placeholder="1234 5678 9012"
                        required
                        maxLength={14}
                        inputMode="numeric"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-mono tracking-wider placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label htmlFor="customer-phone" className="block text-xs font-bold text-slate-700 mb-1.5">
                      WhatsApp Mobile Number
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-xs text-slate-500 font-mono font-bold">+91</span>
                      <input
                        id="customer-phone"
                        type="tel"
                        value={phone}
                        onChange={handlePhoneChange}
                        placeholder="9876543210"
                        required
                        maxLength={10}
                        inputMode="numeric"
                        className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-mono tracking-wider placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <>
                          <span>Send WhatsApp Code</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* Step 2: 6-Digit WhatsApp OTP */
                <form onSubmit={handleVerifyOtp} className="mt-5 space-y-5">
                  <div className="flex items-center justify-between pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('phone');
                        setError('');
                        setInfoMsg('');
                      }}
                      className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                      Change Details
                    </button>
                    <span className="text-xs font-mono font-bold text-slate-700">+91 {phone}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2.5 text-center">
                      Enter 6-digit WhatsApp Code
                    </label>
                    <div className="flex items-center justify-center gap-1 sm:gap-2" onPaste={handleOtpPaste}>
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
                          className="flex-1 min-w-0 max-w-[40px] sm:max-w-[48px] h-11 sm:h-12 text-center text-base sm:text-lg font-black font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-xs"
                        />
                      ))}
                    </div>

                    {/* Minimal Demo Helper Box */}
                    <div className="mt-4 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                        Test Code: <strong className="font-mono text-slate-900">{activeTestCode}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setOtp(String(activeTestCode).padStart(6, '0').slice(0, 6).split(''))}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 font-bold rounded-lg text-slate-800 text-[11px] transition border border-slate-200 shadow-xs cursor-pointer"
                      >
                        Auto-Fill
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.join('').length !== 6}
                    className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <>
                        <span>Verify &amp; Enter Portal</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={loading || resendCountdown > 0}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium transition cursor-pointer disabled:opacity-50"
                    >
                      {resendCountdown > 0
                        ? `Resend code in ${resendCountdown}s`
                        : "Didn't receive code? Resend"}
                    </button>
                  </div>
                </form>
              )}

              {/* Minimal Trust Badge */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-slate-400 text-[11px]">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Authorized Dealership Portal</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-8 py-5 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div>
          &copy; {new Date().getFullYear()} Bellad &amp; Company. All rights reserved.
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Hubballi &bull; Belagavi &bull; Vijayapura</span>
        </div>
      </footer>
    </div>
  );
}
