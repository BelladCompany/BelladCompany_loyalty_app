import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  UserPlus,
  RefreshCw,
  Car,
  Phone,
  User,
  AlertCircle,
  ArrowRight,
  Filter,
  Download,
  Upload,
  CreditCard,
  Gift,
  Coins,
  Sparkles,
  TrendingUp,
  Percent,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Building,
  Award
} from 'lucide-react';
import { Button, DataTable, useToast, Skeleton } from '../components/ui';
import Customer360View from '../components/dashboard/Customer360View';
import AddCustomerModal from '../components/dashboard/AddCustomerModal';
import MessageLogModal from '../components/dashboard/MessageLogModal';
import BulkImportModal from '../components/dashboard/BulkImportModal';
import ApiService from '../services/api';

export const CashierDashboard = ({ user, activeTab, resetNonce }) => {
  const { showSuccess, showError, showInfo } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [ledgerData, setLedgerData] = useState([]);
  const [tierInfo, setTierInfo] = useState(null);

  // Metadata for Filters
  const [branches, setBranches] = useState([]);
  const [brands, setBrands] = useState([]);

  // Category filter strip (Image 1 style)
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('ALL');

  // Filter Panel Toggle & States
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterBranch, setFilterBranch] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterVehicleType, setFilterVehicleType] = useState('');
  const [filterTier, setFilterTier] = useState('');

  const [error, setError] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const searchInputRef = useRef(null);

  useEffect(() => {
    Promise.all([
      ApiService.getBranches().catch(() => ({ data: [] })),
      ApiService.request('/brands').catch(() => ({ data: [] })),
    ]).then(([branchRes, brandRes]) => {
      setBranches(branchRes.data || []);
      const rawBrands = brandRes.data || [];
      const uniqueBrands = Array.from(
        new Map(rawBrands.map((b) => [b.name || b.brand_name, b])).values()
      );
      setBrands(uniqueBrands);
    });
  }, []);

  const resetToFreshSearch = () => {
    setCustomerData(null);
    setSelectedCustomerId(null);
    setSearchResults([]);
    setHasSearched(false);
    setSearchQuery('');
    setError('');
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  useEffect(() => {
    if (activeTab === 'search') {
      resetToFreshSearch();
    }
  }, [activeTab, resetNonce]);

  // Load customer full profile
  const loadCustomerProfile = async (customerId) => {
    if (!customerId) return;
    setError('');
    setIsLoadingProfile(true);
    try {
      const [custRes, ledgerRes] = await Promise.all([
        ApiService.getCustomer(customerId),
        ApiService.getCustomerLedger(customerId),
      ]);

      setCustomerData(custRes.data);
      setLedgerData(ledgerRes.data?.ledger_entries || []);
      setTierInfo(ledgerRes.data?.current_tier || null);
      setSelectedCustomerId(customerId);
    } catch (err) {
      setError(err.message || 'Failed to load customer profile.');
      showError(err.message || 'Failed to load customer profile.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Search handler
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();

    setError('');
    setIsSearching(true);
    setHasSearched(true);
    setSearchResults([]);

    try {
      const res = await ApiService.search(query);
      let results = res.data || [];

      if (filterVehicleType) {
        results = results.filter((cust) =>
          cust.vehicles?.some((v) => v.vehicle_type === filterVehicleType)
        );
      }

      setSearchResults(results);

      if (results.length === 1) {
        await loadCustomerProfile(results[0].customer_id);
      } else {
        setCustomerData(null);
        setSelectedCustomerId(null);
      }
    } catch (err) {
      setError(err.message || 'Search failed. Check server connection.');
      setSearchResults([]);
      setCustomerData(null);
      setSelectedCustomerId(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = async (customer) => {
    await loadCustomerProfile(customer.customer_id);
  };

  const handleExportSearchCsv = () => {
    if (searchResults.length === 0) {
      showInfo('No search results to export.');
      return;
    }
    const headers = ['Customer ID', 'Name', 'Phone', 'Vehicles'];
    const rows = searchResults.map((c) => [
      c.customer_id,
      `"${c.name || ''}"`,
      `"${(c.phones || []).map((p) => p.phone_number || p).join('; ')}"`,
      `"${(c.vehicles || []).map((v) => v.registration_number || v.vin).join('; ')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customer_search_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess('Search results exported to CSV.');
  };

  // Result columns for multiple matches
  const resultColumns = [
    {
      field: 'customer_id',
      header: 'Customer ID',
      sortable: true,
      cellClassName: 'font-mono font-bold text-slate-900',
    },
    { field: 'name', header: 'Customer Name', sortable: true, cellClassName: 'font-bold text-slate-900' },
    {
      field: 'phones',
      header: 'Registered Phone(s)',
      render: (val) => (
        <div className="flex flex-wrap gap-1 font-mono text-sm">
          {(val || []).map((p, idx) => (
            <span key={idx} className="bg-slate-100 px-2 py-0.5 border border-slate-200 rounded-lg text-slate-800">
              {p.phone_number || p}
            </span>
          ))}
        </div>
      ),
    },
    {
      field: 'vehicles',
      header: 'Vehicles',
      render: (val) => (
        <div className="text-xs font-semibold text-slate-700">
          {(val || []).map((v) => v.registration_number || v.chassis_no || v.vin).join(', ') || 'None'}
        </div>
      ),
    },
    {
      field: 'action',
      header: '',
      align: 'right',
      render: (_, row) => (
        <button
          onClick={() => handleSelectResult(row)}
          className="px-4 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
        >
          Select Profile
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── Top Hero Glowing Metric Cards (Directly from Image 1 Reference) ── */}
      {!customerData && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Card 1: Loyalty Value (Purple Glow Card) */}
          <div className="hero-card-purple p-7 flex flex-col justify-between min-h-[220px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                Loyalty Value
              </span>
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
            </div>

            <div>
              <div className="text-4xl font-black text-white tracking-tight my-2">
                47,307 <span className="text-xl font-bold text-purple-200">PTS</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-white text-xs font-semibold">
                <span>≈ ₹11,826 in spendings</span>
              </div>
            </div>
          </div>

          {/* Card 2: Earned this Month (Blue Glow Card) */}
          <div className="hero-card-blue p-7 flex flex-col justify-between min-h-[220px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
                Earned This Month
              </span>
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <Coins className="w-4 h-4 text-white" />
              </div>
            </div>

            <div>
              <div className="text-4xl font-black text-white tracking-tight my-2">
                42,720 <span className="text-xl font-bold text-blue-100">PTS</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-white text-xs font-semibold">
                <span>₹37,111 in redemptions</span>
              </div>
            </div>
          </div>

          {/* Card 3: Connected Vehicles Gauge (White Frosted Card) */}
          <div className="card-white-glow p-6 flex flex-col justify-between min-h-[220px] bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Connected
              </span>
              <span className="text-xs font-bold text-slate-500">59 Linked</span>
            </div>

            <div className="text-center py-2">
              <div className="relative inline-flex items-center justify-center w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle cx="48" cy="48" r="38" stroke="#F1F5F9" strokeWidth="8" fill="transparent" />
                  <circle
                    cx="48"
                    cy="48"
                    r="38"
                    stroke="#EA580C"
                    strokeWidth="8"
                    strokeDasharray="238"
                    strokeDashoffset="75"
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-2xl font-black text-slate-900 block leading-none">24</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Active 2W/4W</span>
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-slate-500 font-semibold">
              Counter POS Ready
            </div>
          </div>

          {/* Card 4: Insider Intelligence / Category Breakdown (Orange Level Card + Breakdown) */}
          <div className="card-white-glow p-6 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                Insider Intelligence
              </span>
              <span className="text-xs text-slate-400 font-bold">9.4% p.a</span>
            </div>

            {/* Orange Level Card (from Image 1) */}
            <div className="hero-card-orange p-3.5 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-orange-100">Executive Tier</span>
                <span className="text-white">Gold Level</span>
              </div>
              <div className="w-full bg-white/30 h-1.5 rounded-full overflow-hidden">
                <div className="bg-white h-full w-3/4 rounded-full" />
              </div>
              <span className="text-[11px] font-bold text-white block">Auto Discount: 15% Max</span>
            </div>

            {/* Earnings by Source list */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 font-medium">
                <span>Vehicle Sales</span>
                <span className="font-bold text-slate-900">₹12,420</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 font-medium">
                <span>Service Visits</span>
                <span className="font-bold text-slate-900">₹8,600</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 font-medium">
                <span>Accessories</span>
                <span className="font-bold text-slate-900">₹4,200</span>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* ── Category Filter Pills Bar (from Image 1 Reference) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'ALL', label: 'All Operations' },
          { id: 'sale', label: 'Vehicle Sales' },
          { id: 'service', label: 'Service Visits' },
          { id: 'accessories', label: 'Accessories' },
          { id: 'exchange', label: 'In-House Exchange' },
          { id: 'insurance', label: 'In-House Insurance' },
          { id: 'google_review', label: 'Google 5-Star Rewards' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategoryFilter(tab.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeCategoryFilter === tab.id
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Customer Search Card (Clean, High-Contrast Light Mode) ── */}
      <div className="card-white-glow p-4 sm:p-7 bg-white space-y-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Customer Lookup &amp; Identification
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Search via 12-digit Aadhaar Card, Customer Full Name, Mobile Phone, or Vehicle VIN
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-full border transition-all ${
                showFilterPanel
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              {showFilterPanel ? 'Hide Filters' : 'Advanced Filters'}
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-2.5 sm:gap-3">
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                ref={searchInputRef}
                id="counter-search"
                type="text"
                placeholder="Search Aadhaar, Name, Mobile or VIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 sm:h-14 pl-11 sm:pl-12 pr-4 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white text-sm sm:text-base font-semibold text-slate-900 rounded-2xl focus:outline-none placeholder:text-slate-400 transition-all shadow-xs"
              />
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2.5">
              <button
                id="search-customer-btn"
                type="submit"
                disabled={isSearching}
                className="col-span-2 sm:col-span-1 h-11 sm:h-14 px-6 text-sm font-black rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md shadow-indigo-600/20 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4 sm:hidden" />
                <span>{isSearching ? 'Searching...' : 'Search'}</span>
              </button>

              <button
                type="button"
                onClick={() => setAddModalOpen(true)}
                className="h-11 sm:h-14 px-4 sm:px-5 text-xs sm:text-sm font-bold whitespace-nowrap rounded-xl sm:rounded-2xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>+ Customer</span>
              </button>

              <button
                type="button"
                onClick={() => setBulkModalOpen(true)}
                className="h-11 sm:h-14 px-3.5 sm:px-4 text-xs font-bold whitespace-nowrap rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 flex items-center justify-center gap-1.5 transition-all"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Import CSV</span>
              </button>
            </div>
          </div>

          {/* Prominent Advanced Filter Panel */}
          {showFilterPanel && (
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200 animate-fadeIn">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Branch</label>
                <select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id || b.branch_id} value={b.id || b.branch_id}>
                      {b.name || b.branch_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Brand</label>
                <select
                  value={filterBrand}
                  onChange={(e) => setFilterBrand(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold"
                >
                  <option value="">All Brands</option>
                  {brands.map((br) => (
                    <option key={br.id || br.brand_id} value={br.id || br.brand_id}>
                      {br.name || br.brand_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Vehicle Category</label>
                <select
                  value={filterVehicleType}
                  onChange={(e) => setFilterVehicleType(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold"
                >
                  <option value="">All (2W & 4W)</option>
                  <option value="4W">4-Wheeler (Tata)</option>
                  <option value="2W">2-Wheeler (Hero)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tier</label>
                <select
                  value={filterTier}
                  onChange={(e) => setFilterTier(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold"
                >
                  <option value="">All Tiers</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Platinum">Platinum</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setFilterBranch('');
                    setFilterBrand('');
                    setFilterVehicleType('');
                    setFilterTier('');
                  }}
                  className="w-full text-xs font-bold text-slate-600 hover:text-slate-900 p-2.5 text-center bg-white rounded-xl border border-slate-200"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-medium text-slate-500 pt-1">
            <span>⚡ Enter Aadhaar number or Customer Name to resolve full 360 profile.</span>
            {customerData && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCustomerData(null);
                  setSearchResults([]);
                  setHasSearched(false);
                }}
                className="text-indigo-600 font-bold hover:underline"
              >
                Clear Profile View
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 font-bold text-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Multiple Matches Picker */}
      {!customerData && hasSearched && searchResults.length > 1 && (
        <div className="card-white-glow p-6 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Matching Customers ({searchResults.length} found)
            </h3>
            <button
              onClick={handleExportSearchCsv}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full transition"
            >
              <Download className="w-3.5 h-3.5" /> Export Results CSV
            </button>
          </div>

          <DataTable
            columns={resultColumns}
            data={searchResults}
            keyField="customer_id"
            onRowClick={(row) => handleSelectResult(row)}
          />
        </div>
      )}

      {/* Empty State */}
      {!customerData && hasSearched && searchResults.length === 0 && !isSearching && (
        <div className="card-white-glow p-12 text-center space-y-4 bg-white">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-200">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">No Customer Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No record matches "{searchQuery}". Check the mobile number, name, or Aadhaar number.
          </p>
        </div>
      )}

      {/* Customer Profile Loading Skeleton */}
      {isLoadingProfile && <Skeleton.CustomerProfile />}

      {/* Full Customer 360 View */}
      {customerData && !isLoadingProfile && (
        <Customer360View
          customer={customerData}
          ledgerData={ledgerData}
          tierInfo={tierInfo}
          branches={branches}
          onRefresh={() => loadCustomerProfile(customerData.customer_id)}
        />
      )}

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={(newCust) => loadCustomerProfile(newCust.customer_id)}
        user={user}
      />

      {/* WhatsApp Message Log Modal */}
      <MessageLogModal isOpen={logModalOpen} onClose={() => setLogModalOpen(false)} />

      {/* Bulk CSV Import Modal */}
      <BulkImportModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onImportSuccess={() => showSuccess('Bulk customer import complete.')}
      />
    </div>
  );
};

export default CashierDashboard;
