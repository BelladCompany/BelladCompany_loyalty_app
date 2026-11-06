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
  AlertTriangle,
  MoveUp,
  MoveDown,
  Copy,
  Layout,
  Maximize2
} from 'lucide-react';
import ApiService from '../services/api';

/**
 * Dealerships Catalog
 */
const DEALERSHIPS_CATALOG = [
  { id: 'trident_automobiles', name: 'Trident Automobiles', brands: 'Hyundai, BharatBenz & Multi-Brand', city: 'Bengaluru Metro', logo: '/trident-logo.svg', primary: '#0284c7', secondary: '#0369a1' },
  { id: 'bellad_and_company', name: 'Bellad & Company', brands: 'Tata Motors & MG Motors', city: 'Hubballi / Belagavi', logo: '/bellad-logo.png', primary: '#1e40af', secondary: '#3b82f6' },
  { id: 'sprint_hero', name: 'Sprint Moto Club', brands: 'Hero MotoCorp & EV', city: 'Hubballi / Belagavi', logo: '/hero-logo.svg', primary: '#dc2626', secondary: '#ef4444' },
  { id: 'advaith_motors', name: 'Advaith Motors', brands: 'Advaith Auto Group', city: 'Bengaluru / Mysuru', logo: '/bellad-logo.png', primary: '#059669', secondary: '#10b981' },
];

/**
 * 5 Test Customers for Search & 360
 */
const TEST_CUSTOMERS = [
  {
    id: 'cust_1',
    name: 'Rahul Sharma',
    phone: '98888 77777',
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

/**
 * Standard Available Blocks Catalog (Drag/Click to Add to Canvas)
 */
const AVAILABLE_BLOCKS_CATALOG = [
  {
    type: 'brand_header',
    category: 'Header & Layout',
    name: 'Dealership Navbar Header',
    description: 'Logo, Brand Title, Tagline & Role status bar',
    icon: Layout,
    defaultProps: {
      dealership_name: 'Trident Automobiles',
      tagline: 'Authorised Multi-Brand & Premium Mobility Partner',
      logo_url: '/trident-logo.svg',
      bg_color: '#0284c7',
    }
  },
  {
    type: 'customer_search_bar',
    category: 'Cashier POS & Search',
    name: 'Customer Lookup & Search Bar',
    description: 'Aadhaar / Mobile / Name / VIN search with real search button',
    icon: Search,
    defaultProps: {
      title: 'Customer Lookup & Identification',
      subtitle: 'Search via 12-digit Aadhaar Card, Customer Full Name, Mobile Phone, or Vehicle VIN',
      placeholder: 'Search Aadhaar, Name, Mobile or VIN...',
      button_text: 'Search',
      button_color: 'indigo',
    }
  },
  {
    type: 'customer_360_card',
    category: 'Cashier POS & Search',
    name: 'Customer 360 Loyalty Card',
    description: 'Tier badge, Points balance, Available / Locked points, Vehicle details',
    icon: Sparkles,
    defaultProps: {
      primary_color: '#0284c7',
      secondary_color: '#0369a1',
      card_radius: 'rounded-2xl',
      show_locked: true,
    }
  },
  {
    type: 'cashier_action_buttons',
    category: 'Cashier POS & Search',
    name: 'Cashier Action Buttons Group',
    description: 'Add Receipt, Bill Correction, Redeem Discount, WhatsApp Pass',
    icon: Sparkles,
    defaultProps: {
      add_receipt_label: 'Add Receipt',
      add_receipt_color: 'emerald',
      bill_correction_label: 'Bill Correction',
      bill_correction_color: 'amber',
      redeem_label: 'Redeem Discount',
      redeem_color: 'indigo',
      whatsapp_label: 'Send WhatsApp Pass',
      whatsapp_color: 'emerald',
    }
  },
  {
    type: 'customer_ledger_table',
    category: 'Cashier POS & Search',
    name: 'Recent Points Activity Ledger',
    description: 'Invoices, Spend amount, Points earned, Points redeemed, Balance',
    icon: History,
    defaultProps: {
      title: 'Recent Points Activity Ledger',
      show_dates: true,
    }
  },
  {
    type: 'manager_corrections_queue',
    category: 'Managerial & Approvals',
    name: 'Manager Bill Correction Queue',
    description: 'Review wrong bills entered by cashier with Approve / Reject actions',
    icon: FileText,
    defaultProps: {
      title: 'Branch Manager Bill Correction Queue',
      window_hours: 24,
      approval_limit: 5000,
    }
  },
  {
    type: 'kyc_approvals_queue',
    category: 'Managerial & Approvals',
    name: 'Customer KYC Verification Queue',
    description: 'Review uploaded RC books and customer document status',
    icon: ShieldCheck,
    defaultProps: {
      title: 'Pending Customer KYC Verifications',
    }
  },
  {
    type: 'director_gauges',
    category: 'Executive Suite',
    name: 'Director Radial Speedometer Gauges',
    description: 'Burn Rate %, Customer Footfall, Invoiced Cash Inflow',
    icon: Crown,
    defaultProps: {
      burn_rate: '18.4%',
      footfall: '4,912',
      invoiced_cash: '₹8.4 Cr',
    }
  },
  {
    type: 'branch_performance_matrix',
    category: 'Executive Suite',
    name: 'Branch Network Performance Slabs',
    description: 'Branch-wise points multipliers and monthly redemption budgets',
    icon: Building2,
    defaultProps: {
      title: 'Branch Network Performance Breakdown',
    }
  },
  {
    type: 'portal_hero_banner',
    category: 'Customer Portal',
    name: 'Customer Portal Privilege Hero',
    description: 'Customer welcome headline, subtitle, and live portal link',
    icon: Globe,
    defaultProps: {
      hero_title: 'Trident Privilege Club Portal',
      hero_subtitle: 'Exclusive member rewards, complimentary vehicle inspections, and service point redemptions.',
    }
  },
  {
    type: 'db_connector_block',
    category: 'Database & Integrations',
    name: 'Database Connection Manager',
    description: 'PostgreSQL / Supabase host, port, credentials & test connection',
    icon: Database,
    defaultProps: {
      db_type: 'postgres',
      db_host: 'aws-0-ap-south-1.pooler.supabase.com',
      db_name: 'loyalty_trident_db',
    }
  },
  {
    type: 'appsheet_sync_block',
    category: 'Database & Integrations',
    name: 'Google Sheets / AppSheet Cloud Sync',
    description: 'Bi-directional cloud sync with dealership Google Sheets',
    icon: Link2,
    defaultProps: {
      app_id: 'trident-crm-sync',
    }
  }
];

/**
 * Full Bellad Loyalty Blueprint Template (Default layout of the real app)
 */
const BELLAD_LOYALTY_BLUEPRINT = [
  { id: 'blk_1', type: 'brand_header', props: { dealership_name: 'Bellad & Company', tagline: 'Tata Motors & MG Motors Authorised Dealership Group', logo_url: '/bellad-logo.png', bg_color: '#1e40af' } },
  { id: 'blk_2', type: 'customer_search_bar', props: { title: 'Customer Lookup & Identification', subtitle: 'Search via 12-digit Aadhaar Card, Customer Full Name, Mobile Phone, or Vehicle VIN', placeholder: 'Search Aadhaar, Name, Mobile or VIN...', button_text: 'Search', button_color: 'indigo' } },
  { id: 'blk_3', type: 'customer_360_card', props: { primary_color: '#1e40af', secondary_color: '#3b82f6', card_radius: 'rounded-2xl', show_locked: true } },
  { id: 'blk_4', type: 'cashier_action_buttons', props: { add_receipt_label: 'Add Receipt', add_receipt_color: 'emerald', bill_correction_label: 'Bill Correction', bill_correction_color: 'amber', redeem_label: 'Redeem Discount', redeem_color: 'indigo', whatsapp_label: 'Send WhatsApp Pass', whatsapp_color: 'emerald' } },
  { id: 'blk_5', type: 'customer_ledger_table', props: { title: 'Recent Points Activity Ledger', show_dates: true } },
  { id: 'blk_6', type: 'manager_corrections_queue', props: { title: 'Branch Manager Bill Correction Queue', window_hours: 24, approval_limit: 5000 } },
  { id: 'blk_7', type: 'director_gauges', props: { burn_rate: '18.4%', footfall: '4,912', invoiced_cash: '₹8.4 Cr' } },
  { id: 'blk_8', type: 'db_connector_block', props: { db_type: 'postgres', db_host: 'aws-0-ap-south-1.pooler.supabase.com', db_name: 'loyalty_bellad_db' } }
];

export default function LoyaltyAppBuilder({ user, onExitToCounterApp }) {
  // ─── Builder Canvas State ───
  const [selectedTenant, setSelectedTenant] = useState(user?.tenant_id || 'trident_automobiles');
  const [viewport, setViewport] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [canvasBlocks, setCanvasBlocks] = useState(BELLAD_LOYALTY_BLUEPRINT);
  const [isPlainCanvas, setIsPlainCanvas] = useState(false);
  const [leftDrawerTab, setLeftDrawerTab] = useState('add_blocks'); // 'add_blocks' | 'settings' | 'integrations'
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // ─── Active Customer Search inside Canvas ───
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(TEST_CUSTOMERS[0]);

  // ─── Interactive Modals ───
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [testSpendType, setTestSpendType] = useState('service');
  const [testSpendAmount, setTestSpendAmount] = useState(12500);

  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionBills, setCorrectionBills] = useState([
    { id: 'c1', invoice: 'INV-2026-9041', customer: 'Rahul Sharma', mistake: '₹18,500', correct: '₹12,500', cashier: 'cashier1', status: 'pending' },
    { id: 'c2', invoice: 'INV-2026-9102', customer: 'Priya Patel', mistake: '₹14,500', correct: '₹11,000', cashier: 'cashier2', status: 'pending' }
  ]);

  const [redemptionModalOpen, setRedemptionModalOpen] = useState(false);
  const [redeemPointsInput, setRedeemPointsInput] = useState(1000);

  // ─── Save & Persistence ───
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
        if (Array.isArray(d.canvas_blocks) && d.canvas_blocks.length > 0) {
          setCanvasBlocks(d.canvas_blocks);
          setIsPlainCanvas(false);
        }
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

  // ─── Save Draft or Publish Live to DB ───
  const handleSave = async (publish = false) => {
    setIsSaving(true);
    setStatusMessage('Saving...');
    try {
      const payload = {
        tenant_id: selectedTenant,
        canvas_blocks: canvasBlocks,
        active_blueprint: isPlainCanvas ? 'custom_plain_canvas' : 'bellad_blueprint',
        is_published: publish ? true : isPublished,
      };

      await ApiService.saveAppBuilderConfig(selectedTenant, payload);
      setIsPublished(publish ? true : isPublished);
      setStatusMessage(publish ? 'Published' : 'Draft Saved');

      if (publish) {
        showToast('🚀 Configuration published live to loyalty database!');
      } else {
        showToast('💾 Draft layout saved.');
      }
    } catch (err) {
      setStatusMessage('Error');
      showToast(`Save failed: ${err.message}`, true);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Canvas Block Actions: Add, Move Up, Move Down, Delete ───
  const handleAddBlockToCanvas = (blockTemplate) => {
    const newBlock = {
      id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: blockTemplate.type,
      props: { ...blockTemplate.defaultProps },
    };
    setCanvasBlocks([...canvasBlocks, newBlock]);
    setSelectedBlockId(newBlock.id);
    setIsPlainCanvas(false);
    showToast(`Added "${blockTemplate.name}" to canvas.`);
  };

  const handleMoveBlock = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= canvasBlocks.length) return;
    const copy = [...canvasBlocks];
    const [moved] = copy.splice(index, 1);
    copy.splice(target, 0, moved);
    setCanvasBlocks(copy);
  };

  const handleDeleteBlock = (id) => {
    setCanvasBlocks(canvasBlocks.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
    showToast('Block removed from canvas.');
  };

  const handleClearToPlainCanvas = () => {
    if (window.confirm('Clear canvas to a 100% Plain Canvas? You can add blocks one by one.')) {
      setCanvasBlocks([]);
      setSelectedBlockId(null);
      setIsPlainCanvas(true);
      showToast('Canvas cleared to plain blank slate.');
    }
  };

  const handleLoadBelladBlueprint = () => {
    setCanvasBlocks(BELLAD_LOYALTY_BLUEPRINT);
    setIsPlainCanvas(false);
    setSelectedBlockId('blk_1');
    showToast('Loaded full Bellad Loyalty Blueprint template.');
  };

  // ─── Selected Block Property Editor ───
  const selectedBlock = useMemo(() => {
    return canvasBlocks.find((b) => b.id === selectedBlockId) || null;
  }, [canvasBlocks, selectedBlockId]);

  const updateBlockProps = (newProps) => {
    if (!selectedBlockId) return;
    setCanvasBlocks(
      canvasBlocks.map((b) =>
        b.id === selectedBlockId ? { ...b, props: { ...b.props, ...newProps } } : b
      )
    );
  };

  // ─── Filtered Block Catalog ───
  const categories = ['ALL', 'Header & Layout', 'Cashier POS & Search', 'Managerial & Approvals', 'Executive Suite', 'Customer Portal', 'Database & Integrations'];
  const filteredBlocks = useMemo(() => {
    if (selectedCategory === 'ALL') return AVAILABLE_BLOCKS_CATALOG;
    return AVAILABLE_BLOCKS_CATALOG.filter((b) => b.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f0f0f1] text-[#2c3338] overflow-hidden font-sans select-none">
      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. WORDPRESS TOP TOOLBAR                                   */}
      {/* ────────────────────────────────────────────────────────── */}
      <header className="h-[48px] bg-[#1d2327] text-[#c3c4c7] px-3 sm:px-4 flex items-center justify-between z-40 shrink-0 border-b border-[#2c3338]">
        {/* Left: WordPress Icon & Blueprint Mode */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#1d2327] font-black text-sm tracking-tighter shadow-xs cursor-pointer hover:bg-slate-100"
            title="WordPress App Builder"
          >
            W
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-xs text-white tracking-wide truncate max-w-[150px] sm:max-w-[200px]">
              {selectedTenant === 'trident_automobiles' ? 'Trident Automobiles' : 'Bellad & Company'}
            </span>
            <span className="text-[11px] text-[#8c8f94] hidden md:inline">› Visual Canvas Builder</span>
          </div>

          <div className="h-4 w-[1px] bg-[#3c434a] mx-1 hidden sm:block" />

          {/* Blueprint Mode Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearToPlainCanvas}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition ${
                isPlainCanvas
                  ? 'bg-amber-500 text-slate-900 border-amber-400 font-bold'
                  : 'bg-[#2c3338] text-[#c3c4c7] border-[#3c434a] hover:text-white'
              }`}
            >
              Plain Canvas
            </button>
            <button
              onClick={handleLoadBelladBlueprint}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition ${
                !isPlainCanvas
                  ? 'bg-[#2271b1] text-white border-[#2271b1]'
                  : 'bg-[#2c3338] text-[#c3c4c7] border-[#3c434a] hover:text-white'
              }`}
            >
              Load Bellad Blueprint
            </button>
          </div>
        </div>

        {/* Center: Device Viewports Switcher */}
        <div className="flex items-center gap-1 bg-[#2c3338] p-0.5 rounded border border-[#3c434a]">
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

        {/* Right: Save Draft & Publish */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#8c8f94] hidden lg:inline font-mono mr-1">
            {statusMessage}
          </span>

          <button
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="text-xs text-[#c3c4c7] hover:text-white font-medium px-2 py-1 transition hidden sm:inline"
          >
            Save draft
          </button>

          <button
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="bg-[#2271b1] hover:bg-[#135e96] text-white text-xs font-semibold px-3.5 py-1 rounded transition flex items-center gap-1.5 shadow-xs"
          >
            {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>Publish Live</span>
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
      {/* 2. MAIN WORKSPACE (LEFT BLOCK TRAY + CANVAS + INSPECTOR)   */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ─── LEFT: WORDPRESS BLOCK INSERT TRAY (+ Add Component) ─── */}
        <aside className="w-72 sm:w-80 bg-white border-r border-[#dcdcde] flex flex-col shrink-0 z-30 overflow-hidden shadow-xs">
          {/* Drawer Tabs */}
          <div className="flex border-b border-[#dcdcde] bg-[#f6f7f7] text-xs font-bold shrink-0">
            <button
              onClick={() => setLeftDrawerTab('add_blocks')}
              className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition ${
                leftDrawerTab === 'add_blocks'
                  ? 'border-[#2271b1] text-[#2271b1] bg-white'
                  : 'border-transparent text-[#50575e] hover:text-[#1d2327]'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Block</span>
            </button>
            <button
              onClick={() => setLeftDrawerTab('settings')}
              className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition ${
                leftDrawerTab === 'settings'
                  ? 'border-[#2271b1] text-[#2271b1] bg-white'
                  : 'border-transparent text-[#50575e] hover:text-[#1d2327]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Block Inspector</span>
            </button>
          </div>

          {/* TAB 1: ADD BLOCKS LIST */}
          {leftDrawerTab === 'add_blocks' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
              {/* Category Filter Pills */}
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-[#2271b1] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Block Cards List */}
              <div className="space-y-2">
                {filteredBlocks.map((blk) => {
                  const Icon = blk.icon;
                  return (
                    <div
                      key={blk.type}
                      className="p-2.5 border border-[#dcdcde] hover:border-[#2271b1] rounded-lg bg-[#f6f7f7] hover:bg-blue-50/40 transition flex items-center justify-between group cursor-pointer"
                      onClick={() => handleAddBlockToCanvas(blk)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded bg-white border border-[#dcdcde] flex items-center justify-center text-[#2271b1] shrink-0 group-hover:bg-[#2271b1] group-hover:text-white transition">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-[#1d2327] block truncate">{blk.name}</span>
                          <span className="text-[10px] text-[#8c8f94] block truncate">{blk.description}</span>
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-[#8c8f94] group-hover:text-[#2271b1] shrink-0 ml-1" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: BLOCK INSPECTOR (When a block is selected on Canvas) */}
          {leftDrawerTab === 'settings' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-[#50575e]">
              {selectedBlock ? (
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <span className="text-[10px] text-[#8c8f94] font-bold uppercase tracking-wider block">Selected Block</span>
                    <span className="font-extrabold text-sm text-[#1d2327] block capitalize">
                      {selectedBlock.type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Inspector for Brand Header */}
                  {selectedBlock.type === 'brand_header' && (
                    <div className="space-y-3">
                      <div>
                        <label className="font-bold text-[#1d2327] block mb-1">Dealership Name</label>
                        <input
                          type="text"
                          value={selectedBlock.props.dealership_name || ''}
                          onChange={(e) => updateBlockProps({ dealership_name: e.target.value })}
                          className="w-full border p-1.5 rounded text-xs text-[#1d2327]"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-[#1d2327] block mb-1">Tagline</label>
                        <input
                          type="text"
                          value={selectedBlock.props.tagline || ''}
                          onChange={(e) => updateBlockProps({ tagline: e.target.value })}
                          className="w-full border p-1.5 rounded text-xs text-[#1d2327]"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-[#1d2327] block mb-1">Header Background Color</label>
                        <input
                          type="color"
                          value={selectedBlock.props.bg_color || '#0284c7'}
                          onChange={(e) => updateBlockProps({ bg_color: e.target.value })}
                          className="w-8 h-8 rounded border cursor-pointer"
                        />
                      </div>
                      <div className="pt-2 border-t">
                        <label className="font-bold text-[#1d2327] block mb-1">Logo URL / Image</label>
                        <input
                          type="text"
                          value={selectedBlock.props.logo_url || ''}
                          onChange={(e) => updateBlockProps({ logo_url: e.target.value })}
                          className="w-full border p-1.5 rounded text-xs text-[#1d2327]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Inspector for Customer Search Bar */}
                  {selectedBlock.type === 'customer_search_bar' && (
                    <div className="space-y-3">
                      <div>
                        <label className="font-bold text-[#1d2327] block mb-1">Card Title</label>
                        <input
                          type="text"
                          value={selectedBlock.props.title || ''}
                          onChange={(e) => updateBlockProps({ title: e.target.value })}
                          className="w-full border p-1.5 rounded text-xs text-[#1d2327]"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-[#1d2327] block mb-1">Search Button Label</label>
                        <input
                          type="text"
                          value={selectedBlock.props.button_text || ''}
                          onChange={(e) => updateBlockProps({ button_text: e.target.value })}
                          className="w-full border p-1.5 rounded text-xs text-[#1d2327]"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-[#1d2327] block mb-1">Search Placeholder Text</label>
                        <input
                          type="text"
                          value={selectedBlock.props.placeholder || ''}
                          onChange={(e) => updateBlockProps({ placeholder: e.target.value })}
                          className="w-full border p-1.5 rounded text-xs text-[#1d2327]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Inspector for Customer 360 Card */}
                  {selectedBlock.type === 'customer_360_card' && (
                    <div className="space-y-3">
                      <div>
                        <label className="font-bold text-[#1d2327] block mb-1">Card Gradient Primary</label>
                        <input
                          type="color"
                          value={selectedBlock.props.primary_color || '#0284c7'}
                          onChange={(e) => updateBlockProps({ primary_color: e.target.value })}
                          className="w-8 h-8 rounded border cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-[#1d2327] block mb-1">Card Corner Radius</label>
                        <select
                          value={selectedBlock.props.card_radius || 'rounded-2xl'}
                          onChange={(e) => updateBlockProps({ card_radius: e.target.value })}
                          className="w-full border p-1.5 rounded text-xs text-[#1d2327]"
                        >
                          <option value="rounded-none">Crisp (0px)</option>
                          <option value="rounded-lg">Smooth (8px)</option>
                          <option value="rounded-2xl">Modern Curved (16px)</option>
                          <option value="rounded-3xl">Pill (24px)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Inspector for Cashier Action Buttons */}
                  {selectedBlock.type === 'cashier_action_buttons' && (
                    <div className="space-y-3">
                      <div>
                        <label className="font-bold text-[#1d2327] block mb-1">Add Receipt Label Text</label>
                        <input
                          type="text"
                          value={selectedBlock.props.add_receipt_label || ''}
                          onChange={(e) => updateBlockProps({ add_receipt_label: e.target.value })}
                          className="w-full border p-1.5 rounded text-xs text-[#1d2327]"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-[#1d2327] block mb-1">Bill Correction Label Text</label>
                        <input
                          type="text"
                          value={selectedBlock.props.bill_correction_label || ''}
                          onChange={(e) => updateBlockProps({ bill_correction_label: e.target.value })}
                          className="w-full border p-1.5 rounded text-xs text-[#1d2327]"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-[#1d2327] block mb-1">Redeem Discount Label Text</label>
                        <input
                          type="text"
                          value={selectedBlock.props.redeem_label || ''}
                          onChange={(e) => updateBlockProps({ redeem_label: e.target.value })}
                          className="w-full border p-1.5 rounded text-xs text-[#1d2327]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Inspector for DB Connector */}
                  {selectedBlock.type === 'db_connector_block' && (
                    <div className="space-y-3">
                      <div>
                        <label className="font-bold text-[#1d2327] block mb-1">PostgreSQL Host</label>
                        <input
                          type="text"
                          value={selectedBlock.props.db_host || ''}
                          onChange={(e) => updateBlockProps({ db_host: e.target.value })}
                          className="w-full border p-1.5 rounded text-xs text-[#1d2327] font-mono"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-[#1d2327] block mb-1">Database Name</label>
                        <input
                          type="text"
                          value={selectedBlock.props.db_name || ''}
                          onChange={(e) => updateBlockProps({ db_name: e.target.value })}
                          className="w-full border p-1.5 rounded text-xs text-[#1d2327]"
                        />
                      </div>
                      <button
                        onClick={() => showToast('✅ DB Connection Live & Ready')}
                        className="w-full py-1.5 bg-[#2271b1] text-white font-bold text-xs rounded"
                      >
                        Test Connection
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-[#8c8f94] space-y-2">
                  <Sliders className="w-8 h-8 mx-auto text-[#c3c4c7]" />
                  <span className="font-bold text-xs block text-[#1d2327]">No Block Selected</span>
                  <p className="text-[11px]">Click any block on the canvas to inspect and customize its properties.</p>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* ─── CENTER: THE LIVE CANVAS (PLAIN CANVA OR BLUEPRINT) ─── */}
        <main className="flex-1 bg-[#f0f0f1] flex flex-col items-center justify-start p-3 sm:p-6 overflow-y-auto">
          <div
            className={`transition-all duration-300 ease-out flex flex-col bg-white border border-[#dcdcde] shadow-lg rounded-xl overflow-hidden ${
              viewport === 'mobile'
                ? 'w-[375px] min-h-[780px] rounded-[36px] border-[8px] border-[#1d2327]'
                : viewport === 'tablet'
                ? 'w-[768px] min-h-[820px]'
                : 'w-full max-w-[1180px] min-h-[840px]'
            }`}
          >
            {/* If Canvas has no blocks (Plain Canvas) */}
            {canvasBlocks.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 my-auto">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <Plus className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-lg text-slate-900">Plain Canvas Ready</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    This is your blank slate. Click any block from the left tray to add it, or click "Load Bellad Blueprint" above to load the full app.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleAddBlockToCanvas(AVAILABLE_BLOCKS_CATALOG[0])}
                    className="px-4 py-2 bg-[#2271b1] hover:bg-[#135e96] text-white font-bold text-xs rounded-lg shadow-xs"
                  >
                    + Add Navbar Header
                  </button>
                  <button
                    onClick={handleLoadBelladBlueprint}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-xs"
                  >
                    Load Full Bellad Blueprint
                  </button>
                </div>
              </div>
            )}

            {/* RENDER CANVAS BLOCKS IN SEQUENTIAL ORDER */}
            {canvasBlocks.map((blk, idx) => {
              const isSelected = selectedBlockId === blk.id;

              return (
                <div
                  key={blk.id}
                  onClick={() => {
                    setSelectedBlockId(blk.id);
                    setLeftDrawerTab('settings');
                  }}
                  className={`relative group transition-all cursor-pointer ${
                    isSelected ? 'ring-2 ring-[#2271b1] z-20 shadow-md' : 'hover:ring-1 hover:ring-[#2271b1]/50'
                  }`}
                >
                  {/* Floating Block Toolbar on Hover / Select (WordPress style) */}
                  <div
                    className={`absolute right-3 -top-3.5 z-30 flex items-center gap-1 bg-[#1d2327] text-white px-2 py-0.5 rounded shadow-md text-[10px] font-bold ${
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    } transition`}
                  >
                    <span className="capitalize">{blk.type.replace(/_/g, ' ')}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMoveBlock(idx, -1); }}
                      disabled={idx === 0}
                      className="p-0.5 hover:text-blue-400 disabled:opacity-30"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMoveBlock(idx, 1); }}
                      disabled={idx === canvasBlocks.length - 1}
                      className="p-0.5 hover:text-blue-400 disabled:opacity-30"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteBlock(blk.id); }}
                      className="p-0.5 hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* ──────────────────────────────────────────────────────── */}
                  {/* BLOCK 1: BRAND HEADER                                    */}
                  {/* ──────────────────────────────────────────────────────── */}
                  {blk.type === 'brand_header' && (
                    <header
                      className="px-4 py-3 text-white flex items-center justify-between shadow-xs transition-colors"
                      style={{ backgroundColor: blk.props.bg_color || '#0284c7' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-10 bg-white rounded p-1 flex items-center justify-center shrink-0">
                          <img
                            src={blk.props.logo_url || '/trident-logo.svg'}
                            alt="Logo"
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => (e.target.src = '/trident-logo.svg')}
                          />
                        </div>
                        <div>
                          <h1 className="font-black text-sm tracking-tight truncate leading-tight">
                            {blk.props.dealership_name || 'Dealership Name'}
                          </h1>
                          <span className="text-[10px] opacity-90 truncate block">{blk.props.tagline}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20">
                        Live POS Counter
                      </span>
                    </header>
                  )}

                  {/* ──────────────────────────────────────────────────────── */}
                  {/* BLOCK 2: CUSTOMER SEARCH BAR (Exact Bellad Replica)      */}
                  {/* ──────────────────────────────────────────────────────── */}
                  {blk.type === 'customer_search_bar' && (
                    <div className="p-4 sm:p-5 bg-white border-b border-slate-100 space-y-3">
                      <div>
                        <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                          {blk.props.title || 'Customer Lookup & Identification'}
                        </h2>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {blk.props.subtitle}
                        </p>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          setIsSearching(true);
                          setTimeout(() => {
                            const match = TEST_CUSTOMERS.find((c) =>
                              c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              c.phone.includes(searchQuery)
                            );
                            if (match) setSelectedCustomer(match);
                            setIsSearching(false);
                            showToast(`Search complete: ${match ? match.name : 'Found test customer'}`);
                          }, 200);
                        }}
                        className="flex gap-2"
                      >
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder={blk.props.placeholder || 'Search Aadhaar, Name, Mobile or VIN...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 focus:border-[#2271b1] focus:bg-white text-xs sm:text-sm font-semibold text-slate-900 rounded-xl focus:outline-none shadow-2xs"
                          />
                        </div>
                        <button
                          type="submit"
                          className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Search className="w-4 h-4" />
                          <span>{isSearching ? 'Searching...' : (blk.props.button_text || 'Search')}</span>
                        </button>
                      </form>

                      {/* 5 Quick Test Customers */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {TEST_CUSTOMERS.map((cust) => (
                          <button
                            key={cust.id}
                            type="button"
                            onClick={() => setSelectedCustomer(cust)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                              selectedCustomer?.id === cust.id
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold shadow-2xs ring-1 ring-indigo-400'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span>{cust.name}</span>
                            <span className="text-[10px] text-slate-400 ml-1">({cust.phone})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ──────────────────────────────────────────────────────── */}
                  {/* BLOCK 3: CUSTOMER 360 LOYALTY CARD                       */}
                  {/* ──────────────────────────────────────────────────────── */}
                  {blk.type === 'customer_360_card' && (
                    <div className="p-4 sm:p-5">
                      <div
                        className={`p-5 text-white shadow-lg transition-all ${blk.props.card_radius || 'rounded-2xl'}`}
                        style={{
                          background: `linear-gradient(135deg, ${blk.props.primary_color || '#0284c7'} 0%, ${blk.props.secondary_color || '#0369a1'} 100%)`,
                        }}
                      >
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-3 border-b border-white/20 gap-2">
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
                              Total Balance
                            </span>
                            <span className="text-2xl sm:text-3xl font-black">{selectedCustomer.points_balance?.toLocaleString()} PTS</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-3 text-[11px]">
                          <div>
                            <span className="opacity-80 block text-[10px]">Available to Redeem</span>
                            <span className="font-extrabold text-sm">{selectedCustomer.available_points?.toLocaleString()} PTS</span>
                            <span className="text-[10px] opacity-75 block">= ₹{(selectedCustomer.available_points * 0.25).toFixed(0)} Cash</span>
                          </div>
                          <div>
                            <span className="opacity-80 block text-[10px]">Locked Points</span>
                            <span className="font-extrabold text-sm">{selectedCustomer.locked_points?.toLocaleString()} PTS</span>
                            <span className="text-[10px] opacity-75 block">12m lock-in</span>
                          </div>
                          <div>
                            <span className="opacity-80 block text-[10px]">Lifetime Spend</span>
                            <span className="font-extrabold text-sm">₹{(selectedCustomer.lifetime_spend / 100000).toFixed(1)} L</span>
                            <span className="text-[10px] opacity-75 block">Verified KYC</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ──────────────────────────────────────────────────────── */}
                  {/* BLOCK 4: CASHIER ACTION BUTTONS GROUP                    */}
                  {/* ──────────────────────────────────────────────────────── */}
                  {blk.type === 'cashier_action_buttons' && (
                    <div className="px-4 sm:px-5 pb-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setReceiptModalOpen(true)}
                          className="px-3.5 py-1.5 font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{blk.props.add_receipt_label || 'Add Receipt'}</span>
                        </button>

                        <button
                          onClick={() => setCorrectionModalOpen(true)}
                          className="px-3.5 py-1.5 font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{blk.props.bill_correction_label || 'Bill Correction'}</span>
                        </button>

                        <button
                          onClick={() => setRedemptionModalOpen(true)}
                          className="px-3.5 py-1.5 font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{blk.props.redeem_label || 'Redeem Discount'}</span>
                        </button>

                        <button
                          onClick={() => showToast(`📲 WhatsApp pass sent to ${selectedCustomer.phone}`)}
                          className="px-3.5 py-1.5 font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>{blk.props.whatsapp_label || 'Send WhatsApp Pass'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ──────────────────────────────────────────────────────── */}
                  {/* BLOCK 5: RECENT POINTS ACTIVITY LEDGER                   */}
                  {/* ──────────────────────────────────────────────────────── */}
                  {blk.type === 'customer_ledger_table' && (
                    <div className="p-4 sm:p-5 pt-0">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                        <span className="font-bold text-xs text-slate-900 block">{blk.props.title || 'Recent Points Activity Ledger'}</span>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase">
                                <th className="py-2">Invoice #</th>
                                <th className="py-2">Date</th>
                                <th className="py-2">Transaction Type</th>
                                <th className="py-2">Spend</th>
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

                  {/* ──────────────────────────────────────────────────────── */}
                  {/* BLOCK 6: MANAGER BILL CORRECTION QUEUE                   */}
                  {/* ──────────────────────────────────────────────────────── */}
                  {blk.type === 'manager_corrections_queue' && (
                    <div className="p-4 sm:p-5">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex justify-between items-center border-b pb-2">
                          <span className="font-bold text-xs text-slate-900">{blk.props.title || 'Manager Bill Correction Queue'}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                            Window: {blk.props.window_hours || 24}h
                          </span>
                        </div>
                        <div className="space-y-2">
                          {correctionBills.map((c) => (
                            <div key={c.id} className="p-3 border rounded-lg bg-slate-50 flex justify-between items-center text-xs">
                              <div>
                                <span className="font-mono font-bold text-slate-900 block">{c.invoice} · {c.customer}</span>
                                <span className="text-[10px] text-slate-500">
                                  Mistake: <span className="line-through text-rose-500">{c.mistake}</span> → Correct: <span className="text-emerald-600 font-bold">{c.correct}</span>
                                </span>
                              </div>
                              <div className="flex gap-1.5">
                                <button onClick={() => showToast(`Approved ${c.invoice}`)} className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded text-[11px]">Approve</button>
                                <button onClick={() => showToast(`Rejected ${c.invoice}`)} className="px-2.5 py-1 bg-slate-200 text-slate-700 font-bold rounded text-[11px]">Reject</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ──────────────────────────────────────────────────────── */}
                  {/* BLOCK 7: DIRECTOR RADIAL SPEEDOMETER GAUGES              */}
                  {/* ──────────────────────────────────────────────────────── */}
                  {blk.type === 'director_gauges' && (
                    <div className="p-4 sm:p-5">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                        <span className="font-bold text-xs text-slate-900 block">Director Command Executive Suite</span>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <span className="text-[10px] text-blue-700 font-bold uppercase block">Burn Rate %</span>
                            <span className="text-xl font-black text-blue-900">{blk.props.burn_rate || '18.4%'}</span>
                          </div>
                          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                            <span className="text-[10px] text-emerald-700 font-bold uppercase block">Footfall</span>
                            <span className="text-xl font-black text-emerald-900">{blk.props.footfall || '4,912'}</span>
                          </div>
                          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <span className="text-[10px] text-purple-700 font-bold uppercase block">Invoiced Cash</span>
                            <span className="text-xl font-black text-purple-900">{blk.props.invoiced_cash || '₹8.4 Cr'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ──────────────────────────────────────────────────────── */}
                  {/* BLOCK 8: DATABASE CONNECTOR                              */}
                  {blk.type === 'db_connector_block' && (
                    <div className="p-4 sm:p-5">
                      <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-emerald-400" />
                          <span className="font-mono text-xs">{blk.props.db_host || 'PostgreSQL Database'}</span>
                        </div>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-500/40">
                          Connected Live
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Bottom Add Block Bar on Canvas */}
            {canvasBlocks.length > 0 && (
              <div className="p-4 text-center border-t border-dashed border-slate-300 bg-slate-50 mt-auto">
                <button
                  onClick={() => setLeftDrawerTab('add_blocks')}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded-lg shadow-2xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-[#2271b1]" />
                  <span>+ Add Another Block / Section to Canvas</span>
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ─── INTERACTIVE MODALS FOR CANVAS ─── */}
      {receiptModalOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white p-5 rounded-2xl max-w-sm w-full space-y-3 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-extrabold text-sm text-slate-900">Add Spend Receipt</span>
              <button onClick={() => setReceiptModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="space-y-2 text-xs">
              <input type="number" value={testSpendAmount} onChange={(e) => setTestSpendAmount(Number(e.target.value))} className="w-full border p-1.5 rounded font-bold" />
              <div className="p-2 bg-emerald-50 text-center font-bold text-emerald-950">+{Math.round(testSpendAmount * 0.025)} PTS</div>
            </div>
            <button
              onClick={() => {
                setReceiptModalOpen(false);
                setSelectedCustomer({
                  ...selectedCustomer,
                  points_balance: selectedCustomer.points_balance + Math.round(testSpendAmount * 0.025),
                  available_points: selectedCustomer.available_points + Math.round(testSpendAmount * 0.025),
                });
                showToast(`Logged receipt! +${Math.round(testSpendAmount * 0.025)} PTS credited.`);
              }}
              className="w-full py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-lg"
            >
              Confirm Bill
            </button>
          </div>
        </div>
      )}

      {correctionModalOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white p-5 rounded-2xl max-w-sm w-full space-y-3 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-extrabold text-sm text-slate-900">Request Bill Correction</span>
              <button onClick={() => setCorrectionModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <p className="text-[11px] text-slate-500">Sent to Manager Queue (Window: 24h)</p>
            <button onClick={() => { setCorrectionModalOpen(false); showToast('Bill correction submitted to Manager queue.'); }} className="w-full py-1.5 bg-amber-400 text-slate-900 font-extrabold text-xs rounded-lg">
              Submit Correction
            </button>
          </div>
        </div>
      )}

      {redemptionModalOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white p-5 rounded-2xl max-w-sm w-full space-y-3 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-extrabold text-sm text-slate-900">Redeem Points</span>
              <button onClick={() => setRedemptionModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <input type="number" value={redeemPointsInput} onChange={(e) => setRedeemPointsInput(Number(e.target.value))} className="w-full border p-1.5 rounded font-bold" />
            <div className="text-right text-xs font-bold text-emerald-600">Discount: ₹{(redeemPointsInput * 0.25).toFixed(2)}</div>
            <button
              onClick={() => {
                setRedemptionModalOpen(false);
                setSelectedCustomer({
                  ...selectedCustomer,
                  points_balance: Math.max(0, selectedCustomer.points_balance - redeemPointsInput),
                  available_points: Math.max(0, selectedCustomer.available_points - redeemPointsInput),
                });
                showToast(`Redeemed ${redeemPointsInput} PTS!`);
              }}
              className="w-full py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-lg"
            >
              Apply Discount
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
