import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Sparkle
} from 'lucide-react';
import ApiService from '../services/api';

/**
 * Standard Dealerships / Tenants Catalog
 */
const DEALERSHIPS = [
  { id: 'bellad_and_company', name: 'Bellad & Company', brands: 'Tata Motors & MG Motors', city: 'Hubballi / Belagavi', logo: '/bellad-logo.png' },
  { id: 'sprint_hero', name: 'Sprint Moto Club', brands: 'Hero MotoCorp & EV', city: 'Hubballi / Belagavi', logo: '/hero-logo.png' },
  { id: 'trident_automobiles', name: 'Trident Automobiles', brands: 'Hyundai & Multi-Brand', city: 'Bengaluru Metro', logo: '/bellad-logo.png' },
  { id: 'advaith_motors', name: 'Advaith Motors', brands: 'Advaith Auto Group', city: 'Bengaluru / Mysuru', logo: '/bellad-logo.png' },
];

/**
 * Pre-configured 1-Click Theme Palettes
 */
const THEME_PRESETS = [
  { id: 'tata_blue', name: 'Tata Executive Navy', primary: '#1e40af', secondary: '#3b82f6', accent: '#10b981', surface: 'light' },
  { id: 'emerald_green', name: 'Emerald Eco Mobility', primary: '#059669', secondary: '#10b981', accent: '#3b82f6', surface: 'light' },
  { id: 'royal_ruby', name: 'Royal Crimson Ruby', primary: '#991b1b', secondary: '#ef4444', accent: '#f59e0b', surface: 'light' },
  { id: 'cyber_violet', name: 'Cyber Violet', primary: '#581c87', secondary: '#8b5cf6', accent: '#ec4899', surface: 'light' },
  { id: 'luxury_gold', name: 'Luxury Amber Gold', primary: '#b45309', secondary: '#f59e0b', accent: '#10b981', surface: 'dark' },
  { id: 'stealth_dark', name: 'Stealth Midnight Slate', primary: '#0f172a', secondary: '#38bdf8', accent: '#10b981', surface: 'dark' },
];

/**
 * Available Icons for Tab & Button Selection
 */
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
  { id: 'QrCode', label: 'QR Code', icon: QrCode },
  { id: 'CreditCard', label: 'Card / Payment', icon: CreditCard },
  { id: 'Plus', label: 'Plus / Add', icon: Plus },
  { id: 'RefreshCw', label: 'Sync / Refresh', icon: RefreshCw },
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
  QrCode,
  CreditCard,
  Plus,
  RefreshCw,
  BarChart3: Calculator,
  ShoppingBag,
  Store,
  Clock,
  Sparkle
};

const renderIcon = (iconName, className = 'w-4 h-4') => {
  const IconComp = ICON_MAP[iconName] || LayoutDashboard;
  return <IconComp className={className} />;
};

/**
 * Default Factory Configuration
 */
const DEFAULT_CONFIG = {
  theme: {
    dealership_name: 'Bellad & Company',
    tagline: 'Tata Motors & MG Motors Authorised Dealership Group',
    logo_url: '/bellad-logo.png',
    primary_color: '#1e40af',
    secondary_color: '#3b82f6',
    accent_color: '#10b981',
    surface_mode: 'light',
    card_radius: 'rounded-2xl',
    font_family: 'Plus Jakarta Sans',
    header_banner_text: 'Customer Loyalty & Rewards Suite',
    show_header_banner: true,
  },
  tabs: [
    { id: 'dashboard', label: 'Customer Search & 360', icon: 'LayoutDashboard', group: 'Counter POS', order: 1, visible: true, role_access: 'all' },
    { id: 'corrections_queue', label: 'Bill Correction Queue', icon: 'FileText', group: 'Managerial Approvals', order: 2, visible: true, role_access: 'manager' },
    { id: 'customer_redemptions', label: 'Customer Redemptions', icon: 'Sparkles', group: 'Loyalty Rewards', order: 3, visible: true, role_access: 'cashier' },
    { id: 'referrals', label: 'Referral Rewards', icon: 'Users', group: 'Rewards & Referrals', order: 4, visible: true, role_access: 'cashier' },
    { id: 'gift_cards', label: 'Gift Card Rewards', icon: 'Gift', group: 'Rewards & Referrals', order: 5, visible: true, role_access: 'cashier' },
    { id: 'director_command_center', label: 'Director Command Center', icon: 'Crown', group: 'Executive Suite', order: 6, visible: true, role_access: 'director' },
    { id: 'kyc_approvals', label: 'KYC Approvals', icon: 'ShieldCheck', group: 'Loyalty Rewards', order: 7, visible: true, role_access: 'manager' },
    { id: 'reports', label: 'Reports & Analytics', icon: 'Calculator', group: 'Analytics', order: 8, visible: true, role_access: 'manager' },
  ],
  buttons: [
    { id: 'btn_add_receipt', label: 'Add Receipt', icon: 'Plus', style: 'solid', placement: 'header', action_type: 'open_receipt_modal', color: 'emerald', enabled: true, order: 1 },
    { id: 'btn_bill_correction', label: 'Bill Correction', icon: 'FileText', style: 'solid', placement: 'header', action_type: 'open_bill_correction_modal', color: 'amber', enabled: true, order: 2 },
    { id: 'btn_redeem', label: 'Redeem Discount', icon: 'Sparkles', style: 'solid', placement: 'customer_card', action_type: 'open_redemption_modal', color: 'indigo', enabled: true, order: 3 },
    { id: 'btn_whatsapp_pass', label: 'Send WhatsApp Pass', icon: 'Share2', style: 'outline', placement: 'customer_card', action_type: 'send_whatsapp', color: 'emerald', enabled: true, order: 4 },
    { id: 'btn_quick_referral', label: 'Add Referral', icon: 'Users', style: 'soft', placement: 'customer_card', action_type: 'open_referral_modal', color: 'primary', enabled: true, order: 5 },
    { id: 'btn_appsheet_sync', label: 'Sync AppSheet', icon: 'RefreshCw', style: 'outline', placement: 'header', action_type: 'sync_appsheet', color: 'slate', enabled: true, order: 6 },
  ],
  logic: {
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
  },
  tiers: [
    { tier: 'Silver Member', threshold: 0, multiplier: 1.0, badge_color: '#64748b', perks: 'Base 1% Points + Welcome Bonus' },
    { tier: 'Gold VIP', threshold: 100000, multiplier: 1.25, badge_color: '#f59e0b', perks: '1.25x Priority Points + Free Wash' },
    { tier: 'Diamond Director', threshold: 500000, multiplier: 1.5, badge_color: '#3b82f6', perks: '1.5x Points + Dedicated Relationship Manager' },
  ]
};

/**
 * Pre-configured Test Customer for Live Interactive Preview
 */
const TEST_CUSTOMER = {
  id: 'cust_sample_1',
  name: 'Rahul Sharma',
  phone: '98888 77777',
  chassis: 'KA-25-EA-8899',
  vehicle: 'Tata Safari Dark Edition',
  tier: 'Gold VIP',
  points_balance: 4250,
  locked_points: 1200,
  available_points: 3050,
  lifetime_spend: 1850000,
};

export default function LoyaltyAppBuilder({ user, onExitToCounterApp }) {
  // ─── Top Bar & Viewport States ───
  const [viewport, setViewport] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [editorMode, setEditorMode] = useState('customize'); // 'customize' | 'preview'
  const [selectedTenant, setSelectedTenant] = useState(user?.tenant_id || 'bellad_and_company');
  const [inspectorTab, setInspectorTab] = useState('theme'); // 'theme' | 'tabs' | 'buttons' | 'logic' | 'tiers'

  // ─── Main Configurations State (WordPress Customizer Data) ───
  const [theme, setTheme] = useState(DEFAULT_CONFIG.theme);
  const [tabs, setTabs] = useState(DEFAULT_CONFIG.tabs);
  const [buttons, setButtons] = useState(DEFAULT_CONFIG.buttons);
  const [logic, setLogic] = useState(DEFAULT_CONFIG.logic);
  const [tiers, setTiers] = useState(DEFAULT_CONFIG.tiers);

  // ─── App Builder Status & Feedback ───
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [lastSavedTime, setLastSavedTime] = useState(new Date().toLocaleTimeString());
  const [toast, setToast] = useState(null);

  // ─── Interactive Stage Preview States ───
  const [previewActiveTab, setPreviewActiveTab] = useState('dashboard');
  const [testCustomer, setTestCustomer] = useState(TEST_CUSTOMER);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [redemptionModalOpen, setRedemptionModalOpen] = useState(false);

  // Spend Simulator Input in Preview
  const [testSpendType, setTestSpendType] = useState('service');
  const [testSpendAmount, setTestSpendAmount] = useState(12500);
  const [redeemInputPoints, setRedeemInputPoints] = useState(1000);

  // Tab & Button Edit Modals / Inline Editors
  const [editingTabId, setEditingTabId] = useState(null);
  const [newTabModalOpen, setNewTabModalOpen] = useState(false);
  const [newTabData, setNewTabData] = useState({ label: '', icon: 'Sparkles', group: 'Loyalty Rewards', role_access: 'all' });

  const [editingButtonId, setEditingButtonId] = useState(null);
  const [newButtonModalOpen, setNewButtonModalOpen] = useState(false);
  const [newButtonData, setNewButtonData] = useState({ label: '', icon: 'Sparkles', style: 'solid', placement: 'header', action_type: 'open_receipt_modal', color: 'emerald' });

  const showNotification = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Load Config from Backend API on mount & tenant switch ───
  const loadConfig = useCallback(async (tenantId) => {
    setLoading(true);
    try {
      const res = await ApiService.getAppBuilderConfig(tenantId);
      if (res && res.data) {
        if (res.data.theme_config && Object.keys(res.data.theme_config).length > 0) {
          setTheme((prev) => ({ ...prev, ...res.data.theme_config }));
        }
        if (Array.isArray(res.data.tabs_config) && res.data.tabs_config.length > 0) {
          setTabs(res.data.tabs_config);
        }
        if (Array.isArray(res.data.buttons_config) && res.data.buttons_config.length > 0) {
          setButtons(res.data.buttons_config);
        }
        if (res.data.logic_config && Object.keys(res.data.logic_config).length > 0) {
          setLogic((prev) => ({ ...prev, ...res.data.logic_config }));
        }
        setIsPublished(Boolean(res.data.is_published));
        setLastSavedTime(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.warn('Could not fetch app builder config from DB, using fallback defaults:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig(selectedTenant);
  }, [selectedTenant, loadConfig]);

  // ─── Save Draft or Publish Live to PostgreSQL Backend ───
  const handleSave = async (publish = false) => {
    setIsSaving(true);
    try {
      const payload = {
        tenant_id: selectedTenant,
        theme_config: theme,
        tabs_config: tabs,
        buttons_config: buttons,
        logic_config: logic,
        is_published: publish ? true : isPublished,
      };

      const res = await ApiService.saveAppBuilderConfig(selectedTenant, payload);
      setIsPublished(publish ? true : isPublished);
      setLastSavedTime(new Date().toLocaleTimeString());

      if (publish) {
        showNotification('🚀 Configuration published live! Live loyalty counter app is now updated.');
      } else {
        showNotification('💾 Draft configuration saved successfully.');
      }
    } catch (err) {
      console.error('Save builder config failed:', err);
      showNotification(`Save failed: ${err.message}`, true);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Reset Configuration ───
  const handleResetToDefaults = async () => {
    if (!window.confirm('Reset this dealership configuration to standard factory defaults? Any unsaved custom styling will be replaced.')) {
      return;
    }
    setLoading(true);
    try {
      await ApiService.resetAppBuilderConfig(selectedTenant);
      setTheme(DEFAULT_CONFIG.theme);
      setTabs(DEFAULT_CONFIG.tabs);
      setButtons(DEFAULT_CONFIG.buttons);
      setLogic(DEFAULT_CONFIG.logic);
      setTiers(DEFAULT_CONFIG.tiers);
      setIsPublished(true);
      showNotification('✅ Reset to factory defaults completed.');
    } catch (err) {
      showNotification(`Reset failed: ${err.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  // ─── Export / Import JSON ───
  const handleExportJSON = () => {
    const data = { theme, tabs, buttons, logic, tiers, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loyalty_app_config_${selectedTenant}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('📥 Config exported to JSON');
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.theme) setTheme(parsed.theme);
        if (parsed.tabs) setTabs(parsed.tabs);
        if (parsed.buttons) setButtons(parsed.buttons);
        if (parsed.logic) setLogic(parsed.logic);
        if (parsed.tiers) setTiers(parsed.tiers);
        showNotification('📤 Config imported successfully. Click "Publish Live" to commit.');
      } catch (err) {
        showNotification('Invalid JSON file format.', true);
      }
    };
    reader.readAsText(file);
  };

  // ─── Tab Management Handlers ───
  const handleMoveTab = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= tabs.length) return;
    const newTabs = [...tabs];
    const [moved] = newTabs.splice(index, 1);
    newTabs.splice(targetIndex, 0, moved);
    // update order
    const reordered = newTabs.map((t, idx) => ({ ...t, order: idx + 1 }));
    setTabs(reordered);
  };

  const handleToggleTabVisibility = (id) => {
    setTabs(tabs.map((t) => (t.id === id ? { ...t, visible: !t.visible } : t)));
  };

  const handleDeleteTab = (id) => {
    if (tabs.length <= 1) {
      showNotification('At least one tab must remain in the app.', true);
      return;
    }
    setTabs(tabs.filter((t) => t.id !== id));
  };

  const handleCreateNewTab = () => {
    if (!newTabData.label.trim()) {
      showNotification('Please enter a tab label.', true);
      return;
    }
    const slug = newTabData.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newTab = {
      id: `tab_${slug}_${Date.now()}`,
      label: newTabData.label,
      icon: newTabData.icon,
      group: newTabData.group || 'Custom Pages',
      order: tabs.length + 1,
      visible: true,
      role_access: newTabData.role_access || 'all',
    };
    setTabs([...tabs, newTab]);
    setNewTabModalOpen(false);
    setNewTabData({ label: '', icon: 'Sparkles', group: 'Loyalty Rewards', role_access: 'all' });
    showNotification(`New tab "${newTab.label}" added to navigation menu.`);
  };

  // ─── Button Management Handlers ───
  const handleToggleBtnEnabled = (id) => {
    setButtons(buttons.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b)));
  };

  const handleDeleteBtn = (id) => {
    setButtons(buttons.filter((b) => b.id !== id));
  };

  const handleCreateNewButton = () => {
    if (!newButtonData.label.trim()) {
      showNotification('Please enter button text/label.', true);
      return;
    }
    const newBtn = {
      id: `btn_${Date.now()}`,
      label: newButtonData.label,
      icon: newButtonData.icon,
      style: newButtonData.style,
      placement: newButtonData.placement,
      action_type: newButtonData.action_type,
      color: newButtonData.color,
      enabled: true,
      order: buttons.length + 1,
    };
    setButtons([...buttons, newBtn]);
    setNewButtonModalOpen(false);
    setNewButtonData({ label: '', icon: 'Sparkles', style: 'solid', placement: 'header', action_type: 'open_receipt_modal', color: 'emerald' });
    showNotification(`Button "${newBtn.label}" added successfully.`);
  };

  // ─── Live Points Calculation Formula based on configured logic ───
  const calculatePointsForSpend = (spendType, amount) => {
    const num = Number(amount) || 0;
    let pct = 0;
    if (spendType === 'sale') pct = logic.sales_net_ex_pct;
    else if (spendType === 'service') pct = logic.service_points_pct;
    else if (spendType === 'bodyshop') pct = logic.bodyshop_points_pct;
    else if (spendType === 'accessories') pct = logic.accessories_points_pct;

    const basePoints = Math.round((num * pct) / 100);
    return basePoints;
  };

  const calculatedPoints = useMemo(() => {
    return calculatePointsForSpend(testSpendType, testSpendAmount);
  }, [testSpendType, testSpendAmount, logic]);

  // Cash discount value for points
  const calculatedRupeeValue = useMemo(() => {
    return (redeemInputPoints * (logic.points_to_inr_ratio || 0.25)).toFixed(2);
  }, [redeemInputPoints, logic]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. WORDPRESS-REPLICA TOP TOOLBAR                           */}
      {/* ────────────────────────────────────────────────────────── */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between z-30 shrink-0">
        {/* Left: App Identity & Tenant Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-white">App Builder</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                  WordPress Mode
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block -mt-0.5">Visual Loyalty Customizer</span>
            </div>
          </div>

          <div className="h-5 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

          {/* Dealership Switcher */}
          <div className="relative">
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="bg-slate-800/90 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1.5 pr-8 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {DEALERSHIPS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.brands})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Center: Device Viewport Switcher & Simulator Toggle */}
        <div className="flex items-center gap-2">
          {/* Responsive Viewports */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-lg border border-slate-700/80">
            <button
              onClick={() => setViewport('desktop')}
              title="Desktop View (1280px)"
              className={`p-1.5 rounded-md transition ${viewport === 'desktop' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewport('tablet')}
              title="Tablet View (768px)"
              className={`p-1.5 rounded-md transition ${viewport === 'tablet' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              title="Mobile Simulator View (375px)"
              className={`p-1.5 rounded-md transition ${viewport === 'mobile' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="hidden md:flex items-center bg-slate-800/90 p-1 rounded-lg border border-slate-700/80 text-xs font-semibold">
            <button
              onClick={() => setEditorMode('customize')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition ${editorMode === 'customize' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Customize</span>
            </button>
            <button
              onClick={() => setEditorMode('preview')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition ${editorMode === 'preview' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Test Simulator</span>
            </button>
          </div>
        </div>

        {/* Right: Actions (Reset, JSON, Save Draft, Publish Live, Exit) */}
        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-800/50 px-2.5 py-1 rounded-md border border-slate-700/50">
            <span className={`w-2 h-2 rounded-full ${isPublished ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
            <span>{isPublished ? 'Live Published' : 'Draft Modified'}</span>
            <span className="text-slate-500">· {lastSavedTime}</span>
          </div>

          {/* Reset Button */}
          <button
            onClick={handleResetToDefaults}
            title="Reset to factory defaults"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExportJSON}
            title="Export JSON"
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Import JSON */}
          <label
            title="Import JSON"
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          {/* Save Draft */}
          <button
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>

          {/* Publish Live Button (WordPress style primary) */}
          <button
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold rounded-lg shadow-sm shadow-emerald-950 transition transform active:scale-95"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>Publish Live</span>
          </button>

          {/* Exit / Return to Main App */}
          <button
            onClick={onExitToCounterApp}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-lg transition ml-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit POS</span>
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold transition transform animate-in fade-in slide-in-from-bottom-3 ${
            toast.isError ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
          }`}
        >
          {toast.isError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. MAIN WORKSPACE (INSPECTOR SIDEBAR + LIVE CANVAS)       */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ─── LEFT: WORDPRESS INSPECTOR SIDEBAR ─── */}
        <aside className="w-full sm:w-[420px] bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-20 overflow-hidden">
          {/* Inspector Navigation Tabs */}
          <div className="flex items-center border-b border-slate-800 bg-slate-900/90 overflow-x-auto scrollbar-none px-2 shrink-0">
            {[
              { id: 'theme', label: 'Theme & Logo', icon: Palette },
              { id: 'tabs', label: 'Tab Manager', icon: Layers },
              { id: 'buttons', label: 'Buttons Studio', icon: Sparkles },
              { id: 'logic', label: 'Loyalty Rules', icon: Sliders },
              { id: 'tiers', label: 'Tier Slabs', icon: Crown },
            ].map((t) => {
              const Icon = t.icon;
              const isActive = inspectorTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setInspectorTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-3 border-b-2 text-xs font-bold whitespace-nowrap transition ${
                    isActive
                      ? 'border-blue-500 text-blue-400 bg-slate-800/40'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Inspector Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-slate-300 text-xs scrollbar-thin scrollbar-thumb-slate-700">
            {/* ═══════════════════════════════════════════════════ */}
            {/* TAB 1: THEME, LOGO & SITE IDENTITY                  */}
            {/* ═══════════════════════════════════════════════════ */}
            {inspectorTab === 'theme' && (
              <div className="space-y-5">
                <div className="border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Palette className="w-4 h-4 text-blue-400" />
                    <span>Site Identity & Brand Colors</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Customize your dealership logo, brand name, tagline, and live color themes.
                  </p>
                </div>

                {/* Dealership Name & Tagline */}
                <div className="space-y-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Dealership / Group Name
                  </label>
                  <input
                    type="text"
                    value={theme.dealership_name}
                    onChange={(e) => setTheme({ ...theme, dealership_name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
                    placeholder="e.g. Bellad & Company"
                  />

                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider pt-1">
                    Tagline / Subtitle
                  </label>
                  <input
                    type="text"
                    value={theme.tagline}
                    onChange={(e) => setTheme({ ...theme, tagline: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Tata Motors & MG Motors Authorised Dealership"
                  />
                </div>

                {/* Dealership Logo Customizer */}
                <div className="space-y-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Dealership Logo
                    </label>
                    <span className="text-[10px] text-blue-400 font-semibold">Live in Header & Passes</span>
                  </div>

                  {/* Logo Preview Card */}
                  <div className="flex items-center gap-3 p-2 bg-slate-900 rounded-lg border border-slate-700">
                    <div className="w-14 h-14 bg-white rounded-lg p-1 flex items-center justify-center overflow-hidden border border-slate-300 shrink-0">
                      <img
                        src={theme.logo_url || '/bellad-logo.png'}
                        alt="Dealership Logo"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.src = '/bellad-logo.png';
                        }}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={theme.logo_url}
                        onChange={(e) => setTheme({ ...theme, logo_url: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[11px] text-white focus:outline-none"
                        placeholder="Image URL (e.g. /bellad-logo.png)"
                      />
                      <div className="flex gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setTheme({ ...theme, logo_url: '/bellad-logo.png' })}
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-slate-300 font-medium"
                        >
                          Tata Bellad
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme({ ...theme, logo_url: '/hero-logo.png' })}
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-slate-300 font-medium"
                        >
                          Sprint Hero
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 1-Click Color Presets */}
                <div className="space-y-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    1-Click Brand Themes
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {THEME_PRESETS.map((preset) => {
                      const isSelected = theme.primary_color === preset.primary;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() =>
                            setTheme({
                              ...theme,
                              primary_color: preset.primary,
                              secondary_color: preset.secondary,
                              accent_color: preset.accent,
                              surface_mode: preset.surface,
                            })
                          }
                          className={`p-2.5 rounded-lg border text-left transition flex items-center gap-2.5 ${
                            isSelected
                              ? 'bg-slate-800 border-blue-500 shadow-xs'
                              : 'bg-slate-900/60 border-slate-700/60 hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex -space-x-1 shrink-0">
                            <span
                              className="w-4 h-4 rounded-full border border-slate-800 shadow-xs"
                              style={{ backgroundColor: preset.primary }}
                            />
                            <span
                              className="w-4 h-4 rounded-full border border-slate-800 shadow-xs"
                              style={{ backgroundColor: preset.secondary }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-[11px] text-white truncate">{preset.name}</div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Color Pickers */}
                <div className="space-y-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Custom Color Palette
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-1">Primary Color</span>
                      <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-1.5">
                        <input
                          type="color"
                          value={theme.primary_color}
                          onChange={(e) => setTheme({ ...theme, primary_color: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-[10px] font-mono text-slate-300 ml-1 truncate">
                          {theme.primary_color}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-1">Secondary</span>
                      <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-1.5">
                        <input
                          type="color"
                          value={theme.secondary_color}
                          onChange={(e) => setTheme({ ...theme, secondary_color: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-[10px] font-mono text-slate-300 ml-1 truncate">
                          {theme.secondary_color}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-1">Accent</span>
                      <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-1.5">
                        <input
                          type="color"
                          value={theme.accent_color}
                          onChange={(e) => setTheme({ ...theme, accent_color: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-[10px] font-mono text-slate-300 ml-1 truncate">
                          {theme.accent_color}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Surface Mode & Border Radius */}
                <div className="grid grid-cols-2 gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Surface Theme
                    </label>
                    <select
                      value={theme.surface_mode}
                      onChange={(e) => setTheme({ ...theme, surface_mode: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="light">Clean Light (Neumorphic)</option>
                      <option value="slate">Modern Slate</option>
                      <option value="dark">Executive Dark</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Card Corner Radius
                    </label>
                    <select
                      value={theme.card_radius}
                      onChange={(e) => setTheme({ ...theme, card_radius: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="rounded-none">Crisp (0px)</option>
                      <option value="rounded-md">Smooth (6px)</option>
                      <option value="rounded-xl">Standard (12px)</option>
                      <option value="rounded-2xl">Modern Soft (16px)</option>
                      <option value="rounded-3xl">Pill Curve (24px)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════ */}
            {/* TAB 2: NAVIGATION & TAB CREATION MANAGER            */}
            {/* ═══════════════════════════════════════════════════ */}
            {inspectorTab === 'tabs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-400" />
                      <span>Tab & Navigation Studio</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Add, reorder, rename, change icons, and set staff role access for tabs.
                    </p>
                  </div>
                  <button
                    onClick={() => setNewTabModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Tab</span>
                  </button>
                </div>

                {/* Tabs Orderable List */}
                <div className="space-y-2">
                  {tabs.map((tab, idx) => (
                    <div
                      key={tab.id}
                      className={`p-3 rounded-xl border transition ${
                        tab.visible
                          ? 'bg-slate-800/70 border-slate-700/80'
                          : 'bg-slate-900/40 border-slate-800/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Order buttons */}
                          <div className="flex flex-col">
                            <button
                              onClick={() => handleMoveTab(idx, -1)}
                              disabled={idx === 0}
                              className="text-slate-500 hover:text-white disabled:opacity-30 disabled:pointer-events-none p-0.5"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleMoveTab(idx, 1)}
                              disabled={idx === tabs.length - 1}
                              className="text-slate-500 hover:text-white disabled:opacity-30 disabled:pointer-events-none p-0.5"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-blue-400 border border-slate-700 shrink-0">
                            {renderIcon(tab.icon, 'w-3.5 h-3.5')}
                          </div>

                          <div className="min-w-0">
                            <span className="font-bold text-white block text-xs truncate">{tab.label}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Role: <span className="text-blue-300 font-semibold">{tab.role_access}</span>
                            </span>
                          </div>
                        </div>

                        {/* Visibility and delete controls */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleTabVisibility(tab.id)}
                            title={tab.visible ? 'Hide tab from sidebar' : 'Show tab in sidebar'}
                            className={`p-1.5 rounded-lg text-xs font-bold transition ${
                              tab.visible ? 'text-emerald-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-700'
                            }`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setEditingTabId(editingTabId === tab.id ? null : tab.id)}
                            title="Edit tab label & icon"
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteTab(tab.id)}
                            title="Delete tab"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Inline Edit Form when opened */}
                      {editingTabId === tab.id && (
                        <div className="mt-3 pt-3 border-t border-slate-700/80 space-y-2">
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">Tab Label</label>
                            <input
                              type="text"
                              value={tab.label}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTabs(tabs.map((t) => (t.id === tab.id ? { ...t, label: val } : t)));
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-400 font-bold block mb-1">Icon</label>
                              <select
                                value={tab.icon}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTabs(tabs.map((t) => (t.id === tab.id ? { ...t, icon: val } : t)));
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                              >
                                {AVAILABLE_ICONS.map((i) => (
                                  <option key={i.id} value={i.id}>
                                    {i.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 font-bold block mb-1">Role Access</label>
                              <select
                                value={tab.role_access}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTabs(tabs.map((t) => (t.id === tab.id ? { ...t, role_access: val } : t)));
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                              >
                                <option value="all">All Roles</option>
                                <option value="cashier">Cashier Only</option>
                                <option value="manager">Manager Only</option>
                                <option value="accounts">Accounts Head</option>
                                <option value="director">Director Only</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Modal for Creating New Tab */}
                {newTabModalOpen && (
                  <div className="p-3 bg-blue-950/40 border border-blue-700/60 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-blue-300 text-xs">Create New Navigation Tab</span>
                      <button onClick={() => setNewTabModalOpen(false)} className="text-slate-400 hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-300 font-bold block mb-1">Tab Name</label>
                      <input
                        type="text"
                        placeholder="e.g. VIP Club Lounge"
                        value={newTabData.label}
                        onChange={(e) => setNewTabData({ ...newTabData, label: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-300 font-bold block mb-1">Icon</label>
                        <select
                          value={newTabData.icon}
                          onChange={(e) => setNewTabData({ ...newTabData, icon: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                        >
                          {AVAILABLE_ICONS.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-300 font-bold block mb-1">Access Role</label>
                        <select
                          value={newTabData.role_access}
                          onChange={(e) => setNewTabData({ ...newTabData, role_access: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="all">All Roles</option>
                          <option value="cashier">Cashier</option>
                          <option value="manager">Manager</option>
                          <option value="accounts">Accounts Head</option>
                          <option value="director">Director Only</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setNewTabModalOpen(false)}
                        className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateNewTab}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-xs"
                      >
                        Add Tab
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════ */}
            {/* TAB 3: BUTTONS & ACTION STUDIO                      */}
            {/* ═══════════════════════════════════════════════════ */}
            {inspectorTab === 'buttons' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Action Buttons Studio</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Create & configure custom action buttons like Add Receipt, Bill Correction, Redeem, etc.
                    </p>
                  </div>
                  <button
                    onClick={() => setNewButtonModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Button</span>
                  </button>
                </div>

                {/* Buttons List */}
                <div className="space-y-2">
                  {buttons.map((btn) => (
                    <div
                      key={btn.id}
                      className={`p-3 rounded-xl border transition ${
                        btn.enabled
                          ? 'bg-slate-800/70 border-slate-700/80'
                          : 'bg-slate-900/40 border-slate-800/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-emerald-400 border border-slate-700 shrink-0">
                            {renderIcon(btn.icon, 'w-3.5 h-3.5')}
                          </div>

                          <div className="min-w-0">
                            <span className="font-bold text-white block text-xs truncate">{btn.label}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Placement: <span className="text-emerald-300 font-semibold">{btn.placement}</span> · Style:{' '}
                              <span className="text-blue-300 font-semibold">{btn.style}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleBtnEnabled(btn.id)}
                            title={btn.enabled ? 'Disable button' : 'Enable button'}
                            className={`p-1.5 rounded-lg text-xs font-bold transition ${
                              btn.enabled
                                ? 'text-emerald-400 hover:bg-slate-700'
                                : 'text-slate-500 hover:bg-slate-700'
                            }`}
                          >
                            <CheckCheck className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setEditingButtonId(editingButtonId === btn.id ? null : btn.id)}
                            title="Edit button settings"
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteBtn(btn.id)}
                            title="Delete button"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Inline Edit Details */}
                      {editingButtonId === btn.id && (
                        <div className="mt-3 pt-3 border-t border-slate-700/80 space-y-2">
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">Button Label</label>
                            <input
                              type="text"
                              value={btn.label}
                              onChange={(e) => {
                                const val = e.target.value;
                                setButtons(buttons.map((b) => (b.id === btn.id ? { ...b, label: val } : b)));
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-400 font-bold block mb-1">Style Format</label>
                              <select
                                value={btn.style}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setButtons(buttons.map((b) => (b.id === btn.id ? { ...b, style: val } : b)));
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                              >
                                <option value="solid">Solid Fill</option>
                                <option value="outline">Outline</option>
                                <option value="pill">Rounded Pill</option>
                                <option value="soft">Soft Tint</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 font-bold block mb-1">Color Shade</label>
                              <select
                                value={btn.color}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setButtons(buttons.map((b) => (b.id === btn.id ? { ...b, color: val } : b)));
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                              >
                                <option value="emerald">Emerald Green</option>
                                <option value="amber">Amber Warning</option>
                                <option value="indigo">Indigo Violet</option>
                                <option value="primary">Brand Primary</option>
                                <option value="rose">Rose Red</option>
                                <option value="slate">Slate Neutral</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-400 font-bold block mb-1">Placement</label>
                              <select
                                value={btn.placement}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setButtons(buttons.map((b) => (b.id === btn.id ? { ...b, placement: val } : b)));
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                              >
                                <option value="header">Top Header Bar</option>
                                <option value="customer_card">Customer Loyalty Card</option>
                                <option value="quick_actions">Quick Actions Bar</option>
                                <option value="floating_fab">Floating Action FAB</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 font-bold block mb-1">Trigger Action</label>
                              <select
                                value={btn.action_type}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setButtons(buttons.map((b) => (b.id === btn.id ? { ...b, action_type: val } : b)));
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                              >
                                <option value="open_receipt_modal">Open Receipt Modal</option>
                                <option value="open_bill_correction_modal">Open Bill Correction</option>
                                <option value="open_redemption_modal">Open Redemption Modal</option>
                                <option value="send_whatsapp">Send WhatsApp Pass</option>
                                <option value="open_referral_modal">Add Referral</option>
                                <option value="sync_appsheet">Sync AppSheet</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Modal for Creating New Button */}
                {newButtonModalOpen && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-700/60 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-emerald-300 text-xs">Create New Custom Button</span>
                      <button onClick={() => setNewButtonModalOpen(false)} className="text-slate-400 hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-300 font-bold block mb-1">Button Label</label>
                      <input
                        type="text"
                        placeholder="e.g. Bill Correction, Quick KYC"
                        value={newButtonData.label}
                        onChange={(e) => setNewButtonData({ ...newButtonData, label: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-300 font-bold block mb-1">Icon</label>
                        <select
                          value={newButtonData.icon}
                          onChange={(e) => setNewButtonData({ ...newButtonData, icon: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                        >
                          {AVAILABLE_ICONS.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-300 font-bold block mb-1">Placement</label>
                        <select
                          value={newButtonData.placement}
                          onChange={(e) => setNewButtonData({ ...newButtonData, placement: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="header">Top Header Bar</option>
                          <option value="customer_card">Customer Card</option>
                          <option value="quick_actions">Quick Actions Bar</option>
                          <option value="floating_fab">Floating FAB</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-300 font-bold block mb-1">Style</label>
                        <select
                          value={newButtonData.style}
                          onChange={(e) => setNewButtonData({ ...newButtonData, style: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="solid">Solid Fill</option>
                          <option value="outline">Outline</option>
                          <option value="pill">Pill Shape</option>
                          <option value="soft">Soft Tint</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-300 font-bold block mb-1">Color</label>
                        <select
                          value={newButtonData.color}
                          onChange={(e) => setNewButtonData({ ...newButtonData, color: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="emerald">Emerald</option>
                          <option value="amber">Amber</option>
                          <option value="indigo">Indigo</option>
                          <option value="primary">Primary Brand</option>
                          <option value="rose">Rose</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setNewButtonModalOpen(false)}
                        className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateNewButton}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-xs"
                      >
                        Add Button
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════ */}
            {/* TAB 4: LOYALTY BUSINESS LOGIC & RULES ENGINE        */}
            {/* ═══════════════════════════════════════════════════ */}
            {inspectorTab === 'logic' && (
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-purple-400" />
                    <span>Loyalty Business Logic Engine</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Configure point earning % rates, lock-in, redemption value, and bill correction rules.
                  </p>
                </div>

                {/* Earning Formulas Sliders */}
                <div className="space-y-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <span className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Point Gain Formulas (% of spend)
                  </span>

                  {/* Net Ex-showroom */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Vehicle Sales (Net Ex-Showroom)</span>
                      <span className="text-blue-400 font-bold">{logic.sales_net_ex_pct}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.1"
                      value={logic.sales_net_ex_pct}
                      onChange={(e) => setLogic({ ...logic, sales_net_ex_pct: parseFloat(e.target.value) })}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400">
                      ₹15,00,000 car sale delivers {Math.round((1500000 * logic.sales_net_ex_pct) / 100)} points.
                    </span>
                  </div>

                  {/* Service */}
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Service Visits & Maintenance</span>
                      <span className="text-emerald-400 font-bold">{logic.service_points_pct}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="5.0"
                      step="0.5"
                      value={logic.service_points_pct}
                      onChange={(e) => setLogic({ ...logic, service_points_pct: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400">
                      ₹10,000 service bill delivers {Math.round((10000 * logic.service_points_pct) / 100)} points.
                    </span>
                  </div>

                  {/* Bodyshop */}
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Bodyshop & Insurance Repairs</span>
                      <span className="text-amber-400 font-bold">{logic.bodyshop_points_pct}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="4.0"
                      step="0.5"
                      value={logic.bodyshop_points_pct}
                      onChange={(e) => setLogic({ ...logic, bodyshop_points_pct: parseFloat(e.target.value) })}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  {/* Accessories */}
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Accessories & Spares</span>
                      <span className="text-purple-400 font-bold">{logic.accessories_points_pct}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="5.0"
                      step="0.5"
                      value={logic.accessories_points_pct}
                      onChange={(e) => setLogic({ ...logic, accessories_points_pct: parseFloat(e.target.value) })}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Conversion Valuation & Lock-in */}
                <div className="space-y-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <span className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Valuation & Lock-in Governance
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 block font-bold mb-1">
                        Valuation (₹ per point)
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        value={logic.points_to_inr_ratio}
                        onChange={(e) => setLogic({ ...logic, points_to_inr_ratio: parseFloat(e.target.value) || 0.25 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400 block mt-1">
                        {Math.round(1 / (logic.points_to_inr_ratio || 0.25))} pts = ₹1.00 cash
                      </span>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block font-bold mb-1">
                        Lock-in Period (Months)
                      </label>
                      <input
                        type="number"
                        value={logic.lock_in_months}
                        onChange={(e) => setLogic({ ...logic, lock_in_months: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400 block mt-1">Points unlock after {logic.lock_in_months}m</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="text-[10px] text-slate-400 block font-bold mb-1">Points Expiry Rule</label>
                    <select
                      value={logic.expiry_policy}
                      onChange={(e) => setLogic({ ...logic, expiry_policy: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="FIFO_12_MONTHS">FIFO 12-Month Expiry (Rolling)</option>
                      <option value="FIFO_24_MONTHS">FIFO 24-Month Expiry</option>
                      <option value="NO_EXPIRY">Points Never Expire</option>
                    </select>
                  </div>
                </div>

                {/* Bill Correction Controls */}
                <div className="space-y-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs block">Bill Correction Workflow</span>
                      <span className="text-[10px] text-slate-400">Allows cashiers to request bill corrections</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLogic({ ...logic, bill_correction_enabled: !logic.bill_correction_enabled })}
                      className={`w-10 h-5 rounded-full transition relative p-0.5 ${
                        logic.bill_correction_enabled ? 'bg-amber-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 rounded-full bg-white transition transform ${
                          logic.bill_correction_enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {logic.bill_correction_enabled && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/60">
                      <div>
                        <label className="text-[10px] text-slate-400 block font-bold mb-1">Time Window</label>
                        <select
                          value={logic.bill_correction_window_hours}
                          onChange={(e) => setLogic({ ...logic, bill_correction_window_hours: parseInt(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                        >
                          <option value="24">24 Hours</option>
                          <option value="48">48 Hours</option>
                          <option value="72">72 Hours</option>
                          <option value="168">7 Days</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block font-bold mb-1">Manager Sign-off</label>
                        <input
                          type="number"
                          value={logic.manager_approval_threshold}
                          onChange={(e) => setLogic({ ...logic, manager_approval_threshold: parseInt(e.target.value) || 0 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                          placeholder="₹5,000"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════ */}
            {/* TAB 5: PRIORITY TIER SLABS                          */}
            {/* ═══════════════════════════════════════════════════ */}
            {inspectorTab === 'tiers' && (
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>Customer Priority Tiers</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Set tier thresholds, multipliers, and perks for Silver, Gold, and Diamond members.
                  </p>
                </div>

                <div className="space-y-3">
                  {tiers.map((t, idx) => (
                    <div key={idx} className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-white text-xs flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.badge_color }} />
                          {t.tier}
                        </span>
                        <span className="text-[11px] font-bold text-amber-400">{t.multiplier}x Multiplier</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <label className="text-[10px] text-slate-400 block font-bold">Spend Threshold</label>
                          <input
                            type="number"
                            value={t.threshold}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setTiers(tiers.map((item, i) => (i === idx ? { ...item, threshold: val } : item)));
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block font-bold">Points Multiplier</label>
                          <input
                            type="number"
                            step="0.1"
                            value={t.multiplier}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 1.0;
                              setTiers(tiers.map((item, i) => (i === idx ? { ...item, multiplier: val } : item)));
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block font-bold">Tier Perks Description</label>
                        <input
                          type="text"
                          value={t.perks}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTiers(tiers.map((item, i) => (i === idx ? { ...item, perks: val } : item)));
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ─── RIGHT: CENTER CANVAS (LIVE RESPONSIVE STAGE) ─── */}
        <main className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-3 sm:p-6 overflow-y-auto relative">
          {/* Subtle Grid dots background */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #60a5fa 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Viewport Frame Container */}
          <div
            className={`transition-all duration-300 ease-out flex flex-col shadow-2xl relative z-10 overflow-hidden ${
              viewport === 'mobile'
                ? 'w-[375px] h-[780px] rounded-[44px] border-[10px] border-slate-800 bg-white ring-1 ring-slate-700 shadow-blue-950/40'
                : viewport === 'tablet'
                ? 'w-[768px] h-[820px] rounded-[32px] border-[10px] border-slate-800 bg-white ring-1 ring-slate-700 shadow-blue-950/40'
                : 'w-full max-w-[1240px] h-[840px] rounded-2xl border border-slate-800 bg-white shadow-2xl'
            }`}
          >
            {/* Mobile / Tablet Dynamic Island / Bezel Notch */}
            {viewport === 'mobile' && (
              <div className="h-6 bg-slate-900 flex items-center justify-between px-6 pt-1 select-none shrink-0 z-30">
                <span className="text-[10px] font-bold text-white">9:41</span>
                <div className="w-20 h-3.5 bg-black rounded-full" />
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[9px] font-bold text-white">5G</span>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* SIMULATED LIVE LOYALTY APP (FRONTEND FUNCTIONALITY)       */}
            {/* ══════════════════════════════════════════════════════════ */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 text-slate-800 select-text">
              {/* Dealership Live Header */}
              <header
                className="px-4 py-2.5 text-white flex items-center justify-between shadow-xs transition-colors shrink-0"
                style={{ backgroundColor: theme.primary_color }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 bg-white rounded-lg p-0.5 flex items-center justify-center shrink-0 shadow-xs">
                    <img
                      src={theme.logo_url || '/bellad-logo.png'}
                      alt="Logo"
                      className="w-full h-full object-contain"
                      onError={(e) => (e.target.src = '/bellad-logo.png')}
                    />
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-extrabold text-sm tracking-tight truncate leading-tight">
                      {theme.dealership_name}
                    </h1>
                    <span className="text-[10px] opacity-90 truncate block">{theme.tagline}</span>
                  </div>
                </div>

                {/* Header Action Buttons (Rendered according to Buttons Studio!) */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {buttons
                    .filter((b) => b.enabled && b.placement === 'header')
                    .map((btn) => {
                      const isAmber = btn.color === 'amber';
                      const isEmerald = btn.color === 'emerald';
                      const isSlate = btn.color === 'slate';

                      return (
                        <button
                          key={btn.id}
                          onClick={() => {
                            if (btn.action_type === 'open_receipt_modal') setReceiptModalOpen(true);
                            else if (btn.action_type === 'open_bill_correction_modal') setCorrectionModalOpen(true);
                            else if (btn.action_type === 'open_redemption_modal') setRedemptionModalOpen(true);
                            else if (btn.action_type === 'sync_appsheet')
                              showNotification('🔄 Cloud AppSheet bi-directional sync executed.');
                          }}
                          className={`flex items-center gap-1 px-2.5 py-1.5 font-bold text-[11px] rounded-lg transition shadow-xs ${
                            btn.style === 'solid'
                              ? isEmerald
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : isAmber
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold'
                                : 'bg-white text-slate-900 hover:bg-slate-100'
                              : 'border border-white/40 text-white hover:bg-white/10'
                          }`}
                        >
                          {renderIcon(btn.icon, 'w-3 h-3')}
                          <span>{btn.label}</span>
                        </button>
                      );
                    })}
                </div>
              </header>

              {/* Sub-header Tabs & Search bar */}
              <div className="flex flex-1 overflow-hidden">
                {/* Live Sidebar Navigation (Desktop & Tablet) */}
                {viewport !== 'mobile' && (
                  <nav className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto p-2 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                      Menu Navigation
                    </span>
                    {tabs
                      .filter((t) => t.visible)
                      .map((tab) => {
                        const isActive = previewActiveTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setPreviewActiveTab(tab.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg text-left transition ${
                              isActive
                                ? 'text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                            style={{
                              backgroundColor: isActive ? theme.primary_color : 'transparent',
                            }}
                          >
                            {renderIcon(tab.icon, 'w-4 h-4 shrink-0')}
                            <span className="truncate">{tab.label}</span>
                          </button>
                        );
                      })}
                  </nav>
                )}

                {/* Main Content Pane inside Device Stage */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
                  {/* TAB VIEW 1: CUSTOMER SEARCH & 360 */}
                  {previewActiveTab === 'dashboard' && (
                    <div className="space-y-4">
                      {/* Search Bar */}
                      <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                        <Search className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          readOnly
                          value="Rahul Sharma · 98888 77777 · KA-25-EA-8899"
                          className="w-full text-xs font-semibold text-slate-700 bg-transparent focus:outline-none"
                        />
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                          Active Member
                        </span>
                      </div>

                      {/* Customer Loyalty 360 Card (Dynamic Primary Color & Radius) */}
                      <div
                        className={`p-4 sm:p-5 text-white shadow-lg transition-all ${theme.card_radius}`}
                        style={{
                          background: `linear-gradient(135deg, ${theme.primary_color} 0%, ${theme.secondary_color} 100%)`,
                        }}
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-white/20">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-base sm:text-lg">{testCustomer.name}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-400 text-slate-900 shadow-xs">
                                {testCustomer.tier}
                              </span>
                            </div>
                            <span className="text-xs opacity-90">{testCustomer.vehicle} ({testCustomer.chassis})</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">
                              Total Balance
                            </span>
                            <span className="text-xl sm:text-2xl font-black">{testCustomer.points_balance} PTS</span>
                          </div>
                        </div>

                        {/* Point Slabs details */}
                        <div className="grid grid-cols-3 gap-2 pt-3 text-[11px]">
                          <div>
                            <span className="opacity-80 block text-[10px]">Available to Redeem</span>
                            <span className="font-extrabold text-sm">{testCustomer.available_points} PTS</span>
                            <span className="text-[10px] opacity-75 block">
                              = ₹{(testCustomer.available_points * (logic.points_to_inr_ratio || 0.25)).toFixed(0)} Cash
                            </span>
                          </div>

                          <div>
                            <span className="opacity-80 block text-[10px]">Lock-in Period</span>
                            <span className="font-extrabold text-sm">{testCustomer.locked_points} PTS</span>
                            <span className="text-[10px] opacity-75 block">{logic.lock_in_months} months policy</span>
                          </div>

                          <div>
                            <span className="opacity-80 block text-[10px]">Expiry Policy</span>
                            <span className="font-extrabold text-sm">12M FIFO</span>
                            <span className="text-[10px] opacity-75 block">{logic.expiry_policy}</span>
                          </div>
                        </div>

                        {/* Customer Card Action Buttons (Configured in Buttons Studio) */}
                        <div className="flex flex-wrap gap-2 pt-4 border-t border-white/20 mt-3">
                          {buttons
                            .filter((b) => b.enabled && b.placement === 'customer_card')
                            .map((btn) => (
                              <button
                                key={btn.id}
                                onClick={() => {
                                  if (btn.action_type === 'open_redemption_modal') setRedemptionModalOpen(true);
                                  else if (btn.action_type === 'send_whatsapp')
                                    showNotification('📲 Digital WhatsApp Pass dispatched to Rahul Sharma (+91 98888 77777)');
                                  else if (btn.action_type === 'open_referral_modal')
                                    showNotification('👥 Referral lead registered for customer.');
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-lg transition backdrop-blur-xs"
                              >
                                {renderIcon(btn.icon, 'w-3.5 h-3.5')}
                                <span>{btn.label}</span>
                              </button>
                            ))}
                        </div>
                      </div>

                      {/* Live Policy Calculation Sandbox in Preview */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                            <Calculator className="w-3.5 h-3.5 text-blue-600" />
                            <span>Live Transaction Rule Simulator</span>
                          </span>
                          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Auto-Synched with Rules
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="text-[10px] text-slate-500 font-bold block mb-1">Spend Category</label>
                            <select
                              value={testSpendType}
                              onChange={(e) => setTestSpendType(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                            >
                              <option value="sale">Vehicle Sale ({logic.sales_net_ex_pct}%)</option>
                              <option value="service">Service & Repair ({logic.service_points_pct}%)</option>
                              <option value="bodyshop">Bodyshop & Insurance ({logic.bodyshop_points_pct}%)</option>
                              <option value="accessories">Accessories & VAS ({logic.accessories_points_pct}%)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 font-bold block mb-1">Invoice Value (₹)</label>
                            <input
                              type="number"
                              value={testSpendAmount}
                              onChange={(e) => setTestSpendAmount(Number(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Calculated Earn Preview Box */}
                        <div className="p-3 bg-blue-50/80 rounded-lg border border-blue-200 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-blue-700 font-bold block">Calculated Points Earned</span>
                            <span className="text-base font-black text-blue-900">+{calculatedPoints} PTS</span>
                          </div>
                          <button
                            onClick={() => {
                              setTestCustomer({
                                ...testCustomer,
                                points_balance: testCustomer.points_balance + calculatedPoints,
                                available_points: testCustomer.available_points + calculatedPoints,
                              });
                              showNotification(`✅ Added +${calculatedPoints} PTS to ${testCustomer.name}`);
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg shadow-xs transition"
                          >
                            Apply Points
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB VIEW 2: BILL CORRECTION QUEUE PREVIEW */}
                  {previewActiveTab === 'corrections_queue' && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div>
                          <span className="font-extrabold text-xs text-slate-800 block">
                            Manager Bill Correction Queue
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Cashier entered wrong bills can be reviewed & corrected by Manager.
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          Window: {logic.bill_correction_window_hours}h
                        </span>
                      </div>

                      <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs text-slate-900 block">
                            Invoice #INV-2026-9041 · Rahul Sharma
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Requested by Cashier BLR-01 · Mistaken Amount: ₹18,500 (Actual: ₹12,500)
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => showNotification('Correction bill approved by Manager')}
                            className="px-2.5 py-1 bg-emerald-600 text-white font-bold text-[11px] rounded"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => showNotification('Correction bill rejected')}
                            className="px-2.5 py-1 bg-slate-200 text-slate-700 font-bold text-[11px] rounded"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB VIEW 3: CUSTOMER REDEMPTIONS PREVIEW */}
                  {previewActiveTab === 'customer_redemptions' && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-extrabold text-xs text-slate-800">Redemption & Discount Counter</span>
                        <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded">
                          Cap: {logic.max_redemption_pct}% of bill
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <label className="text-[10px] text-slate-500 font-bold block">Enter Points to Burn</label>
                        <input
                          type="number"
                          value={redeemInputPoints}
                          onChange={(e) => setRedeemInputPoints(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold"
                        />
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-purple-700 font-bold block">Rupee Discount</span>
                            <span className="text-base font-black text-purple-900">₹{calculatedRupeeValue} Cash</span>
                          </div>
                          <button
                            onClick={() => showNotification(`Voucher for ₹${calculatedRupeeValue} created`)}
                            className="px-3 py-1.5 bg-purple-600 text-white font-bold text-xs rounded-lg"
                          >
                            Generate Voucher
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* OTHER CUSTOM TABS PLACEHOLDER */}
                  {!['dashboard', 'corrections_queue', 'customer_redemptions'].includes(previewActiveTab) && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 text-center space-y-2">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <h3 className="font-black text-sm text-slate-900">
                        {tabs.find((t) => t.id === previewActiveTab)?.label || 'Custom Tab View'}
                      </h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        This view is fully integrated with your loyalty database and staff permission roles.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Bottom Navigation Bar (When viewport === 'mobile') */}
              {viewport === 'mobile' && (
                <nav className="h-14 bg-white border-t border-slate-200 flex items-center justify-around px-2 shrink-0">
                  {tabs
                    .filter((t) => t.visible)
                    .slice(0, 4)
                    .map((tab) => {
                      const isActive = previewActiveTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setPreviewActiveTab(tab.id)}
                          className={`flex flex-col items-center justify-center py-1 transition ${
                            isActive ? 'text-blue-600 font-bold' : 'text-slate-400'
                          }`}
                        >
                          {renderIcon(tab.icon, 'w-4 h-4')}
                          <span className="text-[9px] mt-0.5 truncate max-w-[65px]">{tab.label}</span>
                        </button>
                      );
                    })}
                </nav>
              )}
            </div>

            {/* ─── LIVE INTERACTIVE MODALS INSIDE DEVICE STAGE ─── */}
            {/* Modal 1: Add Receipt Modal */}
            {receiptModalOpen && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-40">
                <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-2xl space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-emerald-600" />
                      <span>Add Spending Receipt</span>
                    </span>
                    <button onClick={() => setReceiptModalOpen(false)}>
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">Invoice Number</label>
                      <input
                        type="text"
                        defaultValue="INV-2026-9912"
                        className="w-full border rounded p-1.5 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">Spend Category</label>
                      <select
                        value={testSpendType}
                        onChange={(e) => setTestSpendType(e.target.value)}
                        className="w-full border rounded p-1.5 text-xs font-semibold"
                      >
                        <option value="sale">Vehicle Sale ({logic.sales_net_ex_pct}%)</option>
                        <option value="service">Service ({logic.service_points_pct}%)</option>
                        <option value="bodyshop">Bodyshop ({logic.bodyshop_points_pct}%)</option>
                        <option value="accessories">Accessories ({logic.accessories_points_pct}%)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">Invoice Amount (₹)</label>
                      <input
                        type="number"
                        value={testSpendAmount}
                        onChange={(e) => setTestSpendAmount(Number(e.target.value))}
                        className="w-full border rounded p-1.5 text-xs font-semibold"
                      />
                    </div>
                    <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-center">
                      <span className="text-[10px] text-emerald-800 font-bold block">Calculated Reward</span>
                      <span className="text-base font-black text-emerald-900">+{calculatedPoints} Points</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setReceiptModalOpen(false)}
                      className="flex-1 py-1.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setReceiptModalOpen(false);
                        setTestCustomer({
                          ...testCustomer,
                          points_balance: testCustomer.points_balance + calculatedPoints,
                          available_points: testCustomer.available_points + calculatedPoints,
                        });
                        showNotification(`Receipt logged! +${calculatedPoints} PTS credited.`);
                      }}
                      className="flex-1 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-lg"
                    >
                      Confirm Bill
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal 2: Bill Correction Modal */}
            {correctionModalOpen && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-40">
                <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-2xl space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span>Request Bill Correction</span>
                    </span>
                    <button onClick={() => setCorrectionModalOpen(false)}>
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <p className="text-[11px] text-slate-500">
                      Submit wrong bill details for Branch Manager approval (Window: {logic.bill_correction_window_hours}h).
                    </p>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">Original Invoice Number</label>
                      <input
                        type="text"
                        defaultValue="INV-2026-8802"
                        className="w-full border rounded p-1.5 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">Reason for Correction</label>
                      <textarea
                        rows={2}
                        defaultValue="Wrong part number billed by cashier error"
                        className="w-full border rounded p-1.5 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setCorrectionModalOpen(false)}
                      className="flex-1 py-1.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setCorrectionModalOpen(false);
                        showNotification('Bill correction submitted to Manager queue.');
                      }}
                      className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold text-xs rounded-lg"
                    >
                      Submit for Correction
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal 3: Redemption Discount Modal */}
            {redemptionModalOpen && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-40">
                <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-2xl space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Redeem Points for Invoice Discount</span>
                    </span>
                    <button onClick={() => setRedemptionModalOpen(false)}>
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 bg-indigo-50 rounded border border-indigo-200">
                      <span className="text-[10px] text-indigo-800 font-bold block">Available Balance</span>
                      <span className="text-sm font-black text-indigo-950">
                        {testCustomer.available_points} PTS (= ₹
                        {(testCustomer.available_points * (logic.points_to_inr_ratio || 0.25)).toFixed(2)})
                      </span>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">Points to Redeem</label>
                      <input
                        type="number"
                        value={redeemInputPoints}
                        onChange={(e) => setRedeemInputPoints(Number(e.target.value))}
                        className="w-full border rounded p-1.5 text-xs font-bold"
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <span>Instant Cash Value:</span>
                      <span className="text-emerald-600 font-extrabold text-sm">₹{calculatedRupeeValue}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setRedemptionModalOpen(false)}
                      className="flex-1 py-1.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setRedemptionModalOpen(false);
                        setTestCustomer({
                          ...testCustomer,
                          points_balance: Math.max(0, testCustomer.points_balance - redeemInputPoints),
                          available_points: Math.max(0, testCustomer.available_points - redeemInputPoints),
                        });
                        showNotification(`Discount of ₹${calculatedRupeeValue} applied to invoice!`);
                      }}
                      className="flex-1 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-lg"
                    >
                      Redeem Discount
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
