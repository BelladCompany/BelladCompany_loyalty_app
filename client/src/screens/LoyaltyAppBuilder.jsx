import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Smartphone,
  Tablet,
  Monitor,
  Sparkles,
  Percent,
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
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Upload,
  Download,
  Share2,
  Eye,
  SlidersHorizontal,
  FileText,
  LayoutDashboard,
  CheckCheck,
  Sparkle,
  Image as ImageIcon,
  Compass,
  Settings,
  Globe,
  Radio,
  FileCheck,
  MapPin,
  KeyRound,
  ShieldAlert,
  SlidersVertical,
  Database,
  Link2,
  UserPlus,
  History,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import ApiService from '../services/api';

/**
 * Dealerships Catalog
 */
const DEALERSHIPS_CATALOG = [
  {
    id: 'trident_automobiles',
    name: 'Trident Automobiles',
    brands: 'Hyundai, BharatBenz & Multi-Brand',
    city: 'Bengaluru Metro',
    logo: '/trident-logo.svg',
    primary: '#0284c7',
    secondary: '#0369a1',
  },
  {
    id: 'bellad_and_company',
    name: 'Bellad & Company',
    brands: 'Tata Motors & MG Motors',
    city: 'Hubballi / Belagavi',
    logo: '/bellad-logo.png',
    primary: '#1e40af',
    secondary: '#3b82f6',
  },
  {
    id: 'sprint_hero',
    name: 'Sprint Moto Club',
    brands: 'Hero MotoCorp & EV',
    city: 'Hubballi / Belagavi',
    logo: '/hero-logo.svg',
    primary: '#dc2626',
    secondary: '#ef4444',
  },
  {
    id: 'advaith_motors',
    name: 'Advaith Motors',
    brands: 'Advaith Auto Group',
    city: 'Bengaluru / Mysuru',
    logo: '/bellad-logo.png',
    primary: '#059669',
    secondary: '#10b981',
  },
];

/**
 * Dealership Logo Library
 */
const LOGO_LIBRARY = [
  { id: 'trident', name: 'Trident Automobiles Logo', url: '/trident-logo.svg' },
  { id: 'bellad', name: 'Bellad & Company Tata Logo', url: '/bellad-logo.png' },
  { id: 'hero', name: 'Sprint Hero MotoCorp Logo', url: '/hero-logo.svg' },
];

/**
 * 1-Click Brand Theme Presets
 */
const THEME_PRESETS = [
  { id: 'trident_cyan', name: 'Trident Premium Cyan', primary: '#0284c7', secondary: '#0369a1', accent: '#059669', surface: 'light' },
  { id: 'tata_navy', name: 'Tata Executive Navy', primary: '#1e40af', secondary: '#3b82f6', accent: '#10b981', surface: 'light' },
  { id: 'sprint_red', name: 'Sprint Hero Red', primary: '#dc2626', secondary: '#ef4444', accent: '#f59e0b', surface: 'light' },
  { id: 'emerald_eco', name: 'Emerald Eco Mobility', primary: '#059669', secondary: '#10b981', accent: '#3b82f6', surface: 'light' },
  { id: 'luxury_gold', name: 'Luxury Amber Gold', primary: '#b45309', secondary: '#f59e0b', accent: '#10b981', surface: 'dark' },
  { id: 'stealth_dark', name: 'Stealth Midnight Slate', primary: '#0f172a', secondary: '#38bdf8', accent: '#10b981', surface: 'dark' },
];

/**
 * 5 Pre-loaded Realistic Test Customers for Interactive Search & 360
 */
const TEST_CUSTOMERS = [
  {
    id: 'cust_1',
    name: 'Rahul Sharma',
    phone: '98888 77777',
    aadhaar: 'XXXX-XXXX-9012',
    tier: 'Gold VIP',
    points_balance: 4250,
    locked_points: 1200,
    available_points: 3050,
    lifetime_spend: 1850000,
    vehicle_model: 'Tata Safari Dark Edition',
    chassis: 'KA-25-EA-8899',
    vin: 'MAT612055N2A8899',
    history: [
      { id: 'tx_1', invoice: 'INV-2026-9041', date: '28-Oct-2026', type: 'Service & Spares', spend: 18500, points_earned: 462, points_redeemed: 0, balance: 4250 },
      { id: 'tx_2', invoice: 'INV-2026-8802', date: '15-Aug-2026', type: 'Accessories & Ceramic', spend: 32000, points_earned: 960, points_redeemed: 0, balance: 3788 },
      { id: 'tx_3', invoice: 'INV-2026-7011', date: '10-Feb-2026', type: 'Vehicle Purchase', spend: 1800000, points_earned: 18000, points_redeemed: 15172, balance: 2828 }
    ]
  },
  {
    id: 'cust_2',
    name: 'Priya Patel',
    phone: '97777 66666',
    aadhaar: 'XXXX-XXXX-3341',
    tier: 'Silver Member',
    points_balance: 14500,
    locked_points: 5000,
    available_points: 9500,
    lifetime_spend: 1450000,
    vehicle_model: 'Tata Nexon Creative Plus',
    chassis: 'KA-22-MB-4411',
    vin: 'MAT612044P1B4411',
    history: [
      { id: 'tx_4', invoice: 'INV-2026-9102', date: '02-Nov-2026', type: 'Periodic Maintenance', spend: 12500, points_earned: 312, points_redeemed: 0, balance: 14500 },
      { id: 'tx_5', invoice: 'INV-2026-7500', date: '20-May-2026', type: 'New Car Delivery', spend: 1437500, points_earned: 14375, points_redeemed: 187, balance: 14188 }
    ]
  },
  {
    id: 'cust_3',
    name: 'Vikram Singh Fleet Logistics',
    phone: '99000 11223',
    aadhaar: 'XXXX-XXXX-8822',
    tier: 'Diamond Director',
    points_balance: 84200,
    locked_points: 15000,
    available_points: 69200,
    lifetime_spend: 8500000,
    vehicle_model: 'BharatBenz 2823R Heavy Truck',
    chassis: 'KA-01-AX-9900',
    vin: 'ME4511099R9A9900',
    history: [
      { id: 'tx_6', invoice: 'INV-2026-9210', date: '04-Nov-2026', type: 'Fleet Engine Overhaul', spend: 85000, points_earned: 2125, points_redeemed: 5000, balance: 84200 }
    ]
  },
  {
    id: 'cust_4',
    name: 'Ananya Deshmukh',
    phone: '98450 12345',
    aadhaar: 'XXXX-XXXX-6512',
    tier: 'Gold VIP',
    points_balance: 6800,
    locked_points: 1800,
    available_points: 5000,
    lifetime_spend: 1250000,
    vehicle_model: 'Hyundai Creta SX(O)',
    chassis: 'KA-04-NF-1234',
    vin: 'MAL612033K4N1234',
    history: [
      { id: 'tx_7', invoice: 'INV-2026-8950', date: '22-Sep-2026', type: 'Service & Detailing', spend: 16500, points_earned: 412, points_redeemed: 0, balance: 6800 }
    ]
  },
  {
    id: 'cust_5',
    name: 'Arjun Rao',
    phone: '97310 98765',
    aadhaar: 'XXXX-XXXX-4490',
    tier: 'Silver Member',
    points_balance: 3100,
    locked_points: 800,
    available_points: 2300,
    lifetime_spend: 1950000,
    vehicle_model: 'Tata Harrier Fearless Plus',
    chassis: 'KA-25-Z-5555',
    vin: 'MAT612088M1Z5555',
    history: [
      { id: 'tx_8', invoice: 'INV-2026-8711', date: '10-Jul-2026', type: 'First Free Service', spend: 4500, points_earned: 112, points_redeemed: 0, balance: 3100 }
    ]
  }
];

export default function LoyaltyAppBuilder({ user, onExitToCounterApp }) {
  // ─── Top Bar & Navigation States ───
  const [selectedTenant, setSelectedTenant] = useState(user?.tenant_id || 'trident_automobiles');
  const [activeMenu, setActiveMenu] = useState('appearance'); // 'appearance' | 'buttons' | 'branches' | 'users' | 'portal' | 'logic' | 'integrations' | 'tabs' | 'tiers'
  const [viewport, setViewport] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [roleView, setRoleView] = useState('cashier'); // 'cashier' | 'manager' | 'admin' | 'portal'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ─── Theme & Branding State ───
  const [theme, setTheme] = useState({
    dealership_name: 'Trident Automobiles',
    tagline: 'Authorised Multi-Brand & Premium Mobility Partner',
    logo_url: '/trident-logo.svg',
    primary_color: '#0284c7',
    secondary_color: '#0369a1',
    accent_color: '#059669',
    surface_mode: 'light',
    card_radius: 'rounded-2xl',
    font_family: 'Plus Jakarta Sans',
    header_banner_text: 'Trident Elite Customer Privilege Club',
    show_header_banner: true,
  });

  // ─── Buttons Customizer State ───
  const [btnConfig, setBtnConfig] = useState({
    add_receipt_label: 'Add Receipt',
    add_receipt_color: 'emerald', // emerald, indigo, amber, primary, slate
    bill_correction_label: 'Bill Correction',
    bill_correction_color: 'amber',
    redeem_label: 'Redeem Discount',
    redeem_color: 'indigo',
    whatsapp_label: 'Send WhatsApp Pass',
    whatsapp_color: 'emerald',
  });

  // ─── Branches State ───
  const [branches, setBranches] = useState([
    { id: 'br_blr_south', code: 'TRD-BLR-01', name: 'Trident Bengaluru South', city: 'Bengaluru', multiplier: 1.0, redemption_budget: 500000, manager_approval_limit: 5000, is_active: true },
    { id: 'br_indiranagar', code: 'TRD-BLR-02', name: 'Trident Indiranagar Flagship', city: 'Bengaluru', multiplier: 1.1, redemption_budget: 750000, manager_approval_limit: 7500, is_active: true },
    { id: 'br_whitefield', code: 'TRD-BLR-03', name: 'Trident Whitefield Tech Hub', city: 'Bengaluru', multiplier: 1.0, redemption_budget: 600000, manager_approval_limit: 5000, is_active: true },
  ]);

  // ─── Staff Users State ───
  const [staffUsers, setStaffUsers] = useState([
    { id: 'usr_1', username: 'trident_cashier1', full_name: 'Ramesh Kumar', role: 'cashier', branch_code: 'TRD-BLR-01', phone: '9880011223', is_active: true },
    { id: 'usr_2', username: 'trident_mgr1', full_name: 'Anand Varma', role: 'branch_manager', branch_code: 'TRD-BLR-01', phone: '9880044556', is_active: true },
    { id: 'usr_3', username: 'trident_accounts', full_name: 'Suresh Hegde', role: 'accounts_head', branch_code: 'TRD-BLR-02', phone: '9880077889', is_active: true },
    { id: 'usr_4', username: 'trident_director', full_name: 'Director Trident Auto', role: 'director', branch_code: 'ALL', phone: '9880099001', is_active: true },
  ]);

  // ─── Customer Portal Settings ───
  const [portal, setPortal] = useState({
    hero_title: 'Trident Privilege Club Portal',
    hero_subtitle: 'Exclusive member rewards, complimentary vehicle inspections, and service point redemptions.',
    banner_image: '/offers/portal-banner.jpg',
    show_points_calculator: true,
    show_whatsapp_pass: true,
    show_monthly_offers: true,
    show_referral_claim: true,
    login_method: 'phone_otp',
  });

  // ─── Points & Loyalty Rules ───
  const [logic, setLogic] = useState({
    sales_net_ex_pct: 1.0,
    service_points_pct: 2.5,
    bodyshop_points_pct: 1.5,
    accessories_points_pct: 3.0,
    points_to_inr_ratio: 0.25,
    lock_in_months: 12,
    expiry_policy: 'FIFO_12_MONTHS',
    max_redemption_pct: 50,
    min_points_to_redeem: 500,
    bill_correction_enabled: true,
    bill_correction_window_hours: 24,
    manager_approval_threshold: 5000,
    welcome_bonus_points: 250,
    birthday_multiplier: 2.0,
  });

  // ─── Integrations & Database Settings ───
  const [integrations, setIntegrations] = useState({
    db_type: 'postgres',
    db_host: 'aws-0-ap-south-1.pooler.supabase.com',
    db_port: '5432',
    db_name: 'loyalty_trident_db',
    db_user: 'postgres.trident',
    db_status: 'connected',
    appsheet_enabled: true,
    appsheet_id: 'trident-crm-sync',
    appsheet_key: 'sec_appsheet_live_****',
    realbooks_enabled: true,
    realbooks_endpoint: 'https://api.realbooks.in/v1/invoices',
    whatsapp_enabled: true,
    whatsapp_provider: 'interakt',
    whatsapp_sender: '+91 80 4455 6677',
  });

  // ─── Tabs Configuration ───
  const [tabs, setTabs] = useState([
    { id: 'dashboard', label: 'Customer Search & 360', icon: 'LayoutDashboard', group: 'Counter POS', visible: true, role_access: 'all' },
    { id: 'corrections_queue', label: 'Bill Correction Queue', icon: 'FileText', group: 'Managerial Approvals', visible: true, role_access: 'manager' },
    { id: 'customer_redemptions', label: 'Customer Redemptions', icon: 'Sparkles', group: 'Loyalty Rewards', visible: true, role_access: 'cashier' },
    { id: 'referrals', label: 'Referral Rewards', icon: 'Users', group: 'Rewards & Referrals', visible: true, role_access: 'cashier' },
    { id: 'gift_cards', label: 'Gift Card Rewards', icon: 'Gift', group: 'Rewards & Referrals', visible: true, role_access: 'cashier' },
    { id: 'director_command_center', label: 'Director Command Center', icon: 'Crown', group: 'Executive Suite', visible: true, role_access: 'director' },
    { id: 'reports', label: 'Reports & Analytics', icon: 'Calculator', group: 'Analytics', visible: true, role_access: 'manager' },
  ]);

  // ─── Customer Search State inside Canvas ───
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(TEST_CUSTOMERS[0]);
  const [customerNotFound, setCustomerNotFound] = useState(false);

  // ─── Interactive Transaction Simulator Modals ───
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [testSpendType, setTestSpendType] = useState('service');
  const [testSpendAmount, setTestSpendAmount] = useState(12500);

  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('Cashier entered wrong invoice item');
  const [correctionBills, setCorrectionBills] = useState([
    { id: 'corr_1', invoice: 'INV-2026-9041', customer: 'Rahul Sharma', mistake: '₹18,500', correct: '₹12,500', cashier: 'cashier1', status: 'pending', branch: 'TRD-BLR-01' },
    { id: 'corr_2', invoice: 'INV-2026-9102', customer: 'Priya Patel', mistake: '₹14,500', correct: '₹11,000', cashier: 'cashier2', status: 'pending', branch: 'TRD-BLR-02' }
  ]);

  const [redemptionModalOpen, setRedemptionModalOpen] = useState(false);
  const [redeemPointsInput, setRedeemPointsInput] = useState(1000);

  // ─── Status & Persistence ───
  const [isSaving, setIsSaving] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Saved');
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── Load from DB on mount / tenant switch ───
  const loadConfig = useCallback(async (tenantId) => {
    try {
      const res = await ApiService.getAppBuilderConfig(tenantId);
      if (res && res.data) {
        const d = res.data;
        if (d.theme_config && Object.keys(d.theme_config).length > 0) setTheme((prev) => ({ ...prev, ...d.theme_config }));
        if (d.buttons_config && d.buttons_config.length > 0) {
          // If stored as array, map to btnConfig
          const addBtn = d.buttons_config.find((b) => b.id === 'btn_add_receipt');
          const corrBtn = d.buttons_config.find((b) => b.id === 'btn_bill_correction');
          const redBtn = d.buttons_config.find((b) => b.id === 'btn_redeem');
          const waBtn = d.buttons_config.find((b) => b.id === 'btn_whatsapp_pass');
          if (addBtn) setBtnConfig((prev) => ({ ...prev, add_receipt_label: addBtn.label, add_receipt_color: addBtn.color || 'emerald' }));
          if (corrBtn) setBtnConfig((prev) => ({ ...prev, bill_correction_label: corrBtn.label, bill_correction_color: corrBtn.color || 'amber' }));
          if (redBtn) setBtnConfig((prev) => ({ ...prev, redeem_label: redBtn.label, redeem_color: redBtn.color || 'indigo' }));
          if (waBtn) setBtnConfig((prev) => ({ ...prev, whatsapp_label: waBtn.label, whatsapp_color: waBtn.color || 'emerald' }));
        }
        if (Array.isArray(d.branches_config) && d.branches_config.length > 0) setBranches(d.branches_config);
        if (Array.isArray(d.users_config) && d.users_config.length > 0) setStaffUsers(d.users_config);
        if (d.portal_config && Object.keys(d.portal_config).length > 0) setPortal((prev) => ({ ...prev, ...d.portal_config }));
        if (d.logic_config && Object.keys(d.logic_config).length > 0) setLogic((prev) => ({ ...prev, ...d.logic_config }));
        if (d.integrations_config && Object.keys(d.integrations_config).length > 0) setIntegrations((prev) => ({ ...prev, ...d.integrations_config }));
        if (Array.isArray(d.tabs_config) && d.tabs_config.length > 0) setTabs(d.tabs_config);
        setIsPublished(Boolean(d.is_published));
        setStatusMessage('Saved');
      }
    } catch (err) {
      console.warn('Config load note:', err.message);
    }
  }, []);

  useEffect(() => {
    loadConfig(selectedTenant);
  }, [selectedTenant, loadConfig]);

  // ─── Save Draft or Publish Live ───
  const handleSave = async (publish = false) => {
    setIsSaving(true);
    setStatusMessage('Saving...');
    try {
      const buttonsArray = [
        { id: 'btn_add_receipt', label: btnConfig.add_receipt_label, color: btnConfig.add_receipt_color, placement: 'customer_card', enabled: true },
        { id: 'btn_bill_correction', label: btnConfig.bill_correction_label, color: btnConfig.bill_correction_color, placement: 'customer_card', enabled: true },
        { id: 'btn_redeem', label: btnConfig.redeem_label, color: btnConfig.redeem_color, placement: 'customer_card', enabled: true },
        { id: 'btn_whatsapp_pass', label: btnConfig.whatsapp_label, color: btnConfig.whatsapp_color, placement: 'customer_card', enabled: true },
      ];

      const payload = {
        tenant_id: selectedTenant,
        theme_config: theme,
        buttons_config: buttonsArray,
        branches_config: branches,
        users_config: staffUsers,
        portal_config: portal,
        logic_config: logic,
        integrations_config: integrations,
        tabs_config: tabs,
        is_published: publish ? true : isPublished,
      };

      await ApiService.saveAppBuilderConfig(selectedTenant, payload);
      setIsPublished(publish ? true : isPublished);
      setStatusMessage(publish ? 'Published' : 'Draft Saved');

      if (publish) {
        showToast(`🚀 Published live for ${theme.dealership_name}!`);
      } else {
        showToast('💾 Draft saved successfully.');
      }
    } catch (err) {
      setStatusMessage('Error');
      showToast(`Save failed: ${err.message}`, true);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Logo File Upload ───
  const handleLogoFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setTheme({ ...theme, logo_url: event.target.result });
      showToast('Custom logo uploaded & applied to app.');
    };
    reader.readAsDataURL(file);
  };

  // ─── Customer Search Execution ───
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      showToast('Enter name, phone, or VIN to search.', true);
      return;
    }
    setIsSearching(true);
    setTimeout(() => {
      const q = searchQuery.toLowerCase().trim();
      const match = TEST_CUSTOMERS.find(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.chassis.toLowerCase().includes(q) ||
          c.vin.toLowerCase().includes(q)
      );
      if (match) {
        setSelectedCustomer(match);
        setCustomerNotFound(false);
        showToast(`Found profile: ${match.name}`);
      } else {
        setCustomerNotFound(true);
        showToast(`No customer matching "${searchQuery}". Click test buttons below.`, true);
      }
      setIsSearching(false);
    }, 250);
  };

  // ─── Points Calculation for Simulator ───
  const calculatedPoints = useMemo(() => {
    const num = Number(testSpendAmount) || 0;
    let pct = logic.service_points_pct;
    if (testSpendType === 'sale') pct = logic.sales_net_ex_pct;
    else if (testSpendType === 'bodyshop') pct = logic.bodyshop_points_pct;
    else if (testSpendType === 'accessories') pct = logic.accessories_points_pct;
    return Math.round((num * pct) / 100);
  }, [testSpendType, testSpendAmount, logic]);

  const calculatedRupeeDiscount = useMemo(() => {
    return (redeemPointsInput * (logic.points_to_inr_ratio || 0.25)).toFixed(2);
  }, [redeemPointsInput, logic]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f0f0f1] text-[#2c3338] overflow-hidden font-sans select-none">
      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. WORDPRESS TOP ADMIN BAR (#1d2327)                       */}
      {/* ────────────────────────────────────────────────────────── */}
      <header className="h-[46px] sm:h-[50px] bg-[#1d2327] text-[#c3c4c7] px-3 sm:px-4 flex items-center justify-between z-40 shrink-0 border-b border-[#2c3338]">
        {/* Left: WordPress Icon & Site Title */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#1d2327] font-black text-sm tracking-tighter shadow-xs cursor-pointer hover:bg-slate-100"
            title="WordPress Loyalty Software Engine"
          >
            W
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-xs text-white tracking-wide truncate max-w-[150px] sm:max-w-[220px]">
              {theme.dealership_name}
            </span>
            <span className="text-[11px] text-[#8c8f94] hidden md:inline">› Loyalty Site Editor</span>
          </div>

          {/* Dealership Switcher */}
          <div className="relative ml-1">
            <select
              value={selectedTenant}
              onChange={(e) => {
                const newTenant = e.target.value;
                setSelectedTenant(newTenant);
                const found = DEALERSHIPS_CATALOG.find((d) => d.id === newTenant);
                if (found) {
                  setTheme((prev) => ({
                    ...prev,
                    dealership_name: found.name,
                    logo_url: found.logo,
                    primary_color: found.primary,
                    secondary_color: found.secondary,
                  }));
                }
              }}
              className="bg-[#2c3338] text-white border border-[#3c434a] text-[11px] font-medium rounded px-2 py-0.5 pr-5 appearance-none focus:outline-none focus:border-[#2271b1] cursor-pointer"
            >
              {DEALERSHIPS_CATALOG.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-[#8c8f94] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Center: Device Viewports & Staff Role View Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Responsive Viewport Toggle */}
          <div className="flex items-center bg-[#2c3338] p-0.5 rounded border border-[#3c434a]">
            <button
              onClick={() => setViewport('desktop')}
              title="Desktop View (1200px)"
              className={`p-1 rounded transition ${viewport === 'desktop' ? 'bg-[#2271b1] text-white' : 'text-[#8c8f94] hover:text-white'}`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('tablet')}
              title="Tablet View (768px)"
              className={`p-1 rounded transition ${viewport === 'tablet' ? 'bg-[#2271b1] text-white' : 'text-[#8c8f94] hover:text-white'}`}
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              title="Mobile View (375px)"
              className={`p-1 rounded transition ${viewport === 'mobile' ? 'bg-[#2271b1] text-white' : 'text-[#8c8f94] hover:text-white'}`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3 Dedicated Role Views Switcher */}
          <div className="flex items-center bg-[#2c3338] p-0.5 rounded border border-[#3c434a] text-[11px] font-semibold">
            <button
              onClick={() => setRoleView('cashier')}
              className={`px-2 py-0.5 rounded transition ${roleView === 'cashier' ? 'bg-[#2271b1] text-white' : 'text-[#c3c4c7] hover:text-white'}`}
            >
              Cashier View
            </button>
            <button
              onClick={() => setRoleView('manager')}
              className={`px-2 py-0.5 rounded transition ${roleView === 'manager' ? 'bg-[#2271b1] text-white' : 'text-[#c3c4c7] hover:text-white'}`}
            >
              Manager View
            </button>
            <button
              onClick={() => setRoleView('admin')}
              className={`px-2 py-0.5 rounded transition ${roleView === 'admin' ? 'bg-[#2271b1] text-white' : 'text-[#c3c4c7] hover:text-white'}`}
            >
              Admin View
            </button>
            <button
              onClick={() => setRoleView('portal')}
              className={`px-2 py-0.5 rounded transition ${roleView === 'portal' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:text-white'}`}
            >
              Customer Portal
            </button>
          </div>
        </div>

        {/* Right: Save Draft & Publish */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="text-xs text-[#c3c4c7] hover:text-white font-medium px-2 py-1 transition hidden sm:inline"
          >
            Save draft
          </button>

          {/* Iconic WordPress Blue Publish Button */}
          <button
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="bg-[#2271b1] hover:bg-[#135e96] text-white text-xs font-semibold px-3 py-1 rounded transition flex items-center gap-1.5 shadow-xs"
          >
            {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>Publish</span>
          </button>

          <button
            onClick={onExitToCounterApp}
            title="Exit to POS"
            className="p-1 text-[#8c8f94] hover:text-white hover:bg-[#2c3338] rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded shadow-xl text-xs font-semibold ${
            toast.isError ? 'bg-[#d63638] text-white' : 'bg-[#008a20] text-white'
          }`}
        >
          {toast.isError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. MAIN WORDPRESS WORKSPACE                                */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ─── CLASSIC WORDPRESS ADMIN NAVIGATION SIDEBAR (#1d2327) ─── */}
        <nav
          className={`bg-[#1d2327] text-[#c3c4c7] flex flex-col shrink-0 border-r border-[#2c3338] z-30 transition-all ${
            sidebarCollapsed ? 'w-14' : 'w-52 sm:w-56'
          }`}
        >
          <div className="p-2 space-y-0.5 overflow-y-auto flex-1 text-xs">
            {[
              { id: 'appearance', label: 'Site Identity & Logo', icon: Palette },
              { id: 'buttons', label: 'Cashier Buttons Studio', icon: Sparkles },
              { id: 'branches', label: 'Branch Network', icon: Building2 },
              { id: 'users', label: 'User Control & Staff', icon: Users },
              { id: 'portal', label: 'Customer Portal', icon: Globe },
              { id: 'logic', label: 'Points & Logic Rules', icon: SlidersVertical },
              { id: 'integrations', label: 'Database & API Studio', icon: Database },
              { id: 'tabs', label: 'Tabs & Navigation', icon: Layers },
              { id: 'tiers', label: 'Customer Tiers', icon: Crown },
            ].map((menu) => {
              const Icon = menu.icon;
              const isActive = activeMenu === menu.id;
              return (
                <button
                  key={menu.id}
                  onClick={() => setActiveMenu(menu.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-left transition font-medium ${
                    isActive
                      ? 'bg-[#2271b1] text-white font-semibold'
                      : 'hover:bg-[#2c3338] hover:text-[#72aee6]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{menu.label}</span>}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2.5 border-t border-[#2c3338] text-[#8c8f94] hover:text-white flex items-center justify-center text-xs"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 -rotate-90" />}
          </button>
        </nav>

        {/* ─── WORDPRESS SETTINGS INSPECTOR DRAWER (#ffffff) ─── */}
        <aside className="w-80 sm:w-96 bg-white border-r border-[#dcdcde] flex flex-col shrink-0 z-20 overflow-hidden shadow-xs">
          <div className="p-3 border-b border-[#dcdcde] bg-[#f6f7f7] flex items-center justify-between shrink-0">
            <span className="font-bold text-xs text-[#1d2327] uppercase tracking-wide">
              {activeMenu === 'appearance' && 'Appearance & Logo Customizer'}
              {activeMenu === 'buttons' && 'Cashier Action Buttons Studio'}
              {activeMenu === 'branches' && 'Branch-wise Rules & Budgets'}
              {activeMenu === 'users' && 'Staff User Directory & Roles'}
              {activeMenu === 'portal' && 'Customer Self-Service Portal'}
              {activeMenu === 'logic' && 'Loyalty Business Logic Rules'}
              {activeMenu === 'integrations' && 'Database & API Connectors'}
              {activeMenu === 'tabs' && 'Tabs & Navigation Studio'}
              {activeMenu === 'tiers' && 'Customer Priority Tiers'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-[#50575e]">
            {/* ══════════════════════════════════════════════════════ */}
            {/* 1. APPEARANCE & LOGO SELECTOR                          */}
            {/* ══════════════════════════════════════════════════════ */}
            {activeMenu === 'appearance' && (
              <div className="space-y-4">
                <div className="space-y-2 border border-[#dcdcde] p-3 rounded bg-[#f6f7f7]">
                  <label className="font-bold text-[#1d2327] block text-[11px] uppercase tracking-wider">
                    Dealership Logo
                  </label>

                  <div className="w-full h-20 bg-white border border-[#dcdcde] rounded flex items-center justify-center p-2 overflow-hidden">
                    <img
                      src={theme.logo_url || '/trident-logo.svg'}
                      alt="Selected Logo"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => (e.target.src = '/trident-logo.svg')}
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-1.5 px-2 bg-[#2271b1] hover:bg-[#135e96] text-white text-xs font-semibold rounded transition flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Logo File</span>
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoFileUpload} className="hidden" />
                  </div>

                  <div className="pt-2">
                    <span className="text-[10px] text-[#8c8f94] block font-semibold mb-1">Or choose from Gallery:</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {LOGO_LIBRARY.map((lg) => (
                        <button
                          key={lg.id}
                          type="button"
                          onClick={() => setTheme({ ...theme, logo_url: lg.url })}
                          className={`p-1 border rounded text-[10px] truncate bg-white hover:border-[#2271b1] ${
                            theme.logo_url === lg.url ? 'border-[#2271b1] ring-1 ring-[#2271b1]' : 'border-[#dcdcde]'
                          }`}
                        >
                          {lg.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#1d2327] block mb-1">Dealership Name</label>
                  <input
                    type="text"
                    value={theme.dealership_name}
                    onChange={(e) => setTheme({ ...theme, dealership_name: e.target.value })}
                    className="w-full border border-[#8c8f94] rounded p-2 text-xs text-[#1d2327] focus:border-[#2271b1] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1d2327] block mb-1">Tagline</label>
                  <input
                    type="text"
                    value={theme.tagline}
                    onChange={(e) => setTheme({ ...theme, tagline: e.target.value })}
                    className="w-full border border-[#8c8f94] rounded p-2 text-xs text-[#1d2327] focus:border-[#2271b1] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1d2327] block mb-1.5">1-Click Theme Palettes</label>
                  <div className="grid grid-cols-2 gap-2">
                    {THEME_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          setTheme({
                            ...theme,
                            primary_color: p.primary,
                            secondary_color: p.secondary,
                            accent_color: p.accent,
                            surface_mode: p.surface,
                          })
                        }
                        className={`p-2 border rounded text-left transition flex items-center gap-2 ${
                          theme.primary_color === p.primary ? 'border-[#2271b1] bg-blue-50/50' : 'border-[#dcdcde] bg-white'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: p.primary }} />
                        <span className="text-[11px] font-semibold text-[#1d2327] truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* 2. CASHIER ACTION BUTTONS STUDIO (TEXT & COLOR CHANGE) */}
            {/* ══════════════════════════════════════════════════════ */}
            {activeMenu === 'buttons' && (
              <div className="space-y-4">
                <span className="font-bold text-xs text-[#1d2327] block">
                  Customize Cashier Buttons (Text & Colors)
                </span>
                <p className="text-[11px] text-[#8c8f94]">
                  Edit button labels and color schemes. Changes update the cashier screen preview instantly.
                </p>

                {/* Button 1: Add Receipt */}
                <div className="p-3 border border-[#dcdcde] rounded bg-[#f6f7f7] space-y-2">
                  <span className="font-bold text-xs text-[#1d2327] block">1. Add Receipt Button</span>
                  <div>
                    <label className="text-[10px] text-[#8c8f94] block font-semibold mb-0.5">Button Label Text</label>
                    <input
                      type="text"
                      value={btnConfig.add_receipt_label}
                      onChange={(e) => setBtnConfig({ ...btnConfig, add_receipt_label: e.target.value })}
                      className="w-full border rounded p-1.5 text-xs bg-white text-[#1d2327]"
                      placeholder="Add Receipt"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8c8f94] block font-semibold mb-0.5">Color Accent</label>
                    <select
                      value={btnConfig.add_receipt_color}
                      onChange={(e) => setBtnConfig({ ...btnConfig, add_receipt_color: e.target.value })}
                      className="w-full border rounded p-1.5 text-xs bg-white"
                    >
                      <option value="emerald">Emerald Green (Recommended)</option>
                      <option value="primary">Brand Primary Color</option>
                      <option value="indigo">Indigo Violet</option>
                      <option value="slate">Dark Slate</option>
                    </select>
                  </div>
                </div>

                {/* Button 2: Bill Correction */}
                <div className="p-3 border border-[#dcdcde] rounded bg-[#f6f7f7] space-y-2">
                  <span className="font-bold text-xs text-[#1d2327] block">2. Bill Correction Button</span>
                  <div>
                    <label className="text-[10px] text-[#8c8f94] block font-semibold mb-0.5">Button Label Text</label>
                    <input
                      type="text"
                      value={btnConfig.bill_correction_label}
                      onChange={(e) => setBtnConfig({ ...btnConfig, bill_correction_label: e.target.value })}
                      className="w-full border rounded p-1.5 text-xs bg-white text-[#1d2327]"
                      placeholder="Bill Correction"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8c8f94] block font-semibold mb-0.5">Color Accent</label>
                    <select
                      value={btnConfig.bill_correction_color}
                      onChange={(e) => setBtnConfig({ ...btnConfig, bill_correction_color: e.target.value })}
                      className="w-full border rounded p-1.5 text-xs bg-white"
                    >
                      <option value="amber">Amber Warning (Recommended)</option>
                      <option value="rose">Rose Red</option>
                      <option value="slate">Dark Slate</option>
                    </select>
                  </div>
                </div>

                {/* Button 3: Redeem Points */}
                <div className="p-3 border border-[#dcdcde] rounded bg-[#f6f7f7] space-y-2">
                  <span className="font-bold text-xs text-[#1d2327] block">3. Redeem Discount Button</span>
                  <div>
                    <label className="text-[10px] text-[#8c8f94] block font-semibold mb-0.5">Button Label Text</label>
                    <input
                      type="text"
                      value={btnConfig.redeem_label}
                      onChange={(e) => setBtnConfig({ ...btnConfig, redeem_label: e.target.value })}
                      className="w-full border rounded p-1.5 text-xs bg-white text-[#1d2327]"
                      placeholder="Redeem Discount"
                    />
                  </div>
                </div>

                {/* Button 4: WhatsApp Pass */}
                <div className="p-3 border border-[#dcdcde] rounded bg-[#f6f7f7] space-y-2">
                  <span className="font-bold text-xs text-[#1d2327] block">4. Send WhatsApp Pass Button</span>
                  <input
                    type="text"
                    value={btnConfig.whatsapp_label}
                    onChange={(e) => setBtnConfig({ ...btnConfig, whatsapp_label: e.target.value })}
                    className="w-full border rounded p-1.5 text-xs bg-white text-[#1d2327]"
                    placeholder="Send WhatsApp Pass"
                  />
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* 3. DATABASE & API INTEGRATIONS STUDIO                  */}
            {/* ══════════════════════════════════════════════════════ */}
            {activeMenu === 'integrations' && (
              <div className="space-y-4">
                <span className="font-bold text-xs text-[#1d2327] block">
                  Database & External API Connectors
                </span>

                {/* Database Connection */}
                <div className="p-3 border border-[#dcdcde] rounded bg-[#f6f7f7] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#1d2327]">PostgreSQL / Supabase Database</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                      Connected
                    </span>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8c8f94] block font-semibold">Host Endpoint</label>
                    <input
                      type="text"
                      value={integrations.db_host}
                      onChange={(e) => setIntegrations({ ...integrations, db_host: e.target.value })}
                      className="w-full border rounded p-1.5 text-xs bg-white font-mono text-[11px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[#8c8f94] block font-semibold">Database</label>
                      <input
                        type="text"
                        value={integrations.db_name}
                        onChange={(e) => setIntegrations({ ...integrations, db_name: e.target.value })}
                        className="w-full border rounded p-1.5 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8c8f94] block font-semibold">Port</label>
                      <input
                        type="text"
                        value={integrations.db_port}
                        onChange={(e) => setIntegrations({ ...integrations, db_port: e.target.value })}
                        className="w-full border rounded p-1.5 text-xs bg-white"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => showToast('✅ Database connection test: SUCCESS')}
                    className="w-full py-1.5 bg-[#2271b1] text-white font-semibold text-xs rounded"
                  >
                    Test DB Connection
                  </button>
                </div>

                {/* AppSheet Cloud Sync */}
                <div className="p-3 border border-[#dcdcde] rounded bg-[#f6f7f7] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#1d2327]">Google Sheets / AppSheet API</span>
                    <input
                      type="checkbox"
                      checked={integrations.appsheet_enabled}
                      onChange={(e) => setIntegrations({ ...integrations, appsheet_enabled: e.target.checked })}
                      className="accent-[#2271b1]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8c8f94] block font-semibold">AppSheet App ID</label>
                    <input
                      type="text"
                      value={integrations.appsheet_id}
                      onChange={(e) => setIntegrations({ ...integrations, appsheet_id: e.target.value })}
                      className="w-full border rounded p-1.5 text-xs bg-white"
                    />
                  </div>
                </div>

                {/* WhatsApp Business API */}
                <div className="p-3 border border-[#dcdcde] rounded bg-[#f6f7f7] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#1d2327]">WhatsApp Business API (Digital Passes)</span>
                    <input
                      type="checkbox"
                      checked={integrations.whatsapp_enabled}
                      onChange={(e) => setIntegrations({ ...integrations, whatsapp_enabled: e.target.checked })}
                      className="accent-[#2271b1]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8c8f94] block font-semibold">Sender Phone Number</label>
                    <input
                      type="text"
                      value={integrations.whatsapp_sender}
                      onChange={(e) => setIntegrations({ ...integrations, whatsapp_sender: e.target.value })}
                      className="w-full border rounded p-1.5 text-xs bg-white"
                    />
                  </div>
                </div>

                {/* Data Import / CSV */}
                <div className="p-3 border border-[#dcdcde] rounded bg-[#f6f7f7] space-y-2">
                  <span className="font-bold text-xs text-[#1d2327] block">CSV / Excel Bulk Import</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => showToast('Customer Import Template CSV downloaded.')}
                      className="flex-1 py-1.5 border border-[#8c8f94] bg-white text-[#1d2327] text-xs font-semibold rounded flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Template</span>
                    </button>
                    <button
                      onClick={() => showToast('Opening CSV Import dialogue...')}
                      className="flex-1 py-1.5 bg-[#2271b1] text-white text-xs font-semibold rounded flex items-center justify-center gap-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Import CSV</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* 4. BRANCH NETWORK & BRANCH-WISE RULES                  */}
            {/* ══════════════════════════════════════════════════════ */}
            {activeMenu === 'branches' && (
              <div className="space-y-3">
                <span className="font-bold text-xs text-[#1d2327] block">Branch Network Settings</span>
                {branches.map((b) => (
                  <div key={b.id} className="p-3 border rounded bg-[#f6f7f7] space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-[#1d2327]">{b.name}</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                        {b.multiplier}x Multiplier
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-[#8c8f94]">
                      <span>Code: {b.code}</span>
                      <span>Budget: ₹{b.redemption_budget?.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* 5. USER CONTROL                                        */}
            {/* ══════════════════════════════════════════════════════ */}
            {activeMenu === 'users' && (
              <div className="space-y-3">
                <span className="font-bold text-xs text-[#1d2327] block">Staff Directory & Permissions</span>
                {staffUsers.map((u) => (
                  <div key={u.id} className="p-2.5 border rounded bg-[#f6f7f7] flex justify-between items-center">
                    <div>
                      <span className="font-bold text-xs block text-[#1d2327]">{u.full_name}</span>
                      <span className="text-[10px] text-[#8c8f94]">{u.username} · {u.branch_code}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold bg-slate-200">
                      {u.role.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* 6. CUSTOMER PORTAL                                     */}
            {/* ══════════════════════════════════════════════════════ */}
            {activeMenu === 'portal' && (
              <div className="space-y-3">
                <div>
                  <label className="font-bold text-[#1d2327] block mb-1">Portal Headline</label>
                  <input
                    type="text"
                    value={portal.hero_title}
                    onChange={(e) => setPortal({ ...portal, hero_title: e.target.value })}
                    className="w-full border rounded p-1.5 text-xs text-[#1d2327]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1d2327] block mb-1">Portal Subtitle</label>
                  <textarea
                    rows={2}
                    value={portal.hero_subtitle}
                    onChange={(e) => setPortal({ ...portal, hero_subtitle: e.target.value })}
                    className="w-full border rounded p-1.5 text-xs text-[#1d2327]"
                  />
                </div>
                <button
                  onClick={() => window.open('/portal', '_blank')}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Live Portal in New Tab</span>
                </button>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* 7. LOYALTY RULES                                       */}
            {/* ══════════════════════════════════════════════════════ */}
            {activeMenu === 'logic' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-[#1d2327]">
                    <span>Vehicle Sales (Net Ex-Showroom)</span>
                    <span className="text-blue-600 font-bold">{logic.sales_net_ex_pct}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={logic.sales_net_ex_pct}
                    onChange={(e) => setLogic({ ...logic, sales_net_ex_pct: parseFloat(e.target.value) })}
                    className="w-full accent-[#2271b1]"
                  />
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs font-semibold text-[#1d2327]">
                    <span>Service Invoices</span>
                    <span className="text-emerald-600 font-bold">{logic.service_points_pct}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="5.0"
                    step="0.5"
                    value={logic.service_points_pct}
                    onChange={(e) => setLogic({ ...logic, service_points_pct: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div>
                    <label className="text-[10px] font-bold block mb-1">Conversion (₹/pt)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={logic.points_to_inr_ratio}
                      onChange={(e) => setLogic({ ...logic, points_to_inr_ratio: parseFloat(e.target.value) || 0.25 })}
                      className="w-full border rounded p-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold block mb-1">Lock-in Period</label>
                    <input
                      type="number"
                      value={logic.lock_in_months}
                      onChange={(e) => setLogic({ ...logic, lock_in_months: parseInt(e.target.value) || 0 })}
                      className="w-full border rounded p-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ─── WORDPRESS LIVE STAGE (WYSIWYG CANVAS) ─── */}
        <main className="flex-1 bg-[#f0f0f1] flex flex-col items-center justify-center p-3 sm:p-5 overflow-y-auto relative">
          <div
            className={`transition-all duration-300 ease-out flex flex-col shadow-xl bg-white border border-[#dcdcde] overflow-hidden ${
              viewport === 'mobile'
                ? 'w-[375px] h-[780px] rounded-[36px] border-[8px] border-[#1d2327]'
                : viewport === 'tablet'
                ? 'w-[768px] h-[820px] rounded-2xl'
                : 'w-full max-w-[1220px] h-[840px] rounded-lg'
            }`}
          >
            {/* Live Dealership Header */}
            <header
              className="px-4 py-3 text-white flex items-center justify-between shrink-0 shadow-xs"
              style={{ backgroundColor: theme.primary_color }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-10 bg-white rounded p-1 flex items-center justify-center shrink-0">
                  <img
                    src={theme.logo_url || '/trident-logo.svg'}
                    alt="Logo"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => (e.target.src = '/trident-logo.svg')}
                  />
                </div>
                <div>
                  <h1 className="font-black text-sm tracking-tight truncate leading-tight">
                    {theme.dealership_name}
                  </h1>
                  <span className="text-[10px] opacity-90 truncate block">{theme.tagline}</span>
                </div>
              </div>

              {/* Header Role Indicator Badge */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs">
                  {roleView === 'cashier' && 'Staff: Cashier POS'}
                  {roleView === 'manager' && 'Staff: Branch Manager'}
                  {roleView === 'admin' && 'Staff: Director Admin'}
                  {roleView === 'portal' && 'Customer View'}
                </span>
              </div>
            </header>

            {/* ════════════════════════════════════════════════════════ */}
            {/* VIEW A: CASHIER VIEW (Exact Bellad Loyalty App Design)  */}
            {/* ════════════════════════════════════════════════════════ */}
            {roleView === 'cashier' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50 text-slate-800">
                {/* 1. REAL BELLAD LOYALTY SEARCH CARD */}
                <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                        Customer Lookup &amp; Identification
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Search via 12-digit Aadhaar Card, Customer Full Name, Mobile Phone, or Vehicle VIN
                      </p>
                    </div>
                  </div>

                  {/* Search Input Bar with Real Search Button */}
                  <form onSubmit={handleSearchSubmit} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search Aadhaar, Name, Mobile or VIN (e.g. Rahul, 98888, KA-25)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 sm:h-11 pl-9 pr-3 bg-slate-50 border border-slate-200 focus:border-[#2271b1] focus:bg-white text-xs sm:text-sm font-semibold text-slate-900 rounded-xl focus:outline-none transition shadow-2xs"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSearching}
                      className="h-10 sm:h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Search className="w-4 h-4" />
                      <span>{isSearching ? 'Searching...' : 'Search'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => showToast('Open + New Customer Registration')}
                      className="h-10 sm:h-11 px-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">+ Customer</span>
                    </button>
                  </form>

                  {/* Quick Test Customer Selection Pills (5 Users as requested) */}
                  <div className="pt-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                      Quick Test Customers (Click to inspect):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {TEST_CUSTOMERS.map((cust) => {
                        const isSelected = selectedCustomer?.id === cust.id;
                        return (
                          <button
                            key={cust.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setCustomerNotFound(false);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold shadow-2xs ring-1 ring-indigo-400'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span>{cust.name}</span>
                            <span className="text-[10px] text-slate-400 ml-1.5">({cust.phone})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. CUSTOMER 360 PROFILE VIEW */}
                {selectedCustomer && (
                  <div className="space-y-4">
                    {/* Customer 360 Card with Configured Colors & Buttons */}
                    <div
                      className={`p-5 text-white shadow-lg transition-all ${theme.card_radius}`}
                      style={{
                        background: `linear-gradient(135deg, ${theme.primary_color} 0%, ${theme.secondary_color} 100%)`,
                      }}
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-white/20 gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-lg sm:text-xl tracking-tight">{selectedCustomer.name}</h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-900 shadow-xs">
                              {selectedCustomer.tier}
                            </span>
                          </div>
                          <span className="text-xs opacity-90 block mt-0.5">
                            {selectedCustomer.vehicle_model} · Reg: {selectedCustomer.chassis} · Phone: {selectedCustomer.phone}
                          </span>
                        </div>

                        <div className="sm:text-right">
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">
                            Total Points Balance
                          </span>
                          <span className="text-2xl sm:text-3xl font-black">{selectedCustomer.points_balance?.toLocaleString()} PTS</span>
                        </div>
                      </div>

                      {/* Slabs Details */}
                      <div className="grid grid-cols-3 gap-2 pt-3 text-[11px]">
                        <div>
                          <span className="opacity-80 block text-[10px]">Available to Redeem</span>
                          <span className="font-extrabold text-sm">{selectedCustomer.available_points?.toLocaleString()} PTS</span>
                          <span className="text-[10px] opacity-75 block">
                            = ₹{(selectedCustomer.available_points * (logic.points_to_inr_ratio || 0.25)).toFixed(0)} Cash
                          </span>
                        </div>

                        <div>
                          <span className="opacity-80 block text-[10px]">Locked Points</span>
                          <span className="font-extrabold text-sm">{selectedCustomer.locked_points?.toLocaleString()} PTS</span>
                          <span className="text-[10px] opacity-75 block">{logic.lock_in_months}m lock-in</span>
                        </div>

                        <div>
                          <span className="opacity-80 block text-[10px]">Lifetime Spend</span>
                          <span className="font-extrabold text-sm">₹{(selectedCustomer.lifetime_spend / 100000).toFixed(1)} L</span>
                          <span className="text-[10px] opacity-75 block">Verified KYC</span>
                        </div>
                      </div>

                      {/* Cashier Action Buttons (Configured in Buttons Studio!) */}
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-white/20 mt-3">
                        <button
                          onClick={() => setReceiptModalOpen(true)}
                          className={`px-3.5 py-1.5 font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5 ${
                            btnConfig.add_receipt_color === 'emerald'
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-white text-slate-900'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{btnConfig.add_receipt_label}</span>
                        </button>

                        <button
                          onClick={() => setCorrectionModalOpen(true)}
                          className="px-3.5 py-1.5 font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{btnConfig.bill_correction_label}</span>
                        </button>

                        <button
                          onClick={() => setRedemptionModalOpen(true)}
                          className="px-3.5 py-1.5 font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{btnConfig.redeem_label}</span>
                        </button>

                        <button
                          onClick={() => showToast(`📲 WhatsApp pass sent to ${selectedCustomer.phone}`)}
                          className="px-3.5 py-1.5 font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>{btnConfig.whatsapp_label}</span>
                        </button>
                      </div>
                    </div>

                    {/* Customer Recent Transactions Ledger Table */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                      <span className="font-bold text-xs text-slate-900 block">Recent Points Activity Ledger</span>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase">
                              <th className="py-2">Invoice #</th>
                              <th className="py-2">Date</th>
                              <th className="py-2">Transaction Type</th>
                              <th className="py-2">Invoice Amount</th>
                              <th className="py-2 text-emerald-600">Earned</th>
                              <th className="py-2 text-indigo-600">Redeemed</th>
                              <th className="py-2 font-bold">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedCustomer.history.map((tx) => (
                              <tr key={tx.id} className="border-b border-slate-50 text-slate-700">
                                <td className="py-2.5 font-mono font-semibold">{tx.invoice}</td>
                                <td className="py-2.5 text-slate-500">{tx.date}</td>
                                <td className="py-2.5 font-medium">{tx.type}</td>
                                <td className="py-2.5 font-bold">₹{tx.spend.toLocaleString()}</td>
                                <td className="py-2.5 font-bold text-emerald-600">+{tx.points_earned}</td>
                                <td className="py-2.5 font-bold text-indigo-600">-{tx.points_redeemed}</td>
                                <td className="py-2.5 font-black">{tx.balance.toLocaleString()} PTS</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════ */}
            {/* VIEW B: MANAGER VIEW (Correction Queue & Approvals)      */}
            {/* ════════════════════════════════════════════════════════ */}
            {roleView === 'manager' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50 text-slate-800">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex justify-between items-center border-b pb-3">
                    <div>
                      <h3 className="font-black text-sm text-slate-900">Branch Manager Bill Correction Queue</h3>
                      <p className="text-xs text-slate-500">
                        Cashier submitted wrong bills requiring managerial review (Window: {logic.bill_correction_window_hours}h).
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-amber-100 text-amber-800">
                      {correctionBills.filter((b) => b.status === 'pending').length} Requests Pending
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {correctionBills.map((b) => (
                      <div key={b.id} className="p-3.5 border rounded-xl bg-slate-50 flex justify-between items-center text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{b.invoice}</span>
                            <span className="font-semibold text-slate-700">· {b.customer}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({b.branch})</span>
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            Mistaken Amount: <span className="line-through text-rose-500 font-bold">{b.mistake}</span> → Actual:{' '}
                            <span className="text-emerald-600 font-bold">{b.correct}</span> (Billed by {b.cashier})
                          </span>
                        </div>

                        {b.status === 'pending' ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                setCorrectionBills(correctionBills.map((item) => (item.id === b.id ? { ...item, status: 'approved' } : item)));
                                showToast(`Correction ${b.invoice} Approved! Points adjusted.`);
                              }}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setCorrectionBills(correctionBills.map((item) => (item.id === b.id ? { ...item, status: 'rejected' } : item)));
                                showToast(`Correction ${b.invoice} Rejected.`);
                              }}
                              className="px-3 py-1 bg-slate-200 text-slate-700 font-bold rounded"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${b.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {b.status}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Manager KYC Approvals */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="font-black text-sm text-slate-900">Pending Customer KYC Verifications</h3>
                  <div className="p-3 border rounded-xl bg-slate-50 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">Vikram Singh Fleet Logistics</span>
                      <span className="text-[10px] text-slate-500">GSTIN / Fleet RC Book uploaded · Diamond Director Tier</span>
                    </div>
                    <button onClick={() => showToast('KYC Approved')} className="px-3 py-1 bg-blue-600 text-white font-bold rounded">
                      Verify KYC
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════ */}
            {/* VIEW C: ADMIN / DIRECTOR VIEW (Command Center)           */}
            {/* ════════════════════════════════════════════════════════ */}
            {roleView === 'admin' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50 text-slate-800">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <div>
                      <h3 className="font-black text-sm text-slate-900">Director Command Executive Suite</h3>
                      <p className="text-xs text-slate-500">Real-time dealer network footfall, burn rates, and points velocity.</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-blue-100 text-blue-800">Live Network Data</span>
                  </div>

                  {/* Radial Metrics */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl">
                      <span className="text-[10px] text-blue-700 font-bold uppercase block">Burn Rate %</span>
                      <span className="text-2xl font-black text-blue-900">18.4%</span>
                      <span className="text-[10px] text-blue-600 block mt-0.5">Healthy retention corridor</span>
                    </div>

                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase block">Customer Footfall</span>
                      <span className="text-2xl font-black text-emerald-900">4,912</span>
                      <span className="text-[10px] text-emerald-600 block mt-0.5">Across 3 branches</span>
                    </div>

                    <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl">
                      <span className="text-[10px] text-purple-700 font-bold uppercase block">Invoiced Cash Inflow</span>
                      <span className="text-2xl font-black text-purple-900">₹8.4 Cr</span>
                      <span className="text-[10px] text-purple-600 block mt-0.5">YTD 2026</span>
                    </div>
                  </div>

                  {/* Branch Network Performance Table */}
                  <div className="space-y-2 pt-2">
                    <span className="font-bold text-xs text-slate-900 block">Branch Performance Breakdown</span>
                    {branches.map((b) => (
                      <div key={b.id} className="p-3 border rounded-xl bg-slate-50 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-slate-900 block">{b.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{b.code} · Multiplier: {b.multiplier}x</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-blue-600">Budget: ₹{b.redemption_budget?.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 block">Sign-off limit: ₹{b.manager_approval_limit?.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════ */}
            {/* VIEW D: CUSTOMER SELF-SERVICE PORTAL VIEW               */}
            {/* ════════════════════════════════════════════════════════ */}
            {roleView === 'portal' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50 text-slate-800">
                <div
                  className="p-6 sm:p-8 rounded-2xl text-white text-center space-y-2 shadow-md"
                  style={{ backgroundColor: theme.primary_color }}
                >
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">{portal.hero_title}</h2>
                  <p className="text-xs sm:text-sm max-w-lg mx-auto opacity-90">{portal.hero_subtitle}</p>
                  <button
                    onClick={() => window.open('/portal', '_blank')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 mt-2 bg-white text-slate-900 font-bold text-xs rounded-xl shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    <span>Open Live Portal in Browser</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                    <span className="font-bold text-xs text-slate-900 block">Check Your Points Balance</span>
                    <input type="text" placeholder="Enter 10-digit mobile number" className="w-full border p-2 text-xs rounded-lg" defaultValue="98888 77777" />
                    <button onClick={() => showToast('OTP sent to 98888 77777')} className="w-full py-2 bg-blue-600 text-white font-bold text-xs rounded-lg">
                      Request OTP
                    </button>
                  </div>

                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                    <span className="font-bold text-xs text-slate-900 block">Monthly Privileges & Offers</span>
                    <div className="p-2.5 bg-slate-50 rounded-lg border text-xs">
                      <span className="font-bold text-slate-900 block">Complimentary Ceramic Coat Top-up</span>
                      <span className="text-[10px] text-slate-500">Valid till 30-Nov · 100% Free for Gold & Diamond</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── INTERACTIVE MODALS ─── */}
            {/* 1. Add Receipt Modal */}
            {receiptModalOpen && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
                <div className="bg-white p-5 rounded-2xl max-w-sm w-full space-y-3 shadow-2xl">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-extrabold text-sm text-slate-900">{btnConfig.add_receipt_label}</span>
                    <button onClick={() => setReceiptModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Customer</label>
                      <input type="text" readOnly value={`${selectedCustomer.name} (${selectedCustomer.phone})`} className="w-full border p-1.5 rounded bg-slate-50 text-slate-700 font-semibold" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Spend Category</label>
                      <select value={testSpendType} onChange={(e) => setTestSpendType(e.target.value)} className="w-full border p-1.5 rounded">
                        <option value="sale">Vehicle Sale ({logic.sales_net_ex_pct}%)</option>
                        <option value="service">Service & Repair ({logic.service_points_pct}%)</option>
                        <option value="bodyshop">Bodyshop ({logic.bodyshop_points_pct}%)</option>
                        <option value="accessories">Accessories ({logic.accessories_points_pct}%)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Invoice Value (₹)</label>
                      <input type="number" value={testSpendAmount} onChange={(e) => setTestSpendAmount(Number(e.target.value))} className="w-full border p-1.5 rounded font-bold" />
                    </div>
                    <div className="p-2.5 bg-emerald-50 rounded border border-emerald-200 text-center">
                      <span className="text-[10px] text-emerald-800 font-bold block">Points Earned:</span>
                      <span className="text-base font-black text-emerald-950">+{calculatedPoints} PTS</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setReceiptModalOpen(false)} className="flex-1 py-1.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg">Cancel</button>
                    <button
                      onClick={() => {
                        setReceiptModalOpen(false);
                        setSelectedCustomer({
                          ...selectedCustomer,
                          points_balance: selectedCustomer.points_balance + calculatedPoints,
                          available_points: selectedCustomer.available_points + calculatedPoints,
                          history: [
                            { id: `tx_${Date.now()}`, invoice: 'INV-2026-9999', date: 'Today', type: 'Service & Spares', spend: testSpendAmount, points_earned: calculatedPoints, points_redeemed: 0, balance: selectedCustomer.points_balance + calculatedPoints },
                            ...selectedCustomer.history
                          ]
                        });
                        showToast(`Logged invoice! +${calculatedPoints} PTS credited to ${selectedCustomer.name}`);
                      }}
                      className="flex-1 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-lg"
                    >
                      Confirm Bill
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Bill Correction Modal */}
            {correctionModalOpen && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
                <div className="bg-white p-5 rounded-2xl max-w-sm w-full space-y-3 shadow-2xl">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-extrabold text-sm text-slate-900">{btnConfig.bill_correction_label} Request</span>
                    <button onClick={() => setCorrectionModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <p className="text-[11px] text-slate-500">
                      Submit wrong bill details for Branch Manager approval (Window: {logic.bill_correction_window_hours}h).
                    </p>
                    <input type="text" defaultValue="INV-2026-9041" className="w-full border p-1.5 rounded" placeholder="Invoice Number" />
                    <textarea rows={2} value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} className="w-full border p-1.5 rounded" placeholder="Reason for correction" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setCorrectionModalOpen(false)} className="flex-1 py-1.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg">Cancel</button>
                    <button
                      onClick={() => {
                        setCorrectionModalOpen(false);
                        showToast('Submitted to Manager Correction Queue.');
                      }}
                      className="flex-1 py-1.5 bg-amber-400 text-slate-900 font-extrabold text-xs rounded-lg"
                    >
                      Submit for Correction
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Redemption Modal */}
            {redemptionModalOpen && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
                <div className="bg-white p-5 rounded-2xl max-w-sm w-full space-y-3 shadow-2xl">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-extrabold text-sm text-slate-900">{btnConfig.redeem_label}</span>
                    <button onClick={() => setRedemptionModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 bg-indigo-50 rounded border border-indigo-200">
                      <span className="text-[10px] text-indigo-700 font-bold block">Available Balance</span>
                      <span className="text-base font-black text-indigo-900">{selectedCustomer.available_points} PTS</span>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Points to Burn</label>
                      <input type="number" value={redeemPointsInput} onChange={(e) => setRedeemPointsInput(Number(e.target.value))} className="w-full border p-1.5 rounded font-bold" />
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold pt-1">
                      <span>Rupee Discount:</span>
                      <span className="text-emerald-600 font-black text-base">₹{calculatedRupeeDiscount}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setRedemptionModalOpen(false)} className="flex-1 py-1.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg">Cancel</button>
                    <button
                      onClick={() => {
                        setRedemptionModalOpen(false);
                        setSelectedCustomer({
                          ...selectedCustomer,
                          points_balance: Math.max(0, selectedCustomer.points_balance - redeemPointsInput),
                          available_points: Math.max(0, selectedCustomer.available_points - redeemPointsInput),
                          history: [
                            { id: `tx_${Date.now()}`, invoice: 'DISCOUNT-VOUCHER', date: 'Today', type: 'Points Burn Discount', spend: 0, points_earned: 0, points_redeemed: redeemPointsInput, balance: Math.max(0, selectedCustomer.points_balance - redeemPointsInput) },
                            ...selectedCustomer.history
                          ]
                        });
                        showToast(`Redeemed ${redeemPointsInput} PTS! Invoice discounted by ₹${calculatedRupeeDiscount}`);
                      }}
                      className="flex-1 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-lg"
                    >
                      Apply Discount
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
