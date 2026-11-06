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
  SlidersVertical
} from 'lucide-react';
import ApiService from '../services/api';

/**
 * Dealerships / Client Tenants Catalog
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
 * Pre-loaded Dealership Logo Library
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

const AVAILABLE_ICONS = [
  { id: 'LayoutDashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'FileText', label: 'File / Bill', icon: FileText },
  { id: 'Sparkles', label: 'Sparkles / Rewards', icon: Sparkles },
  { id: 'Gift', label: 'Gift Box', icon: Gift },
  { id: 'Users', label: 'Users / Members', icon: Users },
  { id: 'ShieldCheck', label: 'Security / KYC', icon: ShieldCheck },
  { id: 'Crown', label: 'Executive Crown', icon: Crown },
  { id: 'Calculator', label: 'Analytics / Reports', icon: Calculator },
  { id: 'Tag', label: 'Offers Tag', icon: Tag },
  { id: 'Car', label: 'Vehicle', icon: Car },
  { id: 'Wrench', label: 'Service / Wrench', icon: Wrench },
  { id: 'Coins', label: 'Coins / Points', icon: Coins },
  { id: 'Share2', label: 'Share / WhatsApp', icon: Share2 },
  { id: 'Building2', label: 'Branches', icon: Building2 },
];

const ICON_MAP = {
  LayoutDashboard,
  FileText,
  Sparkles,
  Gift,
  Users,
  ShieldCheck,
  Crown,
  Calculator,
  Tag,
  Car,
  Wrench,
  Coins,
  Share2,
  Building2,
  BarChart3: Calculator,
};

const renderIcon = (name, className = 'w-4 h-4') => {
  const IconComp = ICON_MAP[name] || LayoutDashboard;
  return <IconComp className={className} />;
};

export default function LoyaltyAppBuilder({ user, onExitToCounterApp }) {
  // ─── WordPress Navigation & Viewport States ───
  const [selectedTenant, setSelectedTenant] = useState(user?.tenant_id || 'trident_automobiles');
  const [activeMenu, setActiveMenu] = useState('appearance'); // 'appearance' | 'branches' | 'users' | 'portal' | 'logic' | 'tabs' | 'buttons' | 'tiers' | 'rewards'
  const [viewport, setViewport] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [previewScreen, setPreviewScreen] = useState('pos'); // 'pos' | 'portal' | 'branches' | 'users' | 'corrections' | 'director'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ─── Main Configurations State ───
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

  const [branches, setBranches] = useState([
    { id: 'br_blr_south', code: 'TRD-BLR-01', name: 'Trident Bengaluru South', city: 'Bengaluru', multiplier: 1.0, redemption_budget: 500000, manager_approval_limit: 5000, is_active: true },
    { id: 'br_indiranagar', code: 'TRD-BLR-02', name: 'Trident Indiranagar Flagship', city: 'Bengaluru', multiplier: 1.1, redemption_budget: 750000, manager_approval_limit: 7500, is_active: true },
    { id: 'br_whitefield', code: 'TRD-BLR-03', name: 'Trident Whitefield Tech Hub', city: 'Bengaluru', multiplier: 1.0, redemption_budget: 600000, manager_approval_limit: 5000, is_active: true },
  ]);

  const [staffUsers, setStaffUsers] = useState([
    { id: 'usr_1', username: 'trident_cashier1', full_name: 'Ramesh Kumar', role: 'cashier', branch_code: 'TRD-BLR-01', phone: '9880011223', is_active: true },
    { id: 'usr_2', username: 'trident_mgr1', full_name: 'Anand Varma', role: 'branch_manager', branch_code: 'TRD-BLR-01', phone: '9880044556', is_active: true },
    { id: 'usr_3', username: 'trident_accounts', full_name: 'Suresh Hegde', role: 'accounts_head', branch_code: 'TRD-BLR-02', phone: '9880077889', is_active: true },
    { id: 'usr_4', username: 'trident_director', full_name: 'Director Trident Auto', role: 'director', branch_code: 'ALL', phone: '9880099001', is_active: true },
  ]);

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

  const [tabs, setTabs] = useState([
    { id: 'dashboard', label: 'Customer Search & 360', icon: 'LayoutDashboard', group: 'Counter POS', order: 1, visible: true, role_access: 'all' },
    { id: 'corrections_queue', label: 'Bill Correction Queue', icon: 'FileText', group: 'Managerial Approvals', order: 2, visible: true, role_access: 'manager' },
    { id: 'customer_redemptions', label: 'Customer Redemptions', icon: 'Sparkles', group: 'Loyalty Rewards', order: 3, visible: true, role_access: 'cashier' },
    { id: 'referrals', label: 'Referral Rewards', icon: 'Users', group: 'Rewards & Referrals', order: 4, visible: true, role_access: 'cashier' },
    { id: 'gift_cards', label: 'Gift Card Rewards', icon: 'Gift', group: 'Rewards & Referrals', order: 5, visible: true, role_access: 'cashier' },
    { id: 'director_command_center', label: 'Director Command Center', icon: 'Crown', group: 'Executive Suite', order: 6, visible: true, role_access: 'director' },
    { id: 'kyc_approvals', label: 'KYC Approvals', icon: 'ShieldCheck', group: 'Loyalty Rewards', order: 7, visible: true, role_access: 'manager' },
    { id: 'reports', label: 'Reports & Analytics', icon: 'Calculator', group: 'Analytics', order: 8, visible: true, role_access: 'manager' },
  ]);

  const [buttons, setButtons] = useState([
    { id: 'btn_add_receipt', label: 'Add Receipt', icon: 'Plus', style: 'solid', placement: 'header', action_type: 'open_receipt_modal', color: 'emerald', enabled: true, order: 1 },
    { id: 'btn_bill_correction', label: 'Bill Correction', icon: 'FileText', style: 'solid', placement: 'header', action_type: 'open_bill_correction_modal', color: 'amber', enabled: true, order: 2 },
    { id: 'btn_redeem', label: 'Redeem Discount', icon: 'Sparkles', style: 'solid', placement: 'customer_card', action_type: 'open_redemption_modal', color: 'indigo', enabled: true, order: 3 },
    { id: 'btn_whatsapp_pass', label: 'Send WhatsApp Pass', icon: 'Share2', style: 'outline', placement: 'customer_card', action_type: 'send_whatsapp', color: 'emerald', enabled: true, order: 4 },
    { id: 'btn_quick_referral', label: 'Add Referral', icon: 'Users', style: 'soft', placement: 'customer_card', action_type: 'open_referral_modal', color: 'primary', enabled: true, order: 5 },
    { id: 'btn_appsheet_sync', label: 'Sync AppSheet', icon: 'RefreshCw', style: 'outline', placement: 'header', action_type: 'sync_appsheet', color: 'slate', enabled: true, order: 6 },
  ]);

  const [tiers, setTiers] = useState([
    { tier: 'Silver Member', threshold: 0, multiplier: 1.0, badge_color: '#64748b', perks: 'Base 1% Points + Welcome Bonus' },
    { tier: 'Gold VIP', threshold: 100000, multiplier: 1.25, badge_color: '#f59e0b', perks: '1.25x Priority Points + Free Wash' },
    { tier: 'Diamond Director', threshold: 500000, multiplier: 1.5, badge_color: '#0284c7', perks: '1.5x Points + Dedicated Relationship Manager' },
  ]);

  const [rewards, setRewards] = useState({
    referral_vehicle_purchase_reward: 2500,
    referral_service_visit_reward: 500,
    gift_card_bonus_pct: 10,
    kyc_verification_bonus: 500,
  });

  // ─── Status & Persistence ───
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Saved');
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  // ─── Interactive Stage States ───
  const [testSpendType, setTestSpendType] = useState('service');
  const [testSpendAmount, setTestSpendAmount] = useState(12500);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [redemptionModalOpen, setRedemptionModalOpen] = useState(false);

  // Modals for adding branch / user / tab / button
  const [newBranchModal, setNewBranchModal] = useState(false);
  const [newBranchData, setNewBranchData] = useState({ name: '', code: '', city: 'Bengaluru', multiplier: 1.0, redemption_budget: 500000, manager_approval_limit: 5000 });

  const [newUserModal, setNewUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({ username: '', full_name: '', role: 'cashier', branch_code: 'TRD-BLR-01', phone: '' });

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Load Tenant Configuration from DB ───
  const loadConfig = useCallback(async (tenantId) => {
    setLoading(true);
    try {
      const res = await ApiService.getAppBuilderConfig(tenantId);
      if (res && res.data) {
        const d = res.data;
        if (d.theme_config && Object.keys(d.theme_config).length > 0) setTheme((prev) => ({ ...prev, ...d.theme_config }));
        if (Array.isArray(d.branches_config) && d.branches_config.length > 0) setBranches(d.branches_config);
        if (Array.isArray(d.users_config) && d.users_config.length > 0) setStaffUsers(d.users_config);
        if (d.portal_config && Object.keys(d.portal_config).length > 0) setPortal((prev) => ({ ...prev, ...d.portal_config }));
        if (d.logic_config && Object.keys(d.logic_config).length > 0) setLogic((prev) => ({ ...prev, ...d.logic_config }));
        if (Array.isArray(d.tabs_config) && d.tabs_config.length > 0) setTabs(d.tabs_config);
        if (Array.isArray(d.buttons_config) && d.buttons_config.length > 0) setButtons(d.buttons_config);
        if (d.rewards_config && Object.keys(d.rewards_config).length > 0) setRewards((prev) => ({ ...prev, ...d.rewards_config }));
        setIsPublished(Boolean(d.is_published));
        setStatusMessage('Saved');
      }
    } catch (err) {
      console.warn('Config load note:', err.message);
    } finally {
      setLoading(false);
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
      const payload = {
        tenant_id: selectedTenant,
        theme_config: theme,
        branches_config: branches,
        users_config: staffUsers,
        portal_config: portal,
        logic_config: logic,
        tabs_config: tabs,
        buttons_config: buttons,
        rewards_config: rewards,
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

  // ─── File Upload Handler for Custom Logo ───
  const handleLogoFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG).', true);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setTheme({ ...theme, logo_url: dataUrl });
      showToast('Custom logo uploaded & applied to app.');
    };
    reader.readAsDataURL(file);
  };

  // ─── Points Calculation for Live Simulator ───
  const calculatedPoints = useMemo(() => {
    const num = Number(testSpendAmount) || 0;
    let pct = logic.service_points_pct;
    if (testSpendType === 'sale') pct = logic.sales_net_ex_pct;
    else if (testSpendType === 'bodyshop') pct = logic.bodyshop_points_pct;
    else if (testSpendType === 'accessories') pct = logic.accessories_points_pct;
    return Math.round((num * pct) / 100);
  }, [testSpendType, testSpendAmount, logic]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f0f0f1] text-[#2c3338] overflow-hidden font-sans select-none">
      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. WORDPRESS TOP ADMIN BAR (#1d2327)                       */}
      {/* ────────────────────────────────────────────────────────── */}
      <header className="h-[46px] sm:h-[50px] bg-[#1d2327] text-[#c3c4c7] px-3 sm:px-4 flex items-center justify-between z-40 shrink-0 border-b border-[#2c3338]">
        {/* Left: WordPress Icon & Site Title */}
        <div className="flex items-center gap-3">
          {/* WordPress W Logo */}
          <div
            className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#1d2327] font-black text-sm tracking-tighter shadow-xs cursor-pointer hover:bg-slate-100"
            title="WordPress Loyalty Engine"
          >
            W
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-white tracking-wide truncate max-w-[140px] sm:max-w-[200px]">
              {theme.dealership_name}
            </span>
            <span className="text-[11px] text-[#8c8f94] hidden md:inline">› Loyalty Site Editor</span>
          </div>

          <div className="h-4 w-[1px] bg-[#3c434a] mx-1 hidden sm:block" />

          {/* Dealership Switcher (Trident / Bellad / Hero) */}
          <div className="relative">
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
              className="bg-[#2c3338] text-white border border-[#3c434a] text-[11px] font-medium rounded px-2.5 py-1 pr-6 appearance-none focus:outline-none focus:border-[#2271b1] cursor-pointer"
            >
              {DEALERSHIPS_CATALOG.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-[#8c8f94] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Badge */}
          <span className="text-[11px] text-[#8c8f94] hidden lg:inline ml-1 font-mono">
            {statusMessage}
          </span>
        </div>

        {/* Center: Device Viewports & Live Preview Screen Selector */}
        <div className="flex items-center gap-2">
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

          {/* Preview Screen Selector (What page of loyalty app we are inspecting) */}
          <div className="hidden md:flex items-center bg-[#2c3338] px-2 py-1 rounded border border-[#3c434a] text-xs">
            <span className="text-[10px] text-[#8c8f94] mr-1.5 font-bold uppercase">Page:</span>
            <select
              value={previewScreen}
              onChange={(e) => setPreviewScreen(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="pos" className="bg-[#1d2327]">Customer POS & 360</option>
              <option value="portal" className="bg-[#1d2327]">Customer Self-Service Portal</option>
              <option value="branches" className="bg-[#1d2327]">Branch Network Performance</option>
              <option value="users" className="bg-[#1d2327]">Staff User Directory</option>
              <option value="corrections" className="bg-[#1d2327]">Manager Correction Queue</option>
              <option value="director" className="bg-[#1d2327]">Director Command Center</option>
            </select>
          </div>
        </div>

        {/* Right: Save Draft & Classic WordPress Publish Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="text-xs text-[#c3c4c7] hover:text-white font-medium px-2 py-1 transition hidden sm:inline"
          >
            Save draft
          </button>

          {/* Iconic WordPress Publish Button (#2271b1) */}
          <button
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="bg-[#2271b1] hover:bg-[#135e96] active:bg-[#0a4b78] text-white text-xs font-semibold px-3.5 py-1.5 rounded transition flex items-center gap-1.5 shadow-xs"
          >
            {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>Publish</span>
          </button>

          <button
            onClick={onExitToCounterApp}
            title="Exit to POS"
            className="p-1.5 text-[#8c8f94] hover:text-white hover:bg-[#2c3338] rounded transition ml-1"
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
              { id: 'branches', label: 'Branch Network', icon: Building2 },
              { id: 'users', label: 'User Control & Staff', icon: Users },
              { id: 'portal', label: 'Customer Portal', icon: Globe },
              { id: 'logic', label: 'Points & Logic Rules', icon: SlidersVertical },
              { id: 'tabs', label: 'Tabs & Navigation', icon: Layers },
              { id: 'buttons', label: 'Buttons Studio', icon: Sparkles },
              { id: 'tiers', label: 'Customer Tiers', icon: Crown },
              { id: 'rewards', label: 'Referrals & Gifts', icon: Gift },
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

          {/* Collapse sidebar toggle at bottom */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-3 border-t border-[#2c3338] text-[#8c8f94] hover:text-white flex items-center justify-center text-xs"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 -rotate-90" />}
          </button>
        </nav>

        {/* ─── WORDPRESS SETTINGS INSPECTOR DRAWER (#ffffff) ─── */}
        <aside className="w-80 sm:w-96 bg-white border-r border-[#dcdcde] flex flex-col shrink-0 z-20 overflow-hidden shadow-xs">
          {/* Section Header */}
          <div className="p-3.5 border-b border-[#dcdcde] bg-[#f6f7f7] flex items-center justify-between shrink-0">
            <span className="font-bold text-xs text-[#1d2327] uppercase tracking-wide">
              {activeMenu === 'appearance' && 'Appearance & Brand Identity'}
              {activeMenu === 'branches' && 'Branch-wise Rules & Budgets'}
              {activeMenu === 'users' && 'Staff Users & Role Matrix'}
              {activeMenu === 'portal' && 'Customer Self-Service Portal'}
              {activeMenu === 'logic' && 'Loyalty Business Logic Engine'}
              {activeMenu === 'tabs' && 'Tabs & Navigation Studio'}
              {activeMenu === 'buttons' && 'Action Buttons Studio'}
              {activeMenu === 'tiers' && 'Customer Priority Tiers'}
              {activeMenu === 'rewards' && 'Referral Slabs & Gifts'}
            </span>
          </div>

          {/* Inspector Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-[#50575e]">
            {/* ══════════════════════════════════════════════════════ */}
            {/* 1. APPEARANCE & REAL LOGO SELECTOR                     */}
            {/* ══════════════════════════════════════════════════════ */}
            {activeMenu === 'appearance' && (
              <div className="space-y-4">
                {/* Real Logo Selector Box */}
                <div className="space-y-2 border border-[#dcdcde] p-3 rounded bg-[#f6f7f7]">
                  <label className="font-bold text-[#1d2327] block text-[11px] uppercase tracking-wider">
                    Dealership Logo
                  </label>

                  {/* Visual Current Logo Box */}
                  <div className="w-full h-20 bg-white border border-[#dcdcde] rounded flex items-center justify-center p-2 overflow-hidden shadow-2xs">
                    <img
                      src={theme.logo_url || '/trident-logo.svg'}
                      alt="Selected Logo"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => (e.target.src = '/trident-logo.svg')}
                    />
                  </div>

                  {/* Logo Options: Upload File or Pick Pre-loaded */}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-1.5 px-2 bg-[#2271b1] hover:bg-[#135e96] text-white text-xs font-semibold rounded transition flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Logo</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Pre-loaded Logo Quick Select */}
                  <div className="pt-2">
                    <span className="text-[10px] text-[#8c8f94] block font-semibold mb-1">
                      Or select from Dealership Library:
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {LOGO_LIBRARY.map((lg) => (
                        <button
                          key={lg.id}
                          type="button"
                          onClick={() => setTheme({ ...theme, logo_url: lg.url })}
                          className={`p-1 border rounded text-[10px] truncate bg-white hover:border-[#2271b1] transition ${
                            theme.logo_url === lg.url ? 'border-[#2271b1] ring-1 ring-[#2271b1]' : 'border-[#dcdcde]'
                          }`}
                        >
                          {lg.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dealership Name & Tagline */}
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-[#1d2327] block mb-1">Dealership / Firm Name</label>
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
                </div>

                {/* 1-Click Color Themes */}
                <div>
                  <label className="font-bold text-[#1d2327] block mb-1.5">1-Click Brand Themes</label>
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
                          theme.primary_color === p.primary
                            ? 'border-[#2271b1] bg-blue-50/50'
                            : 'border-[#dcdcde] bg-white hover:border-[#8c8f94]'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: p.primary }} />
                        <span className="text-[11px] font-semibold text-[#1d2327] truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Color Pickers */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-[#1d2327] block mb-1">Primary Color</label>
                    <div className="flex items-center gap-1.5 border border-[#8c8f94] p-1 rounded">
                      <input
                        type="color"
                        value={theme.primary_color}
                        onChange={(e) => setTheme({ ...theme, primary_color: e.target.value })}
                        className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                      />
                      <span className="text-[11px] font-mono text-[#1d2327]">{theme.primary_color}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#1d2327] block mb-1">Secondary Accent</label>
                    <div className="flex items-center gap-1.5 border border-[#8c8f94] p-1 rounded">
                      <input
                        type="color"
                        value={theme.secondary_color}
                        onChange={(e) => setTheme({ ...theme, secondary_color: e.target.value })}
                        className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                      />
                      <span className="text-[11px] font-mono text-[#1d2327]">{theme.secondary_color}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* 2. BRANCH NETWORK & BRANCH-WISE REDEMPTION/POINTS      */}
            {/* ══════════════════════════════════════════════════════ */}
            {activeMenu === 'branches' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1d2327]">Dealership Branches</span>
                  <button
                    onClick={() => setNewBranchModal(true)}
                    className="text-[11px] bg-[#2271b1] text-white px-2 py-1 rounded font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Branch</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {branches.map((b, idx) => (
                    <div key={b.id} className="p-3 border border-[#dcdcde] rounded bg-[#f6f7f7] space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs text-[#1d2327] block">{b.name}</span>
                          <span className="text-[10px] text-[#8c8f94] font-mono">{b.code} · {b.city}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-blue-100 text-blue-800">
                          {b.multiplier}x Multiplier
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#dcdcde]">
                        <div>
                          <label className="text-[10px] text-[#8c8f94] block font-semibold">Redemption Budget</label>
                          <span className="font-bold text-[#1d2327]">₹{b.redemption_budget?.toLocaleString()} / mo</span>
                        </div>
                        <div>
                          <label className="text-[10px] text-[#8c8f94] block font-semibold">Manager Sign-off</label>
                          <span className="font-bold text-[#1d2327]">₹{b.manager_approval_limit?.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Modal to Add New Branch */}
                {newBranchModal && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded space-y-2.5">
                    <span className="font-bold text-xs text-blue-900 block">Add New Branch</span>
                    <input
                      type="text"
                      placeholder="Branch Name (e.g. Trident Electronic City)"
                      value={newBranchData.name}
                      onChange={(e) => setNewBranchData({ ...newBranchData, name: e.target.value })}
                      className="w-full border rounded p-1.5 text-xs bg-white"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Code (TRD-BLR-04)"
                        value={newBranchData.code}
                        onChange={(e) => setNewBranchData({ ...newBranchData, code: e.target.value })}
                        className="w-full border rounded p-1.5 text-xs bg-white"
                      />
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Points Multiplier (1.0)"
                        value={newBranchData.multiplier}
                        onChange={(e) => setNewBranchData({ ...newBranchData, multiplier: parseFloat(e.target.value) || 1.0 })}
                        className="w-full border rounded p-1.5 text-xs bg-white"
                      />
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button onClick={() => setNewBranchModal(false)} className="px-2.5 py-1 text-xs">Cancel</button>
                      <button
                        onClick={() => {
                          if (!newBranchData.name) return;
                          setBranches([...branches, { ...newBranchData, id: `br_${Date.now()}`, is_active: true }]);
                          setNewBranchModal(false);
                          showToast('Branch added successfully.');
                        }}
                        className="px-2.5 py-1 bg-[#2271b1] text-white text-xs font-semibold rounded"
                      >
                        Save Branch
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* 3. USER CONTROL & STAFF ROLES MATRIX                   */}
            {/* ══════════════════════════════════════════════════════ */}
            {activeMenu === 'users' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1d2327]">Staff User Control</span>
                  <button
                    onClick={() => setNewUserModal(true)}
                    className="text-[11px] bg-[#2271b1] text-white px-2 py-1 rounded font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Staff</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {staffUsers.map((u) => (
                    <div key={u.id} className="p-2.5 border border-[#dcdcde] rounded bg-[#f6f7f7] flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-[#1d2327] block">{u.full_name}</span>
                        <span className="text-[10px] text-[#8c8f94] font-mono">{u.username} · {u.branch_code}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-slate-200 text-slate-800">
                        {u.role.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Add User Modal */}
                {newUserModal && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded space-y-2.5">
                    <span className="font-bold text-xs text-blue-900 block">Create Staff Account</span>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={newUserData.full_name}
                      onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                      className="w-full border rounded p-1.5 text-xs bg-white"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Username"
                        value={newUserData.username}
                        onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                        className="w-full border rounded p-1.5 text-xs bg-white"
                      />
                      <select
                        value={newUserData.role}
                        onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                        className="w-full border rounded p-1.5 text-xs bg-white"
                      >
                        <option value="cashier">Cashier</option>
                        <option value="branch_manager">Branch Manager</option>
                        <option value="accounts_head">Accounts Head</option>
                        <option value="director">Director</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button onClick={() => setNewUserModal(false)} className="px-2.5 py-1 text-xs">Cancel</button>
                      <button
                        onClick={() => {
                          if (!newUserData.username) return;
                          setStaffUsers([...staffUsers, { ...newUserData, id: `usr_${Date.now()}`, is_active: true }]);
                          setNewUserModal(false);
                          showToast('Staff user registered.');
                        }}
                        className="px-2.5 py-1 bg-[#2271b1] text-white text-xs font-semibold rounded"
                      >
                        Create User
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* 4. CUSTOMER SELF-SERVICE PORTAL PAGE                   */}
            {/* ══════════════════════════════════════════════════════ */}
            {activeMenu === 'portal' && (
              <div className="space-y-4">
                <div>
                  <label className="font-bold text-[#1d2327] block mb-1">Portal Hero Headline</label>
                  <input
                    type="text"
                    value={portal.hero_title}
                    onChange={(e) => setPortal({ ...portal, hero_title: e.target.value })}
                    className="w-full border border-[#8c8f94] rounded p-2 text-xs text-[#1d2327] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1d2327] block mb-1">Portal Subtitle</label>
                  <textarea
                    rows={2}
                    value={portal.hero_subtitle}
                    onChange={(e) => setPortal({ ...portal, hero_subtitle: e.target.value })}
                    className="w-full border border-[#8c8f94] rounded p-2 text-xs text-[#1d2327] focus:outline-none"
                  />
                </div>

                <div className="space-y-2 pt-1 border-t border-[#dcdcde]">
                  <span className="font-bold text-xs text-[#1d2327] block">Customer Portal Features</span>
                  {[
                    { key: 'show_points_calculator', label: 'Point Valuation & Calculator' },
                    { key: 'show_whatsapp_pass', label: 'Download Digital WhatsApp Pass' },
                    { key: 'show_monthly_offers', label: 'Browse Monthly Brand Offers' },
                    { key: 'show_referral_claim', label: 'Customer Referral Claim Form' },
                  ].map((feat) => (
                    <div key={feat.key} className="flex items-center justify-between p-2 border rounded bg-[#f6f7f7]">
                      <span className="text-xs text-[#1d2327] font-medium">{feat.label}</span>
                      <input
                        type="checkbox"
                        checked={portal[feat.key]}
                        onChange={(e) => setPortal({ ...portal, [feat.key]: e.target.checked })}
                        className="accent-[#2271b1] w-4 h-4"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* 5. LOYALTY BUSINESS LOGIC RULES                        */}
            {/* ══════════════════════════════════════════════════════ */}
            {activeMenu === 'logic' && (
              <div className="space-y-4">
                {/* Sales Ex-Showroom */}
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
                  <span className="text-[10px] text-[#8c8f94] block">
                    ₹15 Lakhs vehicle sale yields {Math.round((1500000 * logic.sales_net_ex_pct) / 100)} pts
                  </span>
                </div>

                {/* Service */}
                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-xs font-semibold text-[#1d2327]">
                    <span>Service Invoices & Spares</span>
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

                {/* Bodyshop */}
                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-xs font-semibold text-[#1d2327]">
                    <span>Bodyshop & Insurance Repairs</span>
                    <span className="text-amber-600 font-bold">{logic.bodyshop_points_pct}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="4.0"
                    step="0.5"
                    value={logic.bodyshop_points_pct}
                    onChange={(e) => setLogic({ ...logic, bodyshop_points_pct: parseFloat(e.target.value) })}
                    className="w-full accent-amber-600"
                  />
                </div>

                {/* Valuation & Lock-in */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#dcdcde]">
                  <div>
                    <label className="text-[10px] font-bold text-[#1d2327] block mb-1">Conversion (₹/pt)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={logic.points_to_inr_ratio}
                      onChange={(e) => setLogic({ ...logic, points_to_inr_ratio: parseFloat(e.target.value) || 0.25 })}
                      className="w-full border rounded p-1.5 text-xs"
                    />
                    <span className="text-[10px] text-[#8c8f94] block mt-0.5">4 pts = ₹1.00</span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#1d2327] block mb-1">Lock-in Period</label>
                    <input
                      type="number"
                      value={logic.lock_in_months}
                      onChange={(e) => setLogic({ ...logic, lock_in_months: parseInt(e.target.value) || 0 })}
                      className="w-full border rounded p-1.5 text-xs"
                    />
                    <span className="text-[10px] text-[#8c8f94] block mt-0.5">{logic.lock_in_months} months</span>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* 6. TABS & BUTTONS STUDIO                               */}
            {/* ══════════════════════════════════════════════════════ */}
            {activeMenu === 'tabs' && (
              <div className="space-y-3">
                <span className="font-bold text-xs text-[#1d2327] block">Navigation Tabs</span>
                <div className="space-y-1.5">
                  {tabs.map((tab) => (
                    <div key={tab.id} className="p-2 border rounded bg-[#f6f7f7] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {renderIcon(tab.icon, 'w-3.5 h-3.5 text-[#2271b1]')}
                        <span className="font-semibold text-xs text-[#1d2327]">{tab.label}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={tab.visible}
                        onChange={() => setTabs(tabs.map((t) => (t.id === tab.id ? { ...t, visible: !t.visible } : t)))}
                        className="accent-[#2271b1]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeMenu === 'buttons' && (
              <div className="space-y-3">
                <span className="font-bold text-xs text-[#1d2327] block">Action Buttons</span>
                <div className="space-y-1.5">
                  {buttons.map((btn) => (
                    <div key={btn.id} className="p-2 border rounded bg-[#f6f7f7] flex items-center justify-between">
                      <span className="font-semibold text-xs text-[#1d2327]">{btn.label}</span>
                      <input
                        type="checkbox"
                        checked={btn.enabled}
                        onChange={() => setButtons(buttons.map((b) => (b.id === btn.id ? { ...b, enabled: !b.enabled } : b)))}
                        className="accent-[#2271b1]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ─── WORDPRESS LIVE STAGE (WYSIWYG CANVAS) ─── */}
        <main className="flex-1 bg-[#f0f0f1] flex flex-col items-center justify-center p-3 sm:p-6 overflow-y-auto relative">
          <div
            className={`transition-all duration-300 ease-out flex flex-col shadow-xl bg-white border border-[#dcdcde] overflow-hidden ${
              viewport === 'mobile'
                ? 'w-[375px] h-[780px] rounded-[36px] border-[8px] border-[#1d2327]'
                : viewport === 'tablet'
                ? 'w-[768px] h-[820px] rounded-2xl'
                : 'w-full max-w-[1200px] h-[840px] rounded-lg'
            }`}
          >
            {/* Dealership Live Header */}
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

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                {buttons
                  .filter((b) => b.enabled && b.placement === 'header')
                  .map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        if (b.action_type === 'open_receipt_modal') setReceiptModalOpen(true);
                        else if (b.action_type === 'open_bill_correction_modal') setCorrectionModalOpen(true);
                        else showToast(`${b.label} clicked`);
                      }}
                      className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded transition"
                    >
                      {b.label}
                    </button>
                  ))}
              </div>
            </header>

            {/* Canvas Main Body based on selected Preview Screen */}
            <div className="flex-1 flex overflow-hidden bg-slate-50 text-slate-800">
              {/* Sidebar Tabs */}
              <div className="w-48 bg-white border-r border-[#dcdcde] p-2 space-y-1 shrink-0 hidden sm:block">
                {tabs
                  .filter((t) => t.visible)
                  .map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        if (t.id === 'corrections_queue') setPreviewScreen('corrections');
                        else if (t.id === 'director_command_center') setPreviewScreen('director');
                        else setPreviewScreen('pos');
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded text-slate-700 hover:bg-slate-100 text-left"
                    >
                      {renderIcon(t.icon, 'w-3.5 h-3.5')}
                      <span className="truncate">{t.label}</span>
                    </button>
                  ))}
              </div>

              {/* Screen Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* 1. POS CUSTOMER 360 */}
                {previewScreen === 'pos' && (
                  <div className="space-y-4">
                    {/* Customer Loyalty Card */}
                    <div
                      className={`p-5 text-white shadow-md transition-all ${theme.card_radius}`}
                      style={{
                        background: `linear-gradient(135deg, ${theme.primary_color} 0%, ${theme.secondary_color} 100%)`,
                      }}
                    >
                      <div className="flex justify-between items-center pb-3 border-b border-white/20">
                        <div>
                          <span className="font-black text-lg block">Rahul Sharma</span>
                          <span className="text-xs opacity-90">KA-04-MA-9921 · Gold VIP</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">Points</span>
                          <span className="text-2xl font-black">4,250 PTS</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3">
                        <button
                          onClick={() => setReceiptModalOpen(true)}
                          className="px-3 py-1.5 bg-white text-slate-900 font-bold text-xs rounded shadow-xs"
                        >
                          Add Receipt
                        </button>
                        <button
                          onClick={() => setCorrectionModalOpen(true)}
                          className="px-3 py-1.5 bg-amber-400 text-slate-900 font-bold text-xs rounded shadow-xs"
                        >
                          Bill Correction
                        </button>
                        <button
                          onClick={() => setRedemptionModalOpen(true)}
                          className="px-3 py-1.5 bg-white/20 text-white font-bold text-xs rounded"
                        >
                          Redeem Points
                        </button>
                      </div>
                    </div>

                    {/* Spend Simulator Box */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                      <span className="font-bold text-xs text-slate-900 block">Live Rules Point Calculator</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block">Category</label>
                          <select
                            value={testSpendType}
                            onChange={(e) => setTestSpendType(e.target.value)}
                            className="w-full border rounded p-1.5 text-xs"
                          >
                            <option value="sale">Vehicle Sale ({logic.sales_net_ex_pct}%)</option>
                            <option value="service">Service Invoice ({logic.service_points_pct}%)</option>
                            <option value="bodyshop">Bodyshop ({logic.bodyshop_points_pct}%)</option>
                            <option value="accessories">Accessories ({logic.accessories_points_pct}%)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block">Spend Value</label>
                          <input
                            type="number"
                            value={testSpendAmount}
                            onChange={(e) => setTestSpendAmount(Number(e.target.value))}
                            className="w-full border rounded p-1.5 text-xs font-bold"
                          />
                        </div>
                      </div>

                      <div className="p-2.5 bg-blue-50 border border-blue-200 rounded flex justify-between items-center text-xs">
                        <span className="font-bold text-blue-900">Calculated Points Reward:</span>
                        <span className="font-black text-blue-950 text-sm">+{calculatedPoints} PTS</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. CUSTOMER PORTAL PREVIEW */}
                {previewScreen === 'portal' && (
                  <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
                    <div
                      className="p-6 rounded-xl text-white text-center space-y-2"
                      style={{ backgroundColor: theme.primary_color }}
                    >
                      <h2 className="text-xl font-black">{portal.hero_title}</h2>
                      <p className="text-xs max-w-md mx-auto opacity-90">{portal.hero_subtitle}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-3 border rounded-lg bg-slate-50">
                        <span className="text-xs font-bold block text-slate-900">Check Points Pass</span>
                        <span className="text-[10px] text-slate-500">Phone & OTP Login</span>
                      </div>
                      <div className="p-3 border rounded-lg bg-slate-50">
                        <span className="text-xs font-bold block text-slate-900">Claim Rewards</span>
                        <span className="text-[10px] text-slate-500">Vouchers & Offers</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. BRANCH NETWORK PREVIEW */}
                {previewScreen === 'branches' && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                    <span className="font-bold text-xs text-slate-900 block">Active Dealership Branches</span>
                    {branches.map((b) => (
                      <div key={b.id} className="p-3 border rounded bg-slate-50 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-xs block text-slate-900">{b.name}</span>
                          <span className="text-[10px] text-slate-500">{b.code} · {b.city}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-xs text-blue-600 block">{b.multiplier}x Multiplier</span>
                          <span className="text-[10px] text-slate-400">Budget: ₹{b.redemption_budget?.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. USER DIRECTORY PREVIEW */}
                {previewScreen === 'users' && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                    <span className="font-bold text-xs text-slate-900 block">Staff User Directory</span>
                    {staffUsers.map((u) => (
                      <div key={u.id} className="p-2.5 border rounded bg-slate-50 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold block text-slate-900">{u.full_name}</span>
                          <span className="text-[10px] text-slate-500">{u.username} · {u.branch_code}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200">
                          {u.role.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 5. CORRECTIONS QUEUE PREVIEW */}
                {previewScreen === 'corrections' && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                    <span className="font-bold text-xs text-slate-900 block">Manager Bill Correction Queue</span>
                    <div className="p-3 border rounded bg-amber-50/50 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-xs block text-slate-900">INV-2026-9041 · Mistaken Bill</span>
                        <span className="text-[10px] text-slate-500">Requested by Cashier · Window: {logic.bill_correction_window_hours}h</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button className="px-2.5 py-1 bg-emerald-600 text-white font-bold text-[11px] rounded">Approve</button>
                        <button className="px-2.5 py-1 bg-slate-200 text-slate-700 font-bold text-[11px] rounded">Reject</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. DIRECTOR COMMAND PREVIEW */}
                {previewScreen === 'director' && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                    <span className="font-bold text-xs text-slate-900 block">Director Command Executive Suite</span>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-3 bg-blue-50 rounded border border-blue-200">
                        <span className="text-[10px] text-blue-700 font-bold block">Burn Rate</span>
                        <span className="text-base font-black text-blue-900">18.4%</span>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
                        <span className="text-[10px] text-emerald-700 font-bold block">Footfall</span>
                        <span className="text-base font-black text-emerald-900">4,912</span>
                      </div>
                      <div className="p-3 bg-purple-50 rounded border border-purple-200">
                        <span className="text-[10px] text-purple-700 font-bold block">Invoiced Cash</span>
                        <span className="text-base font-black text-purple-900">₹8.4 Cr</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Modals */}
            {receiptModalOpen && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
                <div className="bg-white p-4 rounded-xl max-w-xs w-full space-y-3 shadow-2xl">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-bold text-xs text-slate-900">Add Spend Receipt</span>
                    <button onClick={() => setReceiptModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <input type="number" value={testSpendAmount} onChange={(e) => setTestSpendAmount(Number(e.target.value))} className="w-full border p-1.5 rounded" />
                    <div className="p-2 bg-emerald-50 text-center font-bold text-emerald-900">+{calculatedPoints} PTS</div>
                  </div>
                  <button onClick={() => { setReceiptModalOpen(false); showToast(`Logged! +${calculatedPoints} PTS`); }} className="w-full py-1.5 bg-emerald-600 text-white font-bold text-xs rounded">
                    Confirm Bill
                  </button>
                </div>
              </div>
            )}

            {correctionModalOpen && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
                <div className="bg-white p-4 rounded-xl max-w-xs w-full space-y-3 shadow-2xl">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-bold text-xs text-slate-900">Request Bill Correction</span>
                    <button onClick={() => setCorrectionModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
                  </div>
                  <p className="text-[11px] text-slate-500">Sent to Manager Queue (Window: {logic.bill_correction_window_hours}h)</p>
                  <button onClick={() => { setCorrectionModalOpen(false); showToast('Bill correction submitted to Manager.'); }} className="w-full py-1.5 bg-amber-500 text-slate-900 font-bold text-xs rounded">
                    Submit Correction
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
