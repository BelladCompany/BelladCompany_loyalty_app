import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Tag,
  Search,
  Filter,
  Car,
  Zap,
  Phone,
  MessageCircle,
  Copy,
  Check,
  Calendar,
  MapPin,
  ChevronRight,
  ExternalLink,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  ArrowLeft,
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import ApiService from '../services/api';

const BRAND_LOGOS = {
  'Tata Motors': '🚙',
  'MG Motors': '⚡',
  'Hero Moto Corp': '🏍️',
  'Ather Energy': '🔋',
  'Hyundai': '🚘',
  'All Brands': '🌟',
};

const CATEGORY_NAMES = {
  all: 'All Categories',
  suv: 'SUVs & Cars',
  ev: 'Electric Vehicles (EV)',
  bike_scooter: 'Bikes & Scooters',
  service: 'Service & Detailing',
  festive: 'Festive Specials',
};

export default function PublicOffersScreen() {
  const [offers, setOffers] = useState([]);
  const [meta, setMeta] = useState({ brands: [], models: [], branches: [], months: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtering states
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  // Admin / Management states
  const currentUser = ApiService.getUser();
  const isStaff = currentUser && ['admin', 'super_admin', 'director', 'branch_manager', 'manager'].includes(currentUser.role);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [savingOffer, setSavingOffer] = useState(false);

  // Form State for creating/editing offers
  const [formData, setFormData] = useState({
    brand_name: 'Tata Motors',
    model_name: '',
    category: 'new_vehicle',
    branch_name: 'All Branches',
    city: 'Hubli, Dharwad, Belgaum',
    title: '',
    benefit: '',
    description: '',
    highlights: '',
    code: '',
    valid_month: 'November 2026',
    valid_till: 'Valid till 30 Nov 2026',
    badge: 'MONTHLY SPECIAL',
    badge_color: 'bg-amber-500 text-slate-950 font-black',
    image_url: '',
    whatsapp_number: '918197348730',
    whatsapp_msg: '',
    is_active: true,
    priority: 0,
  });

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (includeInactive && isStaff) {
        params.includeInactive = 'true';
      }
      const res = await ApiService.getOffers(params);
      if (res.status === 'success' && res.data) {
        setOffers(res.data.offers || []);
        setMeta(res.data.meta || { brands: [], models: [], branches: [], months: [], categories: [] });
      }
    } catch (err) {
      console.error('Error fetching offers:', err);
      setError(err.message || 'Unable to load offers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [includeInactive, isStaff]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // Copy offer code helper
  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2500);
  };

  // Filtered offers list
  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      // Brand filter
      if (selectedBrand !== 'All') {
        const b = offer.brand_name?.toLowerCase() || '';
        const target = selectedBrand.toLowerCase();
        if (!b.includes(target) && !target.includes(b)) return false;
      }
      // Category filter
      if (selectedCategory !== 'all') {
        if (offer.category !== selectedCategory) return false;
      }
      // Branch filter
      if (selectedBranch !== 'All') {
        const branchMatch = (offer.branch_name || '').toLowerCase().includes(selectedBranch.toLowerCase());
        const isAllBranches = offer.branch_name === 'All Branches';
        const cityMatch = (offer.city || '').toLowerCase().includes(selectedBranch.toLowerCase());
        if (!branchMatch && !isAllBranches && !cityMatch) return false;
      }
      // Month filter
      if (selectedMonth !== 'All') {
        if (offer.valid_month !== selectedMonth) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = (offer.title || '').toLowerCase().includes(q);
        const inModel = (offer.model_name || '').toLowerCase().includes(q);
        const inBrand = (offer.brand_name || '').toLowerCase().includes(q);
        const inDesc = (offer.description || '').toLowerCase().includes(q);
        const inCode = (offer.code || '').toLowerCase().includes(q);
        if (!inTitle && !inModel && !inBrand && !inDesc && !inCode) return false;
      }
      return true;
    });
  }, [offers, selectedBrand, selectedCategory, selectedBranch, selectedMonth, searchQuery]);

  // Open modal for new offer
  const handleOpenCreateModal = () => {
    setEditingOffer(null);
    setFormData({
      brand_name: 'Tata Motors',
      model_name: '',
      category: 'new_vehicle',
      branch_name: 'All Branches',
      city: 'Hubli, Dharwad, Belgaum',
      title: '',
      benefit: '',
      description: '',
      highlights: '',
      code: `BELLAD-NOV-${Math.floor(100 + Math.random() * 900)}`,
      valid_month: 'November 2026',
      valid_till: 'Valid till 30 Nov 2026',
      badge: 'MONTHLY SPECIAL',
      badge_color: 'bg-amber-500 text-slate-950 font-black',
      image_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
      whatsapp_number: '918197348730',
      whatsapp_msg: 'Hi Bellad & Co, I am interested in this monthly dealership offer.',
      is_active: true,
      priority: 5,
    });
    setShowManageModal(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (offer) => {
    setEditingOffer(offer);
    const hl = Array.isArray(offer.highlights)
      ? offer.highlights.join('\n')
      : typeof offer.highlights === 'string'
      ? offer.highlights
      : '';

    setFormData({
      brand_name: offer.brand_name || 'Tata Motors',
      model_name: offer.model_name || '',
      category: offer.category || 'new_vehicle',
      branch_name: offer.branch_name || 'All Branches',
      city: offer.city || '',
      title: offer.title || '',
      benefit: offer.benefit || '',
      description: offer.description || '',
      highlights: hl,
      code: offer.code || '',
      valid_month: offer.valid_month || 'November 2026',
      valid_till: offer.valid_till || '',
      badge: offer.badge || 'MONTHLY SPECIAL',
      badge_color: offer.badge_color || 'bg-amber-500 text-slate-950 font-black',
      image_url: offer.image_url || '',
      whatsapp_number: offer.whatsapp_number || '918197348730',
      whatsapp_msg: offer.whatsapp_msg || '',
      is_active: offer.is_active ?? true,
      priority: offer.priority || 0,
    });
    setShowManageModal(true);
  };

  // Save offer (create or update)
  const handleSaveOffer = async (e) => {
    e.preventDefault();
    try {
      setSavingOffer(true);
      const hlArray = formData.highlights
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        ...formData,
        highlights: hlArray,
      };

      if (editingOffer) {
        await ApiService.updateOffer(editingOffer.offer_id, payload);
      } else {
        await ApiService.createOffer(payload);
      }

      setShowManageModal(false);
      setEditingOffer(null);
      await fetchOffers();
    } catch (err) {
      alert(`Error saving offer: ${err.message}`);
    } finally {
      setSavingOffer(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (offerId) => {
    try {
      await ApiService.toggleOffer(offerId);
      await fetchOffers();
    } catch (err) {
      alert(`Error toggling status: ${err.message}`);
    }
  };

  // Delete offer
  const handleDeleteOffer = async (offerId, title) => {
    if (!window.confirm(`Are you sure you want to delete the offer "${title}"?`)) {
      return;
    }
    try {
      await ApiService.deleteOffer(offerId);
      await fetchOffers();
    } catch (err) {
      alert(`Error deleting offer: ${err.message}`);
    }
  };

  // Unique brand pill list
  const brandPills = ['All', 'Tata Motors', 'MG Motors', 'Hero Moto Corp', 'Ather Energy'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white pb-16">
      
      {/* ─── Top Brand Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/portal"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-bold"
              title="Return to Customer Portal"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Portal</span>
            </a>
            <div className="h-5 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-black text-sm">
                B
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  Bellad & Co
                  <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Monthly Offers
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400 hidden sm:block">Official Dealership Model & Service Benefits</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isStaff && (
              <button
                onClick={handleOpenCreateModal}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-indigo-600/30"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Offer</span>
              </button>
            )}

            <a
              href="https://wa.me/918197348730?text=Hi%20Bellad%20%26%20Co%2C%20I%20would%20like%20to%20inquire%20about%20the%20latest%20monthly%20offers."
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">WhatsApp Help</span>
            </a>
          </div>
        </div>
      </header>

      {/* ─── Hero Headline & Dealership Overview ─────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900/80 to-slate-950 py-10 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),rgba(255,255,255,0))] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-700/50 text-indigo-300 text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Updated for November 2026 Dealership Schemes</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Exclusive Monthly Offers on <span className="bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-400 bg-clip-text text-transparent">Tata, MG, Hero & Ather</span>
          </h2>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Discover seasonal price discounts, exchange bonuses, loyalty reward multipliers, and complimentary fast chargers across all Bellad & Co branches in Karnataka.
          </p>

          {/* Quick Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 text-center">
              <span className="text-xl sm:text-2xl font-black text-amber-400">₹1.35L</span>
              <p className="text-[11px] text-slate-400 font-medium">Max Exchange Benefit</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 text-center">
              <span className="text-xl sm:text-2xl font-black text-emerald-400">0%</span>
              <p className="text-[11px] text-slate-400 font-medium">Karnataka EV Road Tax</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 text-center">
              <span className="text-xl sm:text-2xl font-black text-indigo-400">2X</span>
              <p className="text-[11px] text-slate-400 font-medium">Loyalty Reward Points</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 text-center">
              <span className="text-xl sm:text-2xl font-black text-cyan-400">40+</span>
              <p className="text-[11px] text-slate-400 font-medium">Dealership Outlets</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Brand Selector Tabs ────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 -mt-5 relative z-20">
        <div className="bg-slate-900/90 backdrop-blur-md p-1.5 sm:p-2 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {brandPills.map((brand) => {
            const isSelected = selectedBrand.toLowerCase() === brand.toLowerCase();
            return (
              <button
                key={brand}
                onClick={() => setSelectedBrand(brand)}
                className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30 scale-[1.02]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span>{BRAND_LOGOS[brand] || '🚘'}</span>
                <span>{brand}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Filter Bar: Search, Category, Branch, Month ─────────────────────── */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search model, offer or discount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer appearance-none"
            >
              <option value="all">All Categories</option>
              <option value="suv">SUVs & Cars</option>
              <option value="ev">Electric Vehicles (EV)</option>
              <option value="bike_scooter">Bikes & Scooters</option>
              <option value="service">Service & Detailing</option>
            </select>
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Branch / City Filter */}
          <div className="relative">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer appearance-none"
            >
              <option value="All">All Branches & Cities</option>
              <option value="Hubli">Hubli / Hubballi</option>
              <option value="Dharwad">Dharwad</option>
              <option value="Belgaum">Belgaum / Belagavi</option>
              <option value="Hospet">Hospet</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Bellary">Bellary</option>
              <option value="Gulbarga">Gulbarga</option>
              <option value="Raichur">Raichur</option>
              <option value="Gadag">Gadag</option>
            </select>
            <MapPin className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Month Filter */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer appearance-none"
            >
              <option value="All">All Months</option>
              <option value="November 2026">November 2026</option>
              <option value="December 2026">December 2026</option>
              <option value="October 2026">October 2026</option>
            </select>
            <Calendar className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Staff Toggle: Show Inactive */}
        {isStaff && (
          <div className="flex items-center justify-between mt-3 px-1 text-xs text-slate-400">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="rounded border-slate-700 text-indigo-600 focus:ring-0"
              />
              <span>Staff Mode: Show Draft / Inactive Offers</span>
            </label>
            <span>Total: {filteredOffers.length} offers</span>
          </div>
        )}
      </section>

      {/* ─── Offers Card Grid ────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-8 flex-1">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm font-medium text-slate-400">Loading monthly dealership offers...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-950/40 border border-rose-800 text-rose-200 rounded-2xl p-6 text-center max-w-lg mx-auto">
            <p className="font-bold text-sm">{error}</p>
            <button
              onClick={fetchOffers}
              className="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition"
            >
              Try Again
            </button>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Car className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No Offers Found</h3>
            <p className="text-xs text-slate-400">
              No offers match your selected brand, branch, or search criteria. Try resetting filters.
            </p>
            <button
              onClick={() => {
                setSelectedBrand('All');
                setSelectedCategory('all');
                setSelectedBranch('All');
                setSelectedMonth('All');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOffers.map((offer) => {
              const highlightsList = Array.isArray(offer.highlights)
                ? offer.highlights
                : typeof offer.highlights === 'string'
                ? JSON.parse(offer.highlights || '[]')
                : [];

              return (
                <div
                  key={offer.offer_id}
                  className={`bg-slate-900/70 border rounded-3xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-slate-700 hover:shadow-2xl hover:shadow-indigo-950/30 ${
                    offer.is_active ? 'border-slate-800' : 'border-amber-600/50 opacity-70'
                  }`}
                >
                  {/* Top Image & Badge Container */}
                  <div className="relative h-48 w-full bg-slate-800 overflow-hidden">
                    <img
                      src={offer.image_url || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'}
                      alt={offer.title}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    
                    {/* Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] tracking-wider uppercase font-mono shadow-md ${offer.badge_color || 'bg-amber-500 text-slate-950 font-black'}`}>
                        {offer.badge || 'MONTHLY OFFER'}
                      </span>
                      {!offer.is_active && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-bold">
                          Inactive
                        </span>
                      )}
                    </div>

                    {/* Brand Tag */}
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{BRAND_LOGOS[offer.brand_name] || '🚘'}</span>
                      <span>{offer.brand_name}</span>
                    </div>

                    {/* Validity Month Badge */}
                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-[11px] font-mono text-slate-300 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{offer.valid_month}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-black text-white text-base leading-snug line-clamp-2">
                          {offer.title}
                        </h3>
                      </div>

                      <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-black">
                        {offer.benefit}
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                        {offer.description}
                      </p>

                      {/* Highlights */}
                      {highlightsList.length > 0 && (
                        <div className="pt-2 space-y-1.5">
                          {highlightsList.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                              <span className="line-clamp-1">{item}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Branch & Validity Details */}
                    <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                        <span className="line-clamp-1">
                          {offer.branch_name === 'All Branches' ? `All Branches (${offer.city || 'Karnataka'})` : `${offer.branch_name} • ${offer.city || ''}`}
                        </span>
                      </div>
                      {offer.valid_till && (
                        <div className="flex items-center gap-1.5 text-amber-400/90 font-medium">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span>{offer.valid_till}</span>
                        </div>
                      )}
                    </div>

                    {/* Promo Code & WhatsApp Action Bar */}
                    <div className="space-y-2 pt-2">
                      {offer.code && (
                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                          <div className="flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="font-mono text-xs font-bold text-white">{offer.code}</span>
                          </div>
                          <button
                            onClick={() => handleCopyCode(offer.code)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold transition flex items-center gap-1"
                          >
                            {copiedCode === offer.code ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <a
                          href={`https://wa.me/${offer.whatsapp_number || '918197348730'}?text=${encodeURIComponent(
                            offer.whatsapp_msg || `Hi Bellad & Co, I am interested in the ${offer.title} offer (Code: ${offer.code}). Please share quote.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          <span>Claim on WhatsApp</span>
                        </a>

                        <a
                          href={`tel:+${offer.whatsapp_number || '918197348730'}`}
                          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="Call Dealership"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>

                        {/* Staff Actions */}
                        {isStaff && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(offer)}
                              className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-700/60 hover:bg-indigo-900 text-indigo-300 transition"
                              title="Edit Offer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(offer.offer_id)}
                              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              title={offer.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {offer.is_active ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
                            </button>
                            <button
                              onClick={() => handleDeleteOffer(offer.offer_id, offer.title)}
                              className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800/60 hover:bg-rose-900 text-rose-300 transition"
                              title="Delete Offer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ─── Staff Create / Edit Modal ───────────────────────────────────────── */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl my-8 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-black text-white">
                  {editingOffer ? 'Edit Monthly Offer' : 'Create New Monthly Offer'}
                </h3>
                <p className="text-xs text-slate-400">
                  Configure brand discounts, model perks & WhatsApp triggers for the month
                </p>
              </div>
              <button
                onClick={() => setShowManageModal(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOffer} className="space-y-4 pt-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Brand */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Brand Name *</label>
                  <select
                    value={formData.brand_name}
                    onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="Tata Motors">Tata Motors</option>
                    <option value="MG Motors">MG Motors</option>
                    <option value="Hero Moto Corp">Hero Moto Corp</option>
                    <option value="Ather Energy">Ather Energy</option>
                    <option value="Hyundai">Hyundai</option>
                  </select>
                </div>

                {/* Model */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Model Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Safari Dark Edition, Windsor EV"
                    value={formData.model_name}
                    onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Category */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="suv">SUVs & Cars</option>
                    <option value="ev">Electric Vehicles (EV)</option>
                    <option value="bike_scooter">Bikes & Scooters</option>
                    <option value="service">Service & Detailing</option>
                    <option value="festive">Festive Specials</option>
                  </select>
                </div>

                {/* Branch */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Branch Name</label>
                  <input
                    type="text"
                    placeholder="All Branches or Hubli"
                    value={formData.branch_name}
                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Cities / Coverage</label>
                  <input
                    type="text"
                    placeholder="Hubli, Belgaum, Dharwad"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              {/* Title & Benefit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Offer Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata Safari Dark Edition November Offer"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Benefit / Discount Highlight *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Up to ₹1,35,000 Total Benefits"
                    value={formData.benefit}
                    onChange={(e) => setFormData({ ...formData, benefit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-emerald-400"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-slate-300 block mb-1">Offer Description</label>
                <textarea
                  rows={2}
                  placeholder="Detailed terms, package details, exchange bonuses..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              {/* Highlights (One per line) */}
              <div>
                <label className="font-bold text-slate-300 block mb-1">Key Features / Highlights (One per line)</label>
                <textarea
                  rows={3}
                  placeholder="ADAS Level 2 Features&#10;Panoramic Sunroof&#10;10,000 Loyalty Bonus Points"
                  value={formData.highlights}
                  onChange={(e) => setFormData({ ...formData, highlights: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>

              {/* Month, Validity & Promo Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Valid Month *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. November 2026"
                    value={formData.valid_month}
                    onChange={(e) => setFormData({ ...formData, valid_month: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Valid Till Date</label>
                  <input
                    type="text"
                    placeholder="e.g. Valid till 30 Nov 2026"
                    value={formData.valid_till}
                    onChange={(e) => setFormData({ ...formData, valid_till: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Promo / Coupon Code</label>
                  <input
                    type="text"
                    placeholder="e.g. BELLAD-DARK-NOV"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              {/* Image URL & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Banner Image URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Badge Text</label>
                  <input
                    type="text"
                    placeholder="e.g. FESTIVE SUV SPECIAL"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
                  />
                </div>
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span className="font-bold text-white">Publish as Active Offer</span>
                </label>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Sort Priority (Higher = Top)</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowManageModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOffer}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition flex items-center gap-2 disabled:opacity-50"
                >
                  {savingOffer ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingOffer ? 'Update Offer' : 'Publish Offer'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="mt-16 border-t border-slate-800 pt-8 text-center text-xs text-slate-500 space-y-2">
        <p>© 2026 Bellad & Company. Dealership loyalty and brand schemes across Hubballi, Belgaum, Dharwad, Hospet & Bangalore.</p>
        <p className="text-[11px] text-slate-600">Discounts & exchange schemes are subject to manufacturer terms and vehicle stock availability.</p>
      </footer>
    </div>
  );
}
