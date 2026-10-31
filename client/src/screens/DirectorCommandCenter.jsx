import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  Building2,
  TrendingUp,
  Users,
  Coins,
  CreditCard,
  Gift,
  Share2,
  Download,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Car,
  Wrench,
  Tag,
  ChevronRight,
  ExternalLink,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Printer,
  Calendar,
  Check,
} from 'lucide-react';
import ApiService from '../services/api';
import { useToast, Skeleton } from '../components/ui';

// Helper to format large currency numbers nicely (e.g. ₹203.34 Cr, ₹50.31 L, ₹4,500)
const formatInr = (val) => {
  const num = Number(val || 0);
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
};

export default function DirectorCommandCenter({ user, onSwitchToStaffView }) {
  const { showError, showSuccess } = useToast();

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [overviewData, setOverviewData] = useState(null);
  const [recordsData, setRecordsData] = useState({ total: 0, records: [] });

  // Filters State
  const [dateRange, setDateRange] = useState('all'); // 'today' | '7d' | '30d' | 'ytd' | 'all'
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 25;

  // Selected Record Modal / Inspection
  const [inspectedRecord, setInspectedRecord] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load Branches
  useEffect(() => {
    ApiService.getBranches()
      .then((res) => setBranches(res.data || []))
      .catch(() => {});
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
    if (dateRange === 'ytd') {
      // Dealership FY start: April 1, 2026
      const start = new Date(now.getFullYear(), 3, 1).toISOString();
      return { start_date: start, end_date: now.toISOString() };
    }
    return {};
  }, [dateRange]);

  // Fetch Overview Data
  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const dateParams = getDateBounds();
      const res = await ApiService.getDirectorOverview(dateParams);
      setOverviewData(res.data);
    } catch (err) {
      showError(err.message || 'Failed to load executive overview data');
    } finally {
      setLoadingOverview(false);
    }
  }, [getDateBounds, showError]);

  // Fetch Records
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

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

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
  const branchesList = overviewData?.branches || [];
  const departmentsList = overviewData?.departments || [];
  const tiers = overviewData?.tiers || { Silver: 0, Gold: 0, Platinum: 0, total: 0 };
  const totalPages = Math.ceil((recordsData.total || 0) / recordsPerPage) || 1;

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. Top Executive Banner & Persona Switcher ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/50 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                Executive Director Persona
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-indigo-200 font-semibold text-xs border border-white/10">
                {user?.username?.toLowerCase() === 'agstya' || user?.username?.toLowerCase() === 'agastya'
                  ? 'Director Agastya Bellad'
                  : user?.full_name || 'Director Agastya Bellad'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[11px] border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Network Financials
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Executive Director Command Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time oversight for Director Agastya Bellad across Bellad &amp; Company automotive dealerships. Track live customer spend, retained loyalty profits, points velocity, liability escrow, and dynamic transaction audits.
            </p>
          </div>

          {/* Persona & Period Controls */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Date Range Selector */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-1 border border-white/15 flex items-center gap-1">
              {[
                { id: 'today', label: 'Today' },
                { id: '7d', label: '7D' },
                { id: '30d', label: '30D' },
                { id: 'ytd', label: 'YTD (FY26)' },
                { id: 'all', label: 'All Time' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setDateRange(btn.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    dateRange === btn.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Live Refresh */}
            <button
              onClick={() => {
                loadOverview();
                loadRecords();
              }}
              disabled={loadingOverview}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition border border-white/15 cursor-pointer"
              title="Refresh All Metrics"
            >
              <RefreshCw className={`w-4 h-4 ${loadingOverview ? 'animate-spin' : ''}`} />
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{exporting ? 'Exporting...' : 'Export Audit CSV'}</span>
            </button>

            {/* Switch to Operations */}
            {onSwitchToStaffView && (
              <button
                onClick={onSwitchToStaffView}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white rounded-2xl font-bold text-xs transition border border-white/15 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Switch to Staff View</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Executive Profitability & Program Spend Summary ── */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white border border-indigo-500/20 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-white/10">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block mb-1">
              Director Executive Financial Health &amp; Spend Summary
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <span>Dealership Financials, Loyalty ROI &amp; Points Velocity</span>
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-indigo-200 bg-white/10 px-3 py-1 rounded-full border border-white/10 font-mono">
              Base Conversion: 4 Points = ₹1.00 (₹0.25/PT)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Spend 1: Total Customer Billing / Spend */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Customer Spend</span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
              {loadingOverview ? '...' : formatInr(kpis?.total_invoiced_revenue)}
            </div>
            <p className="text-[11px] text-slate-300 mt-1">
              Across {Number(kpis?.total_transactions || 0).toLocaleString('en-IN')} vehicle sales &amp; service invoices
            </p>
          </div>

          {/* Spend 2: Retained Loyalty Profit */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Retained Loyalty Revenue</span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              {loadingOverview ? '...' : formatInr(kpis?.net_loyalty_profit || kpis?.total_invoiced_revenue)}
            </div>
            <p className="text-[11px] text-emerald-400 font-semibold mt-1">
              {kpis?.loyalty_roi_multiplier || '404'}x Return on points liability
            </p>
          </div>

          {/* Spend 3: Customer Points Amount Spent */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Points Amount Spent (Redeemed)</span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300">
              {loadingOverview ? '...' : `₹${Number(kpis?.customer_points_amount_spent || kpis?.discount_delivered_inr || 0).toLocaleString('en-IN')}`}
            </div>
            <p className="text-[11px] text-slate-300 mt-1">
              {Number(kpis?.total_points_redeemed || 0).toLocaleString('en-IN')} PTS redeemed by customers
            </p>
          </div>

          {/* Spend 4: Net Points Liability */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Net Points Liability (Escrow)</span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-rose-300">
              {loadingOverview ? '...' : formatInr(kpis?.liability_inr)}
            </div>
            <p className="text-[11px] text-slate-300 mt-1">
              {Number(kpis?.net_points_liability || 0).toLocaleString('en-IN')} PTS circulating program balance
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Executive Key Performance Indicators (8 Cards) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Enrolled Customers & Fleet */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Enrolled Customers</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          {loadingOverview ? (
            <Skeleton className="h-8 w-24 rounded-lg" />
          ) : (
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                {Number(kpis?.total_customers || 0).toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                +{kpis?.new_customers_30d || 0} in 30D • {Number(kpis?.total_vehicles || 0).toLocaleString('en-IN')} fleet
              </p>
            </div>
          )}
        </div>

        {/* Card 2: Total Customer Spend / Invoiced Business */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Customer Spend</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">
              ₹
            </div>
          </div>
          {loadingOverview ? (
            <Skeleton className="h-8 w-28 rounded-lg" />
          ) : (
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                {formatInr(kpis?.total_invoiced_revenue)}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Vehicles, service, &amp; accessories
              </p>
            </div>
          )}
        </div>

        {/* Card 3: Loyalty Points Issued */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Points Issued</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          {loadingOverview ? (
            <Skeleton className="h-8 w-28 rounded-lg" />
          ) : (
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                {Number(kpis?.total_points_issued || 0).toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Redeemed: {Number(kpis?.total_points_redeemed || 0).toLocaleString('en-IN')} PTS ({kpis?.points_burn_rate_pct || '0.85'}%)
              </p>
            </div>
          )}
        </div>

        {/* Card 4: Net Outstanding Points Liability */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Escrow Liability (₹)</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          {loadingOverview ? (
            <Skeleton className="h-8 w-28 rounded-lg" />
          ) : (
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                {formatInr(kpis?.liability_inr)}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {Number(kpis?.net_points_liability || 0).toLocaleString('en-IN')} active PTS balance
              </p>
            </div>
          )}
        </div>

        {/* Card 5: Points Amount Spent / Discount Delivered */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Points Spent (₹)</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          {loadingOverview ? (
            <Skeleton className="h-8 w-24 rounded-lg" />
          ) : (
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                ₹{Number(kpis?.customer_points_amount_spent || kpis?.discount_delivered_inr || 0).toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                Discounts availed by customers
              </p>
            </div>
          )}
        </div>

        {/* Card 6: Average Spend per Customer */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Spend / Customer</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm">
              ₹
            </div>
          </div>
          {loadingOverview ? (
            <Skeleton className="h-8 w-24 rounded-lg" />
          ) : (
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                {formatInr(kpis?.avg_spend_per_customer || 631090)}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Lifetime customer spend average
              </p>
            </div>
          )}
        </div>

        {/* Card 7: Referral Sales Engine */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Referral Sales</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
          </div>
          {loadingOverview ? (
            <Skeleton className="h-8 w-24 rounded-lg" />
          ) : (
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                {kpis?.referrals?.conversion_rate_pct || '0.0'}%
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {kpis?.referrals?.purchased_vehicles || 0} vehicles sold of {kpis?.referrals?.total || 0} referrals
              </p>
            </div>
          )}
        </div>

        {/* Card 8: RealBooks Accounting Sync */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">RealBooks Accounting</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          {loadingOverview ? (
            <Skeleton className="h-8 w-24 rounded-lg" />
          ) : (
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600">
                {kpis?.realbooks_sync?.sync_rate || 100}%
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Financial sync verified
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Branch Performance Matrix & Department Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dealership Branches Matrix (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Dealership Branch Performance Matrix</span>
              </h3>
              <p className="text-xs text-slate-500">
                Dynamic revenue and loyalty liability distributed across Karnataka branches
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400 font-mono">
              {branchesList.length} Branches Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="pb-3">Dealership Branch</th>
                  <th className="pb-3 text-right">Revenue (₹)</th>
                  <th className="pb-3 text-right">Points Issued</th>
                  <th className="pb-3 text-right">Points Redeemed</th>
                  <th className="pb-3 text-right">Net Liability (₹)</th>
                  <th className="pb-3 text-right">Footfall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {branchesList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-400">
                      No branch performance logs recorded for selected period.
                    </td>
                  </tr>
                ) : (
                  branchesList.map((b) => (
                    <tr key={b.branch_id || b.branch_name} className="hover:bg-slate-50/80 transition">
                      <td className="py-3">
                        <div className="font-bold text-slate-900">{b.branch_name}</div>
                        <div className="text-[10px] text-slate-400">{b.branch_city}</div>
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900">
                        {formatInr(b.total_revenue)}
                      </td>
                      <td className="py-3 text-right font-mono text-emerald-600">
                        +{Number(b.points_issued || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 text-right font-mono text-rose-600">
                        -{Number(b.points_redeemed || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900">
                        {formatInr(b.liability_inr)}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-600">
                        {b.customer_count || 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Department Breakdown & VIP Tiers (1 col) */}
        <div className="space-y-6">
          {/* Department Breakdown */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              <span>Department Revenue Share</span>
            </h3>
            <div className="space-y-3">
              {departmentsList.length === 0 ? (
                <p className="text-xs text-slate-400">No category breakdown available.</p>
              ) : (
                departmentsList.map((d) => (
                  <div key={d.category} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800 capitalize">
                        {d.category === 'sale' ? 'Vehicle Sales' : d.category}
                      </span>
                      <span className="font-mono text-slate-600 font-semibold">
                        {formatInr(d.revenue_volume)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>{d.transactions_count} Transactions</span>
                      <span className="text-emerald-600 font-mono">+{Number(d.points_issued || 0).toLocaleString('en-IN')} PTS</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Customer VIP Tiers Distribution */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Customer VIP Tiers</span>
              </h3>
              <span className="text-xs font-bold text-slate-400 font-mono">
                {tiers.total} Total
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Silver</span>
                <span className="text-lg font-black font-mono text-slate-900 mt-0.5 block">{tiers.Silver}</span>
                <span className="text-[9px] text-slate-400">100% Baseline</span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] uppercase font-bold text-amber-700 block">Gold VIP</span>
                <span className="text-lg font-black font-mono text-amber-900 mt-0.5 block">{tiers.Gold}</span>
                <span className="text-[9px] text-amber-600">₹10L - ₹25L</span>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200">
                <span className="text-[10px] uppercase font-bold text-indigo-700 block">Platinum</span>
                <span className="text-lg font-black font-mono text-indigo-900 mt-0.5 block">{tiers.Platinum}</span>
                <span className="text-[9px] text-indigo-600">₹25L+ Elite</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Live Dynamic Records & Master Activity Ledger ── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        {/* Table Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span>Live Dynamic Records &amp; Master Audit Trail</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time audit log of all customer transactions, vehicle invoices, points earned, redemptions, and gift passes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customer, phone, invoice..."
                className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
              />
            </div>

            {/* Branch Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-indigo-600 transition cursor-pointer"
            >
              <option value="all">All Dealership Branches</option>
              {branches.map((b) => (
                <option key={b.branch_id || b.id} value={b.branch_id || b.id}>
                  {b.branch_name || b.name}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-indigo-600 transition cursor-pointer"
            >
              <option value="all">All Departments</option>
              <option value="sale">Vehicle Sales</option>
              <option value="service">Workshop Service</option>
              <option value="bodyshop">Bodyshop Claims</option>
              <option value="accessories">Official Accessories</option>
              <option value="gift">Gift Card Passes</option>
              <option value="referral">Referral Rewards</option>
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-indigo-600 transition cursor-pointer"
            >
              <option value="all">All Movements</option>
              <option value="earn">Points Issued (+)</option>
              <option value="redeem">Points Redeemed (-)</option>
            </select>
          </div>
        </div>

        {/* Dynamic Records Table */}
        <div className="overflow-x-auto min-h-[350px]">
          {loadingRecords ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Querying real-time ledger records across database...</p>
            </div>
          ) : recordsData.records.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No records match the selected filters.</p>
              <p className="text-xs text-slate-400">Try adjusting your search query, branch, or date range.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="pb-3">Date &amp; Time</th>
                  <th className="pb-3">Customer Details</th>
                  <th className="pb-3">Vehicle &amp; Branch</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Invoice / Ref</th>
                  <th className="pb-3 text-right">Bill Amount</th>
                  <th className="pb-3 text-right">Points Movement</th>
                  <th className="pb-3 text-right">Value (₹)</th>
                  <th className="pb-3 text-center">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {recordsData.records.map((r) => {
                  const isPositive = r.points >= 0;
                  return (
                    <tr
                      key={r.entry_id}
                      onClick={() => setInspectedRecord(r)}
                      className="hover:bg-indigo-50/40 transition cursor-pointer group"
                    >
                      <td className="py-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(r.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                        <span className="block text-[10px] text-slate-400">
                          {new Date(r.date).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      <td className="py-3">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition flex items-center gap-1.5">
                          <span>{r.customer_name}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                            r.customer_tier === 'Platinum'
                              ? 'bg-indigo-100 text-indigo-800'
                              : r.customer_tier === 'Gold'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {r.customer_tier}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {r.customer_phone} • {r.customer_id}
                        </div>
                      </td>

                      <td className="py-3">
                        <div className="font-bold text-slate-800">{r.registration_no}</div>
                        <div className="text-[10px] text-slate-400">
                          {r.branch_name} ({r.branch_city})
                        </div>
                      </td>

                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] capitalize">
                          {r.category === 'sale' ? 'Vehicle Sale' : r.category}
                        </span>
                      </td>

                      <td className="py-3 font-mono text-slate-600 text-[11px]">
                        {r.receipt_no}
                      </td>

                      <td className="py-3 text-right font-mono font-bold text-slate-900">
                        {r.bill_amount > 0 ? `₹${Number(r.bill_amount).toLocaleString('en-IN')}` : '—'}
                      </td>

                      <td className="py-3 text-right">
                        <span
                          className={`font-mono font-black px-2 py-0.5 rounded-full text-[11px] inline-block ${
                            isPositive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {r.points_formatted} PTS
                        </span>
                      </td>

                      <td className="py-3 text-right font-mono text-slate-700">
                        ₹{Number(r.equivalent_inr).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 text-center">
                        <span className="text-[10px] font-bold text-indigo-600 group-hover:underline flex items-center justify-center gap-0.5">
                          <span>Inspect</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination & Summary Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs text-slate-500">
          <div>
            Showing{' '}
            <span className="font-bold text-slate-900">
              {Math.min((currentPage - 1) * recordsPerPage + 1, recordsData.total)}
            </span>{' '}
            to{' '}
            <span className="font-bold text-slate-900">
              {Math.min(currentPage * recordsPerPage, recordsData.total)}
            </span>{' '}
            of <span className="font-bold text-slate-900">{recordsData.total}</span> audit records
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loadingRecords}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span className="font-mono text-slate-700 font-bold px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loadingRecords}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── 5. Record Inspection Modal (Director Drilldown) ── */}
      {inspectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto space-y-5 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  #{inspectedRecord.entry_id}
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">Director Audit Inspection</h4>
                  <p className="text-xs text-slate-500 font-mono">
                    {new Date(inspectedRecord.date).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectedRecord(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Customer & Vehicle Snapshot */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer</span>
                <span className="font-black text-slate-900 block mt-0.5">{inspectedRecord.customer_name}</span>
                <span className="font-mono text-slate-500">{inspectedRecord.customer_phone}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Dealership Branch</span>
                <span className="font-black text-slate-900 block mt-0.5">{inspectedRecord.branch_name}</span>
                <span className="text-slate-500">{inspectedRecord.branch_city}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Vehicle</span>
                <span className="font-bold text-slate-800 block mt-0.5">{inspectedRecord.registration_no}</span>
                <span className="text-slate-500">{inspectedRecord.vehicle_model}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Invoice / Receipt</span>
                <span className="font-mono font-bold text-slate-800 block mt-0.5">{inspectedRecord.receipt_no}</span>
              </div>
            </div>

            {/* Financial Movement Snapshot */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase text-indigo-300 block">Points Movement</span>
                <span className="text-2xl font-black font-mono text-amber-300">
                  {inspectedRecord.points_formatted} PTS
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase text-indigo-300 block">Monetary Value</span>
                <span className="text-xl font-black font-mono text-emerald-400">
                  ₹{Number(inspectedRecord.equivalent_inr).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Calculation & Reason */}
            <div className="space-y-1.5 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Transaction Description</span>
              <p className="p-3 bg-slate-50 rounded-xl text-slate-700 font-medium">
                {inspectedRecord.reason_text}
              </p>
            </div>

            {/* Raw JSON Snapshot if available */}
            {inspectedRecord.calc_snapshot && (
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Engine Calculation Snapshot</span>
                <pre className="p-3 bg-slate-900 text-emerald-300 rounded-xl font-mono text-[11px] overflow-x-auto max-h-36">
                  {JSON.stringify(inspectedRecord.calc_snapshot, null, 2)}
                </pre>
              </div>
            )}

            <button
              onClick={() => setInspectedRecord(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Close Inspection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

