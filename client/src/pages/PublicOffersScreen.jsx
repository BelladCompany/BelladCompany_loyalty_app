import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Tag,
  Search,
  Filter,
  Car,
  Zap,
  Phone,
  PhoneCall,
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
  Lock,
  Unlock,
  Check,
  Building2,
  Wrench,
  Bike,
  Flame,
  Navigation,
  Compass,
} from 'lucide-react';
import ApiService from '../services/api';
import {
  BELLAD_CITY_HUBS,
  resolveNearestBelladHub,
  getCachedUserCity,
  setCachedUserCity,
  isLocationPromptDismissed,
  setLocationPromptDismissed,
} from '../utils/geoUtils';

const ALL_DEALERSHIP_BRANDS = [
  'All',
  'Tata Motors',
  'MG Motors',
  'Hero Moto Corp',
  'Vida',
  'Ather Energy',
  'Hyundai',
  'Maruti Suzuki',
  'Swaraj',
  'Workshop & Detailing',
];

const BRAND_ICONS = {
  'All': '🌟',
  'Tata Motors': '🚙',
  'MG Motors': '⚡',
  'Hero Moto Corp': '🏍️',
  'Vida': '🛵',
  'Ather Energy': '🔋',
  'Hyundai': '🚘',
  'Maruti Suzuki': '🚗',
  'Swaraj': '🚜',
  'Workshop & Detailing': '🔧',
};

const ALL_DEALERSHIP_BRANCHES = [
  'All Branches',
  'Ather Energy Hubballi',
  'Vida Hubli',
  'Tata Motors Bellary',
  'Hyundai Hubli',
  'Hero Moto Corp Hubli',
  'MG Motors Belgaum',
  'MG Motors Hubballi',
  'Ather Energy Belgaum',
  'Swaraj Hubli',
  'Tata Motors Sarjapur Bangalore',
  'Ather Bangalore',
  'CNH Hubli',
  'MG Motors Gulbarga',
  'MG Motors Hospet',
  'Tata Motors Bommasandra Bangalore',
  'Haveri TRZ',
  'Hero Moto Corp Dharwad',
  'Hyundai Gadag',
  'Hyundai Haveri',
  'Hyundai Dharwad',
  'Tilakwadi TRZ',
  'Tata Motors Raichur',
  'Ather Bommasandra Bangalore',
  'Tata Motors Hospet',
  'Tata Motors Koppal',
  'Tata Motors Gangavathi',
  'Tata Motors Sindhnoor',
  'Tata Motors Bommasandra Workshop',
];

export default function PublicOffersScreen() {
  const [offers, setOffers] = useState([]);
  const [meta, setMeta] = useState({ brands: [], models: [], branches: [], months: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Location / GPS states
  const [selectedCity, setSelectedCity] = useState(() => {
    const cached = getCachedUserCity();
    return cached?.name || 'All';
  });
  const [detectedCityObj, setDetectedCityObj] = useState(() => getCachedUserCity());
  const [isLocating, setIsLocating] = useState(false);
  const [isLocationDismissed, setIsLocationDismissed] = useState(() => isLocationPromptDismissed());
  const [locationToast, setLocationToast] = useState('');

  // Filtering states
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Editor Mode & Staff Auth States
  const [currentUser, setCurrentUser] = useState(() => ApiService.getUser());
  const isAutoStaff = currentUser && ['admin', 'super_admin', 'director', 'branch_manager', 'manager'].includes(currentUser.role);
  const [isEditorMode, setIsEditorMode] = useState(() => Boolean(isAutoStaff));
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockUsername, setUnlockUsername] = useState('admin');
  const [unlockPassword, setUnlockPassword] = useState('Admin@123');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  // Offer CRUD modal states
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
    target_cities: ['All Cities'],
    discount_percent: '',
    is_statewide: true,
    title: '',
    benefit: '',
    description: '',
    highlights: '',
    valid_month: 'November 2026',
    valid_till: 'Valid till 30 Nov 2026',
    badge: 'MONTHLY SPECIAL',
    badge_color: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
    image_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
    whatsapp_number: '919035354159',
    is_active: true,
    priority: 5,
  });

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      // In editor mode, include inactive drafts
      const params = isEditorMode ? { includeInactive: 'true' } : {};
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
  }, [isEditorMode]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // Geolocation trigger function using Haversine calculation
  const handleTriggerGps = useCallback((isManual = false) => {
    if (!navigator.geolocation) {
      if (isManual) {
        alert('Geolocation is not supported by your browser. Please select your city tab manually.');
      }
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const res = resolveNearestBelladHub(latitude, longitude);
        if (res && res.hub) {
          const hubData = {
            id: res.hub.id,
            name: res.hub.name,
            displayName: res.hub.displayName,
            lat: latitude,
            lng: longitude,
            distanceKm: res.distanceKm,
            isDirectMatch: res.isDirectMatch,
          };
          setCachedUserCity(hubData);
          setDetectedCityObj(hubData);
          setSelectedCity(res.hub.name);
          setLocationToast(`📍 Nearest Bellad Hub detected: ${res.hub.displayName} (~${res.distanceKm} km away)`);
        } else {
          setLocationToast('📍 Outside dealership territory. Showing All Karnataka offers.');
        }
        setIsLocating(false);
        setIsLocationDismissed(true);
        setLocationPromptDismissed();
      },
      (err) => {
        console.warn('Geolocation access denied or timed out:', err.message);
        setIsLocating(false);
        if (isManual) {
          alert('GPS location permission was denied or timed out. Please choose your city from the tabs below.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Graceful auto-prompt on mount if not cached and not dismissed
  useEffect(() => {
    const cached = getCachedUserCity();
    const dismissed = isLocationPromptDismissed();
    if (!cached && !dismissed) {
      handleTriggerGps(false);
    }
  }, [handleTriggerGps]);

  const handleSelectCity = (cityName) => {
    setSelectedCity(cityName);
    if (cityName !== 'All') {
      const hub = BELLAD_CITY_HUBS.find((h) => h.name.toLowerCase() === cityName.toLowerCase());
      if (hub) {
        const hubData = { id: hub.id, name: hub.name, displayName: hub.displayName, distanceKm: 0 };
        setCachedUserCity(hubData);
        setDetectedCityObj(hubData);
      }
    }
  };

  // Handle staff unlock for Editor Mode
  const handleUnlockEditor = async (e) => {
    e.preventDefault();
    setUnlockError('');
    setUnlocking(true);
    try {
      const data = await ApiService.login(unlockUsername, unlockPassword);
      if (data?.user) {
        setCurrentUser(data.user);
        setIsEditorMode(true);
        setShowUnlockModal(false);
        await fetchOffers();
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (err) {
      setUnlockError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleToggleEditorMode = () => {
    if (isEditorMode) {
      setIsEditorMode(false);
    } else {
      if (currentUser && ['admin', 'super_admin', 'director', 'branch_manager', 'manager'].includes(currentUser.role)) {
        setIsEditorMode(true);
      } else {
        setShowUnlockModal(true);
      }
    }
  };

  // Filtered & Ranked offers list
  const filteredOffers = useMemo(() => {
    const list = offers.filter((offer) => {
      // If not in editor mode and offer is inactive, hide it
      if (!isEditorMode && !offer.is_active) return false;

      // City / Location filter
      if (selectedCity !== 'All') {
        const c = selectedCity.toLowerCase();
        const targetCities = Array.isArray(offer.target_cities) ? offer.target_cities : [];
        const isTargeted = targetCities.some(
          (tc) => tc.toLowerCase() === c || tc.toLowerCase().includes(c) || c.includes(tc.toLowerCase())
        );
        const isStatewide = offer.is_statewide || targetCities.includes('All Cities') || offer.city === 'All Cities';
        const cityMatch = (offer.city || '').toLowerCase().includes(c);
        const branchMatch = (offer.branch_name || '').toLowerCase().includes(c);

        if (!isTargeted && !isStatewide && !cityMatch && !branchMatch) {
          return false;
        }
      }

      // Brand filter
      if (selectedBrand !== 'All') {
        const b = (offer.brand_name || '').toLowerCase();
        const target = selectedBrand.toLowerCase();
        if (!b.includes(target) && !target.includes(b)) {
          // Special case for workshop
          if (selectedBrand === 'Workshop & Detailing' && offer.category !== 'service') {
            return false;
          }
          if (selectedBrand !== 'Workshop & Detailing') {
            return false;
          }
        }
      }
      // Category filter
      if (selectedCategory !== 'all') {
        if (offer.category !== selectedCategory) return false;
      }
      // Branch filter
      if (selectedBranch !== 'All Branches') {
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
        if (!inTitle && !inModel && !inBrand && !inDesc) return false;
      }
      return true;
    });

    // If a specific city is selected, prioritize city-exclusive offers at top!
    if (selectedCity !== 'All') {
      const c = selectedCity.toLowerCase();
      list.sort((a, b) => {
        const aTarget = Array.isArray(a.target_cities) && a.target_cities.some((tc) => tc.toLowerCase().includes(c));
        const bTarget = Array.isArray(b.target_cities) && b.target_cities.some((tc) => tc.toLowerCase().includes(c));
        if (aTarget && !bTarget) return -1;
        if (!aTarget && bTarget) return 1;
        return (b.priority || 0) - (a.priority || 0);
      });
    }

    return list;
  }, [offers, selectedCity, selectedBrand, selectedCategory, selectedBranch, selectedMonth, searchQuery, isEditorMode]);

  // Open modal for new offer
  const handleOpenCreateModal = () => {
    setEditingOffer(null);
    setFormData({
      brand_name: selectedBrand !== 'All' && selectedBrand !== 'Workshop & Detailing' ? selectedBrand : 'Tata Motors',
      model_name: '',
      category: 'new_vehicle',
      branch_name: 'All Branches',
      city: selectedCity !== 'All' ? selectedCity : 'Hubli, Dharwad, Belgaum',
      target_cities: selectedCity !== 'All' ? [selectedCity] : ['All Cities'],
      discount_percent: '',
      is_statewide: selectedCity === 'All',
      title: '',
      benefit: '',
      description: '',
      highlights: '',
      valid_month: 'November 2026',
      valid_till: 'Valid till 30 Nov 2026',
      badge: selectedCity !== 'All' ? `${selectedCity.toUpperCase()} EXCLUSIVE` : 'MONTHLY SPECIAL',
      badge_color: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      image_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
      whatsapp_number: '919035354159',
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

    let citiesArr = ['All Cities'];
    if (Array.isArray(offer.target_cities) && offer.target_cities.length > 0) {
      citiesArr = offer.target_cities;
    } else if (offer.city) {
      citiesArr = offer.city.split(',').map((c) => c.trim()).filter(Boolean);
      if (citiesArr.length === 0) citiesArr = ['All Cities'];
    }

    setFormData({
      brand_name: offer.brand_name || 'Tata Motors',
      model_name: offer.model_name || '',
      category: offer.category || 'new_vehicle',
      branch_name: offer.branch_name || 'All Branches',
      city: offer.city || '',
      target_cities: citiesArr,
      discount_percent: offer.discount_percent != null ? offer.discount_percent : '',
      is_statewide: offer.is_statewide ?? citiesArr.includes('All Cities'),
      title: offer.title || '',
      benefit: offer.benefit || '',
      description: offer.description || '',
      highlights: hl,
      valid_month: offer.valid_month || 'November 2026',
      valid_till: offer.valid_till || '',
      badge: offer.badge || 'MONTHLY SPECIAL',
      badge_color: offer.badge_color || 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      image_url: offer.image_url || '',
      whatsapp_number: offer.whatsapp_number || '919035354159',
      is_active: offer.is_active ?? true,
      priority: offer.priority || 0,
    });
    setShowManageModal(true);
  };

  // Save offer (create or update) - updates state instantly
  const handleSaveOffer = async (e) => {
    e.preventDefault();
    try {
      setSavingOffer(true);
      const hlArray = formData.highlights
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const targetCities = formData.target_cities && formData.target_cities.length > 0
        ? formData.target_cities
        : ['All Cities'];

      const payload = {
        ...formData,
        highlights: hlArray,
        target_cities: targetCities,
        discount_percent: formData.discount_percent !== '' && formData.discount_percent !== null
          ? parseFloat(formData.discount_percent)
          : null,
        is_statewide: targetCities.includes('All Cities') || formData.is_statewide,
      };

      if (editingOffer) {
        const res = await ApiService.updateOffer(editingOffer.offer_id, payload);
        if (res.status === 'success' && res.data) {
          setOffers((prev) => prev.map((o) => (o.offer_id === editingOffer.offer_id ? res.data : o)));
        }
      } else {
        const res = await ApiService.createOffer(payload);
        if (res.status === 'success' && res.data) {
          setOffers((prev) => [res.data, ...prev]);
        }
      }

      setShowManageModal(false);
      setEditingOffer(null);
      fetchOffers();
    } catch (err) {
      alert(`Error saving offer: ${err.message}`);
    } finally {
      setSavingOffer(false);
    }
  };

  // Toggle active status instantly
  const handleToggleActive = async (offerId) => {
    try {
      setOffers((prev) =>
        prev.map((o) => (o.offer_id === offerId ? { ...o, is_active: !o.is_active } : o))
      );
      await ApiService.toggleOffer(offerId);
    } catch (err) {
      alert(`Error toggling status: ${err.message}`);
      fetchOffers();
    }
  };

  // Delete offer instantly
  const handleDeleteOffer = async (offerId, title) => {
    if (!window.confirm(`Are you sure you want to delete the offer "${title}"?`)) {
      return;
    }
    try {
      setOffers((prev) => prev.filter((o) => o.offer_id !== offerId));
      await ApiService.deleteOffer(offerId);
    } catch (err) {
      alert(`Error deleting offer: ${err.message}`);
      fetchOffers();
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-indigo-600 selection:text-white pb-24">

      {/* ─── Light Ambient Background Orbs ────────────────────────────────────── */}
      <div className="fixed top-0 left-1/4 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-200/30 via-purple-100/20 to-blue-200/20 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-10 right-10 w-[450px] h-[450px] bg-amber-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ─── Top Brand Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <a
              href="/portal"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition flex items-center gap-1.5 text-xs shadow-2xs shrink-0"
              title="Return to Customer Portal"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span className="hidden md:inline">Portal Dashboard</span>
            </a>

            <div className="h-5 w-px bg-slate-200 hidden md:block" />

            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div>
                <img
                  src="/bellad-logo.png"
                  alt="Bellad Logo"
                  className="w-6 h-6 sm:w-12 sm:h-12 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5 truncate">
                  <span className="truncate">Bellad &amp; Co</span>
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] uppercase font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                    Offers
                  </span>
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Editor Mode Quick Switch */}
            <button
              onClick={handleToggleEditorMode}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 ${isEditorMode
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              title={isEditorMode ? 'Exit Editor Mode' : 'Unlock Offer Editor'}
            >
              {isEditorMode ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isEditorMode ? 'Editor Active' : 'Editor Mode'}</span>
            </button>

            {isEditorMode && (
              <button
                onClick={handleOpenCreateModal}
                className="px-2.5 sm:px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Add Offer</span>
              </button>
            )}

            <a
              href="tel:+919035354159"
              className="px-2.5 sm:px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs shrink-0"
            >
              <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Call Showroom</span>
            </a>
          </div>
        </div>
      </header>

      {/* ─── Location Detection Permission Banner (Prompt if not detected yet) ─── */}
      {!detectedCityObj && !isLocationDismissed && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white px-4 py-2.5 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-full bg-amber-400 text-slate-900 font-bold">
                <Navigation className="w-3.5 h-3.5 animate-pulse" />
              </span>
              <span className="font-semibold">
                Looking for exclusive local schemes? Enable GPS location to see city-specific offers for Hubli, Bangalore, Belgaum &amp; more.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleTriggerGps(true)}
                disabled={isLocating}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer"
              >
                {isLocating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                <span>{isLocating ? 'Detecting...' : 'Enable Location'}</span>
              </button>
              <button
                onClick={() => {
                  setIsLocationDismissed(true);
                  setLocationPromptDismissed();
                }}
                className="px-2 py-1 text-slate-300 hover:text-white transition cursor-pointer"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Editor Mode Notification Banner (When active) ───────────────────── */}
      {isEditorMode && (
        <div className="bg-amber-400 text-slate-950 px-3.5 sm:px-4 py-2 text-xs font-bold shadow-xs border-b border-amber-500">
          <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-slate-950 text-white text-[10px] font-mono uppercase shrink-0">
                Staff Editor Mode
              </span>
              <span className="text-[11px] sm:text-xs">Live edit enabled. Target specific cities (e.g. Bangalore 80% vs Hubli 50%).</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleOpenCreateModal}
                className="px-2.5 sm:px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Create Offer</span>
              </button>
              <button
                onClick={() => setIsEditorMode(false)}
                className="text-slate-800 hover:text-black underline text-xs cursor-pointer"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Hero Headline & Dealership Overview ─────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-indigo-50/20 to-[#F8FAFC] py-8 sm:py-10 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Official November 2026 Dealership Schemes</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight">
            Location-Based Offers Across All Brands <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 bg-clip-text text-transparent">
              Tata • MG • Hero • Vida • Ather • Hyundai • Maruti • Swaraj
            </span>
          </h2>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto font-medium">
            Explore exclusive regional schemes, manufacturer exchange bonuses, and EV subsidies customized for your city showroom.
          </p>

          {/* Quick Stats Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs text-center">
              <span className="text-xl sm:text-2xl font-black text-amber-600">₹1.35L</span>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">Max Exchange Benefit</p>
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs text-center">
              <span className="text-xl sm:text-2xl font-black text-emerald-600">0%</span>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">Karnataka EV Road Tax</p>
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs text-center">
              <span className="text-xl sm:text-2xl font-black text-indigo-600">2X</span>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">Loyalty Reward Points</p>
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs text-center">
              <span className="text-xl sm:text-2xl font-black text-slate-900">40+</span>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">Showrooms &amp; Workshops</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Location & City Selector Ribbon ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 -mt-5 relative z-30">
        <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-md flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 shrink-0 pl-1 text-xs font-bold text-slate-700">
            <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="hidden sm:inline">Dealership Region:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1">
            <button
              onClick={() => handleSelectCity('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                selectedCity === 'All'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>🌟 All Karnataka Deals</span>
            </button>

            {BELLAD_CITY_HUBS.map((hub) => {
              const isSelected = selectedCity.toLowerCase() === hub.name.toLowerCase();
              const isDetected = detectedCityObj && detectedCityObj.name.toLowerCase() === hub.name.toLowerCase();
              return (
                <button
                  key={hub.id}
                  onClick={() => handleSelectCity(hub.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{hub.displayName || hub.name}</span>
                  {isDetected && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-100 text-emerald-800 font-bold">
                      GPS
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* GPS Auto-detect Trigger Button */}
          <button
            onClick={() => handleTriggerGps(true)}
            disabled={isLocating}
            title="Auto-detect nearest showroom using device GPS"
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer border border-slate-200"
          >
            <Navigation className={`w-3.5 h-3.5 text-indigo-600 ${isLocating ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{isLocating ? 'Detecting...' : 'Auto GPS'}</span>
          </button>
        </div>

        {/* Location Toast indicator if detected */}
        {locationToast && (
          <div className="mt-2 text-xs font-semibold text-indigo-700 bg-indigo-50/90 border border-indigo-200/70 rounded-xl px-3 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span>{locationToast}</span>
            </div>
            <button onClick={() => setLocationToast('')} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* ─── All Brand Selector Tabs ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-4 relative z-20">
        <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-md flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {ALL_DEALERSHIP_BRANDS.map((brand) => {
            const isSelected = selectedBrand.toLowerCase() === brand.toLowerCase();
            return (
              <button
                key={brand}
                onClick={() => setSelectedBrand(brand)}
                className={`flex-1 min-w-[125px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${isSelected
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 scale-[1.01]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
              >
                <span>{BRAND_ICONS[brand] || '🚘'}</span>
                <span>{brand}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Dynamic Filter Bar: Search, Category, Branch, Month ─────────────── */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search model (Safari, Windsor, Creta, Splendor...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition cursor-pointer appearance-none"
            >
              <option value="all">All Vehicle Types</option>
              <option value="new_vehicle">Cars &amp; Commuters</option>
              <option value="suv">SUVs &amp; Luxury</option>
              <option value="ev">Electric Vehicles (EV)</option>
              <option value="bike_scooter">Bikes &amp; Scooters</option>
              <option value="service">Service &amp; Detailing</option>
            </select>
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* All Branches Filter */}
          <div className="relative">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition cursor-pointer appearance-none"
            >
              {ALL_DEALERSHIP_BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <MapPin className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Month Filter */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition cursor-pointer appearance-none"
            >
              <option value="All">All Months</option>
              <option value="November 2026">November 2026</option>
              <option value="December 2026">December 2026</option>
              <option value="October 2026">October 2026</option>
            </select>
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Dynamic Count Indicator */}
        <div className="flex items-center justify-between mt-3 px-1 text-xs text-slate-500 font-medium">
          <span>
            Showing {filteredOffers.length} offers for {selectedBrand === 'All' ? 'All Brands' : selectedBrand}{' '}
            {selectedCity !== 'All' ? `in ${selectedCity}` : 'Across Karnataka'}
          </span>
          {isEditorMode && (
            <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              ⚡ Instant Editor Mode Enabled
            </span>
          )}
        </div>
      </section>

      {/* ─── Offers Card Grid ────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-8 flex-1">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-bold text-slate-600">Loading dealership offers...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-3xl p-8 text-center max-w-lg mx-auto shadow-sm">
            <p className="font-bold text-sm">{error}</p>
            <button
              onClick={fetchOffers}
              className="mt-4 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow-xs"
            >
              Try Again
            </button>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center max-w-md mx-auto space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Car className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">No Offers Found</h3>
            <p className="text-xs text-slate-500 font-medium">
              No offers match your selected region ({selectedCity}), brand, or filters.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  setSelectedCity('All');
                  setSelectedBrand('All');
                  setSelectedCategory('all');
                  setSelectedBranch('All Branches');
                  setSelectedMonth('All');
                  setSearchQuery('');
                }}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition shadow-xs"
              >
                Reset All Filters
              </button>
              {isEditorMode && (
                <button
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Offer for {selectedCity !== 'All' ? selectedCity : selectedBrand}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOffers.map((offer) => {
              const highlightsList = Array.isArray(offer.highlights)
                ? offer.highlights
                : typeof offer.highlights === 'string'
                  ? JSON.parse(offer.highlights || '[]')
                  : [];

              const hasCityExclusive = Array.isArray(offer.target_cities) &&
                offer.target_cities.length > 0 &&
                !offer.target_cities.includes('All Cities');

              return (
                <div
                  key={offer.offer_id}
                  className={`bg-white border rounded-3xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:border-slate-300 ${offer.is_active ? 'border-slate-200/90 shadow-sm' : 'border-amber-300 bg-amber-50/20 opacity-80'
                    }`}
                >
                  {/* Top Image & Badge Container */}
                  <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={offer.image_url || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'}
                      alt={offer.title}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80';
                      }}
                    />

                    {/* Gradient shade over image bottom for badge contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />

                    {/* Badges on Top Left */}
                    <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] tracking-wider uppercase font-mono font-bold bg-amber-400 text-slate-950 shadow-sm">
                        {offer.badge || 'MONTHLY OFFER'}
                      </span>
                      {!offer.is_active && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-bold shadow-xs">
                          Draft (Inactive)
                        </span>
                      )}
                    </div>

                    {/* City Location Badge on Top Right */}
                    {hasCityExclusive ? (
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-md flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-300" />
                        <span>{offer.target_cities.join(', ')} Only</span>
                      </div>
                    ) : (
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 backdrop-blur-xs text-slate-200 shadow-sm">
                        All Karnataka
                      </div>
                    )}

                    {/* Brand Tag */}
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-xs">
                      <span>{BRAND_ICONS[offer.brand_name] || '🚘'}</span>
                      <span>{offer.brand_name}</span>
                    </div>

                    {/* Validity Month Badge */}
                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200 text-[11px] font-mono font-bold text-slate-700 flex items-center gap-1 shadow-xs">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>{offer.valid_month}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <h3 className="font-black text-slate-900 text-base leading-snug line-clamp-2">
                        {offer.title}
                      </h3>

                      {/* Benefit and Location Discount Callout */}
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-black flex items-center justify-between">
                        <span>{offer.benefit}</span>
                        {offer.discount_percent > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-mono text-[10px] uppercase font-bold shrink-0 ml-1">
                            {offer.discount_percent}% OFF
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-medium line-clamp-3">
                        {offer.description}
                      </p>

                      {/* Highlights */}
                      {highlightsList.length > 0 && (
                        <div className="pt-1.5 space-y-1.5">
                          {highlightsList.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-[11px] font-medium text-slate-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                              <span className="line-clamp-1">{item}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Branch & Validity Details */}
                    <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-medium space-y-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                        <span className="line-clamp-1">
                          {hasCityExclusive
                            ? `Exclusive: ${offer.target_cities.join(', ')} branches`
                            : offer.branch_name === 'All Branches'
                              ? `All Branches (${offer.city || 'Karnataka'})`
                              : `${offer.branch_name} • ${offer.city || ''}`}
                        </span>
                      </div>
                      {offer.valid_till && (
                        <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                          <Calendar className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                          <span>{offer.valid_till}</span>
                        </div>
                      )}
                    </div>

                    {/* ─── SINGLE CALL ACTION BUTTON ───────────────────────── */}
                    <div className="pt-2 space-y-2">
                      <a
                        href={`tel:+${offer.whatsapp_number || '919035354159'}`}
                        className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer transform hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <Phone className="w-4 h-4 text-emerald-400" />
                        <span>Enquire Now (Call Showroom)</span>
                      </a>

                      {/* Staff Editor Mode Actions (Quick Edit & Delete on Card) */}
                      {isEditorMode && (
                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                          <button
                            onClick={() => handleOpenEditModal(offer)}
                            className="flex-1 py-1.5 px-2 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleToggleActive(offer.offer_id)}
                            className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1 border cursor-pointer ${offer.is_active
                              ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                              }`}
                            title={offer.is_active ? 'Draft / Hide' : 'Publish Offer'}
                          >
                            {offer.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{offer.is_active ? 'Draft' : 'Publish'}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteOffer(offer.offer_id, offer.title)}
                            className="py-1.5 px-2.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                            title="Delete Offer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ─── Floating Editor Mode Button (Bottom Right) ───────────────────────── */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
        <button
          onClick={handleToggleEditorMode}
          className={`px-4 py-2.5 rounded-2xl shadow-xl font-black text-xs transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95 cursor-pointer ${isEditorMode
            ? 'bg-amber-400 text-slate-950 border-2 border-slate-950 shadow-amber-500/20'
            : 'bg-slate-900 text-white border border-slate-700 shadow-slate-950/20 hover:bg-slate-800'
            }`}
        >
          {isEditorMode ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          <span>{isEditorMode ? 'Editor Active (Exit)' : 'Dealership Editor Mode'}</span>
        </button>
      </div>

      {/* ─── Staff Unlock Modal ──────────────────────────────────────────────── */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 text-slate-800 shadow-2xl relative">
            <button
              onClick={() => setShowUnlockModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-2 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900">Unlock Offer Editor</h3>
              <p className="text-xs text-slate-500 font-medium">
                Enter dealership staff or administrator password to update offers in real time.
              </p>
            </div>

            {unlockError && (
              <div className="p-3 mb-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
                {unlockError}
              </div>
            )}

            <form onSubmit={handleUnlockEditor} className="space-y-3 text-xs font-medium">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={unlockUsername}
                  onChange={(e) => setUnlockUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={unlocking}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {unlocking ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Unlock Editor Mode</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Staff Create / Edit Modal (With Location Targeting & Discount %) ─── */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[92dvh] sm:max-h-[88vh] flex flex-col text-slate-800 shadow-2xl overflow-hidden relative animate-fadeIn">
            {/* Pinned Modal Header */}
            <div className="flex items-start justify-between p-3.5 sm:p-5 border-b border-slate-100 flex-shrink-0 bg-white select-none">
              <div className="pr-2 min-w-0">
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  {editingOffer ? 'Edit Dealership Offer' : 'Create New Dealership Offer'}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-snug mt-0.5">
                  Set location exclusivity (e.g. Hubli 50%, Bangalore 80%), benefits &amp; details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="manageOfferForm" onSubmit={handleSaveOffer} className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-6 space-y-3 sm:space-y-4 text-xs font-medium">

              {/* ─── Location & City Targeting Multi-Selector ─── */}
              <div className="bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100 space-y-2">
                <label className="font-bold text-slate-800 block flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Target Cities / Territory Exclusivity *</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {formData.target_cities.includes('All Cities')
                      ? 'Shows across all Karnataka'
                      : `Exclusive to ${formData.target_cities.join(', ')}`}
                  </span>
                </label>

                <div className="flex flex-wrap gap-2">
                  <label className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition flex items-center gap-1.5 ${
                    formData.target_cities.includes('All Cities')
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={formData.target_cities.includes('All Cities')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, target_cities: ['All Cities'], is_statewide: true });
                        } else {
                          setFormData({ ...formData, target_cities: ['Hubli'], is_statewide: false });
                        }
                      }}
                    />
                    <span>🌟 All Cities (Statewide)</span>
                  </label>

                  {BELLAD_CITY_HUBS.map((hub) => {
                    const isChecked = formData.target_cities.includes(hub.name);
                    return (
                      <label
                        key={hub.id}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition flex items-center gap-1.5 ${
                          isChecked
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isChecked}
                          onChange={(e) => {
                            let updated = formData.target_cities.filter((c) => c !== 'All Cities');
                            if (e.target.checked) {
                              updated.push(hub.name);
                            } else {
                              updated = updated.filter((c) => c !== hub.name);
                            }
                            if (updated.length === 0) updated = ['All Cities'];
                            setFormData({
                              ...formData,
                              target_cities: updated,
                              is_statewide: updated.includes('All Cities'),
                            });
                          }}
                        />
                        <span>📍 {hub.displayName || hub.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Brand & Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Brand Name *</label>
                  <select
                    value={formData.brand_name}
                    onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  >
                    {ALL_DEALERSHIP_BRANDS.filter((b) => b !== 'All').map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Model Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Safari Dark Edition, Windsor EV, Creta, Splendor"
                    value={formData.model_name}
                    onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* Category & Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="new_vehicle">Cars &amp; Commuters</option>
                    <option value="suv">SUVs &amp; Luxury</option>
                    <option value="ev">Electric Vehicles (EV)</option>
                    <option value="bike_scooter">Bikes &amp; Scooters</option>
                    <option value="service">Service &amp; Detailing</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Applicable Branch</label>
                  <select
                    value={formData.branch_name}
                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  >
                    {ALL_DEALERSHIP_BRANCHES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title & Benefit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Offer Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata Safari Dark Edition Special"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Benefit Highlight *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Up to ₹1,35,000 Total Benefits"
                    value={formData.benefit}
                    onChange={(e) => setFormData({ ...formData, benefit: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-emerald-700 font-bold focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* Location Discount % and Badge Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Location Discount % (e.g. 50 or 80)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      placeholder="e.g. 50% for Hubli, 80% for Bangalore"
                      value={formData.discount_percent}
                      onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Badge Text</label>
                  <input
                    type="text"
                    placeholder="e.g. HUBLI EXCLUSIVE, BANGALORE SPECIAL"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Offer Description</label>
                <textarea
                  rows={2}
                  placeholder="Terms, package details, exchange bonuses, city applicability..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Highlights (One per line) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Key Features / Highlights (One per line)</label>
                <textarea
                  rows={3}
                  placeholder="City-exclusive manufacturer bonus&#10;Zero down-payment option&#10;10,000 Loyalty Bonus Points"
                  value={formData.highlights}
                  onChange={(e) => setFormData({ ...formData, highlights: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Month & Validity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Valid Month *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. November 2026"
                    value={formData.valid_month}
                    onChange={(e) => setFormData({ ...formData, valid_month: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Valid Till Date</label>
                  <input
                    type="text"
                    placeholder="e.g. Valid till 30 Nov 2026"
                    value={formData.valid_till}
                    onChange={(e) => setFormData({ ...formData, valid_till: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* Image URL & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Banner Image URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Dealership Phone Number</label>
                  <input
                    type="tel"
                    placeholder="919035354159"
                    value={formData.whatsapp_number}
                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0"
                  />
                  <span className="font-bold text-slate-800 text-xs">Publish as Active Live Offer</span>
                </label>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Sort Priority (Higher = Top)</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                  />
                </div>
              </div>
            </form>

            {/* Pinned Modal Footer */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 p-3 sm:p-4 border-t border-slate-100 flex-shrink-0 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold transition text-center text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="manageOfferForm"
                disabled={savingOffer}
                className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-slate-900/10 cursor-pointer text-xs"
              >
                {savingOffer ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving to Live System...</span>
                  </>
                ) : (
                  <span>{editingOffer ? 'Save & Update Live Offer' : 'Publish Live Offer'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Light Mode Footer ───────────────────────────────────────────────── */}
      <footer className="mt-16 border-t border-slate-200/80 pt-8 text-center text-xs text-slate-500 font-medium space-y-2">
        <p>© 2026 Bellad &amp; Company. Authorized Dealership Loyalty &amp; Rewards Program.</p>
        <p className="text-[11px] text-slate-400">Hubballi • Belgaum • Dharwad • Hospet • Bangalore • Bellary • Gulbarga • Raichur • Gadag • Haveri</p>
      </footer>
    </div>
  );
}
