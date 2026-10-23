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
  Flame,
  Percent,
} from 'lucide-react';
import ApiService from '../../services/api';
import SendGiftModal from './SendGiftModal';

// Category Icon with soft pastel background
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
    <div className="flex items-center justify-between py-3.5 px-4 bg-white border border-slate-100/90 rounded-2xl hover:border-slate-200 transition-all shadow-xs gap-3">
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
  const [copiedOffer, setCopiedOffer] = useState('');
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

  const handleCopyOfferCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedOffer(code);
    setTimeout(() => setCopiedOffer(''), 2500);
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

  // Navigation Items
  const navTabs = [
    { id: 'overview', label: 'Home', icon: Home },
    { id: 'benefits', label: 'Membership & Offers', icon: Award },
    { id: 'gift_cards', label: 'Vouchers', icon: Ticket, count: myGiftCards.length || null },
    { id: 'referrals', label: 'Refer & Earn', icon: Users, count: referralsList.length || null },
    { id: 'transactions', label: 'Activity', icon: Clock },
    { id: 'garage', label: 'Garage', icon: Car },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  // Curated Design Offers list
  const promotionalOffers = [
    {
      id: 'srv-fest',
      badge: '🔥 25% OFF',
      badgeColor: 'bg-rose-500 text-white',
      accentColor: 'from-rose-500/10 to-amber-500/10 border-rose-200/80',
      title: 'Periodic Maintenance Fest',
      discount: 'Flat 25% Off on Labor',
      description: 'Wheel alignment, AC filter disinfection & complete foam wash with loyalty pass.',
      code: 'BELLAD25',
      actionText: 'Redeem at Desk',
      category: 'Service',
    },
    {
      id: 'acc-voucher',
      badge: '✨ ₹1,000 VOUCHER',
      badgeColor: 'bg-emerald-600 text-white',
      accentColor: 'from-emerald-500/10 to-teal-500/10 border-emerald-200/80',
      title: 'Genuine Accessories Credit',
      discount: '₹1,000 Off on Bill',
      description: 'Valid on seat covers, 7D floor mats, sunshades & alloy wheels above ₹4,000.',
      code: 'ACC1000',
      actionText: 'Apply Voucher',
      category: 'Accessories',
    },
    {
      id: 'gift-cashback',
      badge: '🎁 BONUS CREDIT',
      badgeColor: 'bg-purple-600 text-white',
      accentColor: 'from-purple-500/10 to-indigo-500/10 border-purple-200/80',
      title: 'WhatsApp Gifting Cashback',
      discount: '+200 PTS Instant Cashback',
      description: 'Gift ₹1,000 or 4,000 PTS to family via WhatsApp and receive 200 PTS reward.',
      code: 'AUTO-CREDIT',
      actionText: 'Send Gift Now',
      category: 'Gifting',
      isGiftTrigger: true,
    },
    {
      id: 'diag-free',
      badge: '🛡️ 100% FREE',
      badgeColor: 'bg-blue-600 text-white',
      accentColor: 'from-blue-500/10 to-cyan-500/10 border-blue-200/80',
      title: '50-Point OEM Computer Scan',
      discount: '₹1,200 Health Scan FREE',
      description: 'Full computerized diagnostic OBD scan, brake pads, battery & suspension check.',
      code: 'FREE50SCAN',
      actionText: 'Claim Inspection',
      category: 'Diagnostics',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#EEF2F6] text-slate-800 flex flex-col font-sans selection:bg-emerald-600 selection:text-white antialiased">
      {/* ─── 1. Responsive App Header ───────────────────────────────────── */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
              <img
                src="/bellad-logo.png"
                alt="Bellad Logo"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div>
              <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight block">
                {profile?.firm_name || 'Bellad Automobile'}
              </span>
              <div className="flex items-center gap-1.5 -mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  VIP Rewards Portal
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {profile?.aadhaar && (
              <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Aadhaar Verified
              </span>
            )}

            <button
              type="button"
              onClick={() => setSendGiftModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-3.5 py-1.5 rounded-full shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Send e-Gift</span>
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-900 to-slate-700 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {firstName.charAt(0)}
              </div>
              <button
                onClick={onSignOut}
                title="Sign out"
                className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── 2. Top Segmented Navigation Bar ────────────────────────────── */}
      <nav className="bg-white border-b border-slate-200/80 sticky top-[59px] z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-2">
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
                  className={`relative flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer rounded-full shrink-0 ${
                    isActive
                      ? 'text-emerald-800 bg-emerald-50/90 font-black shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
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

      {/* ─── Main Content Container (Full Width Responsive) ─────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 space-y-7 flex-1 w-full">
        {/* Global Notifications */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-900 text-sm font-bold">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-900 text-sm font-bold">✕</button>
          </div>
        )}

        {/* ─── 3. RESPONSIVE HERO SECTION (Grid on Desktop, Stack on Mobile) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Member Tier & Progress Card (7 Cols on desktop) */}
          <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-sm flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              {/* Header Row */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      You&apos;re {currentTier} Member
                    </h1>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      VIP
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Welcome back, <strong className="text-slate-800">{profile?.name || firstName}</strong>! Member ID: BELLAD-{profile?.customer_id || 'REWARDS'}
                  </p>
                </div>

                <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-xl shadow-xs shrink-0">
                  {currentTier === 'Gold' ? '🥇' : '🥈'}
                </div>
              </div>

              {/* Progress Bar Widget */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>
                    {pointsToLevelUp > 0 ? (
                      <>
                        <strong className="text-slate-950 font-black">{pointsToLevelUp.toLocaleString('en-IN')}</strong> more points to reach <span className="text-amber-600">{nextTier}</span>!
                      </>
                    ) : (
                      <strong className="text-emerald-700 font-bold">🎉 Maximum VIP Tier Unlocked!</strong>
                    )}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {lifetimePoints.toLocaleString('en-IN')} / {nextTierPoints.toLocaleString('en-IN')} PTS
                  </span>
                </div>

                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 rounded-full transition-all duration-700 shadow-xs"
                    style={{ width: `${Math.min(100, Math.max(8, tierProgress))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Perk Banner */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('benefits');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 hover:bg-amber-100/70 transition text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Gift className="w-3.5 h-3.5 text-amber-700" />
                </div>
                <span className="text-xs font-bold text-amber-950">
                  Earn points on every vehicle purchase, periodic service &amp; friend referral
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-700 group-hover:translate-x-0.5 transition shrink-0" />
            </button>
          </div>

          {/* Right Column: Points & Cash Amount Card (5 Cols on desktop) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white rounded-3xl p-5 sm:p-7 shadow-lg flex flex-col justify-between space-y-5 border border-slate-800 relative overflow-hidden">
            {/* Subtle card glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
                Available Loyalty Balance
              </span>
              <div className="flex items-baseline gap-2.5 pt-1">
                <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center shadow-xs">
                  ₹
                </div>
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono tracking-tight text-white">
                  {currentBalance.toLocaleString('en-IN')}
                </span>
                <span className="text-xs font-bold text-amber-300 font-mono uppercase">PTS</span>
              </div>

              <div className="pt-2 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1 rounded-xl">
                  ≈ ₹{cashValue.toLocaleString('en-IN')} Cash Value
                </span>
                <span className="text-[11px] text-slate-400 font-mono">4 PTS = ₹1</span>
              </div>
            </div>

            <div className="relative z-10 pt-4 border-t border-slate-800 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('transactions');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex-1 py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition text-center cursor-pointer border border-white/10"
              >
                Point History
              </button>

              <button
                type="button"
                onClick={() => setShowRedeemModal(true)}
                className="flex-1 py-2.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black rounded-xl transition text-center shadow-md cursor-pointer"
              >
                Redeem →
              </button>
            </div>
          </div>
        </div>

        {/* ─── TAB 1: OVERVIEW / HIGHLIGHTS ─────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* 4 Action Highlights Grid (Responsive 4 Columns on Desktop) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 font-mono">
                  Quick Access Highlights
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Gift Cards */}
                <div
                  onClick={() => setSendGiftModalOpen(true)}
                  className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition cursor-pointer group"
                >
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 border border-emerald-100 flex items-center justify-between">
                      <div>
                        <span className="text-base font-black text-emerald-950 block">WhatsApp e-Gift</span>
                        <span className="text-[11px] text-emerald-700 font-semibold">Instant digital link</span>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                        <Gift className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition">
                        Gift Points to Friends &amp; Family!
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Share points or buy with Razorpay. Receiver gets a WhatsApp link!
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

                {/* 2. Bill Discount */}
                <div
                  onClick={() => setShowRedeemModal(true)}
                  className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-amber-300 hover:shadow-md transition cursor-pointer group"
                >
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 border border-amber-100 flex items-center justify-between">
                      <div>
                        <span className="text-base font-black text-amber-950 block">Save ₹{cashValue}</span>
                        <span className="text-[11px] text-amber-700 font-semibold">On service billing</span>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                        <Sparkles className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition">
                        Score a discount on your bill!
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Redeem points directly at any workshop cashier desk during invoice billing.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                      <span>How to Redeem</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-400">{currentBalance} PTS</span>
                  </div>
                </div>

                {/* 3. Referral */}
                <div
                  onClick={() => {
                    setActiveTab('referrals');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition cursor-pointer group"
                >
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 border border-blue-100 flex items-center justify-between">
                      <div>
                        <span className="text-base font-black text-blue-950 block">500 Bonus PTS</span>
                        <span className="text-[11px] text-blue-700 font-semibold">Per vehicle referral</span>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition">
                        Refer Friends &amp; Earn
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Share your unique invite link. Earn bonus points when friends buy a vehicle!
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

                {/* 4. Privileges */}
                <div
                  onClick={() => {
                    setActiveTab('benefits');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-purple-300 hover:shadow-md transition cursor-pointer group"
                >
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 p-4 border border-purple-100 flex items-center justify-between">
                      <div>
                        <span className="text-base font-black text-purple-950 block">{currentTier} Tier</span>
                        <span className="text-[11px] text-purple-700 font-semibold">VIP dealership perks</span>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                        <Award className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition">
                        In-House Bonus Slabs
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Unlock finance loan bonus (+100 PTS), insurance (+50 PTS) &amp; exchange (+200 PTS).
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

            {/* ─── NEW: VIBRANT PROMOTIONAL OFFERS SECTION ─────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 font-mono">
                    Exclusive Promotional Offers &amp; Vouchers
                  </h2>
                  <p className="text-xs text-slate-500">
                    Flash savings and seasonal perks available for your loyalty pass.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('benefits');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                >
                  View All Perks →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {promotionalOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className={`bg-white border rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition ${offer.accentColor}`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-2xs ${offer.badgeColor}`}>
                          {offer.badge}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">
                          {offer.category}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-black text-slate-900 leading-tight">
                          {offer.title}
                        </h4>
                        <span className="text-xs font-bold text-emerald-700 mt-1 block">
                          {offer.discount}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          {offer.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200/80 font-mono text-xs">
                        <span className="font-bold text-slate-800 tracking-wider">{offer.code}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyOfferCode(offer.code)}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedOffer === offer.code ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedOffer === offer.code ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (offer.isGiftTrigger) {
                            setSendGiftModalOpen(true);
                          } else {
                            setShowRedeemModal(true);
                          }
                        }}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer text-center"
                      >
                        {offer.actionText}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Vouchers & Recent Activity Row (2 Columns on Desktop) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left Column: Active Vouchers */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      My Digital Vouchers ({myGiftCards.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Vouchers ready for 1-click points conversion.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('gift_cards')}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    View All →
                  </button>
                </div>

                {myGiftCards.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Ticket className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                    <p className="text-xs font-medium">No active gift vouchers right now.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myGiftCards.slice(0, 2).map((card) => {
                      const balanceRupees = Number(card.balance_amount || 0);
                      const convertiblePts = Math.floor(balanceRupees * 4);
                      const isRedeemed = card.status === 'redeemed' || balanceRupees === 0;

                      return (
                        <div
                          key={card.card_id}
                          className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <span className="font-mono text-xs font-bold text-slate-800 block">
                              {card.card_number}
                            </span>
                            <span className="text-xs font-bold text-emerald-700">
                              ₹{balanceRupees.toLocaleString('en-IN')} Card Value
                            </span>
                          </div>

                          {!isRedeemed && balanceRupees > 0 && (
                            <button
                              type="button"
                              disabled={isClaimingGiftCard}
                              onClick={() => handleClaimCardDirect(card)}
                              className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>Add to Points (+{convertiblePts} PTS)</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Recent Activity */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Recent Activity
                    </h3>
                    <p className="text-xs text-slate-500">
                      Points earned, redeemed &amp; credited.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    Ledger ({ledgerItems.length}) →
                  </button>
                </div>

                {loadingLedger ? (
                  <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-slate-400" />
                    <p className="text-xs font-mono">Loading activity...</p>
                  </div>
                ) : ledgerItems.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                    <p className="text-xs font-medium">No activity recorded yet.</p>
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
          </div>
        )}

        {/* ─── TAB 2: MEMBERSHIP & OFFERS VIEW ──────────────────────────────── */}
        {activeTab === 'benefits' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Top Member Card */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-200/80 rounded-3xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 font-black text-lg flex items-center justify-center shrink-0 shadow-xs">
                    {currentTier === 'Gold' ? '🥇' : '🥈'}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      {currentTier} Member Privileges
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {pointsToLevelUp > 0 ? `${pointsToLevelUp.toLocaleString('en-IN')} more points to level up to ${nextTier}!` : "You've reached the highest VIP status!"}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-amber-100/70 rounded-2xl flex items-center gap-2 text-xs font-bold text-amber-950">
                  <Award className="w-4 h-4 text-amber-800" />
                  <span>Each service visit earns {currentTier === 'Gold' ? '100' : '60'} points</span>
                </div>
              </div>
            </div>

            {/* Tier Selector: Bronze | Silver | Gold */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-around border-b border-slate-200">
                {['Bronze', 'Silver', 'Gold'].map((tierName) => {
                  const isSelected = selectedTierTab === tierName;
                  return (
                    <button
                      key={tierName}
                      type="button"
                      onClick={() => setSelectedTierTab(tierName)}
                      className={`py-3.5 px-6 sm:px-12 text-sm font-bold relative transition cursor-pointer ${
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

              {/* Tier Benefits Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase font-mono">
                    <Sparkles className="w-4 h-4" />
                    <span>Point Earning Multiplier</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900">
                    Earn {selectedTierTab === 'Gold' ? '100 points' : selectedTierTab === 'Silver' ? '60 points' : '40 points'} per service
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Automatically credited to your mobile wallet upon invoice clearance.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase font-mono">
                    <BadgePercent className="w-4 h-4" />
                    <span>Discounts on Parts &amp; Accessories</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900">
                    Up to {selectedTierTab === 'Gold' ? '30% savings' : '15% savings'}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Direct point deduction at cashier counter on genuine accessories and labor bills.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase font-mono">
                    <Wrench className="w-4 h-4" />
                    <span>Priority Workshop Lane</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900">
                    {selectedTierTab === 'Gold' ? 'Dedicated Express Service Bay' : 'Rapid Customer Intake'}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Reduced waiting times and complimentary vehicle inspection reports.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase font-mono">
                    <Gift className="w-4 h-4" />
                    <span>WhatsApp e-Gift Vouchers</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900">
                    Full WhatsApp Link Sharing
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Share your loyalty balance with family anytime via WhatsApp links.
                  </p>
                </div>
              </div>
            </div>

            {/* In-House Dealership Bonus Slabs */}
            <div className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 font-mono">
                Dealership In-House Bonus Slabs
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                      +100 PTS Loan Bonus
                    </span>
                    <span className="text-xs font-bold text-slate-400">Finance</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">In-house Vehicle Finance</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tie-up vehicle loan bonus on HDFC, Kotak &amp; Sundaram Finance.
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full">
                      +50 PTS Renewal Bonus
                    </span>
                    <span className="text-xs font-bold text-slate-400">Insurance</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">In-house OEM Insurance</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Assured cashless policy renewal &amp; expedited claims assistance.
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full">
                      +200 PTS Trade-In
                    </span>
                    <span className="text-xs font-bold text-slate-400">Exchange</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">In-house Vehicle Exchange</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Guaranteed top resale valuation &amp; upgrade bonus on trade-ins.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: VOUCHERS & DIGITAL GIFT CARDS ─────────────────────────── */}
        {activeTab === 'gift_cards' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Digital Vouchers &amp; Gift Cards
                </h2>
                <p className="text-xs text-slate-500">
                  Claim received voucher codes, or send WhatsApp e-gift cards to friends and family.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSendGiftModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-full shadow-xs transition cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Send via WhatsApp</span>
              </button>
            </div>

            {/* Quick Claim Box */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowClaimBox(!showClaimBox)}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 hover:bg-emerald-100/60 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-800" />
                  <span className="text-xs font-bold text-emerald-950">
                    Got a 16-character promo code or gift card? Enter here
                  </span>
                </div>
                <ChevronRight className={`w-4 h-4 text-emerald-800 transition ${showClaimBox ? 'rotate-90' : ''}`} />
              </button>

              {showClaimBox && (
                <form onSubmit={handleClaimGiftCard} className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-xs">
                  <p className="text-xs text-slate-500">
                    Enter the 16-character code and optional 4-digit PIN to credit points directly into your loyalty balance.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
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
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      {isClaimingGiftCard ? 'Claiming...' : 'Claim Code →'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Vouchers Sub-Tabs */}
            <div className="flex items-center justify-around border-b border-slate-200">
              <button
                type="button"
                onClick={() => setGiftCardSubTab('vouchers')}
                className={`py-3.5 px-6 sm:px-12 text-sm font-bold relative transition cursor-pointer ${
                  giftCardSubTab === 'vouchers' ? 'text-slate-900 font-black' : 'text-slate-400'
                }`}
              >
                <span>Active Vouchers ({myGiftCards.length})</span>
                {giftCardSubTab === 'vouchers' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setGiftCardSubTab('purchased')}
                className={`py-3.5 px-6 sm:px-12 text-sm font-bold relative transition cursor-pointer ${
                  giftCardSubTab === 'purchased' ? 'text-slate-900 font-black' : 'text-slate-400'
                }`}
              >
                <span>Sent via WhatsApp</span>
                {giftCardSubTab === 'purchased' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
                )}
              </button>
            </div>

            {/* Responsive Grid for Vouchers on Desktop */}
            {myGiftCards.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-10 text-center space-y-2">
                <Ticket className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">No Vouchers Found</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When you receive or buy an e-gift voucher, it will show up here for instant 1-click addition to your points.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myGiftCards.map((card) => {
                  const isPinVisible = revealedPins[card.card_id];
                  const isRedeemed = card.status === 'redeemed' || Number(card.balance_amount) === 0;
                  const balanceRupees = Number(card.balance_amount || 0);
                  const convertiblePts = Math.floor(balanceRupees * 4);

                  return (
                    <div
                      key={card.card_id}
                      className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-3.5 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-xs">
                              ₹
                            </div>
                            <div>
                              <h5 className="text-sm font-black text-slate-900">
                                ₹{balanceRupees.toLocaleString('en-IN')} e-Gift
                              </h5>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Expires: {card.expires_at ? new Date(card.expires_at).toLocaleDateString('en-IN') : '1 Year'}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                              isRedeemed ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {card.status.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Code strip */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between font-mono text-xs">
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
                      </div>

                      {/* 1-Click Action */}
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
                            <span>Use Now: Add to Points (+{convertiblePts.toLocaleString('en-IN')} PTS)</span>
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

        {/* ─── TAB 4: REFER & EARN ─────────────────────────────────────────── */}
        {activeTab === 'referrals' && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-lg font-black text-slate-900">
              Refer Friends &amp; Earn Rewards
            </h2>

            {/* Share Card */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">Your Personal Referral Invite Link</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Share on WhatsApp. Earn 500 bonus points on every successful vehicle delivery!
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
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-full transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-700 select-all break-all">
                {referralLink}
              </div>
            </div>

            {/* Direct Friend Recommendation Form */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-3.5 shadow-xs">
              <h3 className="text-base font-black text-slate-900">Direct Friend Recommendation</h3>
              <p className="text-xs text-slate-500 -mt-1">
                Enter your friend&apos;s contact details and our relationship manager will reach out with exclusive offers.
              </p>

              <form onSubmit={handleReferFriendSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
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
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 font-mono">
                Referral History ({referralsList.length})
              </h3>

              {referralsList.length === 0 ? (
                <div className="p-8 bg-white border border-slate-200/80 rounded-3xl text-center text-xs text-slate-400">
                  No friends referred yet. Share your link above to start earning!
                </div>
              ) : (
                <div className="space-y-2">
                  {referralsList.map((ref, idx) => (
                    <div
                      key={ref.id || idx}
                      className="p-4 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs shadow-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">{ref.referee_name || 'Friend'}</span>
                        <span className="text-xs text-slate-400 font-mono">{ref.referee_phone}</span>
                      </div>
                      <div className="text-right">
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {ref.status || 'Pending'}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
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

        {/* ─── TAB 5: POINT HISTORY / TRANSACTIONS ─────────────────────────── */}
        {activeTab === 'transactions' && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Transaction &amp; Point History
                </h2>
                <p className="text-xs text-slate-500">
                  Complete audit ledger of points earned from invoices, purchases &amp; vouchers.
                </p>
              </div>
              <button
                onClick={() => setShowRedeemModal(true)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                Redemption Rules →
              </button>
            </div>

            {loadingLedger ? (
              <div className="py-14 text-center text-slate-400 bg-white border border-slate-200/80 rounded-3xl">
                <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-slate-400" />
                <p className="text-xs font-mono">Loading transaction records...</p>
              </div>
            ) : ledgerItems.length === 0 ? (
              <div className="text-center py-14 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-900">No Transactions Recorded Yet</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Points from vehicle purchases, service visits, and gift vouchers will appear here.
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
                  className="inline-flex items-center text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 py-2.5 px-6 rounded-full transition shadow-xs disabled:opacity-50 cursor-pointer"
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
              My Garage ({profile?.vehicles?.length || 0})
            </h2>

            {(profile?.vehicles || []).length === 0 ? (
              <div className="p-10 text-center bg-white border border-slate-200/80 rounded-3xl space-y-2 shadow-xs">
                <Car className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-800">No Vehicles Linked</p>
                <p className="text-xs text-slate-400">
                  Vehicles purchased at {profile?.firm_name || 'our showroom'} will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {profile.vehicles.map((v, idx) => (
                  <div
                    key={v.vehicle_id || idx}
                    className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-4 shadow-xs"
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

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 font-mono">
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
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Customer Profile &amp; KYC Verification</h3>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-50 text-emerald-700 font-mono">
                Aadhaar Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Customer Name</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {profile?.name || 'Customer'}
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">WhatsApp Mobile Number</span>
                <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                  +91 {profile?.phone || '—'}
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Dealership Group</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {profile?.firm_name || 'Bellad & Company'}
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Home Dealership Branch</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {profile?.branch_name || 'Main Showroom'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 pt-3 border-t border-slate-100">
              For security, to update your registered mobile number, visit your nearest showroom cashier desk with your Aadhaar card for instant WhatsApp verification.
            </p>
          </div>
        )}
      </main>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200/80 bg-white py-4 mt-auto text-center text-xs text-slate-500 space-y-1">
        <p>&copy; {new Date().getFullYear()} {profile?.firm_name || 'Bellad Automobile Corporation'}. All rights reserved.</p>
        <p className="text-[11px] font-mono text-slate-400">
          4 PTS = ₹1 &bull; Instant WhatsApp Redemption
        </p>
      </footer>

      {/* ─── How to Redeem Modal ──────────────────────────────────────────── */}
      {showRedeemModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2 text-slate-900">
              <Info className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold">How to Redeem Points</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Loyalty points are directly redeemed at any authorized Bellad showroom or service cashier counter during invoice billing.
            </p>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1.5 font-medium">
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
