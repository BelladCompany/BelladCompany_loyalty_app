import React, { useState, useEffect, useCallback } from 'react';
import {
  Sliders,
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
  SlidersHorizontal,
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
} from 'lucide-react';
import ApiService from '../services/api';

/**
 * Dropdown Accordion Groups for the Left Sidebar
 */
const SIDEBAR_DROPDOWN_GROUPS = [
  {
    id: 'schemes_group',
    title: 'Scheme Types & Campaigns',
    icon: Sparkles,
    items: [
      { id: 'all_schemes', label: 'All Active Schemes', icon: Sparkles, countKey: 'all_schemes' },
      { id: 'scheme_xyz', label: 'Director Dynamic Scheme (xyz)', icon: Star, badge: 'Custom', countKey: 'xyz' },
      { id: 'scheme_festive', label: 'Festive Offers', icon: Calendar, countKey: 'festive' },
      { id: 'scheme_exchange', label: 'In-House Exchange', icon: RotateCcw, countKey: 'exchange' },
      { id: 'scheme_insurance', label: 'In-House Insurance', icon: ShieldCheck, countKey: 'insurance' },
      { id: 'scheme_finance', label: 'In-House Finance', icon: Coins, countKey: 'finance' },
      { id: 'scheme_google', label: 'Google 5★ Reviews', icon: Star, badge: '+500 PTS', countKey: 'google' },
      { id: 'scheme_gift_cards', label: 'Gift Card Rewards', icon: Gift, countKey: 'gift_cards' },
    ],
  },
  {
    id: 'models_group',
    title: 'Automobile Models',
    icon: Car,
    items: [
      { id: 'models_2w', label: '2-Wheeler (2W)', icon: Bike, badge: '2W', countKey: '2w' },
      { id: 'models_4w', label: '4-Wheeler (4W)', icon: Car, badge: '4W', countKey: '4w' },
      { id: 'models_ev', label: 'Electric Vehicle (EV)', icon: Zap, badge: 'EV', countKey: 'ev' },
      { id: 'models_all', label: 'All Models', icon: Layers, countKey: 'all_models' },
    ],
  },
  {
    id: 'spends_group',
    title: 'Spend Categories',
    icon: Wrench,
    items: [
      { id: 'spend_bodyshop', label: 'Bodyshop & Accidental', icon: Layers, badge: '40% Off', countKey: 'bodyshop' },
      { id: 'spend_service', label: 'Workshop & Routine Service', icon: Wrench, countKey: 'service' },
      { id: 'spend_sale', label: 'New Vehicle Sales', icon: Car, countKey: 'sale' },
      { id: 'spend_accessories', label: 'Genuine Accessories', icon: ShoppingBag, countKey: 'accessories' },
    ],
  },
  {
    id: 'dealerships_group',
    title: 'Dealerships & Branches',
    icon: Building2,
    items: [
      { id: 'branches_dealerships', label: 'Dealership Branches (Belagavi)', icon: Building2, countKey: 'branches' },
      { id: 'firms_management', label: 'Client Dealership Firms', icon: Store, countKey: 'firms' },
    ],
  },
  {
    id: 'access_group',
    title: 'User Access Control',
    icon: Users,
    items: [
      { id: 'user_access_matrix', label: 'Operator Role Control', icon: UserCheck, badge: '1-Click', countKey: 'users' },
    ],
  },
  {
    id: 'tiers_group',
    title: 'Customer Priority Tier Slabs',
    icon: Crown,
    items: [
      { id: 'tier_slabs', label: 'Silver / Gold / VIP Slabs', icon: Crown, countKey: 'tiers' },
    ],
  },
  {
    id: 'engine_group',
    title: 'Live Engine & Governance',
    icon: Zap,
    items: [
      { id: 'simulator_test', label: '⚡ Live Policy Simulator', icon: Play, isSpecial: true },
      { id: 'director_audit', label: '📋 Approvals & Audit Trail', icon: FileText, countKey: 'audit' },
    ],
  },
];

export default function StandaloneMasterEditorPortal({ onExitToCounterApp, user }) {
  const [activeCategory, setActiveCategory] = useState('all_schemes');
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Accordion state for Left Sidebar Dropdowns (Scheme Types on top and open by default)
  const [openDropdowns, setOpenDropdowns] = useState({
    schemes_group: true,
    models_group: false,
    spends_group: false,
    dealerships_group: false,
    access_group: false,
    tiers_group: false,
    engine_group: false,
  });

  const toggleDropdown = (groupId) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Lookups data
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

  // Dealerships & Branches
  const [firms, setFirms] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [loadingFirms, setLoadingFirms] = useState(false);
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [newFirmData, setNewFirmData] = useState({
    tenant_id: '',
    firm_name: '',
    legal_name: '',
    contact_email: '',
    contact_phone: '',
    default_branch_name: 'Belagavi Central Showroom',
    default_branch_city: 'Belagavi',
    point_to_rupee_rate: 0.25,
  });

  // User Access Control
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    password: 'Staff@123',
    role: 'cashier',
    branch_id: 1,
  });

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Rule Editor Modal
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formSaving, setFormSaving] = useState(false);

  // Register Custom Scheme Modal
  const [customSchemeModalOpen, setCustomSchemeModalOpen] = useState(false);
  const [newSchemeData, setNewSchemeData] = useState({
    scheme_code: '',
    scheme_name: '',
    description: '',
  });

  // Customer Priority Tier Slabs (Silver, Gold, VIP) State
  const [tierSlabs, setTierSlabs] = useState([
    {
      tier_id: 'silver',
      name: 'Silver Tier',
      subtitle: 'Base Customer Entry Slab',
      eval_basis: 'expenses_based', // 'expenses_based' | 'points_based' | 'invoice_based' | 'annual_spend' | 'vehicles_count'
      threshold: 0,
      threshold_unit: '₹',
      multiplier: 1.0,
      bodyshop_discount_pct: 10,
      finance_bonus_pts: 100,
      insurance_bonus_pts: 50,
      exchange_bonus_pts: 200,
      lounge_access: false,
      free_inspection: false,
      theme_color: 'slate',
    },
    {
      tier_id: 'gold',
      name: 'Gold Tier',
      subtitle: 'Accelerated Priority Slab',
      eval_basis: 'expenses_based',
      threshold: 200000,
      threshold_unit: '₹',
      multiplier: 1.25,
      bodyshop_discount_pct: 25,
      finance_bonus_pts: 250,
      insurance_bonus_pts: 100,
      exchange_bonus_pts: 500,
      lounge_access: true,
      free_inspection: true,
      theme_color: 'amber',
    },
    {
      tier_id: 'vip',
      name: 'VIP / Platinum Tier',
      subtitle: 'Executive Leadership Club',
      eval_basis: 'expenses_based',
      threshold: 500000,
      threshold_unit: '₹',
      multiplier: 1.5,
      bodyshop_discount_pct: 40,
      finance_bonus_pts: 500,
      insurance_bonus_pts: 250,
      exchange_bonus_pts: 1000,
      lounge_access: true,
      free_inspection: true,
      theme_color: 'purple',
    },
  ]);
  const [editingTierModalOpen, setEditingTierModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);

  // Current logged in user & Director Authorization Check
  const loggedInUser = user || ApiService.getUser();
  const currentUsername = (loggedInUser?.username || '').toLowerCase();
  const isDirectorUser = currentUsername === 'agstya' || currentUsername === 'agastya' || loggedInUser?.role === 'director';

  // Director Audit Filter State
  const [auditStatusFilter, setAuditStatusFilter] = useState('ALL');

  // Handle Approve Rule as Director Agastya Sir (ONLY Director Agastya Sir can execute)
  const handleApproveAsDirector = async (ruleId, ruleName) => {
    if (!isDirectorUser) {
      showToast("Access Denied: Only Executive Director Agastya Bellad Sir ('agstya') can approve rules into production.", true);
      return;
    }
    try {
      setLoading(true);
      await ApiService.approveMasterRule(ruleId, 'Approved by Executive Director Agastya Bellad Sir');
      showToast(`Rule "${ruleName}" approved by Director Agastya Bellad Sir! Live in engine.`);
      await loadRules();
    } catch (err) {
      showToast(err.message || 'Failed to approve rule', true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Reject Rule as Director
  const handleRejectAsDirector = async (ruleId, ruleName) => {
    if (!isDirectorUser) {
      showToast("Access Denied: Only Executive Director Agastya Bellad Sir can reject rules.", true);
      return;
    }
    const reason = window.prompt(`Enter rejection note for rule "${ruleName}":`, 'Needs revision on discount percentage');
    if (!reason) return;
    try {
      setLoading(true);
      await ApiService.rejectMasterRule(ruleId, reason);
      showToast(`Rule "${ruleName}" marked as rejected with feedback`, true);
      await loadRules();
    } catch (err) {
      showToast(err.message || 'Failed to reject rule', true);
    } finally {
      setLoading(false);
    }
  };

  // Simulator Console State
  const [simForm, setSimForm] = useState({
    customer_name: 'Rahul Sharma',
    customer_phone: '9888877777',
    scheme_type: 'xyz',
    spend_type: 'bodyshop',
    vehicle_type: 'EV',
    brand_name: 'MG Motors',
    model_name: 'MG ZS EV',
    variant_name: 'Exclusive Pro',
    branch_name: 'Belagavi',
    priority_tier: 'ALL',
    spend_amount: 100000,
  });
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Default Form Data - Rules start in PENDING state awaiting Director Agastya Sir approval
  const defaultFormData = {
    rule_code: '',
    rule_name: '',
    description: '',
    spend_type: 'bodyshop',
    scheme_type: 'xyz',
    vehicle_type: 'EV',
    brand_name: 'MG Motors',
    models: ['MG ZS EV'],
    variants: ['ALL'],
    branches: ['Belagavi'],
    priority_tier: 'ALL',
    priority_weight: 150,
    discount_type: 'percentage',
    discount_value: 40,
    min_spend_paise: 0,
    max_spend_paise: null,
    max_discount_paise: 5000000,
    points_multiplier_numerator: 1,
    bonus_points: 500,
    applicable_from: new Date().toISOString().slice(0, 10),
    applicable_upto: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    approval_status: 'pending',
    approved_by: null,
    rule_set_type: 'common',
  };
  const [formData, setFormData] = useState(defaultFormData);

  const showToast = (msg, isErr = false) => {
    if (isErr) {
      setError(msg);
      setTimeout(() => setError(null), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiService.getMasterRules({});
      if (res?.data) {
        setRules(res.data);
      }
    } catch (err) {
      console.error('Failed to load rules:', err);
      showToast(err.message || 'Error loading rules', true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLookups = useCallback(async () => {
    try {
      const res = await ApiService.getMasterRuleLookups();
      if (res?.data) {
        setLookups(res.data);
      }
    } catch (err) {
      console.error('Failed to load lookups:', err);
    }
  }, []);

  const loadFirmsAndBranches = useCallback(async () => {
    setLoadingFirms(true);
    try {
      const [firmsRes, branchRes] = await Promise.all([
        ApiService.getFirms().catch(() => ({ data: [] })),
        ApiService.getBranches().catch(() => ({ data: [] })),
      ]);
      setFirms(firmsRes.data || []);
      setBranchesList(branchRes.data || []);
    } catch (err) {
      console.error('Failed to load dealerships:', err);
    } finally {
      setLoadingFirms(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await ApiService.getMasterUsers();
      setUsersList(res.data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
    loadLookups();
  }, [loadRules, loadLookups]);

  useEffect(() => {
    if (activeCategory === 'branches_dealerships' || activeCategory === 'firms_management') {
      loadFirmsAndBranches();
    } else if (activeCategory === 'user_access_matrix') {
      loadUsers();
    }
  }, [activeCategory, loadFirmsAndBranches, loadUsers]);

  // Determine Rule Set Category Scope
  const getRuleSetScope = (rule) => {
    if (rule.rule_set_type) return rule.rule_set_type;
    if (rule.priority_tier && rule.priority_tier !== 'ALL') return 'tier';
    if (rule.scheme_type && !['standard', 'default'].includes(rule.scheme_type)) return 'scheme';
    if (rule.brand_name && rule.brand_name !== 'ALL') return 'model';
    if (rule.spend_type && !['all', 'general'].includes(rule.spend_type)) return 'spend';
    return 'common';
  };

  const getRuleSetLabel = (scope) => {
    switch (scope) {
      case 'scheme': return '🎯 Scheme Set';
      case 'model': return '🚗 Model Set';
      case 'spend': return '🔧 Spend Set';
      case 'tier': return '👑 Tier Set';
      default: return '⚡ Common Set';
    }
  };

  const getRuleSetBadgeStyle = (scope) => {
    switch (scope) {
      case 'scheme': return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'model': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'spend': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'tier': return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getCategoryRuleBtnLabel = (cat) => {
    if (cat.startsWith('scheme_') || cat === 'all_schemes') return 'Scheme Rule Set';
    if (cat.startsWith('spend_')) return 'Spend Category Rule Set';
    if (cat.startsWith('models_')) return 'Vehicle Model Rule Set';
    if (cat === 'tier_slabs') return 'Priority Tier Rule Set';
    return `Rule Set for ${activeTitle}`;
  };

  // Category item counts calculation
  const getCategoryCount = (key) => {
    switch (key) {
      case 'all_schemes':
        return rules.length;
      case 'xyz':
        return rules.filter((r) => r.scheme_type === 'xyz').length;
      case 'exchange':
        return rules.filter((r) => r.scheme_type === 'inhouse_exchange').length;
      case 'insurance':
        return rules.filter((r) => r.scheme_type === 'inhouse_insurance').length;
      case 'finance':
        return rules.filter((r) => r.scheme_type === 'inhouse_finance').length;
      case 'google':
        return rules.filter((r) => r.scheme_type === 'google_rating').length;
      case 'gift_cards':
        return rules.filter((r) => ['gift_cards', 'referral'].includes(r.scheme_type)).length;
      case 'festive':
        return rules.filter((r) => r.scheme_type === 'festive').length;
      case 'sale':
        return rules.filter((r) => r.spend_type === 'sale').length;
      case 'service':
        return rules.filter((r) => r.spend_type === 'service').length;
      case 'accessories':
        return rules.filter((r) => r.spend_type === 'accessories').length;
      case 'bodyshop':
        return rules.filter((r) => r.spend_type === 'bodyshop').length;
      case '2w':
      case 'hero':
        return rules.filter((r) => r.vehicle_type === '2W').length;
      case '4w':
      case 'tata':
        return rules.filter((r) => r.vehicle_type === '4W').length;
      case 'ev':
      case 'mg':
        return rules.filter((r) => r.vehicle_type === 'EV').length;
      case 'all_models':
        return rules.length;
      case 'tiers':
        return rules.filter((r) => r.priority_tier && r.priority_tier !== 'ALL').length;
      case 'branches':
        return branchesList.length || 3;
      case 'firms':
        return firms.length || 1;
      case 'users':
        return usersList.length || 2;
      case 'audit':
        return rules.filter((r) => r.approval_status === 'approved').length;
      default:
        return null;
    }
  };

  // 1-Click Director Presets Handler
  const handleQuickAddPreset = (presetType) => {
    if (presetType === 'mg_ev_40') {
      setFormData({
        ...defaultFormData,
        rule_code: `MG-EV-BELAGAVI-${Date.now().toString().slice(-4)}`,
        rule_name: 'MG EV Bodyshop 40% Belagavi Campaign',
        description: '40% discount on bodyshop repairs for MG EV at Belagavi branch',
        spend_type: 'bodyshop',
        scheme_type: 'xyz',
        vehicle_type: 'EV',
        brand_name: 'MG Motors',
        models: ['MG ZS EV', 'Comet EV'],
        branches: ['Belagavi'],
        discount_type: 'percentage',
        discount_value: 40,
        bonus_points: 500,
        applicable_from: '2026-01-01',
        applicable_upto: '2027-12-31',
        approval_status: 'pending',
        approved_by: null,
      });
      setEditorModalOpen(true);
    } else if (presetType === 'hero_festive_30') {
      setFormData({
        ...defaultFormData,
        rule_code: `HERO-FESTIVE-${Date.now().toString().slice(-4)}`,
        rule_name: 'Hero 30% Festive Drive',
        description: '30% discount on all Hero Splendor & HF Deluxe models',
        spend_type: 'sale',
        scheme_type: 'festive',
        vehicle_type: '2W',
        brand_name: 'Hero',
        models: ['Splendor', 'HF Deluxe'],
        discount_type: 'percentage',
        discount_value: 30,
        applicable_from: '2026-01-01',
        applicable_upto: '2027-12-31',
        approval_status: 'pending',
        approved_by: null,
      });
      setEditorModalOpen(true);
    } else if (presetType === 'tata_nexon_15') {
      setFormData({
        ...defaultFormData,
        rule_code: `TATA-NEXON-${Date.now().toString().slice(-4)}`,
        rule_name: 'Tata 15% Nexon Drive',
        description: '15% discount on Nexon & Curvv 4-wheelers',
        spend_type: 'sale',
        scheme_type: 'standard',
        vehicle_type: '4W',
        brand_name: 'Tata Motors',
        models: ['Nexon', 'Curvv'],
        discount_type: 'percentage',
        discount_value: 15,
        applicable_from: '2026-01-01',
        applicable_upto: '2027-12-31',
        approval_status: 'pending',
        approved_by: null,
      });
      setEditorModalOpen(true);
    } else if (presetType === 'exchange_5000') {
      setFormData({
        ...defaultFormData,
        rule_code: `EXC-15K-BONUS-${Date.now().toString().slice(-4)}`,
        rule_name: 'In-House Vehicle Exchange Bonus (₹15,000)',
        description: 'Fixed discount bonus on vehicle exchange deals',
        spend_type: 'sale',
        scheme_type: 'inhouse_exchange',
        vehicle_type: 'ALL',
        brand_name: 'ALL',
        models: ['ALL'],
        discount_type: 'flat',
        discount_value: 15000,
        applicable_from: '2026-01-01',
        applicable_upto: '2027-12-31',
        approval_status: 'pending',
        approved_by: null,
      });
      setEditorModalOpen(true);
    } else if (presetType === 'service_2x') {
      setFormData({
        ...defaultFormData,
        rule_code: `SRV-2X-REWARD-${Date.now().toString().slice(-4)}`,
        rule_name: 'Workshop Service 2X Point Multiplier',
        description: 'Double loyalty points on all periodic maintenance and running repair bills',
        spend_type: 'service',
        scheme_type: 'standard',
        vehicle_type: 'ALL',
        brand_name: 'ALL',
        models: ['ALL'],
        discount_type: 'percentage',
        discount_value: 0,
        points_multiplier_numerator: 2,
        applicable_from: '2026-01-01',
        applicable_upto: '2027-12-31',
        approval_status: 'pending',
        approved_by: null,
      });
      setEditorModalOpen(true);
    } else if (presetType === 'google_500') {
      setFormData({
        ...defaultFormData,
        rule_code: `GGL-500-REWARD-${Date.now().toString().slice(-4)}`,
        rule_name: 'Google 5-Star Customer Review Bonus (500 PTS)',
        description: 'Instant 500 points credited when customer leaves a verified 5-star Google review',
        spend_type: 'service',
        scheme_type: 'google_rating',
        vehicle_type: 'ALL',
        brand_name: 'ALL',
        models: ['ALL'],
        discount_type: 'percentage',
        discount_value: 0,
        bonus_points: 500,
        applicable_from: '2026-01-01',
        applicable_upto: '2027-12-31',
        approval_status: 'pending',
        approved_by: null,
      });
      setEditorModalOpen(true);
    }
  };

  // 1-Click Role Switch
  const handleQuickRoleChange = async (userId, targetRole) => {
    try {
      const res = await ApiService.updateMasterUserRole(userId, targetRole);
      showToast(res.message || `Updated role to ${targetRole.toUpperCase()}`);
      loadUsers();
    } catch (err) {
      showToast(err.message || 'Failed to update user role', true);
    }
  };

  // Add Staff User
  const handleAddStaffSubmit = async (e) => {
    e.preventDefault();
    if (!newUserData.username.trim()) {
      showToast('Username required', true);
      return;
    }
    try {
      const res = await ApiService.createMasterUser(newUserData);
      showToast(res.message || 'Staff operator created successfully!');
      setAddUserModalOpen(false);
      setNewUserData({ username: '', password: 'Staff@123', role: 'cashier', branch_id: 1 });
      loadUsers();
    } catch (err) {
      showToast(err.message || 'Failed to create user', true);
    }
  };

  // Onboard Dealership Firm / Branch
  const handleOnboardFirmSubmit = async (e) => {
    e.preventDefault();
    if (!newFirmData.tenant_id.trim() || !newFirmData.firm_name.trim()) {
      showToast('Dealership code and name required', true);
      return;
    }
    try {
      await ApiService.createFirm(newFirmData);
      showToast(`Dealership '${newFirmData.firm_name}' onboarded successfully!`);
      setOnboardModalOpen(false);
      loadFirmsAndBranches();
    } catch (err) {
      showToast(err.message || 'Failed to onboard dealership', true);
    }
  };

  // Register Custom Scheme
  const handleRegisterCustomScheme = async (e) => {
    e.preventDefault();
    if (!newSchemeData.scheme_code.trim() && !newSchemeData.scheme_name.trim()) {
      showToast('Scheme name required', true);
      return;
    }
    try {
      const res = await ApiService.registerCustomScheme(newSchemeData);
      showToast(res.message || 'Custom scheme registered!');
      setCustomSchemeModalOpen(false);
      loadLookups();
      setFormData((prev) => ({
        ...prev,
        scheme_type: res.data?.scheme_code || newSchemeData.scheme_code.toLowerCase().trim(),
      }));
    } catch (err) {
      showToast(err.message || 'Failed to register scheme', true);
    }
  };

  // Run Simulation
  const handleRunSimulation = async (customPayload = null) => {
    setSimLoading(true);
    setSimResult(null);
    try {
      const payload = customPayload || simForm;
      const res = await ApiService.simulateMasterRule(payload);
      if (res?.data) {
        setSimResult(res.data);
      }
    } catch (err) {
      console.error('Simulation failed:', err);
      showToast(err.message || 'Simulation error', true);
    } finally {
      setSimLoading(false);
    }
  };

  // Approve Rule
  const handleApprove = async (ruleId) => {
    try {
      await ApiService.approveMasterRule(ruleId, 'Signed off by Executive Director');
      showToast('Policy rule approved & deployed live!');
      loadRules();
    } catch (err) {
      showToast(err.message || 'Failed to approve rule', true);
    }
  };

  // Delete Rule
  const handleDelete = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    try {
      await ApiService.deleteMasterRule(ruleId);
      showToast('Rule successfully deleted');
      loadRules();
    } catch (err) {
      showToast(err.message || 'Failed to delete rule', true);
    }
  };

  // Open Create Modal with Intelligent Category-Specific Pre-Configuration
  const openCreateModal = (categoryOverride = activeCategory) => {
    setEditingRule(null);
    const cat = categoryOverride || activeCategory;
    let categoryDefaults = {
      ...defaultFormData,
      rule_code: `RULE-${Date.now().toString().slice(-5)}`,
      rule_name: 'New Dealership Policy Rule',
    };

    // Intelligently pre-populate based on category
    if (cat.startsWith('scheme_') || cat === 'all_schemes') {
      const schemeCode = cat.replace('scheme_', '');
      const mappedScheme = schemeCode === 'exchange' ? 'inhouse_exchange'
        : schemeCode === 'insurance' ? 'inhouse_insurance'
        : schemeCode === 'finance' ? 'inhouse_finance'
        : schemeCode === 'google' ? 'google_rating'
        : schemeCode === 'gift_cards' ? 'gift_cards'
        : schemeCode === 'all_schemes' ? 'standard'
        : schemeCode;
      categoryDefaults = {
        ...categoryDefaults,
        rule_code: `SCHM-${mappedScheme.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`,
        rule_name: `${activeTitle} Campaign Policy`,
        scheme_type: mappedScheme,
        description: `Custom policy ruleset configured for ${activeTitle}`,
      };
    } else if (cat.startsWith('spend_')) {
      const spendType = cat.replace('spend_', '');
      categoryDefaults = {
        ...categoryDefaults,
        rule_code: `SPND-${spendType.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`,
        rule_name: `${activeTitle} Spend Policy`,
        spend_type: spendType,
        description: `Discount and loyalty points rule for ${activeTitle}`,
      };
    } else if (cat.startsWith('models_')) {
      if (cat === 'models_2w' || cat === 'models_hero_2w') {
        categoryDefaults = {
          ...categoryDefaults,
          rule_code: `2W-${Date.now().toString().slice(-4)}`,
          rule_name: '2-Wheeler (2W) Policy Rule',
          vehicle_type: '2W',
          brand_name: 'ALL',
          models: ['ALL'],
          description: 'Loyalty discount and points rule for 2-Wheelers',
        };
      } else if (cat === 'models_4w' || cat === 'models_tata_4w') {
        categoryDefaults = {
          ...categoryDefaults,
          rule_code: `4W-${Date.now().toString().slice(-4)}`,
          rule_name: '4-Wheeler (4W) Policy Rule',
          vehicle_type: '4W',
          brand_name: 'ALL',
          models: ['ALL'],
          description: 'Loyalty discount and points rule for 4-Wheelers',
        };
      } else if (cat === 'models_ev' || cat === 'models_mg_ev') {
        categoryDefaults = {
          ...categoryDefaults,
          rule_code: `EV-${Date.now().toString().slice(-4)}`,
          rule_name: 'Electric Vehicle (EV) Policy Rule',
          vehicle_type: 'EV',
          brand_name: 'ALL',
          models: ['ALL'],
          description: 'Loyalty discount and points rule for Electric Vehicles',
        };
      } else {
        categoryDefaults = {
          ...categoryDefaults,
          rule_code: `ALL-MODELS-${Date.now().toString().slice(-4)}`,
          rule_name: 'All Vehicle Models Policy Rule',
          vehicle_type: 'ALL',
        };
      }
    } else if (cat === 'tier_slabs') {
      categoryDefaults = {
        ...categoryDefaults,
        rule_code: `TIER-GOLD-${Date.now().toString().slice(-4)}`,
        rule_name: 'Customer Priority Tier Rule',
        priority_tier: 'Gold',
      };
    }

    setFormData(categoryDefaults);
    setEditorModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (rule) => {
    setEditingRule(rule);
    setFormData({
      rule_code: rule.rule_code,
      rule_name: rule.rule_name,
      description: rule.description || '',
      spend_type: rule.spend_type,
      scheme_type: rule.scheme_type,
      vehicle_type: rule.vehicle_type,
      brand_name: rule.brand_name || 'ALL',
      models: Array.isArray(rule.models) ? rule.models : [rule.models || 'ALL'],
      variants: Array.isArray(rule.variants) ? rule.variants : [rule.variants || 'ALL'],
      branches: Array.isArray(rule.branches) ? rule.branches : [rule.branches || 'ALL'],
      priority_tier: rule.priority_tier || 'ALL',
      priority_weight: rule.priority_weight || 100,
      discount_type: rule.discount_type || 'percentage',
      discount_value: Number(rule.discount_value || 0),
      min_spend_paise: rule.min_spend_paise || 0,
      max_spend_paise: rule.max_spend_paise || null,
      max_discount_paise: rule.max_discount_paise || null,
      points_multiplier_numerator: Number(rule.points_multiplier_numerator || 1),
      bonus_points: Number(rule.bonus_points || 0),
      applicable_from: rule.applicable_from ? rule.applicable_from.slice(0, 10) : '',
      applicable_upto: rule.applicable_upto ? rule.applicable_upto.slice(0, 10) : '',
      approval_status: rule.approval_status || 'approved',
      approved_by: rule.approved_by || 'Director (Executive)',
    });
    setEditorModalOpen(true);
  };

  // Save Rule
  const handleSaveRule = async (e) => {
    e.preventDefault();
    setFormSaving(true);
    try {
      const payload = {
        ...formData,
        approval_status: isDirectorUser && formData.approval_status === 'approved' ? 'approved' : 'pending',
        is_active: isDirectorUser && formData.approval_status === 'approved',
        approved_by: isDirectorUser && formData.approval_status === 'approved' ? 'Director Agastya Bellad' : null,
        created_by: loggedInUser?.username || 'kavya',
        models: Array.isArray(formData.models)
          ? formData.models
          : String(formData.models).split(',').map((s) => s.trim()).filter(Boolean),
        variants: Array.isArray(formData.variants)
          ? formData.variants
          : String(formData.variants).split(',').map((s) => s.trim()).filter(Boolean),
        branches: Array.isArray(formData.branches)
          ? formData.branches
          : String(formData.branches).split(',').map((s) => s.trim()).filter(Boolean),
      };

      if (editingRule) {
        await ApiService.updateMasterRule(editingRule.rule_id || editingRule.id, payload);
        showToast(`Rule '${formData.rule_name}' updated successfully!`);
      } else {
        await ApiService.createMasterRule(payload);
        showToast(
          isDirectorUser && payload.approval_status === 'approved'
            ? `Rule '${formData.rule_name}' created & activated by Director Agastya Sir!`
            : `Rule '${formData.rule_name}' submitted! Line item placed in Pending state awaiting Agastya Sir's sign-off.`
        );
      }
      setEditorModalOpen(false);
      loadRules();
    } catch (err) {
      showToast(err.message || 'Failed to save rule', true);
    } finally {
      setFormSaving(false);
    }
  };

  // Filter Rules based on selected category in sidebar
  const filteredRules = rules.filter((rule) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const codeMatch = rule.rule_code?.toLowerCase().includes(q);
      const nameMatch = rule.rule_name?.toLowerCase().includes(q);
      const brandMatch = rule.brand_name?.toLowerCase().includes(q);
      const modelsMatch = Array.isArray(rule.models) && rule.models.some((m) => String(m).toLowerCase().includes(q));
      if (!codeMatch && !nameMatch && !brandMatch && !modelsMatch) return false;
    }

    if (vehicleFilter !== 'ALL' && rule.vehicle_type !== 'ALL' && rule.vehicle_type !== vehicleFilter) {
      return false;
    }

    if (statusFilter !== 'ALL' && rule.approval_status !== statusFilter) {
      return false;
    }

    // Category mapping (Clean Vehicle Types: 2W, 4W, EV, All)
    if (activeCategory === 'models_2w' || activeCategory === 'models_hero_2w') {
      return rule.vehicle_type === '2W';
    }
    if (activeCategory === 'models_4w' || activeCategory === 'models_tata_4w') {
      return rule.vehicle_type === '4W';
    }
    if (activeCategory === 'models_ev' || activeCategory === 'models_mg_ev') {
      return rule.vehicle_type === 'EV';
    }
    if (activeCategory === 'models_all') {
      return true;
    }

    if (activeCategory === 'scheme_xyz') {
      return rule.scheme_type === 'xyz';
    }
    if (activeCategory === 'scheme_festive') {
      return rule.scheme_type === 'festive';
    }
    if (activeCategory === 'scheme_exchange') {
      return rule.scheme_type === 'inhouse_exchange';
    }
    if (activeCategory === 'scheme_insurance') {
      return rule.scheme_type === 'inhouse_insurance';
    }
    if (activeCategory === 'scheme_finance') {
      return rule.scheme_type === 'inhouse_finance';
    }
    if (activeCategory === 'scheme_google') {
      return rule.scheme_type === 'google_rating';
    }
    if (activeCategory === 'scheme_gift_cards') {
      return rule.scheme_type === 'gift_cards' || rule.scheme_type === 'referral';
    }
    if (activeCategory === 'all_schemes') {
      return true;
    }

    if (activeCategory === 'spend_bodyshop') {
      return rule.spend_type === 'bodyshop';
    }
    if (activeCategory === 'spend_service') {
      return rule.spend_type === 'service';
    }
    if (activeCategory === 'spend_sale') {
      return rule.spend_type === 'sale';
    }
    if (activeCategory === 'spend_accessories') {
      return rule.spend_type === 'accessories';
    }

    if (activeCategory === 'tier_slabs') {
      return rule.priority_tier && rule.priority_tier !== 'ALL';
    }

    return true;
  });

  // Find active label for main heading
  let activeTitle = 'Automobile Rules & Policies';
  let activeDesc = 'Configure discount %, date ranges, and loyalty points multipliers';
  for (const group of SIDEBAR_DROPDOWN_GROUPS) {
    const found = group.items.find((i) => i.id === activeCategory);
    if (found) {
      activeTitle = found.label;
      break;
    }
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 flex flex-col font-sans select-none">

      {/* ── Top Bar ── */}
      <header className="h-20 bg-white border-b border-slate-200 px-6 sm:px-10 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-black text-slate-900 text-xl tracking-tight">Director Master Brain</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Automobile Dealership Loyalty Rules &amp; Dynamic Policy Studio</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Global Common Rule Set Button */}
          <button
            type="button"
            onClick={() => openCreateModal('common')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md transition-all active:scale-[0.98]"
            title="Create a universal common rule that applies across all categories"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Create Common Rule Set</span>
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          {/* Return to Counter App Button */}
          <button
            type="button"
            onClick={() => {
              if (onExitToCounterApp) onExitToCounterApp();
              else window.location.href = '/';
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
          >
            <Home className="w-4 h-4 text-indigo-600" />
            <span>Counter POS</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </header>

      {/* ── 2-Column Studio Layout (Left Sidebar Dropdowns + Right Main Area) ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left Sidebar with Collapsible Accordion Dropdowns & Main Headings ── */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col justify-between flex-shrink-0 overflow-y-auto p-4 space-y-4">
          <div className="space-y-3">

            {SIDEBAR_DROPDOWN_GROUPS.map((group) => {
              const GroupIcon = group.icon;
              const isOpen = !!openDropdowns[group.id];
              const hasActiveChild = group.items.some((item) => item.id === activeCategory);

              return (
                <div key={group.id} className="rounded-2xl border border-slate-200/90 overflow-hidden bg-slate-50/50 shadow-2xs">
                  {/* Accordion Main Heading Dropdown Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const willOpen = !isOpen;
                      setOpenDropdowns((prev) => ({
                        ...prev,
                        [group.id]: willOpen,
                      }));
                      // If expanding and none active in this group, activate first item
                      if (willOpen && !hasActiveChild && group.items[0]) {
                        setActiveCategory(group.items[0].id);
                        if (group.items[0].id === 'simulator_test') {
                          handleRunSimulation();
                        }
                      }
                    }}
                    className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${
                      hasActiveChild ? 'bg-indigo-50/80 text-indigo-950 font-black' : 'bg-white hover:bg-slate-50 text-slate-800 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                        hasActiveChild ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <GroupIcon className="w-4 h-4" />
                      </div>
                      <span className="text-xs uppercase tracking-wide truncate">
                        {group.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        hasActiveChild ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {group.items.length}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-indigo-600' : ''
                      }`} />
                    </div>
                  </button>

                  {/* Dropdown Items (Decent, readable font size and clean spacing) */}
                  {isOpen && (
                    <div className="p-2 space-y-1 bg-white border-t border-slate-100 animate-fadeIn">
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
                              if (item.id === 'simulator_test') {
                                handleRunSimulation();
                              }
                            }}
                            className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition-all text-left ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <ItemIcon className={`w-4 h-4 flex-shrink-0 ${
                                isActive ? 'text-white' : item.isSpecial ? 'text-emerald-600' : 'text-slate-400'
                              }`} />
                              <span className="truncate">{item.label}</span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {item.badge && (
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                                  isActive ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                              {count !== null && (
                                <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {count}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}

                      {/* Add Category Rule Set Button in Sidebar */}
                      <div className="pt-2 px-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (group.id === 'schemes_group') {
                              openCreateModal(activeCategory.startsWith('scheme_') ? activeCategory : 'all_schemes');
                            } else if (group.id === 'spends_group') {
                              openCreateModal(activeCategory.startsWith('spend_') ? activeCategory : group.items[0]?.id);
                            } else if (group.id === 'models_group') {
                              openCreateModal(activeCategory.startsWith('models_') ? activeCategory : group.items[0]?.id);
                            } else if (group.id === 'dealerships_group') {
                              setOnboardModalOpen(true);
                            } else if (group.id === 'access_group') {
                              setAddUserModalOpen(true);
                            } else {
                              openCreateModal(activeCategory);
                            }
                          }}
                          className="w-full py-1.5 px-3 rounded-xl border border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>+ Add {group.title.split('&')[0].trim()} Rule Set</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

          </div>

          {/* Quick Database Engine Status */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Database Sync</span>
              <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            </div>
            <div className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Rules modified here dynamically calculate billing discounts and points.
            </div>
          </div>
        </aside>

        {/* ── Right-Side Main Content Workspace ── */}
        <main className="flex-1 p-6 sm:p-8 space-y-6 overflow-y-auto">

          {/* Global Notifications */}
          {successMsg && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-bold shadow-xs">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-sm font-bold shadow-xs">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Active Category Header Banner ── */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                  Active Section
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                {activeTitle}
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Manage discounts %, date ranges, and loyalty points multipliers for this category.
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-3">
              {/* Category-Specific Primary Action Buttons */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {activeCategory !== 'user_access_matrix' &&
                 activeCategory !== 'branches_dealerships' &&
                 activeCategory !== 'firms_management' &&
                 activeCategory !== 'simulator_test' && (
                  <button
                    type="button"
                    onClick={() => openCreateModal(activeCategory)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 transition-all active:scale-[0.98]"
                    title={`Create a rule set specifically for ${activeTitle}`}
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>+ Add {getCategoryRuleBtnLabel(activeCategory)}</span>
                  </button>
                )}

                {(activeCategory.startsWith('scheme_') || activeCategory === 'all_schemes') && (
                  <button
                    type="button"
                    onClick={() => setCustomSchemeModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-black border border-purple-300 transition-all active:scale-[0.98]"
                    title="Define a completely new scheme type (e.g. director dynamic custom campaign)"
                  >
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>+ Register New Scheme Type</span>
                  </button>
                )}

                {activeCategory === 'user_access_matrix' && (
                  <button
                    type="button"
                    onClick={() => setAddUserModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-sm"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>+ Add Staff Operator</span>
                  </button>
                )}

                {(activeCategory === 'branches_dealerships' || activeCategory === 'firms_management') && (
                  <button
                    type="button"
                    onClick={() => setOnboardModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-sm"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>+ Onboard Dealership Branch</span>
                  </button>
                )}
              </div>

              {/* Quick 1-Click Director Preset Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-400">1-Click Presets:</span>
              <button
                type="button"
                onClick={() => handleQuickAddPreset('mg_ev_40')}
                className="px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-200 transition"
              >
                + MG EV 40% (Belagavi)
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddPreset('hero_festive_30')}
                className="px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-black border border-blue-200 transition"
              >
                + Hero 30% Festive
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddPreset('tata_nexon_15')}
                className="px-3 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-black border border-purple-200 transition"
              >
                + Tata 15% Nexon
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddPreset('exchange_5000')}
                className="px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-black border border-amber-200 transition"
              >
                + Exchange ₹15,000
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddPreset('service_2x')}
                className="px-3 py-1.5 rounded-full bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-black border border-teal-200 transition"
              >
                + Service 2X Multiplier
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddPreset('google_500')}
                className="px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-black border border-amber-200 transition"
              >
                + Google 500 PTS
              </button>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* VIEW 1: USER ACCESS CONTROL (1-Click Role Switch)                */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeCategory === 'user_access_matrix' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Operator Job Role &amp; Access Matrix</h3>
                  <p className="text-xs font-semibold text-slate-500">
                    Assign Cashier, Manager, or Admin control in 1 click according to staff job role.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddUserModalOpen(true)}
                  className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-sm"
                >
                  + Add Staff Operator
                </button>
              </div>

              {loadingUsers ? (
                <div className="p-8 text-center text-sm font-bold text-slate-500">Loading operators...</div>
              ) : usersList.length === 0 ? (
                <div className="p-8 text-center text-sm font-bold text-slate-500">No operators registered yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-wider border-b border-slate-200">
                        <th className="px-5 py-3.5">User</th>
                        <th className="px-5 py-3.5">Current Role</th>
                        <th className="px-5 py-3.5">Assigned Branch ID</th>
                        <th className="px-5 py-3.5 text-right">1-Click Control Switch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usersList.map((u) => {
                        const currentRole = u.role || 'cashier';
                        return (
                          <tr key={u.id || u.user_id} className="hover:bg-slate-50/70 transition">
                            <td className="px-5 py-4 font-bold text-slate-900">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center">
                                  {u.username?.slice(0, 2).toUpperCase()}
                                </div>
                                <span className="font-mono text-sm">{u.username}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold capitalize ${
                                currentRole === 'admin' || currentRole === 'super_admin'
                                  ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                  : currentRole === 'branch_manager'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-blue-50 text-blue-800 border border-blue-200'
                              }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                {currentRole.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-5 py-4 font-semibold text-slate-600 text-xs">
                              Branch #{u.branch_id || 1}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleQuickRoleChange(u.id || u.user_id, 'cashier')}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                    currentRole === 'cashier'
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  Cashier Ctrl
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickRoleChange(u.id || u.user_id, 'branch_manager')}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                    currentRole === 'branch_manager'
                                      ? 'bg-amber-600 text-white shadow-xs'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  Manager Ctrl
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickRoleChange(u.id || u.user_id, 'admin')}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                    currentRole === 'admin'
                                      ? 'bg-purple-600 text-white shadow-xs'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  Admin Ctrl
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* VIEW 2: DEALERSHIPS & BRANCHES (Moved from normal dashboard)     */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {(activeCategory === 'branches_dealerships' || activeCategory === 'firms_management') && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Dealership Directory &amp; Branches</h3>
                  <p className="text-xs font-semibold text-slate-500">
                    Manage Belagavi, Hubballi, Bengaluru showroom branches and firm client settings.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOnboardModalOpen(true)}
                  className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                >
                  + Onboard Dealership Firm / Branch
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {firms.map((f) => (
                  <div key={f.tenant_id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black uppercase text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                        {f.tenant_id}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Active Group
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-slate-900">{f.firm_name}</h4>
                      <p className="text-xs text-slate-500 font-medium">{f.legal_name || f.firm_name}</p>
                    </div>

                    <div className="text-xs space-y-1 text-slate-600 font-medium">
                      <div><strong>Support:</strong> {f.contact_email || 'support@bellad.com'}</div>
                      <div><strong>Phone:</strong> {f.contact_phone || '+91 836 244 5566'}</div>
                      <div><strong>Redemption Rate:</strong> ₹{f.point_to_rupee_rate || 0.25} / pt</div>
                    </div>
                  </div>
                ))}

                {branchesList.map((b) => (
                  <div key={b.branch_id || b.id} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                        Branch
                      </span>
                      <span className="text-xs font-bold text-slate-500 font-mono">
                        {b.branch_code || 'BLR-01'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900">{b.branch_name}</h4>
                      <p className="text-xs text-slate-500">{b.branch_city || 'Karnataka'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* VIEW 3: LIVE POLICY SIMULATOR CONSOLE                            */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeCategory === 'simulator_test' && (
            <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    Real-Time Policy Sandbox Console
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Evaluate any combination: MG EV 40% discount for Belagavi branch under scheme XYZ.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRunSimulation()}
                  disabled={simLoading}
                  className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{simLoading ? 'Evaluating Policy...' : 'Evaluate Simulation'}</span>
                </button>
              </div>

              {/* Sandbox Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={simForm.customer_name}
                    onChange={(e) => setSimForm({ ...simForm, customer_name: e.target.value })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Scheme Type</label>
                  <input
                    type="text"
                    value={simForm.scheme_type}
                    onChange={(e) => setSimForm({ ...simForm, scheme_type: e.target.value })}
                    placeholder="xyz"
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Spend Category</label>
                  <select
                    value={simForm.spend_type}
                    onChange={(e) => setSimForm({ ...simForm, spend_type: e.target.value })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="bodyshop">Bodyshop &amp; Accidental</option>
                    <option value="service">Routine Service</option>
                    <option value="sale">Vehicle Sale</option>
                    <option value="accessories">Accessories</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Vehicle Category</label>
                  <select
                    value={simForm.vehicle_type}
                    onChange={(e) => setSimForm({ ...simForm, vehicle_type: e.target.value })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="EV">Electric Vehicle (EV)</option>
                    <option value="2W">2-Wheeler (2W)</option>
                    <option value="4W">4-Wheeler (4W)</option>
                    <option value="ALL">All Categories</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={simForm.brand_name}
                    onChange={(e) => setSimForm({ ...simForm, brand_name: e.target.value })}
                    placeholder="MG Motors"
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Model Name</label>
                  <input
                    type="text"
                    value={simForm.model_name}
                    onChange={(e) => setSimForm({ ...simForm, model_name: e.target.value })}
                    placeholder="MG ZS EV"
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Dealership Branch</label>
                  <input
                    type="text"
                    value={simForm.branch_name}
                    onChange={(e) => setSimForm({ ...simForm, branch_name: e.target.value })}
                    placeholder="Belagavi"
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Invoice Bill (₹)</label>
                  <input
                    type="number"
                    value={simForm.spend_amount}
                    onChange={(e) => setSimForm({ ...simForm, spend_amount: Number(e.target.value) })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white font-mono text-base"
                  />
                </div>
              </div>

              {/* Simulation Result Output Display */}
              {simResult && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Calculated Engine Outcome
                    </span>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300">
                      Matched Rule: {simResult.matched_rule?.rule_name || simResult.calculation?.rule_name || 'Matched'} ({simResult.matched_rule?.rule_code || 'CODE'})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-1">
                      <span className="text-xs font-black text-indigo-700 uppercase">Discount Applied</span>
                      <div className="text-3xl font-black text-indigo-950 font-mono">
                        ₹{Number(simResult.calculation?.discount_amount ?? simResult.discount_amount ?? 0).toLocaleString('en-IN')}
                      </div>
                      <span className="text-xs text-indigo-800 font-semibold block">
                        {simResult.calculation?.discount_percentage ?? simResult.discount_pct ?? 40}% discount
                      </span>
                    </div>

                    <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                      <span className="text-xs font-black text-emerald-700 uppercase">Net Payable Amount</span>
                      <div className="text-3xl font-black text-emerald-950 font-mono">
                        ₹{Number((simForm.spend_amount || 0) - (simResult.calculation?.discount_amount ?? simResult.discount_amount ?? 0)).toLocaleString('en-IN')}
                      </div>
                      <span className="text-xs text-emerald-800 font-semibold block">
                        Final bill for counter cashier
                      </span>
                    </div>

                    <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                      <span className="text-xs font-black text-amber-700 uppercase">Points Multiplier</span>
                      <div className="text-3xl font-black text-amber-950 font-mono">
                        {simResult.calculation?.points_multiplier ?? simResult.points_multiplier ?? 1.0}×
                      </div>
                      <span className="text-xs text-amber-800 font-semibold block">
                        Acceleration rate applied
                      </span>
                    </div>

                    <div className="p-5 rounded-2xl bg-purple-50 border border-purple-200 space-y-1">
                      <span className="text-xs font-black text-purple-700 uppercase">Loyalty Points Awarded</span>
                      <div className="text-3xl font-black text-purple-950 font-mono">
                        +{Number(simResult.calculation?.total_points ?? simResult.points_to_award ?? 500).toLocaleString()} <span className="text-sm font-bold">PTS</span>
                      </div>
                      <span className="text-xs text-purple-800 font-semibold block">
                        Credited to {simForm.customer_name}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* VIEW 4: CLEAN RULES TABLE FOR ALL OTHER CATEGORIES               */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* VIEW: SILVER, GOLD, VIP DYNAMIC SLABS MANAGER                    */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeCategory === 'tier_slabs' && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-500" />
                    <h3 className="text-xl font-black text-slate-900">Silver / Gold / VIP Priority Slabs</h3>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mt-1">
                    Dynamically configure tier eligibility by Customer Expenses, Points Earned, Single Invoice Amount, or Vehicle Fleet.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTier(tierSlabs[1]); // Gold
                      setEditingTierModalOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-sm flex items-center gap-1.5 transition"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                    <span>+ Configure Slab Rule</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Slabs Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {tierSlabs.map((tier) => {
                  const isSilver = tier.tier_id === 'silver';
                  const isGold = tier.tier_id === 'gold';
                  const isVip = tier.tier_id === 'vip';

                  const evalBasisLabels = {
                    expenses_based: 'Customer Expenses Based (₹ Total Spend)',
                    points_based: 'Highest Points Earned (PTS Threshold)',
                    invoice_based: 'Single Invoice Amount (Min Bill ₹)',
                    annual_spend: 'Annual Spend (Past 12 Months ₹)',
                    vehicles_count: 'Vehicle Ownership (2+ Vehicles)',
                  };

                  return (
                    <div
                      key={tier.tier_id}
                      className={`rounded-3xl p-6 border-2 transition-all relative flex flex-col justify-between ${
                        isVip
                          ? 'bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 border-purple-500/40 text-white shadow-xl'
                          : isGold
                          ? 'bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30 border-amber-300 text-slate-900 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                              isVip
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                : isGold
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            <Crown className="w-3.5 h-3.5 fill-current" />
                            {tier.name}
                          </span>
                          <span className={`text-[11px] font-bold ${isVip ? 'text-slate-400' : 'text-slate-500'}`}>
                            {tier.subtitle}
                          </span>
                        </div>

                        {/* Qualification Basis Pill */}
                        <div className={`p-3 rounded-2xl border ${isVip ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                          <span className={`text-[10px] uppercase font-black block tracking-wider ${isVip ? 'text-amber-400' : 'text-slate-400'}`}>
                            Dynamic Qualification Basis
                          </span>
                          <span className={`text-xs font-bold mt-0.5 block ${isVip ? 'text-white' : 'text-slate-900'}`}>
                            {evalBasisLabels[tier.eval_basis] || tier.eval_basis}
                          </span>
                          <div className="mt-2 flex items-baseline gap-1.5">
                            <span className={`text-2xl font-black font-mono ${isVip ? 'text-amber-400' : 'text-indigo-600'}`}>
                              {tier.eval_basis === 'vehicles_count'
                                ? `${tier.threshold} Vehicles`
                                : tier.eval_basis === 'points_based'
                                ? `${Number(tier.threshold).toLocaleString()} PTS`
                                : `₹${Number(tier.threshold).toLocaleString('en-IN')}`}
                            </span>
                            <span className={`text-[11px] font-semibold ${isVip ? 'text-slate-400' : 'text-slate-500'}`}>
                              {isSilver ? 'Starting Base' : 'Minimum Qualifier'}
                            </span>
                          </div>
                        </div>

                        {/* Perks Grid */}
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between py-1 border-b border-dashed border-slate-200/40">
                            <span className={isVip ? 'text-slate-300' : 'text-slate-600'}>Loyalty Earning Multiplier</span>
                            <span className="font-mono font-black">{tier.multiplier}× Multiplier</span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b border-dashed border-slate-200/40">
                            <span className={isVip ? 'text-slate-300' : 'text-slate-600'}>Bodyshop Discount Rate</span>
                            <span className="font-mono font-black text-emerald-500">{tier.bodyshop_discount_pct}% Off</span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b border-dashed border-slate-200/40">
                            <span className={isVip ? 'text-slate-300' : 'text-slate-600'}>In-House Finance Bonus</span>
                            <span className="font-mono font-black">+{tier.finance_bonus_pts} PTS</span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b border-dashed border-slate-200/40">
                            <span className={isVip ? 'text-slate-300' : 'text-slate-600'}>In-House Exchange Trade-In</span>
                            <span className="font-mono font-black">+{tier.exchange_bonus_pts} PTS</span>
                          </div>
                          <div className="flex items-center justify-between py-1">
                            <span className={isVip ? 'text-slate-300' : 'text-slate-600'}>Priority Service Lounge</span>
                            <span className={`font-bold ${tier.lounge_access ? 'text-emerald-500' : 'text-slate-400'}`}>
                              {tier.lounge_access ? '✓ Granted' : '✕ Not Included'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-200/20">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTier(tier);
                            setEditingTierModalOpen(true);
                          }}
                          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                            isVip
                              ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                              : isGold
                              ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 font-black shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                          }`}
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Customize {tier.name} Fields</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* VIEW: EXECUTIVE DIRECTOR APPROVALS & AUDIT TRAIL                 */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeCategory === 'director_audit' && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-xl font-black text-slate-900">Executive Director Approvals &amp; Audit Trail</h3>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mt-1">
                    Formal sign-off register. All scheme rules and discount policies require authorization by <strong>Director Agastya Bellad Sir</strong>.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2">
                  {[
                    { id: 'ALL', label: 'All Audit Records' },
                    { id: 'pending', label: 'Pending Sign-Off' },
                    { id: 'approved', label: 'Director Approved' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAuditStatusFilter(tab.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                        auditStatusFilter === tab.id
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audit Log Entries List */}
              <div className="space-y-4">
                {rules
                  .filter((r) => {
                    if (auditStatusFilter === 'ALL') return true;
                    if (auditStatusFilter === 'pending') return r.approval_status === 'pending' || r.approval_status === 'pending_approval';
                    if (auditStatusFilter === 'approved') return r.approval_status === 'approved';
                    return true;
                  })
                  .map((r) => {
                    const isApproved = r.approval_status === 'approved';
                    const isPending = r.approval_status === 'pending' || r.approval_status === 'pending_approval';
                    const isRejected = r.approval_status === 'rejected';

                    const approverName = r.approved_by || 'Director Agastya Bellad Sir';
                    const approverDate = r.approved_at
                      ? new Date(r.approved_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Pending Execution';

                    return (
                      <div
                        key={r.rule_id}
                        className={`p-5 rounded-2xl border transition-all ${
                          isPending
                            ? 'bg-amber-50/40 border-amber-300'
                            : isApproved
                            ? 'bg-white border-slate-200 hover:border-slate-300'
                            : 'bg-rose-50/30 border-rose-200'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          {/* Left: What New Rule We Did */}
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                                {r.rule_code}
                              </span>
                              <h4 className="text-base font-black text-slate-900">{r.rule_name}</h4>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Scheme: {r.scheme_type || 'General'}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200">
                                {r.spend_type || 'service'}
                              </span>
                              {!r.is_active && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                                  Not Applied in App (Pending Agastya Sir Sign-off)
                                </span>
                              )}
                              {r.is_active && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  Live in App Brain
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed">
                              {r.description || 'Custom dealer discount and loyalty points acceleration rule.'}
                            </p>

                            {/* Scope Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 block uppercase">Category / Model</span>
                                <span className="font-bold text-slate-800">{r.vehicle_type || 'All Models'}</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 block uppercase">Branch Scope</span>
                                <span className="font-bold text-slate-800">
                                  {Array.isArray(r.branches) ? r.branches.join(', ') : 'All Branches'}
                                </span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 block uppercase">Benefit</span>
                                <span className="font-bold text-emerald-700 font-mono">
                                  {r.discount_value > 0 ? `${r.discount_value}% Discount` : `${r.bonus_points || 0} PTS`}
                                </span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 block uppercase">Created By</span>
                                <span className="font-bold text-slate-800">Operator: {r.created_by || 'kavya'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Director Approval Sign-Off Block */}
                          <div className="lg:w-84 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shrink-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                Governance Sign-Off
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  isApproved
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : isPending
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                              >
                                {isPending ? 'pending_approval' : r.approval_status}
                              </span>
                            </div>

                            <div className="space-y-1 text-xs">
                              <div>
                                <span className="text-[11px] text-slate-400 block">Authorizing Director:</span>
                                <strong className="text-slate-900 font-bold block text-sm">
                                  {isApproved ? approverName : 'Director Agastya Bellad Sir'}
                                </strong>
                              </div>

                              <div>
                                <span className="text-[11px] text-slate-400 block">Sign-Off Date &amp; Time:</span>
                                <span className="font-mono text-slate-700 font-bold text-xs block">
                                  {isApproved ? approverDate : 'Awaiting Agastya Sir Sign-Off'}
                                </span>
                              </div>

                              {r.approval_notes && (
                                <div className="pt-1 text-[11px] text-slate-600 italic">
                                  &ldquo;{r.approval_notes}&rdquo;
                                </div>
                              )}
                            </div>

                            {/* Action Buttons: ONLY Director Agastya Sir has permission to sign off */}
                            {isPending && (
                              <div className="pt-2 border-t border-slate-200">
                                {isDirectorUser ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleApproveAsDirector(r.rule_id, r.rule_name)}
                                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                                      >
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                        <span>Sign &amp; Approve as Agastya Sir</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRejectAsDirector(r.rule_id, r.rule_name)}
                                        className="py-2 px-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition"
                                        title="Reject with feedback"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                    <p className="text-[10px] text-emerald-700 text-center font-bold">
                                      ✓ Authorized as Executive Director Agastya Bellad
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300/80 text-xs flex items-start gap-2">
                                      <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                                      <div className="space-y-0.5">
                                        <div className="font-black text-amber-900">Sign-Off Restricted</div>
                                        <p className="text-[11px] text-amber-800 leading-tight">
                                          Line item sits in <strong>Pending</strong> state. Only <strong>Director Agastya Sir</strong> (<code className="font-mono font-bold bg-amber-100 px-1 rounded">agstya</code>) has authority to approve it into backend engine.
                                        </p>
                                        <p className="text-[10px] text-slate-500 pt-0.5">
                                          Logged in as: <strong>{loggedInUser?.username || 'Operator'}</strong> (No approval rights)
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      disabled
                                      className="w-full py-2 px-3 bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed opacity-80"
                                    >
                                      <Lock className="w-3.5 h-3.5" />
                                      <span>Locked (Awaiting Agastya Sir's Approval)</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* VIEW: CLEAN RULES TABLE FOR ALL OTHER CATEGORIES                  */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeCategory !== 'user_access_matrix' &&
            activeCategory !== 'branches_dealerships' &&
            activeCategory !== 'firms_management' &&
            activeCategory !== 'simulator_test' &&
            activeCategory !== 'tier_slabs' &&
            activeCategory !== 'director_audit' && (
              <div className="space-y-4">
                {/* Search & Filter Toolbar */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                    <div className="relative flex-1 md:w-80">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search rules, models (MG, Nexon, Splendor)..."
                        className="w-full pl-10 pr-4 py-2.5 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <select
                      value={vehicleFilter}
                      onChange={(e) => setVehicleFilter(e.target.value)}
                      className="text-xs font-bold px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                    >
                      <option value="ALL">All Categories</option>
                      <option value="EV">Electric (EV)</option>
                      <option value="2W">Two-Wheeler (2W)</option>
                      <option value="4W">Four-Wheeler (4W)</option>
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="text-xs font-bold px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                    >
                      <option value="ALL">All Status</option>
                      <option value="approved">Approved &amp; Live</option>
                      <option value="pending">Pending Sign-Off</option>
                    </select>
                  </div>

                  <div className="text-xs font-bold text-slate-500">
                    Showing <strong>{filteredRules.length}</strong> active rules
                  </div>
                </div>

                {/* Rules Table */}
                <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-black text-xs">
                          <th className="px-6 py-4">Rule Code &amp; Title</th>
                          <th className="px-6 py-4">Target Brand &amp; Model</th>
                          <th className="px-6 py-4">Scheme &amp; Spend</th>
                          <th className="px-6 py-4">Discount Off</th>
                          <th className="px-6 py-4">Points Logic</th>
                          <th className="px-6 py-4">Director Sign-Off</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loading ? (
                          <tr>
                            <td colSpan="7" className="px-6 py-12 text-center text-sm font-bold text-slate-400">
                              Loading policy rules...
                            </td>
                          </tr>
                        ) : filteredRules.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="px-6 py-12 text-center text-sm font-bold text-slate-400">
                              No matching rules found in this section.
                            </td>
                          </tr>
                        ) : (
                          filteredRules.map((r) => {
                            const isApproved = r.approval_status === 'approved';
                            const modelsText = Array.isArray(r.models) ? r.models.join(', ') : r.models || 'ALL';
                            return (
                              <tr key={r.rule_id || r.id} className="hover:bg-slate-50/70 transition">
                                <td className="px-6 py-4 font-bold">
                                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                    <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                      {r.rule_code}
                                    </span>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                      getRuleSetBadgeStyle(getRuleSetScope(r))
                                    }`}>
                                      {getRuleSetLabel(getRuleSetScope(r))}
                                    </span>
                                  </div>
                                  <div className="text-sm font-black text-slate-900">{r.rule_name}</div>
                                  {r.description && (
                                    <div className="text-xs text-slate-400 font-medium truncate max-w-xs">{r.description}</div>
                                  )}
                                </td>

                                <td className="px-6 py-4">
                                  <span className="font-bold text-slate-800 text-xs block">
                                    {r.brand_name || 'All Brands'}
                                  </span>
                                  <span className="text-xs text-slate-500 font-mono">
                                    {modelsText}
                                  </span>
                                </td>

                                <td className="px-6 py-4">
                                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-slate-100 text-slate-700">
                                    {r.scheme_type}
                                  </span>
                                  <span className="text-xs text-slate-500 block capitalize mt-0.5 font-semibold">
                                    {r.spend_type}
                                  </span>
                                </td>

                                <td className="px-6 py-4 font-black">
                                  {r.discount_value > 0 ? (
                                    <span className="text-indigo-800 text-sm">
                                      {r.discount_type === 'percentage' ? `${r.discount_value}% Off` : `₹${r.discount_value} Flat`}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>

                                <td className="px-6 py-4">
                                  <span className="text-emerald-700 font-extrabold text-xs block">
                                    {r.points_multiplier_numerator || 1}× Multiplier
                                  </span>
                                  {r.bonus_points > 0 && (
                                    <span className="text-purple-700 font-bold text-xs">+{r.bonus_points} Bonus PTS</span>
                                  )}
                                </td>

                                <td className="px-6 py-4">
                                  {isApproved ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-xs">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      Live in App
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleApprove(r.rule_id || r.id)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-black text-xs transition"
                                    >
                                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                                      Sign Off Now
                                    </button>
                                  )}
                                </td>

                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSimForm({
                                          ...simForm,
                                          scheme_type: r.scheme_type,
                                          spend_type: r.spend_type,
                                          vehicle_type: r.vehicle_type,
                                          brand_name: r.brand_name || 'MG Motors',
                                          model_name: Array.isArray(r.models) && r.models[0] !== 'ALL' ? r.models[0] : 'MG ZS EV',
                                        });
                                        setActiveCategory('simulator_test');
                                        handleRunSimulation();
                                      }}
                                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                                      title="Test in Simulator"
                                    >
                                      <Play className="w-3.5 h-3.5 text-emerald-600 fill-current" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openEditModal(r)}
                                      className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition"
                                      title="Edit Policy"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(r.rule_id || r.id)}
                                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition"
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

      {/* ── MODAL 1: HIGHLY CUSTOMIZABLE RULE BUILDER ── */}
      {editorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {editingRule ? 'Edit Loyalty Rule' : 'Create New Loyalty Policy'}
                </h3>
                <p className="text-xs font-semibold text-slate-500">
                  Supports arbitrary schemes (xyz), brands (MG, Tata), models, branches &amp; discounts
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditorModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="p-7 space-y-5">
              {/* Rule Set Scope Type Pill Switcher */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                  Rule Set Scope:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { id: 'common', label: '⚡ Common / Universal Rule' },
                    { id: 'scheme', label: '🎯 Scheme Campaign Rule' },
                    { id: 'model', label: '🚗 Vehicle Model Rule' },
                    { id: 'spend', label: '🔧 Spend Category Rule' },
                    { id: 'tier', label: '👑 Priority Tier Rule' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          rule_set_type: t.id,
                          rule_code: prev.rule_code || `${t.id.toUpperCase()}-${Date.now().toString().slice(-4)}`,
                        }));
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-black transition ${
                        (formData.rule_set_type || 'common') === t.id
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Rule Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.rule_code}
                    onChange={(e) => setFormData({ ...formData, rule_code: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Rule Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.rule_name}
                    onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                    placeholder="e.g. MG EV Bodyshop 40% Belagavi Branch Campaign"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Scheme Type *</label>
                    <button
                      type="button"
                      onClick={() => setCustomSchemeModalOpen(true)}
                      className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> New Scheme
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    list="scheme-types-list"
                    value={formData.scheme_type}
                    onChange={(e) => setFormData({ ...formData, scheme_type: e.target.value.toLowerCase().trim() })}
                    placeholder="e.g. xyz, festive, exchange"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white font-mono text-xs font-bold text-indigo-700"
                  />
                  <datalist id="scheme-types-list">
                    {lookups.scheme_types?.map((st) => (
                      <option key={st.id || st.code} value={st.code || st.id}>
                        {st.label || st.name}
                      </option>
                    ))}
                    <option value="xyz">Director Custom Scheme (xyz)</option>
                    <option value="festive">Festive Mega Slabs</option>
                    <option value="inhouse_exchange">In-House Exchange</option>
                    <option value="inhouse_insurance">In-House Insurance</option>
                    <option value="inhouse_finance">In-House Finance</option>
                    <option value="google_rating">Google 5-Star Rating</option>
                    <option value="standard">Standard Baseline</option>
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Spend Category *</label>
                  <select
                    value={formData.spend_type}
                    onChange={(e) => setFormData({ ...formData, spend_type: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                  >
                    <option value="bodyshop">Bodyshop Repair</option>
                    <option value="service">Routine Service</option>
                    <option value="sale">Vehicle Sale</option>
                    <option value="accessories">Accessories</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Vehicle Category *</label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                  >
                    <option value="EV">Electric (EV)</option>
                    <option value="2W">Two-Wheeler (2W)</option>
                    <option value="4W">Four-Wheeler (4W)</option>
                    <option value="ALL">All Categories</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.brand_name}
                    onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                    placeholder="MG Motors, Tata Motors, ALL"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Applicable Models *</label>
                  <input
                    type="text"
                    required
                    value={Array.isArray(formData.models) ? formData.models.join(', ') : formData.models}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        models: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="MG ZS EV, Comet EV, ALL"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-bold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Applicable Branches *</label>
                  <input
                    type="text"
                    required
                    value={Array.isArray(formData.branches) ? formData.branches.join(', ') : formData.branches}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        branches: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="Belagavi, Belagavi Central, ALL"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Customer Priority Tier</label>
                  <select
                    value={formData.priority_tier}
                    onChange={(e) => setFormData({ ...formData, priority_tier: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                  >
                    <option value="ALL">All Tiers (Silver, Gold, Platinum)</option>
                    <option value="silver">Silver Tier</option>
                    <option value="gold">Gold VIP</option>
                    <option value="platinum">Platinum Executive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Discount Type</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat_rupees">Flat Rupees (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Discount Value *</label>
                  <input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                    placeholder="40"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-black text-indigo-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Bonus Points</label>
                  <input
                    type="number"
                    value={formData.bonus_points}
                    onChange={(e) => setFormData({ ...formData, bonus_points: parseInt(e.target.value, 10) || 0 })}
                    placeholder="500"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-black text-purple-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Applicable From Date</label>
                  <input
                    type="date"
                    value={formData.applicable_from}
                    onChange={(e) => setFormData({ ...formData, applicable_from: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Applicable Upto Date</label>
                  <input
                    type="date"
                    value={formData.applicable_upto}
                    onChange={(e) => setFormData({ ...formData, applicable_upto: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditorModalOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-7 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md transition disabled:opacity-50"
                >
                  {formSaving ? 'Deploying...' : editingRule ? 'Update & Deploy Rule' : 'Save & Deploy to Live Engine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ADD STAFF USER ── */}
      {addUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">Add Staff Operator</h3>
              <button
                type="button"
                onClick={() => setAddUserModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. rajesh_cashier"
                  value={newUserData.username}
                  onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Temporary Password</label>
                <input
                  type="text"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Assign Job Role *</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  <option value="cashier">Counter Cashier</option>
                  <option value="branch_manager">Branch Manager</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddUserModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-sm"
                >
                  Create Operator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: REGISTER BRAND NEW SCHEME TYPE (DIRECTOR EXTENSIBILITY) ── */}
      {customSchemeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">Register New Scheme Type</h3>
                <p className="text-xs font-semibold text-slate-500">
                  Add completely new scheme category (e.g. xyz, monsoon_mega, vip_festive)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomSchemeModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterCustomScheme} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Scheme Code Identifier *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. xyz or mega_monsoon"
                  value={newSchemeData.scheme_code}
                  onChange={(e) => setNewSchemeData({ ...newSchemeData, scheme_code: e.target.value.toLowerCase().trim() })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-indigo-700 bg-indigo-50/30"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Machine identifier (lowercase, no spaces)</span>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Scheme Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Director Executive XYZ Scheme"
                  value={newSchemeData.scheme_name}
                  onChange={(e) => setNewSchemeData({ ...newSchemeData, scheme_name: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Description / Campaign Purpose</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 40% discount for MG EV at Belagavi branch with 500 bonus points"
                  value={newSchemeData.description}
                  onChange={(e) => setNewSchemeData({ ...newSchemeData, description: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCustomSchemeModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20"
                >
                  Register &amp; Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMIZE TIER SLAB MODAL */}
      {editingTierModalOpen && selectedTier && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-slate-900">Configure {selectedTier.name} Dynamic Fields</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTierModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setTierSlabs((prev) =>
                  prev.map((t) => (t.tier_id === selectedTier.tier_id ? selectedTier : t))
                );
                setEditingTierModalOpen(false);
                showToast(`Dynamic criteria for ${selectedTier.name} updated successfully!`);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-black text-slate-700 uppercase mb-1">
                  Qualification Evaluation Basis (Dynamic Rule)
                </label>
                <select
                  value={selectedTier.eval_basis}
                  onChange={(e) => setSelectedTier({ ...selectedTier, eval_basis: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 font-bold bg-slate-50 text-slate-900"
                >
                  <option value="expenses_based">Customer Expenses Based (Total Cumulative Spends ₹)</option>
                  <option value="points_based">Points Earned Based (Highest Lifetime / Annual PTS)</option>
                  <option value="invoice_based">Single Invoice Amount Based (Min Single Bill Amount ₹)</option>
                  <option value="annual_spend">Annual Spend Threshold (Past 12 Months Spend ₹)</option>
                  <option value="vehicles_count">Vehicle Ownership Count (2+ Vehicles Owned)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Choose how customer qualifies for {selectedTier.name} (expenses, points, or bill value).
                </p>
              </div>

              <div>
                <label className="block font-black text-slate-700 uppercase mb-1">
                  Threshold Qualifier Value
                </label>
                <input
                  type="number"
                  value={selectedTier.threshold}
                  onChange={(e) => setSelectedTier({ ...selectedTier, threshold: Number(e.target.value) })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black text-slate-700 uppercase mb-1">Points Multiplier</label>
                  <input
                    type="number"
                    step="0.05"
                    value={selectedTier.multiplier}
                    onChange={(e) => setSelectedTier({ ...selectedTier, multiplier: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-700 uppercase mb-1">Bodyshop Discount %</label>
                  <input
                    type="number"
                    value={selectedTier.bodyshop_discount_pct}
                    onChange={(e) => setSelectedTier({ ...selectedTier, bodyshop_discount_pct: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 text-[10px] uppercase mb-1">Finance Bonus</label>
                  <input
                    type="number"
                    value={selectedTier.finance_bonus_pts}
                    onChange={(e) => setSelectedTier({ ...selectedTier, finance_bonus_pts: Number(e.target.value) })}
                    className="w-full h-10 px-2.5 rounded-xl border border-slate-300 font-mono font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 text-[10px] uppercase mb-1">Insurance Bonus</label>
                  <input
                    type="number"
                    value={selectedTier.insurance_bonus_pts}
                    onChange={(e) => setSelectedTier({ ...selectedTier, insurance_bonus_pts: Number(e.target.value) })}
                    className="w-full h-10 px-2.5 rounded-xl border border-slate-300 font-mono font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 text-[10px] uppercase mb-1">Exchange Trade-In</label>
                  <input
                    type="number"
                    value={selectedTier.exchange_bonus_pts}
                    onChange={(e) => setSelectedTier({ ...selectedTier, exchange_bonus_pts: Number(e.target.value) })}
                    className="w-full h-10 px-2.5 rounded-xl border border-slate-300 font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedTier.lounge_access}
                    onChange={(e) => setSelectedTier({ ...selectedTier, lounge_access: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>VIP Lounge Access</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedTier.free_inspection}
                    onChange={(e) => setSelectedTier({ ...selectedTier, free_inspection: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>Free Annual Inspection</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTierModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-sm"
                >
                  Save Dynamic Slab Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: ONBOARD DEALERSHIP FIRM / BRANCH ── */}
      {onboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">Onboard Dealership Client / Branch</h3>
              <button
                type="button"
                onClick={() => setOnboardModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOnboardFirmSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Dealership ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="bellad_belagavi"
                    value={newFirmData.tenant_id}
                    onChange={(e) => setNewFirmData({ ...newFirmData, tenant_id: e.target.value.toLowerCase().trim() })}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Dealership Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Bellad Motors Belagavi"
                    value={newFirmData.firm_name}
                    onChange={(e) => setNewFirmData({ ...newFirmData, firm_name: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Showroom Branch City</label>
                <input
                  type="text"
                  placeholder="Belagavi"
                  value={newFirmData.default_branch_city}
                  onChange={(e) => setNewFirmData({ ...newFirmData, default_branch_city: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="support@bellad.com"
                    value={newFirmData.contact_email}
                    onChange={(e) => setNewFirmData({ ...newFirmData, contact_email: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 836 244 5566"
                    value={newFirmData.contact_phone}
                    onChange={(e) => setNewFirmData({ ...newFirmData, contact_phone: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOnboardModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-sm"
                >
                  Deploy Dealership
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
