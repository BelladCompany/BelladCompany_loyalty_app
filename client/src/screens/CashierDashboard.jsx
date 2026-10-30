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
      cellClassName: 'font-mono font-bold text-slate-900 whitespace-nowrap min-w-[120px]',
    },
    { 
      field: 'name', 
      header: 'Customer Name', 
      sortable: true, 
      cellClassName: 'font-bold text-slate-900 break-words sm:whitespace-nowrap min-w-[140px] max-w-[220px] leading-snug' 
    },
    {
      field: 'phones',
      header: 'Registered Phone(s)',
      render: (val) => (
        <div className="flex flex-wrap gap-1 font-mono text-xs sm:text-sm whitespace-nowrap min-w-[130px]">
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
        <div className="text-xs font-semibold text-slate-700 whitespace-nowrap min-w-[130px]">
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
          className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs whitespace-nowrap shadow-xs cursor-pointer"
        >
          Select Profile
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-8">


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
        <div className="card-white-glow p-4 sm:p-6 bg-white space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              Matching Customers <span className="text-indigo-600 font-extrabold">({searchResults.length} found)</span>
            </h3>
            <button
              onClick={handleExportSearchCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shrink-0 whitespace-nowrap shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Export Results CSV</span>
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
