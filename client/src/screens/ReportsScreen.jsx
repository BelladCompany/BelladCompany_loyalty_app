import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Filter,
  RefreshCw,
  PieChart,
  Users,
  Coins,
  Share2,
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
} from 'lucide-react';
import ApiService from '../services/api';
import { useToast, Skeleton } from '../components/ui';

export default function ReportsScreen({ user }) {
  const { showError } = useToast();
  const [activeTab, setActiveTab] = useState('points_summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dropdown Options
  const [branches, setBranches] = useState([]);
  const [brands, setBrands] = useState([]);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState(user?.branch_id ? String(user.branch_id) : '');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data States
  const [pointsSummary, setPointsSummary] = useState([]);
  const [customerDistribution, setCustomerDistribution] = useState([]);
  const [liabilityData, setLiabilityData] = useState(null);
  const [referralData, setReferralData] = useState(null);
  const [kycAuditData, setKycAuditData] = useState([]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [activeTab]);

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

  const buildFilterParams = () => {
    const params = {};
    if (selectedBranch) params.branch_id = selectedBranch;
    if (selectedBrand) params.brand_id = selectedBrand;
    if (selectedVehicleType) params.vehicle_type = selectedVehicleType;
    if (selectedCategory) params.category = selectedCategory;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return params;
  };

  const fetchReportData = async () => {
    setLoading(true);
    setError('');
    const params = buildFilterParams();

    try {
      if (activeTab === 'points_summary') {
        const res = await ApiService.getPointsSummaryReport(params);
        setPointsSummary(res.data || []);
      } else if (activeTab === 'customer_distribution') {
        const res = await ApiService.getCustomerDistributionReport(params);
        setCustomerDistribution(res.data || []);
      } else if (activeTab === 'liability') {
        const res = await ApiService.getPointsLiabilityReport(params);
        setLiabilityData(res.data || null);
      } else if (activeTab === 'referrals') {
        const res = await ApiService.getReferralConversionReport(params);
        setReferralData(res.data || null);
      } else if (activeTab === 'kyc_audit') {
        const res = await ApiService.getKycAuditReport(params);
        setKycAuditData(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    const params = buildFilterParams();
    const endpointMap = {
      points_summary: 'points-summary',
      customer_distribution: 'customer-distribution',
      liability: 'liability',
      referrals: 'referrals',
      kyc_audit: 'kyc-audit',
    };
    const endpoint = endpointMap[activeTab];
    try {
      await ApiService.downloadReportCsv(endpoint, params);
    } catch (err) {
      showError(`CSV Export Error: ${err.message}`);
    }
  };

  // Helper metric sums
  const totalIssued = pointsSummary.reduce((sum, r) => sum + (r.total_points_issued || 0), 0);
  const totalRedeemed = pointsSummary.reduce((sum, r) => sum + (r.total_points_redeemed || 0), 0);
  const totalCustomers = customerDistribution.reduce((sum, r) => sum + (r.customer_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-surface-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-primary" />
            <h1 className="text-2xl font-bold text-ink-primary">Multi-Branch & Brand Reporting Engine</h1>
          </div>
          <p className="text-sm text-ink-secondary mt-1">
            Pan-India business intelligence, points liability tracking, referral override auditing, and KYC risk analytics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReportData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>

          <button
            onClick={handleExportCsv}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-xl border border-surface-border shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-brand-primary" /> Parameter Filters
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Branch Filter */}
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">Branch</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              disabled={user?.role === 'branch_manager'}
              className="w-full text-xs p-2.5 rounded-lg border border-surface-border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-primary transition"
            >
              <option value="">All Branches (Pan-India)</option>
              {branches.map((b) => (
                <option key={b.branch_id || b.id} value={b.branch_id || b.id}>
                  {b.branch_name || b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Filter */}
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">Brand</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-surface-border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-primary transition"
            >
              <option value="">All Brands</option>
              {brands.map((br) => (
                <option key={br.brand_id || br.id} value={br.brand_id || br.id}>
                  {br.brand_name || br.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">Vehicle Type</label>
            <select
              value={selectedVehicleType}
              onChange={(e) => setSelectedVehicleType(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-surface-border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-primary transition"
            >
              <option value="">All (2W & 4W)</option>
              <option value="4W">4-Wheeler (4W)</option>
              <option value="2W">2-Wheeler (2W)</option>
            </select>
          </div>

          {/* Transaction Category */}
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-surface-border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-primary transition"
            >
              <option value="">All Categories</option>
              <option value="service">Service</option>
              <option value="sale">Vehicle Sale</option>
              <option value="accessory">Accessory</option>
              <option value="bodyshop">Bodyshop</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-surface-border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-primary transition"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-surface-border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-primary transition"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={fetchReportData}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white text-xs font-bold rounded-lg shadow-sm transition"
          >
            Apply Filters & Update Analytics
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        {[
          { id: 'points_summary', label: 'Points Summary', icon: Coins },
          { id: 'customer_distribution', label: 'Customer Distribution', icon: Users },
          { id: 'liability', label: 'Points Liability Risk', icon: PieChart },
          { id: 'referrals', label: 'Referral & Override Audit', icon: Share2 },
          { id: 'kyc_audit', label: 'KYC & Cashier Activity', icon: FileCheck2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-brand-primary text-brand-primary bg-amber-500/10'
                  : 'border-transparent text-ink-secondary hover:text-ink-primary hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3 text-rose-700 text-xs font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading skeleton guard — shown while initial data fetches */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton.StatCard /><Skeleton.StatCard /><Skeleton.StatCard />
          </div>
          <Skeleton.Table rows={8} cols={6} />
        </div>
      )}

      {/* Report View Panels */}

      {/* Tab 1: Points Summary */}
      {!loading && activeTab === 'points_summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-surface-border shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">Total Points Issued</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{totalIssued.toLocaleString('en-IN')} PTS</p>
              <span className="text-[11px] text-slate-500">Worth ₹{Math.floor(totalIssued / 4).toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-white p-5 rounded-xl border border-surface-border shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">Total Points Redeemed</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">{totalRedeemed.toLocaleString('en-IN')} PTS</p>
              <span className="text-[11px] text-slate-500">Worth ₹{Math.floor(totalRedeemed / 4).toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-white p-5 rounded-xl border border-surface-border shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">Net Points Balance</span>
              <p className="text-2xl font-bold text-brand-primary mt-1">
                {(totalIssued - totalRedeemed).toLocaleString('en-IN')} PTS
              </p>
              <span className="text-[11px] text-slate-500">
                Worth ₹{Math.floor((totalIssued - totalRedeemed) / 4).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-ink-primary">
              Points Breakdown by Branch, Brand & Transaction Category
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Branch</th>
                    <th className="p-3">Brand</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Transactions</th>
                    <th className="p-3 text-right">Issued (PTS)</th>
                    <th className="p-3 text-right">Redeemed (PTS)</th>
                    <th className="p-3 text-right">Net Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {pointsSummary.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-6 text-center text-slate-400">
                        No transaction data matched current filters.
                      </td>
                    </tr>
                  ) : (
                    pointsSummary.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-semibold text-slate-900">{row.branch_name}</td>
                        <td className="p-3">{row.brand_name}</td>
                        <td className="p-3 capitalize">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            {row.category}
                          </span>
                        </td>
                        <td className="p-3 text-right font-medium">{row.total_transactions}</td>
                        <td className="p-3 text-right font-bold text-emerald-600">+{row.total_points_issued}</td>
                        <td className="p-3 text-right font-bold text-amber-600">-{row.total_points_redeemed}</td>
                        <td className="p-3 text-right font-bold text-slate-900">{row.net_points_balance}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Customer Distribution */}
      {activeTab === 'customer_distribution' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-surface-border shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">Filtered Total Customers</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalCustomers.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-ink-primary">
              Customer & Vehicle Distribution Pivot (Branch x Brand x Model)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Branch</th>
                    <th className="p-3">Brand</th>
                    <th className="p-3">Model</th>
                    <th className="p-3">Vehicle Type</th>
                    <th className="p-3 text-right">Customer Count</th>
                    <th className="p-3 text-right">Vehicle Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {customerDistribution.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-6 text-center text-slate-400">
                        No customer distribution data matched current filters.
                      </td>
                    </tr>
                  ) : (
                    customerDistribution.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-semibold text-slate-900">{row.branch_name}</td>
                        <td className="p-3 font-medium text-slate-800">{row.brand_name}</td>
                        <td className="p-3">{row.model_name}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-800 border border-amber-500/30">
                            {row.vehicle_type}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">{row.customer_count}</td>
                        <td className="p-3 text-right font-semibold text-slate-600">{row.vehicle_count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Points Liability Risk */}
      {activeTab === 'liability' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-xl border border-surface-border shadow-sm space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Unredeemed Points Liability
              </span>
              <div className="text-3xl font-black text-brand-primary">
                {liabilityData?.total_unredeemed_points?.toLocaleString('en-IN') || 0}{' '}
                <span className="text-sm font-bold text-slate-500">PTS</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                Total Rupee Liability: ₹{liabilityData?.total_liability_rupees?.toLocaleString('en-IN') || 0}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-surface-border shadow-sm space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversion Standard</span>
              <p className="text-lg font-bold text-slate-800">4 Loyalty Points = ₹1.00 Discount</p>
              <p className="text-xs text-slate-500">
                Liability reflects non-expired accumulated points across active customer accounts.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-surface-border shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Expiring Risk Buckets (Forfeiture Windows)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
                <span className="text-xs font-bold text-amber-800 uppercase">Expiring in 30 Days</span>
                <p className="text-xl font-bold text-amber-900">
                  {liabilityData?.expiring_risk_buckets?.expiring_in_30_days?.points?.toLocaleString('en-IN') || 0} PTS
                </p>
                <span className="text-xs text-amber-700 font-medium">
                  Worth ₹{liabilityData?.expiring_risk_buckets?.expiring_in_30_days?.liability_rs?.toLocaleString('en-IN') || 0}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                <span className="text-xs font-bold text-slate-700 uppercase">Expiring in 60 Days</span>
                <p className="text-xl font-bold text-slate-900">
                  {liabilityData?.expiring_risk_buckets?.expiring_in_60_days?.points?.toLocaleString('en-IN') || 0} PTS
                </p>
                <span className="text-xs text-slate-600 font-medium">
                  Worth ₹{liabilityData?.expiring_risk_buckets?.expiring_in_60_days?.liability_rs?.toLocaleString('en-IN') || 0}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                <span className="text-xs font-bold text-slate-700 uppercase">Expiring in 90 Days</span>
                <p className="text-xl font-bold text-slate-900">
                  {liabilityData?.expiring_risk_buckets?.expiring_in_90_days?.points?.toLocaleString('en-IN') || 0} PTS
                </p>
                <span className="text-xs text-slate-600 font-medium">
                  Worth ₹{liabilityData?.expiring_risk_buckets?.expiring_in_90_days?.liability_rs?.toLocaleString('en-IN') || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Referral & Override Audit */}
      {activeTab === 'referrals' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-surface-border shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">Total Referrals</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{referralData?.summary?.total_referrals || 0}</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-surface-border shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">Conversion Rate</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {referralData?.summary?.conversion_rate_pct || 0}%
              </p>
              <span className="text-[11px] text-slate-500">{referralData?.summary?.approved_count || 0} Approved</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-surface-border shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">Approver Overrides</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">{referralData?.summary?.override_count || 0}</p>
              <span className="text-[11px] text-slate-500">
                Override Rate: {referralData?.summary?.override_rate_pct || 0}%
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-surface-border shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">Overall Point Delta</span>
              <p
                className={`text-2xl font-bold mt-1 ${
                  (referralData?.summary?.overall_delta_points || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {(referralData?.summary?.overall_delta_points || 0) > 0 ? '+' : ''}
                {referralData?.summary?.overall_delta_points || 0} PTS
              </p>
              <span className="text-[11px] text-slate-500">Approved vs Suggested Delta</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-ink-primary">
              Referral Status & Approver Override Audit Breakdown
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Referral Count</th>
                    <th className="p-3 text-right">Auto-Suggested (PTS)</th>
                    <th className="p-3 text-right">Final Credited (PTS)</th>
                    <th className="p-3 text-right">Override Count</th>
                    <th className="p-3 text-right">Point Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(!referralData?.status_breakdown || referralData.status_breakdown.length === 0) ? (
                    <tr>
                      <td colSpan="6" className="p-6 text-center text-slate-400">
                        No referral records matched current filters.
                      </td>
                    </tr>
                  ) : (
                    referralData.status_breakdown.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 capitalize font-bold text-slate-900">{row.status}</td>
                        <td className="p-3 text-right font-semibold text-slate-800">{row.count}</td>
                        <td className="p-3 text-right font-medium text-slate-600">{row.total_suggested_points}</td>
                        <td className="p-3 text-right font-bold text-slate-900">{row.total_credited_points}</td>
                        <td className="p-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.override_count > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {row.override_count} Overrides
                          </span>
                        </td>
                        <td
                          className={`p-3 text-right font-bold ${
                            row.delta_points > 0
                              ? 'text-emerald-600'
                              : row.delta_points < 0
                              ? 'text-rose-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {row.delta_points > 0 ? `+${row.delta_points}` : row.delta_points}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: KYC Audit */}
      {activeTab === 'kyc_audit' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-ink-primary flex items-center justify-between">
              <span>KYC Phone Update Audit & Cashier Request Volume</span>
              <span className="text-[11px] font-normal text-slate-500">
                High Volume Flag: &ge; 5 change requests per cashier
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Branch</th>
                    <th className="p-3">Requesting Cashier</th>
                    <th className="p-3 text-right">Total Requests</th>
                    <th className="p-3 text-right">Approved</th>
                    <th className="p-3 text-right">Rejected</th>
                    <th className="p-3 text-right">Pending</th>
                    <th className="p-3 text-center">Volume Risk Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {kycAuditData.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-6 text-center text-slate-400">
                        No KYC audit records found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    kycAuditData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-semibold text-slate-900">{row.branch_name}</td>
                        <td className="p-3 font-medium text-slate-800">{row.cashier_username}</td>
                        <td className="p-3 text-right font-bold text-slate-900">{row.total_requests}</td>
                        <td className="p-3 text-right font-bold text-emerald-600">{row.approved_count}</td>
                        <td className="p-3 text-right font-bold text-rose-600">{row.rejected_count}</td>
                        <td className="p-3 text-right font-semibold text-amber-600">{row.pending_count}</td>
                        <td className="p-3 text-center">
                          {row.high_volume_flag ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <AlertTriangle className="w-3 h-3" /> High Volume Audit Flag
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              Normal Volume
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
