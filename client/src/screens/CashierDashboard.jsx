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
  MessageSquare,
  Filter,
  Download,
  Upload,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { Button, Input, StatusBadge, DataTable, useToast, Skeleton } from '../components/ui';
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

  // Prominent Filter Panel Toggle & Filter States
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterBranch, setFilterBranch] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterVehicleType, setFilterVehicleType] = useState('');
  const [filterTier, setFilterTier] = useState('');

  const [error, setError] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const searchInputRef = useRef(null);

  // Load branches & brands metadata on mount
  useEffect(() => {
    Promise.all([
      ApiService.getBranches().catch(() => ({ data: [] })),
      ApiService.request('/brands').catch(() => ({ data: [] })),
    ]).then(([branchRes, brandRes]) => {
      setBranches(branchRes.data || []);
      setBrands(brandRes.data || []);
    });
  }, []);

  // Reset to fresh search view when clicking Search tab or receiving resetNonce
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

  // Fetch full customer profile and ledger history when customer is selected
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

  // Search-as-you-type with live lookup
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setError('');
    setIsSearching(true);
    setHasSearched(true);
    setSearchResults([]);

    try {
      const res = await ApiService.search(query);
      let results = res.data || [];

      // Apply client-side filter panel refinements if active
      if (filterVehicleType) {
        results = results.filter((cust) =>
          cust.vehicles?.some((v) => v.vehicle_type === filterVehicleType)
        );
      }

      setSearchResults(results);

      // If single exact match, auto-select it directly for speed
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

  // Export search results to CSV
  const handleExportSearchCsv = () => {
    if (searchResults.length === 0) {
      showInfo('No search results to export.');
      return;
    }

    const exportRows = searchResults.map((c) => ({
      customer_id: c.customer_id,
      name: c.name,
      phone: (c.phones || []).map((p) => p.phone_number || p).join('; '),
      vehicles: (c.vehicles || []).map((v) => v.registration_number || v.chassis_no).join('; '),
    }));

    const headers = Object.keys(exportRows[0]);
    const csvContent =
      headers.join(',') +
      '\n' +
      exportRows
        .map((r) => headers.map((h) => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customer_search_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess('Customer search list exported to CSV.');
  };

  // Search Results Table Columns
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
        <div className="flex flex-wrap gap-1 font-mono text-xs">
          {(val || []).map((p, idx) => (
            <span key={idx} className="bg-slate-100 px-2 py-0.5 border border-slate-300 rounded text-slate-800">
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
        <Button size="sm" variant="primary" onClick={() => handleSelectResult(row)} icon={ArrowRight}>
          Select
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Search Header & Filter Panel */}
      <div className="bg-white border border-surface-border rounded-xl p-5 shadow-sm space-y-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="counter-search" className="text-lg font-bold text-slate-900 block">
              Customer Search (Aadhaar Card No / Customer Name)
            </label>

            <button
              type="button"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                showFilterPanel ? 'bg-amber-500/10 text-amber-800 border-amber-500/30' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              {showFilterPanel ? 'Hide Filters' : 'Show Advanced Filters'}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                ref={searchInputRef}
                id="counter-search"
                type="text"
                placeholder="Enter 12-digit Aadhaar Card Number or Customer Name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-300 focus:border-brand-navy focus:bg-white text-sm font-semibold text-slate-900 rounded-xl focus:outline-none placeholder:text-slate-400 transition-colors shadow-xs"
              />

            </div>

            <Button type="submit" variant="primary" size="lg" disabled={isSearching || !searchQuery.trim()} className="h-12 px-6 text-sm font-bold">
              {isSearching ? 'Searching...' : 'Lookup'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="lg"
              icon={UserPlus}
              className="h-12 px-5 text-sm font-bold whitespace-nowrap"
              onClick={() => setAddModalOpen(true)}
            >
              + Customer
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              icon={Upload}
              className="h-12 px-4 text-xs font-bold whitespace-nowrap"
              onClick={() => setBulkModalOpen(true)}
            >
              Bulk Import CSV
            </Button>
          </div>

          {/* Prominent Advanced Filter Panel */}
          {showFilterPanel && (
            <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in duration-150">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Branch</label>
                <select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
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
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
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
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">All (2W & 4W)</option>
                  <option value="4W">4-Wheeler (4W)</option>
                  <option value="2W">2-Wheeler (2W)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tier</label>
                <select
                  value={filterTier}
                  onChange={(e) => setFilterTier(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
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
                    setFilterModel('');
                    setFilterVehicleType('');
                    setFilterTier('');
                  }}
                  className="w-full text-xs font-bold text-slate-600 hover:text-slate-900 p-2 text-center"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-medium text-slate-500 pt-1">
            <span>⚡ Case-insensitive search: Press Enter or click Lookup to resolve customer.</span>
            {customerData && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCustomerData(null);
                  setSearchResults([]);
                  setHasSearched(false);
                }}
                className="text-brand-navy font-bold hover:underline"
              >
                Clear Profile View
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl flex items-center gap-3 text-rose-700 font-bold text-xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Results Picker (if multiple matches found) */}
      {!customerData && hasSearched && searchResults.length > 1 && (
        <div className="bg-white border border-surface-border rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Search Matches ({searchResults.length} customers found)
            </h3>
            <button
              onClick={handleExportSearchCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
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
        <div className="bg-white border border-surface-border rounded-xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">No Customer Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No customer matches "{searchQuery}". Check the mobile number, customer name, or vehicle chassis / VIN number.
          </p>
        </div>
      )}

      {/* Customer Profile Loading Skeleton */}
      {isLoadingProfile && <Skeleton.CustomerProfile />}

      {/* Customer 360 View */}
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
