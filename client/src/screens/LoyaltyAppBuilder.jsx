import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Smartphone,
  Tablet,
  Monitor,
  Sparkles,
  Percent,
  DollarSign,
  Crown,
  ShieldCheck,
  Palette,
  Sliders,
  Plus,
  Edit2,
  Trash2,
  Play,
  Check,
  X,
  Search,
  Filter,
  Calendar,
  RotateCcw,
  Coins,
  Star,
  Gift,
  Car,
  Bike,
  Truck,
  Tractor,
  Wrench,
  ShoppingBag,
  Tag,
  Layers,
  Store,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  ArrowLeft,
  ExternalLink,
  Lock,
  Building2,
  UserCheck,
  Calculator,
  QrCode,
  CreditCard,
  Users,
  ChevronDown
} from 'lucide-react';
import ApiService from '../services/api';

/**
 * Standard Dealerships / Tenants Catalog
 */
const DEALERSHIPS = [
  { id: 'bellad_and_company', name: 'Bellad & Company', brands: 'Tata Motors & MG Motors', city: 'Hubballi / Belagavi' },
  { id: 'sprint_hero', name: 'Sprint Moto Club', brands: 'Hero MotoCorp & EV', city: 'Hubballi / Belagavi' },
  { id: 'trident_automobiles', name: 'Trident Automobiles', brands: 'Hyundai & Multi-Brand', city: 'Bengaluru Metro' },
  { id: 'advaith_motors', name: 'Advaith Motors', brands: 'Advaith Auto Group', city: 'Bengaluru / Mysuru' },
];

/**
 * Pre-configured Test Customers for Simulator & Live Preview
 */
const TEST_CUSTOMERS = [
  {
    id: 'cust_1',
    name: 'Rahul Sharma',
    phone: '9888877777',
    tier: 'Gold VIP',
    tierKey: 'gold',
    vehicle: 'Tata Safari Dark Edition',
    chassis: 'KA-25-EA-8899',
    spend_type: 'service',
    spend_amount: 18500,
    vehicle_type: '4W',
    brand: 'Tata Motors',
    points_balance: 4250,
  },
  {
    id: 'cust_2',
    name: 'Priya Patel',
    phone: '9777766666',
    tier: 'Silver Member',
    tierKey: 'silver',
    vehicle: 'Tata Nexon Creative Plus',
    chassis: 'KA-22-MB-4411',
    spend_type: 'sale',
    spend_amount: 1450000,
    vehicle_type: '4W',
    brand: 'Tata Motors',
    points_balance: 14500,
  },
  {
    id: 'cust_3',
    name: 'Vikram Singh Fleet Logistics',
    phone: '9900011223',
    tier: 'Diamond Director',
    tierKey: 'diamond',
    vehicle: 'Tata Prima 5530.S Heavy Truck',
    chassis: 'KA-25-TR-9900',
    spend_type: 'sale',
    spend_amount: 3800000,
    vehicle_type: 'Commercial',
    brand: 'Tata Motors Commercial',
    points_balance: 76000,
  },
];

export default function LoyaltyAppBuilder({ user, onExitToCounterApp }) {
  // ─── 1. Core Builder Workspace State ──────────────────────────────────────
  const [viewMode, setViewMode] = useState('mobile'); // 'mobile' | 'tablet' | 'desktop'
  const [activeTab, setActiveTab] = useState('rules_catalog'); // 'rules_catalog' | 'formulas' | 'redemption' | 'tiers' | 'simulator' | 'approvals' | 'theme'
  const [selectedTenant, setSelectedTenant] = useState('bellad_and_company');
  const [selectedCustomer, setSelectedCustomer] = useState(TEST_CUSTOMERS[0]);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastError, setToastError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const showToast = (msg, isErr = false) => {
    setToastMsg(msg);
    setToastError(isErr);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // ─── 2. Database Live Master Rules State ──────────────────────────────────
  const [rules, setRules] = useState([]);
  const [stats, setStats] = useState({});
  const [searchFilter, setSearchFilter] = useState('');
  const [schemeFilter, setSchemeFilter] = useState('ALL');
  const [spendFilter, setSpendFilter] = useState('ALL');

  // Rule Editor Modal State
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [ruleFormData, setRuleFormData] = useState({
    rule_code: '',
    rule_name: '',
    description: '',
    scheme_type: 'standard',
    spend_type: 'sale',
    vehicle_type: '4W',
    brand_name: 'Tata Motors',
    min_spend_rs: 0,
    max_spend_rs: '',
    points_multiplier_numerator: 1,
    points_multiplier_denominator: 100,
    priority_tier: 'ALL',
    priority_weight: 100,
    approval_status: 'approved',
  });

  // ─── 3. Points Gain Formulas State (Ex-Showroom 1%, Service 4%, etc.) ─────
  const [formulas, setFormulas] = useState({
    sale: { rate: 1.0, deductInsurance: true, deductRto: true, deductTcs: true },
    service: { rate: 4.0 },
    accessories: { rate: 2.0 },
    bodyshop: { rate: 3.0 },
    spares: { rate: 2.0 },
    referralBonus: 500,
    reviewBonus: 250,
    exchangeBonus: 1000,
  });

  // ─── 4. Redemption Policy, 12M Lock-In & Bill Caps ─────────────────────────
  const [redemptionPolicy, setRedemptionPolicy] = useState({
    pointsPerRupee: 4, // 4 pts = ₹1.00 (0.25 conversion)
    serviceBillCapPercent: 30, // 30% Max discount on routine service
    accessoriesBillCapPercent: 50, // 50% Max discount on accessories
    vehicleLockinMonths: 12, // 12-Month Lock on vehicle purchase points
    accessoriesExemption: true, // Accessories exempt from 12-Month lock
    pointsExpiryMonths: 24, // 24-Month FIFO expiry
    requireWhatsAppOtp: true,
  });

  // ─── 5. Director Agstya Priority Slabs ─────────────────────────────────────
  const [tierModel, setTierModel] = useState('spend'); // 'spend' | 'points' | 'flagship'
  const [tierSlabs, setTierSlabs] = useState([]);

  // ─── 6. Live Policy Simulator State ────────────────────────────────────────
  const [simParams, setSimParams] = useState({
    spend_type: 'service',
    vehicle_type: '4W',
    spend_amount: 18500,
    priority_tier: 'gold',
  });
  const [simResult, setSimResult] = useState(null);
  const [simRunning, setSimRunning] = useState(false);

  // ─── 7. Branding & Module Toggles ─────────────────────────────────────────
  const [branding, setBranding] = useState({
    appName: 'Bellad & Co Loyalty Pass',
    tagline: "Karnataka's Premier Automotive Rewards",
    primaryColor: '#4f46e5',
    cardGradient: 'gold',
  });

  const [modules, setModules] = useState({
    digitalCard: true,
    qrPass: true,
    serviceRewards: true,
    vehicleSalesRewards: true,
    accessoriesRewards: true,
    bodyshopRewards: true,
    vouchersHub: true,
    referralProgram: true,
    googleReviewBonus: true,
    customerGarage: true,
  });

  // ─── 8. Data Fetching from Live Backend ───────────────────────────────────
  const loadMasterRules = useCallback(async (tenantId = selectedTenant) => {
    try {
      setLoading(true);
      const res = await ApiService.request(`/master-rules?tenant_id=${encodeURIComponent(tenantId)}`);
      if (res && res.data) {
        setRules(res.data);
        setStats(res.stats || {});
      }
    } catch (err) {
      console.warn('Error loading master rules:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTenant]);

  const loadPriorityTiers = useCallback(async (tenantId = selectedTenant) => {
    try {
      const res = await ApiService.getMasterPriorityTiers(tenantId);
      if (res && res.data) {
        setTierSlabs(res.data);
      }
    } catch (err) {
      console.warn('Error loading tiers:', err);
    }
  }, [selectedTenant]);

  const loadPolicy = useCallback(async (tenantId = selectedTenant) => {
    try {
      const res = await ApiService.getDealershipPolicy(tenantId);
      if (res && res.data) {
        if (res.data.point_to_rupee_rate) {
          setRedemptionPolicy((prev) => ({
            ...prev,
            pointsPerRupee: Math.round(1 / res.data.point_to_rupee_rate),
          }));
        }
      }
    } catch (err) {
      console.warn('Error loading policy:', err);
    }
  }, [selectedTenant]);

  useEffect(() => {
    loadMasterRules(selectedTenant);
    loadPriorityTiers(selectedTenant);
    loadPolicy(selectedTenant);
  }, [selectedTenant, loadMasterRules, loadPriorityTiers, loadPolicy]);

  // ─── 9. Instant Master Rule Toggles & Actions (Implemented Next Sec!) ───────

  // Instant 1-second toggle rule active/inactive in DB
  const handleToggleRuleActive = async (ruleId) => {
    try {
      await ApiService.toggleActiveMasterRule(ruleId);
      // Immediately reflect in local state & database
      setRules((prev) =>
        prev.map((r) => (r.rule_id === ruleId ? { ...r, is_active: !r.is_active } : r))
      );
      showToast('Rule status updated live in PostgreSQL database.');
    } catch (err) {
      showToast(err.message || 'Failed to toggle rule', true);
    }
  };

  // Instant approve rule by Director
  const handleApproveRule = async (ruleId) => {
    try {
      await ApiService.approveMasterRule(ruleId, 'Approved by Executive Director Agstya');
      setRules((prev) =>
        prev.map((r) => (r.rule_id === ruleId ? { ...r, approval_status: 'approved' } : r))
      );
      showToast('Rule approved and activated instantly.');
    } catch (err) {
      showToast(err.message || 'Failed to approve rule', true);
    }
  };

  // Instant delete rule
  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule from the live database?')) return;
    try {
      await ApiService.deleteMasterRule(ruleId);
      setRules((prev) => prev.filter((r) => r.rule_id !== ruleId));
      showToast('Rule deleted successfully from database.');
    } catch (err) {
      showToast(err.message || 'Failed to delete rule', true);
    }
  };

  // Save / Create Master Rule in DB
  const handleSaveRuleModal = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const payload = {
        ...ruleFormData,
        tenant_id: selectedTenant,
        min_spend_rs: Number(ruleFormData.min_spend_rs || 0),
        max_spend_rs: ruleFormData.max_spend_rs ? Number(ruleFormData.max_spend_rs) : null,
        points_multiplier_numerator: Number(ruleFormData.points_multiplier_numerator || 1),
        points_multiplier_denominator: Number(ruleFormData.points_multiplier_denominator || 100),
      };

      if (editingRuleId) {
        await ApiService.updateMasterRule(editingRuleId, payload);
        showToast('Rule updated in live database.');
      } else {
        await ApiService.createMasterRule(payload);
        showToast('New rule created & deployed live.');
      }

      setRuleModalOpen(false);
      setEditingRuleId(null);
      await loadMasterRules(selectedTenant);
    } catch (err) {
      showToast(err.message || 'Failed to save rule', true);
    } finally {
      setIsSaving(false);
    }
  };

  // Run live simulator calculation
  const handleRunSimulation = async () => {
    try {
      setSimRunning(true);
      const res = await ApiService.simulateMasterRule({
        tenant_id: selectedTenant,
        spend_type: simParams.spend_type,
        vehicle_type: simParams.vehicle_type,
        spend_amount: Number(simParams.spend_amount || 0),
        priority_tier: simParams.priority_tier,
        brand_name: 'Tata Motors',
        model_name: 'ALL',
        branch_name: 'Belagavi',
        transaction_date: new Date().toISOString(),
      });
      if (res && res.data) {
        setSimResult(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Simulation error', true);
    } finally {
      setSimRunning(false);
    }
  };

  // Filtered master rules list
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const matchSearch =
        !searchFilter ||
        r.rule_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        r.rule_code?.toLowerCase().includes(searchFilter.toLowerCase());
      const matchScheme = schemeFilter === 'ALL' || r.scheme_type === schemeFilter;
      const matchSpend = spendFilter === 'ALL' || r.spend_type === spendFilter;
      return matchSearch && matchScheme && matchSpend;
    });
  }, [rules, searchFilter, schemeFilter, spendFilter]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-800 antialiased">
      {/* ========================================================
          1. TOP APP BUILDER HEADER (Clean, Unclipped, Live)
          ======================================================== */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-30 shadow-2xs">
        {/* Software Title & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                Loyalty Studio Builder
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                Live Master Control
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium block -mt-0.5">
              Rules modified here take effect in PostgreSQL the next second
            </span>
          </div>
        </div>

        {/* DEVICE VIEWPORT SWITCHER (Mobile, Tablet, Desktop) */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === 'mobile'
                ? 'bg-white text-purple-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('tablet')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === 'tablet'
                ? 'bg-white text-purple-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span>Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === 'desktop'
                ? 'bg-white text-purple-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>
        </div>

        {/* Dealership Switcher & POS Link */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Store className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              {DEALERSHIPS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.brands})
                </option>
              ))}
            </select>
          </div>

          {toastMsg && (
            <span className={`text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1 animate-fadeIn ${
              toastError ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              {toastError ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{toastMsg}</span>
            </span>
          )}

          {onExitToCounterApp && (
            <button
              type="button"
              onClick={onExitToCounterApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Counter POS</span>
            </button>
          )}
        </div>
      </header>

      {/* ========================================================
          2. WORKSPACE (Left: Complete Control Studio | Right: Live Preview)
          ======================================================== */}
      <div className="flex-1 flex overflow-hidden">

        {/* ----------------------------------------------------
            LEFT PANEL: Editor Dashboard in Builder (52% width)
            ---------------------------------------------------- */}
        <section className="w-full lg:w-[52%] bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
          {/* Builder Navigation Sub-Tabs */}
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 pt-3 flex gap-1.5 overflow-x-auto shrink-0 select-none">
            {[
              { id: 'rules_catalog', label: 'Master Rules Catalog', icon: Sliders },
              { id: 'formulas', label: 'Earning Formulas', icon: Percent },
              { id: 'redemption', label: 'Redeem, Lock & Caps', icon: DollarSign },
              { id: 'tiers', label: 'Priority VIP Slabs', icon: Crown },
              { id: 'approvals', label: 'Director Approvals', icon: ShieldCheck },
              { id: 'simulator', label: 'Policy Simulator', icon: Play },
              { id: 'theme', label: 'Theme & Toggles', icon: Palette },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 border-b-2 text-xs font-bold whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Builder Scrollable Content Panel */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* TAB 1: MASTER RULES CATALOG (The Heart of Editor) */}
            {activeTab === 'rules_catalog' && (
              <div className="space-y-4">
                {/* Header Actions */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Live PostgreSQL Rules Catalog</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Toggle, create, or modify rules. Any change is deployed to cashiers instantly.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRuleId(null);
                      setRuleFormData({
                        rule_code: `RULE-${Date.now().toString().slice(-4)}`,
                        rule_name: '',
                        description: '',
                        scheme_type: 'standard',
                        spend_type: 'sale',
                        vehicle_type: '4W',
                        brand_name: 'Tata Motors',
                        min_spend_rs: 0,
                        max_spend_rs: '',
                        points_multiplier_numerator: 1,
                        points_multiplier_denominator: 100,
                        priority_tier: 'ALL',
                        priority_weight: 100,
                        approval_status: 'approved',
                      });
                      setRuleModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Rule</span>
                  </button>
                </div>

                {/* Search & Filters */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search rule name or code..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 outline-none"
                    />
                  </div>
                  <select
                    value={schemeFilter}
                    onChange={(e) => setSchemeFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none font-bold text-slate-700"
                  >
                    <option value="ALL">All Schemes</option>
                    <option value="standard">Standard Loyalty</option>
                    <option value="festive">Festive Offers</option>
                    <option value="exchange">Used Car Exchange</option>
                    <option value="insurance">In-House Insurance</option>
                    <option value="finance">In-House Finance</option>
                    <option value="google">Google 5★ Reviews</option>
                  </select>
                  <select
                    value={spendFilter}
                    onChange={(e) => setSpendFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none font-bold text-slate-700"
                  >
                    <option value="ALL">All Spend Types</option>
                    <option value="sale">Vehicle Sales (1%)</option>
                    <option value="service">Workshop Service (4%)</option>
                    <option value="accessories">Accessories (2%)</option>
                    <option value="bodyshop">Bodyshop (3%)</option>
                  </select>
                </div>

                {/* Rules List Cards with Instant Toggle Buttons */}
                <div className="space-y-2.5">
                  {loading ? (
                    <div className="p-8 text-center text-xs text-slate-400">Loading master rules from database...</div>
                  ) : filteredRules.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No master rules found matching filters.
                    </div>
                  ) : (
                    filteredRules.map((r) => {
                      const isActive = r.is_active;
                      const isApproved = r.approval_status === 'approved';
                      return (
                        <div
                          key={r.rule_id}
                          className={`p-3.5 rounded-xl border transition flex items-center justify-between ${
                            isActive ? 'bg-white border-slate-200 hover:border-purple-300 shadow-2xs' : 'bg-slate-50/70 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <strong className="text-xs font-bold text-slate-900">{r.rule_name}</strong>
                              <span className="font-mono text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-bold">
                                {r.rule_code}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                                {r.spend_type}
                              </span>
                              {!isApproved && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                  Pending Director Approval
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-3">
                              <span>Rate: <strong>{r.points_multiplier_numerator}/{r.points_multiplier_denominator}</strong></span>
                              <span>•</span>
                              <span>Vehicle: <strong>{r.vehicle_type}</strong></span>
                              <span>•</span>
                              <span>Tier: <strong>{r.priority_tier}</strong></span>
                            </div>
                          </div>

                          {/* Quick Action Controls */}
                          <div className="flex items-center gap-2">
                            {!isApproved && (
                              <button
                                type="button"
                                onClick={() => handleApproveRule(r.rule_id)}
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold shadow-2xs hover:bg-emerald-700"
                              >
                                Approve
                              </button>
                            )}

                            {/* Live Toggle Button (Takes effect next second!) */}
                            <button
                              type="button"
                              onClick={() => handleToggleRuleActive(r.rule_id)}
                              className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                                isActive ? 'bg-purple-600' : 'bg-slate-300'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${
                                isActive ? 'translate-x-4' : 'translate-x-0'
                              }`} />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(r.rule_id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: POINTS EARNING FORMULAS */}
            {activeTab === 'formulas' && (
              <div className="space-y-4 text-xs">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-extrabold text-slate-900">Department Points Gain Formulas</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live calculation formulas for Vehicle Sales, Workshop Service, Accessories, and Bodyshop
                  </p>
                </div>

                {/* Vehicle Sales 1% Net Ex-Showroom */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-purple-600" />
                      <strong className="text-slate-900 font-bold">Vehicle Purchase Net Ex-Showroom Formula</strong>
                    </div>
                    <span className="font-mono font-bold text-purple-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {formulas.sale.rate}% Net Ex-Showroom
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="3.0"
                    step="0.25"
                    value={formulas.sale.rate}
                    onChange={(e) => setFormulas({
                      ...formulas,
                      sale: { ...formulas.sale, rate: parseFloat(e.target.value) }
                    })}
                    className="w-full accent-purple-600 cursor-pointer"
                  />

                  {/* Deduction Checkboxes */}
                  <div className="pt-2 border-t border-slate-200 space-y-1.5">
                    <span className="font-bold text-slate-700 block text-[11px]">Mandatory Statutory Deductions:</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formulas.sale.deductInsurance}
                          onChange={(e) => setFormulas({
                            ...formulas,
                            sale: { ...formulas.sale, deductInsurance: e.target.checked }
                          })}
                          className="rounded text-purple-600"
                        />
                        <span>Deduct Comprehensive Insurance</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formulas.sale.deductRto}
                          onChange={(e) => setFormulas({
                            ...formulas,
                            sale: { ...formulas.sale, deductRto: e.target.checked }
                          })}
                          className="rounded text-purple-600"
                        />
                        <span>Deduct RTO & Road Tax</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formulas.sale.deductTcs}
                          onChange={(e) => setFormulas({
                            ...formulas,
                            sale: { ...formulas.sale, deductTcs: e.target.checked }
                          })}
                          className="rounded text-purple-600"
                        />
                        <span>Deduct TCS (1% Tax at Source)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Service, Accessories, Bodyshop */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="font-bold text-slate-800 block">Workshop Service</span>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Labor + Spares</span>
                      <span className="font-mono font-bold text-emerald-700">{formulas.service.rate}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="6"
                      step="0.5"
                      value={formulas.service.rate}
                      onChange={(e) => setFormulas({
                        ...formulas,
                        service: { ...formulas.service, rate: parseFloat(e.target.value) }
                      })}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="font-bold text-slate-800 block">Genuine Accessories</span>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Counter Sale</span>
                      <span className="font-mono font-bold text-purple-700">{formulas.accessories.rate}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={formulas.accessories.rate}
                      onChange={(e) => setFormulas({
                        ...formulas,
                        accessories: { ...formulas.accessories, rate: parseFloat(e.target.value) }
                      })}
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="font-bold text-slate-800 block">Bodyshop Repairs</span>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Customer Share</span>
                      <span className="font-mono font-bold text-blue-700">{formulas.bodyshop.rate}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={formulas.bodyshop.rate}
                      onChange={(e) => setFormulas({
                        ...formulas,
                        bodyshop: { ...formulas.bodyshop, rate: parseFloat(e.target.value) }
                      })}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: REDEMPTION, LOCK-IN & BILL CAPS */}
            {activeTab === 'redemption' && (
              <div className="space-y-4 text-xs">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-extrabold text-slate-900">Points Redemption, Valuation & Lock-In</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure the 4:1 conversion ratio, 12-month lock, and accessories exemption
                  </p>
                </div>

                {/* Valuation Ratio Pill Selector */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 font-bold">Valuation Conversion Ratio</strong>
                    <span className="font-mono font-bold text-purple-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {redemptionPolicy.pointsPerRupee} Points = ₹1.00
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[4, 2, 1].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRedemptionPolicy({ ...redemptionPolicy, pointsPerRupee: r })}
                        className={`p-2.5 rounded-xl border text-center transition ${
                          redemptionPolicy.pointsPerRupee === r
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <strong className="font-mono block text-xs">{r} Pts</strong>
                        <span className="text-[10px] opacity-90 block">= ₹1.00</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 12-Month Vehicle Purchase Lock & ACCESSORIES EXEMPTION */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-slate-900 block font-bold">Vehicle Purchase Lock-In Horizon</strong>
                      <span className="text-[10px] text-slate-500">Points locked for 12 months for routine service</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={redemptionPolicy.vehicleLockinMonths}
                        onChange={(e) => setRedemptionPolicy({ ...redemptionPolicy, vehicleLockinMonths: parseInt(e.target.value) || 0 })}
                        className="w-16 bg-white border border-slate-200 rounded-lg p-1.5 font-mono font-bold text-slate-900 text-center"
                      />
                      <span className="text-slate-500 font-bold">Mo</span>
                    </div>
                  </div>

                  {/* ACCESSORIES EXEMPTION TOGGLE */}
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                    <div>
                      <strong className="text-emerald-950 block text-[11px] font-bold">Accessories Lock-In Exemption</strong>
                      <span className="text-[10px] text-emerald-700 leading-tight block">
                        Allow customers to redeem points immediately for genuine accessories without waiting 12 months.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRedemptionPolicy({ ...redemptionPolicy, accessoriesExemption: !redemptionPolicy.accessoriesExemption })}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ml-3 ${
                        redemptionPolicy.accessoriesExemption ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${
                        redemptionPolicy.accessoriesExemption ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Service & Accessories Margin Caps */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="font-bold text-slate-800 block">Workshop Service Bill Cap</span>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Max Discount on Bill</span>
                      <span className="font-mono font-bold text-purple-700">{redemptionPolicy.serviceBillCapPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="50"
                      step="5"
                      value={redemptionPolicy.serviceBillCapPercent}
                      onChange={(e) => setRedemptionPolicy({ ...redemptionPolicy, serviceBillCapPercent: parseInt(e.target.value) })}
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="font-bold text-slate-800 block">Accessories Bill Cap</span>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Max Discount on Bill</span>
                      <span className="font-mono font-bold text-emerald-700">{redemptionPolicy.accessoriesBillCapPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="60"
                      step="5"
                      value={redemptionPolicy.accessoriesBillCapPercent}
                      onChange={(e) => setRedemptionPolicy({ ...redemptionPolicy, accessoriesBillCapPercent: parseInt(e.target.value) })}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: DIRECTOR AGSTYA PRIORITY SLABS */}
            {activeTab === 'tiers' && (
              <div className="space-y-4 text-xs">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-extrabold text-slate-900">Director Agstya Dynamic Priority Slabs</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Toggle qualification basis: Annual Spend vs Cumulative Points vs Flagship Vehicle
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'spend', title: '💰 Annual Spend', desc: '₹1.5L / ₹5L / ₹15L' },
                    { id: 'points', title: '🪙 Cumulative Points', desc: '2.5k / 10k / 30k' },
                    { id: 'flagship', title: '🚗 Flagship Ownership', desc: 'Harrier / Safari / Gloster' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setTierModel(m.id)}
                      className={`p-3 rounded-xl border text-left transition ${
                        tierModel === m.id
                          ? 'border-purple-600 bg-purple-50/70 ring-1 ring-purple-500'
                          : 'border-slate-200 bg-slate-50 hover:bg-white'
                      }`}
                    >
                      <strong className="text-xs font-bold text-slate-900 block">{m.title}</strong>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{m.desc}</span>
                    </button>
                  ))}
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                      <tr>
                        <th className="p-2.5">Tier</th>
                        <th className="p-2.5">Threshold ({tierModel})</th>
                        <th className="p-2.5">Multiplier</th>
                        <th className="p-2.5">Perk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr>
                        <td className="p-2.5 font-bold text-slate-700">Silver Member</td>
                        <td className="p-2.5 text-slate-500 font-mono">₹0 Entry</td>
                        <td className="p-2.5 font-mono font-bold">1.00x</td>
                        <td className="p-2.5 text-slate-400">Standard Access</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-amber-600">Gold VIP</td>
                        <td className="p-2.5 text-slate-700 font-mono">₹1.5L Annual Spend</td>
                        <td className="p-2.5 font-mono font-bold text-purple-700">1.25x</td>
                        <td className="p-2.5 text-emerald-600 font-bold">Free Wash</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-slate-900">Platinum Elite</td>
                        <td className="p-2.5 text-slate-700 font-mono">₹5.0L Annual Spend</td>
                        <td className="p-2.5 font-mono font-bold text-purple-700">1.50x</td>
                        <td className="p-2.5 text-emerald-600 font-bold">Priority Bay</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-purple-700">Diamond Director</td>
                        <td className="p-2.5 text-slate-700 font-mono">₹15.0L Fleet / Comm</td>
                        <td className="p-2.5 font-mono font-bold text-purple-700">2.00x</td>
                        <td className="p-2.5 text-emerald-600 font-bold">Dedicated Advisor</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 5: DIRECTOR APPROVALS & KYC QUEUE */}
            {activeTab === 'approvals' && (
              <div className="space-y-4 text-xs">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-extrabold text-slate-900">Director Agstya Approvals & Risk Controls</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Maker-checker authorization, high-value transaction queue, and KYC thresholds
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-slate-900 block font-bold">Agstya Sir Approval Limit</strong>
                      <span className="text-[10px] text-slate-500">Manual points credit threshold requiring Director review</span>
                    </div>
                    <span className="font-mono font-bold text-purple-700 bg-white px-3 py-1 rounded-lg border border-slate-200">
                      &gt; 1,000 Points
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <div>
                      <strong className="text-slate-900 block font-bold">Mandatory KYC Verification Limit</strong>
                      <span className="text-[10px] text-slate-500">Requires verified PAN/Aadhaar before redemption</span>
                    </div>
                    <span className="font-mono font-bold text-purple-700 bg-white px-3 py-1 rounded-lg border border-slate-200">
                      &gt; 10,000 Points
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 text-xs">
                  <strong>Strict VIN / Chassis Uniqueness Enforcement:</strong>
                  <p className="text-[11px] text-purple-700 mt-0.5">
                    PostgreSQL database strictly enforces 1 VIN = 1 vehicle purchase reward issuance. Prevents duplicate points fraud across branches.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 6: LIVE POLICY SIMULATOR */}
            {activeTab === 'simulator' && (
              <div className="space-y-4 text-xs">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-extrabold text-slate-900">Live Policy & Points Simulator</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Simulate customer transactions against active master rules to verify points awarded and discounts
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Spend Category</label>
                      <select
                        value={simParams.spend_type}
                        onChange={(e) => setSimParams({ ...simParams, spend_type: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-800"
                      >
                        <option value="sale">Vehicle Purchase (1%)</option>
                        <option value="service">Workshop Routine Service (4%)</option>
                        <option value="accessories">Genuine Accessories (2%)</option>
                        <option value="bodyshop">Bodyshop Repairs (3%)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Spend Amount (₹)</label>
                      <input
                        type="number"
                        value={simParams.spend_amount}
                        onChange={(e) => setSimParams({ ...simParams, spend_amount: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunSimulation}
                    disabled={simRunning}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    {simRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Run Simulation</span>
                  </button>

                  {simResult && (
                    <div className="p-3 bg-white rounded-xl border border-purple-200 space-y-1.5 animate-fadeIn">
                      <strong className="text-purple-900 block font-bold">Simulation Results:</strong>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Points Awarded:</span>
                        <strong className="text-purple-700 font-mono text-sm">{simResult.points_awarded || simResult.points_calculated || 0} pts</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Effective Cash Value (4:1):</span>
                        <strong className="text-emerald-600 font-mono">₹{((simResult.points_awarded || 0) / 4).toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Rule Evaluated:</span>
                        <span className="text-slate-700 font-mono">{simResult.applied_rule?.rule_name || 'Standard Rate'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 7: THEME & COMPONENT TOGGLES */}
            {activeTab === 'theme' && (
              <div className="space-y-4 text-xs">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-extrabold text-slate-900">App Branding & Feature Toggles</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Customize customer-facing theme, primary colors, and toggle active modules
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">App Display Name</label>
                    <input
                      type="text"
                      value={branding.appName}
                      onChange={(e) => setBranding({ ...branding, appName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
                    />
                  </div>

                  {/* Primary Color Palette */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">Brand Primary Color</label>
                    <div className="flex items-center gap-3">
                      {[
                        { color: '#4f46e5', name: 'Indigo' },
                        { color: '#2563eb', name: 'Tata Blue' },
                        { color: '#dc2626', name: 'Hero Red' },
                        { color: '#059669', name: 'Emerald' },
                        { color: '#7c3aed', name: 'Purple' },
                      ].map((c) => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => setBranding({ ...branding, primaryColor: c.color })}
                          className={`w-7 h-7 rounded-full border-2 transition ${
                            branding.primaryColor === c.color ? 'border-slate-900 scale-110 shadow-sm' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c.color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </section>

        {/* ----------------------------------------------------
            RIGHT PANEL: Live Interactive Loyalty App Preview (48% width)
            ---------------------------------------------------- */}
        <section className="flex-1 bg-slate-200/60 p-6 flex flex-col items-center justify-center overflow-hidden relative">
          {/* Top Customer Switcher & Device Label */}
          <div className="absolute top-3 left-6 right-6 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-slate-600">LIVE PREVIEW ({viewMode.toUpperCase()})</span>
            </div>

            {/* Test Customer Switcher */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-300 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold">Preview Member:</span>
              <select
                value={selectedCustomer.id}
                onChange={(e) => {
                  const cust = TEST_CUSTOMERS.find((c) => c.id === e.target.value);
                  if (cust) setSelectedCustomer(cust);
                }}
                className="bg-transparent font-bold text-slate-800 text-xs outline-none cursor-pointer"
              >
                {TEST_CUSTOMERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.tier})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DYNAMIC DEVICE VIEWPORT CONTAINER */}
          <div
            className={`transition-all duration-300 ease-in-out bg-white flex flex-col shadow-2xl overflow-hidden mt-6 ${
              viewMode === 'mobile'
                ? 'w-[375px] h-[670px] rounded-[44px] border-[10px] border-slate-900'
                : viewMode === 'tablet'
                ? 'w-[560px] h-[670px] rounded-[36px] border-[12px] border-slate-900'
                : 'w-full max-w-[800px] h-[670px] rounded-2xl border border-slate-300'
            }`}
          >
            {/* Mobile Notch */}
            {viewMode === 'mobile' && (
              <div className="h-6 bg-slate-900 flex items-center justify-center shrink-0">
                <div className="w-20 h-3 bg-black rounded-full" />
              </div>
            )}

            {/* LIVE CUSTOMER LOYALTY APP SCREEN */}
            <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 font-sans">
              {/* App Navigation Bar */}
              <div
                className="px-5 py-3.5 text-white flex items-center justify-between shrink-0 shadow-xs"
                style={{ backgroundColor: branding.primaryColor }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xs">
                    <Store className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="font-extrabold text-xs tracking-tight block leading-tight">
                      {branding.appName}
                    </span>
                    <span className="text-[9px] text-white/80 block leading-tight">
                      {branding.tagline}
                    </span>
                  </div>
                </div>

                <div className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-white uppercase tracking-wider">
                  {selectedCustomer.tier}
                </div>
              </div>

              {/* Scrollable App Body */}
              <div className="p-4 space-y-4">

                {/* DIGITAL MEMBER PASS CARD */}
                {modules.digitalCard && (
                  <div
                    className={`rounded-2xl p-5 text-white shadow-lg relative overflow-hidden bg-gradient-to-tr ${
                      branding.cardGradient === 'gold'
                        ? 'from-amber-600 via-amber-500 to-yellow-600'
                        : 'from-purple-700 via-indigo-600 to-indigo-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 block">
                          Digital Member Pass
                        </span>
                        <h4 className="text-base font-extrabold text-white mt-0.5">{selectedCustomer.name}</h4>
                        <span className="text-[10px] font-mono text-white/70">ID: BAC-9821 • {selectedCustomer.vehicle}</span>
                      </div>
                      <Crown className="w-6 h-6 text-white/90" />
                    </div>

                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <span className="text-[10px] text-white/80 block">Usable Points Balance</span>
                        <div className="text-2xl font-black font-mono tracking-tight text-white">
                          {selectedCustomer.points_balance.toLocaleString()} <span className="text-xs font-normal">pts</span>
                        </div>
                        <span className="text-[11px] font-bold text-white/90 block mt-0.5">
                          ≈ ₹{(selectedCustomer.points_balance / redemptionPolicy.pointsPerRupee).toFixed(2)} Cash Discount ({redemptionPolicy.pointsPerRupee} pts = ₹1)
                        </span>
                      </div>

                      {modules.qrPass && (
                        <div className="w-14 h-14 bg-white rounded-xl p-1 shadow-sm flex items-center justify-center">
                          <QrCode className="w-full h-full text-slate-900" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* QUICK ACTION BUTTONS */}
                <div className="grid grid-cols-4 gap-2">
                  {modules.qrPass && (
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-center shadow-2xs">
                      <QrCode className="w-4 h-4 mx-auto text-purple-600" />
                      <span className="text-[10px] font-bold text-slate-700 block mt-1">QR Pass</span>
                    </div>
                  )}
                  {modules.vouchersHub && (
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-center shadow-2xs">
                      <Gift className="w-4 h-4 mx-auto text-pink-600" />
                      <span className="text-[10px] font-bold text-slate-700 block mt-1">Gift Cards</span>
                    </div>
                  )}
                  {modules.customerGarage && (
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-center shadow-2xs">
                      <Car className="w-4 h-4 mx-auto text-blue-600" />
                      <span className="text-[10px] font-bold text-slate-700 block mt-1">Garage</span>
                    </div>
                  )}
                  {modules.referralProgram && (
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-center shadow-2xs">
                      <Users className="w-4 h-4 mx-auto text-emerald-600" />
                      <span className="text-[10px] font-bold text-slate-700 block mt-1">Rewards</span>
                    </div>
                  )}
                </div>

                {/* EARNING PRIVILEGES (Dynamically reflects formulas state!) */}
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2">
                  <span className="text-[11px] font-bold text-slate-800 block">Current Earning Privileges</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Workshop Service</span>
                      <strong className="text-emerald-700 font-bold font-mono">{formulas.service.rate}% Net Bill</strong>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Vehicle Sales</span>
                      <strong className="text-purple-700 font-bold font-mono">{formulas.sale.rate}% Ex-Showroom</strong>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Accessories</span>
                      <strong className="text-slate-800 font-bold font-mono">{formulas.accessories.rate}% Counter</strong>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Bodyshop</span>
                      <strong className="text-blue-700 font-bold font-mono">{formulas.bodyshop.rate}% Customer Share</strong>
                    </div>
                  </div>
                </div>

                {/* MY VEHICLES & 12-MONTH LOCK STATUS */}
                {modules.customerGarage && (
                  <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800">My Registered Vehicle</span>
                      <span className="text-[10px] font-bold text-purple-600">{selectedCustomer.chassis}</span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-slate-900 block font-bold">{selectedCustomer.vehicle}</strong>
                        <span className="text-[10px] text-slate-400">Delivered: 14 Feb 2026</span>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 block">
                          {redemptionPolicy.vehicleLockinMonths}M Lock Active
                        </span>
                        {redemptionPolicy.accessoriesExemption && (
                          <span className="text-[9px] font-bold text-emerald-600 block mt-0.5">
                            ✓ Accessories Exempt
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ========================================================
          3. ADD / EDIT RULE MODAL (Full Control from Editor)
          ======================================================== */}
      {ruleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">
                {editingRuleId ? 'Edit Master Rule' : 'Create New Master Rule'}
              </h3>
              <button
                type="button"
                onClick={() => setRuleModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRuleModal} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Rule Code *</label>
                  <input
                    type="text"
                    required
                    value={ruleFormData.rule_code}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, rule_code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Rule Name *</label>
                  <input
                    type="text"
                    required
                    value={ruleFormData.rule_name}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, rule_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Scheme Type</label>
                  <select
                    value={ruleFormData.scheme_type}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, scheme_type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold"
                  >
                    <option value="standard">Standard Loyalty</option>
                    <option value="festive">Festive Offers</option>
                    <option value="exchange">Used Car Exchange</option>
                    <option value="insurance">In-House Insurance</option>
                    <option value="finance">In-House Finance</option>
                    <option value="google">Google 5★ Reviews</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Spend Category</label>
                  <select
                    value={ruleFormData.spend_type}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, spend_type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold"
                  >
                    <option value="sale">Vehicle Sales</option>
                    <option value="service">Workshop Service</option>
                    <option value="accessories">Genuine Accessories</option>
                    <option value="bodyshop">Bodyshop Repair</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Points Multiplier Rate</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={ruleFormData.points_multiplier_numerator}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, points_multiplier_numerator: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold text-center"
                    />
                    <span className="text-slate-400 font-bold">/</span>
                    <input
                      type="number"
                      value={ruleFormData.points_multiplier_denominator}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, points_multiplier_denominator: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Vehicle Type</label>
                  <select
                    value={ruleFormData.vehicle_type}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, vehicle_type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold"
                  >
                    <option value="4W">4W Passenger</option>
                    <option value="2W">2W Two-Wheeler</option>
                    <option value="Commercial">Commercial Trucks/Buses</option>
                    <option value="Agri">Machinery / Agri</option>
                    <option value="EV">Electric Vehicles</option>
                    <option value="ALL">All Vehicles</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRuleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs"
                >
                  {isSaving ? 'Deploying...' : 'Deploy to Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
