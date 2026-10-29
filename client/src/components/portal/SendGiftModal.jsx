import React, { useState } from 'react';
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
  Info,
} from 'lucide-react';
import ApiService from '../../services/api';

export const SendGiftModal = ({
  isOpen,
  onClose,
  customer,
  currentBalance = 0,
  onGiftSent,
}) => {
  const [activeTab, setActiveTab] = useState(currentBalance >= 400 ? 'points' : 'razorpay');

  // Mode A: Points
  const [pointsInput, setPointsInput] = useState('2000'); // default 2,000 PTS = ₹500

  // Mode B: Razorpay
  const [amountInput, setAmountInput] = useState('1000'); // default ₹1,000

  // Common fields
  const [senderName, setSenderName] = useState(customer?.name || customer?.customer_name || '');
  const [senderPhone, setSenderPhone] = useState(customer?.phone || customer?.phones?.[0] || '');
  const [customMessage, setCustomMessage] = useState('Here is a special gift for your vehicle service or new purchase at Bellad!');
  const [cardTheme, setCardTheme] = useState('celebration');

  React.useEffect(() => {
    if (customer?.name || customer?.customer_name) {
      setSenderName((prev) => prev || customer.name || customer.customer_name);
    }
    if (customer?.phone || customer?.phones?.[0]) {
      setSenderPhone((prev) => prev || customer.phone || customer.phones[0]);
    }
  }, [customer, isOpen]);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdGift, setCreatedGift] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  if (!isOpen) return null;

  const pointsNum = parseInt(pointsInput || '0', 10);
  const inrFromPoints = Math.floor(pointsNum / 4);

  const amountNum = parseFloat(amountInput || '0');
  const pointsFromInr = Math.floor(amountNum * 4);

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

    setSubmitting(true);
    try {
      const resolvedCustomerId = customer?.customer_id || customer?.id;
      const resolvedPhone = senderPhone || customer?.phone || customer?.phones?.[0];
      const resolvedName = senderName || customer?.name || customer?.customer_name;

      const res = await ApiService.createGiftFromPoints({
        sender_customer_id: resolvedCustomerId,
        sender_phone: resolvedPhone,
        sender_name: resolvedName,
        points_to_share: pointsNum,
        custom_message: customMessage,
        card_theme: cardTheme,
      });

      setCreatedGift(res.data);
      if (onGiftSent) onGiftSent(res.data);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create gift. Please check details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendFromRazorpay = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (amountNum < 100) {
      setErrorMessage('Minimum gift purchase amount is ₹100.');
      return;
    }

    setSubmitting(true);
    try {
      const orderRes = await ApiService.createGiftFromRazorpay({
        sender_customer_id: customer?.customer_id,
        sender_phone: senderPhone,
        sender_name: senderName,
        amount_inr: amountNum,
        custom_message: customMessage,
        card_theme: cardTheme,
      });

      const orderData = orderRes.data;

      // If Razorpay SDK is loaded in browser, open checkout modal; otherwise handle development/mock flow
      if (window.Razorpay && orderData.key_id && !orderData.razorpay_order_id.startsWith('order_mock_')) {
        const options = {
          key: orderData.key_id,
          amount: Math.round(amountNum * 100),
          currency: 'INR',
          name: 'Bellad & Company',
          description: `Loyalty Gift Voucher (+${pointsFromInr.toLocaleString()} PTS)`,
          order_id: orderData.razorpay_order_id,
          prefill: {
            name: senderName,
            contact: senderPhone,
          },
          theme: { color: '#4f46e5' },
          handler: async (response) => {
            try {
              const verifyRes = await ApiService.verifyRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                claim_token: orderData.claim_token,
              });
              setCreatedGift({
                ...verifyRes.data,
                claim_token: orderData.claim_token,
                claim_url: `${window.location.origin}/gift/${orderData.claim_token}`,
              });
              if (onGiftSent) onGiftSent(verifyRes.data);
            } catch (vErr) {
              setErrorMessage('Payment verification failed. Please contact support.');
            }
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Dev / Simulation confirmation
        const verifyRes = await ApiService.verifyRazorpayPayment({
          razorpay_order_id: orderData.razorpay_order_id,
          razorpay_payment_id: `pay_sim_${Date.now()}`,
          razorpay_signature: 'mock_sig',
          claim_token: orderData.claim_token,
        });
        setCreatedGift({
          ...verifyRes.data,
          claim_token: orderData.claim_token,
          claim_url: `${window.location.origin}/gift/${orderData.claim_token}`,
        });
        if (onGiftSent) onGiftSent(verifyRes.data);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Payment initiation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyFullMessage = () => {
    if (!createdGift) return;
    const pin = createdGift.pin_code || '4821';
    const text = `🎁 You received a ₹${Number(createdGift.amount_inr).toLocaleString('en-IN')} Bellad & Co Gift Card from ${senderName || 'a friend'}!\n\n💳 Card Code: ${createdGift.gift_code}\n🔐 Security PIN: ${pin}\n💰 Value: ₹${Number(createdGift.amount_inr).toLocaleString('en-IN')} (+${Number(createdGift.points_equivalent).toLocaleString('en-IN')} PTS)\n\n👉 1-Click Claim Link: ${createdGift.claim_url}\n\n(Claim in 1 tap with the link above, or paste the Card Code & PIN in your Bellad Customer Portal to add points instantly!)`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2 truncate">
                <span>Send a Gift Card</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-indigo-200 font-medium truncate">
                Share loyalty value directly via WhatsApp (Amazon e-Gift style)
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

        {/* Success Screen: Gift Ready to Share */}
        {createdGift ? (
          <div className="p-7 space-y-5 text-center animate-fadeIn">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Gift Card Created Successfully!
              </span>
              <h4 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                ₹{Number(createdGift.amount_inr).toLocaleString('en-IN')} Gift Ready to Share
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Share the Card Code &amp; Security PIN below with your recipient to claim their points.
              </p>
            </div>

            {/* Gift Voucher Preview Card with Code & PIN */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white text-left space-y-4 shadow-lg border border-indigo-700/50">
              <div className="flex justify-between items-center text-xs">
                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Bellad e-Gift Card
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  Active &amp; Ready
                </span>
              </div>

              {/* Card Code and PIN Grid */}
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
                      title="Copy Security PIN"
                    >
                      {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

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

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <a
                href={createdGift.whatsapp_share_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-sm transition shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Code, PIN &amp; Link on WhatsApp</span>
              </a>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`Code: ${createdGift.gift_code} | PIN: ${createdGift.pin_code || '4821'} | Link: ${createdGift.claim_url}`}
                  className="flex-1 h-11 px-3.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-700 truncate"
                />
                <button
                  type="button"
                  onClick={copyFullMessage}
                  className="h-11 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700 flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied All</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>Copy All Details</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              * Recipient can claim instantly by tapping the WhatsApp link, or by entering this <strong>Card Code</strong> and <strong>PIN</strong> in their Bellad Customer Portal.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Main Creation Form */
          <div className="p-6 sm:p-7 space-y-5">
            {/* Funding Mode Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('points');
                  setErrorMessage('');
                }}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === 'points'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Coins className="w-4 h-4 text-amber-500" />
                <span>Gift using Points</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('razorpay');
                  setErrorMessage('');
                }}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === 'razorpay'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>Buy with Razorpay</span>
              </button>
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TAB 1: GIFT FROM POINTS */}
            {activeTab === 'points' && (
              <form onSubmit={handleSendFromPoints} className="space-y-4">
                {/* Available Balance Strip */}
                <div className="p-3 sm:p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs text-amber-950">
                  <span className="font-medium text-[11px] sm:text-xs">Your Available Points:</span>
                  <span className="font-mono font-black text-xs sm:text-sm text-indigo-700">
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
                  <div className="flex justify-between items-center mt-1.5 text-xs">
                    <span className="text-slate-400">Equivalent Rupee Value:</span>
                    <span className="font-black text-emerald-600 font-mono">
                      ₹{inrFromPoints.toLocaleString('en-IN')} Gift
                    </span>
                  </div>
                </div>

                {/* Quick Points Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                  {[1000, 2000, 4000, 8000].map((pts) => (
                    <button
                      key={pts}
                      type="button"
                      disabled={pts > currentBalance}
                      onClick={() => setPointsInput(String(pts))}
                      className={`py-2 px-1.5 rounded-xl text-[11px] sm:text-xs font-bold border transition text-center truncate ${
                        pointsInput === String(pts)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 disabled:opacity-40'
                      }`}
                    >
                      {pts.toLocaleString()} PTS (₹{pts / 4})
                    </button>
                  ))}
                </div>

                {/* Sender Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Your Name (as displayed to receiver) *
                  </label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full h-11 px-3.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                  />
                </div>

                {/* Custom Message */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Gift Greeting Message
                  </label>
                  <textarea
                    rows="2"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Add your warm message..."
                    className="w-full p-3 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting || pointsNum > currentBalance || inrFromPoints < 100}
                  className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm transition shadow-lg shadow-indigo-600/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <span>Creating Gift...</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Create ₹{inrFromPoints} Gift ({pointsNum} PTS)</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB 2: BUY WITH RAZORPAY */}
            {activeTab === 'razorpay' && (
              <form onSubmit={handleSendFromRazorpay} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Gift Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-black text-slate-400">₹</span>
                    <input
                      type="number"
                      min="100"
                      step="50"
                      max="25000"
                      required
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      placeholder="e.g. 1000"
                      className="w-full h-11 pl-9 pr-3.5 text-base font-black font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                    />
                  </div>
                  <div className="flex justify-between items-center mt-1.5 text-xs">
                    <span className="text-slate-400">Recipient Receives:</span>
                    <span className="font-black text-emerald-600 font-mono">
                      +{pointsFromInr.toLocaleString('en-IN')} Loyalty Points (₹1 = 4 PTS)
                    </span>
                  </div>
                </div>

                {/* Quick INR Denominations */}
                <div className="grid grid-cols-4 gap-2">
                  {[250, 500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmountInput(String(amt))}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        amountInput === String(amt)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      ₹{amt} ({amt * 4} PTS)
                    </button>
                  ))}
                </div>

                {/* Sender Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Your Name (as displayed to receiver) *
                  </label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full h-11 px-3.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                  />
                </div>

                {/* Custom Message */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Gift Greeting Message
                  </label>
                  <textarea
                    rows="2"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Add your warm message..."
                    className="w-full p-3 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting || amountNum < 100}
                  className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm transition shadow-lg shadow-indigo-600/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <span>Opening Payment...</span>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 text-white" />
                      <span>Pay ₹{amountNum.toLocaleString('en-IN')} &amp; Generate Gift</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Terms Footer */}
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
              <p className="flex items-center gap-1 font-semibold text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Guaranteed Return Policy:
              </p>
              <p>
                If the recipient has already purchased a vehicle from Bellad, or if the gift expires unclaimed after 30 days, 100% of the value is automatically returned to you.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SendGiftModal;
