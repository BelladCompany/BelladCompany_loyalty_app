import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  LogOut,
  Copy,
  Check,
  ShieldCheck,
  Repeat,
  Car,
  Star,
  Users,
  Gift,
  Loader2,
  ChevronDown,
  Info,
  Sparkles,
  ArrowRight,
  Share2,
  Phone,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  Fuel,
  Wrench,
  Award,
  Tag,
  Zap,
  ChevronRight,
  Home,
  Receipt,
  BadgePercent,
  CheckCheck,
  ArrowUpRight,
  Ticket,
} from 'lucide-react';
import ApiService from '../../services/api';
import SendGiftModal from './SendGiftModal';

// Clean Category Icon with soft pastel background
const CategoryIcon = ({ type }) => {
  switch (type) {
    case 'finance':
    case 'inhouse_finance':
      return <span className="font-black text-xs text-emerald-700">₹</span>;
    case 'insurance':
    case 'inhouse_insurance':
      return <ShieldCheck className="w-4 h-4 text-blue-600" />;
    case 'exchange':
    case 'inhouse_exchange':
      return <Repeat className="w-4 h-4 text-amber-600" />;
    case 'purchase':
      return <Car className="w-4 h-4 text-indigo-600" />;
    case 'gift_card':
      return <Gift className="w-4 h-4 text-purple-600" />;
    case 'referral':
      return <Users className="w-4 h-4 text-pink-600" />;
    case 'redeem':
      return <Sparkles className="w-4 h-4 text-rose-600" />;
    default:
      return <Wrench className="w-4 h-4 text-slate-500" />;
  }
};

// Memoized Clean Transaction Ledger Row
const LedgerRow = memo(({ item }) => {
  const isPositive = (item.points || 0) >= 0;
  const formattedPoints = isPositive
    ? `+${(item.points || 0).toLocaleString('en-IN')}`
    : `${(item.points || 0).toLocaleString('en-IN')}`;

  return (
    <div className="flex items-center justify-between py-3.5 px-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-200 transition-all shadow-xs gap-3">
      <div className="flex items-center space-x-3.5 min-w-0 pr-1">
        <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
          <CategoryIcon type={item.type} />
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate tracking-tight">{item.text}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-slate-400 font-medium">
            <span>{item.date}</span>
            {item.amount && (
              <>
                <span>•</span>
                <span className="font-mono text-slate-600">Bill: ₹{Number(item.amount).toLocaleString('en-IN')}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <span
          className={`text-xs font-black font-mono px-3 py-1 rounded-full whitespace-nowrap inline-block ${
            isPositive
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700'
          }`}
        >
          {formattedPoints} PTS
        </span>
      </div>
    </div>
  );
});

LedgerRow.displayName = 'LedgerRow';

export default function PortalDashboardScreen({ customerInfo, onSignOut }) {
  const [profile, setProfile] = useState(null);
  const [ledgerItems, setLedgerItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  // Navigation tabs: overview, gift_cards, benefits, referrals, transactions, garage, profile
  const [activeTab, setActiveTab] = useState('overview');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedCard, setCopiedCard] = useState('');
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [showClaimBox, setShowClaimBox] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [sendGiftModalOpen, setSendGiftModalOpen] = useState(false);

  // Gift Cards State
  const [myGiftCards, setMyGiftCards] = useState([]);
  const [loadingGiftCards, setLoadingGiftCards] = useState(false);
  const [claimCardCode, setClaimCardCode] = useState('');
  const [claimPin, setClaimPin] = useState('');
  const [isClaimingGiftCard, setIsClaimingGiftCard] = useState(false);
  const [revealedPins, setRevealedPins] = useState({});
  const [giftCardSubTab, setGiftCardSubTab] = useState('vouchers'); // 'vouchers' | 'purchased'

  // Referrals State
  const [referralsList, setReferralsList] = useState([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [refereeName, setRefereeName] = useState('');
  const [refereePhone, setRefereePhone] = useState('');
  const [refereeModel, setRefereeModel] = useState('');
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);

  // Member Benefits Tab selection: Bronze, Silver, Gold
  const [selectedTierTab, setSelectedTierTab] = useState('Gold');

  const loadProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const data = await ApiService.portalGetMe();
      setProfile(data);
      if (data?.tier?.current) {
        setSelectedTierTab(data.tier.current);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Could not load account details. Please refresh.');
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const loadLedger = useCallback(async (cursor = null) => {
    try {
      if (!cursor) setLoadingLedger(true);
      else setLoadingMore(true);

      const res = await ApiService.portalGetLedger(cursor);
      if (cursor) {
        setLedgerItems((prev) => [...prev, ...(res.items || [])]);
      } else {
        setLedgerItems(res.items || []);
      }
      setNextCursor(res.nextCursor || null);
    } catch (err) {
      console.error('Failed to load ledger:', err);
    } finally {
      setLoadingLedger(false);
      setLoadingMore(false);
    }
  }, []);

  const loadGiftCards = useCallback(async () => {
    try {
      setLoadingGiftCards(true);
      const res = await ApiService.portalGetMyGiftCards();
      setMyGiftCards(res.data?.cards || []);
    } catch (err) {
      console.error('Failed to load gift cards:', err);
    } finally {
      setLoadingGiftCards(false);
    }
  }, []);

  const loadReferrals = useCallback(async () => {
    try {
      setLoadingReferrals(true);
      const res = await ApiService.portalGetReferrals();
      setReferralsList(res.referrals || []);
    } catch (err) {
      console.error('Failed to load referrals:', err);
    } finally {
      setLoadingReferrals(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadLedger();
    loadGiftCards();
    loadReferrals();
  }, [loadProfile, loadLedger, loadGiftCards, loadReferrals]);

  const firstName = profile?.name ? profile.name.split(' ')[0] : 'Valued Customer';
  const referralLink = profile?.referralCode
    ? `${window.location.origin}/portal?ref=${profile.referralCode}`
    : `${window.location.origin}/portal`;

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyCard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCard(code);
    setTimeout(() => setCopiedCard(''), 2500);
  };

  const togglePinReveal = (cardId) => {
    setRevealedPins((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  // Direct 1-Click Claim for cards already in customer's account/phone
  const handleClaimCardDirect = async (card) => {
    setIsClaimingGiftCard(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await ApiService.portalClaimGiftCard(card.card_number, card.pin_code);
      setSuccessMsg(res.message || 'Gift card balance successfully added to your loyalty points!');
      loadProfile();
      loadLedger();
      loadGiftCards();
    } catch (err) {
      setError(err.message || 'Failed to claim gift card.');
    } finally {
      setIsClaimingGiftCard(false);
    }
  };

  // Claim Gift Card to Account by typing code & pin
  const handleClaimGiftCard = async (e) => {
    e.preventDefault();
    if (!claimCardCode.trim()) {
      setError('Please enter the 16-character Gift Card Code.');
      return;
    }

    setIsClaimingGiftCard(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await ApiService.portalClaimGiftCard(claimCardCode.trim(), claimPin.trim() || null);
      setSuccessMsg(res.message || 'Gift card successfully claimed to your account!');
      setClaimCardCode('');
      setClaimPin('');
      setShowClaimBox(false);
      loadProfile();
      loadLedger();
      loadGiftCards();
    } catch (err) {
      setError(err.message || 'Failed to claim gift card. Please verify the code and PIN.');
    } finally {
      setIsClaimingGiftCard(false);
    }
  };

  // Submit Friend Referral
  const handleReferFriendSubmit = async (e) => {
    e.preventDefault();
    if (!refereeName.trim() || !refereePhone.trim()) {
      setError("Please enter your friend's name and mobile number.");
      return;
    }

    setIsSubmittingReferral(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await ApiService.portalSubmitReferral({
        referee_name: refereeName.trim(),
        referee_phone: refereePhone.trim(),
        vehicle_model: refereeModel.trim(),
      });
      setSuccessMsg(res.message || 'Friend referral submitted successfully!');
      setRefereeName('');
      setRefereePhone('');
      setRefereeModel('');
      loadReferrals();
    } catch (err) {
      setError(err.message || 'Failed to submit referral.');
    } finally {
      setIsSubmittingReferral(false);
    }
  };

  // Calculate points and cash values
  const currentBalance = profile?.balance || profile?.points || 0;
  const cashValue = profile?.redeemableValue ?? Math.floor(currentBalance / 4);
  const currentTier = profile?.tier?.current || 'Silver';
  const nextTier = profile?.tier?.next || (currentTier === 'Silver' ? 'Gold' : 'Platinum');
  const nextTierPoints = profile?.tier?.next_points || (currentTier === 'Silver' ? 5000 : 10000);
  const lifetimePoints = profile?.lifetime_points || currentBalance;
  const pointsToLevelUp = Math.max(0, nextTierPoints - lifetimePoints);
  const tierProgress = profile?.tier?.progress_percentage || Math.min(100, Math.round((lifetimePoints / nextTierPoints) * 100));

  // Navigation Items (Matching clean app style)
  const navTabs = [
    { id: 'overview', label: 'Home', icon: Home },
    { id: 'benefits', label: 'Membership', icon: Award },
    { id: 'gift_cards', label: 'Vouchers', icon: Ticket, count: myGiftCards.length || null },
    { id: 'referrals', label: 'Refer & Earn', icon: Users, count: referralsList.length || null },
    { id: 'transactions', label: 'Activity', icon: Clock },
    { id: 'garage', label: 'Garage', icon: Car },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-emerald-600 selection:text-white antialiased">
      {/* ─── 1. Clean App Header (Mobile & Desktop) ────────────────────── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 p-1 flex items-center justify-center shrink-0">
              <img
                src="/bellad-logo.png"
                alt="Bellad Logo"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div>
              <span className="text-sm font-extrabold text-slate-900 tracking-tight block">
                {profile?.firm_name || 'Bellad Automobile'}
              </span>
              <div className="flex items-center gap-1.5 -mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-slate-400 tracking-wide">
                  Rewards Portal
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {profile?.aadhaar && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Aadhaar Verified
              </span>
            )}

            <button
              type="button"
              onClick={() => setSendGiftModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-full shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Send Gift</span>
            </button>

            <button
              onClick={onSignOut}
              title="Sign out"
              className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── 2. Top Segmented App Navigation Bar ────────────────────────── */}
      <nav className="bg-white border-b border-slate-100 sticky top-[57px] z-30">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1.5">
            {navTabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTab(t.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`relative flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer rounded-full shrink-0 ${
                    isActive
                      ? 'text-emerald-700 bg-emerald-50/90 font-black'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{t.label}</span>
                  {t.count !== null && t.count > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t.count}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-emerald-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ─── Main Content Container (Centered for Clean App Focus) ──────── */}
      <main className="max-w-2xl mx-auto px-4 pt-5 pb-24 space-y-6 flex-1 w-full">
        {/* Global Notifications */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-900 text-sm font-bold">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-900 text-sm font-bold">✕</button>
          </div>
        )}

        {/* ─── 3. PRIMARY HERO CARD (Exact Modern Design from Reference Image 1) ─── */}
        <div className="bg-white border border-slate-100 rounded-[28px] p-5 sm:p-6 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-5">
          {/* Top Row: "You're Silver Member" with Tier Emblem */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              You&apos;re {currentTier} Member
            </h1>
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-mono text-[10px] font-black text-slate-700 uppercase shadow-2xs">
              {currentTier === 'Gold' ? '🥇' : '🥈'}
            </div>
          </div>

          {/* Progress Bar Widget: "200 more points to level up!" with coin position */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>
                {pointsToLevelUp > 0 ? (
                  <>
                    <strong className="text-slate-900 font-extrabold">{pointsToLevelUp.toLocaleString('en-IN')}</strong> more points to level up!
                  </>
                ) : (
                  <strong className="text-emerald-600 font-extrabold">You&apos;ve reached the top level!</strong>
                )}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {lifetimePoints.toLocaleString('en-IN')} / {nextTierPoints.toLocaleString('en-IN')} PTS
              </span>
            </div>

            {/* Clean Progress Track */}
            <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-900 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(8, tierProgress))}%` }}
              />
            </div>
          </div>

          {/* Points Balance Section (Exact reference styling) */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-slate-400 block">You&apos;ve collected</span>
              <div className="flex items-baseline gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center shadow-xs">
                  ₹
                </div>
                <span className="text-3xl sm:text-4xl font-black text-slate-950 font-mono tracking-tight">
                  {currentBalance.toLocaleString('en-IN')}
                </span>
                <span className="text-base font-bold text-slate-900">Points</span>
              </div>
              <p className="text-xs text-emerald-700 font-bold mt-1">
                ≈ ₹{cashValue.toLocaleString('en-IN')} Cash Value (4 PTS = ₹1)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('transactions');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-full border border-slate-200 transition shadow-2xs cursor-pointer"
              >
                Point History
              </button>

              <button
                type="button"
                onClick={() => setShowRedeemModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full transition shadow-xs cursor-pointer"
              >
                Redeem →
              </button>
            </div>
          </div>

          {/* Reward Notification Banner (Exact reference styling) */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('benefits');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#FFFBF0] border border-amber-200/60 hover:bg-amber-100/60 transition text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Gift className="w-3.5 h-3.5 text-amber-700" />
              </div>
              <span className="text-xs font-bold text-amber-950">
                Each shipment or service done will earn 60 points
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-700 group-hover:translate-x-0.5 transition" />
          </button>
        </div>

        {/* ─── TAB 1: OVERVIEW / HOME VIEW ──────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Primary Action Highlights: Redeem your points! (2x2 Grid like reference screen 1) */}
            <div className="space-y-3">
              <h2 className="text-base font-extrabold text-slate-900">
                Redeem your loyalty points!
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Gift Cards Card (Amazon style e-gift card) */}
                <div
                  onClick={() => setSendGiftModalOpen(true)}
                  className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-[0_2px_15px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-slate-200 hover:shadow-xs transition cursor-pointer group"
                >
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-100/60 flex items-center justify-between">
                      <div>
                        <span className="text-lg font-black text-emerald-900 block">WhatsApp e-Gift</span>
                        <span className="text-xs text-emerald-700 font-medium">Instant digital transfer</span>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                        <Gift className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition">
                        Gift Points to Friends &amp; Family!
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Share points or buy with Razorpay. Recipient receives a WhatsApp claiming link!
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <span>Send Gift Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-400">4 PTS = ₹1</span>
                  </div>
                </div>

                {/* 2. Service Discount Voucher Card */}
                <div
                  onClick={() => setShowRedeemModal(true)}
                  className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-[0_2px_15px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-slate-200 hover:shadow-xs transition cursor-pointer group"
                >
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-amber-50 p-4 border border-amber-100/60 flex items-center justify-between">
                      <div>
                        <span className="text-lg font-black text-amber-900 block">Save ₹{cashValue}</span>
                        <span className="text-xs text-amber-700 font-medium">On your service bill</span>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                        <Sparkles className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-amber-700 transition">
                        Score a discount on your bill!
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Redeem points directly at any Bellad workshop cashier desk during invoice billing.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                      <span>How to Redeem</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-400">{currentBalance} PTS Available</span>
                  </div>
                </div>

                {/* 3. Friend Referral Card */}
                <div
                  onClick={() => {
                    setActiveTab('referrals');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-[0_2px_15px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-slate-200 hover:shadow-xs transition cursor-pointer group"
                >
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-blue-50 p-4 border border-blue-100/60 flex items-center justify-between">
                      <div>
                        <span className="text-lg font-black text-blue-900 block">500 Bonus PTS</span>
                        <span className="text-xs text-blue-700 font-medium">Per vehicle referral</span>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-700 transition">
                        Refer Friends &amp; Earn Rewards
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Share your personal link via WhatsApp. Earn points when friends take delivery!
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                      <span>Share on WhatsApp</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-400">{referralsList.length} Referred</span>
                  </div>
                </div>

                {/* 4. Member Tier Perks Card */}
                <div
                  onClick={() => {
                    setActiveTab('benefits');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-[0_2px_15px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-slate-200 hover:shadow-xs transition cursor-pointer group"
                >
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-purple-50 p-4 border border-purple-100/60 flex items-center justify-between">
                      <div>
                        <span className="text-lg font-black text-purple-900 block">{currentTier} Member</span>
                        <span className="text-xs text-purple-700 font-medium">VIP dealership benefits</span>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                        <Award className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-purple-700 transition">
                        Exclusive Member Privileges
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Explore in-house finance loans (+100 PTS), insurance (+50 PTS) &amp; exchange (+200 PTS).
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-700 flex items-center gap-1">
                      <span>View Benefits</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-400">Level {currentTier}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* My Active Gift Cards Snippet (if any) */}
            {myGiftCards.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
                    My Active Vouchers ({myGiftCards.length})
                  </h3>
                  <button
                    onClick={() => setActiveTab('gift_cards')}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    View All →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {myGiftCards.slice(0, 2).map((card) => {
                    const balanceRupees = Number(card.balance_amount || 0);
                    const convertiblePts = Math.floor(balanceRupees * 4);
                    const isRedeemed = card.status === 'redeemed' || balanceRupees === 0;

                    return (
                      <div
                        key={card.card_id}
                        className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-slate-700">
                            {card.card_number}
                          </span>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                            ₹{balanceRupees.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {!isRedeemed && balanceRupees > 0 && (
                          <button
                            type="button"
                            disabled={isClaimingGiftCard}
                            onClick={() => handleClaimCardDirect(card)}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Add to Points (+{convertiblePts.toLocaleString('en-IN')} PTS)</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Activity Snippet */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
                  Recent Activity
                </h3>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  View All ({ledgerItems.length}) →
                </button>
              </div>

              {loadingLedger ? (
                <div className="py-8 text-center text-slate-400 bg-white border border-slate-100 rounded-2xl">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-slate-400" />
                  <p className="text-xs font-mono">Loading history...</p>
                </div>
              ) : ledgerItems.length === 0 ? (
                <div className="py-8 text-center bg-white border border-slate-100 rounded-2xl">
                  <p className="text-xs text-slate-400">No transactions recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ledgerItems.slice(0, 3).map((item) => (
                    <LedgerRow key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 2: MEMBER BENEFITS (Matching Screen 2 of reference image) ─── */}
        {activeTab === 'benefits' && (
          <div className="space-y-5 animate-in fade-in">
            {/* Top Back / Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">
                Member Benefits
              </h2>
            </div>

            {/* Top Member Status Card (Matching Screen 2 in Reference) */}
            <div className="bg-[#FFFDF5] border border-amber-200/80 rounded-[28px] p-5 sm:p-6 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                  {currentTier === 'Gold' ? '🥇' : '🥈'}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {currentTier} Member
                  </h3>
                  <p className="text-xs text-amber-900 mt-0.5">
                    {pointsToLevelUp > 0 ? `${pointsToLevelUp.toLocaleString('en-IN')} more points to level up!` : "You've reached the maximum level!"}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-100/60 rounded-2xl flex items-center justify-between text-xs font-bold text-amber-950">
                <span className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-800" />
                  Each service visit will earn {currentTier === 'Gold' ? '100' : '60'} points
                </span>
                <ChevronRight className="w-4 h-4 text-amber-800" />
              </div>
            </div>

            {/* Underline Tabs: Bronze | Silver | Gold (Exact reference styling) */}
            <div className="flex items-center justify-around border-b border-slate-200 pt-1">
              {['Bronze', 'Silver', 'Gold'].map((tierName) => {
                const isSelected = selectedTierTab === tierName;
                return (
                  <button
                    key={tierName}
                    type="button"
                    onClick={() => setSelectedTierTab(tierName)}
                    className={`py-3 px-6 text-sm font-bold relative transition cursor-pointer ${
                      isSelected ? 'text-slate-900 font-black' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <span>{tierName}</span>
                    {isSelected && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* List of Benefits (Matching Screen 2 in Reference) */}
            <div className="space-y-4 pt-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
                {selectedTierTab.toUpperCase()} MEMBER BENEFITS
              </h4>

              <div className="bg-white border border-slate-100 rounded-[28px] p-5 space-y-5 shadow-xs">
                {/* Benefit 1 */}
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    🪙
                  </div>
                  <div>
                    <h5 className="text-sm font-extrabold text-slate-900">
                      Earn {selectedTierTab === 'Gold' ? '100' : selectedTierTab === 'Silver' ? '60' : '40'} points with every package order.
                    </h5>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Get more points every time you book a service or maintenance visit! It&apos;s a sweet deal.
                    </p>
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Benefit 2 */}
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Gift className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h5 className="text-sm font-extrabold text-slate-900">
                      Get a chance to win vouchers every day.
                    </h5>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Get WhatsApp notifications about exclusive offers, seasonal promotions, and limited-time bonus credits.
                    </p>
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Benefit 3 */}
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Tag className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h5 className="text-sm font-extrabold text-slate-900">
                      Save up to {selectedTierTab === 'Gold' ? '30%' : '15%'} on your purchases.
                    </h5>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Get ready to save big! Enjoy direct loyalty point deduction on your next invoice bill.
                    </p>
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Benefit 4: Dealership In-House Bonuses */}
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h5 className="text-sm font-extrabold text-slate-900">
                      In-House Dealership Bonus Slabs
                    </h5>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Unlocked with vehicle financing (+100 PTS), insurance renewals (+50 PTS), and trade-in exchange (+200 PTS).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: VOUCHERS & GIFT CARDS (Matching Screen 3 of reference image) ─── */}
        {activeTab === 'gift_cards' && (
          <div className="space-y-5 animate-in fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">
                Vouchers
              </h2>
              <button
                type="button"
                onClick={() => setSendGiftModalOpen(true)}
                className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-full shadow-xs transition cursor-pointer"
              >
                + Send e-Gift
              </button>
            </div>

            {/* Enter Promo Code Banner (Matching Screen 3 in Reference) */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowClaimBox(!showClaimBox)}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#EBF7EE] border border-emerald-200/80 hover:bg-emerald-100/60 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-200 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-emerald-800" />
                  </div>
                  <span className="text-xs font-bold text-emerald-950">
                    Got a promo code or gift card? Enter here
                  </span>
                </div>
                <ChevronRight className={`w-4 h-4 text-emerald-800 transition ${showClaimBox ? 'rotate-90' : ''}`} />
              </button>

              {/* Collapsible Claim Form */}
              {showClaimBox && (
                <form onSubmit={handleClaimGiftCard} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 shadow-xs">
                  <p className="text-xs text-slate-500">
                    Enter the 16-character code and optional 4-digit PIN to claim points directly to your wallet.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <input
                      type="text"
                      required
                      placeholder="GIFT-BELL-XXXX-XXXX"
                      value={claimCardCode}
                      onChange={(e) => setClaimCardCode(e.target.value.toUpperCase())}
                      className="sm:col-span-1.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold uppercase text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                    <input
                      type="password"
                      maxLength="6"
                      placeholder="PIN"
                      value={claimPin}
                      onChange={(e) => setClaimPin(e.target.value)}
                      className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                    <button
                      type="submit"
                      disabled={isClaimingGiftCard}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      {isClaimingGiftCard ? 'Claiming...' : 'Claim Code'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Underline Tabs: Vouchers | Purchased (Matching Screen 3 in Reference) */}
            <div className="flex items-center justify-around border-b border-slate-200">
              <button
                type="button"
                onClick={() => setGiftCardSubTab('vouchers')}
                className={`py-3 px-6 text-sm font-bold relative transition cursor-pointer ${
                  giftCardSubTab === 'vouchers' ? 'text-slate-900 font-black' : 'text-slate-400'
                }`}
              >
                <span>Active Vouchers</span>
                {giftCardSubTab === 'vouchers' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setGiftCardSubTab('purchased')}
                className={`py-3 px-6 text-sm font-bold relative transition cursor-pointer ${
                  giftCardSubTab === 'purchased' ? 'text-slate-900 font-black' : 'text-slate-400'
                }`}
              >
                <span>Sent via WhatsApp</span>
                {giftCardSubTab === 'purchased' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
                )}
              </button>
            </div>

            {/* Vouchers List */}
            {myGiftCards.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-[28px] p-8 text-center space-y-2">
                <Ticket className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">No Vouchers Yet</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  When you receive or purchase a gift card, it will appear here for 1-click redemption.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {myGiftCards.map((card) => {
                  const isPinVisible = revealedPins[card.card_id];
                  const isRedeemed = card.status === 'redeemed' || Number(card.balance_amount) === 0;
                  const balanceRupees = Number(card.balance_amount || 0);
                  const convertiblePts = Math.floor(balanceRupees * 4);

                  return (
                    <div
                      key={card.card_id}
                      className="bg-white border border-slate-100 rounded-[24px] p-4.5 shadow-xs space-y-3 relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                            ₹
                          </div>
                          <div>
                            <h5 className="text-sm font-black text-slate-900">
                              ₹{balanceRupees.toLocaleString('en-IN')} e-Gift Voucher
                            </h5>
                            <span className="text-[11px] text-slate-400 font-mono">
                              Expires: {card.expires_at ? new Date(card.expires_at).toLocaleDateString('en-IN') : '1 Year'}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            isRedeemed
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {card.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Code strip */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between font-mono text-xs">
                        <span className="font-bold text-slate-800 tracking-wider">{card.card_number}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => togglePinReveal(card.card_id)}
                            className="text-[11px] text-emerald-700 hover:text-emerald-800 font-sans cursor-pointer underline"
                          >
                            {isPinVisible ? card.pin_code : 'Reveal PIN'}
                          </button>
                          <button
                            onClick={() => handleCopyCard(card.card_number)}
                            className="p-1 hover:bg-slate-200 rounded cursor-pointer transition"
                            title="Copy code"
                          >
                            {copiedCard === card.card_number ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Direct Claim to Points Button */}
                      {!isRedeemed && balanceRupees > 0 && (
                        <button
                          type="button"
                          disabled={isClaimingGiftCard}
                          onClick={() => handleClaimCardDirect(card)}
                          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isClaimingGiftCard ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                          ) : (
                            <>
                              <span>Use Now: Add to Points (+{convertiblePts.toLocaleString('en-IN')} PTS)</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: REFER & EARN (Modern clean referral sharing) ─────────── */}
        {activeTab === 'referrals' && (
          <div className="space-y-5 animate-in fade-in">
            <h2 className="text-lg font-black text-slate-900">
              Refer &amp; Earn
            </h2>

            {/* Share Card */}
            <div className="bg-white border border-slate-100 rounded-[28px] p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Your Referral Invite Link</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Share on WhatsApp. Earn 500 bonus points on every successful delivery!
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Hey! I recommend ${profile?.firm_name || 'Bellad Automobiles'} for your next vehicle purchase. Use my reward link: ${referralLink}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  <button
                    onClick={handleCopyReferral}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-full transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono text-xs text-slate-600 select-all break-all">
                {referralLink}
              </div>
            </div>

            {/* Refer a Friend Form */}
            <div className="bg-white border border-slate-100 rounded-[28px] p-5 sm:p-6 space-y-3.5 shadow-xs">
              <h3 className="text-sm font-black text-slate-900">Direct Friend Recommendation</h3>
              <p className="text-xs text-slate-400 -mt-1">
                Enter your friend&apos;s contact details and our relationship manager will reach out with exclusive offers.
              </p>

              <form onSubmit={handleReferFriendSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-1">
                <input
                  type="text"
                  required
                  placeholder="Friend's Full Name *"
                  value={refereeName}
                  onChange={(e) => setRefereeName(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
                <input
                  type="tel"
                  required
                  placeholder="Mobile Number *"
                  value={refereePhone}
                  onChange={(e) => setRefereePhone(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
                <input
                  type="text"
                  placeholder="Interested Model (Optional)"
                  value={refereeModel}
                  onChange={(e) => setRefereeModel(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
                <div className="sm:col-span-3 flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingReferral}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingReferral ? 'Submitting...' : 'Submit Recommendation →'}
                  </button>
                </div>
              </form>
            </div>

            {/* Referrals Status Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
                Referral History ({referralsList.length})
              </h3>

              {referralsList.length === 0 ? (
                <div className="p-8 bg-white border border-slate-100 rounded-[28px] text-center text-xs text-slate-400">
                  No friends referred yet. Share your link above to start earning!
                </div>
              ) : (
                <div className="space-y-2">
                  {referralsList.map((ref, idx) => (
                    <div
                      key={ref.id || idx}
                      className="p-3.5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between text-xs shadow-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{ref.referee_name || 'Friend'}</span>
                        <span className="text-[11px] text-slate-400 block font-mono">{ref.referee_phone}</span>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700">
                          {ref.status || 'Pending'}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                          {ref.created_at ? new Date(ref.created_at).toLocaleDateString('en-IN') : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 5: POINT HISTORY & TRANSACTIONS (Matching Screen 4 in Reference) ─── */}
        {activeTab === 'transactions' && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">
                Point History
              </h2>
              <button
                onClick={() => setShowRedeemModal(true)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                Redemption Rules →
              </button>
            </div>

            {loadingLedger ? (
              <div className="py-12 text-center text-slate-400 bg-white border border-slate-100 rounded-[28px]">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                <p className="text-xs font-mono">Loading transaction records...</p>
              </div>
            ) : ledgerItems.length === 0 ? (
              <div className="text-center py-12 bg-white border border-slate-100 rounded-[28px] p-6 shadow-xs">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-900">No Transactions Yet</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Points earned from vehicle purchases, service visits, and gift vouchers will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {ledgerItems.map((item) => (
                  <LedgerRow key={item.id} item={item} />
                ))}
              </div>
            )}

            {nextCursor && (
              <div className="pt-2 text-center">
                <button
                  onClick={() => loadLedger(nextCursor)}
                  disabled={loadingMore}
                  className="inline-flex items-center text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 py-2.5 px-5 rounded-full transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {loadingMore ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  <span>Load Earlier History</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 6: MY GARAGE (Vehicles) ─────────────────────────────────── */}
        {activeTab === 'garage' && (
          <div className="space-y-5 animate-in fade-in">
            <h2 className="text-lg font-black text-slate-900">
              My Garage
            </h2>

            {(profile?.vehicles || []).length === 0 ? (
              <div className="p-10 text-center bg-white border border-slate-100 rounded-[28px] space-y-2 shadow-xs">
                <Car className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-800">No Vehicles Linked</p>
                <p className="text-xs text-slate-400">
                  Vehicles purchased at {profile?.firm_name || 'our showroom'} will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {profile.vehicles.map((v, idx) => (
                  <div
                    key={v.vehicle_id || idx}
                    className="bg-white border border-slate-100 rounded-[28px] p-5 space-y-3.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-black text-slate-900 text-sm block">
                          {v.brand_name} {v.model}
                        </span>
                        <span className="text-xs text-slate-400">{v.variant || 'Standard'}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                        {v.registration_number || v.vin || 'Pending Reg'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100 font-mono">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block font-sans">Gross Price</span>
                        <span className="font-bold text-slate-800">
                          {v.gross_ex_showroom_price ? `₹${Number(v.gross_ex_showroom_price).toLocaleString('en-IN')}` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-emerald-700 text-[10px] uppercase font-bold block font-sans">Net Price</span>
                        <span className="font-bold text-emerald-700">
                          {v.net_ex_showroom_price ? `₹${Number(v.net_ex_showroom_price).toLocaleString('en-IN')}` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block font-sans">Fuel Type</span>
                        <span className="font-bold text-slate-800 uppercase">{v.fuel_type || 'Petrol'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block font-sans">Delivery Date</span>
                        <span className="font-bold text-slate-800">{v.purchase_date || '—'}</span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-semibold text-emerald-700">
                        <Check className="w-3.5 h-3.5" />
                        Service Points &amp; Redemption Eligible
                      </span>
                      <span className="font-mono">VIN: {v.vin ? v.vin.slice(-6) : '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 7: PROFILE & KYC ────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-slate-100 rounded-[28px] p-5 sm:p-6 space-y-4 shadow-xs animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Customer Profile &amp; KYC</h3>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-50 text-emerald-700 font-mono">
                Aadhaar Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Customer Name</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {profile?.name || 'Customer'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">WhatsApp Mobile Number</span>
                <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                  +91 {profile?.phone || '—'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Dealership Group</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {profile?.firm_name || 'Bellad & Company'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Home Dealership Branch</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {profile?.branch_name || 'Main Showroom'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
              For security, to update your registered mobile number, visit your nearest showroom cashier desk with your Aadhaar card for instant WhatsApp verification.
            </p>
          </div>
        )}
      </main>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white py-4 mt-auto text-center text-xs text-slate-400 space-y-1">
        <p>&copy; {new Date().getFullYear()} {profile?.firm_name || 'Bellad Automobile Corporation'}. All rights reserved.</p>
        <p className="text-[11px] font-mono text-slate-400">
          4 PTS = ₹1 &bull; Instant WhatsApp Redemption
        </p>
      </footer>

      {/* ─── How to Redeem Modal (Clean & Modern) ─────────────────────────── */}
      {showRedeemModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[28px] max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2 text-slate-900">
              <Info className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold">How to Redeem Points</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Loyalty points are directly redeemed at any authorized Bellad showroom or service cashier counter during invoice billing.
            </p>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-700 space-y-1.5 font-medium">
              <p>
                <strong className="font-bold text-slate-900">Current Points:</strong>{' '}
                <span className="font-mono text-slate-900 font-bold">{currentBalance.toLocaleString('en-IN')} PTS</span>
              </p>
              <p>
                <strong className="font-bold text-slate-900">Cashback Value:</strong>{' '}
                <span className="font-mono text-emerald-700 font-bold">₹{cashValue.toLocaleString('en-IN')}</span>
              </p>
              <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-200">
                Rule: 4 Points = ₹1 deduction against accessories, service labor, or spare parts.
              </p>
            </div>
            <button
              onClick={() => setShowRedeemModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-full text-xs transition cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Send Gift to Friends & Family Modal */}
      <SendGiftModal
        isOpen={sendGiftModalOpen}
        onClose={() => setSendGiftModalOpen(false)}
        customer={profile}
        currentBalance={currentBalance}
        onGiftSent={() => {
          loadProfile();
          loadLedger();
          loadGiftCards();
        }}
      />
    </div>
  );
}
