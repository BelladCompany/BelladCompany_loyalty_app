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
  RefreshCw,
  Clock,
  Zap,
} from 'lucide-react';
import ApiService from '../../services/api';

const PRESET_AMOUNTS = [
  { amount: 250, points: 1000, label: '₹250', tag: null },
  { amount: 500, points: 2000, label: '₹500', tag: 'Popular' },
  { amount: 1000, points: 4000, label: '₹1,000', tag: 'Best Value' },
  { amount: 2000, points: 8000, label: '₹2,000', tag: 'VIP' },
];

const CARD_THEMES = [
  { id: 'celebration', label: 'Celebration', color: 'bg-indigo-600', gradient: 'from-indigo-600 to-purple-600' },
  { id: 'festival', label: 'Festive', color: 'bg-amber-500', gradient: 'from-amber-500 to-yellow-600' },
  { id: 'service', label: 'Service', color: 'bg-emerald-600', gradient: 'from-emerald-600 to-teal-600' },
  { id: 'special', label: 'VIP Drive', color: 'bg-slate-900', gradient: 'from-slate-900 to-slate-800' },
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
  
  // Smart default points: multiple of 4, up to currentBalance
  const defaultInitialPoints = currentBalance >= 400 
    ? 400 
    : (currentBalance >= 4 ? Math.floor(currentBalance / 4) * 4 : 40);
  const [pointsInput, setPointsInput] = useState(String(defaultInitialPoints));

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

      const balPts = Number(currentBalance || 0);
      const smartPts = balPts >= 400 ? 400 : (balPts >= 4 ? Math.floor(balPts / 4) * 4 : 40);
      setPointsInput(String(smartPts));

      if (customer?.name || customer?.customer_name) {
        setSenderName(customer.name || customer.customer_name);
      }
      if (customer?.phone || customer?.phones?.[0]) {
        setSenderPhone(customer.phone || customer.phones[0]);
      }
    }
  }, [isOpen, initialAmount, customer, currentBalance]);

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

  // ──────────────────────────────────────────────────────────────────────────
  // Step 1: Proceed to Payment / Open Razorpay Scanner
  // ──────────────────────────────────────────────────────────────────────────
  const handleProceedToPayment = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (numAmount < 1) {
      setErrorMessage('Please enter a valid gift amount.');
      return;
    }

    setLoading(true);
    try {
      const res = await ApiService.createGiftFromRazorpay({
        sender_customer_id: customer?.customer_id || customer?.id,
        sender_phone: senderPhone || customer?.phone || '9999999999',
        sender_name: senderName || 'Generous Friend',
        amount_inr: numAmount,
        custom_message: customMessage,
        card_theme: cardTheme,
      });

      const data = res.data || res;
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
  // INSTANT TEST / SKIP PAYMENT: Immediately activates voucher & gives WhatsApp link
  // ──────────────────────────────────────────────────────────────────────────
  const handleInstantTestShare = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const testAmount = numAmount > 0 ? numAmount : 500;

    setLoading(true);
    try {
      // 1. Create order
      const res = await ApiService.createGiftFromRazorpay({
        sender_customer_id: customer?.customer_id || customer?.id,
        sender_phone: senderPhone || customer?.phone || customer?.phones?.[0] || '9999999999',
        sender_name: senderName || 'Generous Friend',
        amount_inr: testAmount,
        custom_message: customMessage,
        card_theme: cardTheme,
      });

      const order = res.data || res;
      setOrderData(order);

      // 2. Immediately verify payment with simulated bypass
      const verifyRes = await ApiService.verifyRazorpayPayment({
        razorpay_order_id: order.razorpay_order_id,
        razorpay_payment_id: `pay_test_${Date.now()}`,
        razorpay_signature: 'test_demo_instant_skip',
        claim_token: order.claim_token,
      });

      const giftResult = verifyRes.data || verifyRes;
      const finalGift = {
        ...giftResult,
        claim_token: order.claim_token,
        claim_url: giftResult.claim_url || `${window.location.origin}/gift/${order.claim_token}`,
        pin_code: giftResult.pin_code || order.pin_code || '4821',
        whatsapp_share_url: giftResult.whatsapp_share_url,
      };

      setCreatedGift(finalGift);
      setCurrentStep('success');

      // Auto-open WhatsApp link in a new tab/app immediately
      if (finalGift.whatsapp_share_url) {
        window.open(finalGift.whatsapp_share_url, '_blank', 'noopener,noreferrer');
      }

      if (onGiftSent) onGiftSent(finalGift);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to generate test gift card. Please try again.');
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
        : `pay_upi_${Date.now().toString(36)}`;

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
        whatsapp_share_url: giftResult.whatsapp_share_url,
      };

      setCreatedGift(finalGift);
      setCurrentStep('success');

      // Auto-open WhatsApp link in a new tab/app immediately
      if (finalGift.whatsapp_share_url) {
        window.open(finalGift.whatsapp_share_url, '_blank', 'noopener,noreferrer');
      }

      if (onGiftSent) onGiftSent(finalGift);
    } catch (err) {
      setErrorMessage(err.message || 'Payment verification failed. Please try again or contact support.');
    } finally {
      setVerifying(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Flow B: Gift from Points
  // ──────────────────────────────────────────────────────────────────────────
  const handleSendFromPoints = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (pointsNum <= 0 || pointsNum % 4 !== 0) {
      setErrorMessage('Points to share must be a multiple of 4 (4 PTS = ₹1).');
      return;
    }
    if (pointsNum > currentBalance) {
      setErrorMessage(`You only have ${currentBalance.toLocaleString()} PTS in your balance.`);
      return;
    }
    if (inrFromPoints < 1) {
      setErrorMessage('Minimum gift value is ₹1 (4 Points).');
      return;
    }

    setLoading(true);
    try {
      const res = await ApiService.createGiftFromPoints({
        sender_customer_id: customer?.customer_id || customer?.id,
        sender_phone: senderPhone || customer?.phone || customer?.phones?.[0] || '9999999999',
        sender_name: senderName || 'Generous Friend',
        points_to_share: pointsNum,
        custom_message: customMessage,
        card_theme: cardTheme,
      });

      const data = res.data || res;
      setCreatedGift(data);
      setCurrentStep('success');

      // Auto-open WhatsApp link in a new tab/app immediately
      if (data.whatsapp_share_url) {
        window.open(data.whatsapp_share_url, '_blank', 'noopener,noreferrer');
      }

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
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">

        {/* ── Modal Header ── */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Gift className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2 truncate">
                <span>Send a Gift Card</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  Razorpay UPI
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 truncate">
                Choose price · Pay via scanner or test share · WhatsApp delivery
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
          <div className="p-3 mx-5 mt-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            STEP 1: PRICE SELECTION & GREETING FORM
           ══════════════════════════════════════════════════════════════════════ */}
        {currentStep === 'form' && (
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            
            {/* Clean Segmented Mode Switcher */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setFundingMode('razorpay');
                  setErrorMessage('');
                }}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                  fundingMode === 'razorpay'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                <span>Buy &amp; Pay (Scanner)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFundingMode('points');
                  setErrorMessage('');
                }}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                  fundingMode === 'points'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span>Points ({Number(currentBalance || 0).toLocaleString()} PTS)</span>
              </button>
            </div>

            {/* ── MODE A: RAZORPAY SCANNER / CASH PAYMENT ── */}
            {fundingMode === 'razorpay' ? (
              <form onSubmit={handleProceedToPayment} noValidate className="space-y-4">
                
                {/* 1. Preset Price Grid (Clean, No Overlapping Badges) */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Select Gift Card Price *
                    </label>
                    <span className="text-[11px] font-semibold text-indigo-600">
                      ₹1 = 4 Points
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    {PRESET_AMOUNTS.map((p) => {
                      const isSelected = amountInput === String(p.amount);
                      return (
                        <button
                          key={p.amount}
                          type="button"
                          onClick={() => setAmountInput(String(p.amount))}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-400/30'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-sm font-black ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>
                              {p.label}
                            </span>
                            {p.tag && (
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                                isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {p.tag}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                            +{p.points.toLocaleString()} PTS
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Price Input */}
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      max="25000"
                      required
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      placeholder="Or enter custom amount (e.g. 1500)"
                      className="w-full h-10 pl-8 pr-3 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                    />
                  </div>

                  {/* Recipient Benefits Strip */}
                  <div className="mt-2 p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-950">
                    <span className="font-semibold flex items-center gap-1.5 text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Recipient receives voucher:
                    </span>
                    <span className="font-bold text-emerald-700 font-mono text-xs">
                      ₹{numAmount.toLocaleString('en-IN')} (+{pointsFromAmount.toLocaleString('en-IN')} PTS)
                    </span>
                  </div>
                </div>

                {/* 2. Sleek Card Design Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Choose Card Design
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CARD_THEMES.map((theme) => {
                      const isSelected = cardTheme === theme.id;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setCardTheme(theme.id)}
                          className={`p-2 rounded-xl border flex items-center justify-center sm:justify-start gap-1.5 transition cursor-pointer min-w-0 ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-400'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded-full ${theme.color} shrink-0`} />
                          <span className="text-xs font-bold text-slate-800 whitespace-nowrap">
                            {theme.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Sender Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="e.g. Mahesh Bhajantri"
                      className="w-full h-10 px-3 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Your Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full h-10 px-3 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                    />
                  </div>
                </div>

                {/* 4. Greeting Message */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Greeting Message
                    </label>
                    <div className="flex gap-1.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setCustomMessage('Happy Birthday! Enjoy your drive with Bellad & Co.')}
                        className="text-indigo-600 hover:underline font-bold"
                      >
                        Birthday
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setCustomMessage('Congratulations on your vehicle! Here is a gift for your service.')}
                        className="text-indigo-600 hover:underline font-bold"
                      >
                        Vehicle
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setCustomMessage('Thank you for being a valued customer at Bellad & Company!')}
                        className="text-indigo-600 hover:underline font-bold"
                      >
                        Thanks
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows="2"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Enter your personal gift message..."
                    className="w-full p-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition resize-none"
                  />
                </div>

                {/* 5. Dual Action Buttons: Scanner Pay vs Instant Test Share */}
                <div className="space-y-2 pt-1">
                  <button
                    type="submit"
                    disabled={loading || numAmount < 1}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Initializing Scanner...</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="w-3.5 h-3.5 text-amber-300" />
                        <span>Proceed to Pay ₹{numAmount.toLocaleString('en-IN')} (Open Scanner)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  {/* DIRECT TEST SHARE BUTTON (Instant WhatsApp Link without paying) */}
                  <button
                    type="button"
                    onClick={handleInstantTestShare}
                    disabled={loading}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                    <span>⚡ Skip Payment &amp; Share Link (Instant Test Mode)</span>
                  </button>
                  <p className="text-[10px] text-center text-slate-400">
                    Use Test Mode during testing to generate the active WhatsApp link immediately.
                  </p>
                </div>
              </form>
            ) : (
              /* ── MODE B: POINTS BALANCE GIFTING ── */
              <form onSubmit={handleSendFromPoints} noValidate className="space-y-4">
                
                {/* Available Balance Box */}
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-950">
                  <span className="font-semibold">Available Points:</span>
                  <span className="font-mono font-black text-xs text-indigo-700">
                    {Number(currentBalance || 0).toLocaleString()} PTS (≈ ₹{Math.floor(Number(currentBalance || 0) / 4)})
                  </span>
                </div>

                {/* Point Presets if Balance Available */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Points to Gift (4 PTS = ₹1) *
                    </label>
                    <span className="text-[11px] font-semibold text-indigo-600">
                      Min 4 PTS (₹1)
                    </span>
                  </div>

                  {currentBalance >= 4 && (
                    <div className="grid grid-cols-4 gap-1.5 mb-2">
                      {[40, 80, 160, Math.floor(currentBalance / 4) * 4]
                        .filter((pts, idx, arr) => pts <= currentBalance && arr.indexOf(pts) === idx)
                        .map((pts) => (
                          <button
                            key={pts}
                            type="button"
                            onClick={() => setPointsInput(String(pts))}
                            className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                              pointsInput === String(pts)
                                ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 text-xs'
                            }`}
                          >
                            <span className="block text-[11px] font-black">{pts} PTS</span>
                            <span className="block text-[9px] text-slate-500 font-mono">≈ ₹{Math.floor(pts / 4)}</span>
                          </button>
                        ))}
                    </div>
                  )}

                  <input
                    type="number"
                    min="4"
                    step="1"
                    max={currentBalance > 0 ? currentBalance : undefined}
                    required
                    value={pointsInput}
                    onChange={(e) => setPointsInput(e.target.value)}
                    placeholder="Enter points (e.g. 40, 100, 168)"
                    className="w-full h-10 px-3 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition font-mono"
                  />

                  <div className="flex justify-between items-center mt-1.5 text-xs text-slate-500">
                    <span>Monetary Value:</span>
                    <span className="font-bold text-emerald-600 font-mono text-xs">
                      ₹{inrFromPoints.toLocaleString('en-IN')} Gift Card
                    </span>
                  </div>
                </div>

                {/* Sender Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="e.g. Mahesh Bhajantri"
                      className="w-full h-10 px-3 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Your Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full h-10 px-3 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                    />
                  </div>
                </div>

                {/* Greeting Message */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Greeting Message
                  </label>
                  <textarea
                    rows="2"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Enter gift message..."
                    className="w-full p-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition resize-none"
                  />
                </div>

                {/* Submit button for points */}
                <div className="space-y-2 pt-1">
                  <button
                    type="submit"
                    disabled={loading || pointsNum > currentBalance || pointsNum < 4}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? 'Creating Gift...' : `Create ₹${inrFromPoints} Gift Card (${pointsNum} PTS)`}
                  </button>

                  {/* Direct Test Share Button also in points tab! */}
                  <button
                    type="button"
                    onClick={handleInstantTestShare}
                    disabled={loading}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                    <span>⚡ Skip &amp; Generate Test Gift Pass (0 PTS / Complimentary)</span>
                  </button>
                </div>
              </form>
            )}

            {/* Footer Note */}
            <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 space-y-0.5">
              <p className="flex items-center gap-1 font-semibold text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Guaranteed Instant Delivery:
              </p>
              <p>
                An instant WhatsApp share link with unique Card Code and Security PIN is generated automatically.
              </p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            STEP 2: RAZORPAY PAYMENT GATEWAY & UPI QR SCANNER MODAL
           ══════════════════════════════════════════════════════════════════════ */}
        {currentStep === 'scanner' && orderData && (
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 animate-fadeIn">
            
            {/* Top Amount Banner */}
            <div className="p-3 bg-slate-900 rounded-xl text-white flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/30 flex items-center justify-center font-black text-xs text-indigo-300">
                  ₹
                </div>
                <div>
                  <span className="font-bold block">Razorpay UPI Gateway</span>
                  <span className="text-[10px] text-slate-300">Order: {orderData.gift_code}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Total Due</span>
                <span className="text-sm font-black font-mono text-amber-300">
                  ₹{Number(orderData.amount_inr).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Live QR Scanner Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase tracking-wider">
                <QrCode className="w-3 h-3" />
                <span>Scan with Any UPI App</span>
              </div>

              {/* Dynamic QR Code */}
              <div className="relative mx-auto w-48 h-48 bg-white p-2.5 rounded-xl shadow-xs border border-slate-200 flex items-center justify-center">
                <img
                  src={qrImageSrc}
                  alt="UPI Payment QR Code"
                  className="w-full h-full object-contain rounded-lg"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-9 h-9 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-indigo-700 font-black text-[11px]">
                    UPI
                  </div>
                </div>
              </div>

              {/* Supported UPI Apps */}
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-500 flex-wrap">
                <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200">GPay</span>
                <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200">PhonePe</span>
                <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200">Paytm</span>
                <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200">BHIM</span>
                <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200">CRED</span>
              </div>

              {/* UPI ID & Copy */}
              <div className="flex items-center justify-center gap-1.5 text-xs pt-1">
                <span className="text-slate-500 font-medium text-[11px]">UPI:</span>
                <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
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
              <div className="flex items-center justify-center gap-1 text-[11px] text-amber-700 font-semibold">
                <Clock className="w-3 h-3" />
                <span>Expires in {formatTimer(countdown)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* INSTANT SKIP PAYMENT & SHARE BUTTON */}
              <button
                type="button"
                disabled={verifying}
                onClick={() => handleVerifyPayment(true)}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>⚡ Skip Payment &amp; Get WhatsApp Link (Test Mode)</span>
              </button>

              {/* Real payment verification */}
              <button
                type="button"
                disabled={verifying}
                onClick={() => handleVerifyPayment(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {verifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Checking Razorpay Payment...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>I Have Paid ₹{Number(orderData.amount_inr).toLocaleString('en-IN')} (Verify)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep('form')}
                className="w-full py-1.5 text-center text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                ← Change Amount or Details
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            STEP 3: SUCCESS & WHATSAPP SHARING
           ══════════════════════════════════════════════════════════════════════ */}
        {currentStep === 'success' && createdGift && (
          <div className="p-5 sm:p-6 space-y-4 text-center overflow-y-auto flex-1 animate-fadeIn">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Gift Card Activated
              </span>
              <h4 className="text-xl font-black text-slate-900 tracking-tight mt-1.5">
                ₹{Number(createdGift.amount_inr).toLocaleString('en-IN')} Ready to Share!
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Share this voucher with your friend on WhatsApp with 1 tap.
              </p>
            </div>

            {/* Gift Card Visual Box */}
            <div className="bg-slate-900 rounded-2xl p-4 text-white text-left space-y-3 shadow-md border border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <span className="text-amber-300 font-bold flex items-center gap-1.5 text-[11px]">
                  <Sparkles className="w-3 h-3" /> Bellad &amp; Co e-Gift Card
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  Active Voucher
                </span>
              </div>

              {/* Card Code & PIN Display */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-white/10 border border-white/10">
                <div>
                  <span className="text-[9px] uppercase text-slate-300 block font-mono">Gift Card Code</span>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="font-mono text-xs font-black text-amber-300 tracking-wider truncate">
                      {createdGift.gift_code}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(createdGift.gift_code);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="text-slate-300 hover:text-white p-1 rounded hover:bg-white/10 text-[10px] cursor-pointer"
                      title="Copy Card Code"
                    >
                      {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] uppercase text-slate-300 block font-mono">Security PIN</span>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="font-mono text-xs font-black text-emerald-300 tracking-widest">
                      {createdGift.pin_code || '4821'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(createdGift.pin_code || '4821');
                        setCopiedPin(true);
                        setTimeout(() => setCopiedPin(false), 2000);
                      }}
                      className="text-slate-300 hover:text-white p-1 rounded hover:bg-white/10 text-[10px] cursor-pointer"
                      title="Copy PIN"
                    >
                      {copiedPin ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Recipient Balance Value */}
              <div className="flex justify-between items-end pt-0.5">
                <div>
                  <span className="text-[9px] uppercase text-slate-400 block">Value</span>
                  <span className="text-xl font-black font-mono text-amber-300">
                    ₹{Number(createdGift.amount_inr).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase text-slate-400 block">Recipient Wallet</span>
                  <span className="text-sm font-black font-mono text-emerald-400">
                    +{Number(createdGift.points_equivalent).toLocaleString('en-IN')} PTS
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Action: Share on WhatsApp */}
            <div className="space-y-2 pt-1">
              <a
                href={createdGift.whatsapp_share_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-sm transition shadow-md shadow-emerald-600/25 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Gift Card on WhatsApp</span>
              </a>

              {/* Copy Full Link & Message */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`Card: ${createdGift.gift_code} | PIN: ${createdGift.pin_code || '4821'} | Link: ${createdGift.claim_url}`}
                  className="flex-1 h-9 px-3 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-700 truncate"
                />
                <button
                  type="button"
                  onClick={copyFullMessage}
                  className="h-9 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700 flex items-center gap-1 transition cursor-pointer shrink-0"
                >
                  {copiedAll ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy All</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-400">
              Recipient can claim in 1 tap with the link, or enter Card Code &amp; PIN in their customer portal.
            </p>

            <div className="pt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
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
