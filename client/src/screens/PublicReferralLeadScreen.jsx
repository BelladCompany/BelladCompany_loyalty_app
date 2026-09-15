import React, { useState, useEffect } from 'react';
import { Sparkles, Phone, ShieldCheck, CheckCircle2, Copy, Share2, AlertCircle, RefreshCw } from 'lucide-react';
import ApiService from '../services/api';

export const PublicReferralLeadScreen = () => {
  // Extract referrer code from URL path (e.g. /refer/BAC-100008 => BAC-100008)
  const referrerCode = window.location.pathname.split('/refer/')[1] || '';
  const [referrerInfo, setReferrerInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [infoError, setInfoError] = useState('');

  // Form fields
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadAadhaar, setLeadAadhaar] = useState('');

  // Flow control & OTP
  const [step, setStep] = useState(1); // 1: Form, 2: OTP, 3: Success
  const [otp, setOtp] = useState('');
  const [debugOtp, setDebugOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Generated code result
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!referrerCode) {
      setInfoError('Invalid referral link.');
      setLoadingInfo(false);
      return;
    }

    setLoadingInfo(true);
    setInfoError('');

    // Fetch referrer info
    ApiService.getPublicReferralInfo(referrerCode)
      .then((res) => {
        setReferrerInfo(res.data);
      })
      .catch((err) => {
        setInfoError(err.message || 'Invalid or expired referral link.');
      })
      .finally(() => setLoadingInfo(false));
  }, [referrerCode]);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!leadName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    const cleanPhone = leadPhone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    const cleanAadhaar = leadAadhaar.replace(/\D/g, '');
    if (cleanAadhaar.length !== 12) {
      setErrorMessage('Aadhaar Number must be exactly 12 numeric digits.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await ApiService.requestPublicLeadOtp({
        referrer_code: referrerCode,
        lead_name: leadName.trim(),
        lead_phone: cleanPhone,
        lead_aadhaar: cleanAadhaar,
      });

      if (res.debug_otp) setDebugOtp(res.debug_otp);
      setStep(2);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to send OTP. Please check details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!otp || otp.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit OTP code sent to your phone.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await ApiService.verifyPublicLeadOtp({
        referrer_code: referrerCode,
        lead_name: leadName.trim(),
        lead_phone: leadPhone.replace(/\D/g, ''),
        lead_aadhaar: leadAadhaar.replace(/\D/g, ''),
        otp: otp.trim(),
      });

      setGeneratedCode(res.generated_code);
      setStep(3);
    } catch (err) {
      setErrorMessage(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const text = `Hi! My vehicle purchase referral code is *${generatedCode}*. Presenting this at purchase for loyalty bonus benefits!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-slate-800 border-2 border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Vehicle Purchase Referral</h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Bellad & Company Loyalty Rewards
          </p>
        </div>

        {/* Loading / Error States for Referrer Link */}
        {loadingInfo ? (
          <div className="py-8 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Loading referral details…</p>
          </div>
        ) : infoError ? (
          <div className="p-4 bg-rose-950/60 border border-rose-600/50 rounded-xl text-rose-200 text-sm font-semibold text-center space-y-1">
            <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
            <p>{infoError}</p>
          </div>
        ) : (
          <>
            {/* Referrer Banner */}
            <div className="p-3.5 bg-indigo-950/50 border border-indigo-500/30 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-400 uppercase font-extrabold tracking-wider">Referred By</span>
              <span className="font-extrabold text-indigo-300 text-sm">{referrerInfo?.referrer_name}</span>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-200 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* STEP 1: Registration Form */}
            {step === 1 && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-300 tracking-wider mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="w-full h-12 px-4 bg-slate-900 border border-slate-700 rounded-xl font-semibold text-white focus:outline-none focus:border-indigo-500 text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-300 tracking-wider mb-1">
                    Mobile Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full h-12 pl-11 pr-4 bg-slate-900 border border-slate-700 rounded-xl font-mono font-bold text-white focus:outline-none focus:border-indigo-500 text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-300 tracking-wider mb-1">
                    Aadhaar Card Number *
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      maxLength={12}
                      placeholder="12-digit Aadhaar number"
                      value={leadAadhaar}
                      onChange={(e) => setLeadAadhaar(e.target.value.replace(/\D/g, ''))}
                      className="w-full h-12 pl-11 pr-4 bg-slate-900 border border-slate-700 rounded-xl font-mono font-bold text-white focus:outline-none focus:border-indigo-500 text-base"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    🔒 Used solely to verify buyer identity during vehicle purchase cross-check.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-13 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Sending OTP…' : 'Verify Phone & Get Code →'}
                </button>
              </form>
            )}

            {/* STEP 2: Enter OTP */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-center space-y-1">
                  <p className="text-xs font-bold text-slate-300">OTP Sent to Mobile</p>
                  <p className="text-lg font-mono font-extrabold text-indigo-400">+91 {leadPhone}</p>
                  {debugOtp && (
                    <p className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/50 py-1 rounded">
                      DEV OTP: {debugOtp}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-300 tracking-wider text-center mb-2">
                    Enter 6-Digit Verification OTP
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full h-14 text-center tracking-[0.5em] font-mono font-black text-2xl bg-slate-900 border-2 border-indigo-500 rounded-xl text-white focus:outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setErrorMessage(''); }}
                    disabled={isSubmitting}
                    className="flex-1 h-12 bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm rounded-xl"
                  >
                    ← Back
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-2 h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base rounded-xl shadow-lg transition-all"
                  >
                    {isSubmitting ? 'Verifying…' : 'Confirm & Generate Code'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Code Generated Success */}
            {step === 3 && (
              <div className="space-y-6 text-center animate-in fade-in duration-300">
                <div className="p-4 bg-emerald-950/60 border-2 border-emerald-500/50 rounded-2xl space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h3 className="text-xl font-black text-white">Referral Code Generated!</h3>
                  
                  <div className="p-4 bg-slate-900 border-2 border-indigo-500 rounded-xl space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                      Your Unique Lead Code
                    </span>
                    <span className="font-mono font-black text-3xl text-emerald-400 tracking-wider block">
                      {generatedCode}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-300 leading-relaxed px-2">
                    📌 Present this code to sales staff when buying your vehicle. Bonus points will be credited automatically upon vehicle registration certificate (RC) completion!
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex-1 h-12 bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copied to Clipboard!' : 'Copy Code'}
                  </button>

                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Save on WhatsApp
                  </button>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default PublicReferralLeadScreen;
