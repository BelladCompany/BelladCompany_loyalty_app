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
} from 'lucide-react';
import ApiService from '../../services/api';

// Icon mapper for transaction categories
const CategoryIcon = ({ type }) => {
  switch (type) {
    case 'finance':
    case 'inhouse_finance':
      return <DollarSign className="w-4 h-4 text-emerald-600" />;
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
      return <Car className="w-4 h-4 text-slate-600" />;
  }
};

// Memoized Activity Row
const LedgerRow = memo(({ item }) => {
  const isPositive = item.points >= 0;
  const formattedPoints = isPositive ? `+${item.points.toLocaleString('en-IN')}` : `${item.points.toLocaleString('en-IN')}`;

  return (
    <div className="flex items-center justify-between py-3.5 px-4 bg-white border border-slate-200/80 rounded-2xl hover:border-slate-300 hover:shadow-xs transition-all">
      <div className="flex items-center space-x-3.5 min-w-0 pr-2">
        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
          <CategoryIcon type={item.type} />
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{item.text}</p>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-medium">
            <span>{item.date}</span>
            {item.amount && (
              <>
                <span>•</span>
                <span>Bill: ₹{item.amount.toLocaleString('en-IN')}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <span
          className={`text-xs sm:text-sm font-black font-mono px-2.5 py-1 rounded-lg ${
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
  const [activeTab, setActiveTab] = useState('overview'); // overview, ledger, gift_cards, referrals, garage, profile
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
      setError('Please enter your friend\'s name and mobile number.');
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

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 flex flex-col antialiased">
      {/* ─── 1. Header ──────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src="/bellad-logo.png"
              alt="Dealership Logo"
              className="w-8 h-8 object-contain rounded-lg shadow-2xs"
            />
            <div>
              <span className="text-base font-black text-slate-900 tracking-tight block">
                {profile?.firm_name || 'Bellad & Company'}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block -mt-0.5">
                Customer Loyalty Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {profile?.aadhaar && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Aadhaar: {profile.aadhaar}
              </span>
            )}
            <button
              onClick={onSignOut}
              className="inline-flex items-center text-xs font-bold text-slate-700 hover:text-slate-900 py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 transition shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 pt-6 pb-12 space-y-6 flex-1 w-full">
        {/* Alerts */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">✕</button>
          </div>
        )}

        {/* ─── 2. Hero Loyalty Member Card ─────────────────────────────────── */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-full shadow-sm flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-slate-950" />
                    {profile?.tier?.current || 'Silver'} Tier Member
                  </span>
                  {profile?.aadhaar && (
                    <span className="text-xs text-slate-400 font-mono">
                      ID: {profile.customer_id}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-2 text-white">
                  {profile?.name || firstName}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {profile?.phone} • {profile?.branch_name || 'Main Showroom'} • Member since {profile?.memberSince || '2024'}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-right sm:text-right flex sm:flex-col justify-between items-center sm:items-end">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Loyalty Points
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                    {(profile?.balance || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-bold text-amber-400">PTS</span>
                </div>
                <span className="text-xs font-bold text-emerald-400 mt-1 block">
                  ≈ ₹{(profile?.redeemableValue || 0).toLocaleString('en-IN')} Discount Value
                </span>
              </div>
            </div>

            {/* Tier Progress Bar */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">
                  Tier Progress: <span className="text-white">{profile?.tier?.current || 'Silver'}</span> → {profile?.tier?.next || 'Gold'}
                </span>
                <span className="text-amber-400 font-mono">
                  {profile?.lifetime_points?.toLocaleString('en-IN') || 0} / {profile?.tier?.next_points?.toLocaleString('en-IN') || 5000} Lifetime PTS
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${profile?.tier?.progress_percentage || 10}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── 3. In-House Benefits Highlight Strip ────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className={`p-4 rounded-2xl border transition-all ${
            profile?.inhouse_benefits?.finance_opted
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950'
              : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-xs sm:text-sm">In-house Finance</span>
              </div>
              {profile?.inhouse_benefits?.finance_opted ? (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  +100 PTS Unlocked
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 uppercase">Available</span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-tight">
              Exclusive tie-up finance bonus on HDFC, Kotak &amp; Sundaram.
            </p>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            profile?.inhouse_benefits?.insurance_opted
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-950'
              : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-xs sm:text-sm">In-house Insurance</span>
              </div>
              {profile?.inhouse_benefits?.insurance_opted ? (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                  +50 PTS Unlocked
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 uppercase">Available</span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-tight">
              OEM assured cashless policy renewal &amp; claims support.
            </p>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            profile?.inhouse_benefits?.exchange_opted
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-950'
              : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-5 h-5 text-amber-600" />
                <span className="font-bold text-xs sm:text-sm">In-house Exchange</span>
              </div>
              {profile?.inhouse_benefits?.exchange_opted ? (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                  +200 PTS Unlocked
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 uppercase">Available</span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-tight">
              Best resale valuation &amp; upgrade bonus on 2W/4W trade-in.
            </p>
          </div>
        </div>

        {/* ─── 4. Navigation Tabs ───────────────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 text-xs font-bold">
          {[
            { id: 'overview', label: 'Activity & Ledger', icon: Sparkles },
            { id: 'gift_cards', label: `Gift Cards (${myGiftCards.length})`, icon: Gift },
            { id: 'referrals', label: `Refer & Earn (${referralsList.length})`, icon: Users },
            { id: 'garage', label: `My Vehicles (${profile?.vehicles?.length || 0})`, icon: Car },
            { id: 'profile', label: 'Profile & KYC', icon: User },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── TAB 1: Activity & Ledger ─────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Transaction Activity Log
              </h2>
              <button
                onClick={() => setShowRedeemModal(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
              >
                <Gift className="w-3.5 h-3.5" />
                How to Redeem
              </button>
            </div>

            {loadingLedger ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                <p className="text-xs">Loading activity ledger...</p>
              </div>
            ) : ledgerItems.length === 0 ? (
              <div className="text-center py-12 bg-white border border-slate-200 rounded-3xl p-6">
                <Car className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800">No Transactions Recorded Yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Your points from vehicle purchases, service visits, in-house bonuses, and gift cards will appear here.
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
                  className="inline-flex items-center text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 py-2.5 px-4 rounded-xl transition disabled:opacity-50"
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
            <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-amber-500/10 border-2 border-amber-500/30 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Claim Digital Gift Card</h3>
                  <p className="text-xs text-slate-600">
                    Have an Amazon-style gift card? Enter the 16-character code and 4-digit PIN to credit points instantly!
                  </p>
                </div>
              </div>

              <form onSubmit={handleClaimGiftCard} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Card Number (GIFT-BELL-XXXX-XXXX)"
                  value={claimCardCode}
                  onChange={(e) => setClaimCardCode(e.target.value.toUpperCase())}
                  className="sm:col-span-1.5 px-4 py-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <input
                  type="password"
                  maxLength="6"
                  required
                  placeholder="4-Digit PIN"
                  value={claimPin}
                  onChange={(e) => setClaimPin(e.target.value)}
                  className="px-4 py-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <button
                  type="submit"
                  disabled={isClaimingGiftCard}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl transition shadow-md disabled:opacity-50"
                >
                  {isClaimingGiftCard ? 'Claiming...' : 'Claim to Points'}
                </button>
              </form>
            </div>

            {/* My Active Gift Cards */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                My Digital Gift Cards ({myGiftCards.length})
              </h3>

              {loadingGiftCards ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                  <p className="text-xs">Loading gift cards...</p>
                </div>
              ) : myGiftCards.length === 0 ? (
                <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl space-y-2">
                  <Gift className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No Gift Cards Linked</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Claim a gift card code above or ask your sales executive at any showroom.
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
                        className={`rounded-3xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col justify-between border ${
                          isRedeemed
                            ? 'bg-slate-800 border-slate-700 opacity-60'
                            : 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-indigo-500/30'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Dealership Gift Card
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                isRedeemed
                                  ? 'bg-slate-700 text-slate-300'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {card.status.replace('_', ' ')}
                            </span>
                          </div>

                          <div>
                            <span className="text-[11px] text-slate-400 font-bold block">Available Card Balance</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-2xl font-black text-white">
                                ₹{Number(card.balance_amount || 0).toLocaleString('en-IN')}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                (Initial: ₹{Number(card.initial_amount || 0).toLocaleString('en-IN')})
                              </span>
                            </div>
                          </div>

                          {/* Card Code Strip */}
                          <div className="bg-black/30 p-2.5 rounded-xl border border-white/10 flex items-center justify-between font-mono text-xs">
                            <span className="font-bold tracking-wider">{card.card_number}</span>
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
                            <span>PIN: <strong className="text-white">{isPinVisible ? card.pin_code : '••••'}</strong></span>
                            <button
                              onClick={() => togglePinReveal(card.card_id)}
                              className="text-[11px] text-indigo-300 underline font-sans"
                            >
                              {isPinVisible ? 'Hide' : 'Reveal'}
                            </button>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-white/10 mt-3 flex items-center justify-between text-[11px] text-slate-400">
                          <span>Expires: {card.expires_at ? new Date(card.expires_at).toLocaleDateString('en-IN') : '1 Year'}</span>
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
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">Your Unique Referral Link</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Share with friends &amp; family. Earn bonus loyalty points when they buy a 2W or 4W vehicle!
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Hey! I love my vehicle experience at ${profile?.firm_name || 'Bellad Automobiles'}. Use my referral code ${profile?.customer_id} to get exclusive bonus rewards: ${referralLink}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition flex items-center gap-2 shadow-xs"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share on WhatsApp
                  </a>
                  <button
                    onClick={handleCopyReferral}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 font-mono text-xs font-bold text-slate-800 break-all">
                {referralLink}
              </div>
            </div>

            {/* Refer a Friend Form */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Refer a Friend Directly</h3>
              </div>

              <form onSubmit={handleReferFriendSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Friend's Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patil"
                    value={refereeName}
                    onChange={(e) => setRefereeName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Friend's Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={refereePhone}
                    onChange={(e) => setRefereePhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Interested Vehicle Model</label>
                  <input
                    type="text"
                    placeholder="e.g. Creta / Splendor"
                    value={refereeModel}
                    onChange={(e) => setRefereeModel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="sm:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingReferral}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition disabled:opacity-50"
                  >
                    {isSubmittingReferral ? 'Submitting...' : 'Submit Referral Lead'}
                  </button>
                </div>
              </form>
            </div>

            {/* Referrals Tracking Table */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                My Referrals Tracking ({referralsList.length})
              </h3>

              {loadingReferrals ? (
                <div className="py-8 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-slate-400" />
                  <p className="text-xs">Loading referrals...</p>
                </div>
              ) : referralsList.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No friends referred yet. Share your referral link above to earn points!
                </p>
              ) : (
                <div className="space-y-2">
                  {referralsList.map((ref, idx) => (
                    <div
                      key={ref.id || idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{ref.referee_name || 'Friend'}</span>
                        <span className="text-[11px] text-slate-500 block font-mono">{ref.referee_phone}</span>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {ref.status || 'Pending'}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
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
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              My Registered Vehicles ({profile?.vehicles?.length || 0})
            </h3>

            {(profile?.vehicles || []).length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl space-y-2">
                <Car className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No Vehicles Linked</p>
                <p className="text-xs text-slate-400">
                  Your vehicles purchased at {profile?.firm_name || 'our showroom'} will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.vehicles.map((v, idx) => (
                  <div
                    key={v.vehicle_id || idx}
                    className="bg-white border-2 border-slate-200 rounded-3xl p-5 space-y-3 hover:border-indigo-400 transition shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 text-sm">
                        {v.brand_name} {v.model} {v.variant}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        {v.registration_number || v.vin || 'Pending Reg'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Gross Price</span>
                        <span className="font-bold text-slate-800">
                          {v.gross_ex_showroom_price ? `₹${Number(v.gross_ex_showroom_price).toLocaleString('en-IN')}` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-emerald-700 text-[10px] uppercase font-bold block">After Discount Price</span>
                        <span className="font-bold text-emerald-700">
                          {v.net_ex_showroom_price ? `₹${Number(v.net_ex_showroom_price).toLocaleString('en-IN')}` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Fuel Type</span>
                        <span className="font-bold text-slate-800 uppercase">{v.fuel_type || 'Petrol'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Delivery Date</span>
                        <span className="font-bold text-slate-800">{v.purchase_date || '—'}</span>
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
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">KYC &amp; Profile Details</h3>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                Aadhaar Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Primary Unique Identifier</span>
                <span className="font-mono font-extrabold text-slate-900 text-sm mt-0.5 block">
                  Aadhaar No: {profile?.aadhaar || 'Verified on Registration'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Registered WhatsApp Mobile</span>
                <span className="font-mono font-extrabold text-slate-900 text-sm mt-0.5 block">
                  {profile?.phone || '—'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Dealership Group</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {profile?.firm_name || 'Bellad & Company'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Home Branch</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {profile?.branch_name || 'Main Showroom'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
              To update your registered mobile number or nominee details, visit your nearest showroom cashier desk with your Aadhaar card for OTP verification.
            </p>
          </div>
        )}
      </main>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-slate-400 space-y-1">
          <p>© {new Date().getFullYear()} {profile?.firm_name || 'Bellad Automobiles'}. All rights reserved.</p>
        </div>
      </footer>

      {/* ─── How to Redeem Modal ───────────────────────────────────────────── */}
      {showRedeemModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-2 text-slate-900">
              <Info className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold">How to Redeem Points</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Loyalty points can be redeemed directly at any authorized showroom or service center cashier desk during billing.
            </p>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1 font-medium">
              <p><strong className="font-bold text-slate-900">Current Balance:</strong> {profile?.balance || 0} PTS</p>
              <p><strong className="font-bold text-slate-900">Discount Value:</strong> ₹{profile?.redeemableValue || 0}</p>
              <p className="text-[11px] text-slate-500 pt-1">
                Cashier will verify OTP sent to your WhatsApp number before applying discount.
              </p>
            </div>
            <button
              onClick={() => setShowRedeemModal(false)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
