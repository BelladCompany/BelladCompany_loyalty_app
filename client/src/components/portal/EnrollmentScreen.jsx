import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Car,
  KeyRound,
  Wrench,
  Award,
  ChevronRight,
  Gift,
  Check,
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
      });
      setStep('otp');
      const testCode = res.debug_otp || res.dummy_otp || '123456';
      setActiveTestCode(testCode);
      setInfoMsg(res.message || 'OTP sent successfully to your WhatsApp!');
    } catch (err) {
      setError(err.message || 'Failed to request OTP. Please verify details.');
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
      setInfoMsg(res.message || 'A new code has been sent to your WhatsApp.');
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Dynamic Ambient Background Lights */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-100/50 via-blue-50/40 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[500px] h-[500px] bg-gradient-to-tl from-amber-100/50 via-rose-50/30 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <nav className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between border-b border-slate-200/90 bg-white/80 backdrop-blur-md">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 shadow-xs flex items-center justify-center shrink-0">
            <img
              src="/bellad-logo.png"
              alt="Bellad Automobiles"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <div>
            <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 block">
              Bellad &amp; Company
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block -mt-0.5 font-mono">
              Automotive Loyalty Cloud
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            PORTAL v2.4 LIVE
          </span>
          <span className="text-xs text-slate-600 border border-slate-200 bg-white px-2.5 py-1 rounded-lg font-mono shadow-xs">
            WhatsApp 2FA
          </span>
        </div>
      </nav>

      {/* Main Hero Grid */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Brand & Benefits Presentation */}
        <div className="lg:col-span-7 space-y-6 sm:space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-mono font-bold text-amber-800">
              <span>—</span>
              <span>THE BELLAD ADVANTAGE</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-tight">
              Drive more. Earn more.<br />
              <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 bg-clip-text text-transparent">
                Every service, instant rewards.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
              Experience India&apos;s premier automotive loyalty program. Earn points on every scheduled service, Bodyshop repair, in-house finance &amp; insurance renewal, with direct cash deduction at our dealership cashier desks.
            </p>
          </div>

          {/* Feature Badge Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Service &amp; Bodyshop</h2>
                <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">
                  Earn points on parts &amp; labour. Get up to 40% discount on bodyshop bills.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">In-House Insurance</h2>
                <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">
                  Cashless policy renewals + 50 bonus PTS credited directly to your pass.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Amazon-Style Gift Cards</h2>
                <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">
                  Redeem digital gift cards with 16-character code and PIN anytime.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">In-House Finance &amp; Trade-In</h2>
                <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">
                  +100 PTS on HDFC / Kotak loans and up to +200 PTS on vehicle exchange.
                </p>
              </div>
            </div>
          </div>

          {/* Social Proof Strip */}
          <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-slate-500 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-slate-700">15,000+ Enrolled Drivers</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-semibold text-slate-700">₹2.4 Cr+ Rewards Redeemed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-semibold text-slate-700">Hubballi &bull; Belagavi &bull; Vijayapura</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Login / Enrollment Card (Light Mode) */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl relative text-slate-900">
            {/* Card Accent Top Bar */}
            <div className="absolute top-0 left-6 right-6 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-b" />

            {/* Step Progress Tracker */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                  step === 'phone' ? 'bg-amber-400 text-slate-950' : 'bg-emerald-600 text-white'
                }`}>
                  {step === 'otp' ? <Check className="w-3.5 h-3.5" /> : '1'}
                </div>
                <span className={`text-xs font-bold ${step === 'phone' ? 'text-slate-900' : 'text-slate-500'}`}>
                  Details
                </span>
              </div>

              <div className="flex-1 h-0.5 mx-3 bg-slate-200">
                <div className={`h-full bg-amber-500 transition-all duration-300 ${
                  step === 'otp' ? 'w-full' : 'w-0'
                }`} />
              </div>

              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                  step === 'otp' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  2
                </div>
                <span className={`text-xs font-bold ${step === 'otp' ? 'text-slate-900' : 'text-slate-400'}`}>
                  WhatsApp OTP
                </span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5 shadow-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Info Message */}
            {infoMsg && !error && (
              <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start gap-2.5 shadow-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{infoMsg}</span>
              </div>
            )}

            {/* Step 1: Phone, Name & Aadhaar Enrollment */}
            {step === 'phone' ? (
              <form onSubmit={handleRequestOtp} className="mt-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="customer-name" className="text-xs font-bold text-slate-700">
                      Full Name
                    </label>
                    <span className="text-[10px] text-slate-400">As per vehicle RC</span>
                  </div>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="customer-name"
                      type="text"
                      value={name}
                      onChange={handleNameChange}
                      placeholder="e.g. Ramesh Patil"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500 transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Letters only (no numbers allowed)</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="customer-aadhaar" className="text-xs font-bold text-slate-700">
                      Aadhaar Card Number
                    </label>
                    <span className="text-[10px] text-emerald-600 font-mono font-bold">12-Digit UID</span>
                  </div>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-mono tracking-widest placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500 transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Used for verified one-customer one-account access</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="customer-phone" className="text-xs font-bold text-slate-700">
                      Mobile Number (WhatsApp)
                    </label>
                    <span className="text-[10px] text-slate-400">Receive instant OTP</span>
                  </div>
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
                      className="w-full pl-14 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-mono tracking-wider placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500 transition"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black rounded-xl text-sm tracking-wide shadow-md shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
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
              /* Step 2: 6-Digit WhatsApp OTP Verification */
              <form onSubmit={handleVerifyOtp} className="mt-6 space-y-5">
                <div className="flex items-center justify-between pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone');
                      setError('');
                      setInfoMsg('');
                    }}
                    className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Change Details
                  </button>
                  <span className="text-xs font-mono font-bold text-amber-600">+91 {phone}</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 text-center">
                    Enter 6-digit WhatsApp OTP
                  </label>
                  <div className="flex justify-between gap-2">
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
                        className="w-11 h-12 text-center text-lg font-black font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-xs"
                      />
                    ))}
                  </div>

                  {/* Demo Helper Box */}
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                      Test Passcode: <strong className="font-mono text-slate-900 font-bold">{activeTestCode}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtp(String(activeTestCode).padStart(6, '0').slice(0, 6).split(''))}
                      className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 font-black rounded-lg text-slate-950 text-[11px] transition cursor-pointer shadow-xs"
                    >
                      Auto-Fill
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black rounded-xl text-sm tracking-wide shadow-md shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <>
                      <span>Verify &amp; Open Portal</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium underline transition cursor-pointer"
                  >
                    Didn&apos;t receive code? Resend
                  </button>
                </div>
              </form>
            )}

            {/* Encrypted Notice */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center space-x-2 text-slate-400 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>256-Bit Encrypted Dealership Security</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-5 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
        <div>
          &copy; {new Date().getFullYear()} Bellad Automobile Corporation. All rights reserved.
        </div>
        <div className="flex items-center space-x-4">
          <a
            href="/terms-and-conditions"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-700 transition underline"
          >
            Terms of Service
          </a>
          <span>&bull;</span>
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-700 transition underline"
          >
            Privacy Policy
          </a>
          <span>&bull;</span>
          <span className="text-slate-400 font-mono">Belagavi &bull; Hubballi</span>
        </div>
      </footer>
    </div>
  );
}
