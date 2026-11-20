import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { isFeatureEnabled } from '../../config/versionConfig';
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
  MapPin,
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
    salesEarn: '1% Ex-Showroom (Eligible Base)',
    bodyshopDiscount: 'Standard Rates',
    perks: [
      'Earn points on every periodic service (2% Net Bill)',
      'Digital WhatsApp Wallet Pass',
      'Free 40-point vehicle seasonal health check',
      'Digital e-gift card sharing access',
    ],
    nextTierTeaser: 'Gold VIP unlocks 4% service cashback (2x Silver), priority bay booking & 500 bonus referral pts.',
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
    salesEarn: '1% Ex-Showroom (Eligible Base)',
    bodyshopDiscount: '3% Customer Share Discount',
    perks: [
      'Double points on periodic workshop service (4% Net Bill)',
      'Priority workshop service bay booking',
      '500 Bonus Points on every successful friend referral',
      'Complimentary exterior wash during periodic maintenance',
      'Dedicated Service Advisor support',
    ],
    nextTierTeaser: 'Platinum VIP unlocks maximum 6% cashback, free doorstep pickup & drop, and VIP GM Desk.',
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
    salesEarn: '1% Ex-Showroom (Eligible Base)',
    bodyshopDiscount: '5% Customer Share Discount',
    perks: [
      'Maximum 6% cashback points on workshop bills',
      'Free doorstep vehicle pickup and drop for service',
      'VIP Concierge & Direct Dealership General Manager desk access',
      '1,000 Bonus Points on friend vehicle referrals',
      'Free annual wheel balancing and alignment check',
      'Exclusive invitations to new model launch drive previews',
    ],
    nextTierTeaser: 'Top VIP Status Achieved! Enjoy maximum 6% cashback and executive concierge.',
  },
];

// Loading Skeleton for Digital Pass
const PassSkeleton = () => (
  <div className="rounded-3xl bg-slate-200/80 p-6 sm:p-7 animate-pulse space-y-4">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-3 w-28 bg-slate-300 rounded" />
        <div className="h-7 w-48 bg-slate-300 rounded-lg" />
        <div className="h-4 w-36 bg-slate-300 rounded" />
      </div>
      <div className="w-12 h-12 rounded-2xl bg-slate-300" />
    </div>
    <div className="pt-3 border-t border-slate-300/60 flex items-center justify-between">
      <div className="space-y-1">
        <div className="h-3 w-32 bg-slate-300 rounded" />
        <div className="h-8 w-24 bg-slate-300 rounded-lg" />
      </div>
      <div className="h-8 w-40 bg-slate-300 rounded-xl" />
    </div>
  </div>
);

// Memoized Ledger Row
const LedgerRow = memo(({ item }) => {
  const isPositive = (item.points || 0) >= 0;
  const isBonus = Boolean(item.is_bonus || item.source_type === 'CAMPAIGN' || item.type === 'campaign_bonus');
  const formattedPoints = isPositive
    ? `+${(item.points || 0).toLocaleString('en-IN')}`
    : `${(item.points || 0).toLocaleString('en-IN')}`;

  return (
    <div className={`flex items-center justify-between py-2.5 sm:py-3.5 px-3 sm:px-4 bg-white border rounded-xl sm:rounded-2xl hover:border-slate-300 transition shadow-2xs gap-2.5 sm:gap-3 ${
      isBonus ? 'border-amber-200/80 bg-gradient-to-r from-amber-50/20 to-white' : 'border-slate-100'
    }`}>
      <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0 pr-1 flex-1">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${
          isBonus
            ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
            : (isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')
        }`}>
          {isBonus ? <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" /> : (isPositive ? <Coins className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight leading-snug break-words">{item.text}</p>
            {isBonus && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                Bonus
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5 text-[10px] sm:text-[11px] text-slate-400 font-medium">
            <span className="whitespace-nowrap">{item.date}</span>
            {item.amount && (
              <>
                <span className="shrink-0">•</span>
                <span className="font-mono text-slate-600 whitespace-nowrap">Bill: ₹{Number(item.amount).toLocaleString('en-IN')}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <span
          className={`text-[11px] sm:text-xs font-bold font-mono px-2 sm:px-3 py-0.5 sm:py-1 rounded-full whitespace-nowrap inline-block ${
            isBonus
              ? 'bg-amber-50 text-amber-800 border border-amber-300'
              : (isPositive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200')
          }`}
        >
          {formattedPoints} PTS
        </span>
      </div>
    </div>
  );
});

LedgerRow.displayName = 'LedgerRow';

export default function PortalDashboardScreen({ customerInfo, onSignOut, portalVersion }) {
  const effectiveVersion = portalVersion || (
    window.location.pathname.includes('v2') || window.location.pathname.includes('portalv2') ? 'v2' : 'v1'
  );
  const isV2 = effectiveVersion === 'v2';
  const showFeature = (feature) => {
    if (isV2) return true;
    return false; // In V1, giftcards and referrals are hidden
  };

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
  const [copiedMemberId, setCopiedMemberId] = useState(false);
  const [copiedCard, setCopiedCard] = useState('');
  const [copiedOffer, setCopiedOffer] = useState('');
  const [showCashInfoModal, setShowCashInfoModal] = useState(false);
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsModalType, setTermsModalType] = useState('terms'); // 'terms' | 'privacy' | 'policy'
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [sendGiftModalOpen, setSendGiftModalOpen] = useState(false);
  const [selectedGiftAmount, setSelectedGiftAmount] = useState(1000);

  // Gift Cards State
  const [myGiftCards, setMyGiftCards] = useState([]);
  const [loadingGiftCards, setLoadingGiftCards] = useState(false);
  const [revealedPins, setRevealedPins] = useState({});

  // Referrals State
  const [referralsList, setReferralsList] = useState([]);
  const [portalReferralCode, setPortalReferralCode] = useState('');
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);
  const [copiedRefCode, setCopiedRefCode] = useState(false);
  const [friendNameInput, setFriendNameInput] = useState('');
  const [friendPhoneInput, setFriendPhoneInput] = useState('');
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

  const loadReferrals = useCallback(async (targetCustId = null) => {
    try {
      setLoadingReferrals(true);
      const activeCustId = targetCustId || profile?.customer_id || customerInfo?.customer_id || 'BAC-9821';
      const res = await ApiService.portalGetReferrals(activeCustId);
      setReferralsList(res.referrals || []);
      if (res.referral_code) {
        setPortalReferralCode(res.referral_code);
      }
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

  const activeReferralCode = portalReferralCode || profile?.referralCode || `REF-BELL-${customerId.replace(/\D/g, '').slice(-4).padStart(4, '8')}-9000`;

  const referralLink = `${window.location.origin}/portal?ref=${activeReferralCode}`;

  const whatsappReferralText = encodeURIComponent(
    `🎁 *Bellad & Company Loyalty Referral Rewards*\n\nHey! Use my referral code *${activeReferralCode}* when booking your new vehicle or workshop service at Bellad & Co dealerships. We will BOTH receive bonus reward points in our loyalty wallets!\n\n👉 Claim & register here:\n${referralLink}`
  );
  const whatsappReferralUrl = `https://wa.me/?text=${whatsappReferralText}`;

  const handleCopyMemberId = () => {
    if (!customerId) return;
    navigator.clipboard.writeText(customerId);
    setCopiedMemberId(true);
    setTimeout(() => setCopiedMemberId(false), 2000);
  };

  const handleCopyReferral = async () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);

    // Auto-record share event in database so referral tab and admin audit update immediately
    try {
      const res = await ApiService.portalShareReferral({
        customer_id: customerId,
        referee_name: friendNameInput.trim() || 'Friend Referral (Link Shared)',
        referee_phone: friendPhoneInput.trim() || undefined,
        share_channel: 'link_copy',
        referral_code: activeReferralCode,
      });
      if (res?.referral_code) {
        setPortalReferralCode(res.referral_code);
      }
      setSuccessMsg(`Referral link copied! Share logged in your referral reward tab.`);
      await loadReferrals();
    } catch (err) {
      console.warn('Could not auto-log referral copy:', err);
    }
  };

  const handleCopyRefCode = async (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedRefCode(true);
    setTimeout(() => setCopiedRefCode(false), 2000);

    // Auto-record share event in database so referral tab and admin audit update immediately
    try {
      const res = await ApiService.portalShareReferral({
        customer_id: customerId,
        referee_name: friendNameInput.trim() || 'Friend Referral (Code Shared)',
        referee_phone: friendPhoneInput.trim() || undefined,
        share_channel: 'code_copy',
        referral_code: code || activeReferralCode,
      });
      if (res?.referral_code) {
        setPortalReferralCode(res.referral_code);
      }
      setSuccessMsg(`Referral code copied! Share logged in your referral reward tab.`);
      await loadReferrals();
    } catch (err) {
      console.warn('Could not auto-log code copy:', err);
    }
  };

  const handleShareWhatsApp = async () => {
    if (sharingWhatsApp) return;
    setSharingWhatsApp(true);
    try {
      const res = await ApiService.portalShareReferral({
        customer_id: customerId,
        referee_name: friendNameInput.trim() || undefined,
        referee_phone: friendPhoneInput.trim() || undefined,
        share_channel: 'whatsapp',
        referral_code: activeReferralCode,
      });
      if (res.referral_code) {
        setPortalReferralCode(res.referral_code);
      }
      setSuccessMsg(`Referral code ${res.referral_code || activeReferralCode} tracked & logged! WhatsApp opened.`);
      await loadReferrals();
      if (res.whatsapp_url) {
        window.open(res.whatsapp_url, '_blank', 'noopener,noreferrer');
      } else {
        window.open(whatsappReferralUrl, '_blank', 'noopener,noreferrer');
      }
      setFriendNameInput('');
      setFriendPhoneInput('');
    } catch (err) {
      console.error('Error logging WhatsApp share:', err);
      window.open(whatsappReferralUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setSharingWhatsApp(false);
    }
  };

  const handleSendReferralWhatsAppApi = async () => {
    if (!friendPhoneInput.trim()) {
      setError('Please enter your friend’s WhatsApp phone number to send the official invitation.');
      return;
    }
    setSharingWhatsApp(true);
    try {
      const res = await ApiService.portalShareReferral({
        customer_id: customerId,
        referee_name: friendNameInput.trim() || 'Friend',
        referee_phone: friendPhoneInput.trim(),
        share_channel: 'whatsapp_api',
        referral_code: activeReferralCode,
        send_via_api: true,
      });
      if (res?.referral_code) {
        setPortalReferralCode(res.referral_code);
      }
      setSuccessMsg(`Official WhatsApp invitation sent to ${friendPhoneInput.trim()}! Code: ${res?.referral_code || activeReferralCode}`);
      await loadReferrals();
      setFriendNameInput('');
      setFriendPhoneInput('');
    } catch (err) {
      console.error('Error dispatching WhatsApp API referral:', err);
      setError(err.message || 'Failed to dispatch WhatsApp API invitation.');
    } finally {
      setSharingWhatsApp(false);
    }
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
  const currentBalance = profile?.balance ?? profile?.points ?? customerInfo?.points ?? customerInfo?.balance ?? 1020;
  const cashValue = (currentBalance * 0.25).toFixed(2);
  const currentTier = profile?.tier?.current || customerInfo?.tier || 'Silver';
  const tierConfig = TIER_BENEFITS_DATA.find((t) => t.tier.toLowerCase() === currentTier.toLowerCase()) || TIER_BENEFITS_DATA[0];
  const nextTierConfig = currentTier.toLowerCase() === 'silver'
    ? TIER_BENEFITS_DATA[1]
    : currentTier.toLowerCase() === 'gold'
      ? TIER_BENEFITS_DATA[2]
      : null;
  const nextTier = nextTierConfig ? nextTierConfig.tier : 'Gold';
  const nextTierPoints = nextTierConfig ? nextTierConfig.minPoints : 5000;
  const lifetimePoints = profile?.lifetime_points || customerInfo?.lifetime_points || currentBalance;
  const pointsToLevelUp = Math.max(0, nextTierPoints - lifetimePoints);
  const currentTierBasePoints = tierConfig.minPoints;
  const tierRange = nextTierPoints - currentTierBasePoints;
  const pointsInRange = Math.max(0, lifetimePoints - currentTierBasePoints);
  const tierProgress = nextTierConfig ? Math.min(100, Math.max(5, Math.round((pointsInRange / (tierRange || 1)) * 100))) : 100;

  // Filtered Offers
  const filteredOffers = useMemo(() => {
    if (selectedOfferCategory === 'all') return offersList;
    return offersList.filter((o) => o.category === selectedOfferCategory);
  }, [offersList, selectedOfferCategory]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-sans selection:bg-amber-400 selection:text-slate-950">

      {/* ─── 1. Top Brand Navigation Bar ──────────────────────────────────── */}
      <header className="bg-indigo-600 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-1 flex items-center justify-center shrink-0">
              <img src="/bellad-logo.png" alt="Bellad Logo" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-lg font-black tracking-tight text-white block leading-tight truncate">
                Bellad &amp; Co Loyalty Pass
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-indigo-200 block truncate">
                Karnataka&apos;s Premier Automotive Rewards
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Version Badge & Switcher for Director Showcase */}
            {isV2 ? (
              <a
                href="/portal"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-xs transition"
                title="Switch to Portal v1 (Core Passbook only, no Gift Cards or Referrals)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />
                <span>v2 (Full) ➔ v1</span>
              </a>
            ) : (
              <a
                href="/portalv2"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 hover:bg-white/30 transition"
                title="Switch to Portal v2 (Showcases Gift Cards & Referrals)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>v1 (Core) ➔ v2</span>
              </a>
            )}

            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-black uppercase tracking-wider px-2 sm:px-3 py-1 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-sm whitespace-nowrap">
              <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300 shrink-0" aria-hidden="true" />
              <span>{currentTier} VIP</span>
            </span>

            <button
              onClick={onSignOut}
              title="Sign Out"
              aria-label="Sign out of Bellad Loyalty Pass"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              <span className="sr-only">Sign Out</span>
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

        {/* ─── 3. DIGITAL MEMBER PASS (LUXURY WALLET CARD) ─── */}
        {loadingProfile ? (
          <PassSkeleton />
        ) : (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white p-6 sm:p-7 shadow-xl shadow-amber-600/25 border border-amber-400/40">
            {/* Subtle Ambient Radial Highlight */}
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16" />

            <div className="relative z-10 space-y-4">
              {/* Top Pass Row */}
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-widest text-amber-100/90 font-mono">
                      Digital Member Pass
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/25">
                      {currentTier} VIP
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5 truncate">
                    {fullName}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs text-amber-100 font-medium">ID:</span>
                    <span className="font-mono font-black text-xs sm:text-sm tracking-wider text-white bg-black/20 px-2.5 py-0.5 rounded-lg border border-white/20">
                      {customerId}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyMemberId}
                      className="px-2 py-0.5 rounded-md bg-white/20 hover:bg-white/30 text-white transition cursor-pointer flex items-center gap-1 text-[11px]"
                      title="Copy Member ID"
                      aria-label="Copy Member ID to clipboard"
                    >
                      {copiedMemberId ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                          <span className="text-emerald-200 font-bold text-[10px]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          <span className="text-[10px] text-amber-100">Copy</span>
                        </>
                      )}
                    </button>
                    <span className="text-amber-200/80">&bull;</span>
                    <span className="text-xs text-amber-100 font-medium truncate">{primaryVehicle}</span>
                  </div>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-sm shrink-0">
                  <Crown className="w-6 h-6 text-amber-200" aria-hidden="true" />
                </div>
              </div>

              {/* Bottom Row: Usable Points Balance, Expiry & Redeem Action */}
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
                  {/* Points Expiry Notification */}
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-amber-100/90 font-medium">
                    <Clock className="w-3 h-3 text-amber-300 shrink-0" aria-hidden="true" />
                    <span>Validity: <strong>No Expiry</strong> (Lifetime Active)</span>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2 self-start sm:self-auto">
                  {/* Cash Value Pill with Info Tooltip */}
                  <button
                    type="button"
                    onClick={() => setShowCashInfoModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-xs font-bold text-white transition cursor-pointer"
                    title="Click for conversion rules"
                    aria-label="View points cash conversion value and rules"
                  >
                    <IndianRupee className="w-3.5 h-3.5 text-amber-200" aria-hidden="true" />
                    <span>≈ ₹{cashValue} Cash Discount</span>
                    <Info className="w-3.5 h-3.5 text-amber-200/90 ml-0.5" aria-hidden="true" />
                  </button>

                  {/* Note for Redemption */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/20 backdrop-blur-md border border-white/20 text-[11px] font-semibold text-amber-100">
                    <MapPin className="w-3 h-3 text-amber-300 shrink-0" aria-hidden="true" />
                    <span>For redemption, please visit nearby branch</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── 4. CORE QUICK-ACTION BUTTONS (Adaptive Grid for V1 / V2) ─── */}
        <div className={`grid ${showFeature('giftcards') || showFeature('referrals')
          ? 'grid-cols-4'
          : 'grid-cols-2'
          } gap-1.5 sm:gap-3.5`}>
          {/* Main 1: Gift Cards (Version 2) */}
          {showFeature('giftcards') && (
            <button
              type="button"
              onClick={() => setActiveTab('gift_cards')}
              className={`px-1 py-2 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${activeTab === 'gift_cards'
                ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                : 'bg-white border-slate-200/80 text-slate-700 hover:border-amber-300 hover:bg-amber-50/40 shadow-2xs'
                }`}
            >
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${activeTab === 'gift_cards' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-600'
                }`}>
                <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[9.5px] sm:text-xs font-extrabold tracking-tight text-center leading-tight break-words max-w-full">
                Gift Cards
              </span>
            </button>
          )}

          {/* Main 2: Referral Rewards (Version 2) */}
          {showFeature('referrals') && (
            <button
              type="button"
              onClick={() => setActiveTab('referrals')}
              className={`px-1 py-2 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${activeTab === 'referrals'
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/20'
                : 'bg-white border-slate-200/80 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40 shadow-2xs'
                }`}
            >
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${activeTab === 'referrals' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'
                }`}>
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[9.5px] sm:text-xs font-extrabold tracking-tight text-center leading-tight break-words max-w-full">
                Refer &amp; Earn
              </span>
            </button>
          )}

          {/* Main 3: Vehicle Offers (Opens Dedicated /offers Page) */}
          <button
            type="button"
            onClick={() => window.open('/offers', '_blank')}
            className="px-1 py-2 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-1 sm:gap-1.5 cursor-pointer bg-white border-slate-200/80 text-slate-700 hover:border-rose-300 hover:bg-rose-50/40 shadow-2xs group"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 group-hover:scale-105 transition-transform">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="flex items-center justify-center gap-0.5 max-w-full">
              <span className="text-[9.5px] sm:text-xs font-extrabold tracking-tight text-center leading-tight break-words">
                New Car Deals
              </span>
              <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 group-hover:text-rose-600 shrink-0" />
            </div>
          </button>

          {/* Main 4: Silver, Gold, Platinum Benefits */}
          <button
            type="button"
            onClick={() => setActiveTab('benefits')}
            className={`px-1 py-2 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${activeTab === 'benefits'
              ? 'bg-purple-600 text-white border-purple-700 shadow-md shadow-purple-600/20'
              : 'bg-white border-slate-200/80 text-slate-700 hover:border-purple-300 hover:bg-purple-50/40 shadow-2xs'
              }`}
          >
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${activeTab === 'benefits' ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-600'
              }`}>
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[9.5px] sm:text-xs font-extrabold tracking-tight text-center leading-tight break-words max-w-full">
              Tier Benefits
            </span>
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

          {activeTab === 'referrals' && (
            <a
              href={whatsappReferralUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Send Referral on WhatsApp</span>
            </a>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: OVERVIEW / HOME VIEW                                         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'home' && (
          <div className="space-y-6">

            {/* ─── A. TIER PROGRESS & NEXT MILESTONE CARD (Prominent on Overview) ─── */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
                    <Crown className="w-5 h-5 text-amber-600" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900">{currentTier} VIP Tier</h3>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${tierConfig.badgeColor}`}>
                        Active Status
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      {Number(lifetimePoints).toLocaleString('en-IN')} Lifetime Qualifying Points
                    </p>
                  </div>
                </div>

                {nextTierConfig ? (
                  <div className="text-left sm:text-right">
                    <span className="text-xs font-black text-amber-700 block">
                      {Number(pointsToLevelUp).toLocaleString('en-IN')} PTS to {nextTier} VIP
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Target: {Number(nextTierPoints).toLocaleString('en-IN')} PTS
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Highest VIP Status Achieved
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              {nextTierConfig && (
                <div className="space-y-1.5 pt-1">
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-full transition-all duration-700 shadow-xs"
                      style={{ width: `${Math.max(4, tierProgress)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span>{currentTier} ({Number(tierConfig.minPoints).toLocaleString('en-IN')} PTS)</span>
                    <span className="font-bold text-slate-800">{tierProgress}% to {nextTier}</span>
                    <span>{nextTier} ({Number(nextTierPoints).toLocaleString('en-IN')} PTS)</span>
                  </div>
                </div>
              )}

              {/* Next Tier Incentive Banner */}
              {nextTierConfig && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start sm:items-center gap-2 text-amber-950 font-medium leading-relaxed">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
                    <span>
                      <strong className="text-slate-900 font-bold">{nextTier} unlocks:</strong>{' '}
                      {nextTier === 'Gold'
                        ? 'Double workshop cashback (4% vs 2%), priority service bay booking & 500 bonus referral pts'
                        : 'Maximum 6% workshop cashback, doorstep vehicle pickup/drop & VIP General Manager desk'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('benefits')}
                    className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 whitespace-nowrap self-start sm:self-auto cursor-pointer"
                  >
                    <span>View All Tier Perks</span>
                    <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>

            {/* ─── CURRENT EARNING PRIVILEGES (Dynamic to Current Tier + Guide) ─── */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Current Earning Privileges</h3>
                  <p className="text-xs text-slate-500">Active earning rates locked to your {currentTier} VIP tier</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCalculationModal(true)}
                    className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1 bg-slate-100 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Calculation Guide</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('benefits')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    View All Tiers <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Workshop Service</span>
                  <p className="text-base font-black text-emerald-700 font-mono">{tierConfig.serviceEarn}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Vehicle Sales</span>
                  <p className="text-base font-black text-purple-700 font-mono">{tierConfig.salesEarn}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Accessories</span>
                  <p className="text-base font-black text-blue-700 font-mono">{tierConfig.accessoryEarn}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Bodyshop Repair</span>
                  <p className="text-base font-black text-amber-700 font-mono">{tierConfig.bodyshopDiscount}</p>
                </div>
              </div>

              {/* Inline Calculation Tip */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
                <span>
                  💡 <strong>Example:</strong> ₹5,000 Service Bill @ {tierConfig.serviceEarn} = {currentTier.toLowerCase() === 'gold' ? '200' : currentTier.toLowerCase() === 'platinum' ? '300' : '100'} PTS (= ₹{currentTier.toLowerCase() === 'gold' ? '50' : currentTier.toLowerCase() === 'platinum' ? '75' : '25'} cash discount). Points never expire.
                </span>
                <button
                  type="button"
                  onClick={() => setShowCalculationModal(true)}
                  className="text-indigo-600 font-bold hover:underline shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  Vehicle Earning Rules →
                </button>
              </div>
            </div>

            {/* ─── D. EXCLUSIVE MEMBER WORKSHOP PRIVILEGES (Differentiated Banner) ─── */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-indigo-900/50 shadow-lg">
              <div className="absolute -right-12 -bottom-12 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase font-mono">
                    <Sparkles className="w-3 h-3 text-amber-400" aria-hidden="true" />
                    <span>Exclusive {currentTier} VIP Workshop Privileges</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                    Complimentary Point Inspection &amp; Detailing Benefits
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Upgrade your ride with unbeatable deals! Get attractive cash discounts, low down payments, and special offers for a limited time
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                  <a
                    href="/offers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs transition-all transform hover:scale-[1.02] shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Explore Car Offers</span>
                    <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                  </a>
                  <a
                    href="https://wa.me/919448000000?text=Hi%20Bellad%20%26%20Co%2C%20I%20would%20like%20to%20book%20a%20priority%20workshop%20service%20for%20my%20vehicle."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                    <span>Book Service</span>
                  </a>
                </div>
              </div>
            </div>

            {/* ─── E. RECENT ACTIVITY SNIPPET ─── */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Recent Transactions</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('transactions')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  Full History <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>

              {ledgerItems.length === 0 ? (
                <div className="p-6 text-center space-y-2 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                    <Coins className="w-5 h-5 text-amber-500" aria-hidden="true" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No transactions recorded yet</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Points earn automatically on every vehicle service, parts billing, or car delivery. Show your Member ID <span className="font-mono font-bold text-slate-800">{customerId}</span> at checkout.
                  </p>
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
        {/* TAB 2: GIFT CARDS & VOUCHERS (Version 2 Only)                       */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'gift_cards' && showFeature('giftcards') && (
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
                      Buy &amp; Share Gift Cards (Powered by Razorpay UPI)
                    </span>
                    <div className="flex flex-wrap items-baseline gap-2 mt-1">
                      <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                        Instant e-Gift Passes
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                        Scan QR &amp; Pay
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Select price, scan the Razorpay UPI QR code from Google Pay, PhonePe, or Paytm, and instantly share the gift voucher on WhatsApp (Amazon style)!
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGiftAmount(1000);
                      setSendGiftModalOpen(true);
                    }}
                    className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <Gift className="w-4 h-4" />
                    <span>Buy &amp; Send Gift Pass</span>
                  </button>
                </div>

                {/* Quick Preset Price Tiers */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-amber-200/60">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGiftAmount(250);
                      setSendGiftModalOpen(true);
                    }}
                    className="p-3 rounded-2xl bg-white border border-amber-200 hover:border-amber-400 text-left transition hover:shadow-xs cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-emerald-700 block font-mono">+1,000 PTS</span>
                    <span className="text-xs font-black text-slate-900 block mt-0.5">₹250 Gift Pass</span>
                    <span className="text-[10px] text-slate-400">Scan to pay &amp; share</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGiftAmount(500);
                      setSendGiftModalOpen(true);
                    }}
                    className="p-3 rounded-2xl bg-white border border-amber-200 hover:border-amber-400 text-left transition hover:shadow-xs cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-emerald-700 block font-mono">+2,000 PTS</span>
                    <span className="text-xs font-black text-slate-900 block mt-0.5">₹500 Gift Pass</span>
                    <span className="text-[10px] text-slate-400">Scan to pay &amp; share</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGiftAmount(1000);
                      setSendGiftModalOpen(true);
                    }}
                    className="p-3 rounded-2xl bg-white border border-amber-200 hover:border-amber-400 text-left transition hover:shadow-xs cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-emerald-700 block font-mono">+4,000 PTS</span>
                    <span className="text-xs font-black text-slate-900 block mt-0.5">₹1,000 Gift Pass</span>
                    <span className="text-[10px] text-slate-400">Scan to pay &amp; share</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGiftAmount(2000);
                      setSendGiftModalOpen(true);
                    }}
                    className="p-3 rounded-2xl bg-white border border-amber-200 hover:border-amber-400 text-left transition hover:shadow-xs cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-emerald-700 block font-mono">+8,000 PTS</span>
                    <span className="text-xs font-black text-slate-900 block mt-0.5">₹2,000 Gift Pass</span>
                    <span className="text-[10px] text-slate-400">Scan to pay &amp; share</span>
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
        {/* TAB 3: REFERRAL REWARDS (Version 2 Only)                            */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'referrals' && showFeature('referrals') && (
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
                <div className={`p-4 rounded-2xl border flex flex-col justify-between ${(referralsSummary.ready_to_claim_count || 0) > 0
                  ? 'bg-emerald-50 border-emerald-300 shadow-xs ring-2 ring-emerald-500/20'
                  : 'bg-slate-50/80 border-slate-200'
                  }`}>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${(referralsSummary.ready_to_claim_count || 0) > 0 ? 'text-emerald-800' : 'text-slate-600'
                        }`}>
                        Ready to Claim
                      </span>
                      <Sparkles className={`w-3.5 h-3.5 ${(referralsSummary.ready_to_claim_count || 0) > 0 ? 'text-emerald-600 animate-spin' : 'text-slate-400'
                        }`} />
                    </div>
                    <div className={`text-xl sm:text-2xl font-black mt-1 ${(referralsSummary.ready_to_claim_count || 0) > 0 ? 'text-emerald-950' : 'text-slate-900'
                      }`}>
                      {(referralsSummary.ready_to_claim_points || 0).toLocaleString()} <span className="text-xs font-bold text-slate-500">PTS</span>
                    </div>
                    <p className={`text-[11px] font-bold ${(referralsSummary.ready_to_claim_count || 0) > 0 ? 'text-emerald-700' : 'text-slate-500'
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

              {/* Branded Unique Referral Code Showcase (NO PIN NEEDED) */}


              {/* WhatsApp Direct Share & Tracking Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/90 border border-emerald-200 space-y-3.5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#25D366] text-white shadow-sm">
                      <Share2 className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">Share Code via WhatsApp & Auto-Track</h4>
                      <p className="text-[11px] text-slate-600">
                        Tracks who you shared with, log exact date & time, and unlocks bonus loyalty points for both upon vehicle purchase!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Optional Quick Friend Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Friend / Contact Name (Optional):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      value={friendNameInput}
                      onChange={(e) => setFriendNameInput(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Friend Phone Number (Optional):
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9845012345"
                      value={friendPhoneInput}
                      onChange={(e) => setFriendPhoneInput(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-[11px] text-emerald-800 font-medium">
                    📱 Code will be sent directly via WhatsApp with one-tap registration link.
                  </p>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {friendPhoneInput.trim() && (
                      <button
                        type="button"
                        onClick={handleSendReferralWhatsAppApi}
                        disabled={sharingWhatsApp}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                        <span>Send WhatsApp API</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      disabled={sharingWhatsApp}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {sharingWhatsApp ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                      <span>{sharingWhatsApp ? 'Tracking...' : 'Share on WhatsApp'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Dealership Policy Rule Reminder */}
              <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Vehicle Purchase &amp; PR Verification Rule:
                </div>
                <p className="text-[11px] leading-relaxed">
                  Both accounts will receive bonus reward points in locked status. Points cannot be claimed or spent until your friend completes their vehicle purchase and Permanent Registration (PR) at Bellad dealerships. Once verified, tap <strong>Claim Points</strong> to credit the bonus directly into your loyalty wallet.
                </p>
              </div>

              {/* Referrals Status List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Your Referral Pipeline ({referralsList.length})
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Auto-Logged via WhatsApp
                    </span>
                  </div>
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
                    No referrals registered yet. Share your referral code above via WhatsApp!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {referralsList.map((ref, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${ref.can_claim
                          ? 'bg-gradient-to-r from-emerald-50/90 to-teal-50/90 border-emerald-300 shadow-sm'
                          : ref.is_claimed
                            ? 'bg-white border-slate-200'
                            : 'bg-white border-amber-200/80'
                          }`}
                      >
                        <div className="space-y-1.5">
                          {/* Code + Role Badge */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {ref.referral_code && (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs font-bold">
                                <span>{ref.referral_code}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyRefCode(ref.referral_code)}
                                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                  title="Copy Code"
                                >
                                  {copiedRefCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            )}
                            <span className="font-bold text-slate-900 text-sm">
                              {ref.friend_name || 'Friend'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ref.role === 'referee'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-700'
                              }`}>
                              {ref.role_label || 'Friend Referral'}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              📱 Shared via WhatsApp
                            </span>
                          </div>

                          {/* Details Row: Mobile, Model, Date & Time */}
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                            {ref.friend_phone && <span>Mobile: {ref.friend_phone}</span>}
                            <span>&bull;</span>
                            <span>Vehicle: {ref.vehicle_model || 'Automobile'}</span>
                            {(ref.shared_at || ref.created_at) && (
                              <>
                                <span>&bull;</span>
                                <span className="flex items-center gap-1 text-slate-600 font-medium">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  Sent: {new Date(ref.shared_at || ref.created_at).toLocaleString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Dual Reward Breakdown */}
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="font-bold text-indigo-700">
                              +2,500 PTS for you | +2,500 PTS for friend
                            </span>
                            <span className="text-slate-400 font-medium">(₹1,250 Dual Value)</span>
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

      {/* ─── 6. Cash Value & Redemption Info Modal ────────────────────────── */}
      {showCashInfoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setShowCashInfoModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <IndianRupee className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Points Cash Value &amp; Rules</h3>
                <p className="text-xs text-slate-500 font-medium">Clear, transparent redemption terms</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-amber-900">Conversion Rate</span>
                <span className="font-mono text-sm font-black text-amber-800">1 Point = ₹0.25 (4 Pts = ₹1.00)</span>
              </div>
              <div className="flex items-baseline justify-between pt-1 border-t border-amber-200/60 text-xs">
                <span className="text-slate-600">Your Current Balance</span>
                <span className="font-mono font-bold text-slate-900">{Number(currentBalance).toLocaleString('en-IN')} PTS ≈ ₹{cashValue}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div>
                <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Where Can I Redeem Points?
                </h4>
                <p className="text-[11px] text-slate-600">
                  Redeemable at all Bellad &amp; Company billing desks in Hubballi, Belagavi, Dharwad, and Vijayapura towards:
                </p>
                <ul className="list-disc pl-5 mt-1 space-y-0.5 text-[11px] text-slate-600">
                  <li>Periodic service maintenance and mechanical labour bills</li>
                  <li>Genuine accessories and original spare parts purchases</li>
                  <li>Bodyshop insurance customer liability share (up to tier discount)</li>
                  <li>Booking advance or downpayment on new vehicle purchases</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" /> Points Validity &amp; Expiry
                </h4>
                <p className="text-[11px] text-slate-600">
                  <strong>Points Never Expire:</strong> Your accumulated points have lifetime validity as long as your membership is active. There is no year-end lapse or forfeiture.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" /> How to Redeem
                </h4>
                <p className="text-[11px] text-slate-600">
                  For redemption, please visit nearby branch. Quote your Member ID or registered mobile number to the cashier before invoice generation.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowCashInfoModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 8. Earning Calculation Guide Modal ───────────────────────────── */}
      {showCalculationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCalculationModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">How Points Are Earned</h3>
                <p className="text-xs text-slate-500 font-medium">Calculation examples and policy breakdown</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Workshop Example */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                <span className="font-bold text-emerald-950 text-xs block">1. Workshop Service Bill</span>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  Points are earned on net invoice value (excluding GST &amp; statutory taxes). Rate varies by tier:
                </p>
                <div className="p-2.5 bg-white rounded-xl border border-emerald-100 text-[11px] font-mono space-y-1">
                  <div className="flex justify-between">
                    <span>₹10,000 Service Bill (Silver - 2%):</span>
                    <strong className="text-emerald-700">200 PTS (₹50 discount)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>₹10,000 Service Bill (Gold - 4%):</span>
                    <strong className="text-emerald-700">400 PTS (₹100 discount)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>₹10,000 Service Bill (Platinum - 6%):</span>
                    <strong className="text-emerald-700">600 PTS (₹150 discount)</strong>
                  </div>
                </div>
              </div>

              {/* Vehicle Sales Example & Policy explanation */}
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-1.5">
                <span className="font-bold text-purple-950 text-xs block">2. Vehicle Sales Points Policy</span>
                <p className="text-[11px] text-purple-900 leading-relaxed">
                  The <strong>1% Ex-Showroom</strong> earning rate applies to the <em>net base vehicle price</em> (excluding RTO registration tax, road tax, insurance premium, FASTag, handling charges, and after deducting OEM exchange bonus and dealer discounts).
                </p>
                <div className="p-2.5 bg-white rounded-xl border border-purple-100 text-[11px] space-y-1">
                  <p className="text-slate-700 font-medium">
                    💡 <strong>Why is my balance 1,020 PTS?</strong>
                  </p>
                  <p className="text-slate-500 leading-tight">
                    Vehicle purchase points follow dealership campaign caps (e.g., standard welcome tier reward of 1,000 base points plus service/accessory points), or accumulate incrementally across bookings and periodic service visits.
                  </p>
                </div>
              </div>

              {/* Referral Bonus */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                <span className="font-bold text-amber-950 text-xs block">3. Friend Referral Bonus</span>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Earn <strong>2,500 Bonus Points (₹625 Value)</strong> for each friend who takes vehicle delivery and completes PR using your referral link. Your friend also receives 2,500 bonus points!
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowCalculationModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 9. Terms, Privacy & Redemption Policy Modal ──────────────────── */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setShowTermsModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-black text-slate-900">
                {termsModalType === 'terms' ? 'Terms & Conditions' : termsModalType === 'privacy' ? 'Privacy Policy' : 'Redemption Policy & FAQs'}
              </h3>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTermsModalType('terms')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${termsModalType === 'terms' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Terms &amp; Conditions
              </button>
              <button
                type="button"
                onClick={() => setTermsModalType('privacy')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${termsModalType === 'privacy' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => setTermsModalType('policy')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${termsModalType === 'policy' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Redemption Policy
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              {termsModalType === 'terms' && (
                <>
                  <p><strong>1. Membership Eligibility:</strong> The Bellad &amp; Company Loyalty Pass is available to retail vehicle buyers and workshop service customers across authorized Bellad dealerships in Karnataka.</p>
                  <p><strong>2. Point Accrual:</strong> Points are accrued on paid vehicle service, genuine accessories, and vehicle delivery transactions net of taxes and OEM discounts. Accrual rules vary by membership tier (Silver, Gold, Platinum).</p>
                  <p><strong>3. Non-Transferability:</strong> Loyalty points are personal to the account holder and cannot be transferred to another individual, except via authorized e-Gift Cards issued through this portal.</p>
                  <p><strong>4. Modification of Program:</strong> Bellad &amp; Company reserves the right to amend tier thresholds, multiplier rates, or eligible benefits with prior digital notification via WhatsApp or SMS.</p>
                </>
              )}
              {termsModalType === 'privacy' && (
                <>
                  <p><strong>1. Information We Collect:</strong> We collect your name, mobile number, vehicle registration details (VIN/Chassis), transaction history, and communication preferences to deliver loyalty benefits.</p>
                  <p><strong>2. How We Use Your Data:</strong> Your data is used exclusively to track loyalty points, process redemptions, notify you of service milestones, and share verified manufacturer recalls or offers.</p>
                  <p><strong>3. Data Protection:</strong> We do not sell or rent your personal data to third parties. Data is secured under strict enterprise encryption and shared only with OEM systems (Tata Motors, MG, Hero, Ather) as mandated for warranty and service.</p>
                </>
              )}
              {termsModalType === 'policy' && (
                <>
                  <p><strong>1. Redemption Value:</strong> 1 Point = ₹0.25 (4 Points = ₹1.00). Points cannot be converted to physical cash or withdrawn into bank accounts.</p>
                  <p><strong>2. Point Expiry:</strong> Loyalty points have no expiry date and remain active in your wallet indefinitely while your account is active.</p>
                  <p><strong>3. Counter Presentation:</strong> For redemption, please visit your nearby branch and quote your Member ID or registered mobile number before the final invoice is printed.</p>
                  <p><strong>4. Applicable Departments:</strong> Valid across Periodic Maintenance, Running Repairs, Body Shop Customer Liability, Accessories, and New Vehicle bookings.</p>
                </>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 10. Send e-Gift Modal ────────────────────────────────────────── */}
      <SendGiftModal
        isOpen={sendGiftModalOpen}
        onClose={() => setSendGiftModalOpen(false)}
        customer={profile || customerInfo}
        currentBalance={currentBalance}
        initialAmount={selectedGiftAmount}
        onGiftSent={() => {
          loadProfile();
          loadLedger();
          loadGiftCards();
          setSuccessMsg('Gift card payment confirmed and voucher activated! Share the WhatsApp claim link with your recipient.');
        }}
      />

      {/* ─── 11. Comprehensive Dealership Loyalty Footer ──────────────────── */}
      <footer className="bg-white border-t border-slate-200 mt-8 pt-8 pb-6 text-slate-600 text-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-6 border-b border-slate-100">
            {/* Col 1: About */}
            <div className="space-y-2 md:col-span-1">
              <div className="flex items-center gap-2">
                <img src="/bellad-logo.png" alt="Bellad Logo" className="w-6 h-6 object-contain" />
                <span className="font-black text-slate-900 text-sm">Bellad &amp; Company</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Karnataka&apos;s trusted automotive dealership group since 1968. Authorized dealer for Tata Motors, MG, Hero MotoCorp &amp; Ather Energy.
              </p>
            </div>

            {/* Col 2: Legal & Policy */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Help &amp; Legal</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li>
                  <button
                    type="button"
                    onClick={() => { setTermsModalType('terms'); setShowTermsModal(true); }}
                    className="hover:text-indigo-600 transition cursor-pointer"
                  >
                    Terms &amp; Conditions
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => { setTermsModalType('privacy'); setShowTermsModal(true); }}
                    className="hover:text-indigo-600 transition cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => { setTermsModalType('policy'); setShowTermsModal(true); }}
                    className="hover:text-indigo-600 transition cursor-pointer"
                  >
                    Redemption Policy &amp; FAQs
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Support */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Customer Support</h4>
              <div className="space-y-1 text-[11px] text-slate-500">
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <a href="tel:08362448888" className="hover:text-indigo-600 font-medium">+91 (0836) 244 8888</a>
                </p>
                <p className="text-[10px] text-slate-400">Mon - Sat: 9:00 AM - 6:30 PM</p>
                <p className="pt-1">
                  <a
                    href="https://wa.me/919448000000?text=Hi%20Bellad%20Loyalty%20Support%2C%20I%20need%20assistance."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-600 font-bold hover:underline"
                  >
                    <span>WhatsApp Support Desk</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </p>
              </div>
            </div>

            {/* Col 4: Network */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Dealership Network</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Hubballi &bull; Belagavi &bull; Dharwad &bull; Vijayapura &bull; Bagalkot &bull; Gadag
              </p>
              <div className="pt-1 flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">Tata Motors</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">MG</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">Hero</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
            <p>&copy; {new Date().getFullYear()} Bellad &amp; Company. All rights reserved.</p>
            <p>1 Point = ₹0.25 &bull; No Point Expiration &bull; Direct Dealership Redemption</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
