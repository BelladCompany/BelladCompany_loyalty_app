import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, RefreshCw, Car, Phone, User, AlertCircle, ArrowRight } from 'lucide-react';
import { Button, Input, StatusBadge, DataTable } from '../components/ui';
import Customer360View from '../components/dashboard/Customer360View';
import AddCustomerModal from '../components/dashboard/AddCustomerModal';
import ApiService from '../services/api';

export const CashierDashboard = ({ user, activeTab, resetNonce }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [ledgerData, setLedgerData] = useState([]);
  const [tierInfo, setTierInfo] = useState(null);
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const searchInputRef = useRef(null);

  // Load branches metadata on mount
  useEffect(() => {
    ApiService.getBranches()
      .then((res) => setBranches(res.data || []))
      .catch(() => setBranches([{ id: 1, name: 'Central Showroom - Bangalore' }]));
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
    }
  };

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
      const results = res.data || [];
      setSearchResults(results);

      // If single exact match, auto-select it directly for speed
      if (results.length === 1) {
        await loadCustomerProfile(results[0].customer_id);
      } else {
        // Multiple matches or zero matches: clear current customer profile
        // so that the matches picker or the empty state is displayed immediately!
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

  // After a new customer is created, immediately load their profile
  const handleCustomerCreated = async (newCustomer) => {
    setAddModalOpen(false);
    await loadCustomerProfile(newCustomer.customer_id);
  };

  // Search Results Table Columns
  const resultColumns = [
    {
      field: 'customer_id',
      header: 'Customer ID',
      sortable: true,
      cellClassName: 'font-mono font-bold text-ink-primary',
    },
    { field: 'name', header: 'Customer Name', sortable: true, cellClassName: 'font-bold text-ink-primary' },
    {
      field: 'phones',
      header: 'Registered Phone(s)',
      render: (val) => (
        <div className="flex flex-wrap gap-1 font-mono text-sm">
          {(val || []).map((p, idx) => (
            <span key={idx} className="bg-slate-100 px-2 py-0.5 border border-slate-300 rounded">
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
        <div className="text-sm font-semibold text-ink-secondary">
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
      
      {/* Search Header Banner */}
      <div className="bg-white border-2 border-surface-border rounded-lg p-6 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-4">
          <label htmlFor="counter-search" className="text-xl font-bold text-ink-primary block">
            Counter Search: Mobile Number / Customer Name / Chassis No. / VIN / Customer ID
          </label>

          <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-ink-secondary">
                  <Search className="w-6 h-6" />
                </div>
                <input
                  ref={searchInputRef}
                  id="counter-search"
                  type="text"
                  placeholder="Enter 10-digit mobile number, vehicle chassis / VIN number, customer name, or BAC ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full min-h-[48px] h-14 pl-14 pr-4 bg-slate-50 border-2 border-surface-border focus:border-action-primary focus:bg-white text-base font-semibold text-ink-primary rounded-lg focus:outline-none placeholder:text-ink-muted transition-colors"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSearching || !searchQuery.trim()}
                className="h-14 px-8 text-base font-bold shadow-sm"
              >
                {isSearching ? 'Searching...' : 'Lookup Customer'}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="lg"
                icon={UserPlus}
                className="h-14 px-6 text-base font-bold whitespace-nowrap"
                onClick={() => setAddModalOpen(true)}
              >
                + Add Customer
              </Button>
            </div>

          <div className="flex items-center justify-between text-sm font-medium text-ink-secondary pt-1">
            <span>⚡ Tip: Press Enter to instantly resolve customer by phone number.</span>
            {customerData && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCustomerData(null);
                  setSearchResults([]);
                  setHasSearched(false);
                }}
                className="text-action-primary font-bold hover:underline"
              >
                Clear Search
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-action-danger-light border-2 border-red-300 rounded-lg flex items-center gap-3 text-action-danger font-bold text-base">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Results Picker (if multiple matches found) */}
      {!customerData && hasSearched && searchResults.length > 1 && (
        <div className="bg-white border-2 border-surface-border rounded-lg p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-ink-primary">
              Search Matches ({searchResults.length} customers found)
            </h3>
            <span className="text-sm font-medium text-ink-secondary">Click on a row to open Customer 360 view</span>
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
        <div className="bg-white border-2 border-surface-border rounded-lg p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 text-ink-muted rounded-full flex items-center justify-center mx-auto">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-ink-primary">No Customer Found</h3>
          <p className="text-base font-medium text-ink-secondary max-w-md mx-auto">
            No customer matches "{searchQuery}". Check the mobile number, customer name, or vehicle chassis / VIN number.
          </p>
        </div>
      )}

      {/* Customer 360 View */}
      {customerData && (
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
        onSuccess={handleCustomerCreated}
        user={user}
      />

    </div>
  );
};

export default CashierDashboard;
