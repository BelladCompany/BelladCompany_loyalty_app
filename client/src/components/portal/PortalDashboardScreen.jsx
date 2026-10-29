import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  LogOut,
  Copy,
  Check,
  ShieldCheck,
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
  Wrench,
  Award,
  Tag,
  Zap,
  ChevronRight,
  Home,
  QrCode,
  Flame,
  Percent,
  Upload,
  FileText,
  RefreshCw,
  X,
  ExternalLink,
  Crown,
  Coins,
  IndianRupee,
  Layers,
  CheckCheck,
  Lock
} from 'lucide-react';
import ApiService from '../../services/api';
import SendGiftModal from './SendGiftModal';

// ─── Dynamic Monthly Vehicle & Service Offers (Easily Customizable) ─────────
const INITIAL_MONTHLY_OFFERS = [
  {
    id: 'safari-dark-edition',
    category: 'suv',
    badge: 'FESTIVE SPECIAL',
    badgeColor: 'bg-amber-500 text-slate-950 font-black',
    title: 'Tata Safari & Harrier Dark Edition',
    benefit: 'Up to ₹1,25,000 Total Benefits',
    description: '₹40,000 Exchange Bonus + 10,000 Bonus Loyalty Points + 3-Year Free Scheduled Service Maintenance.',
    image: '/offers/safari.jpg',
    validTill: 'Valid till 31 Oct 2026',
    code: 'BELLAD-DARK-OCT',
    highlights: ['3-Row Luxury Seating', 'ADAS Level 2 Features', 'Ventilated Seats'],
    whatsappMsg: 'Hi Bellad & Co, I am interested in the Tata Safari Dark Edition October offer (Code: BELLAD-DARK-OCT). Please share best price quote.',
  },
  {
    id: 'nexon-ev-green-fest',
    category: 'ev',
    badge: 'ELECTRIC REVOLUTION',
    badgeColor: 'bg-emerald-500 text-slate-950 font-black',
    title: 'Tata Nexon.ev & Tiago.ev',
    benefit: '₹50,000 Cash Benefit + Free 7.2 kW AC Charger',
    description: 'Zero road tax in Karnataka + 2X Loyalty Points on all genuine accessories. Fast charger installed at your home.',
    image: '/offers/nexon_ev.jpg',
    validTill: 'Valid till 31 Oct 2026',
    code: 'BELLAD-EV-GREEN',
    highlights: ['465 km Certified Range', 'V2V & V2L Charging', 'Harman 12.3" Cinematic Screen'],
    whatsappMsg: 'Hi Bellad & Co, I want to inquire about the Tata Nexon.ev Green Fest offer with free home fast charger.',
  },
  {
    id: 'ceramic-coating-service',
    category: 'service',
    badge: 'WORKSHOP & BODYSHOP',
    badgeColor: 'bg-indigo-600 text-white font-bold',
    title: '9H Ceramic Paint Detailing & Body Shop',
    benefit: 'Flat 30% OFF + 1,000 Bonus Loyalty Points',
    description: 'Complete exterior 9H ceramic coating, underbody anti-rust treatment, and interior deep ozone sanitization at Bellad workshops.',
    image: '/offers/detailing.jpg',
    validTill: 'Valid till 15 Nov 2026',
    code: 'BELLAD-CERAMIC-30',
    highlights: ['3-Year Warranty Certificate', 'High Gloss Hydrophobic Finish', 'Ozone Interior Disinfection'],
    whatsappMsg: 'Hi Bellad & Co, I would like to book a 9H ceramic detailing session under the 30% discount package.',
  },
];

// Tier Privileges Config
const TIER_BENEFITS_DATA = [
  {
    tier: 'Silver',
    label: 'Silver Member',
    color: 'from-slate-600 to-slate-800',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    minPoints: 0,
    maxPoints: 5000,
    serviceEarn: '2% of Bill',
    accessoryEarn: '1% of Bill',
    salesEarn: '1% Ex-Showroom',
    bodyshopDiscount: 'Standard Rates',
    perks: [
      'Earn points on every periodic service',
      'Digital WhatsApp Wallet Pass',
      'Free 40-point vehicle monsoon health check',
      'Digital e-gift card sharing access',
    ],
  },
  {
    tier: 'Gold',
    label: 'Gold VIP Member',
    color: 'from-amber-500 via-amber-600 to-amber-700',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    minPoints: 5000,
    maxPoints: 15000,
    serviceEarn: '4% of Bill',
    accessoryEarn: '2% of Bill',
    salesEarn: '1% Ex-Showroom',
    bodyshopDiscount: '3% Customer Share Discount',
    perks: [
      'Double points on periodic workshop service',
      'Priority workshop service bay booking',
      '500 Bonus Points on every successful friend referral',
      'Complimentary exterior wash during periodic maintenance',
      'Dedicated Service Advisor support',
    ],
  },
  {
    tier: 'Platinum',
    label: 'Platinum VIP Member',
    color: 'from-slate-900 via-indigo-950 to-slate-900',
    badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    minPoints: 15000,
    maxPoints: 999999,
    serviceEarn: '6% of Bill',
    accessoryEarn: '4% of Bill',
    salesEarn: '1% Ex-Showroom',
    bodyshopDiscount: '5% Customer Share Discount',
    perks: [
      'Maximum 6% cashback points on workshop bills',
      'Free doorstep vehicle pickup and drop for service',
      'VIP Concierge & Direct Dealership General Manager desk access',
      '1,000 Bonus Points on friend vehicle referrals',
      'Free annual wheel balancing and alignment check',
      'Exclusive invitations to new model launch drive previews',
    ],
  },
];

// Memoized Ledger Row
const LedgerRow = memo(({ item }) => {
  const isPositive = (item.points || 0) >= 0;
  const formattedPoints = isPositive
    ? `+${(item.points || 0).toLocaleString('en-IN')}`
    : `${(item.points || 0).toLocaleString('en-IN')}`;

  return (
    <div className="flex items-center justify-between py-3.5 px-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-200 transition shadow-2xs gap-3">
      <div className="flex items-center space-x-3.5 min-w-0 pr-1">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          }`}>
          {isPositive ? <Coins className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
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
          className={`text-xs font-black font-mono px-3 py-1 rounded-full whitespace-nowrap inline-block ${isPositive
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

  // 4 Main Tabs: 'gift_cards' | 'referrals' | 'offers' | 'benefits'
  // Secondary Tabs: 'home' | 'transactions' | 'garage' | 'kyc'
  const [activeTab, setActiveTab] = useState('home');

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedCard, setCopiedCard] = useState('');
  const [copiedOffer, setCopiedOffer] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [sendGiftModalOpen, setSendGiftModalOpen] = useState(false);

  // Gift Cards State
  const [myGiftCards, setMyGiftCards] = useState([]);
  const [loadingGiftCards, setLoadingGiftCards] = useState(false);
  const [revealedPins, setRevealedPins] = useState({});

  // Referrals State
  const [referralsList, setReferralsList] = useState([]);
  const [referralsSummary, setReferralsSummary] = useState({
    locked_points: 0,
    locked_value_inr: 0,
    ready_to_claim_points: 0,
    ready_to_claim_count: 0,
    total_earned_referral_points: 0,
    total_earned_value_inr: 0,
    total_referrals: 0,
  });
  const [claimingReferralId, setClaimingReferralId] = useState(null);
  const [loadingReferrals, setLoadingReferrals] = useState(false);

  // Offers State
  const [offersList, setOffersList] = useState(INITIAL_MONTHLY_OFFERS);
  const [selectedOfferCategory, setSelectedOfferCategory] = useState('all');

  // Member Benefits Tab selection: Silver, Gold, Platinum
  const [selectedTierTab, setSelectedTierTab] = useState('Gold');

  // KYC Correction State
  const [kycRequests, setKycRequests] = useState([]);
  const [loadingKycHistory, setLoadingKycHistory] = useState(false);
  const [kycNewPhone, setKycNewPhone] = useState('');
  const [kycReason, setKycReason] = useState('');
  const [kycIdProofType, setKycIdProofType] = useState('Aadhaar Card');
  const [kycIdProofFile, setKycIdProofFile] = useState(null);
  const [kycOtp, setKycOtp] = useState('');
  const [kycOtpSent, setKycOtpSent] = useState(false);
  const [isRequestingKycOtp, setIsRequestingKycOtp] = useState(false);
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false);
  const [kycFormSuccess, setKycFormSuccess] = useState('');
  const [kycFormError, setKycFormError] = useState('');

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
      if (err.status === 401 || err.status === 403 || String(err.message || '').toLowerCase().includes('token')) {
        if (onSignOut) onSignOut();
        return;
      }
      setError('Could not load account details. Please refresh.');
    } finally {
      setLoadingProfile(false);
    }
  }, [onSignOut]);

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
      setReferralsSummary({
        locked_points: res.locked_points || 0,
        locked_value_inr: res.locked_value_inr || 0,
        ready_to_claim_points: res.ready_to_claim_points || 0,
        ready_to_claim_count: res.ready_to_claim_count || 0,
        total_earned_referral_points: res.total_earned_referral_points || 0,
        total_earned_value_inr: res.total_earned_value_inr || 0,
        total_referrals: res.total_referrals || (res.referrals ? res.referrals.length : 0),
      });
    } catch (err) {
      console.error('Failed to load referrals:', err);
    } finally {
      setLoadingReferrals(false);
    }
  }, []);

  const handleClaimReferral = async (referralId) => {
    if (!referralId || claimingReferralId) return;
    try {
      setClaimingReferralId(referralId);
      setError('');
      const res = await ApiService.portalClaimReferral(referralId);
      setSuccessMsg(res.message || '2,500 Referral Points credited to your wallet!');
      await Promise.all([loadReferrals(), loadProfile(), loadLedger()]);
    } catch (err) {
      setError(err.message || 'Failed to claim referral reward. Please ensure friend vehicle purchase and PR are completed.');
    } finally {
      setClaimingReferralId(null);
    }
  };

  const loadKycRequests = useCallback(async () => {
    try {
      setLoadingKycHistory(true);
      const res = await ApiService.portalGetMyKycRequests();
      setKycRequests(res.data || []);
    } catch (err) {
      console.error('Failed to load KYC requests:', err);
    } finally {
      setLoadingKycHistory(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadLedger();
    loadGiftCards();
    loadReferrals();
    loadKycRequests();
  }, [loadProfile, loadLedger, loadGiftCards, loadReferrals, loadKycRequests]);

  const firstName = profile?.name ? profile.name.split(' ')[0] : 'Valued Customer';
  const fullName = profile?.name || customerInfo?.name || 'Rahul Sharma';
  const customerId = profile?.customer_id || customerInfo?.customer_id || 'BAC-9821';
  const primaryVehicle = profile?.vehicles?.[0]
    ? `${profile.vehicles[0].brand_name || 'Tata'} ${profile.vehicles[0].model || 'Motors'}`
    : 'Tata Safari Dark Edition';

  const referralLink = profile?.referralCode
    ? `${window.location.origin}/portal?ref=${profile.referralCode}`
    : `${window.location.origin}/portal`;

  const whatsappReferralText = encodeURIComponent(
    `Hey! Join Bellad & Co Loyalty Rewards using my referral link and earn exclusive bonus points on your new vehicle purchase or workshop service: ${referralLink}`
  );
  const whatsappReferralUrl = `https://wa.me/?text=${whatsappReferralText}`;

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

  // KYC submission
  const handleRequestKycOtp = async () => {
    setIsRequestingKycOtp(true);
    setKycFormError('');
    setKycFormSuccess('');
    try {
      const res = await ApiService.portalRequestKycOtp();
      setKycOtpSent(true);
      setKycFormSuccess(res.message || 'OTP sent successfully to your current registered mobile.');
    } catch (err) {
      setKycFormError(err.message || 'Failed to send OTP.');
    } finally {
      setIsRequestingKycOtp(false);
    }
  };

  const handleSubmitKycForm = async (e) => {
    e.preventDefault();
    setKycFormError('');
    setKycFormSuccess('');

    const cleanNewPhone = kycNewPhone.replace(/\D/g, '').slice(-10);
    if (!cleanNewPhone || cleanNewPhone.length !== 10) {
      setKycFormError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!kycReason.trim()) {
      setKycFormError('Please enter the reason for KYC correction.');
      return;
    }
    if (!kycIdProofFile) {
      setKycFormError('Please upload an ID proof document (Aadhaar, PAN, DL, etc.).');
      return;
    }
    if (!kycOtp.trim()) {
      setKycFormError('Please enter the 6-digit OTP sent to your registered phone.');
      return;
    }

    setIsSubmittingKyc(true);
    try {
      const formData = new FormData();
      formData.append('new_value', cleanNewPhone);
      formData.append('reason', kycReason.trim());
      formData.append('id_proof_type', kycIdProofType);
      formData.append('otp', kycOtp.trim());
      formData.append('id_proof_file', kycIdProofFile);

      const res = await ApiService.portalSubmitKycCorrection(formData);
      setKycFormSuccess(res.message || 'KYC correction request submitted to Accounts Head for approval.');
      setKycNewPhone('');
      setKycReason('');
      setKycIdProofFile(null);
      setKycOtp('');
      setKycOtpSent(false);
      loadKycRequests();
    } catch (err) {
      setKycFormError(err.message || 'Failed to submit KYC correction.');
    } finally {
      setIsSubmittingKyc(false);
    }
  };

  // Balances & Tier Calculations
  const currentBalance = profile?.balance ?? profile?.points ?? customerInfo?.points ?? customerInfo?.balance ?? 4250;
  const cashValue = (currentBalance * 0.25).toFixed(2);
  const currentTier = profile?.tier?.current || customerInfo?.tier || 'Gold';
  const nextTier = currentTier === 'Silver' ? 'Gold' : 'Platinum';
  const nextTierPoints = currentTier === 'Silver' ? 5000 : 15000;
  const lifetimePoints = profile?.lifetime_points || customerInfo?.lifetime_points || currentBalance;
  const pointsToLevelUp = Math.max(0, nextTierPoints - lifetimePoints);
  const tierProgress = Math.min(100, Math.round((lifetimePoints / nextTierPoints) * 100));

  // Filtered Offers
  const filteredOffers = useMemo(() => {
    if (selectedOfferCategory === 'all') return offersList;
    return offersList.filter((o) => o.category === selectedOfferCategory);
  }, [offersList, selectedOfferCategory]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-sans selection:bg-amber-400 selection:text-slate-950">

      {/* ─── 1. Top Brand Navigation Bar ──────────────────────────────────── */}
      <header className="bg-indigo-600 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-1 flex items-center justify-center shrink-0">
              <img src="/bellad-logo.png" alt="Bellad Logo" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-black tracking-tight text-white block leading-tight">
                Bellad &amp; Co Loyalty Pass
              </span>
              <span className="text-[11px] font-medium text-indigo-200 block">
                Karnataka&apos;s Premier Automotive Rewards
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-sm">
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>{currentTier} VIP</span>
            </span>

            <button
              onClick={onSignOut}
              title="Sign Out"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── 2. Main Content ──────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-7 space-y-6 flex-1">

        {/* Global Notifications */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-900 font-bold">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-900 font-bold">✕</button>
          </div>
        )}

        {/* ─── 3. DIGITAL MEMBER PASS (LUXURY WALLET CARD - Reference Styled) ─── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white p-6 sm:p-7 shadow-xl shadow-amber-600/25 border border-amber-400/40">
          {/* Subtle Ambient Radial Highlight */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16" />

          <div className="relative z-10 space-y-4">
            {/* Top Pass Row */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-amber-100/90 block font-mono">
                  Digital Member Pass
                </span>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">
                  {fullName}
                </h1>
                <p className="text-xs text-amber-100 font-medium mt-0.5">
                  ID: <span className="font-mono font-bold">{customerId}</span> &bull; {primaryVehicle}
                </p>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-sm shrink-0">
                <Crown className="w-6 h-6 text-amber-200" />
              </div>
            </div>

            {/* Bottom Row: Usable Points Balance & Cash Value */}
            <div className="pt-3 flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-t border-white/15">
              <div>
                <span className="text-xs font-bold text-amber-100 block uppercase tracking-wider font-mono">
                  Usable Points Balance
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                    {Number(currentBalance).toLocaleString('en-IN')}
                  </span>
                  <span className="text-sm font-bold text-amber-200 font-mono">pts</span>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-xs font-bold text-white self-start sm:self-auto shadow-xs">
                <IndianRupee className="w-3.5 h-3.5 text-amber-200" />
                <span>≈ ₹{cashValue} Cash Discount</span>
                <span className="text-[10px] text-amber-200 font-mono">(4 pts = ₹1)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 4. THE 4 MAIN CORE QUICK-ACTION BUTTONS (Mobile & Desktop) ─── */}
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Main 1: Gift Cards */}
          <button
            type="button"
            onClick={() => setActiveTab('gift_cards')}
            className={`p-3 sm:p-4 rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'gift_cards'
                ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                : 'bg-white border-slate-200/80 text-slate-700 hover:border-amber-300 hover:bg-amber-50/40 shadow-2xs'
              }`}
          >
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${activeTab === 'gift_cards' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-600'
              }`}>
              <Gift className="w-5 h-5" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold tracking-tight line-clamp-1">Gift Cards</span>
          </button>

          {/* Main 2: Referral Rewards */}
          <button
            type="button"
            onClick={() => setActiveTab('referrals')}
            className={`p-3 sm:p-4 rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'referrals'
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/20'
                : 'bg-white border-slate-200/80 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40 shadow-2xs'
              }`}
          >
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${activeTab === 'referrals' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'
              }`}>
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold tracking-tight line-clamp-1">Refer &amp; Earn</span>
          </button>

          {/* Main 3: Vehicle Offers (Opens Dedicated /offers Page) */}
          <button
            type="button"
            onClick={() => window.open('/offers', '_blank')}
            className="p-3 sm:p-4 rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-white border-slate-200/80 text-slate-700 hover:border-rose-300 hover:bg-rose-50/40 shadow-2xs group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 group-hover:scale-105 transition-transform">
              <Flame className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] sm:text-xs font-bold tracking-tight line-clamp-1">Brand Offers</span>
              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-rose-600" />
            </div>
          </button>

          {/* Main 4: Silver, Gold, Platinum Benefits */}
          <button
            type="button"
            onClick={() => setActiveTab('benefits')}
            className={`p-3 sm:p-4 rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'benefits'
                ? 'bg-purple-600 text-white border-purple-700 shadow-md shadow-purple-600/20'
                : 'bg-white border-slate-200/80 text-slate-700 hover:border-purple-300 hover:bg-purple-50/40 shadow-2xs'
              }`}
          >
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${activeTab === 'benefits' ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-600'
              }`}>
              <Award className="w-5 h-5" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold tracking-tight line-clamp-1">Tier Benefits</span>
          </button>
        </div>

        {/* ─── 5. SECONDARY PILL BAR (Transactions, Garage, KYC, Home) ─────── */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 overflow-x-auto scrollbar-none gap-2">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'home', label: 'Overview', icon: Home },
              { id: 'transactions', label: 'Transactions', icon: Clock },
              { id: 'garage', label: 'My Vehicles', icon: Car },
              { id: 'kyc', label: 'KYC Correction', icon: ShieldCheck },
            ].map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab === 'referrals' ? (
            <a
              href={whatsappReferralUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Send Referral on WhatsApp</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setSendGiftModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Send e-Gift</span>
            </button>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: OVERVIEW / HOME VIEW                                         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Earning Privileges Card (from Reference Image) */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Current Earning Privileges</h3>
                  <p className="text-xs text-slate-500">Active benefits locked to your {currentTier} VIP tier</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('benefits')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  View All Tiers <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Workshop Service</span>
                  <p className="text-base font-black text-emerald-700 font-mono">4% Net Bill</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Vehicle Sales</span>
                  <p className="text-base font-black text-purple-700 font-mono">1% Ex-Showroom</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Accessories</span>
                  <p className="text-base font-black text-blue-700 font-mono">2% Counter</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Bodyshop Repair</span>
                  <p className="text-base font-black text-amber-700 font-mono">3% Cust Share</p>
                </div>
              </div>
            </div>

            {/* Monthly Offers Redirection Banner (Dedicated External Page) */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-indigo-900/50 shadow-lg">
              <div className="absolute -right-12 -bottom-12 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase font-mono">
                    <Sparkles className="w-3 h-3 text-amber-400" /> Live Monthly Dealership Schemes
                  </div>
                  <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                    Explore Brand Offers: Tata, MG, Hero &amp; Ather
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Check out model-specific exchange bonuses up to ₹1,35,000, EV charging perks, low-interest finance, and workshop detailing discounts across Hubli, Belgaum, Dharwad &amp; Bangalore.
                  </p>
                </div>

                <a
                  href="/offers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm transition-all transform hover:scale-[1.02] shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer"
                >
                  <span>Explore Monthly Offers</span>
                  <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                </a>
              </div>
            </div>

            {/* Recent Activity Snippet */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Recent Transactions</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('transactions')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  Full History <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {ledgerItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No recent points activity found. Points earn automatically during vehicle billing.
                </div>
              ) : (
                <div className="space-y-2">
                  {ledgerItems.slice(0, 3).map((item, idx) => (
                    <LedgerRow key={item.id || idx} item={item} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: GIFT CARDS & VOUCHERS (Main 1)                               */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'gift_cards' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Gift Card Rewards &amp; Vouchers</h2>
                  <p className="text-xs text-slate-500">
                    Send e-gift passes to friends or present active vouchers at Bellad dealerships.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSendGiftModalOpen(true)}
                  className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Gift className="w-4 h-4" />
                  <span>Send Gift to Friend</span>
                </button>
              </div>

              {/* Sendable Points & Cash Value Showcase */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border border-amber-300 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 font-mono block">
                      Loyalty Value Available to Send as Gifts
                    </span>
                    <div className="flex flex-wrap items-baseline gap-2 mt-1">
                      <span className="text-3xl sm:text-4xl font-black font-mono text-slate-900">
                        {Number(currentBalance).toLocaleString('en-IN')}
                      </span>
                      <span className="text-sm font-bold text-amber-700 font-mono">PTS</span>
                      <span className="text-sm font-bold text-slate-600">
                        (≈ ₹{cashValue} Cash Value)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      You can create instant e-gift cards for friends &amp; family directly from your loyalty points without paying cash! (4 PTS = ₹1).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSendGiftModalOpen(true)}
                    className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <Gift className="w-4 h-4" />
                    <span>Create &amp; Send Gift Voucher</span>
                  </button>
                </div>

                {/* Quick Points Preset Tiers */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-amber-200/60">
                  <button
                    type="button"
                    onClick={() => setSendGiftModalOpen(true)}
                    className="p-3 rounded-2xl bg-white border border-amber-200 hover:border-amber-400 text-left transition hover:shadow-xs cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-amber-700 block font-mono">1,000 PTS</span>
                    <span className="text-xs font-black text-slate-900 block mt-0.5">₹250 Gift Voucher</span>
                    <span className="text-[10px] text-slate-400">Tap to create</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendGiftModalOpen(true)}
                    className="p-3 rounded-2xl bg-white border border-amber-200 hover:border-amber-400 text-left transition hover:shadow-xs cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-amber-700 block font-mono">2,000 PTS</span>
                    <span className="text-xs font-black text-slate-900 block mt-0.5">₹500 Gift Voucher</span>
                    <span className="text-[10px] text-slate-400">Tap to create</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendGiftModalOpen(true)}
                    className="p-3 rounded-2xl bg-white border border-amber-200 hover:border-amber-400 text-left transition hover:shadow-xs cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-amber-700 block font-mono">4,000 PTS</span>
                    <span className="text-xs font-black text-slate-900 block mt-0.5">₹1,000 Gift Voucher</span>
                    <span className="text-[10px] text-slate-400">Tap to create</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendGiftModalOpen(true)}
                    className="p-3 rounded-2xl bg-white border border-amber-200 hover:border-amber-400 text-left transition hover:shadow-xs cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-amber-700 block font-mono">Custom Amount</span>
                    <span className="text-xs font-black text-slate-900 block mt-0.5">Up to ₹{cashValue}</span>
                    <span className="text-[10px] text-slate-400">Any multiple of 4 pts</span>
                  </button>
                </div>
              </div>

              {/* My Available Gift Vouchers */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Your Received / Created Gift Vouchers ({myGiftCards.length})
                  </h4>
                  {myGiftCards.length > 0 && (
                    <span className="text-[11px] text-slate-400 font-medium">Ready to claim or share</span>
                  )}
                </div>

                {loadingGiftCards ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading gift cards...</div>
                ) : myGiftCards.length === 0 ? (
                  <div className="p-6 text-center space-y-1.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                    <Gift className="w-7 h-7 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">No active gift vouchers on file</p>
                    <p className="text-[11px] text-slate-500">
                      When someone sends you a gift pass or you generate one with your points above, it will be listed here with its claim code.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {myGiftCards.map((card) => {
                      const isRevealed = revealedPins[card.card_id];
                      return (
                        <div key={card.card_id} className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/50 to-white border border-amber-200/80 shadow-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-slate-900">{card.card_number}</span>
                            <span className="font-black text-amber-700 text-sm">₹{Number(card.balance_amount).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>PIN: {isRevealed ? <strong className="font-mono text-slate-900">{card.pin_code}</strong> : '••••'}</span>
                            <button
                              type="button"
                              onClick={() => togglePinReveal(card.card_id)}
                              className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                            >
                              {isRevealed ? 'Hide PIN' : 'Show PIN'}
                            </button>
                          </div>
                          <div className="pt-2 border-t border-amber-100 flex items-center justify-between text-[10px] text-slate-400">
                            <span className="capitalize font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                              {card.status || 'Active'}
                            </span>
                            <span>Redeem at Dealership Billing Desk</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: REFERRAL REWARDS (Main 2)                                    */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'referrals' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Refer &amp; Earn Rewards</h2>
                  <p className="text-xs text-slate-500">
                    Invite friends to Bellad &amp; Co dealerships. Both you and your friend receive 2,500 bonus points (₹625 Value) when they purchase a vehicle!
                  </p>
                </div>
              </div>

              {/* 3 Metric Cards: Locked Points, Ready to Claim, Credited */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Locked Points Card */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                        Locked Points
                      </span>
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-amber-950 mt-1">
                      +{(referralsSummary.locked_points || 0).toLocaleString()} <span className="text-xs font-bold text-amber-800">PTS</span>
                    </div>
                    <p className="text-[11px] font-bold text-amber-700">
                      ₹{(referralsSummary.locked_value_inr || 0).toLocaleString()} Pending Value
                    </p>
                  </div>
                  <p className="text-[10px] text-amber-700/90 mt-2.5 pt-2 border-t border-amber-200/60 leading-tight">
                    Locked on both accounts until friend completes vehicle purchase &amp; PR at Bellad.
                  </p>
                </div>

                {/* 2. Ready to Claim Card */}
                <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
                  (referralsSummary.ready_to_claim_count || 0) > 0
                    ? 'bg-emerald-50 border-emerald-300 shadow-xs ring-2 ring-emerald-500/20'
                    : 'bg-slate-50/80 border-slate-200'
                }`}>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${
                        (referralsSummary.ready_to_claim_count || 0) > 0 ? 'text-emerald-800' : 'text-slate-600'
                      }`}>
                        Ready to Claim
                      </span>
                      <Sparkles className={`w-3.5 h-3.5 ${
                        (referralsSummary.ready_to_claim_count || 0) > 0 ? 'text-emerald-600 animate-spin' : 'text-slate-400'
                      }`} />
                    </div>
                    <div className={`text-xl sm:text-2xl font-black mt-1 ${
                      (referralsSummary.ready_to_claim_count || 0) > 0 ? 'text-emerald-950' : 'text-slate-900'
                    }`}>
                      {(referralsSummary.ready_to_claim_points || 0).toLocaleString()} <span className="text-xs font-bold text-slate-500">PTS</span>
                    </div>
                    <p className={`text-[11px] font-bold ${
                      (referralsSummary.ready_to_claim_count || 0) > 0 ? 'text-emerald-700' : 'text-slate-500'
                    }`}>
                      {referralsSummary.ready_to_claim_count || 0} referral(s) verified &amp; ready
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2.5 pt-2 border-t border-slate-200/70 leading-tight">
                    {(referralsSummary.ready_to_claim_count || 0) > 0
                      ? 'Vehicle purchase verified! Click Claim below to add points.'
                      : 'Unlocks as soon as friend vehicle delivery is verified.'}
                  </p>
                </div>

                {/* 3. Total Credited in Wallet Card */}
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800">
                        Credited in Wallet
                      </span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-indigo-950 mt-1">
                      {(referralsSummary.total_earned_referral_points || 0).toLocaleString()} <span className="text-xs font-bold text-indigo-800">PTS</span>
                    </div>
                    <p className="text-[11px] font-bold text-indigo-700">
                      ₹{(referralsSummary.total_earned_value_inr || 0).toLocaleString()} Total Earned
                    </p>
                  </div>
                  <p className="text-[10px] text-indigo-700/90 mt-2.5 pt-2 border-t border-indigo-200/60 leading-tight">
                    Active in your wallet balance. Usable for Service, Body Shop, and Accessories.
                  </p>
                </div>
              </div>

              {/* WhatsApp Direct Share Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#25D366] text-white">
                      <Share2 className="w-3.5 h-3.5" />
                    </span>
                    <h4 className="text-xs font-black text-slate-900">Send Referral Directly via WhatsApp</h4>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Share your invite link with friends. When they register and purchase a vehicle from our Bellad dealerships, you both get 2,500 points!
                  </p>
                </div>
                <a
                  href={whatsappReferralUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition shrink-0 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share on WhatsApp</span>
                </a>
              </div>

              {/* Dealership Policy Rule Reminder */}
              <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Vehicle Purchase &amp; PR Verification Rule:
                </div>
                <p className="text-[11px] leading-relaxed">
                  Both accounts will see <strong>+2,500 PTS (₹625 Value)</strong> in locked status. Points cannot be claimed or spent until your friend completes their vehicle purchase and Permanent Registration (PR) at Bellad dealerships. Once verified, tap <strong>Claim Points</strong> to credit the bonus directly into your loyalty wallet.
                </p>
              </div>

              {/* Share Referral Link Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                <span className="text-xs font-bold text-slate-700 block">Your Exclusive Referral Link:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={referralLink}
                    className="flex-1 px-3.5 py-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-mono text-slate-700 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyReferral}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Referrals Status List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Your Referral Pipeline ({referralsList.length})
                  </h4>
                  <button
                    type="button"
                    onClick={loadReferrals}
                    className="text-[11px] text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingReferrals ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </div>

                {loadingReferrals ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading referrals...</div>
                ) : referralsList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-100">
                    No referrals registered yet. Share your referral link above!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {referralsList.map((ref, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          ref.can_claim
                            ? 'bg-gradient-to-r from-emerald-50/90 to-teal-50/90 border-emerald-300 shadow-sm'
                            : ref.is_claimed
                            ? 'bg-white border-slate-200'
                            : 'bg-white border-amber-200/80'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">
                              {ref.friend_name || 'Friend'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ref.role === 'referee'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {ref.role_label || 'Friend Referral'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                            {ref.friend_phone && <span>Mobile: {ref.friend_phone}</span>}
                            <span>&bull;</span>
                            <span>Vehicle: {ref.vehicle_model || 'Automobile'}</span>
                            {ref.created_at && (
                              <>
                                <span>&bull;</span>
                                <span>{new Date(ref.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                              </>
                            )}
                          </div>

                          {/* Status Description */}
                          <p className="text-[11px] text-slate-600">
                            {ref.status_label || (ref.is_claimed ? 'Points Credited in Wallet' : 'Pending Purchase & PR')}
                          </p>
                        </div>

                        {/* Right Section: Status Pill or Claim Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          {ref.can_claim && ref.referral_id ? (
                            <button
                              type="button"
                              onClick={() => handleClaimReferral(ref.referral_id)}
                              disabled={claimingReferralId === ref.referral_id}
                              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {claimingReferralId === ref.referral_id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Claiming...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Claim 2,500 PTS (₹625)</span>
                                </>
                              )}
                            </button>
                          ) : ref.is_claimed ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>+2,500 PTS in Wallet</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                              <Lock className="w-3.5 h-3.5 text-amber-600" />
                              <span>2,500 PTS Locked</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: VEHICLE & SERVICE OFFERS (Redirects to Dedicated Offers Page) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'offers' && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-sm text-center max-w-2xl mx-auto space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
              <Flame className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Official Monthly Dealership Offers
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Interactive Brand Offers Portal
              </h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                All monthly discounts, exchange bonuses, and festive schemes for <strong>Tata, MG Motors, Hero MotoCorp, and Ather Energy</strong> are hosted on our dedicated showroom offers portal with live branch and model filters.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="/offers"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2"
              >
                <span>Launch Offers Portal</span>
                <ExternalLink className="w-4 h-4 stroke-[2.5]" />
              </a>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl transition"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 5: SILVER, GOLD, PLATINUM TIER BENEFITS (Main 4)                */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'benefits' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-900">Member Tiers &amp; Privileges</h2>
                <p className="text-xs text-slate-500">
                  Review the benefits for Silver, Gold, and Platinum VIP members. Higher tiers unlock up to 6% cashback on workshop bills and VIP perks.
                </p>
              </div>

              {/* Progress Card to Next Tier */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-300" />
                    <span className="font-bold text-sm">Your Status: {currentTier} VIP</span>
                  </div>
                  <span className="text-xs font-mono text-indigo-200">
                    {lifetimePoints.toLocaleString('en-IN')} Lifetime PTS
                  </span>
                </div>

                <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700"
                    style={{ width: `${tierProgress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Progress to {nextTier}</span>
                  <span className="font-bold text-amber-300">
                    {pointsToLevelUp > 0 ? `${pointsToLevelUp.toLocaleString('en-IN')} PTS needed` : 'Maximum Tier Unlocked!'}
                  </span>
                </div>
              </div>

              {/* 3 Tier Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {TIER_BENEFITS_DATA.map((t) => {
                  const isCurrent = currentTier.toLowerCase() === t.tier.toLowerCase();
                  return (
                    <div
                      key={t.tier}
                      className={`rounded-3xl border p-5 sm:p-6 space-y-4 flex flex-col justify-between transition relative ${isCurrent
                          ? 'border-amber-400 shadow-md bg-amber-50/20 ring-2 ring-amber-400/30'
                          : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                        }`}
                    >
                      {isCurrent && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider font-mono shadow-xs">
                          Your Active Tier
                        </span>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-black text-slate-900 text-base">{t.label}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${t.badgeColor}`}>
                            {t.tier === 'Platinum' ? '15K+ PTS' : t.tier === 'Gold' ? '5K - 15K' : '0 - 5K'}
                          </span>
                        </div>

                        {/* Earning Rates Table */}
                        <div className="space-y-1.5 pt-1 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-500">Workshop Service:</span>
                            <span className="font-bold text-emerald-700">{t.serviceEarn}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-500">Accessories:</span>
                            <span className="font-bold text-blue-700">{t.accessoryEarn}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-500">Vehicle Sales:</span>
                            <span className="font-bold text-purple-700">{t.salesEarn}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-500">Bodyshop Repair:</span>
                            <span className="font-bold text-amber-700">{t.bodyshopDiscount}</span>
                          </div>
                        </div>

                        {/* Perks List */}
                        <div className="space-y-1.5 pt-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                            Included Privileges:
                          </span>
                          {t.perks.map((p, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{p}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 6: ACTIVITY / TRANSACTIONS                                      */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Activity &amp; Points Ledger</h2>
                  <p className="text-xs text-slate-500">Complete record of points earned and redeemed across all Bellad dealership branches</p>
                </div>
                <button
                  type="button"
                  onClick={() => loadLedger()}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                  title="Refresh activity"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {loadingLedger ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading activity...</div>
              ) : ledgerItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No transactions recorded yet.</div>
              ) : (
                <div className="space-y-2.5">
                  {ledgerItems.map((item, idx) => (
                    <LedgerRow key={item.id || idx} item={item} />
                  ))}

                  {nextCursor && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => loadLedger(nextCursor)}
                        disabled={loadingMore}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition disabled:opacity-50"
                      >
                        {loadingMore ? 'Loading older entries...' : 'Load More Transactions'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 7: GARAGE / VEHICLES                                            */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'garage' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">Registered Vehicles</h2>
                <p className="text-xs text-slate-500">Vehicles linked to your customer ID in Bellad dealership system</p>
              </div>

              {!profile?.vehicles || profile.vehicles.length === 0 ? (
                <div className="p-8 text-center space-y-2 bg-slate-50 rounded-2xl border border-slate-100">
                  <Car className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">Primary Vehicle: {primaryVehicle}</p>
                  <p className="text-[11px] text-slate-500">
                    To link a new chassis number or registration number, visit your nearest Bellad service desk.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profile.vehicles.map((v, i) => (
                    <div key={v.vehicle_id || i} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{v.brand_name || 'Tata'} {v.model || 'Vehicle'}</span>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                          {v.registration_number || v.vin || 'PR Verified'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <p>Chassis: <span className="font-mono">{v.chassis_no || '—'}</span></p>
                        <p>Purchase Date: {v.purchase_date ? new Date(v.purchase_date).toLocaleDateString('en-IN') : 'Verified'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 8: KYC CORRECTION                                               */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'kyc' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-900">KYC Profile &amp; Phone Correction</h2>
                <p className="text-xs text-slate-500">
                  Submit requests to update your registered mobile phone number. All KYC changes are reviewed and approved by the Accounts Head.
                </p>
              </div>

              {kycFormError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{kycFormError}</span>
                </div>
              )}

              {kycFormSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{kycFormSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSubmitKycForm} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New 10-Digit Mobile Phone Number
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={kycNewPhone}
                    onChange={(e) => setKycNewPhone(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reason for Mobile / KYC Update
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Changed primary SIM card / Lost previous number"
                    value={kycReason}
                    onChange={(e) => setKycReason(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Upload Identity Proof (Aadhaar / Driving License / PAN)
                  </label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setKycIdProofFile(e.target.files?.[0] || null)}
                    required
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  />
                </div>

                {/* 2FA on Current Number */}
                <div className="pt-2 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">2FA Verification via Current Phone</span>
                    <button
                      type="button"
                      onClick={handleRequestKycOtp}
                      disabled={isRequestingKycOtp}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                    >
                      {isRequestingKycOtp ? 'Sending code...' : kycOtpSent ? 'Resend OTP' : 'Request OTP'}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter 6-digit verification code"
                    maxLength={6}
                    value={kycOtp}
                    onChange={(e) => setKycOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingKyc}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition shadow-xs disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingKyc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Submit KYC Request to Accounts Head'}
                </button>
              </form>

              {/* KYC Request History */}
              {kycRequests.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Past KYC Correction Requests
                  </h4>
                  <div className="space-y-2">
                    {kycRequests.map((req) => (
                      <div key={req.request_id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900 block">Requested Phone: {req.new_value}</span>
                          <span className="text-[11px] text-slate-500">Reason: {req.reason}</span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${req.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : req.status === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                          {req.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* ─── 6. Fullscreen QR Code Scanning Modal ─────────────────────────── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 pt-2">
              <h3 className="text-base font-black text-slate-900">{fullName}</h3>
              <p className="text-xs text-slate-500">Member ID: <span className="font-mono font-bold text-slate-800">{customerId}</span></p>
            </div>

            {/* Enlarged QR Code Box */}
            <div className="w-56 h-56 mx-auto bg-slate-900 rounded-3xl p-4 flex items-center justify-center shadow-lg border-4 border-amber-400">
              <QrCode className="w-44 h-44 text-white" />
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 font-bold space-y-0.5">
              <p>Balance: {Number(currentBalance).toLocaleString('en-IN')} PTS</p>
              <p className="text-[11px] text-amber-700 font-normal">Present this QR code to cashier desk for instant bill deduction</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── 7. Send e-Gift Modal ─────────────────────────────────────────── */}
      <SendGiftModal
        isOpen={sendGiftModalOpen}
        onClose={() => setSendGiftModalOpen(false)}
        customer={profile || customerInfo}
        currentBalance={currentBalance}
        onGiftSent={() => {
          loadProfile();
          loadLedger();
          loadGiftCards();
          setSuccessMsg('Gift card generated and points debited! Share the WhatsApp claim link with your recipient.');
        }}
      />

      {/* ─── 8. Minimal Clean Footer ──────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200/80 py-4 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Bellad &amp; Company. Hubballi &bull; Belagavi &bull; Vijayapura</p>
      </footer>
    </div>
  );
}
