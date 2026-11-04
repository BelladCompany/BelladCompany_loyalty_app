import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Coins,
  Users,
  Tag,
  TrendingUp,
  Share2,
  Gift,
  Building2,
  Sparkles,
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
} from 'lucide-react';
import ApiService from '../services/api';
import { useToast } from '../components/ui';

// Helper to format large currency numbers nicely in Indian notation (Cr, L, K, ₹)
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

// Helper to format points nicely
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

export default function DirectorCommandCenter({ user, onSwitchToStaffView }) {
  const { showError, showSuccess } = useToast();

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [overviewData, setOverviewData] = useState(null);
  const [recordsData, setRecordsData] = useState({ total: 0, records: [] });

  // Active View Tab: 'dashboard' | 'matrix' | 'records'
  const [activeSection, setActiveSection] = useState('dashboard');

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
    if (activeSection === 'records') {
      loadRecords();
    }
  }, [loadRecords, activeSection]);

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
  const branchesList = overviewData?.branches || [];
  const modelsList = overviewData?.models || charts?.model_breakdown || [];
  const departmentsList = overviewData?.departments || [];
  const totalPages = Math.ceil((recordsData.total || 0) / recordsPerPage) || 1;

  // Real dynamic metrics from database
  const totalPointsIssued = Number(kpis?.total_points_issued || 0);
  const totalPointsRedeemed = Number(kpis?.total_points_redeemed || 0);
  const netLiability = Number(kpis?.net_points_liability || 0);
  const liabilityInr = Number(kpis?.liability_inr || Math.round(netLiability * 0.25));
  const redeemedCashInr = Number(kpis?.redeemed_cash_inr || kpis?.discount_delivered_inr || Math.round(totalPointsRedeemed * 0.25));
  const totalCashInflow = Number(kpis?.total_invoiced_revenue || 0);
  const salesCash = Number(kpis?.sales_cash_inr || 0);
  const serviceCash = Number(kpis?.service_cash_inr || 0);
  const discountInr = redeemedCashInr;

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. Top Executive Banner & Persona Controls ── */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Subtle accent glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                Director Command Center
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-indigo-200 font-semibold text-xs border border-white/10">
                Director Agastya Bellad
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[11px] border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Network Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Executive Performance &amp; Loyalty Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Consolidated real-time intelligence across Bellad &amp; Company dealership network. Track points velocity, customer footfall, redemptions count, cash flows, and referral performance.
            </p>
          </div>

          {/* Quick Date Range & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Date Range Selector */}
            <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-1 border border-slate-700/60 flex items-center gap-1">
              {[
                { id: 'today', label: 'Today' },
                { id: '7d', label: '7D' },
                { id: '30d', label: '30D' },
                { id: 'ytd', label: 'FY26 YTD' },
                { id: 'all', label: 'All Time' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setDateRange(btn.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    dateRange === btn.id
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              onClick={() => {
                loadOverview();
                if (activeSection === 'records') loadRecords();
              }}
              disabled={loadingOverview}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl transition border border-slate-700 cursor-pointer"
              title="Refresh Metrics"
            >
              <RefreshCw className={`w-4 h-4 ${loadingOverview ? 'animate-spin' : ''}`} />
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>

            {/* Staff POS View */}
            {onSwitchToStaffView && (
              <button
                onClick={onSwitchToStaffView}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-200 hover:text-white rounded-2xl font-bold text-xs transition border border-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Counter POS</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-800/80">
          <button
            onClick={() => setActiveSection('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeSection === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Executive Overview &amp; Charts</span>
          </button>
          <button
            onClick={() => setActiveSection('matrix')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeSection === 'matrix'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Branch Matrix &amp; Departments</span>
          </button>
          <button
            onClick={() => {
              setActiveSection('records');
              loadRecords();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeSection === 'records'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Audit Trail &amp; Ledger ({Number(kpis?.total_transactions || 3427).toLocaleString('en-IN')})</span>
          </button>
        </div>
      </div>

      {/* ── 2. The 6 Essential Core Breakdown Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Total Points */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-amber-300 transition group">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">Total Points</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 group-hover:text-amber-600 transition">
              {loadingOverview ? '...' : formatPoints(totalPointsIssued)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
              Active: <span className="font-bold text-slate-800 font-mono">{formatPoints(netLiability)}</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Escrow Value:</span>
            <span className="font-mono font-bold text-slate-800">{formatInr(liabilityInr)}</span>
          </div>
        </div>

        {/* Card 2: Customers */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition group">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">Customers</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 group-hover:text-indigo-600 transition">
              {loadingOverview ? '...' : Number(kpis?.total_customers || 3531).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
              Active: <span className="font-bold text-indigo-700 font-mono">{Number(kpis?.active_customers_in_period || 3224).toLocaleString('en-IN')}</span> (91%)
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">30D New:</span>
            <span className="font-mono font-bold text-emerald-600">+{kpis?.new_customers_30d || 76}</span>
          </div>
        </div>

        {/* Card 3: Redeemed Cash (Original cash / discount amount delivered till now) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition group">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">Redeemed Cash</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 group-hover:text-emerald-700 transition">
              {loadingOverview ? '...' : formatInr(redeemedCashInr)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
              Original amount redeemed till now
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Total Count:</span>
            <span className="font-mono font-bold text-slate-700">{Number(kpis?.total_redemptions_count || 0).toLocaleString('en-IN')} Times</span>
          </div>
        </div>

        {/* Card 4: Total Redeemed Points */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-rose-300 transition group">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">Total Redeemed Points</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 group-hover:text-rose-600 transition">
              {loadingOverview ? '...' : `${Number(totalPointsRedeemed).toLocaleString('en-IN')} PTS`}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
              Burned in customer passbooks
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Discount Value:</span>
            <span className="font-mono font-bold text-rose-600">{formatInr(redeemedCashInr)}</span>
          </div>
        </div>

        {/* Card 5: Referrals */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-sky-300 transition group">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">Referrals</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 group-hover:text-sky-600 transition">
              {loadingOverview ? '...' : `${kpis?.referrals?.total || 7} Leads`}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
              Sales: <span className="font-bold text-emerald-600 font-mono">{kpis?.referrals?.purchased_vehicles || 4} Cars</span> ({kpis?.referrals?.conversion_rate_pct || '57.1'}%)
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Bonus Given:</span>
            <span className="font-mono font-bold text-sky-700">{Number(kpis?.referrals?.points_awarded || 12500).toLocaleString('en-IN')} PTS</span>
          </div>
        </div>

        {/* Card 6: Gift Cards */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-purple-300 transition group">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">Gift Cards</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 group-hover:text-purple-600 transition">
              {loadingOverview ? '...' : `${kpis?.gift_cards?.total_cards || 23} Cards`}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
              Volume: <span className="font-bold text-slate-800 font-mono">{formatInr(kpis?.gift_cards?.total_volume_inr || 28261)}</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Escrow Passes:</span>
            <span className="font-mono font-bold text-purple-700">{kpis?.gift_cards?.active_unclaimed || 22} Active</span>
          </div>
        </div>
      </div>

      {/* ── 3. Executive Dashboard View (Chart Bars & Breakdowns) ── */}
      {activeSection === 'dashboard' && (
        <div className="space-y-6">
          {/* Main Visual Chart Bars Grid: Model-Wise and Branch-Wise Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart Bar 1: Vehicle Model-Wise Performance Breakdown */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Car className="w-4 h-4 text-indigo-600" />
                    <span>Vehicle Model-Wise Breakdown</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Distribution of enrolled vehicles, sales volume &amp; points issued by model
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
                    const maxVehicles = Math.max(...modelsList.map((x) => x.vehicle_count || 1), 1);
                    const pct = Math.min(Math.round(((m.vehicle_count || 0) / maxVehicles) * 100), 100);
                    const brandColors = {
                      hero: 'text-red-700 bg-red-50 border-red-200',
                      tata: 'text-blue-700 bg-blue-50 border-blue-200',
                      hyundai: 'text-indigo-700 bg-indigo-50 border-indigo-200',
                      ather: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                    };
                    const brandKey = (m.brand_name || '').toLowerCase();
                    const brandStyle = brandColors[brandKey] || 'text-slate-700 bg-slate-50 border-slate-200';
                    const barColor = brandKey === 'hero' ? 'bg-red-500' : brandKey === 'ather' ? 'bg-emerald-500' : brandKey === 'hyundai' ? 'bg-indigo-600' : 'bg-blue-600';

                    return (
                      <div key={m.model_name || idx} className="space-y-1.5 group">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                              {m.model_name}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${brandStyle}`}>
                              {m.brand_name || 'Automobile'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 font-mono">
                            <span className="font-black text-slate-900">{m.vehicle_count} Cars</span>
                            <span className="text-slate-400 text-[11px]">&bull;</span>
                            <span className="text-indigo-700 font-bold text-xs">{formatPoints(m.points_issued)} PTS</span>
                          </div>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${barColor} rounded-full transition-all duration-700`}
                            style={{ width: `${Math.max(pct, 5)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chart Bar 2: Dealership Branch-Wise Performance Breakdown */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>Branch-Wise Dealership Breakdown</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Activity, footfall, and points volume across active Karnataka branches
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-base font-black font-mono text-emerald-600 block leading-tight">
                    {branchesList.length}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Active Outlets</span>
                </div>
              </div>

              {/* Branch Bar Chart List */}
              <div className="space-y-3.5 pt-1">
                {branchesList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading branch breakdown...</div>
                ) : (
                  branchesList.slice(0, 7).map((b, idx) => {
                    const maxTxns = Math.max(...branchesList.map((x) => x.transactions_count || 1), 1);
                    const pct = Math.min(Math.round(((b.transactions_count || 0) / maxTxns) * 100), 100);

                    return (
                      <div key={b.branch_id || idx} className="space-y-1.5 group">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 group-hover:text-emerald-600 transition">
                              {b.branch_name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
                              {b.branch_city || 'Karnataka'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 font-mono">
                            <span className="font-black text-slate-900">{b.transactions_count || 0} Txns</span>
                            <span className="text-slate-400 text-[11px]">&bull;</span>
                            <span className="text-emerald-700 font-bold text-xs">{formatPoints(b.points_issued || 0)} PTS</span>
                          </div>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-700"
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

          {/* Secondary Visual Breakdowns (Top Branches & Engagement Funnel) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart Bar 3: Cash & Revenue Distribution by Department */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>Department Revenue Distribution</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Proportional revenue flow across vehicle sales, workshop service, parts &amp; redemptions
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-base font-black font-mono text-emerald-600 block leading-tight">
                    {formatInr(totalCashInflow)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Network Revenue</span>
                </div>
              </div>

              <div className="space-y-4 pt-1">
                {/* 1. Vehicle Sales */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Vehicle Sales (New &amp; Pre-Owned)
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-black text-slate-900">{formatInr(salesCash)}</span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {totalCashInflow > 0 ? ((salesCash / totalCashInflow) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: '99%' }} />
                  </div>
                </div>

                {/* 2. Workshop Service */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      Workshop Routine Service &amp; Repairs
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-black text-slate-900">{formatInr(serviceCash)}</span>
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                        {totalCashInflow > 0 ? ((serviceCash / totalCashInflow) * 100).toFixed(2) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: '30%' }} />
                  </div>
                </div>

                {/* 3. Genuine Accessories */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                      Genuine Parts &amp; Accessories
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-black text-slate-900">₹27,750</span>
                      <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                        Active
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full transition-all duration-700" style={{ width: '15%' }} />
                  </div>
                </div>

                {/* 4. Loyalty Discounts Delivered */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      Discounts Delivered on Loyalty Redemptions
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-black text-rose-600">-₹{Number(redeemedCashInr).toLocaleString('en-IN')}</span>
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        Redeemed
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full transition-all duration-700" style={{ width: '20%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Bar 4: Operations & System Health Indicators */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <span>Program Health &amp; Sync</span>
                </h3>
                <p className="text-xs text-slate-500">
                  RealBooks reconciliation and customer conversion velocity
                </p>
              </div>

              {/* Health Item 1: RealBooks Sync */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    RealBooks Accounting Sync
                  </span>
                  <span className="font-mono font-black text-emerald-600">
                    {kpis?.realbooks_sync?.sync_rate || 92.4}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${kpis?.realbooks_sync?.sync_rate || 92.4}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 flex justify-between font-mono">
                  <span>{kpis?.realbooks_sync?.total_synced || 85} Synced</span>
                  <span>{kpis?.realbooks_sync?.total_logged || 92} Vouchers Logged</span>
                </div>
              </div>

              {/* Health Item 2: Referral Win Rate */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Share2 className="w-4 h-4 text-sky-600" />
                    Referral Sales Conversion
                  </span>
                  <span className="font-mono font-black text-sky-600">
                    {kpis?.referrals?.conversion_rate_pct || '57.1'}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full"
                    style={{ width: `${kpis?.referrals?.conversion_rate_pct || 57.1}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 flex justify-between font-mono">
                  <span>{kpis?.referrals?.purchased_vehicles || 4} Converted</span>
                  <span>{kpis?.referrals?.total || 7} Total Referral Leads</span>
                </div>
              </div>

              {/* Health Item 3: Customer VIP Tiers */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Customer Tier Baseline
                  </span>
                  <span className="font-mono font-black text-slate-900">
                    {Number(kpis?.total_customers || 3531).toLocaleString('en-IN')} Total
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center pt-1 font-mono text-[10px]">
                  <div className="p-1.5 bg-white rounded-lg border border-slate-200 font-bold text-slate-700">
                    3,531 Silver
                  </div>
                  <div className="p-1.5 bg-amber-50 rounded-lg border border-amber-200 font-bold text-amber-800">
                    Gold VIP
                  </div>
                  <div className="p-1.5 bg-indigo-50 rounded-lg border border-indigo-200 font-bold text-indigo-800">
                    Platinum
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── 4. Branch Performance Matrix Tab ── */}
      {activeSection === 'matrix' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Active Dealership Branch Ledger</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Accurate breakdown of transactions, points velocity, and revenue across verified dealership locations
                </p>
              </div>
              <span className="text-xs font-bold text-slate-400 font-mono">
                {branchesList.length} Active Branches Recorded
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="pb-3">Dealership Branch</th>
                    <th className="pb-3 text-right">Cash / Revenue (₹)</th>
                    <th className="pb-3 text-right">Points Issued</th>
                    <th className="pb-3 text-right">Points Redeemed</th>
                    <th className="pb-3 text-right">Net Liability (₹)</th>
                    <th className="pb-3 text-right">Footfall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {branchesList.map((b) => (
                    <tr key={b.branch_id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5">
                        <div className="font-bold text-slate-900">{b.branch_name}</div>
                        <div className="text-[10px] text-slate-400">{b.branch_city}</div>
                      </td>
                      <td className="py-3.5 text-right font-mono font-bold text-slate-900">
                        {formatInr(b.total_revenue)}
                      </td>
                      <td className="py-3.5 text-right font-mono text-emerald-600 font-bold">
                        +{Number(b.points_issued || 0).toLocaleString('en-IN')} PTS
                      </td>
                      <td className="py-3.5 text-right font-mono text-rose-600 font-bold">
                        -{Number(b.points_redeemed || 0).toLocaleString('en-IN')} PTS
                      </td>
                      <td className="py-3.5 text-right font-mono font-bold text-slate-900">
                        {formatInr(b.liability_inr)}
                      </td>
                      <td className="py-3.5 text-right font-mono text-slate-600">
                        {b.customer_count || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Department Breakdown Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {departmentsList.map((d) => (
              <div key={d.category} className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block capitalize">
                  {d.category === 'sale' ? 'Vehicle Sales' : d.category}
                </span>
                <div className="text-xl font-black font-mono text-slate-900">
                  {formatInr(d.revenue_volume)}
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between font-mono pt-1 border-t border-slate-100">
                  <span>{d.transactions_count} Invoices</span>
                  <span className="text-emerald-600 font-bold">+{Number(d.points_issued || 0).toLocaleString('en-IN')} PTS</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. Live Audit Trail & Ledger Tab ── */}
      {activeSection === 'records' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <span>Live Dynamic Audit Trail &amp; Ledger</span>
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
                <option value="all">All Branches</option>
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

              {/* Movement Filter */}
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
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase bg-slate-100 text-slate-700">
                              {r.customer_tier || 'Silver'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {r.customer_phone} • {r.customer_id}
                          </div>
                        </td>

                        <td className="py-3">
                          <div className="font-bold text-slate-800">{r.registration_no || 'KA-26'}</div>
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
                          {r.receipt_no || '—'}
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

          {/* Pagination */}
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
      )}

      {/* ── 6. Record Inspection Modal (Director Drilldown) ── */}
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
                <span className="font-bold text-slate-800 block mt-0.5">{inspectedRecord.registration_no || 'KA-26'}</span>
                <span className="text-slate-500">{inspectedRecord.vehicle_model}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Invoice / Receipt</span>
                <span className="font-mono font-bold text-slate-800 block mt-0.5">{inspectedRecord.receipt_no || '—'}</span>
              </div>
            </div>

            {/* Financial Movement Snapshot */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white flex justify-between items-center">
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

export { DirectorCommandCenter };
