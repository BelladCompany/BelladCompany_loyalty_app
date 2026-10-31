import React, { useState, useEffect } from 'react';
import {
  X,
  Gift,
  Coins,
  CreditCard,
  Sparkles,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  QrCode,
  Smartphone,
  ExternalLink,
  Lock,
  RefreshCw,
  Clock,
} from 'lucide-react';
import ApiService from '../../services/api';

const PRESET_AMOUNTS = [
  { amount: 250, points: 1000, label: '₹250', tag: null },
  { amount: 500, points: 2000, label: '₹500', tag: 'POPULAR' },
  { amount: 1000, points: 4000, label: '₹1,000', tag: 'BEST VALUE' },
  { amount: 2000, points: 8000, label: '₹2,000', tag: null },
  { amount: 5000, points: 20000, label: '₹5,000', tag: 'VIP PASS' },
];

const CARD_THEMES = [
  { id: 'celebration', label: 'Celebration', gradient: 'from-indigo-600 via-purple-600 to-indigo-800' },
  { id: 'festival', label: 'Festive Gold', gradient: 'from-amber-600 via-yellow-600 to-amber-800' },
  { id: 'service', label: 'Service Care', gradient: 'from-emerald-600 via-teal-600 to-emerald-800' },
  { id: 'special', label: 'VIP Drive', gradient: 'from-slate-900 via-slate-800 to-slate-950' },
];

export const SendGiftModal = ({
  isOpen,
  onClose,
  customer,
  currentBalance = 0,
  initialAmount = 1000,
  onGiftSent,
}) => {
  // Navigation: 'form' | 'scanner' | 'success'
  const [currentStep, setCurrentStep] = useState('form');

  // Funding Mode: 'razorpay' (default) | 'points'
  const [fundingMode, setFundingMode] = useState('razorpay');

  // Price & Denomination
  const [amountInput, setAmountInput] = useState(String(initialAmount || 1000));
  const [pointsInput, setPointsInput] = useState('2000'); // for points mode (2000 pts = ₹500)

  // Sender & Personalization
  const [senderName, setSenderName] = useState(customer?.name || customer?.customer_name || '');
  const [senderPhone, setSenderPhone] = useState(customer?.phone || customer?.phones?.[0] || '');
  const [customMessage, setCustomMessage] = useState('Here is a special gift voucher for your vehicle service or new purchase at Bellad & Company!');
  const [cardTheme, setCardTheme] = useState('celebration');

  // Scanner & Order Data
  const [orderData, setOrderData] = useState(null);
  const [countdown, setCountdown] = useState(600); // 10 minutes timer
  const [verifying, setVerifying] = useState(false);

  // Success & Share state
  const [createdGift, setCreatedGift] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedVpa, setCopiedVpa] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sync props when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('form');
      setFundingMode('razorpay');
      if (initialAmount) setAmountInput(String(initialAmount));
      setErrorMessage('');
      setOrderData(null);
      setCreatedGift(null);
      setCountdown(600);
      setVerifying(false);

      if (customer?.name || customer?.customer_name) {
        setSenderName(customer.name || customer.customer_name);
      }
      if (customer?.phone || customer?.phones?.[0]) {
        setSenderPhone(customer.phone || customer.phones[0]);
      }
    }
  }, [isOpen, initialAmount, customer]);

  // Countdown timer when scanner is active
  useEffect(() => {
    if (currentStep !== 'scanner') return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStep]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amountInput || '0') || 0;
  const pointsFromAmount = Math.floor(numAmount * 4);

  const pointsNum = parseInt(pointsInput || '0', 10) || 0;
  const inrFromPoints = Math.floor(pointsNum / 4);

  // Quick message presets
  const applyMessage = (msg) => setCustomMessage(msg);

  // ──────────────────────────────────────────────────────────────────────────
  // Step 1: Proceed to Payment / Open Razorpay Scanner
  // ──────────────────────────────────────────────────────────────────────────
  const handleProceedToPayment = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (numAmount < 100) {
      setErrorMessage('Minimum gift purchase amount is ₹100.');
      return;
    }
    if (numAmount > 25000) {
      setErrorMessage('Maximum gift purchase amount is ₹25,000 per transaction.');
      return;
    }

    setLoading(true);
    try {
      const res = await ApiService.createGiftFromRazorpay({
        sender_customer_id: customer?.customer_id || customer?.id,
        sender_phone: senderPhone,
        sender_name: senderName || 'Generous Friend',
        amount_inr: numAmount,
        custom_message: customMessage,
        card_theme: cardTheme,
      });

      const data = res.data;
      setOrderData(data);
      setCountdown(600);
      setCurrentStep('scanner');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to initialize payment gateway order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Step 2: Verify Razorpay Payment (Standard / Scanner / Simulation)
  // ──────────────────────────────────────────────────────────────────────────
  const handleVerifyPayment = async (simulated = false) => {
    if (!orderData) return;
    setVerifying(true);
    setErrorMessage('');

    try {
      const paymentId = simulated
        ? `pay_sim_${Date.now()}`
        : `pay_upi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const verifyRes = await ApiService.verifyRazorpayPayment({
        razorpay_order_id: orderData.razorpay_order_id,
        razorpay_payment_id: paymentId,
        razorpay_signature: simulated ? 'mock_sig' : 'upi_scan_sig',
        claim_token: orderData.claim_token,
      });

      const giftResult = verifyRes.data || verifyRes;
      const finalGift = {
        ...giftResult,
        claim_token: orderData.claim_token,
        claim_url: giftResult.claim_url || `${window.location.origin}/gift/${orderData.claim_token}`,
        pin_code: giftResult.pin_code || orderData.pin_code || '4821',
      };

      setCreatedGift(finalGift);
      setCurrentStep('success');

      if (onGiftSent) onGiftSent(finalGift);
    } catch (err) {
      setErrorMessage(err.message || 'Payment verification failed. Please try again or contact support.');
    } finally {
      setVerifying(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Optional: Launch Full Razorpay Checkout Modal (if key & script available)
  // ──────────────────────────────────────────────────────────────────────────
  const handleOpenRazorpayCheckout = () => {
    if (!orderData) return;

    if (window.Razorpay && orderData.key_id && !orderData.razorpay_order_id.startsWith('order_mock_')) {
      const options = {
        key: orderData.key_id,
        amount: Math.round(orderData.amount_inr * 100),
        currency: 'INR',
        name: 'Bellad & Company',
        description: `Loyalty Gift Voucher (+${pointsFromAmount.toLocaleString()} PTS)`,
        order_id: orderData.razorpay_order_id,
        prefill: {
          name: senderName,
          contact: senderPhone,
        },
        theme: { color: '#4f46e5' },
        handler: async (response) => {
          try {
            setVerifying(true);
            const verifyRes = await ApiService.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              claim_token: orderData.claim_token,
            });

            const finalGift = {
              ...verifyRes.data,
              claim_token: orderData.claim_token,
              claim_url: `${window.location.origin}/gift/${orderData.claim_token}`,
              pin_code: verifyRes.data?.pin_code || orderData.pin_code || '4821',
            };
            setCreatedGift(finalGift);
            setCurrentStep('success');
            if (onGiftSent) onGiftSent(finalGift);
          } catch (e) {
            setErrorMessage('Payment verification error after checkout. Please contact support.');
          } finally {
            setVerifying(false);
          }
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } else {
      // In test mode or when mock order, verify directly
      handleVerifyPayment(true);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Alternative Flow: Gift from Points
  // ──────────────────────────────────────────────────────────────────────────
  const handleSendFromPoints = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (pointsNum <= 0 || pointsNum % 4 !== 0) {
      setErrorMessage('Points to share must be a multiple of 4 (4 PTS = ₹1).');
      return;
    }
    if (pointsNum > currentBalance) {
      setErrorMessage(`You only have ${currentBalance.toLocaleString()} PTS in your balance.`);
      return;
    }
    if (inrFromPoints < 100) {
      setErrorMessage('Minimum gift value is ₹100 (400 Points).');
      return;
    }

    setLoading(true);
    try {
      const res = await ApiService.createGiftFromPoints({
        sender_customer_id: customer?.customer_id || customer?.id,
        sender_phone: senderPhone,
        sender_name: senderName || 'Generous Friend',
        points_to_share: pointsNum,
        custom_message: customMessage,
        card_theme: cardTheme,
      });

      const data = res.data;
      setCreatedGift(data);
      setCurrentStep('success');
      if (onGiftSent) onGiftSent(data);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create gift from points.');
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Clipboard Helpers
  // ──────────────────────────────────────────────────────────────────────────
  const copyFullMessage = () => {
    if (!createdGift) return;
    const pin = createdGift.pin_code || '4821';
    const text = `🎁 *You received a ₹${Number(createdGift.amount_inr).toLocaleString('en-IN')} Bellad & Co Gift Card from ${senderName || 'a friend'}!*\n\n"${customMessage}"\n\n💳 *Card Code:* ${createdGift.gift_code}\n🔐 *Security PIN:* ${pin}\n💰 *Value:* ₹${Number(createdGift.amount_inr).toLocaleString('en-IN')} (+${Number(createdGift.points_equivalent).toLocaleString('en-IN')} PTS)\n\n👉 *Claim your gift in 1 tap here:* ${createdGift.claim_url}\n\n*(Claim directly with the link above, or paste the Card Code & PIN in your Bellad Customer Portal to add points instantly!)*`;
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const copyUpiId = () => {
    const vpa = orderData?.upi_vpa || 'belladandcompany@icici';
    navigator.clipboard.writeText(vpa);
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // QR Code URL (Standard UPI Protocol)
  const upiUrl = orderData?.upi_url || `upi://pay?pa=belladandcompany@icici&pn=Bellad%20and%20Company&am=${numAmount.toFixed(2)}&cu=INR&tn=Gift%20Card%20${orderData?.gift_code || 'NEW'}`;
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(upiUrl)}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">

        {/* ── Modal Header ── */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-2.5 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2 truncate">
                <span>Send a Gift Card</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  Razorpay UPI
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-indigo-200 font-medium truncate">
                Select price · Pay via Scanner · Instant WhatsApp share (Amazon style)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Error Banner ── */}
        {errorMessage && (
          <div className="p-3 mx-4 sm:mx-6 mt-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            STEP 1: PRICE SELECTION & GREETING FORM
           ══════════════════════════════════════════════════════════════════════ */}
        {currentStep === 'form' && (
          <div className="p-5 sm:p-7 space-y-5 overflow-y-auto flex-1">
            {/* Funding Switch (Buy with Razorpay vs Points) */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setFundingMode('razorpay');
                  setErrorMessage('');
                }}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                  fundingMode === 'razorpay'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>Buy &amp; Send (Razorpay Scanner)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFundingMode('points');
                  setErrorMessage('');
                }}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                  fundingMode === 'points'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Coins className="w-4 h-4 text-amber-500" />
                <span>Send from Points ({currentBalance.toLocaleString()} PTS)</span>
              </button>
            </div>

            {/* ── MODE A: RAZORPAY SCANNER & GATEWAY (PRIMARY) ── */}
            {fundingMode === 'razorpay' ? (
              <form onSubmit={handleProceedToPayment} className="space-y-4">
                {/* 1. Price Selection */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Select Gift Card Price *
                    </label>
                    <span className="text-[11px] font-bold text-indigo-600 font-mono">
                      ₹1 = 4 Loyalty Points
                    </span>
                  </div>

                  {/* Preset Denominations Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2.5">
                    {PRESET_AMOUNTS.map((p) => {
                      const isSelected = amountInput === String(p.amount);
                      return (
                        <button
                          key={p.amount}
                          type="button"
                          onClick={() => setAmountInput(String(p.amount))}
                          className={`p-2 sm:p-2.5 rounded-2xl border transition-all text-center relative cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25 ring-2 ring-indigo-400/40'
                              : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          {p.tag && (
                            <span
                              className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-tighter ${
                                isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-white'
                              }`}
                            >
                              {p.tag}
                            </span>
                          )}
                          <span className="block text-xs sm:text-sm font-black">{p.label}</span>
                          <span
                            className={`block text-[10px] font-semibold mt-0.5 ${
                              isSelected ? 'text-indigo-200' : 'text-slate-500'
                            }`}
                          >
                            +{p.points.toLocaleString()} PTS
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Price Input */}
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-black text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="100"
                      step="50"
                      max="25000"
                      required
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      placeholder="Or enter custom amount (e.g. 1500)"
                      className="w-full h-11 pl-9 pr-4 text-base font-black font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                    />
                  </div>

                  {/* Realtime Recipient Benefits Strip */}
                  <div className="mt-2 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-950">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Recipient will receive:
                    </span>
                    <span className="font-black font-mono text-emerald-700 text-sm">
                      ₹{numAmount.toLocaleString('en-IN')} (+{pointsFromAmount.toLocaleString('en-IN')} PTS)
                    </span>
                  </div>
                </div>

                {/* 2. Visual Theme Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Choose Card Design
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CARD_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setCardTheme(theme.id)}
                        className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                          cardTheme === theme.id
                            ? 'border-indigo-600 ring-2 ring-indigo-400/40 bg-indigo-50/50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className={`h-8 rounded-lg bg-gradient-to-r ${theme.gradient} mb-1 flex items-center justify-center text-white text-[10px] font-bold shadow-xs`}>
                          🎁 Bellad Pass
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 block truncate">
                          {theme.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Sender Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Your Name (Sender) *
                    </label>
                    <input
                      type="text"
                      required
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="e.g. Mahesh Bhajantri"
                      className="w-full h-11 px-3.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Your Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full h-11 px-3.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                    />
                  </div>
                </div>

                {/* 4. Custom Greeting Message */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Greeting Message
                    </label>
                    <div className="flex gap-1.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => applyMessage('Happy Birthday! Enjoy your drive with Bellad & Co.')}
                        className="text-indigo-600 hover:underline font-bold"
                      >
                        Birthday
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => applyMessage('Congratulations on your vehicle! Here is a gift for your service.')}
                        className="text-indigo-600 hover:underline font-bold"
                      >
                        Vehicle
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows="2"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Enter your personal gift message..."
                    className="w-full p-3 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition resize-none"
                  />
                </div>

                {/* 5. Proceed CTA */}
                <button
                  type="submit"
                  disabled={loading || numAmount < 100}
                  className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm transition shadow-lg shadow-indigo-600/25 disabled:opacity-50 flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Opening Payment Gateway...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4 text-amber-300" />
                      <span>Proceed to Pay ₹{numAmount.toLocaleString('en-IN')} (Open Scanner)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* ── MODE B: POINTS BALANCE Gifting ── */
              <form onSubmit={handleSendFromPoints} className="space-y-4">
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-950">
                  <span className="font-semibold">Available Points Balance:</span>
                  <span className="font-mono font-black text-sm text-indigo-700">
                    {currentBalance.toLocaleString()} PTS (≈ ₹{Math.floor(currentBalance / 4)})
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Points to Gift (4 PTS = ₹1) *
                  </label>
                  <input
                    type="number"
                    min="400"
                    step="4"
                    max={currentBalance}
                    required
                    value={pointsInput}
                    onChange={(e) => setPointsInput(e.target.value)}
                    placeholder="e.g. 2000"
                    className="w-full h-11 px-3.5 text-base font-black font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                  />
                  <div className="flex justify-between items-center mt-1.5 text-xs text-slate-500">
                    <span>Gift Monetary Value:</span>
                    <span className="font-black text-emerald-600 font-mono">
                      ₹{inrFromPoints.toLocaleString('en-IN')} Gift
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || pointsNum > currentBalance || inrFromPoints < 100}
                  className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm transition shadow-lg shadow-indigo-600/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? 'Creating Gift...' : `Create ₹${inrFromPoints} Gift (${pointsNum} PTS)`}
                </button>
              </form>
            )}

            {/* Terms Footer */}
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
              <p className="flex items-center gap-1 font-semibold text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Amazon-Style Guaranteed Protection:
              </p>
              <p>
                Once paid, an instant WhatsApp claim link with Security PIN is generated. If unclaimed after 30 days, value is automatically refunded.
              </p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            STEP 2: RAZORPAY PAYMENT GATEWAY & UPI QR SCANNER MODAL
           ══════════════════════════════════════════════════════════════════════ */}
        {currentStep === 'scanner' && orderData && (
          <div className="p-5 sm:p-7 space-y-5 overflow-y-auto flex-1 animate-fadeIn">
            {/* Razorpay Brand Bar */}
            <div className="p-3 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl text-white flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-500/30 flex items-center justify-center font-black text-[11px] text-blue-300">
                  ₹
                </div>
                <div>
                  <span className="font-black block tracking-tight">Razorpay Payment Gateway</span>
                  <span className="text-[10px] text-blue-200">256-Bit Encrypted Secure UPI</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-300 block">Total Due</span>
                <span className="text-sm font-black font-mono text-amber-300">
                  ₹{Number(orderData.amount_inr).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Live QR Scanner Box */}
            <div className="bg-slate-50 border-2 border-dashed border-indigo-200 rounded-3xl p-5 text-center space-y-3.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-extrabold uppercase tracking-wider">
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan to Pay with Any UPI App</span>
              </div>

              {/* Dynamic QR Code */}
              <div className="relative mx-auto w-52 h-52 sm:w-56 sm:h-56 bg-white p-3 rounded-2xl shadow-md border border-slate-200 flex items-center justify-center">
                <img
                  src={qrImageSrc}
                  alt="UPI Payment QR Code"
                  className="w-full h-full object-contain rounded-lg"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-indigo-700 font-black text-xs">
                    UPI
                  </div>
                </div>
              </div>

              {/* Supported UPI Apps */}
              <div className="flex items-center justify-center gap-3 pt-1 text-[11px] font-bold text-slate-600 flex-wrap">
                <span className="px-2 py-0.5 bg-white rounded-md border border-slate-200">Google Pay</span>
                <span className="px-2 py-0.5 bg-white rounded-md border border-slate-200">PhonePe</span>
                <span className="px-2 py-0.5 bg-white rounded-md border border-slate-200">Paytm</span>
                <span className="px-2 py-0.5 bg-white rounded-md border border-slate-200">BHIM</span>
                <span className="px-2 py-0.5 bg-white rounded-md border border-slate-200">CRED</span>
              </div>

              {/* UPI ID & Copy */}
              <div className="flex items-center justify-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">UPI VPA:</span>
                <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {orderData.upi_vpa || 'belladandcompany@icici'}
                </span>
                <button
                  type="button"
                  onClick={copyUpiId}
                  className="text-indigo-600 hover:text-indigo-800 font-bold text-[11px] cursor-pointer"
                >
                  {copiedVpa ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Timer */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-amber-700 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>QR expires in {formatTimer(countdown)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                disabled={verifying}
                onClick={() => handleVerifyPayment(false)}
                className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition shadow-lg shadow-emerald-600/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {verifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Razorpay Payment...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>I Have Paid ₹{Number(orderData.amount_inr).toLocaleString('en-IN')} (Verify)</span>
                  </>
                )}
              </button>

              {/* Instant Test Mode Simulation Button */}
              <button
                type="button"
                disabled={verifying}
                onClick={() => handleVerifyPayment(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Simulate Successful Payment (Instant Demo Verification)</span>
              </button>

              {/* Or Full Razorpay Checkout Popup */}
              {window.Razorpay && (
                <button
                  type="button"
                  onClick={handleOpenRazorpayCheckout}
                  className="w-full py-2 text-center text-xs text-indigo-600 hover:underline font-bold"
                >
                  Or pay with Debit/Credit Card &amp; Netbanking →
                </button>
              )}

              <button
                type="button"
                onClick={() => setCurrentStep('form')}
                className="w-full py-2 text-center text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                ← Change Amount or Details
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            STEP 3: SUCCESS & WHATSAPP SHARING (Amazon Style)
           ══════════════════════════════════════════════════════════════════════ */}
        {currentStep === 'success' && createdGift && (
          <div className="p-6 sm:p-7 space-y-5 text-center overflow-y-auto flex-1 animate-fadeIn">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Payment Received · Gift Card Active
              </span>
              <h4 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                ₹{Number(createdGift.amount_inr).toLocaleString('en-IN')} Gift Ready to Share!
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Your payment was confirmed. Tap below to share the gift link, card code, and PIN via WhatsApp.
              </p>
            </div>

            {/* Gift Card Visual Box */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white text-left space-y-4 shadow-xl border border-indigo-700/50">
              <div className="flex justify-between items-center text-xs">
                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Bellad &amp; Co e-Gift Card
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  Active Voucher
                </span>
              </div>

              {/* Card Code & PIN Display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                <div>
                  <span className="text-[10px] uppercase text-indigo-200 block font-mono">Gift Card Code</span>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="font-mono text-xs sm:text-sm font-black text-amber-300 tracking-wider">
                      {createdGift.gift_code}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(createdGift.gift_code);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="text-indigo-200 hover:text-white p-1 rounded hover:bg-white/10 text-[11px] cursor-pointer"
                      title="Copy Card Code"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase text-indigo-200 block font-mono">4-Digit Security PIN</span>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="font-mono text-sm font-black text-emerald-300 tracking-widest">
                      {createdGift.pin_code || '4821'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(createdGift.pin_code || '4821');
                        setCopiedPin(true);
                        setTimeout(() => setCopiedPin(false), 2000);
                      }}
                      className="text-indigo-200 hover:text-white p-1 rounded hover:bg-white/10 text-[11px] cursor-pointer"
                      title="Copy PIN"
                    >
                      {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Recipient Balance Value */}
              <div className="flex justify-between items-end pt-1">
                <div>
                  <span className="text-[10px] uppercase text-indigo-300 block">Recipient Value</span>
                  <span className="text-2xl font-black font-mono text-amber-300">
                    ₹{Number(createdGift.amount_inr).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-indigo-300 block">Wallet Credit</span>
                  <span className="text-lg font-black font-mono text-emerald-400">
                    +{Number(createdGift.points_equivalent).toLocaleString('en-IN')} PTS
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Action: Share on WhatsApp */}
            <div className="space-y-2.5 pt-1">
              <a
                href={createdGift.whatsapp_share_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-sm sm:text-base transition shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                <Share2 className="w-5 h-5" />
                <span>Share Gift Card on WhatsApp</span>
              </a>

              {/* Copy Full Link & Message */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`Card: ${createdGift.gift_code} | PIN: ${createdGift.pin_code || '4821'} | Link: ${createdGift.claim_url}`}
                  className="flex-1 h-11 px-3.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-700 truncate"
                />
                <button
                  type="button"
                  onClick={copyFullMessage}
                  className="h-11 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700 flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  {copiedAll ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied All</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>Copy All</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              * Recipient can claim instantly in 1 tap with the WhatsApp link, or by entering this <strong>Card Code</strong> and <strong>PIN</strong> in their customer portal.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Done / Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SendGiftModal;
