import React, { useState, useEffect } from 'react';
import {
  Gift,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowRight,
  Info,
  Car,
  ChevronDown,
  Building,
  Phone,
  User,
  Heart,
  Lock,
} from 'lucide-react';
import ApiService from '../services/api';

export const PublicGiftClaimScreen = () => {
  // Extract token from URL /gift/:token
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const token = pathParts[1] || '';

  const [loading, setLoading] = useState(true);
  const [giftData, setGiftData] = useState(null);
  const [loadError, setLoadError] = useState('');

  // Form states
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [dpdpConsent, setDpdpConsent] = useState(true);

  // Submission states
  const [submitting, setSubmitting] = useState(false);
  const [claimResult, setClaimResult] = useState(null);
  const [rejectionNotice, setRejectionNotice] = useState(null);
  const [formError, setFormError] = useState('');

  // UI accordion for T&C
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError('Invalid or missing gift claim link.');
      setLoading(false);
      return;
    }

    setLoading(true);
    ApiService.getGiftByClaimToken(token)
      .then((res) => {
        setGiftData(res.data || null);
      })
      .catch((err) => {
        setLoadError(err.message || 'Could not load gift voucher details. Link may be invalid or expired.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setRejectionNotice(null);

    const cleanPhone = String(receiverPhone).replace(/[^\d]/g, '');
    if (cleanPhone.length !== 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!receiverName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }

    if (!dpdpConsent) {
      setFormError('Consent is required to verify your eligibility under DPDP principles.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await ApiService.claimGift(token, {
        receiver_name: receiverName.trim(),
        receiver_phone: cleanPhone,
        dpdp_consent: true,
      });

      if (res.data?.success) {
        setClaimResult(res.data);
      } else if (res.data?.status === 'rejected_existing_customer' || res.data?.code === 'rejected_existing_customer') {
        setRejectionNotice(res.data.message);
      } else {
        setFormError(res.data?.message || 'Failed to claim gift. Please try again.');
      }
    } catch (err) {
      if (err.message && (err.message.includes('existing') || err.message.includes('vehicle'))) {
        setRejectionNotice(err.message);
      } else {
        setFormError(err.message || 'Error claiming gift voucher.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* ── Top Brand Bar ── */}
      <header className="max-w-2xl w-full mx-auto flex items-center justify-between py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-white flex items-center gap-2">
              Bellad &amp; Company
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-400/30 uppercase tracking-widest">
                e-Gift Card
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Official Automobile Dealership Loyalty Program</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Secure Claim</span>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="max-w-xl w-full mx-auto my-8">
        {loading ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-10 text-center space-y-4 backdrop-blur-md">
            <div className="w-12 h-12 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">Loading your gift details...</h3>
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl text-slate-900 text-center space-y-4">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black">Gift Unavailable</h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">{loadError}</p>
            <div className="pt-2">
              <a
                href="/"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Go to Homepage
              </a>
            </div>
          </div>
        ) : claimResult ? (
          /* ── SUCCESS SCREEN: Gift Claimed ── */
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl text-slate-900 text-center space-y-6 animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Gift Claimed Successfully
              </span>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 mt-3">
                +{claimResult.points_credited?.toLocaleString('en-IN')} Loyalty Points Added!
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Worth ₹{Number(claimResult.amount_inr || 0).toLocaleString('en-IN')} in Bellad Loyalty Value
              </p>
            </div>

            {/* Loyalty Wallet Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-3">
              <div className="flex justify-between items-center text-xs text-slate-600 pb-2 border-b border-slate-200">
                <span>Gift Voucher Code</span>
                <span className="font-mono font-bold text-slate-900">{giftData.gift_code}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600 pb-2 border-b border-slate-200">
                <span>Sender</span>
                <span className="font-bold text-slate-900">{giftData.sender_name}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600 pb-2 border-b border-slate-200">
                <span>Points Expiry</span>
                <span className="font-bold text-emerald-700">Valid for 12 Months (365 Days)</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1">
                <span className="font-bold text-slate-900">Registered Mobile</span>
                <span className="font-mono font-bold text-indigo-700">{receiverPhone}</span>
              </div>
            </div>

            {/* Dealership Instructions */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-left text-xs space-y-1.5 text-amber-950">
              <span className="font-black flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-amber-800">
                <Building className="w-3.5 h-3.5" /> How to Redeem Your Points
              </span>
              <p className="leading-relaxed">
                Visit any <strong>Bellad &amp; Company</strong> dealership (Hubli, Belgaum, Bangalore). Mention your phone number at the billing counter to redeem these points directly for vehicle service, accessories, or booking discount!
              </p>
            </div>

            <div className="pt-2">
              <a
                href="/portal"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl transition shadow-lg shadow-indigo-600/30"
              >
                <span>View My Bellad Loyalty Wallet</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        ) : rejectionNotice ? (
          /* ── REJECTION SCREEN: Receiver is an existing vehicle owner ── */
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl text-slate-900 space-y-5 animate-fadeIn">
            <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
              <Car className="w-7 h-7" />
            </div>

            <div className="text-center">
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                New Customers Only Rule
              </span>
              <h2 className="text-xl font-black tracking-tight text-slate-900 mt-3">
                Gift Not Applicable to Existing Owners
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed mt-2 max-w-md mx-auto">
                {rejectionNotice}
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2 text-slate-700">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Info className="w-4 h-4 text-indigo-600" />
                <span>Automatic Refund Completed:</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Because this welcome gift was reserved exclusively for friends who haven't purchased a vehicle from Bellad yet, the full gift value (₹{giftData?.amount_inr} / {giftData?.points_equivalent} PTS) has been <strong>automatically returned to {giftData?.sender_name}</strong>.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <a
                href="/portal"
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl text-center transition"
              >
                Log In to Your Existing Account
              </a>
              <button
                type="button"
                onClick={() => setRejectionNotice(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl text-center transition"
              >
                Try Another Mobile Number
              </button>
            </div>
          </div>
        ) : (
          /* ── MAIN CLAIM FORM: Amazon Style Card ── */
          <div className="space-y-6 animate-fadeIn">
            {/* Visual Digital Gift Card */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-gradient-to-br from-indigo-700 via-indigo-900 to-slate-900 p-7 text-white space-y-6">
              {/* Background Glow */}
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 bg-black/30 px-3 py-1 rounded-full border border-amber-300/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Personal Gift Card</span>
                </div>
                <span className="font-mono text-xs text-indigo-200 font-bold tracking-wider">
                  {giftData.gift_code}
                </span>
              </div>

              <div className="space-y-2 relative z-10">
                <div className="text-xs text-indigo-200 font-semibold flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                  <span>From: <strong>{giftData.sender_name}</strong></span>
                </div>
                <blockquote className="text-sm font-medium italic text-slate-100 bg-white/10 p-3.5 rounded-2xl border border-white/10 leading-relaxed">
                  "{giftData.custom_message || 'Enjoy this special gift at Bellad Dealerships!'}"
                </blockquote>
              </div>

              {/* Value Banner */}
              <div className="pt-2 border-t border-white/10 flex items-end justify-between relative z-10">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200 block">
                    Gift Value
                  </span>
                  <span className="text-3xl font-black font-mono text-amber-300">
                    ₹{Number(giftData.amount_inr).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200 block">
                    Wallet Credit
                  </span>
                  <span className="text-xl font-black font-mono text-emerald-400">
                    +{Number(giftData.points_equivalent).toLocaleString('en-IN')} PTS
                  </span>
                </div>
              </div>
            </div>

            {/* Status Checks if Not Claimable */}
            {!giftData.is_claimable ? (
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl text-center space-y-3 text-slate-800">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {giftData.claim_status === 'claimed'
                    ? 'This Gift Card Has Already Been Claimed'
                    : giftData.claim_status === 'expired'
                    ? 'This Gift Voucher Has Expired'
                    : 'Gift Currently Inactive'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {giftData.claim_status === 'claimed'
                    ? 'Each Bellad e-gift voucher is single-use only and moves directly to the first claimant’s wallet.'
                    : 'Unclaimed gift links expire after 30 days and the value is returned to the sender.'}
                </p>
              </div>
            ) : (
              /* Receiver Claim Form Card */
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xl text-slate-900 space-y-5">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-slate-900">
                    Claim into Your Bellad Loyalty Wallet
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Enter your mobile number to receive your +{giftData.points_equivalent?.toLocaleString('en-IN')} points instantly.
                  </p>
                </div>

                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-800 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleClaimSubmit} className="space-y-4">
                  {/* Receiver Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Your Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Pooja Kulkarni"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        className="w-full h-11 pl-10 pr-3.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                      />
                    </div>
                  </div>

                  {/* Receiver Mobile Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Your Mobile Number (10 Digits) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength="10"
                        required
                        placeholder="9876543210"
                        value={receiverPhone}
                        onChange={(e) => setReceiverPhone(e.target.value.replace(/[^\d]/g, ''))}
                        className="w-full h-11 pl-12 pr-3.5 text-sm font-black font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                      />
                    </div>
                  </div>

                  {/* DPDP Act Consent Checkbox */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      id="dpdp-consent"
                      checked={dpdpConsent}
                      onChange={(e) => setDpdpConsent(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="dpdp-consent" className="text-[11px] leading-relaxed cursor-pointer font-medium text-slate-600">
                      I agree to the <strong>Terms &amp; Conditions</strong> and give consent to Bellad &amp; Co. to verify my customer status under India’s DPDP Act.
                    </label>
                  </div>

                  {/* Claim Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm transition shadow-lg shadow-indigo-600/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Verifying &amp; Crediting Wallet...
                      </span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Claim ₹{giftData.amount_inr} ({giftData.points_equivalent} PTS) to Wallet</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Terms and Conditions Accordion */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowTerms(!showTerms)}
                    className="w-full flex items-center justify-between text-xs font-bold text-slate-500 hover:text-slate-800 transition py-1"
                  >
                    <span className="flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-indigo-600" />
                      Important Gift Voucher Terms &amp; Conditions
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTerms ? 'rotate-180' : ''}`} />
                  </button>

                  {showTerms && (
                    <ul className="mt-2.5 space-y-1.5 text-[11px] text-slate-500 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      {giftData.terms_and_conditions?.map((t, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-indigo-600 font-bold">•</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="max-w-2xl w-full mx-auto py-4 border-t border-white/10 text-center text-xs text-slate-500">
        <p>© 2026 Bellad Automobile Corporation. All rights reserved. Loyalty Program.</p>
      </footer>
    </div>
  );
};

export default PublicGiftClaimScreen;
