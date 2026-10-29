import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Gift,
  Search,
  RefreshCw,
  Download,
  Building2,
  Calendar,
  User,
  Phone,
  Car,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Tag,
  Coins,
  Sparkles,
  Receipt,
  Layers,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import ApiService from '../services/api';
import { Button, StatusBadge, useToast, Skeleton } from '../components/ui';

export const CustomerRedemptionsScreen = ({ user }) => {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [redemptions, setRedemptions] = useState([]);
  const [totals, setTotals] = useState({
    total_redemptions: 0,
    total_customers_redeemed: 0,
    total_points_redeemed: 0,
    total_discount_given: 0,
    today_redemptions: 0,
  });

  // Filter states
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Auto-refresh state (every 30 seconds for live updates)
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Load branches metadata on mount
  useEffect(() => {
    ApiService.getBranches()
      .then((res) => setBranches(res.data || []))
      .catch((e) => console.warn('Could not load branches:', e));
  }, []);

  const fetchRedemptions = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError('');
    try {
      const params = {};
      if (selectedBranch && selectedBranch !== 'all') params.branch_id = selectedBranch;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await ApiService.getCustomerRedemptions(params);
      setRedemptions(res.data || []);
      if (res.totals) {
        setTotals(res.totals);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load customer redemptions:', err);
      setError(err.message || 'Failed to load customer redemptions list.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [selectedBranch, searchQuery, startDate, endDate]);

  // Initial and param change fetch
  useEffect(() => {
    fetchRedemptions(false);
  }, [fetchRedemptions]);

  // Live Auto-Sync: Poll every 30 seconds so new redemptions appear automatically in Admin Dashboard
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchRedemptions(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchRedemptions]);

  // Quick date shortcuts
  const handleQuickDate = (type) => {
    const now = new Date();
    if (type === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (type === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setStartDate(firstDay);
      setEndDate(now.toISOString().slice(0, 10));
    }
  };

  const handleResetFilters = () => {
    setSelectedBranch('');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  };

  // CSV Export for Redemptions
  const handleExportCsv = () => {
    if (!redemptions || redemptions.length === 0) {
      showError('No redemption records to export.');
      return;
    }
    try {
      const headers = [
        'Customer ID',
        'Customer Name',
        'Phone Number',
        'Branch',
        'City',
        'Vehicle Reg',
        'Brand',
        'Model',
        'Points Redeemed',
        'Discount (Rs)',
        'Receipt No',
        'Redemption Code',
        'Cashier',
        'Redeemed At',
      ];

      const rows = redemptions.map((r) => [
        `"${r.customer_id || ''}"`,
        `"${(r.customer_name || '').replace(/"/g, '""')}"`,
        `"${r.phone_number || ''}"`,
        `"${(r.branch_name || '').replace(/"/g, '""')}"`,
        `"${(r.branch_city || '').replace(/"/g, '""')}"`,
        `"${r.vehicle_reg || ''}"`,
        `"${r.brand_name || ''}"`,
        `"${r.model || ''}"`,
        r.points_redeemed || 0,
        r.discount_amount || 0,
        `"${(r.receipt_no || '').replace(/"/g, '""')}"`,
        `"${r.redemption_code || ''}"`,
        `"${r.cashier_username || ''}"`,
        `"${r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : ''}"`,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `customer_redemptions_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess('Customer redemptions exported to CSV successfully.');
    } catch (err) {
      showError(`CSV Export Failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* ─── 1. Header Banner (Admin Only) ─────────────────────────────────── */}
      <div className="bg-white border-2 border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs shrink-0">
            <Gift className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                Customer Redemptions Queue
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                Admin Exclusive
              </span>
              {autoRefresh && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Auto-Sync
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">
              Complete historical and real-time audit of all customer point redemptions. New redemptions auto-appear as cashiers process them.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setAutoRefresh((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
            title="Toggle 30-second live auto-polling"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{autoRefresh ? 'Auto-Sync: ON' : 'Auto-Sync: Paused'}</span>
          </button>

          <Button
            variant="outline"
            size="md"
            icon={Download}
            onClick={handleExportCsv}
            disabled={loading || redemptions.length === 0}
            className="font-bold whitespace-nowrap text-xs"
          >
            Export CSV
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={RefreshCw}
            onClick={() => fetchRedemptions(false)}
            disabled={loading}
            className="font-bold whitespace-nowrap text-xs bg-slate-900 hover:bg-slate-800 text-white"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── 2. Filter & Search Controls ──────────────────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5 sm:space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 font-mono">
              Search &amp; Filters
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 mr-1 font-mono uppercase">Quick Dates:</span>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'this_month', label: 'This Month' },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => handleQuickDate(d.id)}
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
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
          {/* Search Input */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Search className="w-3 h-3 text-indigo-600" />
              <span>Search Customer / Receipt / Reg No</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer name, ID, phone, vehicle reg, receipt..."
                className="w-full p-2.5 pl-9 text-xs rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Dealership Branch Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-indigo-600" />
              <span>Dealership Branch</span>
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 transition"
            >
              <option value="">All Branches ({branches.length} Locations)</option>
              {branches.map((b) => (
                <option key={b.id || b.branch_id} value={b.id || b.branch_id}>
                  {b.name || b.branch_name} {b.address || b.branch_city ? `(${b.address || b.branch_city})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Inputs */}
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

      {/* Error Banner */}
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

      {/* ─── 4. Redemptions Table ─────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Customer Redemptions (1 Row Per Customer)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                Auto-Updating
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Showing unique customers ordered by most recent point redemption. Customers with recent redemptions appear at the top.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Last checked: <strong className="text-slate-800 font-mono">{lastUpdated.toLocaleTimeString('en-IN')}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Dealership Branch</th>
                <th className="p-3.5">Vehicle Details</th>
                <th className="p-3.5 text-right text-rose-700">Recent Points Redeemed</th>
                <th className="p-3.5 text-right text-emerald-700">Discount (₹)</th>
                <th className="p-3.5">Receipt / Ref</th>
                <th className="p-3.5">Cashier</th>
                <th className="p-3.5">Latest Redemption</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-10 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                      <span>Loading customer redemptions...</span>
                    </div>
                  </td>
                </tr>
              ) : redemptions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-400 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-600">No redemptions found matching criteria</p>
                    <p className="text-xs text-slate-400">
                      As soon as a customer redeems points at any cashier desk, it will automatically populate here.
                    </p>
                  </td>
                </tr>
              ) : (
                redemptions.map((rdm) => (
                  <tr key={rdm.entry_id} className="hover:bg-amber-50/20 transition">
                    {/* Customer */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{rdm.customer_name}</span>
                        {rdm.total_redemptions_by_customer > 1 && (
                          <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-mono">
                            {rdm.total_redemptions_by_customer} redemptions
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {rdm.customer_id}
                        </span>
                        {rdm.phone_number && (
                          <span className="font-mono text-[11px] text-slate-600 flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            {rdm.phone_number}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Branch */}
                    <td className="p-3.5">
                      <span className="font-bold text-slate-800 block">{rdm.branch_name}</span>
                      <span className="text-[11px] text-slate-500 font-medium">{rdm.branch_city}</span>
                    </td>

                    {/* Vehicle */}
                    <td className="p-3.5">
                      {rdm.vehicle_reg ? (
                        <>
                          <span className="font-mono font-bold text-slate-900 block">{rdm.vehicle_reg}</span>
                          <span className="text-[11px] text-slate-500">
                            {rdm.brand_name} {rdm.model}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 text-xs italic">General Account</span>
                      )}
                    </td>

                    {/* Points Redeemed */}
                    <td className="p-3.5 text-right font-mono font-bold text-rose-700 bg-rose-50/30">
                      <span className="px-2 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs inline-block">
                        -{Number(rdm.points_redeemed).toLocaleString('en-IN')} PTS
                      </span>
                    </td>

                    {/* Discount Given (Rs) */}
                    <td className="p-3.5 text-right font-mono font-black text-emerald-700 text-sm">
                      ₹{Number(rdm.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Receipt / Ref */}
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-slate-800 text-xs">
                        {rdm.receipt_no || 'Direct Debit'}
                      </div>
                      {rdm.redemption_code && (
                        <div className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]" title={rdm.redemption_code}>
                          {rdm.redemption_code}
                        </div>
                      )}
                    </td>

                    {/* Cashier */}
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {rdm.cashier_username}
                      </span>
                    </td>

                    {/* Redeemed At */}
                    <td className="p-3.5 whitespace-nowrap font-mono text-slate-600 text-[11px]">
                      <div>{new Date(rdm.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div className="text-[10px] text-slate-400">{new Date(rdm.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerRedemptionsScreen;
