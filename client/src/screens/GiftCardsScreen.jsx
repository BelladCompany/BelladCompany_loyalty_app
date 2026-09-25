import React, { useState, useEffect, useCallback } from 'react';
import {
  Gift,
  PlusCircle,
  Search,
  RefreshCw,
  Copy,
  Check,
  CreditCard,
  Send,
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
  User,
  Phone,
  Mail,
  Receipt,
  Download,
  Filter,
  CheckCircle2,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import { Button, Input, StatusBadge, DataTable, useToast, StatCard } from '../components/ui';
import ApiService from '../services/api';

export const GiftCardsScreen = ({ user }) => {
  const { showSuccess, showError, showInfo } = useToast();

  const [cards, setCards] = useState([]);
  const [totalCards, setTotalCards] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [selectedCardForView, setSelectedCardForView] = useState(null);

  // Issue Card Form State
  const [issueAmount, setIssueAmount] = useState('2500');
  const [senderName, setSenderName] = useState('Bellad Automobiles');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [customMessage, setCustomMessage] = useState('Congratulations on your reward! Redeem on your next vehicle purchase or service.');
  const [cardTheme, setCardTheme] = useState('premium');
  const [validityMonths, setValidityMonths] = useState('12');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  // POS Redeem Form State
  const [redeemCardNumber, setRedeemCardNumber] = useState('');
  const [redeemPin, setRedeemPin] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeemRef, setRedeemRef] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [lookupCardData, setLookupCardData] = useState(null);

  // Copied Card Code State
  const [copiedCode, setCopiedCode] = useState('');
  const [revealedPins, setRevealedPins] = useState({});

  const loadGiftCards = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await ApiService.getGiftCards({
        search: searchQuery,
        status: statusFilter,
        limit: 50,
      });
      setCards(res.data || []);
      setTotalCards(res.total || 0);
    } catch (err) {
      showError(err.message || 'Failed to load gift cards.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    loadGiftCards();
  }, [loadGiftCards]);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showSuccess(`Copied card code: ${code}`);
    setTimeout(() => setCopiedCode(''), 2500);
  };

  const togglePinReveal = (cardId) => {
    setRevealedPins((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  // Handle Issue Gift Card Submit
  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!issueAmount || Number(issueAmount) <= 0) {
      showError('Please enter a valid gift card denomination.');
      return;
    }
    if (!recipientName.trim()) {
      showError('Please enter recipient name.');
      return;
    }

    setIsSubmittingIssue(true);
    try {
      const res = await ApiService.issueGiftCard({
        amount: parseFloat(issueAmount),
        sender_name: senderName,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        recipient_email: recipientEmail,
        custom_message: customMessage,
        card_theme: cardTheme,
        validity_months: parseInt(validityMonths, 10),
      });

      showSuccess(`Digital Gift Card issued successfully: ${res.data.card_number}`);
      setIssueModalOpen(false);
      // Reset form
      setRecipientName('');
      setRecipientPhone('');
      setRecipientEmail('');
      loadGiftCards();
    } catch (err) {
      showError(err.message || 'Failed to issue gift card.');
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  // Handle Quick Lookup for POS Redemption
  const handleLookupCard = async () => {
    if (!redeemCardNumber.trim()) {
      showError('Please enter card number.');
      return;
    }
    try {
      const res = await ApiService.lookupGiftCard(redeemCardNumber.trim(), redeemPin || null);
      setLookupCardData(res.data);
      if (res.data?.balance_amount) {
        setRedeemAmount(res.data.balance_amount.toString());
      }
    } catch (err) {
      showError(err.message || 'Gift card lookup failed.');
      setLookupCardData(null);
    }
  };

  // Handle POS Redemption Submit
  const handleRedeemSubmit = async (e) => {
    e.preventDefault();
    if (!redeemCardNumber.trim() || !redeemPin.trim()) {
      showError('Card number and 4-digit Security PIN are required.');
      return;
    }
    if (!redeemAmount || Number(redeemAmount) <= 0) {
      showError('Please enter a valid amount to redeem.');
      return;
    }

    setIsRedeeming(true);
    try {
      const res = await ApiService.redeemGiftCardAtPos({
        card_number: redeemCardNumber.trim(),
        pin_code: redeemPin.trim(),
        amount_to_redeem: parseFloat(redeemAmount),
        reference_id: redeemRef || `POS-${Date.now()}`,
      });

      showSuccess(res.message || `Redeemed ₹${redeemAmount} from gift card!`);
      setRedeemModalOpen(false);
      setRedeemCardNumber('');
      setRedeemPin('');
      setRedeemAmount('');
      setLookupCardData(null);
      loadGiftCards();
    } catch (err) {
      showError(err.message || 'Redemption failed.');
    } finally {
      setIsRedeeming(false);
    }
  };

  // Metrics
  const activeCards = cards.filter((c) => c.status === 'active' || c.status === 'partially_redeemed');
  const totalActiveValue = activeCards.reduce((acc, c) => acc + Number(c.balance_amount || 0), 0);
  const totalIssuedValue = cards.reduce((acc, c) => acc + Number(c.initial_amount || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Action Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full opacity-10 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-400 via-emerald-400 to-transparent" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Amazon-Style Digital Cards
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1.5 flex items-center gap-3">
              <Gift className="w-8 h-8 text-amber-400" />
              Gift Cards Hub &amp; Issuance
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Issue secure digital gift cards, manage card balances, process POS redemptions with 4-digit PIN verification, and track redemption audits.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setRedeemModalOpen(true)}
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition shadow-sm"
            >
              <Receipt className="w-4 h-4 text-emerald-400" />
              POS Redeem Card
            </button>
            <button
              onClick={() => setIssueModalOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-extrabold rounded-xl shadow-lg flex items-center gap-2 transition"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              + Issue New Gift Card
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Active Gift Cards"
          value={activeCards.length}
          subtext="Ready for redemption & claiming"
          variant="primary"
        />
        <StatCard
          label="Outstanding Balance"
          value={`₹${totalActiveValue.toLocaleString('en-IN')}`}
          subtext="Total circulating gift value"
          variant="default"
        />
        <StatCard
          label="Total Issued Value"
          value={`₹${totalIssuedValue.toLocaleString('en-IN')}`}
          subtext="Lifetime gift cards generated"
          variant="default"
        />
        <StatCard
          label="Card Security Status"
          value="4-Digit PIN Protected"
          subtext="Tamper-proof encrypted codes"
          variant="default"
        />
      </div>

      {/* Controls Bar (Search & Filter) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by card code, recipient, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="partially_redeemed">Partially Redeemed</option>
            <option value="redeemed">Fully Redeemed</option>
            <option value="expired">Expired</option>
          </select>

          <button
            onClick={loadGiftCards}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Cards Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Gift Cards Inventory ({cards.length} cards)
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Page 1 of {Math.ceil((totalCards || 1) / 50)}
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400" />
            <p className="text-xs">Loading gift cards...</p>
          </div>
        ) : cards.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <Gift className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No Gift Cards Found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Generate your first Amazon-style digital gift card using the "+ Issue New Gift Card" button above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Card Number</th>
                  <th className="py-3 px-4">Security PIN</th>
                  <th className="py-3 px-4">Initial Amount</th>
                  <th className="py-3 px-4">Remaining Balance</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Expires On</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cards.map((card) => {
                  const isPinVisible = revealedPins[card.card_id];
                  return (
                    <tr key={card.card_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-indigo-600" />
                          <span>{card.card_number}</span>
                          <button
                            onClick={() => handleCopy(card.card_number)}
                            className="p-1 text-slate-400 hover:text-slate-800 transition"
                            title="Copy card number"
                          >
                            {copiedCode === card.card_number ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">
                            {isPinVisible ? card.pin_code : '••••'}
                          </span>
                          <button
                            onClick={() => togglePinReveal(card.card_id)}
                            className="text-slate-400 hover:text-slate-700"
                            title={isPinVisible ? 'Hide PIN' : 'Reveal PIN'}
                          >
                            {isPinVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">
                        ₹{Number(card.initial_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600">
                        ₹{Number(card.balance_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{card.recipient_name || '—'}</div>
                        {card.recipient_phone && (
                          <div className="text-[10px] text-slate-400 font-mono">{card.recipient_phone}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            card.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : card.status === 'partially_redeemed'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : card.status === 'redeemed'
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {card.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {card.expires_at
                          ? new Date(card.expires_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setRedeemCardNumber(card.card_number);
                            setRedeemPin(card.pin_code);
                            setRedeemAmount(card.balance_amount.toString());
                            setRedeemModalOpen(true);
                          }}
                          disabled={card.status === 'redeemed' || card.status === 'expired'}
                          className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Redeem
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Issue Gift Card Modal ────────────────────────────────────────── */}
      {issueModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Issue Digital Gift Card</h3>
                  <p className="text-[11px] text-slate-500">Generate an Amazon-style 16-character code with 4-digit PIN</p>
                </div>
              </div>
              <button onClick={() => setIssueModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-4 text-xs">
              {/* Preset Denominations */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Select Card Denomination (₹)</label>
                <div className="grid grid-cols-4 gap-2">
                  {['500', '1000', '2500', '5000'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setIssueAmount(amt)}
                      className={`py-2 text-xs font-extrabold rounded-xl border transition ${
                        issueAmount === amt
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ₹{parseInt(amt, 10).toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Custom Amount (₹)</label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={issueAmount}
                  onChange={(e) => setIssueAmount(e.target.value)}
                  placeholder="e.g. 7500"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Recipient Name *</label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Recipient Mobile</label>
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Personalized Message</label>
                <textarea
                  rows="2"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Greeting or terms message..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Card Theme</label>
                  <select
                    value={cardTheme}
                    onChange={(e) => setCardTheme(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  >
                    <option value="premium">Premium Gold &amp; Slate</option>
                    <option value="celebration">Celebration Festive</option>
                    <option value="automotive">Automotive Elite</option>
                    <option value="birthday">Birthday Special</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Validity</label>
                  <select
                    value={validityMonths}
                    onChange={(e) => setValidityMonths(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  >
                    <option value="12">12 Months (1 Year)</option>
                    <option value="24">24 Months (2 Years)</option>
                    <option value="6">6 Months</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIssueModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIssue}
                  className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {isSubmittingIssue ? 'Generating Card...' : 'Issue Gift Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── POS Redeem Modal ─────────────────────────────────────────────── */}
      {redeemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">POS Gift Card Redemption</h3>
              </div>
              <button onClick={() => setRedeemModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleRedeemSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Gift Card Code *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={redeemCardNumber}
                    onChange={(e) => setRedeemCardNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. GIFT-BELL-XXXX-XXXX"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleLookupCard}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition"
                  >
                    Lookup
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">4-Digit Security PIN *</label>
                <input
                  type="password"
                  maxLength="6"
                  required
                  value={redeemPin}
                  onChange={(e) => setRedeemPin(e.target.value)}
                  placeholder="Enter 4-digit PIN"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {lookupCardData && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-emerald-900 font-bold">
                    <span>Available Balance:</span>
                    <span>₹{lookupCardData.balance_amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Recipient: {lookupCardData.recipient_name}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Amount to Deduct (₹) *</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bill / Invoice Reference ID</label>
                <input
                  type="text"
                  value={redeemRef}
                  onChange={(e) => setRedeemRef(e.target.value)}
                  placeholder="e.g. INV-2026-0891"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRedeemModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRedeeming}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition disabled:opacity-50"
                >
                  {isRedeeming ? 'Redeeming...' : 'Apply Redemption'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GiftCardsScreen;
