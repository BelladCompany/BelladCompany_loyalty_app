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
  Flame,
  BadgePercent,
  CheckCheck,
  ExternalLink,
} from 'lucide-react';
import ApiService from '../../services/api';
import SendGiftModal from './SendGiftModal';

// Icon mapper for transaction categories
const CategoryIcon = ({ type }) => {
  switch (type) {
    case 'finance':
    case 'inhouse_finance':
      return <span className="text-emerald-600 font-bold text-xs">₹</span>;
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

// Memoized Transaction Activity Row
const LedgerRow = memo(({ item }) => {
  const isPositive = (item.points || 0) >= 0;
  const formattedPoints = isPositive
    ? `+${(item.points || 0).toLocaleString('en-IN')}`
    : `${(item.points || 0).toLocaleString('en-IN')}`;

  return (
    <div className="flex items-center justify-between py-3.5 px-4 bg-white border border-slate-200/80 rounded-2xl hover:border-slate-300 hover:shadow-xs transition-all gap-3">
      <div className="flex items-center space-x-3 min-w-0 pr-1">
        <div className="w-10 h-10 rounded-xl bg-slate-100/90 border border-slate-200 flex items-center justify-center shrink-0">
          <CategoryIcon type={item.type} />
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{item.text}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-slate-500 font-medium">
            <span>{item.date}</span>
            {item.amount && (
              <>
                <span>•</span>
                <span className="font-mono text-slate-700">Bill: ₹{Number(item.amount).toLocaleString('en-IN')}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <span
          className={`text-xs sm:text-sm font-black font-mono px-2.5 py-1 rounded-xl shadow-xs whitespace-nowrap inline-block ${
            isPositive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
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

  // Referrals State
  const [referralsList, setReferralsList] = useState([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [refereeName, setRefereeName] = useState('');
  const [refereePhone, setRefereePhone] = useState('');
  const [refereeModel, setRefereeModel] = useState('');
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);

  // Active Offer / Tier Tab in Benefits View
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

  // Initials for avatar
  const initials = profile?.name
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'BC';

  // Navigation items config
  const navItems = [
    { id: 'overview', label: 'Home', icon: Home, count: null },
    { id: 'gift_cards', label: 'Gift Cards', icon: Gift, count: myGiftCards.length || null },
    { id: 'benefits', label: 'Benefits & Offers', icon: Award, count: null },
    { id: 'referrals', label: 'Refer & Earn', icon: Users, count: referralsList.length || null },
    { id: 'transactions', label: 'Transactions', icon: Clock, count: ledgerItems.length || null },
    { id: 'garage', label: 'Vehicles', icon: Car, count: profile?.vehicles?.length || null },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-500 selection:text-white antialiased">
      {/* ─── 1. Modern Top Header ────────────────────────────────────────── */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-xs">
              <img
                src="/bellad-logo.png"
                alt="Bellad Logo"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div>
              <span className="text-sm font-black text-slate-900 tracking-tight block truncate max-w-[170px] sm:max-w-xs md:max-w-none">
                {profile?.firm_name || 'Bellad Automobile'}
              </span>
              <div className="flex items-center gap-1.5 -mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Customer Rewards Pass
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {profile?.aadhaar && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Aadhaar Verified
              </span>
            )}

            <button
              type="button"
              onClick={() => setSendGiftModalOpen(true)}
              className="hidden xs:inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Send Gift</span>
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs hover:ring-2 hover:ring-emerald-500 transition cursor-pointer"
                title="View Profile & KYC"
              >
                {initials}
              </button>
              <button
                onClick={onSignOut}
                title="Sign out"
                className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-950 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── 2. Segmented Navigation Bar (Sticky under Header) ───────────── */}
      <nav className="bg-white border-b border-slate-200/80 sticky top-[57px] z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-2 sm:px-6">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                  {item.count !== null && item.count > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ─── Main Content Container ───────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-20 space-y-6 flex-1 w-full">
        {/* Global Notifications */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-900 text-sm font-bold">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-900 text-sm font-bold">✕</button>
          </div>
        )}

        {/* ─── SECTION 1: Clean Member Tier & Points Card (Inspired by reference UI) ── */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
          {/* Member Tier & Level-up Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  You&apos;re {currentTier} Member
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  VIP
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {profile?.name ? `Welcome back, ${firstName}!` : 'Bellad Automobile Customer Rewards'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                ID: {profile?.customer_id ? `BELLAD-${profile.customer_id}` : 'MEMBER'}
              </span>
            </div>
          </div>

          {/* Points to level up progress bar */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-700">
                {pointsToLevelUp > 0 ? (
                  <>
                    <span className="text-slate-900 font-black">{pointsToLevelUp.toLocaleString('en-IN')}</span> more points to level up to{' '}
                    <span className="text-amber-600">{nextTier}</span>!
                  </>
                ) : (
                  <span className="text-emerald-700 font-bold">🎉 Highest VIP Level Reached!</span>
                )}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {lifetimePoints.toLocaleString('en-IN')} / {nextTierPoints.toLocaleString('en-IN')} PTS
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(5, tierProgress))}%` }}
              />
            </div>
          </div>

          {/* Points Balance & Cash Equivalent Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 block">Total Loyalty Points Collected</span>
              <div className="flex items-baseline gap-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-black text-xs flex items-center justify-center border border-amber-300">
                    🪙
                  </div>
                  <span className="text-3xl sm:text-4xl font-black text-slate-950 font-mono tracking-tight">
                    {currentBalance.toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Points</span>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                  <span>≈ ₹{cashValue.toLocaleString('en-IN')} Cash Value</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">(4 PTS = ₹1)</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('transactions');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition border border-slate-200 cursor-pointer shadow-2xs"
              >
                Point History
              </button>

              <button
                type="button"
                onClick={() => setShowRedeemModal(true)}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
              >
                How to Redeem →
              </button>
            </div>
          </div>

          {/* Highlight perk strip */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('benefits');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 hover:bg-amber-100/70 transition text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-bold text-amber-950">
                Earn bonus points on every vehicle purchase, service visit &amp; friend referral
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition" />
          </button>
        </div>

        {/* ─── TAB 1: OVERVIEW / HIGHLIGHTS ─────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 4 Primary Highlight Cards (Amazon & Modern App Nav Style) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 font-mono">
                  Quick Access Highlights
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Gift Cards */}
                <div
                  onClick={() => {
                    setActiveTab('gift_cards');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition cursor-pointer group"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center group-hover:scale-105 transition">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition flex items-center gap-1.5">
                        Gift Cards
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Send WhatsApp e-gift cards to friends or claim voucher codes.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                      {myGiftCards.length > 0 ? `${myGiftCards.length} Active Card(s)` : 'Send via WhatsApp'}
                    </span>
                  </div>
                </div>

                {/* 2. Benefits */}
                <div
                  onClick={() => {
                    setActiveTab('benefits');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition cursor-pointer group"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center group-hover:scale-105 transition">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition flex items-center gap-1.5">
                        Member Benefits
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Tier perks, in-house finance loan bonus, insurance &amp; trade-in rewards.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                      {currentTier} VIP Privileges
                    </span>
                  </div>
                </div>

                {/* 3. Offers */}
                <div
                  onClick={() => {
                    setActiveTab('benefits');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition cursor-pointer group"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center group-hover:scale-105 transition">
                      <BadgePercent className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition flex items-center gap-1.5">
                        Exclusive Offers
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Special service discounts, free inspections &amp; accessory vouchers.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      Active Deals Available
                    </span>
                  </div>
                </div>

                {/* 4. Referrals */}
                <div
                  onClick={() => {
                    setActiveTab('referrals');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition cursor-pointer group"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center group-hover:scale-105 transition">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition flex items-center gap-1.5">
                        Refer &amp; Earn
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Share your unique referral link to earn bonus points on friend vehicle purchases.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                      {referralsList.length} Friend(s) Referred
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Banner: WhatsApp e-Gift Cards */}
            <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-slate-900 rounded-3xl p-5 sm:p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest bg-white/20 text-white px-2 py-0.5 rounded-md inline-block">
                  WhatsApp Gifting Engine
                </span>
                <h3 className="text-base sm:text-lg font-black">
                  Gift Loyalty Points to Friends &amp; Family!
                </h3>
                <p className="text-xs text-emerald-100 max-w-md leading-relaxed">
                  Send points from your wallet or purchase a gift with Razorpay. The receiver gets an instant WhatsApp claiming link!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSendGiftModalOpen(true)}
                className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 shrink-0 cursor-pointer active:scale-95"
              >
                <Gift className="w-4 h-4 text-emerald-600" />
                <span>Send via WhatsApp</span>
              </button>
            </div>

            {/* My Active Gift Cards Snippet (if any) */}
            {myGiftCards.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 font-mono">
                    My Active Gift Cards ({myGiftCards.length})
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
                        className="bg-white border border-slate-200 rounded-3xl p-4.5 shadow-xs flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 font-mono">
                            <Gift className="w-3.5 h-3.5 text-purple-600" />
                            {card.card_number}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ₹{balanceRupees.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {!isRedeemed && balanceRupees > 0 && (
                          <button
                            type="button"
                            disabled={isClaimingGiftCard}
                            onClick={() => handleClaimCardDirect(card)}
                            className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            <span>Add to Points (+{convertiblePts.toLocaleString('en-IN')} PTS)</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Transaction Activity Snippet */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 font-mono">
                  Recent Activity
                </h3>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="text-xs font-bold text-slate-700 hover:text-slate-950 cursor-pointer"
                >
                  Full History ({ledgerItems.length}) →
                </button>
              </div>

              {loadingLedger ? (
                <div className="py-8 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-slate-500" />
                  <p className="text-xs font-mono">Loading activity...</p>
                </div>
              ) : ledgerItems.length === 0 ? (
                <div className="py-8 text-center bg-white border border-slate-200 rounded-2xl">
                  <p className="text-xs text-slate-500">No transactions recorded yet.</p>
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

        {/* ─── TAB 2: DEDICATED GIFT CARDS VIEW ─────────────────────────────── */}
        {activeTab === 'gift_cards' && (
          <div className="space-y-6">
            {/* Header Description */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Digital Gift Cards
                </h2>
                <p className="text-xs text-slate-500">
                  Send points to loved ones via WhatsApp, or claim a received gift card voucher into your wallet.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSendGiftModalOpen(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <Gift className="w-4 h-4" />
                <span>Send a Gift via WhatsApp</span>
              </button>
            </div>

            {/* Claim Gift Card Form */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center font-bold shrink-0">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Claim a 16-Character Gift Card</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Received an e-gift code or physical voucher? Enter it below to credit points directly into your loyalty balance.
                  </p>
                </div>
              </div>

              <form onSubmit={handleClaimGiftCard} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <input
                  type="text"
                  required
                  placeholder="GIFT-BELL-XXXX-XXXX"
                  value={claimCardCode}
                  onChange={(e) => setClaimCardCode(e.target.value.toUpperCase())}
                  className="sm:col-span-1.5 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold uppercase text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
                <input
                  type="password"
                  maxLength="6"
                  placeholder="4-Digit PIN (if external card)"
                  value={claimPin}
                  onChange={(e) => setClaimPin(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold tracking-widest text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={isClaimingGiftCard}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isClaimingGiftCard ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <span>Claim to Wallet →</span>
                  )}
                </button>
              </form>
            </div>

            {/* My Active Gift Cards List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 font-mono">
                  My Active Gift Cards ({myGiftCards.length})
                </h3>
                {loadingGiftCards && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              </div>

              {myGiftCards.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2">
                  <Gift className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No Gift Cards in Your Wallet</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    When you receive a digital gift card from friends or buy one for yourself, it will show up here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {myGiftCards.map((card) => {
                    const isPinVisible = revealedPins[card.card_id];
                    const isRedeemed = card.status === 'redeemed' || Number(card.balance_amount) === 0;
                    const balanceRupees = Number(card.balance_amount || 0);
                    const convertiblePts = Math.floor(balanceRupees * 4);

                    return (
                      <div
                        key={card.card_id}
                        className={`rounded-3xl p-5 shadow-xs border flex flex-col justify-between space-y-4 ${
                          isRedeemed
                            ? 'bg-slate-100/80 border-slate-200 text-slate-500 opacity-75'
                            : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5 font-mono">
                              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                              Bellad e-Gift Card
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                isRedeemed
                                  ? 'bg-slate-200 text-slate-700'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {card.status.replace('_', ' ')}
                            </span>
                          </div>

                          <div>
                            <span className="text-xs text-slate-500 font-medium block">Card Value</span>
                            <div className="flex items-baseline gap-2 mt-0.5">
                              <span className="text-2xl font-black font-mono text-slate-950">
                                ₹{balanceRupees.toLocaleString('en-IN')}
                              </span>
                              <span className="text-xs text-slate-400">
                                (Initial: ₹{Number(card.initial_amount || 0).toLocaleString('en-IN')})
                              </span>
                            </div>
                          </div>

                          {/* Card Code */}
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between font-mono text-xs">
                            <span className="font-bold text-slate-800 tracking-wider">{card.card_number}</span>
                            <button
                              onClick={() => handleCopyCard(card.card_number)}
                              className="p-1 hover:bg-slate-200 rounded cursor-pointer transition"
                              title="Copy code"
                            >
                              {copiedCard === card.card_number ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-slate-600" />
                              )}
                            </button>
                          </div>

                          {/* PIN */}
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-500">
                              PIN: <strong className="text-slate-900">{isPinVisible ? card.pin_code : '••••'}</strong>
                            </span>
                            <button
                              onClick={() => togglePinReveal(card.card_id)}
                              className="text-[11px] text-emerald-700 hover:text-emerald-800 underline font-sans cursor-pointer"
                            >
                              {isPinVisible ? 'Hide PIN' : 'Reveal PIN'}
                            </button>
                          </div>

                          {/* 1-Click Direct Claim to Points */}
                          {!isRedeemed && balanceRupees > 0 && (
                            <button
                              type="button"
                              disabled={isClaimingGiftCard}
                              onClick={() => handleClaimCardDirect(card)}
                              className="w-full mt-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {isClaimingGiftCard ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                              ) : (
                                <>
                                  <Zap className="w-3.5 h-3.5" />
                                  <span>Add ₹{balanceRupees.toLocaleString('en-IN')} to My Points (+{convertiblePts.toLocaleString('en-IN')} PTS)</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                          <span>Expires: {card.expires_at ? new Date(card.expires_at).toLocaleDateString('en-IN') : '1 Year'}</span>
                          <span>Recipient: {card.recipient_name || 'You'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 3: DEDICATED BENEFITS & OFFERS VIEW ───────────────────────── */}
        {activeTab === 'benefits' && (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Member Benefits &amp; Exclusive Offers
              </h2>
              <p className="text-xs text-slate-500">
                Explore privileges unlocked for your current tier, dealership in-house bonuses, and limited-time savings.
              </p>
            </div>

            {/* Tier Selector (Bronze, Silver, Gold, Platinum) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 font-mono">
                  Membership Tiers &amp; Privileges
                </span>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                  Current: {currentTier}
                </span>
              </div>

              {/* Segmented Tier Tabs */}
              <div className="grid grid-cols-3 gap-2">
                {['Bronze', 'Silver', 'Gold'].map((tierName) => (
                  <button
                    key={tierName}
                    type="button"
                    onClick={() => setSelectedTierTab(tierName)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition text-center cursor-pointer ${
                      selectedTierTab === tierName
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {tierName}
                  </button>
                ))}
              </div>

              {/* Dynamic Benefits for Selected Tier */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  {selectedTierTab} Member Privileges
                </h4>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-start gap-2.5">
                    <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-slate-700">
                      <strong>Point Multiplier:</strong> Earn {selectedTierTab === 'Gold' ? '100 points' : selectedTierTab === 'Silver' ? '60 points' : '40 points'} with every periodic service package order.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-slate-700">
                      <strong>Service Priority:</strong> {selectedTierTab === 'Gold' ? 'Priority express bay & dedicated service advisor.' : 'Standard rapid intake.'}
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-slate-700">
                      <strong>Accessories &amp; Labor:</strong> {selectedTierTab === 'Gold' ? 'Up to 15% discount on genuine OEM accessories.' : 'Up to 5% discount on accessory bills.'}
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-slate-700">
                      <strong>Vehicle Referral Bonus:</strong> Receive 500 bonus points on every successful friend vehicle delivery.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* In-House Dealership Bonus Strip */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 font-mono">
                Dealership In-House Bonus Perks
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Finance */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    profile?.inhouse_benefits?.finance_opted
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">₹</span>
                      <span className="font-bold text-xs">In-house Finance</span>
                    </div>
                    {profile?.inhouse_benefits?.finance_opted ? (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                        +100 PTS
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Available</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                    Tie-up vehicle loan bonus on HDFC, Kotak &amp; Sundaram Finance.
                  </p>
                </div>

                {/* Insurance */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    profile?.inhouse_benefits?.insurance_opted
                      ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-xs">In-house Insurance</span>
                    </div>
                    {profile?.inhouse_benefits?.insurance_opted ? (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                        +50 PTS
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Available</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                    OEM assured cashless policy renewal &amp; expedited claims assistance.
                  </p>
                </div>

                {/* Exchange */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    profile?.inhouse_benefits?.exchange_opted
                      ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Repeat className="w-4 h-4 text-amber-600" />
                      <span className="font-bold text-xs">In-house Exchange</span>
                    </div>
                    {profile?.inhouse_benefits?.exchange_opted ? (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                        +200 PTS
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Available</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                    Guaranteed top resale valuation &amp; upgrade bonus on vehicle trade-in.
                  </p>
                </div>
              </div>
            </div>

            {/* Curated Dealership Offers & Vouchers */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 font-mono">
                Current Exclusive Offers
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Save 30%
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Expires in 15 days</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Annual Comprehensive Service Package</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Enjoy up to 30% off on wheel alignment, interior sanitization &amp; AC vent disinfection during your next service.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRedeemModal(true)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    View Terms &amp; Redeem
                  </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      Complimentary Checkup
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">All Seasons</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">40-Point Monsoon / Summer Inspection</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Free suspension, brake pad, wiper blade &amp; battery health evaluation at any Bellad workshop.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRedeemModal(true)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Show at Cashier Desk
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: DEDICATED REFERRALS VIEW ───────────────────────────────── */}
        {activeTab === 'referrals' && (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Refer Friends &amp; Earn Rewards
              </h2>
              <p className="text-xs text-slate-500">
                Share your personal recommendation link. When your friend takes delivery of a vehicle, you earn bonus points!
              </p>
            </div>

            {/* Share Link Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Your Personal Referral Link</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Friends will receive a VIP welcome greeting when opening your link.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Hey! I recommend ${profile?.firm_name || 'Bellad Automobiles'} for your next vehicle. Use my link to get customer reward perks: ${referralLink}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  <button
                    onClick={handleCopyReferral}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-700 select-all break-all">
                {referralLink}
              </div>
            </div>

            {/* Directly Refer a Friend Form */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Direct Friend Referral</h3>
              </div>
              <p className="text-xs text-slate-500 -mt-2">
                Want our sales advisor to get in touch with your friend directly? Fill in their details below.
              </p>

              <form onSubmit={handleReferFriendSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Friend&apos;s Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patil"
                    value={refereeName}
                    onChange={(e) => setRefereeName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Friend&apos;s Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={refereePhone}
                    onChange={(e) => setRefereePhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Interested Vehicle Model</label>
                  <input
                    type="text"
                    placeholder="e.g. EV / 4W / 2W"
                    value={refereeModel}
                    onChange={(e) => setRefereeModel(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-3 flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingReferral}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingReferral ? 'Submitting...' : 'Submit Referral →'}
                  </button>
                </div>
              </form>
            </div>

            {/* Referrals Tracking Table */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 font-mono">
                  Referral Status ({referralsList.length})
                </h3>
                {loadingReferrals && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              </div>

              {referralsList.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  No friends referred yet. Share your referral link to earn bonus loyalty points!
                </p>
              ) : (
                <div className="space-y-2">
                  {referralsList.map((ref, idx) => (
                    <div
                      key={ref.id || idx}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{ref.referee_name || 'Friend'}</span>
                        <span className="text-[11px] text-slate-500 block font-mono">{ref.referee_phone}</span>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
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

        {/* ─── TAB 5: DEDICATED TRANSACTIONS VIEW ─────────────────────────────── */}
        {activeTab === 'transactions' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Transaction &amp; Points Ledger
                </h2>
                <p className="text-xs text-slate-500">
                  Complete ledger of points earned from service visits, purchases, referrals, and gift card claims.
                </p>
              </div>

              <button
                onClick={() => setShowRedeemModal(true)}
                className="self-start sm:self-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Info className="w-3.5 h-3.5" />
                <span>Redemption Rules</span>
              </button>
            </div>

            {loadingLedger ? (
              <div className="py-14 text-center text-slate-500 bg-white border border-slate-200 rounded-3xl shadow-xs">
                <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-slate-400" />
                <p className="text-xs font-mono">Loading transaction records...</p>
              </div>
            ) : ledgerItems.length === 0 ? (
              <div className="text-center py-14 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-900">No Transactions Recorded Yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Your points from vehicle purchases, service visits, and gift cards will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
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
                  className="inline-flex items-center text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 py-2.5 px-5 rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
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

        {/* ─── TAB 6: DEDICATED VEHICLES / GARAGE VIEW ───────────────────────── */}
        {activeTab === 'garage' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                My Registered Vehicles
              </h2>
              <p className="text-xs text-slate-500">
                Vehicles associated with your Bellad customer account, redemption eligibility, and purchase specifications.
              </p>
            </div>

            {(profile?.vehicles || []).length === 0 ? (
              <div className="p-10 text-center bg-white border border-slate-200 rounded-3xl space-y-2 shadow-xs">
                <Car className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-800">No Vehicles Linked</p>
                <p className="text-xs text-slate-500">
                  Vehicles purchased at {profile?.firm_name || 'our showroom'} will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.vehicles.map((v, idx) => (
                  <div
                    key={v.vehicle_id || idx}
                    className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-black text-slate-900 text-sm block">
                          {v.brand_name} {v.model}
                        </span>
                        <span className="text-xs text-slate-500">{v.variant || 'Standard'}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        {v.registration_number || v.vin || 'Pending Reg'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200 font-mono">
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold block font-sans">Gross Price</span>
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
                        <span className="text-slate-500 text-[10px] uppercase font-bold block font-sans">Fuel Type</span>
                        <span className="font-bold text-slate-800 uppercase">{v.fuel_type || 'Petrol'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold block font-sans">Delivery Date</span>
                        <span className="font-bold text-slate-800">{v.purchase_date || '—'}</span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-semibold text-emerald-700">
                        <Check className="w-3.5 h-3.5" />
                        Service Redemption Eligible
                      </span>
                      <span className="font-mono text-slate-400">VIN: {v.vin ? v.vin.slice(-6) : '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 7: PROFILE & KYC VIEW ─────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">KYC &amp; Profile Details</h3>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                Aadhaar Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Customer Name</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {profile?.name || 'Customer'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Registered WhatsApp Mobile</span>
                <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                  +91 {profile?.phone || '—'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Dealership Group</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {profile?.firm_name || 'Bellad & Company'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Home Dealership Branch</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {profile?.branch_name || 'Main Showroom'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              For security, to update your registered mobile number or nomination details, visit your nearest showroom cashier desk with your Aadhaar card for instant WhatsApp verification.
            </p>
          </div>
        )}
      </main>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto text-center text-xs text-slate-500 space-y-1">
        <p>&copy; {new Date().getFullYear()} {profile?.firm_name || 'Bellad Automobile Corporation'}. All rights reserved.</p>
        <p className="text-[11px] text-slate-400 font-mono">
          Customer Portal &bull; 4 PTS = ₹1 &bull; Instant WhatsApp Redemption
        </p>
      </footer>

      {/* ─── How to Redeem Modal ──────────────────────────────────────────── */}
      {showRedeemModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 text-slate-900">
              <Info className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold">How to Redeem Points</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Loyalty points are directly redeemed at any authorized Bellad showroom or service cashier counter during invoice billing.
            </p>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1.5 font-medium">
              <p>
                <strong className="font-bold text-slate-900">Current Points:</strong>{' '}
                <span className="font-mono text-slate-900 font-bold">{currentBalance.toLocaleString('en-IN')} PTS</span>
              </p>
              <p>
                <strong className="font-bold text-slate-900">Discount Value:</strong>{' '}
                <span className="font-mono text-emerald-700 font-bold">₹{cashValue.toLocaleString('en-IN')}</span>
              </p>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                Rule: 4 Points = ₹1 deduction against accessories, service labor, or spare parts.
              </p>
            </div>
            <button
              onClick={() => setShowRedeemModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ─── Send Gift to Friends & Family Modal ──────────────────────────── */}
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
