import React, { useState, useEffect, useCallback } from 'react';
import {
  Gift,
  Search,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  Clock,
  Sparkles,
  Phone,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Coins,
  IndianRupee,
  Share2
} from 'lucide-react';
import ApiService from '../services/api';

export const GiftCardsScreen = ({ user }) => {
  const [giftCards, setGiftCards] = useState([]);
  const [totals, setTotals] = useState({
    total_cards: 0,
    total_amount_inr: 0,
    total_claimed: 0,
    total_unclaimed: 0,
    total_expired: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedCode, setCopiedCode] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchGiftCards = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await ApiService.getAdminGiftCards({
        search: searchQuery,
        status: statusFilter,
        limit: 100,
      });

      if (res.status === 'success') {
        setGiftCards(res.data || []);
        if (res.totals) {
          setTotals(res.totals);
        }
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching admin gift cards:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchGiftCards();
  }, [fetchGiftCards]);

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-7 sm:p-8 text-white shadow-xl border border-indigo-900/40">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Gift className="w-3.5 h-3.5" />
              Gift Card Rewards Audit
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Customer Gift Cards
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Track customer details, money sent in ₹, points converted, and recipient claim status. Customers create and share digital gift cards directly from the customer portal.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={fetchGiftCards}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition border border-white/10 backdrop-blur-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Gift Money Sent */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider leading-snug">Total Money Sent</span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <IndianRupee className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-3">
            <span className="text-base sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight tabular-nums block break-words">
              ₹{Number(totals.total_amount_inr || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs font-medium text-slate-500 leading-tight">
            Customer-funded gift rewards
          </div>
        </div>

        {/* Total Gift Cards Shared */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider leading-snug">Total Cards Shared</span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-3">
            <span className="text-base sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums block">
              {totals.total_cards.toLocaleString()}
            </span>
          </div>
          <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs font-medium text-slate-500 leading-tight">
            Generated via portal
          </div>
        </div>

        {/* Unclaimed / Active */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider leading-snug">Unclaimed / Active</span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-3">
            <span className="text-base sm:text-2xl font-black text-amber-600 tracking-tight tabular-nums block">
              {totals.total_unclaimed.toLocaleString()}
            </span>
          </div>
          <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs font-medium text-slate-500 leading-tight">
            Awaiting recipient claim
          </div>
        </div>

        {/* Claimed Cards */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider leading-snug">Claimed Cards</span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-3">
            <span className="text-base sm:text-2xl font-black text-blue-600 tracking-tight tabular-nums block">
              {totals.total_claimed.toLocaleString()}
            </span>
          </div>
          <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs font-medium text-slate-500 leading-tight">
            Redeemed by recipients
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by customer name, phone, ID, or gift code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Cards' },
            { id: 'unclaimed', label: 'Unclaimed' },
            { id: 'claimed', label: 'Claimed' },
            { id: 'expired', label: 'Expired' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gift Cards Details List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Gift Cards Sent by Customers</h2>
            <p className="text-xs text-slate-500">
              Showing {giftCards.length} records • Last updated {lastUpdated.toLocaleTimeString('en-IN')}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Loading gift cards...</p>
          </div>
        ) : giftCards.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Gift className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Gift Cards Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'No gift cards match the current filter or search criteria.'
                : 'No gift cards have been shared by customers yet. Customers can share gift cards from their portal page.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (Optimized for small screens - No Horizontal Scroll needed) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {giftCards.map((card) => {
                const isClaimed = card.claim_status === 'claimed';
                const isExpired = card.claim_status === 'expired';

                return (
                  <div key={card.id || card.gift_code} className="p-3.5 sm:p-4 space-y-2.5 bg-white hover:bg-slate-50/50 transition">
                    {/* Top: Gift Code + Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono text-xs px-2.5 py-1 rounded-lg transition border border-slate-200">
                        <span className="font-bold">{card.gift_code}</span>
                        <button
                          type="button"
                          title="Copy Code"
                          onClick={() => handleCopyCode(card.gift_code)}
                          className="text-slate-400 hover:text-slate-700 ml-0.5 cursor-pointer"
                        >
                          {copiedCode === card.gift_code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {isClaimed ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Claimed
                        </span>
                      ) : isExpired ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          <AlertCircle className="w-3 h-3 text-slate-400" />
                          Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                          <Clock className="w-3 h-3 text-blue-600" />
                          Active
                        </span>
                      )}
                    </div>

                    {/* Value Bar */}
                    <div className="flex items-center justify-between bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gift Amount</span>
                        <span className="font-black text-slate-900 text-sm">{formatCurrency(card.amount_inr)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Converted Points</span>
                        <span className="font-bold text-indigo-700 text-xs font-mono">
                          {card.points_equivalent ? `${card.points_equivalent.toLocaleString()} PTS` : 'Cash'}
                        </span>
                      </div>
                    </div>

                    {/* Sender & Recipient Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sender</span>
                        <span className="font-bold text-slate-900 block truncate">{card.sender_name || 'Customer'}</span>
                        <span className="text-[10px] font-mono text-slate-500 block truncate">{card.sender_customer_id}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recipient</span>
                        <span className="font-semibold text-slate-800 block truncate">{card.receiver_name || 'Shared via WhatsApp'}</span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {card.receiver_phone && card.receiver_phone !== '—' ? `📱 ${card.receiver_phone}` : 'Shared via Claim Link'}
                        </span>
                      </div>
                    </div>

                    {/* Footer Timestamps */}
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
                      <span>Sent: {formatDate(card.created_at)}</span>
                      {card.expires_at && !isClaimed && (
                        <span className="text-amber-700 font-medium">Exp: {new Date(card.expires_at).toLocaleDateString('en-IN')}</span>
                      )}
                      {isClaimed && card.claimed_at && (
                        <span className="text-emerald-700 font-medium">Claimed: {formatDate(card.claimed_at)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (Full Width) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 sm:py-3 px-3.5 sm:px-5">Sender (Customer Details)</th>
                    <th className="py-2.5 sm:py-3 px-3.5 sm:px-5">Gift Amount (₹)</th>
                    <th className="py-2.5 sm:py-3 px-3.5 sm:px-5">Gift Code</th>
                    <th className="py-2.5 sm:py-3 px-3.5 sm:px-5">Recipient Details</th>
                    <th className="py-2.5 sm:py-3 px-3.5 sm:px-5">Status</th>
                    <th className="py-2.5 sm:py-3 px-3.5 sm:px-5">Sent Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {giftCards.map((card) => {
                    const isClaimed = card.claim_status === 'claimed';
                    const isExpired = card.claim_status === 'expired';

                    return (
                      <tr key={card.id || card.gift_code} className="hover:bg-slate-50/60 transition">
                        {/* Sender Customer Details */}
                        <td className="py-2.5 sm:py-3.5 px-3.5 sm:px-5">
                          <div className="flex items-center gap-2.5 sm:gap-3">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                              {card.sender_name?.charAt(0)?.toUpperCase() || 'C'}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block whitespace-nowrap">
                                {card.sender_name}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                                <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                                  {card.sender_customer_id}
                                </span>
                                {card.sender_phone && card.sender_phone !== '—' && (
                                  <span className="flex items-center gap-1 text-slate-500">
                                    📱 {card.sender_phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Gift Amount (Money sent in ₹) */}
                        <td className="py-2.5 sm:py-3.5 px-3.5 sm:px-5">
                          <div>
                            <span className="font-black text-slate-900 text-xs sm:text-sm block">
                              {formatCurrency(card.amount_inr)}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-indigo-600 font-medium mt-0.5">
                              <Coins className="w-3 h-3" />
                              {card.points_equivalent ? `${card.points_equivalent.toLocaleString()} PTS` : 'Cash'}
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded capitalize">
                                {card.funding_source || 'points'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Gift Code */}
                        <td className="py-2.5 sm:py-3.5 px-3.5 sm:px-5">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono text-xs px-2 sm:px-2.5 py-1 rounded-lg transition border border-slate-200">
                            <span>{card.gift_code}</span>
                            <button
                              type="button"
                              title="Copy Code"
                              onClick={() => handleCopyCode(card.gift_code)}
                              className="text-slate-400 hover:text-slate-700 ml-1 cursor-pointer"
                            >
                              {copiedCode === card.gift_code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Recipient Details */}
                        <td className="py-2.5 sm:py-3.5 px-3.5 sm:px-5">
                          <div>
                            <span className="font-semibold text-slate-800 block whitespace-nowrap">
                              {card.receiver_name || 'Shared via WhatsApp'}
                            </span>
                            <span className="text-[10px] sm:text-[11px] text-slate-500 block">
                              {card.receiver_phone && card.receiver_phone !== '—'
                                ? `📱 ${card.receiver_phone}`
                                : 'Shared via Claim Link'}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-2.5 sm:py-3.5 px-3.5 sm:px-5">
                          {isClaimed ? (
                            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Claimed
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              <AlertCircle className="w-3 h-3 text-slate-400" />
                              Expired
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              <Clock className="w-3 h-3 text-blue-600" />
                              Unclaimed / Active
                            </span>
                          )}
                        </td>

                        {/* Sent Date */}
                        <td className="py-3.5 px-5 whitespace-nowrap text-slate-600">
                          <div>
                            <span className="block font-medium">{formatDate(card.created_at)}</span>
                            {card.expires_at && !isClaimed && (
                              <span className="text-[11px] text-slate-400 block">
                                Exp: {new Date(card.expires_at).toLocaleDateString('en-IN')}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GiftCardsScreen;
