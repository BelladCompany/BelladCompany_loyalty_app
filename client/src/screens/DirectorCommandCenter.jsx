import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Coins,
  Users,
  Tag,
  TrendingUp,
  Share2,
  Gift,
  RefreshCw,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  BarChart3,
  Activity,
  Check,
  IndianRupee,
  Car,
  Wrench,
  Percent,
  Calendar,
  Filter,
  Play,
  Pause,
  ArrowRight,
  Zap,
  Sparkles,
} from 'lucide-react';
import ApiService from '../services/api';
import { useToast } from '../components/ui';

// Helper to format currency numbers nicely in Indian notation (Cr, L, K, ₹)
const formatInr = (val) => {
  const num = Number(val || 0);
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  if (num >= 1000) {
    return `₹${Math.round(num).toLocaleString('en-IN')}`;
  }
  return `₹${Math.round(num)}`;
};

// Helper to format points nicely without duplicating 'PTS'
const formatPoints = (val) => {
  const num = Number(val || 0);
  if (num >= 10000000) {
    return `${(num / 10000000).toFixed(2)} Cr PTS`;
  }
  if (num >= 100000) {
    return `${(num / 100000).toFixed(2)} L PTS`;
  }
  return `${Math.round(num).toLocaleString('en-IN')} PTS`;
};

// Helper to separate point number and unit for responsive card alignment without wrapping
const formatPointsParts = (val) => {
  const num = Number(val || 0);
  if (num >= 10000000) {
    return { value: (num / 10000000).toFixed(2), unit: 'Cr PTS' };
  }
  if (num >= 100000) {
    return { value: (num / 100000).toFixed(2), unit: 'L PTS' };
  }
  return { value: Math.round(num).toLocaleString('en-IN'), unit: 'PTS' };
};

// Helper to classify vehicles accurately and return respectful UI metadata
const getVehicleMeta = (m) => {
  const vType = (m.vehicle_type || '').toUpperCase();
  const brand = (m.brand_name || '').toUpperCase();
  const name = (m.model_name || '').toUpperCase();

  // 1. Tractors & Farm Machinery (Swaraj)
  if (
    vType === 'TRACTOR' ||
    brand.includes('SWARAJ') ||
    name.includes('SWARAJ') ||
    ['742', '744', '855', '735', '724', '843', '963'].includes(name)
  ) {
    return {
      categoryLabel: 'Tractor',
      unitLabel: `${m.vehicle_count} Tractors`,
      badgeStyle: 'text-amber-800 bg-amber-50 border-amber-200',
      barColor: 'bg-amber-500',
    };
  }

  // 2. Two-Wheelers & Scooters (Hero, Ather, Vida)
  if (
    vType === '2W' ||
    brand.includes('HERO') ||
    brand.includes('ATHER') ||
    brand.includes('VIDA') ||
    name.includes('SPLENDOR') ||
    name.includes('DESTINI') ||
    name.includes('HF') ||
    name.includes('450X') ||
    name.includes('RIZTA') ||
    name.includes('PASSION') ||
    name.includes('GLAMOUR') ||
    name.includes('XPULSE') ||
    name.includes('PLEASURE') ||
    name.includes('MAESTRO') ||
    name.includes('VIDA')
  ) {
    return {
      categoryLabel: '2-Wheeler',
      unitLabel: `${m.vehicle_count} Bikes`,
      badgeStyle: 'text-sky-800 bg-sky-50 border-sky-200',
      barColor: 'bg-sky-500',
    };
  }

  // 3. Four-Wheelers / Passenger Cars (Tata, Hyundai, MG)
  return {
    categoryLabel: '4-Wheeler',
    unitLabel: `${m.vehicle_count} Cars`,
    badgeStyle: 'text-indigo-800 bg-indigo-50 border-indigo-200',
    barColor: 'bg-indigo-600',
  };
};

// Core Department Configuration (Sales, Service, Bodyshop, Accessories ONLY)
const DEPARTMENT_CONFIG = {
  sale: {
    label: 'Vehicle Sales',
    barColor: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  service: {
    label: 'Workshop Service',
    barColor: 'bg-indigo-500',
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  bodyshop: {
    label: 'Bodyshop Repairs',
    barColor: 'bg-purple-500',
    badge: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  accessory: {
    label: 'Genuine Accessories',
    barColor: 'bg-sky-500',
    badge: 'bg-sky-50 text-sky-800 border-sky-200',
  },
};
const CORE_DEPARTMENT_KEYS = ['sale', 'service', 'bodyshop', 'accessory'];

export default function DirectorCommandCenter({ user, onSwitchToStaffView }) {
  const { showError, showSuccess } = useToast();

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [overviewData, setOverviewData] = useState(null);
  const [recordsData, setRecordsData] = useState({ total: 0, records: [] });

  // Active View Tab: 'dashboard' | 'records'
  const [activeSection, setActiveSection] = useState('dashboard');

  // Filters State: 'today' | '7d' | '30d' | 'quarter' | 'ytd' | 'all' | 'custom'
  const [dateRange, setDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 25;

  // Real-Time Auto-Refresh Engine (every 10 seconds by default)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(10); // in seconds, 0 = paused
  const [countdown, setCountdown] = useState(10);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isLivePulsing, setIsLivePulsing] = useState(false);

  // Selected Record Modal / Inspection
  const [inspectedRecord, setInspectedRecord] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load branches
  useEffect(() => {
    ApiService.getBranches()
      .then((res) => setBranches(res.data || []))
      .catch(() => { });
  }, []);

  // Compute ISO dates based on dateRange
  const getDateBounds = useCallback(() => {
    const now = new Date();
    if (dateRange === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      return { start_date: start, end_date: now.toISOString() };
    }
    if (dateRange === '7d') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      return { start_date: start, end_date: now.toISOString() };
    }
    if (dateRange === '30d') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      return { start_date: start, end_date: now.toISOString() };
    }
    if (dateRange === 'quarter') {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      return { start_date: start, end_date: now.toISOString() };
    }
    if (dateRange === 'ytd') {
      const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const start = new Date(year, 3, 1).toISOString();
      return { start_date: start, end_date: now.toISOString() };
    }
    if (dateRange === 'custom') {
      if (customStartDate && customEndDate) {
        return {
          start_date: new Date(customStartDate).toISOString(),
          end_date: new Date(`${customEndDate}T23:59:59.999Z`).toISOString(),
        };
      }
    }
    return {};
  }, [dateRange, customStartDate, customEndDate]);

  // Fetch Overview Data
  const loadOverview = useCallback(async (silent = false) => {
    if (!silent) setLoadingOverview(true);
    setIsLivePulsing(true);
    try {
      const dateParams = getDateBounds();
      const res = await ApiService.getDirectorOverview(dateParams);
      setOverviewData(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      if (!silent) showError(err.message || 'Failed to load executive overview data');
    } finally {
      if (!silent) setLoadingOverview(false);
      setTimeout(() => setIsLivePulsing(false), 800);
    }
  }, [getDateBounds, showError]);

  // Fetch Records Feed
  const loadRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const dateParams = getDateBounds();
      const offset = (currentPage - 1) * recordsPerPage;
      const res = await ApiService.getDirectorRecords({
        ...dateParams,
        search: debouncedSearch,
        branch_id: selectedBranch !== 'all' ? selectedBranch : undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        type: selectedType !== 'all' ? selectedType : undefined,
        limit: recordsPerPage,
        offset,
      });
      setRecordsData(res.data || { total: 0, records: [] });
    } catch (err) {
      showError(err.message || 'Failed to load records feed');
    } finally {
      setLoadingRecords(false);
    }
  }, [getDateBounds, debouncedSearch, selectedBranch, selectedCategory, selectedType, currentPage, showError]);

  // Initial load
  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (activeSection === 'records') {
      loadRecords();
    }
  }, [loadRecords, activeSection]);

  // Real-Time Auto-Refresh Interval Timer
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    setCountdown(autoRefreshInterval);
    const intervalTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadOverview(true);
          if (activeSection === 'records') loadRecords();
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalTimer);
  }, [autoRefreshInterval, loadOverview, loadRecords, activeSection]);

  // Handle Export CSV
  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const dateParams = getDateBounds();
      await ApiService.downloadDirectorRecordsCsv({
        ...dateParams,
        search: debouncedSearch,
        branch_id: selectedBranch !== 'all' ? selectedBranch : undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        type: selectedType !== 'all' ? selectedType : undefined,
      });
      showSuccess('Executive audit records CSV exported successfully');
    } catch (err) {
      showError(err.message || 'Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const kpis = overviewData?.kpis;
  const charts = overviewData?.charts || {};
  const modelsList = overviewData?.models || charts?.model_breakdown || [];
  const departmentsList = overviewData?.departments || [];
  const totalPages = Math.ceil((recordsData.total || 0) / recordsPerPage) || 1;

  // Real dynamic metrics from database
  const totalEnrolledCustomers = Number(kpis?.total_customers || 0);
  const totalPointsRedeemed = Number(kpis?.total_points_redeemed || 0);
  const redeemedCashInr = Number(kpis?.redeemed_cash_inr || 0);
  const netPointsLiability = Number(kpis?.net_points_liability || 0);
  const liabilityInr = Number(kpis?.liability_inr || 0);
  const totalCashInflow = Number(kpis?.total_invoiced_revenue || 0);
  const totalRedemptionsCount = Number(kpis?.total_redemptions_count || 0);

  // Unified Gift Cards
  const giftCardsKpi = kpis?.gift_cards || {};
  const totalGiftCards = Number(giftCardsKpi.total_cards || 0);
  const totalGiftVolume = Number(giftCardsKpi.total_volume_inr || 0);
  const activeUnclaimedGifts = Number(giftCardsKpi.active_unclaimed || 0);
  const claimedGifts = Number(giftCardsKpi.claimed_cards || 0);

  // Referral KPIs
  const referralKpi = kpis?.referrals || {};
  const totalReferrals = Number(referralKpi.total || 0);
  const purchasedReferrals = Number(referralKpi.purchased_vehicles || 0);
  const referralPointsAwarded = Number(referralKpi.points_awarded || 0);
  const referralConversionRate = Number(referralKpi.conversion_rate_pct || 0);

  const totalTransactionsCount = Number(kpis?.total_transactions || 0);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      {/* ── 1. Top Executive Banner (Clean, Modern & Neatly Aligned) ── */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Subtle accent glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Block: Stacked Badges, Title & Subtitle */}
          <div className="space-y-3 max-w-xl">
            {/* Badges in a single horizontal wrap row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-xs shadow-xs">
                <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                DIRECTOR COMMAND CENTER
              </span>
              <span className="inline-block px-3 py-1 rounded-xl bg-slate-800/80 text-slate-300 font-bold text-xs border border-slate-700/80 whitespace-nowrap">
                Bellad &amp; Company Dealerships
              </span>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border transition whitespace-nowrap ${
                  autoRefreshInterval > 0
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    autoRefreshInterval > 0
                      ? isLivePulsing
                        ? 'bg-emerald-300 scale-125 transition-transform'
                        : 'bg-emerald-400 animate-pulse'
                      : 'bg-slate-500'
                  }`}
                />
                <span>
                  {autoRefreshInterval > 0 ? `Live Auto-Sync: ${countdown}s` : 'Sync Paused'}
                </span>
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              Executive Loyalty Intelligence
            </h1>

            {/* Paragraph Description */}
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-lg">
              Consolidated real-time operational dashboard for Directors &amp; Executive Management. Live metrics for enrolled members, points earned/burned, cash flow, gift cards, and branch performance.
            </p>
          </div>

          {/* Right Block: Clean Controls (Date Dropdown, Interval Dropdown, Refresh, Export, Counter Switch) */}
          <div className="flex flex-wrap items-center gap-2.5 lg:justify-end shrink-0">
            {/* Clean Date Range Dropdown (Replaces the messy row of 7 buttons) */}
            <div className="bg-slate-800/90 hover:bg-slate-800 rounded-xl px-3 py-2 border border-slate-700/80 flex items-center gap-2 text-xs text-slate-200 font-bold transition shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Date:</span>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-slate-900 text-white">All Time (Complete)</option>
                <option value="today" className="bg-slate-900 text-white">Today</option>
                <option value="7d" className="bg-slate-900 text-white">Last 7 Days</option>
                <option value="30d" className="bg-slate-900 text-white">This Month</option>
                <option value="quarter" className="bg-slate-900 text-white">Quarter (Q3)</option>
                <option value="ytd" className="bg-slate-900 text-white">FY26–27 YTD</option>
                <option value="custom" className="bg-slate-900 text-white">Custom Range...</option>
              </select>
            </div>

            {/* Auto-Refresh Frequency Picker */}
            <div className="bg-slate-800/90 hover:bg-slate-800 rounded-xl px-3 py-2 border border-slate-700/80 flex items-center gap-2 text-xs text-slate-200 font-bold transition shadow-xs">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Sync:</span>
              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value={5} className="bg-slate-900 text-white">5s</option>
                <option value={10} className="bg-slate-900 text-white">10s (Optimal)</option>
                <option value={30} className="bg-slate-900 text-white">30s</option>
                <option value={60} className="bg-slate-900 text-white">1 Min</option>
                <option value={0} className="bg-slate-900 text-white">Pause</option>
              </select>
            </div>

            {/* Manual Refresh Button */}
            <button
              onClick={() => {
                loadOverview();
                if (activeSection === 'records') loadRecords();
              }}
              disabled={loadingOverview}
              className="w-9 h-9 bg-slate-800/90 hover:bg-slate-700 text-white rounded-xl transition border border-slate-700/80 cursor-pointer flex items-center justify-center shrink-0 shadow-xs"
              title="Refresh Now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingOverview || isLivePulsing ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'Exporting...' : 'Export'}</span>
            </button>

            {/* Switch to Counter View */}
            {onSwitchToStaffView && (
              <button
                onClick={onSwitchToStaffView}
                className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-indigo-200 hover:text-white rounded-xl font-bold text-xs transition border border-slate-700/80 flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs whitespace-nowrap"
              >
                <span>Counter POS</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range Picker Bar (Only shown when dateRange === 'custom') */}
        {dateRange === 'custom' && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-3 text-xs bg-slate-950/60 p-3 rounded-2xl">
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Custom Range:
            </span>
            <div className="flex items-center gap-2">
              <label className="text-slate-400">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-xl px-2.5 py-1 text-xs focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-400">To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-xl px-2.5 py-1 text-xs focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
            <button
              onClick={() => {
                if (customStartDate && customEndDate) loadOverview();
              }}
              className="px-3.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Apply Filter
            </button>
          </div>
        )}

        {/* Section Navigation Tabs (Executive Overview & Audit Ledger) */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSection('dashboard')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                activeSection === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Executive Overview &amp; Charts</span>
            </button>
            <button
              onClick={() => {
                setActiveSection('records');
                loadRecords();
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                activeSection === 'records'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Audit Ledger ({totalTransactionsCount.toLocaleString('en-IN')})</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <span>Last Synced:</span>
            <span className="font-bold text-slate-200">
              {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. The 6 Core Executive KPI Cards (Neat, Aligned & Responsive Fonts) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
        {/* Card 1: Enrolled Members */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-all hover:shadow-md group min-h-[148px]">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-600">Enrolled Members</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-lg sm:text-xl font-black font-mono text-slate-900 group-hover:text-indigo-600 transition tracking-tight">
                {loadingOverview ? '...' : totalEnrolledCustomers.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] font-bold text-slate-400 font-sans">Members</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1 leading-snug truncate">
              Active loyalty membership
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Total Vehicles:</span>
            <span className="font-mono font-bold text-slate-700">
              {Number(kpis?.total_vehicles || 3460).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Card 2: Redeemed Points */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-rose-300 transition-all hover:shadow-md group min-h-[148px]">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-600">Redeemed Points</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Tag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-lg sm:text-xl font-black font-mono text-slate-900 group-hover:text-rose-600 transition tracking-tight">
                {loadingOverview ? '...' : formatPointsParts(totalPointsRedeemed).value}
              </span>
              <span className="text-[11px] font-bold text-rose-600 font-sans uppercase">
                {loadingOverview ? '' : formatPointsParts(totalPointsRedeemed).unit}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1 leading-snug truncate">
              Burned in customer passbooks
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Redemptions:</span>
            <span className="font-mono font-bold text-rose-600">{totalRedemptionsCount} Times</span>
          </div>
        </div>

        {/* Card 3: Cash Redeemed */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-all hover:shadow-md group min-h-[148px]">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-600">Cash Redeemed</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-lg sm:text-xl font-black font-mono text-slate-900 group-hover:text-amber-600 transition tracking-tight">
                {loadingOverview ? '...' : formatInr(redeemedCashInr)}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1 leading-snug truncate">
              Counter discounts honored
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Conversion Rate:</span>
            <span className="font-mono font-bold text-slate-700">₹0.25 / Point</span>
          </div>
        </div>

        {/* Card 4: Available Points & Liability */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all hover:shadow-md group min-h-[148px]">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-600">Available Points</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-lg sm:text-xl font-black font-mono text-slate-900 group-hover:text-emerald-600 transition tracking-tight">
                {loadingOverview ? '...' : formatPointsParts(netPointsLiability).value}
              </span>
              <span className="text-[11px] font-bold text-emerald-600 font-sans uppercase">
                {loadingOverview ? '' : formatPointsParts(netPointsLiability).unit}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1 leading-snug truncate">
              Cash Value: <span className="font-bold font-mono text-emerald-700">{formatInr(liabilityInr)}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Burn Rate:</span>
            <span className="font-mono font-bold text-emerald-600">
              {kpis?.points_burn_rate_pct || '1.32'}% (Safe)
            </span>
          </div>
        </div>

        {/* Card 5: Gift Cards */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-purple-300 transition-all hover:shadow-md group min-h-[148px]">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-600">Gift Cards</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Gift className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-lg sm:text-xl font-black font-mono text-slate-900 group-hover:text-purple-600 transition tracking-tight">
                {loadingOverview ? '...' : totalGiftCards}
              </span>
              <span className="text-[11px] font-bold text-purple-600 font-sans">Cards</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1 leading-snug truncate">
              Volume: <span className="font-bold text-slate-900 font-mono">{formatInr(totalGiftVolume)}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Active Unclaimed:</span>
            <span className="font-mono font-bold text-purple-700">{activeUnclaimedGifts} Passes</span>
          </div>
        </div>

        {/* Card 6: Referrals */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-sky-300 transition-all hover:shadow-md group min-h-[148px]">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-600">Referrals</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Share2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-lg sm:text-xl font-black font-mono text-slate-900 group-hover:text-sky-600 transition tracking-tight">
                {loadingOverview ? '...' : totalReferrals}
              </span>
              <span className="text-[11px] font-bold text-sky-600 font-sans">Leads</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1 leading-snug truncate">
              Sales: <span className="font-bold text-emerald-600 font-mono">{purchasedReferrals} Cars</span> ({referralConversionRate.toFixed(1)}%)
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Bonus Given:</span>
            <span className="font-mono font-bold text-sky-700">{Number(referralPointsAwarded).toLocaleString('en-IN')} PTS</span>
          </div>
        </div>
      </div>

      {/* ── 3. Executive Dashboard View ── */}
      {activeSection === 'dashboard' && (
        <div className="space-y-6">
          {/* Main Visual Row 1: Core Departments & Vehicle Models */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Chart 1: Core Business Departments (Sales, Service, Bodyshop, Accessories ONLY) */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>Department Revenue &amp; Loyalty Points</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Vehicle Sales, Workshop Service, Bodyshop Repairs &amp; Genuine Accessories
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-base font-black font-mono text-emerald-600 block leading-tight">
                    {formatInr(totalCashInflow)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Inflow</span>
                </div>
              </div>

              {/* Department Multi-Bar Dynamic Chart */}
              <div className="space-y-4 pt-1">
                {CORE_DEPARTMENT_KEYS.map((catKey) => {
                  const dept = departmentsList.find((d) => d.category === catKey) || {
                    category: catKey,
                    transactions_count: 0,
                    revenue_volume: 0,
                    points_issued: 0,
                  };
                  const cfg = DEPARTMENT_CONFIG[catKey];
                  const maxPts = Math.max(...departmentsList.map((d) => d.points_issued || 1), 1);
                  const barPct = Math.min(Math.round(((dept.points_issued || 0) / maxPts) * 100), 100);

                  return (
                    <div key={catKey} className="space-y-1.5 group">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                            {cfg.label}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                            {dept.transactions_count || 0} Txns
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-slate-900 font-bold">{formatInr(dept.revenue_volume)}</span>
                          <span className="text-slate-300 text-[11px]">&bull;</span>
                          <span className="text-emerald-700 font-bold text-xs">
                            +{Number(dept.points_issued || 0).toLocaleString('en-IN')} PTS
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${cfg.barColor} rounded-full transition-all duration-700`}
                          style={{ width: `${Math.max(barPct, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 2: Vehicle Model-Wise Breakdown (Proper 2W / 4W / Tractor Identification) */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Car className="w-4 h-4 text-indigo-600" />
                    <span>Vehicle Model Distribution</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Enrolled units &amp; loyalty points distribution by model
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-base font-black font-mono text-indigo-600 block leading-tight">
                    {modelsList.reduce((acc, m) => acc + (m.vehicle_count || 0), 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Vehicles Tracked</span>
                </div>
              </div>

              {/* Model Bar Chart List */}
              <div className="space-y-3.5 pt-1">
                {modelsList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading model breakdown...</div>
                ) : (
                  modelsList.slice(0, 7).map((m, idx) => {
                    const meta = getVehicleMeta(m);
                    const maxVehicles = Math.max(...modelsList.map((x) => x.vehicle_count || 1), 1);
                    const pct = Math.min(Math.round(((m.vehicle_count || 0) / maxVehicles) * 100), 100);

                    return (
                      <div key={m.model_name || idx} className="space-y-1.5 group">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                              {m.model_name}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeStyle}`}>
                              {m.brand_name || 'Dealership'} &bull; {meta.categoryLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 font-mono">
                            <span className="font-black text-slate-900">{meta.unitLabel}</span>
                            <span className="text-slate-300 text-[11px]">&bull;</span>
                            <span className="text-indigo-700 font-bold text-xs">
                              {formatPoints(m.points_issued)}
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${meta.barColor} rounded-full transition-all duration-700`}
                            style={{ width: `${Math.max(pct, 5)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Main Visual Row 2: Dedicated Gift Cards & Referral Velocity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Panel 1: Dynamic Gift Cards Performance */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Gift className="w-4 h-4 text-purple-600" />
                    <span>Gift Cards Escrow &amp; Utilization</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Counter voucher passes and customer gifting escrow balance
                  </p>
                </div>
                <span className="text-xs font-black font-mono text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                  {totalGiftCards} Total Cards
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100">
                  <span className="text-[10px] font-bold uppercase text-purple-600 block">Total Escrow</span>
                  <span className="text-base font-black font-mono text-slate-900 mt-0.5 block">
                    {formatInr(totalGiftVolume)}
                  </span>
                </div>
                <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
                  <span className="text-[10px] font-bold uppercase text-amber-700 block">Active Unclaimed</span>
                  <span className="text-base font-black font-mono text-amber-800 mt-0.5 block">
                    {activeUnclaimedGifts} Passes
                  </span>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block">Claimed / Used</span>
                  <span className="text-base font-black font-mono text-emerald-800 mt-0.5 block">
                    {claimedGifts} Passes
                  </span>
                </div>
              </div>

              {/* Progress Meter */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-600 font-bold">Unclaimed Escrow Proportion</span>
                  <span className="font-mono font-black text-purple-700">
                    {totalGiftCards > 0 ? (((totalGiftCards - activeUnclaimedGifts) / totalGiftCards) * 100).toFixed(1) : 0}% Claimed
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all duration-700"
                    style={{
                      width: `${totalGiftCards > 0 ? Math.max((activeUnclaimedGifts / totalGiftCards) * 100, 10) : 50}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Panel 2: Customer Referral Funnel & Points */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-sky-600" />
                    <span>Customer Referral Funnel</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Organic customer acquisitions and bonus points awarded
                  </p>
                </div>
                <span className="text-xs font-black font-mono text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
                  {referralConversionRate.toFixed(1)}% Conversion
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-sky-50/60 rounded-2xl border border-sky-100">
                  <span className="text-[10px] font-bold uppercase text-sky-600 block">Leads Generated</span>
                  <span className="text-base font-black font-mono text-slate-900 mt-0.5 block">
                    {totalReferrals} Advocates
                  </span>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block">Vehicles Delivered</span>
                  <span className="text-base font-black font-mono text-emerald-800 mt-0.5 block">
                    {purchasedReferrals} Delivered
                  </span>
                </div>
                <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100">
                  <span className="text-[10px] font-bold uppercase text-indigo-700 block">Bonus Points</span>
                  <span className="text-base font-black font-mono text-indigo-800 mt-0.5 block">
                    {Number(referralPointsAwarded).toLocaleString('en-IN')} PTS
                  </span>
                </div>
              </div>

              {/* Funnel Meter */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-600 font-bold">Acquisition Conversion Rate</span>
                  <span className="font-mono font-black text-emerald-600">
                    {purchasedReferrals} of {totalReferrals} Leads Converted
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(referralConversionRate, 8)}%` }}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── 4. Live Audit Trail & Ledger Feed Tab ── */}
      {activeSection === 'records' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-5">
            {/* Filter Bar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Customer ID, Name, Phone, Receipt No, or Vehicle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Branch filter */}
                <select
                  value={selectedBranch}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
                >
                  <option value="all">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.branch_id || b.id} value={b.branch_id || b.id}>
                      {b.branch_name || b.name}
                    </option>
                  ))}
                </select>

                {/* Category filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  <option value="sale">Vehicle Sales</option>
                  <option value="service">Workshop Service</option>
                  <option value="bodyshop">Bodyshop</option>
                  <option value="accessory">Accessories</option>
                  <option value="redemption">Redemption</option>
                </select>
              </div>
            </div>

            {/* Audit Records Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="pb-3">Entry ID &amp; Date</th>
                    <th className="pb-3">Customer Profile</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Vehicle Details</th>
                    <th className="pb-3 text-right">Invoiced (₹)</th>
                    <th className="pb-3 text-right">Points Delta</th>
                    <th className="pb-3 text-right">Receipt #</th>
                    <th className="pb-3 text-center">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loadingRecords ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                        <span>Loading audit ledger records...</span>
                      </td>
                    </tr>
                  ) : recordsData.records.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No audit records matched the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    recordsData.records.map((r) => (
                      <tr key={r.entry_id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5">
                          <span className="font-mono font-bold text-slate-900 block">#{r.entry_id}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <span className="font-bold text-slate-900 block">{r.customer_name}</span>
                          <span className="font-mono text-[10px] text-slate-400">{r.customer_id} &bull; {r.customer_phone || '-'}</span>
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${r.category === 'sale'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : r.category === 'service'
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                  : r.category === 'accessory'
                                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                                    : r.category === 'bodyshop'
                                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                                      : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                          >
                            {r.category}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <span className="font-bold text-slate-800 block">{r.vehicle_model || 'Automobile'}</span>
                          <span className="text-[10px] text-slate-400">{r.registration_no || '-'}</span>
                        </td>
                        <td className="py-3.5 text-right font-mono font-bold text-slate-900">
                          {formatInr(r.invoiced_amount)}
                        </td>
                        <td className="py-3.5 text-right font-mono font-bold">
                          <span className={Number(r.points) > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {r.points_formatted || (Number(r.points) > 0 ? `+${r.points}` : r.points)}
                          </span>
                        </td>
                        <td className="py-3.5 text-right font-mono text-slate-500 text-[11px]">
                          {r.receipt_no || '-'}
                        </td>
                        <td className="py-3.5 text-center">
                          <button
                            onClick={() => setInspectedRecord(r)}
                            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition cursor-pointer"
                            title="Inspect Entry"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-xs pt-4 border-t border-slate-100">
                <span className="text-slate-500 font-medium">
                  Showing Page <span className="font-bold text-slate-900">{currentPage}</span> of{' '}
                  <span className="font-bold text-slate-900">{totalPages}</span> ({recordsData.total} Total)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 5. Inspected Record Modal ── */}
      {inspectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Transaction Audit #{inspectedRecord.entry_id}
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  {new Date(inspectedRecord.date).toLocaleString('en-IN')}
                </span>
              </div>
              <button
                onClick={() => setInspectedRecord(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                <span className="text-slate-500 font-bold">Customer:</span>
                <span className="font-bold text-slate-900">
                  {inspectedRecord.customer_name} ({inspectedRecord.customer_id})
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                <span className="text-slate-500 font-bold">Phone Number:</span>
                <span className="font-mono font-bold text-slate-900">{inspectedRecord.customer_phone || '-'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                <span className="text-slate-500 font-bold">Dealership Branch:</span>
                <span className="font-bold text-slate-900">{inspectedRecord.branch_name}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                <span className="text-slate-500 font-bold">Vehicle Model &amp; Reg:</span>
                <span className="font-bold text-slate-900">
                  {inspectedRecord.vehicle_model || 'Automobile'} &bull; {inspectedRecord.registration_no || '-'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                <span className="text-slate-500 font-bold">Invoiced Amount:</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  {formatInr(inspectedRecord.invoiced_amount)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                <span className="text-slate-500 font-bold">Points Impact:</span>
                <span
                  className={`font-mono font-black text-sm ${Number(inspectedRecord.points) > 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                >
                  {Number(inspectedRecord.points) > 0 ? `+${inspectedRecord.points}` : inspectedRecord.points} PTS
                </span>
              </div>
              {inspectedRecord.reason && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 font-bold block mb-1">Reason / Note:</span>
                  <span className="text-slate-800">{inspectedRecord.reason}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setInspectedRecord(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
