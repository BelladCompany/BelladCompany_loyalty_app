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
} from 'lucide-react';
import ApiService from '../../services/api';

// Icon mapper for transaction categories
const CategoryIcon = ({ type }) => {
  switch (type) {
    case 'finance':
      return <DollarSign className="w-4 h-4 text-slate-700" />;
    case 'insurance':
      return <ShieldCheck className="w-4 h-4 text-slate-700" />;
    case 'exchange':
      return <Repeat className="w-4 h-4 text-slate-700" />;
    case 'purchase':
      return <Car className="w-4 h-4 text-slate-700" />;
    case 'tnps':
      return <Star className="w-4 h-4 text-slate-700" />;
    case 'referral':
      return <Users className="w-4 h-4 text-slate-700" />;
    case 'redeem':
      return <Gift className="w-4 h-4 text-slate-700" />;
    default:
      return <Car className="w-4 h-4 text-slate-700" />;
  }
};

// Memoized Activity Row
const LedgerRow = memo(({ item }) => {
  const isPositive = item.points >= 0;
  const formattedPoints = isPositive ? `+${item.points}` : `${item.points}`;

  return (
    <div className="flex items-center justify-between py-3.5 px-4 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors">
      <div className="flex items-center space-x-3 min-w-0 pr-2">
        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          <CategoryIcon type={item.type} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-900 truncate">{item.text}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{item.date}</p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <span
          className={`text-sm font-bold ${
            isPositive ? 'text-emerald-600' : 'text-red-500'
          }`}
        >
          {formattedPoints} PTS
        </span>
      </div>
    </div>
  );
});

LedgerRow.displayName = 'LedgerRow';

// Skeleton Loader
const LedgerSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4].map((n) => (
      <div key={n} className="flex items-center justify-between py-3.5 px-4 bg-slate-50 rounded-xl animate-pulse">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-slate-200 shrink-0" />
          <div className="space-y-1.5">
            <div className="w-40 h-3 bg-slate-200 rounded" />
            <div className="w-20 h-2.5 bg-slate-200 rounded" />
          </div>
        </div>
        <div className="w-16 h-4 bg-slate-200 rounded" />
      </div>
    ))}
  </div>
);

// New Customer Welcome Card
function NewCustomerWelcome({ name, memberSince }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4">
      <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
        <Sparkles className="w-7 h-7 text-emerald-600" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Welcome to Bellad Loyalty, {name}!
        </h2>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-xs mx-auto">
          Thank you for enrolling in our loyalty program. Your account has been successfully created.
          You're now part of the Bellad Automobile family — enjoy exclusive rewards and discounts
          on every vehicle purchase, service, insurance, and more.
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2.5 text-left">
        <h3 className="text-xs font-bold text-slate-900">How to Start Earning Points</h3>
        <div className="space-y-2">
          <div className="flex items-start space-x-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">1</div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong className="text-slate-900">Purchase a Vehicle</strong> — Earn loyalty points on every new or exchange vehicle purchase at any Bellad showroom.
            </p>
          </div>
          <div className="flex items-start space-x-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">2</div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong className="text-slate-900">Service Your Vehicle</strong> — Every service visit at our authorized service centers earns you bonus loyalty points.
            </p>
          </div>
          <div className="flex items-start space-x-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">3</div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong className="text-slate-900">Refer Friends</strong> — Share your referral code and earn bonus points when they make their first purchase.
            </p>
          </div>
          <div className="flex items-start space-x-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">4</div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong className="text-slate-900">Redeem for Discounts</strong> — Use accumulated points to get instant discounts on your next billing at any Bellad center.
            </p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        Member since {memberSince}
      </p>
    </div>
  );
}

export default function PortalDashboardScreen({ customerInfo, onSignOut }) {
  const [profile, setProfile] = useState(null);
  const [ledgerItems, setLedgerItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    loadProfile();
    loadLedger();
  }, [loadProfile, loadLedger]);

  const firstName = profile?.name ? profile.name.split(' ')[0] : 'Valued';
  const isNewCustomer = profile?.isNewCustomer === true;
  const referralLink = profile?.referralCode
    ? `${window.location.origin}/portal?ref=${profile.referralCode}`
    : `${window.location.origin}/portal`;

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 1. Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <img
              src="/bellad-logo.png"
              alt="Bellad Automobiles"
              className="w-8 h-8 object-contain rounded-lg"
            />
            <span className="text-base font-bold text-slate-900 tracking-tight">Bellad Loyalty</span>
          </div>
          <button
            onClick={onSignOut}
            className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-slate-900 py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 pb-8 space-y-6 flex-1 w-full">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-xl">
            {error}
          </div>
        )}

        {/* 2. Greeting */}
        <div>
          {loadingProfile ? (
            <div className="space-y-2 animate-pulse">
              <div className="w-48 h-6 bg-slate-200 rounded" />
              <div className="w-64 h-4 bg-slate-200 rounded" />
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Welcome{isNewCustomer ? '' : ' back'}, {firstName}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {profile?.vehicle ? `${profile.vehicle} • ` : ''}
                {profile?.aadhaar ? `Aadhaar: ${profile.aadhaar} • ` : ''}
                Member since {profile?.memberSince || new Date().getFullYear()}
              </p>
            </>
          )}
        </div>

        {/* NEW CUSTOMER: Welcome Message + How to earn */}
        {!loadingProfile && isNewCustomer && (
          <NewCustomerWelcome name={firstName} memberSince={profile?.memberSince} />
        )}

        {/* 3. Balance Hero Card */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
          {loadingProfile ? (
            <div className="space-y-4 animate-pulse">
              <div className="w-24 h-3 bg-slate-700 rounded" />
              <div className="w-40 h-10 bg-slate-700 rounded" />
              <div className="w-32 h-4 bg-slate-700 rounded" />
            </div>
          ) : isNewCustomer ? (
            /* New customer — no balance yet */
            <div className="space-y-3 text-center py-2">
              <div className="flex items-baseline justify-center space-x-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">0</span>
                <span className="text-sm font-semibold text-slate-300">PTS</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                Start earning loyalty points with your first vehicle purchase, service visit, or by referring friends.
                Every point counts towards exclusive discounts!
              </p>
              <div className="flex items-center justify-center space-x-1 text-emerald-400 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Visit any Bellad center to start earning</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Total Loyalty Balance
                </span>
                <div className="mt-1 flex items-baseline space-x-2">
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                    {(profile?.balance || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-sm font-semibold text-slate-300">PTS</span>
                </div>
                <p className="text-xs text-emerald-400 mt-1.5 font-medium">
                  Equivalent to ₹{(profile?.redeemableValue || 0).toLocaleString('en-IN')} redeemable discount
                </p>
              </div>

              <button
                onClick={() => setShowRedeemModal(true)}
                className="py-2 px-4 bg-white text-slate-900 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors shrink-0"
              >
                Redeem points
              </button>
            </div>
          )}
        </div>

        {/* 4. Referral Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-700">Your Referral Code</span>
              <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                {profile?.referralCode || '—'}
              </p>
            </div>
            <button
              onClick={handleCopyReferral}
              className="inline-flex items-center text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 py-2 px-3 rounded-xl transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
                  <span>Copy referral link</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2.5">
            Share your referral link with friends to earn bonus loyalty points on their first vehicle purchase or service.
          </p>
        </div>

        {/* 5. Activity List */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Transaction activity</h2>

          {loadingLedger ? (
            <LedgerSkeleton />
          ) : ledgerItems.length === 0 ? (
            <div className="text-center py-8 bg-white border border-slate-200 rounded-2xl p-6">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Car className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-xs text-slate-600 font-medium">No transaction activity recorded yet.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Your loyalty points and redemption history will appear here once you start earning.
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
                className="inline-flex items-center text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 py-2.5 px-4 rounded-xl transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 mr-1.5" />
                )}
                <span>Load earlier activity</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer — Terms & Conditions */}
      <footer className="border-t border-slate-100 bg-white py-4">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-1">
          <div className="flex items-center justify-center space-x-3 text-[11px] text-slate-400">
            <a
              href="/terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-700 underline transition-colors"
            >
              Terms &amp; Conditions
            </a>
            <span>•</span>
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-700 underline transition-colors"
            >
              Privacy Policy
            </a>
          </div>
          <p className="text-[10px] text-slate-400">
            © {new Date().getFullYear()} Bellad Automobile Corporation. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Redemption Info Modal */}
      {showRedeemModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 border border-slate-200 shadow-xl">
            <div className="flex items-center space-x-2 text-slate-900">
              <Info className="w-5 h-5 text-slate-700" />
              <h3 className="text-base font-bold">How to Redeem Points</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Loyalty points can be redeemed directly at any authorized Bellad Service Center or Showroom cashier desk during billing.
            </p>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <p><strong className="font-semibold text-slate-900">Current Balance:</strong> {profile?.balance || 0} PTS</p>
              <p><strong className="font-semibold text-slate-900">Discount Value:</strong> ₹{profile?.redeemableValue || 0}</p>
              <p className="text-[11px] text-slate-500 pt-1">Cashier will verify OTP sent to your WhatsApp number before applying discount.</p>
            </div>
            <button
              onClick={() => setShowRedeemModal(false)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
