import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  Download,
  Filter,
  RefreshCw,
  Users,
  Coins,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Search,
  Car,
  Wrench,
  Gift,
  Tag,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  Sparkles,
  ShoppingBag,
  Layers,
} from 'lucide-react';
import ApiService from '../services/api';
import { useToast, Skeleton } from '../components/ui';

// Curated vehicle brands
const CURATED_BRANDS = [
  'TATA MOTORS',
  'HYUNDAI',
  'ATHER ENERGY',
  'HERO MOTO CORP',
  'MG MOTORS',
  'SWARAJ',
  'Maruti Suzuki',
  'Vida',
];

export default function ReportsScreen({ user }) {
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dropdown Options from DB
  const [branches, setBranches] = useState([]);
  const [brands, setBrands] = useState([]);

  // Active Parameter Filters
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Drilldown search
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [reportData, setReportData] = useState({
    summary: [],
    transactions: [],
    totals: {
      total_transactions: 0,
      total_customers: 0,
      total_customers_redeemed: 0,
      total_points_issued: 0,
      total_points_redeemed: 0,
      net_points_balance: 0,
      equivalent_issued_rs: 0,
      equivalent_redeemed_rs: 0,
    },
  });

  // Load Branches & Brands metadata on mount
  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [branchRes, brandRes] = await Promise.all([
        ApiService.getBranches().catch(() => ({ data: [] })),
        ApiService.request('/brands').catch(() => ({ data: [] })),
      ]);
      setBranches(branchRes.data || []);
      setBrands(brandRes.data || []);
    } catch (e) {
      console.warn('Failed to load filter metadata:', e);
    }
  };

  const buildFilterParams = useCallback(() => {
    const params = {};
    if (selectedBranch && selectedBranch !== 'all') params.branch_id = selectedBranch;
    if (selectedBrand && selectedBrand !== 'all') {
      // Check if numeric brand ID or text brand name
      if (!isNaN(selectedBrand)) {
        params.brand_id = selectedBrand;
      } else {
        params.brand_name = selectedBrand;
      }
    }
    if (selectedCategory && selectedCategory !== 'all') params.category = selectedCategory;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return params;
  }, [selectedBranch, selectedBrand, selectedCategory, startDate, endDate]);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = buildFilterParams();

    try {
      const res = await ApiService.getPointsSummaryReport(params);
      const data = res.data || {};

      if (Array.isArray(data)) {
        // Fallback if raw array returned
        const summary = data;
        const total_issued = summary.reduce((s, r) => s + (r.total_points_issued || 0), 0);
        const total_redeemed = summary.reduce((s, r) => s + (r.total_points_redeemed || 0), 0);
        const total_tx = summary.reduce((s, r) => s + (r.total_transactions || 0), 0);
        const total_cust = summary.reduce((s, r) => s + (r.total_customers || 0), 0);
        const total_cust_rdm = summary.reduce((s, r) => s + (r.customers_redeemed || 0), 0);

        setReportData({
          summary,
          transactions: [],
          totals: {
            total_transactions: total_tx,
            total_customers: total_cust,
            total_customers_redeemed: total_cust_rdm,
            total_points_issued: total_issued,
            total_points_redeemed: total_redeemed,
            net_points_balance: total_issued - total_redeemed,
            equivalent_issued_rs: Math.floor(total_issued / 4),
            equivalent_redeemed_rs: Math.floor(total_redeemed / 4),
          },
        });
      } else {
        setReportData({
          summary: data.summary || [],
          transactions: data.transactions || [],
          totals: data.totals || {
            total_transactions: 0,
            total_customers: 0,
            total_customers_redeemed: 0,
            total_points_issued: 0,
            total_points_redeemed: 0,
            net_points_balance: 0,
            equivalent_issued_rs: 0,
            equivalent_redeemed_rs: 0,
          },
        });
      }
    } catch (err) {
      console.error('Failed to load report data:', err);
      setError(err.message || 'Failed to load dynamic report analytics.');
    } finally {
      setLoading(false);
    }
  }, [buildFilterParams]);

  // Re-fetch data whenever any filter changes
  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Quick Date Range Helpers
  const handleSetDateRange = (rangeType) => {
    const now = new Date();
    if (rangeType === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (rangeType === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (rangeType === 'last30') {
      const prior = new Date();
      prior.setDate(prior.getDate() - 30);
      setStartDate(prior.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (rangeType === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    }
  };

  const handleResetFilters = () => {
    setSelectedBranch('');
    setSelectedBrand('');
    setSelectedCategory('');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  const handleExportCsv = async () => {
    const params = buildFilterParams();
    try {
      await ApiService.downloadReportCsv('points-summary', params);
      showSuccess('Dynamic report CSV exported successfully.');
    } catch (err) {
      showError(`CSV Export Error: ${err.message}`);
    }
  };

  // Departmental aggregations (Sales, Service, Bodyshop, Accessories, Redemptions)
  const departmentalBreakdown = useMemo(() => {
    const summary = reportData.summary || [];
    const salesRows = summary.filter((r) => String(r.category).toLowerCase().includes('sale'));
    const serviceRows = summary.filter(
      (r) => String(r.category).toLowerCase().includes('service') && !String(r.category).toLowerCase().includes('body')
    );
    const bodyshopRows = summary.filter(
      (r) => String(r.category).toLowerCase().includes('body') || String(r.category).toLowerCase().includes('bodyshop')
    );
    const accessoryRows = summary.filter(
      (r) =>
        String(r.category).toLowerCase().includes('accessory') ||
        String(r.category).toLowerCase().includes('accessories') ||
        String(r.category).toLowerCase().includes('spare')
    );
    const redemptionRows = summary.filter((r) => String(r.category).toLowerCase().includes('redemption'));

    return {
      sales: {
        transactions: salesRows.reduce((s, r) => s + r.total_transactions, 0),
        customers: salesRows.reduce((s, r) => s + r.total_customers, 0),
        customers_redeemed: salesRows.reduce((s, r) => s + r.customers_redeemed, 0),
        issued: salesRows.reduce((s, r) => s + r.total_points_issued, 0),
        redeemed: salesRows.reduce((s, r) => s + r.total_points_redeemed, 0),
      },
      service: {
        transactions: serviceRows.reduce((s, r) => s + r.total_transactions, 0),
        customers: serviceRows.reduce((s, r) => s + r.total_customers, 0),
        customers_redeemed: serviceRows.reduce((s, r) => s + r.customers_redeemed, 0),
        issued: serviceRows.reduce((s, r) => s + r.total_points_issued, 0),
        redeemed: serviceRows.reduce((s, r) => s + r.total_points_redeemed, 0),
      },
      bodyshop: {
        transactions: bodyshopRows.reduce((s, r) => s + r.total_transactions, 0),
        customers: bodyshopRows.reduce((s, r) => s + r.total_customers, 0),
        customers_redeemed: bodyshopRows.reduce((s, r) => s + r.customers_redeemed, 0),
        issued: bodyshopRows.reduce((s, r) => s + r.total_points_issued, 0),
        redeemed: bodyshopRows.reduce((s, r) => s + r.total_points_redeemed, 0),
      },
      accessories: {
        transactions: accessoryRows.reduce((s, r) => s + r.total_transactions, 0),
        customers: accessoryRows.reduce((s, r) => s + r.total_customers, 0),
        customers_redeemed: accessoryRows.reduce((s, r) => s + r.customers_redeemed, 0),
        issued: accessoryRows.reduce((s, r) => s + r.total_points_issued, 0),
        redeemed: accessoryRows.reduce((s, r) => s + r.total_points_redeemed, 0),
      },
      redemptions: {
        transactions: redemptionRows.reduce((s, r) => s + r.total_transactions, 0),
        customers_redeemed: redemptionRows.reduce((s, r) => s + (r.customers_redeemed || r.total_customers), 0),
        redeemed: redemptionRows.reduce((s, r) => s + r.total_points_redeemed, 0),
      },
    };
  }, [reportData.summary]);

  // Filtered transactions drilldown based on search box
  const filteredTransactions = useMemo(() => {
    const list = reportData.transactions || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (tx) =>
        (tx.customer_name && tx.customer_name.toLowerCase().includes(q)) ||
        (tx.customer_id && tx.customer_id.toLowerCase().includes(q)) ||
        (tx.branch_name && tx.branch_name.toLowerCase().includes(q)) ||
        (tx.branch_city && tx.branch_city.toLowerCase().includes(q)) ||
        (tx.brand_name && tx.brand_name.toLowerCase().includes(q)) ||
        (tx.model && tx.model.toLowerCase().includes(q)) ||
        (tx.category && tx.category.toLowerCase().includes(q)) ||
        (tx.reason_text && tx.reason_text.toLowerCase().includes(q))
    );
  }, [reportData.transactions, searchQuery]);

  const { totals } = reportData;

  const redeemedCustCount = totals.total_customers_redeemed ?? departmentalBreakdown.redemptions.customers_redeemed;
  const saleCustCount = totals.customers_sale ?? departmentalBreakdown.sales.customers;
  const serviceCustCount = totals.customers_service ?? departmentalBreakdown.service.customers;
  const bodyshopCustCount = totals.customers_bodyshop ?? departmentalBreakdown.bodyshop.customers;

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* ─── 1. Header with Export & Refresh ─────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200/70 flex items-center justify-center text-indigo-600 shadow-2xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Report &amp; Analytics
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic customer redemption tracking across all Karnataka branches, cities, brands, and categories.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchReportData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ─── 2. Parameter Filters (Fully Unlocked & Interactive) ─────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 font-mono">
              Dynamic Filters
            </span>
          </div>

          {/* Quick Date Shortcuts */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 mr-1 font-mono uppercase">Quick Dates:</span>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last30', label: 'Last 30 Days' },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => handleSetDateRange(d.id)}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              >
                {d.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer ml-1"
            >
              Reset Filters
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 text-xs">
          {/* Dealership Branch Filter */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-indigo-600" />
              <span>Dealership Branch</span>
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 transition"
            >
              <option value="">All Dealership Branches ({branches.length} Locations)</option>
              {branches.map((b) => (
                <option key={b.id || b.branch_id} value={b.id || b.branch_id}>
                  {b.name || b.branch_name} {b.address || b.branch_city ? `(${b.address || b.branch_city})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle Brand Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Car className="w-3 h-3 text-indigo-600" />
              <span>Brand</span>
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 transition"
            >
              <option value="">All Brands</option>
              {CURATED_BRANDS.map((br) => (
                <option key={br} value={br}>
                  {br}
                </option>
              ))}
            </select>
          </div>

          {/* Department / Category Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-indigo-600" />
              <span>Department</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 transition capitalize"
            >
              <option value="">All Departments</option>
              <option value="sale">🚗 Vehicle Sales</option>
              <option value="service">🔧 Workshop Service</option>
              <option value="bodyshop">🛠️ Bodyshop &amp; Repairs</option>
              <option value="accessory">🛍️ Accessories &amp; Spares</option>
              <option value="redemption">💎 Points Redemptions</option>
              <option value="referral">👥 Referrals</option>
              <option value="adjust">⚙️ Manual Adjustments</option>
            </select>
          </div>

          {/* Date Filters */}
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 font-mono">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 font-mono text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 font-mono">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 font-mono text-slate-800"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-900 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* ─── 3. Dynamic Summary Cards (Only Customer Counts) ──────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Customers Redeemed (Only Customer Redeem Count, No Unnecessary Points) */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-orange-50/30 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 border-amber-300/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 font-mono">
              Customers Redeemed
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-amber-800">
            {redeemedCustCount.toLocaleString('en-IN')}{' '}
            <span className="text-sm sm:text-base font-bold text-amber-700">Customers</span>
          </p>
          <span className="text-[10px] sm:text-[11px] text-amber-900/80 font-medium block">
            Redeemed loyalty benefits
          </span>
        </div>

        {/* 2. Sale Customers */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Customers Took Sale
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
            {saleCustCount.toLocaleString('en-IN')}{' '}
            <span className="text-sm sm:text-base font-bold text-slate-500">Customers</span>
          </p>
          <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">
            Vehicle &amp; equipment purchase
          </span>
        </div>

        {/* 3. Service Customers */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Customers Took Service
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
            {serviceCustCount.toLocaleString('en-IN')}{' '}
            <span className="text-sm sm:text-base font-bold text-slate-500">Customers</span>
          </p>
          <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">
            Scheduled workshop &amp; maintenance
          </span>
        </div>

        {/* 4. Body Shop Customers */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Customers Took Body Shop
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
            {bodyshopCustCount.toLocaleString('en-IN')}{' '}
            <span className="text-sm sm:text-base font-bold text-slate-500">Customers</span>
          </p>
          <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">
            Accidental repairs &amp; bodyshop
          </span>
        </div>
      </div>

      {/* ─── 4. Departmental Breakdown (Sales vs Service vs Bodyshop vs Accessories) ──── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Car className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900">Vehicle Sales</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">
              {departmentalBreakdown.sales.transactions} Invoices
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Customers Bought &amp; Earned:</span>
              <strong className="font-mono text-slate-900">{departmentalBreakdown.sales.customers}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Customers Redeemed in Sales:</span>
              <strong className="font-mono text-amber-700">{departmentalBreakdown.sales.customers_redeemed}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Points Earned:</span>
              <strong className="font-mono text-emerald-600">+{departmentalBreakdown.sales.issued.toLocaleString('en-IN')}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Points Redeemed (Downpayment):</span>
              <strong className="font-mono text-rose-600">-{departmentalBreakdown.sales.redeemed.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>

        {/* Service */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Wrench className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900">Workshop &amp; Service</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
              {departmentalBreakdown.service.transactions} Job Cards
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Customers Serviced:</span>
              <strong className="font-mono text-slate-900">{departmentalBreakdown.service.customers}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Customers Redeemed on Service:</span>
              <strong className="font-mono text-amber-700">{departmentalBreakdown.service.customers_redeemed}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Points Earned on Labor:</span>
              <strong className="font-mono text-emerald-600">+{departmentalBreakdown.service.issued.toLocaleString('en-IN')}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Points Redeemed on Service:</span>
              <strong className="font-mono text-rose-600">-{departmentalBreakdown.service.redeemed.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>

        {/* Bodyshop */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900">Bodyshop &amp; Repairs</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold">
              {departmentalBreakdown.bodyshop.transactions} Claims
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Customers Repaired:</span>
              <strong className="font-mono text-slate-900">{departmentalBreakdown.bodyshop.customers}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Customers Redeemed on Claim:</span>
              <strong className="font-mono text-amber-700">{departmentalBreakdown.bodyshop.customers_redeemed}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Points Earned on Labor:</span>
              <strong className="font-mono text-emerald-600">+{departmentalBreakdown.bodyshop.issued.toLocaleString('en-IN')}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Points Redeemed:</span>
              <strong className="font-mono text-rose-600">-{departmentalBreakdown.bodyshop.redeemed.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>

        {/* Accessories & Redemptions */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900">Accessories &amp; Desk Redemptions</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold">
              {departmentalBreakdown.accessories.transactions + departmentalBreakdown.redemptions.transactions} Orders
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Customers Redeemed at Counter:</span>
              <strong className="font-mono text-purple-700">
                {departmentalBreakdown.redemptions.customers_redeemed + departmentalBreakdown.accessories.customers_redeemed}
              </strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Discount Given:</span>
              <strong className="font-mono text-emerald-700">
                ₹{Math.floor((departmentalBreakdown.redemptions.redeemed + departmentalBreakdown.accessories.redeemed) / 4).toLocaleString('en-IN')}
              </strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Points Redeemed:</span>
              <strong className="font-mono text-rose-600">
                -{(departmentalBreakdown.redemptions.redeemed + departmentalBreakdown.accessories.redeemed).toLocaleString('en-IN')} PTS
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 5. Dynamic Segment Breakdown Table (Branch x Brand x Category) ─ */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              Branch &amp; Brand Points &amp; Redemption Breakdown
            </h3>
            <p className="text-xs text-slate-500">
              Showing aggregated performance based on current parameter filters.
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700">
            {reportData.summary.length} Segments
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Dealership Branch</th>
                <th className="p-3.5">Brand</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5 text-right">Transactions</th>
                <th className="p-3.5 text-right">Customers</th>
                <th className="p-3.5 text-right text-amber-700">Redeemed Cust.</th>
                <th className="p-3.5 text-right text-emerald-700">Points Issued</th>
                <th className="p-3.5 text-right text-rose-700">Points Redeemed</th>
                <th className="p-3.5 text-right">Discount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>Loading analytics...</span>
                    </div>
                  </td>
                </tr>
              ) : reportData.summary.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400">
                    No transactions matched the selected filters.
                  </td>
                </tr>
              ) : (
                reportData.summary.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5">
                      <span className="font-bold text-slate-900 block">{row.branch_name}</span>
                      {row.branch_city && (
                        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {row.branch_city}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">{row.brand_name}</td>
                    <td className="p-3.5 capitalize">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {row.category}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold">{row.total_transactions}</td>
                    <td className="p-3.5 text-right font-mono">{row.total_customers}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-amber-700 bg-amber-50/40">
                      {row.customers_redeemed > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          {row.customers_redeemed}
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-700">
                      +{row.total_points_issued.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-rose-700">
                      {row.total_points_redeemed > 0 ? `-${row.total_points_redeemed.toLocaleString('en-IN')}` : '0'}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      ₹{row.equivalent_redeemed_rs.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 6. Matching Customer Transaction Activity (Drilldown) ────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              Customer Activity Drilldown &amp; Recent Transactions
            </h3>
            <p className="text-xs text-slate-500">
              Individual customer redemptions and point issuances matching your filter parameters.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer, ID, vehicle..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px] sticky top-0 z-10">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Dealership Branch</th>
                <th className="p-3">Brand / Vehicle</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Points</th>
                <th className="p-3 text-right">Bill / Value (₹)</th>
                <th className="p-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    No transactions found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isPositive = (tx.points || 0) >= 0;
                  return (
                    <tr key={tx.entry_id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 text-slate-500 font-mono whitespace-nowrap">
                        {tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="p-3">
                        <strong className="text-slate-900 block">{tx.customer_name}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">{tx.customer_id}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-800 block">{tx.branch_name}</span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          {tx.branch_city}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-800 block">{tx.brand_name}</span>
                        <span className="text-[11px] text-slate-500">{tx.model || '—'}</span>
                      </td>
                      <td className="p-3 capitalize">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.category === 'redemption' || !isPositive
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : tx.category === 'sale'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {tx.category}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        <span className={isPositive ? 'text-emerald-700' : 'text-rose-700'}>
                          {isPositive ? `+${tx.points}` : tx.points} PTS
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {tx.bill_amount > 0 ? `₹${Number(tx.bill_amount).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="p-3 text-slate-500 text-[11px] max-w-xs truncate" title={tx.reason_text || ''}>
                        {tx.reason_text || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
