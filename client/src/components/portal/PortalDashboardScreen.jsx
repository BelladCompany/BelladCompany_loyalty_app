import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  LogOut,
  Copy,
  Check,
  DollarSign,
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
  CreditCard,
  Building2,
  Calendar,
  Share2,
  Phone,
  User,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  AlertCircle,
  Fuel,
  Wrench,
  Award,
  QrCode,
  Tag,
  ExternalLink,
} from 'lucide-react';
import ApiService from '../../services/api';

// Icon mapper for transaction categories
const CategoryIcon = ({ type }) => {
  switch (type) {
    case 'finance':
    case 'inhouse_finance':
      return <DollarSign className="w-4 h-4 text-emerald-400" />;
    case 'insurance':
    case 'inhouse_insurance':
      return <ShieldCheck className="w-4 h-4 text-blue-400" />;
    case 'exchange':
    case 'inhouse_exchange':
      return <Repeat className="w-4 h-4 text-amber-400" />;
    case 'purchase':
      return <Car className="w-4 h-4 text-indigo-400" />;
    case 'gift_card':
      return <Gift className="w-4 h-4 text-purple-400" />;
    case 'referral':
      return <Users className="w-4 h-4 text-pink-400" />;
    case 'redeem':
      return <Sparkles className="w-4 h-4 text-rose-400" />;
    default:
      return <Wrench className="w-4 h-4 text-slate-400" />;
  }
};

// Memoized Activity Row
const LedgerRow = memo(({ item }) => {
  const isPositive = item.points >= 0;
  const formattedPoints = isPositive
    ? `+${item.points.toLocaleString('en-IN')}`
    : `${item.points.toLocaleString('en-IN')}`;

  return (
    <div className="flex items-center justify-between py-3.5 px-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl hover:border-slate-700 hover:bg-slate-900 transition-all">
      <div className="flex items-center space-x-3.5 min-w-0 pr-2">
        <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shrink-0 shadow-inner">
          <CategoryIcon type={item.type} />
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-bold text-white truncate">{item.text}</p>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-medium">
            <span>{item.date}</span>
            {item.amount && (
              <>
                <span>•</span>
                <span className="font-mono text-slate-300">Bill: ₹{item.amount.toLocaleString('en-IN')}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <span
          className={`text-xs sm:text-sm font-black font-mono px-3 py-1 rounded-xl shadow-xs ${
            isPositive
              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
              : 'bg-rose-950/80 text-rose-400 border border-rose-800/80'
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
  const [activeTab, setActiveTab] = useState('overview'); // overview, gift_cards, referrals, garage, profile
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedCard, setCopiedCard] = useState('');
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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

  const loadProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const data = await ApiService.portalGetMe();
      setProfile(data);
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

  // Claim Gift Card to Account
  const handleClaimGiftCard = async (e) => {
    e.preventDefault();
    if (!claimCardCode.trim() || !claimPin.trim()) {
      setError('Please enter both the 16-character Card Code and 4-digit PIN.');
      return;
    }

    setIsClaimingGiftCard(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await ApiService.portalClaimGiftCard(claimCardCode.trim(), claimPin.trim());
      setSuccessMsg(res.message || 'Gift card successfully claimed to your account!');
      setClaimCardCode('');
      setClaimPin('');
      loadProfile();
      loadLedger();
      loadGiftCards();
    } catch (err) {
      setError(err.message || 'Failed to claim gift card. Please check the code and PIN.');
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

  // Calculate user initials for avatar
  const initials = profile?.name
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'BC';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950 antialiased">
      {/* Dynamic Background Ambient Gradients */}
      <div className="fixed top-0 left-1/3 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-10 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ─── 1. Header ──────────────────────────────────────────────────────── */}
      <header className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 sticky top-0 z-30 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-9 h-9 rounded-xl bg-white p-1 shadow-md flex items-center justify-center shrink-0">
              <img
                src="/bellad-logo.png"
                alt="Bellad Logo"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div>
              <span className="text-sm sm:text-base font-black text-white tracking-tight block">
                {profile?.firm_name || 'Bellad Automobile Corporation'}
              </span>
              <div className="flex items-center gap-1.5 -mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Member Loyalty Pass
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {profile?.aadhaar && (
              <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-300 bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Aadhaar: {profile.aadhaar}
              </span>
            )}

            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
                {initials}
              </div>
              <span className="hidden sm:inline text-xs font-bold text-slate-200">
                {firstName}
              </span>
              <button
                onClick={onSignOut}
                title="Sign out of customer portal"
                className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-white py-1.5 px-2.5 rounded-xl border border-slate-700/80 hover:bg-slate-800 transition shadow-xs ml-1"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Exit</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-16 space-y-6 flex-1 w-full relative z-10">
        {/* Alerts */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-white">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {/* ─── 2. Luxury Digital Loyalty Pass Card ─────────────────────────── */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-slate-800">
          {/* Card Ambient Glow Accents */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-white/5 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* Top Pass Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-full shadow-md flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-slate-950" />
                    {profile?.tier?.current || 'Silver'} VIP Pass
                  </span>
                  <span className="text-xs text-slate-400 font-mono tracking-wider bg-slate-800/80 px-2.5 py-0.5 rounded-lg border border-slate-700">
                    ID: {profile?.customer_id ? `BELLAD-${profile.customer_id}` : 'BELLAD-MEMBER'}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
                  {profile?.name || firstName}
                </h1>
                <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                  <span>{profile?.phone}</span>
                  <span>&bull;</span>
                  <span>{profile?.branch_name || 'Main Dealership'}</span>
                  <span>&bull;</span>
                  <span>Member since {profile?.memberSince || '2024'}</span>
                </p>
              </div>

              {/* Total Balance Big Number */}
              <div className="bg-slate-900/80 backdrop-blur-xl p-5 rounded-2xl border border-slate-700/80 flex flex-col justify-between items-start sm:items-end shadow-xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Available Loyalty Balance
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono">
                    {(profile?.balance || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-black text-amber-400">PTS</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-lg">
                    ≈ ₹{(profile?.redeemableValue || 0).toLocaleString('en-IN')} Cash Value
                  </span>
                  <button
                    onClick={() => setShowRedeemModal(true)}
                    className="text-[11px] font-bold text-slate-300 hover:text-white underline"
                  >
                    Redeem →
                  </button>
                </div>
              </div>
            </div>

            {/* Tier Progress Bar & Action */}
            <div className="space-y-2 pt-3 border-t border-slate-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-bold gap-1">
                <span className="text-slate-400">
                  Tier Progress: <span className="text-white font-black">{profile?.tier?.current || 'Silver'}</span> →{' '}
                  <span className="text-amber-400">{profile?.tier?.next || 'Gold'}</span>
                </span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {profile?.lifetime_points?.toLocaleString('en-IN') || 0} /{' '}
                  {profile?.tier?.next_points?.toLocaleString('en-IN') || 5000} Lifetime PTS
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${profile?.tier?.progress_percentage || 15}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── 3. Modern Metric Cards Grid (Hostigrow SaaS Style) ────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Cashback Value
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              ₹{(profile?.redeemableValue || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">Direct deduction on next service bill</p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                My Vehicles
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Car className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {profile?.vehicles?.length || 0}
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">Registered in Bellad Garage</p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Gift Cards
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Gift className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {myGiftCards.length}
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">Digital vouchers available</p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Referrals
              </span>
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {referralsList.length}
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">Referred friends earning bonuses</p>
          </div>
        </div>

        {/* ─── 4. In-House Dealer Perks (Interactive Strip) ────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div
            className={`p-4 rounded-2xl border transition-all ${
              profile?.inhouse_benefits?.finance_opted
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-100'
                : 'bg-slate-900/60 border-slate-800 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs sm:text-sm">In-house Finance</span>
              </div>
              {profile?.inhouse_benefits?.finance_opted ? (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-900 text-emerald-300 border border-emerald-700">
                  +100 PTS Unlocked
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 uppercase">Available</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Exclusive tie-up loan bonus on HDFC, Kotak &amp; Sundaram Finance.
            </p>
          </div>

          <div
            className={`p-4 rounded-2xl border transition-all ${
              profile?.inhouse_benefits?.insurance_opted
                ? 'bg-blue-950/40 border-blue-800/80 text-blue-100'
                : 'bg-slate-900/60 border-slate-800 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-xs sm:text-sm">In-house Insurance</span>
              </div>
              {profile?.inhouse_benefits?.insurance_opted ? (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-900 text-blue-300 border border-blue-700">
                  +50 PTS Unlocked
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 uppercase">Available</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              OEM assured cashless policy renewal &amp; expedited claims assistance.
            </p>
          </div>

          <div
            className={`p-4 rounded-2xl border transition-all ${
              profile?.inhouse_benefits?.exchange_opted
                ? 'bg-amber-950/40 border-amber-800/80 text-amber-100'
                : 'bg-slate-900/60 border-slate-800 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-xs sm:text-sm">In-house Exchange</span>
              </div>
              {profile?.inhouse_benefits?.exchange_opted ? (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-900 text-amber-300 border border-amber-700">
                  +200 PTS Unlocked
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 uppercase">Available</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Guaranteed top resale valuation &amp; upgrade bonus on 2W/4W trade-in.
            </p>
          </div>
        </div>

        {/* ─── 5. Modern Segmented Tab Navigation ─────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1.5 text-xs font-bold scrollbar-none">
          {[
            { id: 'overview', label: 'Activity & Ledger', icon: Sparkles, count: ledgerItems.length },
            { id: 'gift_cards', label: 'Gift Cards', icon: Gift, count: myGiftCards.length },
            { id: 'referrals', label: 'Refer & Earn', icon: Users, count: referralsList.length },
            { id: 'garage', label: 'My Vehicles', icon: Car, count: profile?.vehicles?.length || 0 },
            { id: 'profile', label: 'Profile & KYC', icon: User, count: null },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
                {t.count !== null && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── TAB 1: Activity & Ledger ─────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Transaction Activity Log
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time history of points earned, spent, and credited across all dealership branches.
                </p>
              </div>

              <button
                onClick={() => setShowRedeemModal(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-1.5"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>How to Redeem</span>
              </button>
            </div>

            {loadingLedger ? (
              <div className="py-14 text-center text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-amber-400" />
                <p className="text-xs font-mono">Retrieving your activity ledger...</p>
              </div>
            ) : ledgerItems.length === 0 ? (
              <div className="text-center py-14 bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
                <Wrench className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-white">No Transactions Recorded Yet</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Your points from vehicle purchases, service visits, in-house bonuses, and gift cards will appear here automatically.
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
                  className="inline-flex items-center text-xs font-bold text-slate-200 bg-slate-900 border border-slate-700 hover:bg-slate-800 py-2.5 px-5 rounded-xl transition disabled:opacity-50"
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

        {/* ─── TAB 2: Gift Cards Hub (Amazon Style) ─────────────────────────── */}
        {activeTab === 'gift_cards' && (
          <div className="space-y-6">
            {/* Claim Card Input Banner */}
            <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 border border-amber-500/30 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Claim Digital Gift Card</h3>
                  <p className="text-xs text-slate-300">
                    Have an Amazon-style Bellad gift voucher? Enter the 16-character code and 4-digit PIN to credit points instantly!
                  </p>
                </div>
              </div>

              <form onSubmit={handleClaimGiftCard} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <input
                  type="text"
                  required
                  placeholder="GIFT-BELL-XXXX-XXXX"
                  value={claimCardCode}
                  onChange={(e) => setClaimCardCode(e.target.value.toUpperCase())}
                  className="sm:col-span-1.5 px-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl font-mono font-bold uppercase text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
                <input
                  type="password"
                  maxLength="6"
                  required
                  placeholder="4-Digit PIN"
                  value={claimPin}
                  onChange={(e) => setClaimPin(e.target.value)}
                  className="px-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl font-mono font-bold tracking-widest text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
                <button
                  type="submit"
                  disabled={isClaimingGiftCard}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-xl transition shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isClaimingGiftCard ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <span>Claim to Points →</span>
                  )}
                </button>
              </form>
            </div>

            {/* My Active Gift Cards */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                My Digital Gift Cards ({myGiftCards.length})
              </h3>

              {loadingGiftCards ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                  <p className="text-xs">Loading gift cards...</p>
                </div>
              ) : myGiftCards.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-2">
                  <Gift className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-300">No Gift Cards Linked</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Claim a gift card code above or ask your sales executive at any showroom counter.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {myGiftCards.map((card) => {
                    const isPinVisible = revealedPins[card.card_id];
                    const isRedeemed = card.status === 'redeemed' || Number(card.balance_amount) === 0;

                    return (
                      <div
                        key={card.card_id}
                        className={`rounded-3xl p-5 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border ${
                          isRedeemed
                            ? 'bg-slate-900 border-slate-800 opacity-60'
                            : 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-indigo-500/40'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1 font-mono">
                              <Sparkles className="w-3 h-3" /> Bellad Gift Card
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                isRedeemed
                                  ? 'bg-slate-800 text-slate-400'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {card.status.replace('_', ' ')}
                            </span>
                          </div>

                          <div>
                            <span className="text-[11px] text-slate-400 font-bold block">Available Card Balance</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-2xl font-black text-white font-mono">
                                ₹{Number(card.balance_amount || 0).toLocaleString('en-IN')}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                (Initial: ₹{Number(card.initial_amount || 0).toLocaleString('en-IN')})
                              </span>
                            </div>
                          </div>

                          {/* Card Code Strip */}
                          <div className="bg-black/40 p-2.5 rounded-xl border border-white/10 flex items-center justify-between font-mono text-xs">
                            <span className="font-bold tracking-wider text-amber-300">{card.card_number}</span>
                            <button
                              onClick={() => handleCopyCard(card.card_number)}
                              className="p-1 text-slate-400 hover:text-white"
                              title="Copy code"
                            >
                              {copiedCard === card.card_number ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* PIN */}
                          <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                            <span>
                              PIN:{' '}
                              <strong className="text-white">
                                {isPinVisible ? card.pin_code : '••••'}
                              </strong>
                            </span>
                            <button
                              onClick={() => togglePinReveal(card.card_id)}
                              className="text-[11px] text-indigo-300 hover:text-indigo-200 underline font-sans"
                            >
                              {isPinVisible ? 'Hide PIN' : 'Reveal PIN'}
                            </button>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-white/10 mt-3 flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            Expires:{' '}
                            {card.expires_at ? new Date(card.expires_at).toLocaleDateString('en-IN') : '1 Year'}
                          </span>
                          <span>For: {card.recipient_name || 'You'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 3: Refer & Earn ──────────────────────────────────────────── */}
        {activeTab === 'referrals' && (
          <div className="space-y-6">
            {/* Share Referral Link Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-white">Your Unique Referral Link</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Share with friends &amp; family. Earn bonus loyalty points when they buy a 2W, 4W, or EV vehicle!
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Hey! I love my vehicle experience at ${profile?.firm_name || 'Bellad Automobiles'}. Use my referral link to get exclusive bonus rewards: ${referralLink}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition flex items-center gap-2 shadow-md"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share on WhatsApp
                  </a>
                  <button
                    onClick={handleCopyReferral}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-slate-700"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 font-mono text-xs font-bold text-amber-300 break-all select-all">
                {referralLink}
              </div>
            </div>

            {/* Refer a Friend Form */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Refer a Friend Directly</h3>
              </div>

              <form onSubmit={handleReferFriendSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Friend&apos;s Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patil"
                    value={refereeName}
                    onChange={(e) => setRefereeName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Friend&apos;s Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={refereePhone}
                    onChange={(e) => setRefereePhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Interested Vehicle Model</label>
                  <input
                    type="text"
                    placeholder="e.g. EV / 4W Sedan"
                    value={refereeModel}
                    onChange={(e) => setRefereeModel(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="sm:col-span-3 flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingReferral}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-xl transition shadow-md disabled:opacity-50"
                  >
                    {isSubmittingReferral ? 'Submitting...' : 'Submit Referral Lead'}
                  </button>
                </div>
              </form>
            </div>

            {/* Referrals Tracking Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                My Referrals Tracking ({referralsList.length})
              </h3>

              {loadingReferrals ? (
                <div className="py-8 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-amber-400" />
                  <p className="text-xs">Loading referrals...</p>
                </div>
              ) : referralsList.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No friends referred yet. Share your referral link above to earn bonus loyalty points!
                </p>
              ) : (
                <div className="space-y-2">
                  {referralsList.map((ref, idx) => (
                    <div
                      key={ref.id || idx}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white">{ref.referee_name || 'Friend'}</span>
                        <span className="text-[11px] text-slate-400 block font-mono">{ref.referee_phone}</span>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-950 text-indigo-300 border border-indigo-800">
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

        {/* ─── TAB 4: My Garage / Vehicles ──────────────────────────────────── */}
        {activeTab === 'garage' && (
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              My Registered Vehicles ({profile?.vehicles?.length || 0})
            </h3>

            {(profile?.vehicles || []).length === 0 ? (
              <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-2">
                <Car className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-300">No Vehicles Linked</p>
                <p className="text-xs text-slate-400">
                  Your vehicles purchased at {profile?.firm_name || 'our showroom'} will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.vehicles.map((v, idx) => (
                  <div
                    key={v.vehicle_id || idx}
                    className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-3 hover:border-slate-700 transition shadow-xl"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-white text-sm">
                        {v.brand_name} {v.model} {v.variant}
                      </span>
                      <span className="font-mono text-xs font-bold text-amber-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        {v.registration_number || v.vin || 'Pending Reg'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-3 rounded-2xl border border-slate-800/80 font-mono">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block font-sans">Gross Price</span>
                        <span className="font-bold text-slate-200">
                          {v.gross_ex_showroom_price ? `₹${Number(v.gross_ex_showroom_price).toLocaleString('en-IN')}` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-emerald-400 text-[10px] uppercase font-bold block font-sans">Net Price</span>
                        <span className="font-bold text-emerald-400">
                          {v.net_ex_showroom_price ? `₹${Number(v.net_ex_showroom_price).toLocaleString('en-IN')}` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block font-sans">Fuel Type</span>
                        <span className="font-bold text-slate-200 uppercase">{v.fuel_type || 'Petrol'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block font-sans">Delivery Date</span>
                        <span className="font-bold text-slate-200">{v.purchase_date || '—'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 5: Profile & KYC ─────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">KYC &amp; Profile Details</h3>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                Aadhaar Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Unique Identifier</span>
                <span className="font-mono font-extrabold text-white text-sm mt-0.5 block">
                  Aadhaar: {profile?.aadhaar || 'Verified on Registration'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Registered WhatsApp Mobile</span>
                <span className="font-mono font-extrabold text-white text-sm mt-0.5 block">
                  +91 {profile?.phone || '—'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Dealership Group</span>
                <span className="font-bold text-white text-sm mt-0.5 block">
                  {profile?.firm_name || 'Bellad & Company'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Home Dealership Branch</span>
                <span className="font-bold text-white text-sm mt-0.5 block">
                  {profile?.branch_name || 'Main Showroom'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
              To update your registered mobile number or nomination details, please visit your nearest showroom cashier desk with your Aadhaar card for instant WhatsApp verification.
            </p>
          </div>
        )}
      </main>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-5 mt-auto relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-xs text-slate-400 space-y-1">
          <p>&copy; {new Date().getFullYear()} {profile?.firm_name || 'Bellad Automobile Corporation'}. All rights reserved.</p>
          <p className="text-[11px] text-slate-400 font-mono">
            Encrypted Dealership Cloud &bull; Belagavi &bull; Hubballi &bull; Vijayapura
          </p>
        </div>
      </footer>

      {/* ─── How to Redeem Modal ───────────────────────────────────────────── */}
      {showRedeemModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-2.5 text-white">
              <Info className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold">How to Redeem Points</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Loyalty points can be redeemed directly at any authorized showroom or service center cashier desk during invoice generation.
            </p>
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-1.5 font-medium">
              <p>
                <strong className="font-bold text-white">Current Balance:</strong>{' '}
                <span className="font-mono text-amber-400">{(profile?.balance || 0).toLocaleString('en-IN')} PTS</span>
              </p>
              <p>
                <strong className="font-bold text-white">Discount Value:</strong>{' '}
                <span className="font-mono text-emerald-400">₹{(profile?.redeemableValue || 0).toLocaleString('en-IN')}</span>
              </p>
              <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                The cashier will verify a secure 4-digit OTP sent to your WhatsApp number before applying the discount to your bill.
              </p>
            </div>
            <button
              onClick={() => setShowRedeemModal(false)}
              className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs transition shadow-md"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
