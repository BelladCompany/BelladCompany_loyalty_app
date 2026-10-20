import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  RotateCcw,
  Trash2,
  Edit2,
  Check,
  X,
  Calendar,
  Sparkles,
  Layers,
  Percent,
  Coins,
  Car,
  Bike,
  Tag,
  Gift,
  Users,
  Award,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Home,
  LogOut,
  ArrowUpRight,
  Crown,
  Wrench,
  ShoppingBag,
  Zap,
  Building2,
  Star,
  FileText,
  UserCheck,
  Store,
  Lock,
  Calculator,
  Truck,
  Tractor,
  Sliders,
  Settings,
  HelpCircle,
  BadgePercent,
  CheckSquare,
  Square,
  Minus,
} from 'lucide-react';
import ApiService from '../services/api';

/**
 * Standard Dealerships / Tenants Catalog
 */
const DEALERSHIPS = [
  {
    id: 'bellad_and_company',
    name: 'Bellad & Company',
    city: 'Hubballi / Belagavi',
    brand: 'Tata Motors & MG Motors',
    tag: 'Primary Group',
    defaultModules: { sales: true, service: true, bodyshop: true, accessories: true, spares: true, gift_cards: true, tier_policy: true },
  },
  {
    id: 'trident_automobiles',
    name: 'Trident Automobiles',
    city: 'Bengaluru (Sankey Rd & Hosur Rd)',
    brand: 'Hyundai & Multi-Brand',
    tag: 'Bangalore Metro',
    defaultModules: { sales: true, service: true, bodyshop: false, accessories: false, spares: false, gift_cards: false, tier_policy: false },
  },
  {
    id: 'advaith_motors',
    name: 'Advaith Motors',
    city: 'Bengaluru / Mysuru',
    brand: 'Advaith Auto Group',
    tag: 'Karnataka Network',
    defaultModules: { sales: true, service: true, bodyshop: true, accessories: true, spares: true, gift_cards: true, tier_policy: true },
  },
  {
    id: 'BAC-MAIN',
    name: 'Bellad Main Hub',
    city: 'Central Logistics & Fleet Hub',
    brand: 'Commercial & Fleet Services',
    tag: 'Central Hub',
    defaultModules: { sales: true, service: true, bodyshop: true, accessories: true, spares: true, gift_cards: true, tier_policy: true },
  },
];

/**
 * Navigation Groups for Sane 2-Column Left Sidebar
 * 1. Scheme Types & Campaigns (TOP)
 * 2. Spend Categories
 * 3. Vehicle & Equipment Types
 * 4. Customer Priority Slabs
 * 5. Dealership & Policy (5th Position)
 * 6. Formulas & Governance
 */
const NAV_GROUPS = [
  {
    id: 'schemes_group',
    title: 'Scheme Types & Campaigns',
    icon: Sparkles,
    items: [
      { id: 'all_schemes', label: 'All Active Campaigns', icon: Sparkles, countKey: 'all_schemes' },
      { id: 'scheme_standard', label: 'Standard Loyalty Schemes', icon: Award, countKey: 'standard' },
      { id: 'scheme_festive', label: 'Festive Offers', icon: Calendar, countKey: 'festive' },
      { id: 'scheme_exchange', label: 'In-House Exchange', icon: RotateCcw, countKey: 'exchange' },
      { id: 'scheme_insurance', label: 'In-House Insurance', icon: ShieldCheck, countKey: 'insurance' },
      { id: 'scheme_finance', label: 'In-House Finance', icon: Coins, countKey: 'finance' },
      { id: 'scheme_google', label: 'Google 5★ Reviews', icon: Star, countKey: 'google' },
      { id: 'scheme_gift_cards', label: 'Gift Card Rewards', icon: Gift, countKey: 'gift_cards' },
      { id: 'scheme_xyz', label: 'Director Dynamic (xyz)', icon: Star, badge: 'Custom', countKey: 'xyz' },
    ],
  },
  {
    id: 'spends_group',
    title: 'Spend Categories',
    icon: Wrench,
    items: [
      { id: 'spend_sale', label: 'Vehicle & Equip. Sales (Ex-Showroom)', icon: Car, countKey: 'sale' },
      { id: 'spend_service', label: 'Workshop Routine Service', icon: Wrench, countKey: 'service' },
      { id: 'spend_bodyshop', label: 'Bodyshop & Accidental', icon: Layers, countKey: 'bodyshop' },
      { id: 'spend_accessories', label: 'Genuine Accessories', icon: ShoppingBag, countKey: 'accessories' },
      { id: 'spend_spares', label: 'Spare Parts & Consumables', icon: Tag, countKey: 'spares' },
      { id: 'spend_gift_cards', label: 'Gift Cards', icon: Gift, countKey: 'gift_cards' },
    ],
  },
  {
    id: 'vehicles_group',
    title: 'Vehicle & Equipment Types',
    icon: Truck,
    items: [
      { id: 'models_commercial', label: 'Commercial Vehicles (Trucks / Buses)', icon: Truck, badge: 'Commercial', countKey: 'commercial' },
      { id: 'models_agri', label: 'Machinery & Agriculture Equip.', icon: Tractor, badge: 'Agri', countKey: 'agri' },
      { id: 'models_4w', label: '4-Wheeler Passenger (4W)', icon: Car, badge: '4W', countKey: '4w' },
      { id: 'models_2w', label: '2-Wheeler (2W)', icon: Bike, badge: '2W', countKey: '2w' },
      { id: 'models_ev', label: 'Electric Vehicles (EV)', icon: Zap, badge: 'EV', countKey: 'ev' },
      { id: 'models_all', label: 'All Vehicle Models', icon: Layers, countKey: 'all_models' },
    ],
  },
  {
    id: 'priority_group',
    title: 'Customer Priority Slabs',
    icon: Crown,
    items: [
      { id: 'tier_slabs', label: 'Silver / Gold / VIP Slabs', icon: Crown, countKey: 'tiers' },
    ],
  },
  {
    id: 'dealer_group',
    title: 'Dealership & Policy',
    icon: Building2,
    items: [
      { id: 'dealer_overview', label: 'Dealership Dashboard', icon: Building2 },
      { id: 'firms_management', label: 'All Dealership Firms', icon: Store },
    ],
  },
  {
    id: 'formulas_group',
    title: 'Formulas & Governance',
    icon: Calculator,
    items: [
      { id: 'points_formulas', label: 'Points Gain Formula Studio', icon: Calculator },
      { id: 'director_audit', label: 'Approvals & Audit Register', icon: FileText, countKey: 'audit' },
      { id: 'simulator_test', label: 'Live Policy Simulator', icon: Play, isSpecial: true },
      { id: 'user_access_matrix', label: 'Operator Role Control', icon: UserCheck, countKey: 'users' },
    ],
  },
];

/**
 * Spend Range Presets for Quick Selection
 */
const SPEND_RANGE_PRESETS = [
  { label: 'Any Range (₹0 - ∞)', min: 0, max: null },
  { label: 'Under ₹5 Lakhs', min: 0, max: 500000 },
  { label: '₹5L - ₹15 Lakhs', min: 500000, max: 1500000 },
  { label: '₹15L - ₹30 Lakhs', min: 1500000, max: 3000000 },
  { label: '₹30L - ₹50 Lakhs', min: 3000000, max: 5000000 },
  { label: '₹50L+ Commercial / Heavy', min: 5000000, max: null },
];

/**
 * Pre-configured Dummy Customers for Testing Rules Across All Categories
 */
const DUMMY_CUSTOMERS = [
  {
    id: 'cust_1',
    customer_name: 'Rahul Sharma',
    customer_phone: '9888877777',
    priority_tier: 'gold',
    label: 'Rahul Sharma (Gold VIP)',
    sublabel: 'Tata Nexon Creative Plus • Vehicle Purchase',
    vehicle_type: '4W',
    brand_name: 'Tata Motors',
    model_name: 'Nexon',
    variant_name: 'Creative Plus',
    spend_type: 'sale',
    spend_amount: 1450000,
    scheme_type: 'standard',
    branch_name: 'Belagavi',
    tenant_id: 'bellad_and_company',
    tag: 'Gold VIP • 4W Sale',
  },
  {
    id: 'cust_2',
    customer_name: 'Priya Patel',
    customer_phone: '9777766666',
    priority_tier: 'silver',
    label: 'Priya Patel (Silver)',
    sublabel: 'Tata Harrier • Routine Workshop Service',
    vehicle_type: '4W',
    brand_name: 'Tata Motors',
    model_name: 'Harrier',
    variant_name: 'Fearless',
    spend_type: 'service',
    spend_amount: 18500,
    scheme_type: 'standard',
    branch_name: 'Hubballi',
    tenant_id: 'bellad_and_company',
    tag: 'Silver • 4% Service',
  },
  {
    id: 'cust_3',
    customer_name: 'Vikram Singh Fleet Logistics',
    customer_phone: '9900011223',
    priority_tier: 'platinum',
    label: 'Vikram Singh (VIP Commercial)',
    sublabel: 'Tata Prima 5530.S • Commercial Heavy Truck',
    vehicle_type: 'Commercial',
    brand_name: 'Tata Motors Commercial',
    model_name: 'Prima 5530.S',
    variant_name: 'Heavy Haulage',
    spend_type: 'sale',
    spend_amount: 3800000,
    scheme_type: 'standard',
    branch_name: 'Belagavi Central Logistics',
    tenant_id: 'bellad_and_company',
    tag: 'VIP • Commercial Truck',
  },
  {
    id: 'cust_4',
    customer_name: 'Rajesh Kumar',
    customer_phone: '9845012345',
    priority_tier: 'silver',
    label: 'Rajesh Kumar (Trident Customer)',
    sublabel: 'Hyundai Creta • Routine Service (Flat Rate)',
    vehicle_type: '4W',
    brand_name: 'Hyundai',
    model_name: 'Creta',
    variant_name: 'SX(O)',
    spend_type: 'service',
    spend_amount: 8500,
    scheme_type: 'standard',
    branch_name: 'Sankey Road',
    tenant_id: 'trident_automobiles',
    tag: 'Trident • Flat Policy',
  },
  {
    id: 'cust_5',
    customer_name: 'Ananya Rao',
    customer_phone: '9880022334',
    priority_tier: 'gold',
    label: 'Ananya Rao (Bodyshop Claim)',
    sublabel: 'Accidental Bodyshop Repair & Painting',
    vehicle_type: '4W',
    brand_name: 'Tata Motors',
    model_name: 'Safari',
    variant_name: 'Accomplished',
    spend_type: 'bodyshop',
    spend_amount: 65000,
    scheme_type: 'standard',
    branch_name: 'Hubballi',
    tenant_id: 'bellad_and_company',
    tag: 'Bodyshop • 25% Off + 3%',
  },
  {
    id: 'cust_6',
    customer_name: 'Suresh Patil Farmers Trust',
    customer_phone: '9480011222',
    priority_tier: 'gold',
    label: 'Suresh Patil (Agri Equipment)',
    sublabel: 'Machinery & Agriculture • Harvester Slabs',
    vehicle_type: 'Machinery & Agriculture',
    brand_name: 'Tata Motors & Agri Tech',
    model_name: 'Agri Hauler 400',
    variant_name: 'Standard',
    spend_type: 'sale',
    spend_amount: 1850000,
    scheme_type: 'standard',
    branch_name: 'Hubballi',
    tenant_id: 'bellad_and_company',
    tag: 'Agri Equipment • Ex-Showroom',
  },
];

export default function StandaloneMasterEditorPortal({ onExitToCounterApp, user }) {
  // Dealership / Tenant Context Selector
  const [selectedTenant, setSelectedTenant] = useState('bellad_and_company');
  const [activeCategory, setActiveCategory] = useState('all_schemes');

  // Rules & Dashboard Data
  const [rules, setRules] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Accordion state for Left Sidebar (clean 2-column)
  const [openDropdowns, setOpenDropdowns] = useState({
    schemes_group: true,
    spends_group: false,
    vehicles_group: false,
    priority_group: false,
    dealer_group: false,
    formulas_group: false,
  });

  const toggleDropdown = (groupId) => {
    setOpenDropdowns((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Lookups data (from backend)
  const [lookups, setLookups] = useState({
    scheme_types: [],
    spend_types: [],
    vehicle_types: [],
    priority_tiers: [],
    models: [],
    variants: [],
    branches: [],
    brands: [],
  });

  // Dealership Firms & Specific Policy Settings
  const [firms, setFirms] = useState([]);
  const [currentDealerPolicy, setCurrentDealerPolicy] = useState({
    modules_config: { sales: true, service: true, bodyshop: true, accessories: true, spares: true, gift_cards: true, tier_policy: true },
    point_to_rupee_rate: 0.25,
  });
  const [policySaving, setPolicySaving] = useState(false);

  // Customer Priority Tiers (Silver, Gold, VIP) State (Persistent from DB)
  const [tierSlabs, setTierSlabs] = useState([]);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [tierSaving, setTierSaving] = useState(false);

  // Points Gain Formulas
  const [pointsFormulas, setPointsFormulas] = useState([]);
  const [loadingFormulas, setLoadingFormulas] = useState(false);
  const [calcInput, setCalcInput] = useState({ category: 'sale', amount: 850000 });

  // Users List for Role Control
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    password: 'Staff@123',
    role: 'cashier',
    branch_id: 1,
  });

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [spendCategoryFilter, setSpendCategoryFilter] = useState('ALL');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('ALL');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState('ALL');

  // Rule Editor Modal
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formSaving, setFormSaving] = useState(false);

  // Default Form Data: SPEND RANGE replaces bonus amount, Ex-Showroom pricing emphasized
  const defaultFormData = {
    rule_code: '',
    rule_name: '',
    description: '',
    scheme_type: 'standard',
    spend_type: 'sale',
    vehicle_type: '4W',
    brand_name: 'ALL',
    models: ['ALL'],
    variants: ['ALL'],
    branches: ['ALL'],
    priority_tier: 'ALL',
    priority_weight: 100,
    min_spend_rs: 0,
    max_spend_rs: '',
    discount_type: 'percentage',
    discount_value: 0,
    max_discount_rs: '',
    points_multiplier_numerator: 1,
    points_multiplier_denominator: 100,
    applicable_from: new Date().toISOString().slice(0, 10),
    applicable_upto: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    approval_status: 'approved',
    rule_set_type: 'common',
  };

  const [formData, setFormData] = useState(defaultFormData);

  // Custom Scheme Modal
  const [customSchemeModalOpen, setCustomSchemeModalOpen] = useState(false);
  const [newSchemeData, setNewSchemeData] = useState({ scheme_code: '', scheme_name: '', description: '' });

  // Simulator State
  const [simForm, setSimForm] = useState({
    customer_name: 'Rahul Sharma',
    customer_phone: '9888877777',
    scheme_type: 'standard',
    spend_type: 'sale',
    vehicle_type: '4W',
    brand_name: 'Tata Motors',
    model_name: 'Nexon',
    variant_name: 'Creative Plus',
    branch_name: 'Belagavi',
    priority_tier: 'ALL',
    spend_amount: 1250000,
  });
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Logged-in user context
  const loggedInUser = user || ApiService.getUser();
  const currentUsername = (loggedInUser?.username || '').toLowerCase();
  const isDirectorUser = currentUsername === 'agstya' || currentUsername === 'agastya' || loggedInUser?.role === 'director' || loggedInUser?.role === 'admin';

  // Helper toast notification
  const showToast = (msg, isErr = false) => {
    if (isErr) {
      setError(msg);
      setTimeout(() => setError(null), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // ─── Data Loaders ──────────────────────────────────────────────────────────

  const loadRules = useCallback(async (tenantId = selectedTenant) => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiService.request(`/master-rules?tenant_id=${encodeURIComponent(tenantId)}`);
      if (res && res.data) {
        setRules(res.data);
        setStats(res.stats || {});
      } else {
        setRules([]);
      }
    } catch (err) {
      console.error('Error loading rules:', err);
      showToast(err.message || 'Failed to load master rules', true);
    } finally {
      setLoading(false);
    }
  }, [selectedTenant]);

  const loadLookups = useCallback(async (tenantId = selectedTenant) => {
    try {
      const res = await ApiService.request(`/master-rules/lookups?tenant_id=${encodeURIComponent(tenantId)}`);
      if (res && res.data) {
        setLookups(res.data);
      }
    } catch (err) {
      console.warn('Error loading lookups:', err);
    }
  }, [selectedTenant]);

  const loadDealershipsAndPolicy = useCallback(async (tenantId = selectedTenant) => {
    try {
      // 1. Load firms list
      const firmsRes = await ApiService.getFirms().catch(() => ({ data: [] }));
      setFirms(firmsRes?.data || DEALERSHIPS);

      // 2. Load dealer policy
      const policyRes = await ApiService.getDealershipPolicy(tenantId).catch(() => null);
      if (policyRes && policyRes.data) {
        setCurrentDealerPolicy(policyRes.data);
      } else {
        const fallback = DEALERSHIPS.find((d) => d.id === tenantId);
        setCurrentDealerPolicy({
          modules_config: fallback?.defaultModules || { sales: true, service: true, bodyshop: true, accessories: true, spares: true, gift_cards: true, tier_policy: true },
          point_to_rupee_rate: 0.25,
        });
      }
    } catch (err) {
      console.warn('Error loading dealership policy:', err);
    }
  }, [selectedTenant]);

  const loadPriorityTiers = useCallback(async (tenantId = selectedTenant) => {
    try {
      setLoadingTiers(true);
      const res = await ApiService.getMasterPriorityTiers(tenantId);
      if (res && res.data) {
        setTierSlabs(res.data);
      }
    } catch (err) {
      console.warn('Error loading priority tiers:', err);
    } finally {
      setLoadingTiers(false);
    }
  }, [selectedTenant]);

  const loadPointsFormulas = useCallback(async (tenantId = selectedTenant) => {
    try {
      setLoadingFormulas(true);
      const res = await ApiService.getPointsFormulas(tenantId);
      if (res && res.data) {
        setPointsFormulas(res.data);
      }
    } catch (err) {
      console.warn('Error loading points formulas:', err);
    } finally {
      setLoadingFormulas(false);
    }
  }, [selectedTenant]);

  const loadUsers = useCallback(async (tenantId = selectedTenant) => {
    try {
      setLoadingUsers(true);
      const res = await ApiService.getMasterUsers(tenantId);
      if (res && res.data) {
        setUsersList(res.data);
      }
    } catch (err) {
      console.warn('Error loading users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [selectedTenant]);

  // Initial and Dealership Switch Trigger
  useEffect(() => {
    loadRules(selectedTenant);
    loadLookups(selectedTenant);
    loadDealershipsAndPolicy(selectedTenant);
    loadPriorityTiers(selectedTenant);
    loadPointsFormulas(selectedTenant);
    if (activeCategory === 'user_access_matrix') {
      loadUsers(selectedTenant);
    }
  }, [selectedTenant, loadRules, loadLookups, loadDealershipsAndPolicy, loadPriorityTiers, loadPointsFormulas, loadUsers, activeCategory]);

  // ─── Actions & Handlers ───────────────────────────────────────────────────

  // Switch Active Dealership (Instantly changes entire dashboard context!)
  const handleSelectDealership = (dealerId) => {
    setSelectedTenant(dealerId);
    showToast(`Switched active portal to ${DEALERSHIPS.find((d) => d.id === dealerId)?.name || dealerId}`);
  };

  // Toggle Module for Current Dealership (e.g. disable tier policy or bodyshop)
  const handleToggleModule = async (moduleKey) => {
    const newConfig = {
      ...currentDealerPolicy.modules_config,
      [moduleKey]: !currentDealerPolicy.modules_config[moduleKey],
    };
    try {
      setPolicySaving(true);
      await ApiService.saveDealershipPolicy({
        tenant_id: selectedTenant,
        modules_config: newConfig,
      });
      setCurrentDealerPolicy((prev) => ({ ...prev, modules_config: newConfig }));
      showToast(`Updated ${moduleKey.replace('_', ' ')} policy for this dealership.`);
    } catch (err) {
      showToast(err.message || 'Failed to update dealership policy', true);
    } finally {
      setPolicySaving(false);
    }
  };

  // Clean Approval & Rejection Handlers (No sycophantic words, normal Approve / Reject)
  const handleApprove = async (ruleId) => {
    try {
      setLoading(true);
      await ApiService.approveMasterRule(ruleId, 'Approved by Director');
      showToast('Rule approved successfully.');
      await loadRules();
    } catch (err) {
      showToast(err.message || 'Failed to approve rule', true);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (ruleId) => {
    const reason = window.prompt('Enter reason for rejection:', 'Needs revision on pricing/discount');
    if (!reason) return;
    try {
      setLoading(true);
      await ApiService.rejectMasterRule(ruleId, reason);
      showToast('Rule rejected.', true);
      await loadRules();
    } catch (err) {
      showToast(err.message || 'Failed to reject rule', true);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    try {
      setLoading(true);
      await ApiService.deleteMasterRule(ruleId);
      showToast('Rule deleted.');
      await loadRules();
    } catch (err) {
      showToast(err.message || 'Failed to delete rule', true);
    } finally {
      setLoading(false);
    }
  };

  // Live Simulator Handler: tests dummy customer transaction against all active master rules
  const handleRunSimulation = async (customParams = null) => {
    try {
      setSimLoading(true);
      const params = customParams || simForm;
      const payload = {
        tenant_id: selectedTenant,
        scheme_type: params.scheme_type,
        spend_type: params.spend_type,
        vehicle_type: params.vehicle_type,
        brand_name: params.brand_name || 'Tata Motors',
        model_name: params.model_name || 'ALL',
        variant_name: params.variant_name || 'ALL',
        branch_name: params.branch_name || 'Belagavi',
        priority_tier: params.priority_tier || 'ALL',
        spend_amount: Number(params.spend_amount || 0),
        transaction_date: new Date().toISOString(),
      };

      const res = await ApiService.simulateMasterRule(payload);
      if (res && res.data) {
        setSimResult(res.data);
        showToast('Live policy simulation executed successfully.');
      }
    } catch (err) {
      showToast(err.message || 'Simulation failed', true);
    } finally {
      setSimLoading(false);
    }
  };

  // Open Create Modal with Preset Context
  const openCreateModal = (categoryHint = null) => {
    setEditingRule(null);
    let initial = { ...defaultFormData, rule_code: `RULE-${Date.now().toString().slice(-5)}` };

    if (categoryHint === 'spend_sale') {
      initial.spend_type = 'sale';
      initial.rule_name = 'Ex-Showroom Vehicle Sales Policy';
      initial.vehicle_type = '4W';
    } else if (categoryHint === 'spend_service') {
      initial.spend_type = 'service';
      initial.rule_name = 'Workshop Routine Service Policy';
      initial.points_multiplier_numerator = 4;
    } else if (categoryHint === 'spend_bodyshop') {
      initial.spend_type = 'bodyshop';
      initial.rule_name = 'Bodyshop Accidental Repair Policy';
      initial.discount_value = 25;
    } else if (categoryHint === 'spend_spares') {
      initial.spend_type = 'spares';
      initial.rule_name = 'Genuine Spare Parts Policy';
      initial.points_multiplier_numerator = 2;
    } else if (categoryHint === 'spend_accessories') {
      initial.spend_type = 'accessories';
      initial.rule_name = 'Genuine Accessories Policy';
      initial.points_multiplier_numerator = 2;
    } else if (categoryHint === 'spend_gift_cards') {
      initial.spend_type = 'gift_cards';
      initial.scheme_type = 'gift_cards';
      initial.rule_name = 'Showroom Gift Cards & Referral Rewards';
    } else if (categoryHint === 'models_commercial') {
      initial.vehicle_type = 'Commercial';
      initial.spend_type = 'sale';
      initial.rule_name = 'Commercial Heavy & Light Vehicles Policy';
      initial.min_spend_rs = 1000000;
    } else if (categoryHint === 'models_agri') {
      initial.vehicle_type = 'Machinery & Agriculture';
      initial.spend_type = 'sale';
      initial.rule_name = 'Machinery & Agriculture Equipment Policy';
      initial.min_spend_rs = 500000;
    } else if (categoryHint === 'models_ev') {
      initial.vehicle_type = 'EV';
      initial.rule_name = 'Electric Vehicle (EV) Special Campaign';
    } else if (categoryHint === 'scheme_standard') {
      initial.scheme_type = 'standard';
      initial.rule_name = 'Standard Customer Loyalty Policy';
    } else if (categoryHint === 'scheme_festive') {
      initial.scheme_type = 'festive';
      initial.rule_name = 'Festive Celebration Discount & Multiplier Campaign';
      initial.discount_value = 5;
    } else if (categoryHint === 'scheme_exchange') {
      initial.scheme_type = 'exchange';
      initial.rule_name = 'In-House Vehicle Exchange Bonus';
      initial.discount_value = 10000;
      initial.discount_type = 'flat_amount';
    } else if (categoryHint === 'scheme_insurance') {
      initial.scheme_type = 'insurance';
      initial.rule_name = 'In-House Motor Insurance Reward';
      initial.points_multiplier_numerator = 2;
    } else if (categoryHint === 'scheme_finance') {
      initial.scheme_type = 'finance';
      initial.rule_name = 'In-House Auto Finance Campaign';
      initial.points_multiplier_numerator = 2;
    } else if (categoryHint === 'scheme_google') {
      initial.scheme_type = 'google';
      initial.rule_name = 'Google 5-Star Review Feedback Reward';
      initial.points_multiplier_numerator = 5;
    } else if (categoryHint === 'scheme_xyz') {
      initial.scheme_type = 'custom_xyz';
      initial.rule_name = 'Director Dynamic Campaign (xyz)';
    }

    setFormData(initial);
    setEditorModalOpen(true);
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    setFormData({
      rule_code: rule.rule_code,
      rule_name: rule.rule_name,
      description: rule.description || '',
      scheme_type: rule.scheme_type,
      spend_type: rule.spend_type,
      vehicle_type: rule.vehicle_type || 'ALL',
      brand_name: rule.brand_name || 'ALL',
      models: Array.isArray(rule.models) ? rule.models : ['ALL'],
      variants: Array.isArray(rule.variants) ? rule.variants : ['ALL'],
      branches: Array.isArray(rule.branches) ? rule.branches : ['ALL'],
      priority_tier: rule.priority_tier || 'ALL',
      priority_weight: rule.priority_weight || 100,
      min_spend_rs: rule.min_spend_paise != null ? Math.round(Number(rule.min_spend_paise) / 100) : 0,
      max_spend_rs: rule.max_spend_paise != null ? Math.round(Number(rule.max_spend_paise) / 100) : '',
      discount_type: rule.discount_type || 'percentage',
      discount_value: Number(rule.discount_value || 0),
      max_discount_rs: rule.max_discount_paise != null ? Math.round(Number(rule.max_discount_paise) / 100) : '',
      points_multiplier_numerator: rule.points_multiplier_numerator || 1,
      points_multiplier_denominator: rule.points_multiplier_denominator || 100,
      applicable_from: (rule.applicable_from || '').slice(0, 10),
      applicable_upto: (rule.applicable_upto || '').slice(0, 10),
      approval_status: rule.approval_status || 'approved',
    });
    setEditorModalOpen(true);
  };

  // Save Rule Handler (Converts Spend Range to paise, enforces Ex-Showroom pricing for sales)
  const handleSaveRule = async (e) => {
    e.preventDefault();
    try {
      setFormSaving(true);
      const payload = {
        tenant_id: selectedTenant,
        rule_code: formData.rule_code.trim().toUpperCase(),
        rule_name: formData.rule_name.trim(),
        description: formData.description || '',
        scheme_type: formData.scheme_type,
        spend_type: formData.spend_type,
        vehicle_type: formData.vehicle_type,
        brand_name: formData.brand_name,
        models: formData.models,
        variants: formData.variants,
        branches: formData.branches,
        priority_tier: formData.priority_tier,
        priority_weight: Number(formData.priority_weight || 100),
        min_spend_paise: Math.round(Number(formData.min_spend_rs || 0) * 100),
        max_spend_paise: formData.max_spend_rs ? Math.round(Number(formData.max_spend_rs) * 100) : null,
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value || 0),
        max_discount_paise: formData.max_discount_rs ? Math.round(Number(formData.max_discount_rs) * 100) : null,
        points_multiplier_numerator: Number(formData.points_multiplier_numerator || 1),
        points_multiplier_denominator: Number(formData.points_multiplier_denominator || 100),
        applicable_from: formData.applicable_from,
        applicable_upto: formData.applicable_upto,
        approval_status: formData.approval_status,
      };

      if (editingRule) {
        await ApiService.updateMasterRule(editingRule.rule_id || editingRule.id, payload);
        showToast(`Rule '${formData.rule_name}' updated.`);
      } else {
        await ApiService.createMasterRule(payload);
        showToast(`Rule '${formData.rule_name}' created.`);
      }

      setEditorModalOpen(false);
      await loadRules();
    } catch (err) {
      showToast(err.message || 'Failed to save rule', true);
    } finally {
      setFormSaving(false);
    }
  };

  // Save Customer Priority Slab to Database (Persists directly to PostgreSQL!)
  const handleSaveTierSlab = async (e) => {
    e.preventDefault();
    if (!editingTier) return;
    try {
      setTierSaving(true);
      await ApiService.saveMasterPriorityTier({
        tenant_id: selectedTenant,
        tier_name: editingTier.tier_name,
        eval_basis: editingTier.eval_basis,
        min_expense_amount: Number(editingTier.min_expense_amount || 0),
        max_expense_amount: editingTier.max_expense_amount ? Number(editingTier.max_expense_amount) : null,
        min_lifetime_points: Number(editingTier.min_lifetime_points || 0),
        multiplier: Number(editingTier.multiplier || 100),
        discounts_json: editingTier.discounts_json || {},
        applicable_from: editingTier.applicable_from || new Date(),
        applicable_upto: editingTier.applicable_upto || new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000),
      });

      showToast(`Priority slab '${editingTier.tier_name}' saved to database.`);
      setTierModalOpen(false);
      await loadPriorityTiers();
    } catch (err) {
      showToast(err.message || 'Failed to save tier slab', true);
    } finally {
      setTierSaving(false);
    }
  };

  // 1-Click Role Switch for Users
  const handleRoleSwitch = async (userId, newRole) => {
    try {
      await ApiService.updateMasterUserRole(userId, newRole);
      showToast(`User role updated to ${newRole.toUpperCase()}.`);
      await loadUsers();
    } catch (err) {
      showToast(err.message || 'Failed to update user role', true);
    }
  };

  // ─── Filtered Rules Computation ───────────────────────────────────────────

  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (rule.rule_name || '').toLowerCase().includes(q);
        const matchesCode = (rule.rule_code || '').toLowerCase().includes(q);
        const matchesBrand = (rule.brand_name || '').toLowerCase().includes(q);
        const matchesModels = Array.isArray(rule.models) && rule.models.some((m) => String(m).toLowerCase().includes(q));
        if (!matchesName && !matchesCode && !matchesBrand && !matchesModels) return false;
      }

      // 2. Spend Category Filter
      if (spendCategoryFilter !== 'ALL' && rule.spend_type !== spendCategoryFilter) {
        return false;
      }

      // 3. Vehicle Type Filter
      if (vehicleTypeFilter !== 'ALL' && rule.vehicle_type !== 'ALL' && rule.vehicle_type !== vehicleTypeFilter) {
        return false;
      }

      // 4. Approval Status Filter
      if (approvalStatusFilter !== 'ALL' && rule.approval_status !== approvalStatusFilter) {
        return false;
      }

      // 5. Active Sidebar Section Scoping
      if (activeCategory === 'spend_sale' && rule.spend_type !== 'sale') return false;
      if (activeCategory === 'spend_service' && rule.spend_type !== 'service') return false;
      if (activeCategory === 'spend_bodyshop' && rule.spend_type !== 'bodyshop') return false;
      if (activeCategory === 'spend_accessories' && rule.spend_type !== 'accessories') return false;
      if (activeCategory === 'spend_spares' && rule.spend_type !== 'spares') return false;
      if (activeCategory === 'spend_gift_cards' && rule.spend_type !== 'gift_cards') return false;

      if (activeCategory === 'models_commercial' && rule.vehicle_type !== 'Commercial') return false;
      if (activeCategory === 'models_agri' && rule.vehicle_type !== 'Machinery & Agriculture') return false;
      if (activeCategory === 'models_4w' && rule.vehicle_type !== '4W') return false;
      if (activeCategory === 'models_2w' && rule.vehicle_type !== '2W') return false;
      if (activeCategory === 'models_ev' && rule.vehicle_type !== 'EV') return false;

      if (activeCategory === 'scheme_standard' && rule.scheme_type !== 'standard' && rule.scheme_type) return false;
      if (activeCategory === 'scheme_xyz' && rule.scheme_type !== 'xyz' && rule.scheme_type !== 'custom_xyz') return false;
      if (activeCategory === 'scheme_festive' && rule.scheme_type !== 'festive') return false;
      if (activeCategory === 'scheme_exchange' && rule.scheme_type !== 'inhouse_exchange' && rule.scheme_type !== 'exchange') return false;
      if (activeCategory === 'scheme_insurance' && rule.scheme_type !== 'inhouse_insurance' && rule.scheme_type !== 'insurance') return false;
      if (activeCategory === 'scheme_finance' && rule.scheme_type !== 'inhouse_finance' && rule.scheme_type !== 'finance') return false;
      if (activeCategory === 'scheme_google' && rule.scheme_type !== 'google_rating' && rule.scheme_type !== 'google') return false;
      if (activeCategory === 'scheme_gift_cards' && rule.scheme_type !== 'gift_cards' && rule.spend_type !== 'gift_cards') return false;

      return true;
    });
  }, [rules, searchQuery, spendCategoryFilter, vehicleTypeFilter, approvalStatusFilter, activeCategory]);

  // Counts for category badges
  const getCategoryCount = (key) => {
    switch (key) {
      case 'all_schemes':
        return rules.length;
      case 'standard':
        return rules.filter((r) => r.scheme_type === 'standard' || !r.scheme_type).length;
      case 'festive':
        return rules.filter((r) => r.scheme_type === 'festive').length;
      case 'exchange':
        return rules.filter((r) => r.scheme_type === 'exchange' || r.scheme_type === 'inhouse_exchange').length;
      case 'insurance':
        return rules.filter((r) => r.scheme_type === 'insurance' || r.scheme_type === 'inhouse_insurance').length;
      case 'finance':
        return rules.filter((r) => r.scheme_type === 'finance' || r.scheme_type === 'inhouse_finance').length;
      case 'google':
        return rules.filter((r) => r.scheme_type === 'google' || r.scheme_type === 'google_rating').length;
      case 'gift_cards':
        return rules.filter((r) => r.scheme_type === 'gift_cards' || r.spend_type === 'gift_cards').length;
      case 'xyz':
        return rules.filter((r) => r.scheme_type === 'xyz' || r.scheme_type === 'custom_xyz').length;
      case 'sale':
        return rules.filter((r) => r.spend_type === 'sale').length;
      case 'service':
        return rules.filter((r) => r.spend_type === 'service').length;
      case 'bodyshop':
        return rules.filter((r) => r.spend_type === 'bodyshop').length;
      case 'accessories':
        return rules.filter((r) => r.spend_type === 'accessories').length;
      case 'spares':
        return rules.filter((r) => r.spend_type === 'spares').length;
      case 'commercial':
        return rules.filter((r) => r.vehicle_type === 'Commercial').length;
      case 'agri':
        return rules.filter((r) => r.vehicle_type === 'Machinery & Agriculture').length;
      case '4w':
        return rules.filter((r) => r.vehicle_type === '4W').length;
      case '2w':
        return rules.filter((r) => r.vehicle_type === '2W').length;
      case 'ev':
        return rules.filter((r) => r.vehicle_type === 'EV').length;
      case 'audit':
        return rules.filter((r) => r.approval_status === 'pending_approval' || r.approval_status === 'pending').length;
      default:
        return null;
    }
  };

  const activeDealer = DEALERSHIPS.find((d) => d.id === selectedTenant) || DEALERSHIPS[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none antialiased">
      {/* ── TOP NAV BAR ── */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-lg tracking-tight">Master Policy Editor</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-black border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Dealership Loyalty Rules, Earning Formulas &amp; Discount Studio</p>
          </div>
        </div>

        {/* Top Actions: Dealership Switcher & POS Link */}
        <div className="flex items-center gap-3">
          {/* Prominent Dealership Selector */}
          <div className="flex items-center gap-2 bg-slate-100/80 hover:bg-slate-100 p-1.5 rounded-2xl border border-slate-200 transition">
            <Store className="w-4 h-4 text-indigo-600 ml-1.5" />
            <select
              value={selectedTenant}
              onChange={(e) => handleSelectDealership(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer pr-2"
            >
              {DEALERSHIPS.map((dealer) => (
                <option key={dealer.id} value={dealer.id}>
                  {dealer.name} ({dealer.city.split('(')[0].trim()})
                </option>
              ))}
            </select>
          </div>

          {/* Create Rule Set Button */}
          <button
            type="button"
            onClick={() => openCreateModal(activeCategory)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-xs transition active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>+ Create Policy Rule</span>
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* Exit to POS Counter */}
          <button
            type="button"
            onClick={() => {
              if (onExitToCounterApp) onExitToCounterApp();
              else window.location.href = '/';
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            <Home className="w-3.5 h-3.5 text-indigo-600" />
            <span>Counter POS</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </header>

      {/* ── PROMINENT DEALERSHIP SLABS / TABS BAR (Switching Changes Context Across Dashboard) ── */}
      <div className="bg-slate-100/90 border-b border-slate-200/90 px-6 py-2.5 flex items-center justify-between gap-4 overflow-x-auto shadow-2xs z-30">
        <div className="flex items-center gap-2.5 overflow-x-auto py-0.5">
          <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 flex-shrink-0 mr-1">
            <Store className="w-4 h-4 text-indigo-600" />
            Dealership Slabs:
          </span>
          {DEALERSHIPS.map((dealer) => {
            const isSelected = selectedTenant === dealer.id;
            return (
              <button
                key={dealer.id}
                type="button"
                onClick={() => handleSelectDealership(dealer.id)}
                className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl border text-xs font-bold transition flex-shrink-0 text-left cursor-pointer ${
                  isSelected
                    ? 'bg-white text-indigo-950 border-indigo-500 shadow-xs ring-2 ring-indigo-500/20'
                    : 'bg-white/70 hover:bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isSelected ? 'bg-indigo-600 ring-2 ring-indigo-200 animate-pulse' : 'bg-slate-300'}`} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-slate-900 leading-tight">{dealer.name}</span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  <span className="block text-[10px] text-slate-500 font-medium">{dealer.brand}</span>
                </div>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {dealer.id === 'trident_automobiles' ? 'Sales & Service Only' : dealer.tag}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Context Indicator on Far Right */}
        <div className="hidden lg:flex items-center gap-2 flex-shrink-0 text-xs text-slate-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Active Context: <strong className="text-slate-900 font-black">{activeDealer.name}</strong></span>
          <span className="text-[10px] text-indigo-700 bg-indigo-50 font-bold px-2 py-0.5 rounded border border-indigo-200">
            {selectedTenant === 'trident_automobiles' ? 'Sales & Service (No Tiers)' : 'Multi-Category + Tiers Active'}
          </span>
        </div>
      </div>

      {/* ── SANE 2-COLUMN LAYOUT: (Col 1: Sidebar | Col 2: Studio Workspace) ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── COL 1: LEFT NAVIGATION & DEALER CONTEXT (Fixed 280px) ── */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col justify-between flex-shrink-0 overflow-y-auto p-4 space-y-4">
          <div className="space-y-3">
            {/* Active Dealer Badge */}
            <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
              <div className="truncate">
                <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider block">Selected Dealer</span>
                <span className="text-xs font-black text-slate-900 truncate block">{activeDealer.name}</span>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-200/60 text-indigo-900">
                {activeDealer.tag}
              </span>
            </div>

            {/* Navigation Groups */}
            {NAV_GROUPS.map((group) => {
              const GroupIcon = group.icon;
              const isOpen = !!openDropdowns[group.id];
              const hasActiveChild = group.items.some((item) => item.id === activeCategory);

              return (
                <div key={group.id} className="rounded-2xl border border-slate-200/80 overflow-hidden bg-slate-50/40">
                  {/* Group Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleDropdown(group.id)}
                    className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left transition ${
                      hasActiveChild ? 'bg-indigo-50/90 text-indigo-950 font-black' : 'bg-white hover:bg-slate-50 text-slate-800 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        hasActiveChild ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <GroupIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] uppercase tracking-wide truncate">{group.title}</span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                  </button>

                  {/* Group Items */}
                  {isOpen && (
                    <div className="p-1.5 space-y-0.5 bg-white border-t border-slate-100">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isActive = activeCategory === item.id;
                        const count = item.countKey ? getCategoryCount(item.countKey) : null;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setActiveCategory(item.id);
                              if (item.id === 'simulator_test') handleRunSimulation();
                            }}
                            className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs font-bold transition text-left ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <ItemIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                              <span className="truncate">{item.label}</span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {item.badge && (
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                  isActive ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                              {count !== null && (
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {count}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Engine Status */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center justify-between font-bold text-slate-700">
              <span>Engine Status</span>
              <span className="text-emerald-700 font-black flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
              </span>
            </div>
            <p className="leading-snug">Rules apply dynamically on POS billing &amp; customer portal.</p>
          </div>
        </aside>

        {/* ── COL 2: MAIN WORKSPACE (Clean, Sane 2-Column Responsive Canvas) ── */}
        <main className="flex-1 p-6 space-y-5 overflow-y-auto">
          {/* Notifications */}
          {successMsg && (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold shadow-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold shadow-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Contextual Dealership Notice for Trident Automobiles */}
          {selectedTenant === 'trident_automobiles' && (
            <div className="p-4 rounded-3xl bg-indigo-50/90 border border-indigo-200/90 text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-indigo-950">Trident Automobiles Policy Workspace</span>
                    <span className="text-[10px] font-black uppercase bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-full">
                      Custom Rules
                    </span>
                  </div>
                  <p className="text-xs text-indigo-800 font-medium mt-0.5">
                    Operating on <strong>Sales &amp; Service Only</strong>. Bodyshop, Accessories, Spares, and Customer Tier Policy are disabled.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-white text-indigo-900 border border-indigo-200">
                  Flat Discount Mode
                </span>
                <button
                  type="button"
                  onClick={() => setActiveCategory('dealer_overview')}
                  className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline"
                >
                  Configure Matrix
                </button>
              </div>
            </div>
          )}

          {/* Module Inactive Warning if current category is disabled for active dealer */}
          {((activeCategory === 'spend_bodyshop' && currentDealerPolicy.modules_config?.bodyshop === false) ||
            (activeCategory === 'spend_accessories' && currentDealerPolicy.modules_config?.accessories === false) ||
            (activeCategory === 'spend_spares' && currentDealerPolicy.modules_config?.spares === false) ||
            (activeCategory === 'spend_gift_cards' && currentDealerPolicy.modules_config?.gift_cards === false)) && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Notice:</strong> This spend category is currently <strong>disabled</strong> in <strong>{activeDealer.name}</strong> policy settings. Rules configured here will be inactive for this dealership until enabled.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveCategory('dealer_overview')}
                className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-amber-700 text-white"
              >
                Enable in Policy Matrix
              </button>
            </div>
          )}

          {/* ── VIEW 1: DEALERSHIP OVERVIEW & ACTIVE MODULES ── */}
          {activeCategory === 'dealer_overview' && (
            <div className="space-y-5">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Active Dealership Group
                    </span>
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 mt-1">{activeDealer.name}</h1>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Configure active categories, spend ranges and policy modules tailored to this dealer group.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openCreateModal()}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-xs transition"
                  >
                    + Add Dealer Rule
                  </button>
                </div>
              </div>

              {/* Dealership Module Config Matrix (Toggles which categories apply to Trident vs Bellad) */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-900">Dealer Policy Matrix &amp; Category Rules</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Each dealer group operates distinct rules. For instance, Trident may offer discounts solely on Sales &amp; Service without customer tiers.
                    </p>
                  </div>
                  {policySaving && <span className="text-xs text-indigo-600 font-bold animate-pulse">Saving policy...</span>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
                  {[
                    { key: 'sales', label: 'Vehicle & Equipment Sales', desc: 'Net Ex-Showroom based points', icon: Car },
                    { key: 'service', label: 'Routine Service & Workshop', desc: '4% Points on labour & service', icon: Wrench },
                    { key: 'bodyshop', label: 'Bodyshop & Accidental', desc: 'Accidental repair claims', icon: Layers },
                    { key: 'accessories', label: 'Genuine Accessories', desc: 'Accessories purchases', icon: ShoppingBag },
                    { key: 'spares', label: 'Spare Parts & Consumables', desc: 'Over-the-counter spare parts', icon: Tag },
                    { key: 'gift_cards', label: 'Gift Cards', desc: 'Showroom delivery gift cards', icon: Gift },
                    { key: 'tier_policy', label: 'Customer Priority Tier Policy', desc: 'Silver, Gold & VIP multiplier slabs', icon: Crown, isSpecial: true },
                  ].map((mod) => {
                    const isEnabled = !!currentDealerPolicy.modules_config?.[mod.key];
                    const ModIcon = mod.icon;

                    return (
                      <div
                        key={mod.key}
                        onClick={() => handleToggleModule(mod.key)}
                        className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                          isEnabled
                            ? 'bg-indigo-50/50 border-indigo-200 shadow-2xs hover:bg-indigo-50'
                            : 'bg-slate-50/60 border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            isEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                          }`}>
                            <ModIcon className="w-4 h-4" />
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {isEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="mt-3">
                          <span className="text-xs font-black text-slate-900 block">{mod.label}</span>
                          <span className="text-[11px] text-slate-500 font-medium block mt-0.5">{mod.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── VIEW 2: CUSTOMER PRIORITY TIER SLABS (Dynamic Evaluation by Expense, Points, or Range) ── */}
          {activeCategory === 'tier_slabs' && (
            <div className="space-y-5">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Dynamic Priority Engine
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">Persisted in PostgreSQL</span>
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 mt-1">Silver / Gold / VIP Priority Slabs</h1>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Configure customer tiers evaluated by total customer spending (Ex-Showroom + Service in ₹), highest points earned, or spend amount range.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTier({
                        tier_name: 'VIP Executive',
                        eval_basis: 'expenses_based',
                        min_expense_amount: 300000,
                        max_expense_amount: null,
                        min_lifetime_points: 10000,
                        multiplier: 150,
                        discounts_json: { sales: 2, service: 10, bodyshop: 30, accessories: 15, spares: 10 },
                      });
                      setTierModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-xs transition"
                  >
                    + Add New Priority Tier
                  </button>
                </div>
              </div>

              {/* If Trident or current dealer has tiers disabled, show notice */}
              {currentDealerPolicy.modules_config?.tier_policy === false && (
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>
                      <strong>Notice:</strong> Customer Priority Tier Policy is disabled for <strong>{activeDealer.name}</strong>. All customers receive standard dealership rules without tier differentiation.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleModule('tier_policy')}
                    className="px-3 py-1 rounded-lg bg-amber-700 text-white font-bold text-xs"
                  >
                    Enable Tier Policy for {activeDealer.name}
                  </button>
                </div>
              )}

              {/* Tier Slabs Cards (Silver, Gold, VIP) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {tierSlabs.map((slab) => {
                  const isGold = slab.tier_name.toLowerCase().includes('gold');
                  const isVip = slab.tier_name.toLowerCase().includes('vip') || slab.tier_name.toLowerCase().includes('platinum');

                  return (
                    <div
                      key={slab.id || slab.tier_name}
                      className={`rounded-3xl p-6 border transition flex flex-col justify-between ${
                        isVip
                          ? 'bg-gradient-to-b from-purple-50/50 to-white border-purple-200 shadow-xs'
                          : isGold
                          ? 'bg-gradient-to-b from-amber-50/50 to-white border-amber-200 shadow-xs'
                          : 'bg-white border-slate-200 shadow-xs'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md ${
                            isVip ? 'bg-purple-100 text-purple-900' : isGold ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {slab.tier_name}
                          </span>
                          <span className="text-xs font-mono font-extrabold text-indigo-700">
                            {(Number(slab.multiplier || 100) / 100).toFixed(2)}× Points
                          </span>
                        </div>

                        <div>
                          <div className="text-lg font-black text-slate-900">
                            {slab.eval_basis === 'points_based'
                              ? `${Number(slab.min_lifetime_points || 0).toLocaleString()} PTS`
                              : `₹${Number(slab.min_expense_amount || 0).toLocaleString()}`}
                          </div>
                          <span className="text-[11px] text-slate-500 font-semibold block capitalize">
                            Basis: {slab.eval_basis ? slab.eval_basis.replace('_', ' ') : 'Total Customer Spending'}
                          </span>
                        </div>

                        {/* Category Discounts Breakdown */}
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                          <span className="text-[10px] font-black uppercase text-slate-500 block">Category Benefits</span>
                          <div className="flex items-center justify-between font-bold text-slate-700">
                            <span>Bodyshop Discount:</span>
                            <span className="text-indigo-700">{slab.discounts_json?.bodyshop || slab.bodyshop_discount_pct || 10}%</span>
                          </div>
                          <div className="flex items-center justify-between font-bold text-slate-700">
                            <span>Routine Service:</span>
                            <span className="text-indigo-700">{slab.discounts_json?.service || 5}%</span>
                          </div>
                          <div className="flex items-center justify-between font-bold text-slate-700">
                            <span>Genuine Accessories:</span>
                            <span className="text-indigo-700">{slab.discounts_json?.accessories || 5}%</span>
                          </div>
                          <div className="flex items-center justify-between font-bold text-slate-700">
                            <span>Spare Parts:</span>
                            <span className="text-indigo-700">{slab.discounts_json?.spares || 0}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
                        <span className="text-[11px] text-emerald-700 font-extrabold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active in Engine
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTier(slab);
                            setTierModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black transition"
                        >
                          Configure Slab
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── VIEW 3: POINTS GAIN FORMULA STUDIO (All 6 Core Channels) ── */}
          {activeCategory === 'points_formulas' && (
            <div className="space-y-5">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Points Architecture
                    </span>
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 mt-1">Points Gain Formula Studio</h1>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Customers earn loyalty points across 6 core channels: Vehicle &amp; Equipment Sales (Ex-Showroom price base), Service, Spares, Accessories, Bodyshop, and Gift Cards.
                  </p>
                </div>
              </div>

              {/* Interactive Earning Simulator Card */}
              <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-indigo-300" />
                    <h3 className="text-base font-black">Live Formula Calculator</h3>
                  </div>
                  <span className="text-xs text-indigo-200 font-medium">Pricing Base: Ex-Showroom for Sales / Invoice for Service</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-indigo-200 uppercase block mb-1">Earning Channel</label>
                    <select
                      value={calcInput.category}
                      onChange={(e) => setCalcInput({ ...calcInput, category: e.target.value })}
                      className="w-full h-11 px-3 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold focus:outline-none"
                    >
                      <option value="sale" className="text-slate-900">Vehicle &amp; Equipment Sales (Ex-Showroom)</option>
                      <option value="service" className="text-slate-900">Workshop Routine Service (4%)</option>
                      <option value="spares" className="text-slate-900">Spare Parts &amp; Consumables (2%)</option>
                      <option value="accessories" className="text-slate-900">Genuine Accessories (2%)</option>
                      <option value="bodyshop" className="text-slate-900">Bodyshop &amp; Accidental (3%)</option>
                      <option value="gift_cards" className="text-slate-900">Gift Card Delivery</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-indigo-200 uppercase block mb-1">
                      {calcInput.category === 'sale' ? 'Net Ex-Showroom Price (₹)' : 'Invoice Amount (₹)'}
                    </label>
                    <input
                      type="number"
                      value={calcInput.amount}
                      onChange={(e) => setCalcInput({ ...calcInput, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full h-11 px-3.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-black focus:outline-none"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-white/10 border border-white/15 flex flex-col justify-center">
                    <span className="text-[10px] text-indigo-200 font-bold uppercase">Estimated Points Credited</span>
                    <span className="text-2xl font-black text-amber-300">
                      {calcInput.category === 'gift_cards'
                        ? '2,500 PTS'
                        : `${Math.floor((calcInput.amount * (calcInput.category === 'service' ? 0.04 : calcInput.category === 'bodyshop' ? 0.03 : calcInput.category === 'sale' ? 0.01 : 0.02))).toLocaleString()} PTS`}
                    </span>
                    <span className="text-[10px] text-indigo-200">
                      Redeemable at ₹0.25 = ₹{calcInput.category === 'gift_cards' ? '625.00' : ((Math.floor(calcInput.amount * (calcInput.category === 'service' ? 0.04 : calcInput.category === 'bodyshop' ? 0.03 : calcInput.category === 'sale' ? 0.01 : 0.02))) * 0.25).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* All 6 Channels Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pointsFormulas.map((form) => (
                  <div key={form.category} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200">
                        {form.title}
                      </span>
                      <span className="text-xs font-black text-emerald-700">{form.earning_ratio}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Pricing / Calculation Base</span>
                      <span className="text-xs font-black text-slate-900 block">{form.price_base}</span>
                    </div>

                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      {form.description}
                    </p>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">{form.spend_range}</span>
                      <span className="text-indigo-600 font-black">Active in Engine</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── VIEW 4: APPROVALS & AUDIT REGISTER (Clean, Normal Approve / Reject) ── */}
          {activeCategory === 'director_audit' && (
            <div className="space-y-5">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Governance Register
                    </span>
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 mt-1">Approvals &amp; Audit Trail</h1>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Scheme rules and discount policies require Director authorization.
                  </p>
                </div>
              </div>

              {/* Approvals Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px]">
                      <tr>
                        <th className="px-6 py-4">Rule Code &amp; Title</th>
                        <th className="px-6 py-4">Category &amp; Vehicle</th>
                        <th className="px-6 py-4">Spend Range (Ex-Showroom)</th>
                        <th className="px-6 py-4">Discount &amp; Multiplier</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {rules.map((r) => {
                        const isApproved = r.approval_status === 'approved';
                        const isPending = r.approval_status === 'pending_approval' || r.approval_status === 'pending';
                        const minRs = r.min_spend_paise ? Math.round(Number(r.min_spend_paise) / 100) : 0;
                        const maxRs = r.max_spend_paise ? Math.round(Number(r.max_spend_paise) / 100) : null;

                        return (
                          <tr key={r.rule_id || r.id} className="hover:bg-slate-50/80 transition">
                            <td className="px-6 py-4">
                              <span className="font-mono text-xs font-black text-indigo-700 block">{r.rule_code}</span>
                              <span className="font-bold text-slate-900 block text-xs mt-0.5">{r.rule_name}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                                {r.spend_type}
                              </span>
                              <span className="text-[11px] text-slate-500 block capitalize mt-0.5 font-semibold">
                                {r.vehicle_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-slate-800">
                              {minRs === 0 && !maxRs
                                ? 'Any Amount'
                                : maxRs
                                ? `₹${minRs.toLocaleString()} - ₹${maxRs.toLocaleString()}`
                                : `₹${minRs.toLocaleString()}+`}
                            </td>
                            <td className="px-6 py-4 font-bold">
                              {r.discount_value > 0 ? (
                                <span className="text-indigo-700">
                                  {r.discount_type === 'percentage' ? `${r.discount_value}% Off` : `₹${r.discount_value} Flat`}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                              <span className="text-emerald-700 text-[11px] block mt-0.5">
                                {r.points_multiplier_numerator || 1}× Points
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {isApproved ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-[11px]">
                                  <Check className="w-3 h-3 text-emerald-600" /> Approved
                                </span>
                              ) : isPending ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-black text-[11px]">
                                  <Clock className="w-3 h-3 text-amber-600" /> Pending Approval
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-black text-[11px]">
                                  <X className="w-3 h-3 text-rose-600" /> Rejected
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {!isApproved && (
                                  <button
                                    type="button"
                                    onClick={() => handleApprove(r.rule_id || r.id)}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs inline-flex items-center gap-1 transition"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Approve
                                  </button>
                                )}
                                {isPending && (
                                  <button
                                    type="button"
                                    onClick={() => handleReject(r.rule_id || r.id)}
                                    className="px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-black text-xs inline-flex items-center gap-1 transition"
                                  >
                                    <X className="w-3.5 h-3.5" /> Reject
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── VIEW 5: USER ROLE CONTROL ── */}
          {activeCategory === 'user_access_matrix' && (
            <div className="space-y-5">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Staff Access Management
                    </span>
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 mt-1">Operator Role Control</h1>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    1-Click role assignment for counter cashiers, branch supervisors and group administrators.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px]">
                    <tr>
                      <th className="px-6 py-4">Username</th>
                      <th className="px-6 py-4">Current Role</th>
                      <th className="px-6 py-4">Quick Switch Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-4 font-bold text-slate-900">{u.username}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-800">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {['cashier', 'branch_manager', 'admin'].map((roleOpt) => (
                              <button
                                key={roleOpt}
                                type="button"
                                onClick={() => handleRoleSwitch(u.id, roleOpt)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-black transition ${
                                  u.role === roleOpt
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                {roleOpt.replace('_', ' ').toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── VIEW 5b: LIVE POLICY SIMULATOR & DUMMY CUSTOMER TESTING CANVAS ── */}
          {activeCategory === 'simulator_test' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Header Title Banner */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
                      <Play className="w-3 h-3 fill-indigo-600 text-indigo-600" />
                      Live Loyalty Engine Trace
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Direct POS Implementation
                    </span>
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 mt-1">Live Policy Simulator &amp; Rule Verification</h1>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 max-w-2xl">
                    Test dummy customer transactions across all active master loyalty rules, spend ranges, and discount formulas.
                    Verifies how rules are directly evaluated in <strong>points.service.js</strong> during real counter POS billing.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRunSimulation()}
                    disabled={simLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs transition active:scale-98 disabled:opacity-50"
                  >
                    <Play className={`w-3.5 h-3.5 fill-white ${simLoading ? 'animate-spin' : ''}`} />
                    <span>{simLoading ? 'Calculating Trace...' : 'Run Simulation'}</span>
                  </button>
                </div>
              </div>

              {/* ── DUMMY CUSTOMER PRESETS QUICK-SELECT ── */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    Quick-Load Test Customers with Pre-Configured Slabs:
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Click any profile to run instant simulation</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {DUMMY_CUSTOMERS.map((cust) => {
                    const isSelected = simForm.customer_name === cust.customer_name && simForm.spend_type === cust.spend_type;
                    return (
                      <div
                        key={cust.id}
                        onClick={() => {
                          setSimForm({
                            customer_name: cust.customer_name,
                            customer_phone: cust.customer_phone,
                            scheme_type: cust.scheme_type,
                            spend_type: cust.spend_type,
                            vehicle_type: cust.vehicle_type,
                            brand_name: cust.brand_name,
                            model_name: cust.model_name,
                            variant_name: cust.variant_name,
                            branch_name: cust.branch_name,
                            priority_tier: cust.priority_tier,
                            spend_amount: cust.spend_amount,
                          });
                          setSelectedTenant(cust.tenant_id);
                          handleRunSimulation(cust);
                        }}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition text-left space-y-2 ${
                          isSelected
                            ? 'bg-indigo-50/80 border-indigo-500 shadow-xs ring-2 ring-indigo-500/20'
                            : 'bg-slate-50/70 hover:bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs text-slate-900">{cust.label}</span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            cust.priority_tier === 'platinum'
                              ? 'bg-purple-100 text-purple-900'
                              : cust.priority_tier === 'gold'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {cust.priority_tier.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium leading-tight">{cust.sublabel}</p>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
                          <span className="font-mono font-bold text-slate-500">Spend: ₹{cust.spend_amount.toLocaleString('en-IN')}</span>
                          <span className="font-black text-indigo-700">{cust.tag}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── 2-COLUMN SIMULATOR WORKBENCH (Left: Inputs | Right: Engine Trace) ── */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* ── COL 1: TEST TRANSACTION INPUTS (5 Cols) ── */}
                <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                      1. Transaction Parameters
                    </h3>
                    <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {activeDealer.name}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-black text-slate-600 mb-1">Customer Name</label>
                        <input
                          type="text"
                          value={simForm.customer_name}
                          onChange={(e) => setSimForm({ ...simForm, customer_name: e.target.value })}
                          className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-600 mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={simForm.customer_phone}
                          onChange={(e) => setSimForm({ ...simForm, customer_phone: e.target.value })}
                          className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-black text-slate-600 mb-1">Customer Priority Tier</label>
                        <select
                          value={simForm.priority_tier}
                          onChange={(e) => setSimForm({ ...simForm, priority_tier: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
                        >
                          <option value="ALL">All Customers (Standard)</option>
                          <option value="silver">Silver Tier</option>
                          <option value="gold">Gold VIP</option>
                          <option value="platinum">Platinum / VIP</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-600 mb-1">Scheme Campaign</label>
                        <select
                          value={simForm.scheme_type}
                          onChange={(e) => setSimForm({ ...simForm, scheme_type: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
                        >
                          <option value="standard">Standard Loyalty Policy</option>
                          <option value="custom_xyz">Director Dynamic (xyz)</option>
                          <option value="festive">Festive Celebration</option>
                          <option value="exchange">In-House Exchange</option>
                          <option value="insurance">In-House Insurance</option>
                          <option value="finance">In-House Finance</option>
                          <option value="google">Google 5★ Review</option>
                          <option value="gift_cards">Gift Card Rewards</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-black text-slate-600 mb-1">Spend Category *</label>
                        <select
                          value={simForm.spend_type}
                          onChange={(e) => setSimForm({ ...simForm, spend_type: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
                        >
                          <option value="sale">Vehicle &amp; Equip. Sales</option>
                          <option value="service">Workshop Routine Service</option>
                          <option value="bodyshop">Bodyshop &amp; Accidental</option>
                          <option value="accessories">Genuine Accessories</option>
                          <option value="spares">Spare Parts &amp; Consumables</option>
                          <option value="gift_cards">Gift Cards</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-600 mb-1">Vehicle Type *</label>
                        <select
                          value={simForm.vehicle_type}
                          onChange={(e) => setSimForm({ ...simForm, vehicle_type: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
                        >
                          <option value="Commercial">Commercial (Trucks/Buses)</option>
                          <option value="Machinery & Agriculture">Machinery &amp; Agri</option>
                          <option value="4W">Four-Wheeler (4W)</option>
                          <option value="2W">Two-Wheeler (2W)</option>
                          <option value="EV">Electric Vehicle (EV)</option>
                          <option value="ALL">All Vehicle Types</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-black text-slate-600 mb-1">Vehicle Model</label>
                        <input
                          type="text"
                          value={simForm.model_name}
                          onChange={(e) => setSimForm({ ...simForm, model_name: e.target.value })}
                          className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-600 mb-1">Branch</label>
                        <input
                          type="text"
                          value={simForm.branch_name}
                          onChange={(e) => setSimForm({ ...simForm, branch_name: e.target.value })}
                          className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Spend Amount with Steppers */}
                    <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black text-slate-800 uppercase block">
                          Transaction Amount (₹)
                        </label>
                        <span className="text-[10px] font-bold text-indigo-700">
                          {simForm.spend_type === 'sale' ? 'Net Ex-Showroom Base' : 'Gross Invoice Base'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={simForm.spend_amount}
                          onChange={(e) => setSimForm({ ...simForm, spend_amount: parseFloat(e.target.value) || 0 })}
                          className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white font-mono font-black text-sm text-indigo-950 text-center"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[10000, 50000, 500000, 1500000, 3500000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setSimForm({ ...simForm, spend_amount: amt })}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white hover:bg-indigo-100 text-slate-700 border border-slate-200"
                          >
                            ₹{(amt / 100000).toFixed(amt >= 100000 ? 1 : 2)}L
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRunSimulation()}
                    disabled={simLoading}
                    className="w-full h-11 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-xs flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50"
                  >
                    <Play className={`w-4 h-4 fill-white ${simLoading ? 'animate-spin' : ''}`} />
                    <span>{simLoading ? 'Evaluating Rules in Engine...' : 'Run Simulation on Loyalty Engine'}</span>
                  </button>
                </div>

                {/* ── COL 2: LIVE ENGINE EXECUTION TRACE & VERIFICATION (7 Cols) ── */}
                <div className="lg:col-span-7 space-y-4">
                  {!simResult ? (
                    <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-xs text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                        <Calculator className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-black text-slate-900">Awaiting Simulation Execution</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                        Click <strong>"Run Simulation"</strong> or pick one of the dummy customer presets above to trace how the engine computes discount and points.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-fadeIn">
                      {/* Matched Rule Banner */}
                      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Rule Matched in Engine
                          </span>
                          <span className="font-mono text-xs font-black text-indigo-900">
                            {simResult.calculation?.rule_code}
                          </span>
                        </div>

                        <div>
                          <h2 className="text-xl font-black text-slate-900">
                            {simResult.calculation?.rule_name}
                          </h2>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                            <span className="capitalize font-bold text-slate-700">{simResult.calculation?.spend_type}</span>
                            <span>•</span>
                            <span className="font-bold text-slate-700">{simResult.calculation?.vehicle_type}</span>
                            <span>•</span>
                            <span>Priority Weight: {simResult.matched_rule?.priority_weight || 100}</span>
                          </div>
                        </div>

                        {/* Direct POS Implementation Proof Badge */}
                        <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-black text-emerald-900">
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span>Directly Implemented in Core Loyalty Engine</span>
                          </div>
                          <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
                            When a cashier creates an invoice or delivery for this customer, <strong>points.service.js</strong> directly executes <strong>MasterRuleEngineService.resolveRule(...)</strong>. Because this rule is active, approved, and satisfies the spend threshold, the customer automatically receives these points into PostgreSQL <strong>points_ledger</strong>.
                          </p>
                        </div>
                      </div>

                      {/* 4 Key Output Metric Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                          <span className="text-[10px] font-black uppercase text-slate-400 block">Gross Spend</span>
                          <span className="text-base font-black text-slate-900 font-mono block">
                            ₹{Number(simResult.calculation?.gross_invoice_amount || 0).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium block">Invoice Amount</span>
                        </div>

                        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                          <span className="text-[10px] font-black uppercase text-slate-400 block">Discount</span>
                          <span className="text-base font-black text-indigo-700 font-mono block">
                            ₹{Number(simResult.calculation?.discount_amount || 0).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-indigo-600 font-bold block">
                            {simResult.calculation?.discount_percentage}% applied
                          </span>
                        </div>

                        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                          <span className="text-[10px] font-black uppercase text-slate-400 block">Net Points Base</span>
                          <span className="text-base font-black text-slate-900 font-mono block">
                            ₹{Number(simResult.calculation?.net_points_base || 0).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium block">After Discount</span>
                        </div>

                        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-xs space-y-1">
                          <span className="text-[10px] font-black uppercase text-indigo-200 block">Total Points</span>
                          <span className="text-xl font-black text-amber-300 font-mono block">
                            {Number(simResult.calculation?.total_points || 0).toLocaleString('en-IN')} PTS
                          </span>
                          <span className="text-[10px] text-indigo-200 font-bold block">
                            = ₹{Number(simResult.calculation?.redemption_value_rupees || 0).toFixed(2)} Value
                          </span>
                        </div>
                      </div>

                      {/* Step-by-Step Resolution Trace Breakdown */}
                      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
                        <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                          Step-by-Step Engine Evaluation Trace
                        </h4>

                        <div className="space-y-2 text-xs font-medium text-slate-700">
                          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50">
                            <span className="w-5 h-5 rounded-full bg-slate-200 font-mono font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                              1
                            </span>
                            <div>
                              <strong className="text-slate-900 block font-bold">Scope &amp; Dealership Matching:</strong>
                              <span>
                                Target tenant <strong>{simResult.simulation_inputs?.tenant_id}</strong> matched category <strong>{simResult.simulation_inputs?.spend_type}</strong> and vehicle type <strong>{simResult.simulation_inputs?.vehicle_type}</strong>.
                              </span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50">
                            <span className="w-5 h-5 rounded-full bg-slate-200 font-mono font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                              2
                            </span>
                            <div>
                              <strong className="text-slate-900 block font-bold">Spend Range Evaluation:</strong>
                              <span>
                                Amount <strong>₹{Number(simResult.simulation_inputs?.spend_amount || 0).toLocaleString('en-IN')}</strong> verified within active spend window (Min: ₹{simResult.matched_rule?.min_spend_paise ? (simResult.matched_rule.min_spend_paise / 100).toLocaleString('en-IN') : 0} to Max: {simResult.matched_rule?.max_spend_paise ? '₹' + (simResult.matched_rule.max_spend_paise / 100).toLocaleString('en-IN') : 'Unlimited'}).
                              </span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50">
                            <span className="w-5 h-5 rounded-full bg-slate-200 font-mono font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                              3
                            </span>
                            <div>
                              <strong className="text-slate-900 block font-bold">Discount &amp; Multiplier Computation:</strong>
                              <span>
                                Multiplier ratio <strong>{simResult.calculation?.points_multiplier}</strong> yielded <strong>{simResult.calculation?.earned_points}</strong> base points + <strong>{simResult.calculation?.bonus_points}</strong> bonus points.
                              </span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50">
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                              4
                            </span>
                            <div>
                              <strong className="text-emerald-950 block font-bold">Credit Execution to Dummy Customer:</strong>
                              <span>
                                Customer <strong>{simResult.simulation_inputs?.customer_name}</strong> ({simResult.simulation_inputs?.customer_phone}) credited with <strong>{simResult.calculation?.total_points} PTS</strong> worth ₹{simResult.calculation?.redemption_value_rupees}.
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── VIEW 6: RULES LIST & TABLE (Standard Filterable Work Canvas) ── */}
          {activeCategory !== 'dealer_overview' &&
           activeCategory !== 'tier_slabs' &&
           activeCategory !== 'points_formulas' &&
           activeCategory !== 'director_audit' &&
           activeCategory !== 'user_access_matrix' &&
           activeCategory !== 'simulator_test' && (
            <div className="space-y-4">
              {/* Header Title & Sane Filter Bar */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900">
                      {NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === activeCategory)?.label || 'Policy Rules'}
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Showing active loyalty policies for <strong>{activeDealer.name}</strong>.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openCreateModal(activeCategory)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-xs transition"
                    >
                      + Create Rule in this Category
                    </button>
                  </div>
                </div>

                {/* Sane Filter Row */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      placeholder="Search rules, codes, models..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <select
                      value={spendCategoryFilter}
                      onChange={(e) => setSpendCategoryFilter(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700"
                    >
                      <option value="ALL">All Spend Categories</option>
                      <option value="sale">Vehicle Sales (Ex-Showroom)</option>
                      <option value="service">Routine Service</option>
                      <option value="bodyshop">Bodyshop</option>
                      <option value="accessories">Accessories</option>
                      <option value="spares">Spare Parts</option>
                      <option value="gift_cards">Gift Cards</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={vehicleTypeFilter}
                      onChange={(e) => setVehicleTypeFilter(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700"
                    >
                      <option value="ALL">All Vehicle Types</option>
                      <option value="Commercial">Commercial Vehicles</option>
                      <option value="Machinery & Agriculture">Machinery &amp; Agriculture</option>
                      <option value="4W">4-Wheeler (4W)</option>
                      <option value="2W">2-Wheeler (2W)</option>
                      <option value="EV">Electric (EV)</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={approvalStatusFilter}
                      onChange={(e) => setApprovalStatusFilter(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="approved">Approved &amp; Live</option>
                      <option value="pending_approval">Pending Approval</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Rules Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px]">
                      <tr>
                        <th className="px-6 py-4">Policy Code &amp; Name</th>
                        <th className="px-6 py-4">Category &amp; Vehicle Type</th>
                        <th className="px-6 py-4">Spend Range (Ex-Showroom)</th>
                        <th className="px-6 py-4">Discount &amp; Multiplier</th>
                        <th className="px-6 py-4">Engine State</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredRules.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-bold">
                            No rules found matching this filter. Click "+ Create Policy Rule" to add one.
                          </td>
                        </tr>
                      ) : (
                        filteredRules.map((r) => {
                          const isApproved = r.approval_status === 'approved';
                          const minRs = r.min_spend_paise ? Math.round(Number(r.min_spend_paise) / 100) : 0;
                          const maxRs = r.max_spend_paise ? Math.round(Number(r.max_spend_paise) / 100) : null;

                          return (
                            <tr key={r.rule_id || r.id} className="hover:bg-slate-50/80 transition">
                              <td className="px-6 py-4">
                                <span className="font-mono text-xs font-black text-indigo-700 block">{r.rule_code}</span>
                                <span className="font-bold text-slate-900 block text-xs mt-0.5">{r.rule_name}</span>
                                <span className="text-[11px] text-slate-400 font-medium block truncate max-w-xs">{r.description}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                                  {r.spend_type}
                                </span>
                                <span className="text-[11px] text-slate-500 block capitalize mt-0.5 font-semibold">
                                  {r.vehicle_type}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono font-bold text-slate-800">
                                {minRs === 0 && !maxRs
                                  ? 'Any Amount'
                                  : maxRs
                                  ? `₹${minRs.toLocaleString()} - ₹${maxRs.toLocaleString()}`
                                  : `₹${minRs.toLocaleString()}+`}
                                <span className="text-[10px] text-slate-400 block font-sans font-medium">
                                  {r.spend_type === 'sale' ? 'Ex-Showroom base' : 'Invoice base'}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-bold">
                                {r.discount_value > 0 ? (
                                  <span className="text-indigo-700 text-xs">
                                    {r.discount_type === 'percentage' ? `${r.discount_value}% Off` : `₹${r.discount_value} Flat`}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">—</span>
                                )}
                                <span className="text-emerald-700 text-[11px] block mt-0.5 font-extrabold">
                                  {r.points_multiplier_numerator || 1}× Multiplier
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {isApproved ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-[11px]">
                                    <Check className="w-3 h-3 text-emerald-600" /> Live
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-black text-[11px]">
                                    <Clock className="w-3 h-3 text-amber-600" /> Pending
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(r)}
                                    className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition"
                                    title="Edit Policy"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(r.rule_id || r.id)}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition"
                                    title="Delete Policy"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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
          )}
        </main>
      </div>

      {/* ── MODAL: CLEAN, MODERN 2-COLUMN POLICY EDITOR (SCHEME TYPE AT TOP & RANGE BAR KIND) ── */}
      {editorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-4xl bg-white border border-slate-200/90 rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    {editingRule ? 'Edit Loyalty Policy' : 'Create New Loyalty Policy'}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 font-medium">Configuring policy for:</span>
                    <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      {activeDealer.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">• {activeDealer.tag}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditorModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="p-7 space-y-6">
              {/* Sane Clean 2-Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                {/* ── COL 1: TARGET SCOPE & ELIGIBILITY ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center">
                      1
                    </span>
                    <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider">
                      Target Scope &amp; Eligibility
                    </h4>
                  </div>

                  {/* Scheme Type * (Positioned at TOP as requested) */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                      Scheme Type *
                    </label>
                    <select
                      value={formData.scheme_type}
                      onChange={(e) => setFormData({ ...formData, scheme_type: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-black text-indigo-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs"
                    >
                      <option value="standard">Standard Loyalty Policy (General)</option>
                      <option value="custom_xyz">Director Dynamic Scheme (xyz)</option>
                      <option value="festive">Festive &amp; Seasonal Campaign</option>
                      <option value="exchange">In-House Vehicle Exchange Bonus</option>
                      <option value="insurance">In-House Motor Insurance Reward</option>
                      <option value="finance">In-House Auto Finance Campaign</option>
                      <option value="google">Google 5-Star Review Feedback Reward</option>
                      <option value="gift_cards">Gift Card Rewards</option>
                    </select>
                    <span className="text-[10px] text-slate-400 font-medium block">
                      Determines campaign tagging, director override rules, and promotional priority.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">Policy Code *</label>
                      <input
                        type="text"
                        required
                        value={formData.rule_code}
                        onChange={(e) => setFormData({ ...formData, rule_code: e.target.value })}
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">Policy Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.rule_name}
                        onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                        placeholder="e.g. Commercial Fleet Earning Policy"
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">Vehicle Type *</label>
                      <select
                        value={formData.vehicle_type}
                        onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition"
                      >
                        <option value="Commercial">Commercial Vehicles</option>
                        <option value="Machinery & Agriculture">Machinery &amp; Agriculture</option>
                        <option value="4W">Four-Wheeler (4W)</option>
                        <option value="2W">Two-Wheeler (2W)</option>
                        <option value="EV">Electric Vehicle (EV)</option>
                        <option value="ALL">All Vehicle Types</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">Spend Category *</label>
                      <select
                        value={formData.spend_type}
                        onChange={(e) => setFormData({ ...formData, spend_type: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition"
                      >
                        <option value="sale">Vehicle &amp; Equipment Sales</option>
                        <option value="service">Workshop Routine Service</option>
                        <option value="bodyshop">Bodyshop &amp; Accidental</option>
                        <option value="accessories">Genuine Accessories</option>
                        <option value="spares">Spare Parts &amp; Consumables</option>
                        <option value="gift_cards">Gift Cards</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">Brand Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.brand_name}
                        onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                        placeholder="Tata, MG, Hyundai, ALL"
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">Customer Priority Tier</label>
                      <select
                        value={formData.priority_tier}
                        onChange={(e) => setFormData({ ...formData, priority_tier: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition"
                      >
                        <option value="ALL">All Customers (Standard)</option>
                        <option value="silver">Silver Tier</option>
                        <option value="gold">Gold VIP</option>
                        <option value="platinum">Platinum / VIP</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Policy Description / Notes</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g. Standard Net Ex-Showroom earning slabs for fleet and retail buyers"
                      className="w-full h-9 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition"
                    />
                  </div>
                </div>

                {/* ── COL 2: SPEND RANGE BAR KIND & FINANCIAL FORMULA ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center">
                      2
                    </span>
                    <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider">
                      Spend Range Bar &amp; Financial Formula
                    </h4>
                  </div>

                  {/* ── INTERACTIVE RANGE BAR CONTROL ── */}
                  <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                        Spend Range Bar (Min — Max) *
                      </label>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                        {formData.spend_type === 'sale' ? 'Net Ex-Showroom Base' : 'Invoice Base'}
                      </span>
                    </div>

                    {/* Formatted Span Display with Visual Progress Bar */}
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Minimum Spend</span>
                          <span className="text-slate-900 font-mono font-black text-sm">
                            ₹ {Number(formData.min_spend_rs || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase">
                          Range Span
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Maximum Spend</span>
                          <span className={`font-mono font-black text-sm ${formData.max_spend_rs ? 'text-slate-900' : 'text-emerald-700'}`}>
                            {formData.max_spend_rs ? `₹ ${Number(formData.max_spend_rs).toLocaleString('en-IN')}` : '∞ Unlimited (No Cap)'}
                          </span>
                        </div>
                      </div>

                      {/* Visual Gradient Progress Bar */}
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 rounded-full transition-all duration-300"
                          style={{
                            marginLeft: `${Math.min(95, ((Number(formData.min_spend_rs) || 0) / 10000000) * 100)}%`,
                            width: `${Math.max(5, (formData.max_spend_rs ? (Number(formData.max_spend_rs) / 10000000) * 100 : 100) - (((Number(formData.min_spend_rs) || 0) / 10000000) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Interactive Range Slider (Drag to Increase or Decrease) */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                        <span>₹0</span>
                        <span>₹25 Lakhs</span>
                        <span>₹50 Lakhs</span>
                        <span>₹1 Crore (∞)</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10000000"
                        step="50000"
                        value={formData.max_spend_rs !== '' ? Number(formData.max_spend_rs) : 10000000}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val >= 10000000) {
                            setFormData({ ...formData, max_spend_rs: '' });
                          } else {
                            setFormData({ ...formData, max_spend_rs: Math.max((formData.min_spend_rs || 0), val) });
                          }
                        }}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    {/* Stepper Buttons to Smoothly Increase / Decrease */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {/* Min Range Stepper */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 block">Min Amount Stepper</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, min_spend_rs: Math.max(0, (formData.min_spend_rs || 0) - 50000) })}
                            className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-black transition active:scale-95"
                            title="Decrease Min by ₹50,000"
                          >
                            -50k
                          </button>
                          <input
                            type="number"
                            value={formData.min_spend_rs}
                            onChange={(e) => setFormData({ ...formData, min_spend_rs: parseFloat(e.target.value) || 0 })}
                            className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-black text-center text-slate-800"
                            placeholder="0"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, min_spend_rs: (formData.min_spend_rs || 0) + 50000 })}
                            className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-black transition active:scale-95"
                            title="Increase Min by ₹50,000"
                          >
                            +50k
                          </button>
                        </div>
                      </div>

                      {/* Max Range Stepper */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 block">Max Amount Stepper</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const cur = Number(formData.max_spend_rs) || 5000000;
                              setFormData({ ...formData, max_spend_rs: Math.max((formData.min_spend_rs || 0), cur - 100000) });
                            }}
                            className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-black transition active:scale-95"
                            title="Decrease Max by ₹1 Lakh"
                          >
                            -1L
                          </button>
                          <input
                            type="number"
                            value={formData.max_spend_rs}
                            onChange={(e) => setFormData({ ...formData, max_spend_rs: e.target.value })}
                            className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-black text-center text-slate-800"
                            placeholder="Unlimited"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const cur = Number(formData.max_spend_rs) || (formData.min_spend_rs || 0);
                              setFormData({ ...formData, max_spend_rs: cur + 100000 });
                            }}
                            className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-black transition active:scale-95"
                            title="Increase Max by ₹1 Lakh"
                          >
                            +1L
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, max_spend_rs: '' })}
                            className={`px-2 py-1 rounded-lg border text-[11px] font-black transition active:scale-95 ${
                              !formData.max_spend_rs
                                ? 'bg-emerald-600 text-white border-emerald-700'
                                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                            title="Set Unlimited Upper Cap"
                          >
                            ∞
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Range Presets Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {SPEND_RANGE_PRESETS.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setFormData({ ...formData, min_spend_rs: p.min, max_spend_rs: p.max != null ? p.max : '' })}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white hover:bg-indigo-100 text-slate-700 border border-slate-200 hover:border-indigo-300 transition shadow-2xs"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                      * For vehicle &amp; machinery sales, price matching strictly uses the Net Ex-Showroom price.
                    </p>
                  </div>

                  {/* Financial Formula: Discount Value & Points Multiplier */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-black text-slate-700">Discount Value</label>
                        {formData.discount_value > 0 && (
                          <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                            {formData.discount_type === 'percentage' ? `${formData.discount_value}% Off` : `₹${formData.discount_value} Off`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={formData.discount_value}
                          onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                          placeholder="0"
                          className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-black text-indigo-700 focus:ring-2 focus:ring-indigo-500/20 transition"
                        />
                        <select
                          value={formData.discount_type}
                          onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                          className="h-10 px-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
                        >
                          <option value="percentage">%</option>
                          <option value="flat_amount">₹ Flat</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-black text-slate-700">Points Multiplier</label>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                          {((formData.points_multiplier_numerator || 1) / 100 * 100).toFixed(1)}% Earning
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={formData.points_multiplier_numerator}
                          onChange={(e) => setFormData({ ...formData, points_multiplier_numerator: parseInt(e.target.value, 10) || 1 })}
                          className="w-20 h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-black text-emerald-700 focus:ring-2 focus:ring-indigo-500/20 transition"
                        />
                        <span className="text-xs font-bold text-slate-500">/ 100 base</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">Valid From</label>
                      <input
                        type="date"
                        value={formData.applicable_from}
                        onChange={(e) => setFormData({ ...formData, applicable_from: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">Valid Upto</label>
                      <input
                        type="date"
                        value={formData.applicable_upto}
                        onChange={(e) => setFormData({ ...formData, applicable_upto: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditorModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-xs disabled:opacity-50 transition active:scale-98"
                >
                  {formSaving ? 'Saving...' : editingRule ? 'Update Policy Rule' : 'Save & Deploy Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CUSTOMER PRIORITY TIER CONFIGURATION ── */}
      {tierModalOpen && editingTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Configure Priority Slab: {editingTier.tier_name}</h3>
              <button
                type="button"
                onClick={() => setTierModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTierSlab} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1">Evaluation Basis *</label>
                <select
                  value={editingTier.eval_basis || 'expenses_based'}
                  onChange={(e) => setEditingTier({ ...editingTier, eval_basis: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                >
                  <option value="expenses_based">Customer Total Expenses (Net Ex-Showroom + Service in ₹)</option>
                  <option value="points_based">Points Earned Based (Lifetime PTS)</option>
                  <option value="spend_range">Spend / Invoice Amount Range (₹)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1">
                    {editingTier.eval_basis === 'points_based' ? 'Min Points (PTS)' : 'Min Spend (₹)'}
                  </label>
                  <input
                    type="number"
                    value={editingTier.eval_basis === 'points_based' ? editingTier.min_lifetime_points : editingTier.min_expense_amount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (editingTier.eval_basis === 'points_based') {
                        setEditingTier({ ...editingTier, min_lifetime_points: val });
                      } else {
                        setEditingTier({ ...editingTier, min_expense_amount: val });
                      }
                    }}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs font-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1">Points Multiplier</label>
                  <select
                    value={editingTier.multiplier || 100}
                    onChange={(e) => setEditingTier({ ...editingTier, multiplier: parseInt(e.target.value, 10) })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold"
                  >
                    <option value={100}>1.00× (Base Multiplier)</option>
                    <option value={125}>1.25× (+25% Points)</option>
                    <option value={150}>1.50× (+50% Points)</option>
                    <option value={200}>2.00× (2× Double Points)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-500 block">Category Discount Benefits (%)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">Bodyshop %</span>
                    <input
                      type="number"
                      value={editingTier.discounts_json?.bodyshop || 0}
                      onChange={(e) => setEditingTier({
                        ...editingTier,
                        discounts_json: { ...editingTier.discounts_json, bodyshop: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">Service %</span>
                    <input
                      type="number"
                      value={editingTier.discounts_json?.service || 0}
                      onChange={(e) => setEditingTier({
                        ...editingTier,
                        discounts_json: { ...editingTier.discounts_json, service: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">Accessories %</span>
                    <input
                      type="number"
                      value={editingTier.discounts_json?.accessories || 0}
                      onChange={(e) => setEditingTier({
                        ...editingTier,
                        discounts_json: { ...editingTier.discounts_json, accessories: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTierModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tierSaving}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-black shadow-xs disabled:opacity-50"
                >
                  {tierSaving ? 'Saving...' : 'Save to Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
